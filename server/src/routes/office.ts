import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireOffice } from '../lib/office';

export const officeRouter = Router();

officeRouter.get('/', requireAuth, async (_req, res) => {
  res.json({ office: await requireOffice() });
});
