// Makes Express 4 forward rejected promises from async route handlers to the
// error middleware instead of leaving them unhandled (which crashes Node). Must
// be imported before the routers are built.
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { officeRouter } from './routes/office';
import { attendanceRouter } from './routes/attendance';
import { leaveRouter } from './routes/leave';
import { payrollRouter } from './routes/payroll';
import { peopleRouter } from './routes/people';
import { jobOrdersRouter } from './routes/jobOrders';
import { errorMiddleware } from './http/errorMiddleware';

/** The Express app with every route mounted, but not listening on a port. */
export function createApp() {
  const app = express();
  // CORS_ORIGIN: comma-separated list of allowed origins in prod (e.g. your
  // Vercel domain). Unset in local dev = reflect any origin, same as before.
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : undefined));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/office', officeRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/leave', leaveRouter);
  app.use('/api/payroll', payrollRouter);
  app.use('/api/people', peopleRouter);
  app.use('/api/jobs', jobOrdersRouter);

  app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));
  app.use(errorMiddleware);

  return app;
}

export const app = createApp();
