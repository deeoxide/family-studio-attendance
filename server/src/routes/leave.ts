import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { workingDaysBetween, splitLeaveRange } from '../lib/leave';
import { assertCanManage } from '../middleware/loadTarget';
import { scopedTeamIds } from '../middleware/scopedTeam';
import { parse } from '../http/validate';
import { notFound, unprocessable } from '../http/errors';
import { isoDate } from '../lib/validators';
import { currentYear } from '../lib/period';

export const leaveRouter = Router();
leaveRouter.use(requireAuth);

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'PERSONAL', 'UNPAID'] as const;
/** UNPAID leave has no entitlement — it is never balance-checked. */
const PAID_LEAVE_TYPES = ['ANNUAL', 'SICK', 'PERSONAL'] as const;
type PaidLeaveType = (typeof PAID_LEAVE_TYPES)[number];

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

interface LeaveRow {
  leaveType: (typeof LEAVE_TYPES)[number];
  fromDate: string;
  toDate: string;
  workingDays: number;
}

/**
 * Turn one leave request into the row(s) to create. A paid request that fits the
 * remaining balance is one row; one that runs over is split — the balance-sized
 * head stays on the requested type, the tail becomes UNPAID leave (docked from
 * pay at day-rate, see payslipCompute.ts). An UNPAID request is never
 * balance-checked. Throws 422 if the range holds no working days.
 */
async function planLeaveRows(
  userId: string,
  leaveType: (typeof LEAVE_TYPES)[number],
  from: string,
  to: string,
  holidays: string[],
): Promise<LeaveRow[]> {
  const total = workingDaysBetween(from, to, holidays);
  if (!total || total.days === 0) {
    throw unprocessable('That range has no working days. Pick different dates.');
  }

  if (leaveType === 'UNPAID') {
    return [{ leaveType: 'UNPAID', fromDate: from, toDate: to, workingDays: total.days }];
  }

  const year = Number(from.slice(0, 4));
  const [balance, used] = await Promise.all([
    prisma.leaveBalance.findUnique({
      where: { userId_leaveType_year: { userId, leaveType: leaveType as PaidLeaveType, year } },
    }),
    approvedDaysByType(userId, year),
  ]);
  const remaining = Math.max(0, (balance?.totalDays ?? 0) - (used[leaveType] ?? 0));

  if (total.days <= remaining) {
    return [{ leaveType, fromDate: from, toDate: to, workingDays: total.days }];
  }

  const split = splitLeaveRange(from, to, holidays, remaining);
  if (!split) throw unprocessable('That range has no working days. Pick different dates.');
  const rows: LeaveRow[] = [];
  if (split.paid) rows.push({ leaveType, fromDate: split.paid.from, toDate: split.paid.to, workingDays: split.paid.days });
  if (split.unpaid) {
    rows.push({ leaveType: 'UNPAID', fromDate: split.unpaid.from, toDate: split.unpaid.to, workingDays: split.unpaid.days });
  }
  return rows;
}

const applySchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  from: isoDate,
  to: isoDate,
  reason: z.string().max(500).optional().default(''),
});

leaveRouter.post('/apply', async (req, res) => {
  const { leaveType, from, to, reason } = parse(applySchema, req.body, 'Invalid leave request');
  if (leaveType === 'SICK' && !reason.trim()) {
    throw unprocessable('Sick leave needs a short reason.');
  }

  const rows = await planLeaveRows(req.user!.id, leaveType, from, to, await holidayISOList());
  const requests = [];
  for (const row of rows) {
    requests.push(
      await prisma.leaveRequest.create({ data: { userId: req.user!.id, ...row, reason: reason.trim() } }),
    );
  }
  res.status(201).json({ requests });
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
 * step. HR / Admin for anyone; a manager for their direct reports. Days beyond
 * the paid balance are recorded as UNPAID (to grant extra paid leave, raise the
 * entitlement first via POST /api/people/:id/leave-balance).
 */
leaveRouter.post('/record', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const { userId, leaveType, from, to, reason } = parse(recordSchema, req.body, 'Invalid leave record');

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw notFound('Employee not found');
  assertCanManage(req.user!, target);

  const rows = await planLeaveRows(userId, leaveType, from, to, await holidayISOList());
  const requests = [];
  for (const row of rows) {
    requests.push(
      await prisma.leaveRequest.create({
        data: {
          userId,
          ...row,
          reason: reason.trim(),
          status: 'APPROVED',
          decidedById: req.user!.id,
          decidedAt: new Date(),
        },
      }),
    );
  }
  res.status(201).json({ requests });
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
