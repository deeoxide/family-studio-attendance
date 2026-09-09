import { prisma } from './prisma';
import { lateModel, type LateDayResult } from './lateDeduction';
import { punctualityLevel, type PunctualityLevel } from './punctuality';
import { minutesOfDayVientiane } from './period';

/** Late / leave scorecard for one person in one month + this year's leave so far. */
export interface PunctualityKpi {
  lateCount: number;
  level: PunctualityLevel;
  lateDeduction: number; // LAK withheld this month for late arrivals
  halfSalary: boolean; // 15+ late days -> basic paid at half
  warned: boolean; // hit the warning-letter threshold (3 late days)
  leftEarlyCount: number; // days checked out before shift end
  leaveDaysYtd: number; // approved leave days taken this calendar year
  lateRows: LateDayResult[];
}

const EMPTY = (): PunctualityKpi => ({
  lateCount: 0,
  level: 'green',
  lateDeduction: 0,
  halfSalary: false,
  warned: false,
  leftEarlyCount: 0,
  leaveDaysYtd: 0,
  lateRows: [],
});

/**
 * Batch scorecard for a set of employees. One attendance query and one leave
 * query, grouped in memory — safe to call for the whole company.
 */
export async function punctualityKpis(
  users: Array<{ id: string; basicSalary: number }>,
  periodMonth: string,
  opts: { shiftEndMin: number; year: number },
): Promise<Map<string, PunctualityKpi>> {
  const ids = users.map((u) => u.id);
  const [records, approvedLeave] = await Promise.all([
    prisma.attendanceRecord.findMany({ where: { userId: { in: ids }, date: { startsWith: periodMonth } } }),
    prisma.leaveRequest.findMany({
      where: { userId: { in: ids }, status: 'APPROVED', fromDate: { startsWith: String(opts.year) } },
    }),
  ]);

  const late = new Map<string, Array<{ date: string; lateMinutes: number }>>();
  const early = new Map<string, number>();
  for (const id of ids) {
    late.set(id, []);
    early.set(id, 0);
  }
  for (const r of records) {
    if (r.lateMinutes > 0) late.get(r.userId)!.push({ date: r.date, lateMinutes: r.lateMinutes });
    if (r.checkOutAt && minutesOfDayVientiane(r.checkOutAt) < opts.shiftEndMin) {
      early.set(r.userId, (early.get(r.userId) ?? 0) + 1);
    }
  }
  const leaveYtd = new Map<string, number>();
  for (const l of approvedLeave) leaveYtd.set(l.userId, (leaveYtd.get(l.userId) ?? 0) + l.workingDays);

  const out = new Map<string, PunctualityKpi>();
  for (const u of users) {
    const days = late.get(u.id) ?? [];
    const lm = lateModel(days, u.basicSalary);
    out.set(u.id, {
      lateCount: lm.count,
      level: punctualityLevel(lm.count),
      lateDeduction: lm.total,
      halfSalary: lm.half,
      warned: lm.warned,
      leftEarlyCount: early.get(u.id) ?? 0,
      leaveDaysYtd: leaveYtd.get(u.id) ?? 0,
      lateRows: lm.rows,
    });
  }
  return out;
}

export { EMPTY as emptyKpi };
