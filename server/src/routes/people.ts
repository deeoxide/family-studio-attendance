import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

export const peopleRouter = Router();
peopleRouter.use(requireAuth, requireRole('HR'));

peopleRouter.get('/', async (_req, res) => {
  const year = new Date().getFullYear();
  const users = await prisma.user.findMany({ orderBy: { nameEn: 'asc' } });
  const balances = await prisma.leaveBalance.findMany({ where: { leaveType: 'ANNUAL', year } });
  const approved = await prisma.leaveRequest.findMany({
    where: { leaveType: 'ANNUAL', status: 'APPROVED', fromDate: { startsWith: String(year) } },
  });
  const usedByUser = new Map<string, number>();
  for (const r of approved) usedByUser.set(r.userId, (usedByUser.get(r.userId) ?? 0) + r.workingDays);
  const totalByUser = new Map(balances.map((b) => [b.userId, b.totalDays]));

  res.json({
    people: users.map((u) => ({
      id: u.id,
      nameEn: u.nameEn,
      nameLo: u.nameLo,
      roleTitleEn: u.roleTitleEn,
      roleTitleLo: u.roleTitleLo,
      initials: u.initials,
      role: u.role,
      annualLeaveLeft: (totalByUser.get(u.id) ?? 15) - (usedByUser.get(u.id) ?? 0),
    })),
  });
});
