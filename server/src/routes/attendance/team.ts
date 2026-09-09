import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';
import { scopedTeam } from '../../middleware/scopedTeam';
import { requireOffice } from '../../lib/office';
import { currentPeriodMonth, currentYear, todayISO } from '../../lib/period';
import { punctualityKpis } from '../../lib/kpi';

/** Manager / HR / Admin views over the team: today's roll call and the monthly KPI board. */
export const teamRouter = Router();

// requireRole is applied per route, not via teamRouter.use(): a sub-router's
// .use() middleware also runs for sibling routers mounted after it on the same
// path, which would 403 employees out of the corrections routes.
const managerUp = requireRole('MANAGER', 'HR', 'ADMIN');

/** Roll call — today's status for the caller's team (see scopedTeam / B4). */
teamRouter.get('/team-today', managerUp, async (req, res) => {
  const team = await scopedTeam(req.user!, { nameEn: 'asc' });
  const ids = team.map((u) => u.id);
  const date = todayISO();

  const [records, onLeave] = await Promise.all([
    prisma.attendanceRecord.findMany({ where: { userId: { in: ids }, date } }),
    prisma.leaveRequest.findMany({
      where: { userId: { in: ids }, status: 'APPROVED', fromDate: { lte: date }, toDate: { gte: date } },
    }),
  ]);
  const byUser = new Map(records.map((r) => [r.userId, r]));
  const onLeaveIds = new Set(onLeave.map((r) => r.userId));

  res.json({
    date,
    team: team.map((u) => {
      const rec = byUser.get(u.id);
      return {
        user: { id: u.id, nameEn: u.nameEn, nameLo: u.nameLo, initials: u.initials },
        onLeave: onLeaveIds.has(u.id),
        checkInAt: rec?.checkInAt ?? null,
        checkOutAt: rec?.checkOutAt ?? null,
        lateMinutes: rec?.lateMinutes ?? 0,
        distance: rec?.checkInDistanceM ?? null,
      };
    }),
  });
});

/**
 * Punctuality KPI board for the current month. Powers the "Punctuality" view in
 * the People / Team screens.
 */
teamRouter.get('/kpi', managerUp, async (req, res) => {
  const [users, office] = await Promise.all([scopedTeam(req.user!, { nameEn: 'asc' }), requireOffice()]);
  const periodMonth = currentPeriodMonth();
  const kpis = await punctualityKpis(
    users.map((u) => ({ id: u.id, basicSalary: u.basicSalary })),
    periodMonth,
    { shiftEndMin: office.shiftEndMin, year: currentYear() },
  );

  const rows = users.map((u) => {
    const k = kpis.get(u.id)!;
    return {
      user: {
        id: u.id,
        nameEn: u.nameEn,
        nameLo: u.nameLo,
        initials: u.initials,
        roleTitleEn: u.roleTitleEn,
        roleTitleLo: u.roleTitleLo,
      },
      lateCount: k.lateCount,
      level: k.level,
      lateDeduction: k.lateDeduction,
      halfSalary: k.halfSalary,
      leftEarlyCount: k.leftEarlyCount,
      leaveDaysYtd: k.leaveDaysYtd,
    };
  });

  res.json({
    periodMonth,
    rows,
    totals: {
      green: rows.filter((r) => r.level === 'green').length,
      yellow: rows.filter((r) => r.level === 'yellow').length,
      red: rows.filter((r) => r.level === 'red').length,
      lateDays: rows.reduce((s, r) => s + r.lateCount, 0),
      lateDeduction: rows.reduce((s, r) => s + r.lateDeduction, 0),
    },
  });
});
