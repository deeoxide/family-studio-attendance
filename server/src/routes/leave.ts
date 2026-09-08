import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { workingDaysBetween } from '../lib/leave';

export const leaveRouter = Router();
leaveRouter.use(requireAuth);

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'PERSONAL'] as const;

async function holidayISOList() {
  const holidays = await prisma.holiday.findMany();
  return holidays.map((h) => h.date);
}

leaveRouter.get('/balance', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const [balances, approved] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { userId: req.user!.id, year } }),
    prisma.leaveRequest.findMany({
      where: { userId: req.user!.id, status: 'APPROVED', fromDate: { startsWith: String(year) } },
    }),
  ]);
  const usedByType: Record<string, number> = {};
  for (const r of approved) usedByType[r.leaveType] = (usedByType[r.leaveType] ?? 0) + r.workingDays;

  res.json({
    balances: balances.map((b) => ({
      leaveType: b.leaveType,
      totalDays: b.totalDays,
      usedDays: usedByType[b.leaveType] ?? 0,
      remainingDays: b.totalDays - (usedByType[b.leaveType] ?? 0),
    })),
  });
});

leaveRouter.get('/holidays', async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const holidays = await prisma.holiday.findMany({
    where: { date: { startsWith: String(year) } },
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

const applySchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(500).optional().default(''),
});

leaveRouter.post('/apply', async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid leave request' });
  const { leaveType, from, to, reason } = parsed.data;

  const wd = workingDaysBetween(from, to, await holidayISOList());
  if (!wd || wd.days === 0) {
    return res.status(422).json({ error: 'That range has no working days. Pick different dates.' });
  }
  if (leaveType === 'SICK' && !reason.trim()) {
    return res.status(422).json({ error: 'Sick leave needs a short reason.' });
  }

  const year = Number(from.slice(0, 4));
  const [balance, approved] = await Promise.all([
    prisma.leaveBalance.findUnique({
      where: { userId_leaveType_year: { userId: req.user!.id, leaveType, year } },
    }),
    prisma.leaveRequest.findMany({
      where: { userId: req.user!.id, leaveType, status: 'APPROVED', fromDate: { startsWith: String(year) } },
    }),
  ]);
  const used = approved.reduce((sum, r) => sum + r.workingDays, 0);
  const remaining = (balance?.totalDays ?? 0) - used;
  if (wd.days > remaining) {
    return res.status(422).json({
      error: `Only ${remaining} day${remaining === 1 ? '' : 's'} remain in that balance. Shorten the range.`,
    });
  }

  const request = await prisma.leaveRequest.create({
    data: { userId: req.user!.id, leaveType, fromDate: from, toDate: to, workingDays: wd.days, reason: reason.trim() },
  });
  res.status(201).json({ request });
});

leaveRouter.get('/pending', requireRole('MANAGER', 'HR'), async (req, res) => {
  const reports =
    req.user!.role === 'MANAGER'
      ? await prisma.user.findMany({ where: { managerId: req.user!.id } })
      : await prisma.user.findMany();
  const requests = await prisma.leaveRequest.findMany({
    where: { userId: { in: reports.map((r) => r.id) }, status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { nameEn: true, nameLo: true, initials: true } } },
  });
  res.json({ requests });
});

leaveRouter.post('/:id/approve', requireRole('MANAGER', 'HR'), async (req, res) => {
  const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.status !== 'PENDING') return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status: 'APPROVED', decidedById: req.user!.id, decidedAt: new Date() },
  });
  res.json({ request: updated });
});

leaveRouter.post('/:id/reject', requireRole('MANAGER', 'HR'), async (req, res) => {
  const request = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
  if (!request || request.status !== 'PENDING') return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status: 'REJECTED', decidedById: req.user!.id, decidedAt: new Date() },
  });
  res.json({ request: updated });
});
