import pg from 'pg';
import { PrismaClient } from '@prisma/client';

const { Pool } = pg;
const prisma = new PrismaClient();

const autoMigrateSchema = async (pool, fields) => {
  const ddl = `
    CREATE TABLE IF NOT EXISTS dim_contas (
      id VARCHAR(255) PRIMARY KEY,
      nome_conta VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS dim_campanhas (
      id VARCHAR(255) PRIMARY KEY,
      id_conta VARCHAR(255),
      nome_campanha VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS dim_conjuntos (
      id VARCHAR(255) PRIMARY KEY,
      id_campanha VARCHAR(255),
      nome_conjunto VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS dim_anuncios (
      id VARCHAR(255) PRIMARY KEY,
      id_conjunto VARCHAR(255),
      nome_anuncio VARCHAR(255)
    );
    
    -- Fatos Base
    CREATE TABLE IF NOT EXISTS fato_mestre_ads (
      data DATE,
      anuncio_id VARCHAR(255),
      spend NUMERIC,
      impressions INT,
      cpm NUMERIC,
      cpc NUMERIC,
      inline_link_clicks INT,
      PRIMARY KEY (data, anuncio_id)
    );
  `;
  await pool.query(ddl);
};

export const syncToStarSchema = async (destinationId, insightsData, jobConfig) => {
  const dest = await prisma.destinationDatabase.findUnique({ where: { id: destinationId } });
  if (!dest) throw new Error("Destination DB not found");

  const pool = new Pool({
    host: dest.host,
    port: dest.port,
    database: dest.database,
    user: dest.user,
    password: dest.password,
    ssl: { rejectUnauthorized: false } // Required for some VPS
  });

  const parsedFields = typeof jobConfig.fields === 'string' ? JSON.parse(jobConfig.fields) : jobConfig.fields;
  const client = await pool.connect();
  
  try {
    await autoMigrateSchema(client, parsedFields);

    await client.query('BEGIN');
    
    for (const row of insightsData) {
      if (row.account_id) {
        await client.query(`
          INSERT INTO dim_contas (id, nome_conta) VALUES ($1, $2)
          ON CONFLICT (id) DO UPDATE SET nome_conta = EXCLUDED.nome_conta;
        `, [row.account_id, row.account_name || 'Desconhecida']);
      }

      if (row.campaign_id) {
        await client.query(`
          INSERT INTO dim_campanhas (id, id_conta, nome_campanha) VALUES ($1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET nome_campanha = EXCLUDED.nome_campanha;
        `, [row.campaign_id, row.account_id, row.campaign_name || 'Desconhecida']);
      }

      if (row.adset_id) {
        await client.query(`
          INSERT INTO dim_conjuntos (id, id_campanha, nome_conjunto) VALUES ($1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET nome_conjunto = EXCLUDED.nome_conjunto;
        `, [row.adset_id, row.campaign_id, row.adset_name || 'Desconhecido']);
      }

      if (row.ad_id) {
        await client.query(`
          INSERT INTO dim_anuncios (id, id_conjunto, nome_anuncio) VALUES ($1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET nome_anuncio = EXCLUDED.nome_anuncio;
        `, [row.ad_id, row.adset_id, row.ad_name || 'Desconhecido']);
      }

      if (parsedFields.basicMetrics && jobConfig.level === 'ad' && row.ad_id) {
        await client.query(`
          INSERT INTO fato_mestre_ads (data, anuncio_id, spend, impressions, cpm, cpc, inline_link_clicks)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (data, anuncio_id) DO UPDATE SET 
            spend = EXCLUDED.spend,
            impressions = EXCLUDED.impressions,
            cpm = EXCLUDED.cpm,
            cpc = EXCLUDED.cpc,
            inline_link_clicks = EXCLUDED.inline_link_clicks;
        `, [
          row.date_start, row.ad_id, row.spend || 0, row.impressions || 0, 
          row.cpm || 0, row.cpc || 0, row.inline_link_clicks || 0
        ]);
      }
    }
    
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    pool.end();
  }
};
