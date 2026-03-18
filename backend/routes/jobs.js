import express from 'express';
import { PrismaClient } from '@prisma/client';
import { enqueueJob } from '../services/queueService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create new pipeline extraction job
router.post('/', async (req, res) => {
  try {
    const { name, destinationId, apiVersion, datePreset, timeIncrement, level, accounts, fields, cronSchedule } = req.body;
    
    if (!name || !destinationId) return res.status(400).json({ error: 'Name and Destination Required' });

    const job = await prisma.pipelineJob.create({
      data: {
        name,
        destinationId,
        accounts,
        level: level || 'ad',
        datePreset: datePreset || 'last_30d',
        timeIncrement: timeIncrement || '1',
        fields,
        cronSchedule
      }
    });

    // Despacha o Job para a Fila do Redis BullMQ instantaneamente para o Backfill Principal
    await enqueueJob(job.id);
    
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const jobs = await prisma.pipelineJob.findMany({
      include: { destination: true }
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
