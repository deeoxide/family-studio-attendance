import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from './errors';
import { firstIssueMessage } from './validate';

/**
 * Terminal error handler. With `express-async-errors` loaded (see app.ts), a
 * rejected promise from any async route lands here instead of crashing the
 * process, so every failure path returns JSON:
 *
 *   HttpError            → its own status + message
 *   ZodError             → 400 (first issue message)
 *   Prisma P2002         → 409 (unique constraint)
 *   Prisma P2025         → 404 (record not found)
 *   anything else        → 500 (logged)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: firstIssueMessage(err, 'Invalid request') });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'That value is already in use' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
