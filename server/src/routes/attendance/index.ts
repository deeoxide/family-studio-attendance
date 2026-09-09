import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { punchRouter } from './punch';
import { teamRouter } from './team';
import { correctionsRouter } from './corrections';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

// Self-service punches / history / summary.
attendanceRouter.use(punchRouter);
// Manager · HR · Admin team views (roll call, KPI board).
attendanceRouter.use(teamRouter);
// Manual edits + missed-punch correction workflow.
attendanceRouter.use(correctionsRouter);
