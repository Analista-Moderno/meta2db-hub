import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { fetchMetaInsights } from './metaService.js';
import { syncToStarSchema } from './dbMigrator.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// A conexão com o Redis. Ideal ter uma de fallback para os testes locais.
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.error('[Redis Error] Erro de conexão (Ignorado no modo visual):', err.message);
});

export const syncQueue = new Queue('meta-sync-queue', { connection });

// Função utilitária para "quebrar" Backfills em pedaços de 30 dias
function chunkDateRanges(startDate, endDate) {
  // Simplificado para envio direto para fila do BullMQ
  // ... (Gera pares de dates para passar no job)
  return [{ start: '2023-01-01', end: '2023-01-31' }]; // Mock para chunk builder
}

export const enqueueJob = async (pipelineJobId) => {
  const jobConfig = await prisma.pipelineJob.findUnique({
    where: { id: pipelineJobId }
  });

  if (!jobConfig) return;

  let accounts = typeof jobConfig.accounts === 'string' ? JSON.parse(jobConfig.accounts) : jobConfig.accounts;
  
  // Auto-Discovery: Se não houver contas mapeadas, puxamos todas as contas do usuário
  if (!accounts || accounts.length === 0) {
    console.log('[Meta] Array de contas vazio. Iniciando Auto-Discovery no Graph API...');
    const metaAuth = await prisma.metaOAuthConfig.findFirst();
    if (metaAuth) {
      try {
        const res = await axios.get(`https://graph.facebook.com/${jobConfig.apiVersion || 'v20.0'}/me/adaccounts?access_token=${metaAuth.accessToken}`);
        accounts = res.data.data.map(acc => acc.id); // Array de 'act_xxxxxxx'
        console.log(`[Meta] Auto-Discovery encontrou ${accounts.length} conta(s):`, accounts);
      } catch (e) {
        console.error('[Meta] Falha no Auto-Discovery de contas', e.response?.data || e.message);
      }
    }
  }

  if (!accounts) accounts = [];

  // O construtor orquestra se é Daily ou Backfill para cada Conta
  for (const accountId of accounts) {
    try {
      if (jobConfig.datePreset === 'BACKFILL_ALL') {
        const chunks = chunkDateRanges('2022-01-01', '2024-01-01'); // exemplo
        for (const chunk of chunks) {
          await syncQueue.add('extract', { 
            jobConfigId: pipelineJobId, accountId, dateStart: chunk.start, dateEnd: chunk.end 
          }, { attempts: 5, backoff: { type: 'exponential', delay: 5 * 60000 }, removeOnComplete: true });
        }
      } else {
        await syncQueue.add('extract', { jobConfigId: pipelineJobId, accountId }, {
          attempts: 3, backoff: { type: 'fixed', delay: 300000 }
        });
      }
    } catch (e) {
      console.warn('[BullMQ] Erro ao enfileirar job (provavelmente Redis offline):', e.message);
    }
  }
};

// --- WORKER: Processador em Background --- //
const worker = new Worker('meta-sync-queue', async (job) => {
  const { jobConfigId, accountId, dateStart, dateEnd } = job.data;
  
  const pipelineConfig = await prisma.pipelineJob.findUnique({ where: { id: jobConfigId } });
  
  // O ID do usurio que ativou/criou o config (Pegando do MetaOAuth config como Master User por enquanto)
  const masterAuth = await prisma.metaOAuthConfig.findFirst();
  if (!masterAuth) throw new Error("App Core não autorizado com o FB");

  console.log(`[BullMQ Worker] Iniciando Extração para Conta ${accountId}`);

  try {
    // 1. EXTRAÇÃO API
    const insightsData = await fetchMetaInsights(masterAuth.userId, accountId, pipelineConfig, dateStart, dateEnd);
    
    // 2. CRIAÇÃO DE MODELO STAR SCHEMA NO BANCO DO CLIENTE 
    if (insightsData && insightsData.length > 0) {
      await syncToStarSchema(pipelineConfig.destinationId, insightsData, pipelineConfig);
    }
    
    console.log(`[BullMQ Worker] Dados recebidos e migrados: ${insightsData.length} linhas.`);
    
    // Log de sucesso
    await prisma.jobLog.create({
      data: {
        jobId: jobConfigId,
        status: 'success',
        rowsInserted: insightsData.length,
        payload: { message: `Completed ${dateStart || pipelineConfig.datePreset}` }
      }
    });

    return insightsData.length;

  } catch (err) {
    if (err.message === 'META_RATE_LIMIT_REACHED') {
      console.warn('[BullMQ Worker] Meta Rate Limit atingido! Atrasonando via Retry.');
      throw err; // O BullMQ aplicará o backoff de 5 mins automaticamente
    }

    // Log de falha fatal
    await prisma.jobLog.create({
      data: {
        jobId: jobConfigId,
        status: 'error',
        errorMessage: err.message
      }
    });
    console.error(`[BullMQ Worker] Falha:`, err.message);
    throw err;
  }
}, { connection });

worker.on('error', (err) => {
  console.error('[Worker Error]', err.message);
});

worker.on('failed', (job, err) => {
  console.log(`${job.id} falhou com o erro: ${err.message}`);
});
