import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';
import { assertCanManage } from '../../middleware/loadTarget';
import { scopedTeamIds } from '../../middleware/scopedTeam';
import { isAdminOrHR } from '../../lib/scope';
import { parse } from '../../http/validate';
import { conflict, notFound, unprocessable } from '../../http/errors';
import { isoDate, hhmm } from '../../lib/validators';

/**
 * Outings — an employee stepping out during the shift (client visit, meeting,
 * errand, dropping off documents). The person stays checked in, so an approved
 * outing never affects late minutes or worked hours; it is a record only.
 *
 *  - EMPLOYEE          → PENDING, decided by their manager (Approvals tab)
 *  - MANAGER/HR/ADMIN  → auto-APPROVED + autoLogged, surfaced to HR for info
 */
export const outingsRouter = Router();

const CATEGORIES = ['MEETING', 'CLIENT', 'ERRAND', 'DOCUMENT', 'OTHER'] as const;

const userSummary = { select: { nameEn: true, nameLo: true, initials: true } } as const;

const createSchema = z.object({
  date: isoDate,
  fromTime: hhmm,
  toTime: hhmm,
  category: z.enum(CATEGORIES),
  purpose: z.string().trim().max(500).optional().default(''),
});

/** Log an outing. Any signed-in user; the approval path depends on their role. */
outingsRouter.post('/outings', async (req, res) => {
  const { date, fromTime, toTime, category, purpose } = parse(createSchema, req.body, 'Invalid outing');
  if (toTime <= fromTime) throw unprocessable('The return time must be after the leaving time');

  const clash = await prisma.outing.findFirst({
    where: { userId: req.user!.id, date, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (clash) throw conflict('You already have an outing logged for that day');

  const selfLogged = isAdminOrHR(req.user!) || req.user!.role === 'MANAGER';
  const outing = await prisma.outing.create({
    data: {
      userId: req.user!.id,
      date,
      fromTime,
      toTime,
      category,
      purpose: purpose.trim(),
      ...(selfLogged
        ? { status: 'APPROVED', autoLogged: true, decidedById: req.user!.id, decidedAt: new Date() }
        : {}),
    },
  });
  res.status(201).json({ outing });
});

/** The signed-in person's own outing history. */
outingsRouter.get('/outings', async (req, res) => {
  const outings = await prisma.outing.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });
  res.json({ outings });
});

/** Pending outings to decide, scoped to the caller's team. */
outingsRouter.get('/outings/pending', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const outings = await prisma.outing.findMany({
    where: { status: 'PENDING', userId: { in: await scopedTeamIds(req.user!) } },
    orderBy: { createdAt: 'asc' },
    include: { user: userSummary },
  });
  res.json({ outings });
});

/**
 * Auto-logged outings (managers etc. informing HR). HR / Admin only — the
 * "manager stepped out" notification list. Last 30, newest first.
 */
outingsRouter.get('/outings/logged', requireRole('HR', 'ADMIN'), async (_req, res) => {
  const outings = await prisma.outing.findMany({
    where: { autoLogged: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: 30,
    include: { user: userSummary },
  });
  res.json({ outings });
});

async function decideOuting(req: Request, res: Response, status: 'APPROVED' | 'REJECTED') {
  const outing = await prisma.outing.findUnique({ where: { id: req.params.id } });
  if (!outing || outing.status !== 'PENDING') throw notFound('Not found');

  const target = await prisma.user.findUnique({ where: { id: outing.userId } });
  if (!target) throw notFound('Not found');
  assertCanManage(req.user!, target);

  const updated = await prisma.outing.update({
    where: { id: outing.id },
    data: { status, decidedById: req.user!.id, decidedAt: new Date() },
  });
  res.json({ outing: updated });
}

outingsRouter.post('/outings/:id/approve', requireRole('MANAGER', 'HR', 'ADMIN'), (req, res) =>
  decideOuting(req, res, 'APPROVED'),
);
outingsRouter.post('/outings/:id/reject', requireRole('MANAGER', 'HR', 'ADMIN'), (req, res) =>
  decideOuting(req, res, 'REJECTED'),
);
