import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// List all DB credentials
router.get('/', async (req, res) => {
  try {
    const databases = await prisma.destinationDatabase.findMany({
      select: { id: true, name: true, host: true, port: true, user: true, database: true, updatedAt: true }
    });
    res.json(databases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create DB connection
router.post('/', async (req, res) => {
  try {
    const { name, host, port, user, password, database } = req.body;
    const newDb = await prisma.destinationDatabase.create({
      data: { name, host, port: parseInt(port, 10), user, password, database }
    });
    const { password: _, ...safeDb } = newDb;
    res.status(201).json(safeDb);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete connection
router.delete('/:id', async (req, res) => {
  try {
    await prisma.destinationDatabase.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
