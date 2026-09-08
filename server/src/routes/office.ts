import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

export const officeRouter = Router();

officeRouter.get('/', requireAuth, async (_req, res) => {
  const office = await prisma.office.findFirst();
  if (!office) return res.status(404).json({ error: 'No office configured' });
  res.json({ office });
});
