import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { workingDaysBetween } from '../lib/leave';
import { assertCanManage } from '../middleware/loadTarget';
import { scopedTeamIds } from '../middleware/scopedTeam';
import { parse } from '../http/validate';
import { notFound, unprocessable } from '../http/errors';
import { isoDate } from '../lib/validators';
import { currentYear } from '../lib/period';

export const leaveRouter = Router();
leaveRouter.use(requireAuth);

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'PERSONAL'] as const;

/** Year from `?year=`, falling back to the current Vientiane calendar year. */
const yearParam = (req: Request) => Number(req.query.year) || currentYear();

async function holidayISOList(): Promise<string[]> {
  const holidays = await prisma.holiday.findMany();
  return holidays.map((h) => h.date);
}

/** Approved leave days taken by one person in a year, keyed by leave type. */
async function approvedDaysByType(userId: string, year: number): Promise<Record<string, number>> {
  const approved = await prisma.leaveRequest.findMany({
    where: { userId, status: 'APPROVED', fromDate: { startsWith: String(year) } },
  });
  const used: Record<string, number> = {};
  for (const r of approved) used[r.leaveType] = (used[r.leaveType] ?? 0) + r.workingDays;
  return used;
}

leaveRouter.get('/balance', async (req, res) => {
  const year = yearParam(req);
  const [balances, used] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { userId: req.user!.id, year } }),
    approvedDaysByType(req.user!.id, year),
  ]);
  res.json({
    balances: balances.map((b) => ({
      leaveType: b.leaveType,
      totalDays: b.totalDays,
      usedDays: used[b.leaveType] ?? 0,
      remainingDays: b.totalDays - (used[b.leaveType] ?? 0),
    })),
  });
});

leaveRouter.get('/holidays', async (req, res) => {
  const holidays = await prisma.holiday.findMany({
    where: { date: { startsWith: String(yearParam(req)) } },
    orderBy: { date: 'asc' },
  });
  res.json({ holidays });
});

leaveRouter.get('/requests', async (req, res) => {
  const requests = await prisma.leaveRequest.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ requests });
});

/** Working days in [from, to], or a 422 if the range has none. */
async function countWorkingDaysOrThrow(from: string, to: string): Promise<number> {
  const wd = workingDaysBetween(from, to, await holidayISOList());
  if (!wd || wd.days === 0) {
    throw unprocessable('That range has no working days. Pick different dates.');
  }
  return wd.days;
}

const applySchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  from: isoDate,
  to: isoDate,
  reason: z.string().max(500).optional().default(''),
});

leaveRouter.post('/apply', async (req, res) => {
  const { leaveType, from, to, reason } = parse(applySchema, req.body, 'Invalid leave request');

  const days = await countWorkingDaysOrThrow(from, to);
  if (leaveType === 'SICK' && !reason.trim()) {
    throw unprocessable('Sick leave needs a short reason.');
  }

  const year = Number(from.slice(0, 4));
  const [balance, used] = await Promise.all([
    prisma.leaveBalance.findUnique({
      where: { userId_leaveType_year: { userId: req.user!.id, leaveType, year } },
    }),
    approvedDaysByType(req.user!.id, year),
  ]);
  const remaining = (balance?.totalDays ?? 0) - (used[leaveType] ?? 0);
  if (days > remaining) {
    throw unprocessable(
      `Only ${remaining} day${remaining === 1 ? '' : 's'} remain in that balance. Shorten the range.`,
    );
  }

  const request = await prisma.leaveRequest.create({
    data: { userId: req.user!.id, leaveType, fromDate: from, toDate: to, workingDays: days, reason: reason.trim() },
  });
  res.status(201).json({ request });
});

const recordSchema = z.object({
  userId: z.string().min(1),
  leaveType: z.enum(LEAVE_TYPES),
  from: isoDate,
  to: isoDate,
  reason: z.string().trim().max(500).optional().default(''),
});

/**
 * Record leave directly for an employee — saved already APPROVED, no request
 * step. HR / Admin for anyone; a manager for their direct reports. Entitlements
 * are managed separately (POST /api/people/:id/leave-balance), so this does not
 * block on the remaining balance.
 */
leaveRouter.post('/record', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const { userId, leaveType, from, to, reason } = parse(recordSchema, req.body, 'Invalid leave record');

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw notFound('Employee not found');
  assertCanManage(req.user!, target);

  const days = await countWorkingDaysOrThrow(from, to);
  const request = await prisma.leaveRequest.create({
    data: {
      userId,
      leaveType,
      fromDate: from,
      toDate: to,
      workingDays: days,
      reason: reason.trim(),
      status: 'APPROVED',
      decidedById: req.user!.id,
      decidedAt: new Date(),
    },
  });
  res.status(201).json({ request });
});

leaveRouter.get('/pending', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const requests = await prisma.leaveRequest.findMany({
    where: { userId: { in: await scopedTeamIds(req.user!) }, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { nameEn: true, nameLo: true, initials: true } } },
  });
  res.json({ requests });
});

async function decideLeave(req: Request, res: Response, status: 'APPROVED' | 'REJECTED') {
  const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.status !== 'PENDING') throw notFound('Not found');

  const target = await prisma.user.findUnique({ where: { id: request.userId } });
  if (!target) throw notFound('Not found');
  assertCanManage(req.user!, target);

  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status, decidedById: req.user!.id, decidedAt: new Date() },
  });
  res.json({ request: updated });
}

leaveRouter.post('/:id/approve', requireRole('MANAGER', 'HR', 'ADMIN'), (req, res) => decideLeave(req, res, 'APPROVED'));
leaveRouter.post('/:id/reject', requireRole('MANAGER', 'HR', 'ADMIN'), (req, res) => decideLeave(req, res, 'REJECTED'));
