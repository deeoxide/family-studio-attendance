import { prisma } from './prisma';
import { computePay, PayResult } from './payroll';
import { lateModel, LateDayResult } from './lateDeduction';
import { workingDaysInMonth } from './leave';
import type { User } from '@prisma/client';

/** Public-holiday dates (YYYY-MM-DD) that fall inside one "YYYY-MM" period. */
async function periodHolidayISO(periodMonth: string): Promise<string[]> {
  const holidays = await prisma.holiday.findMany({ where: { date: { startsWith: periodMonth } } });
  return holidays.map((h) => h.date);
}

/** Approved UNPAID-leave working days each user took in the period, keyed by userId. */
async function unpaidLeaveDaysByUser(userIds: string[], periodMonth: string): Promise<Map<string, number>> {
  const rows = await prisma.leaveRequest.findMany({
    where: { userId: { in: userIds }, status: 'APPROVED', leaveType: 'UNPAID', fromDate: { startsWith: periodMonth } },
  });
  const byUser = new Map<string, number>();
  for (const id of userIds) byUser.set(id, 0);
  for (const r of rows) byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + r.workingDays);
  return byUser;
}

export interface OpenPeriodFigures {
  pay: PayResult;
  half: boolean;
  lateRows: LateDayResult[];
}

export interface OpenPeriodInput {
  userId: string;
  basicSalary: number;
  ot: number;
  allowance: number;
}

/** Apply the punctuality rule + unpaid-leave docking from this month's records + staged figures. */
function figuresFrom(
  input: OpenPeriodInput,
  lateDays: { date: string; lateMinutes: number }[],
  workingDays: number,
  unpaidLeaveDays: number,
): OpenPeriodFigures {
  const lm = lateModel(lateDays, input.basicSalary, workingDays);
  const dailyRate = workingDays > 0 ? input.basicSalary / workingDays : 0;
  const unpaidDeduct = Math.round(unpaidLeaveDays * dailyRate);
  const pay = computePay({
    basic: input.basicSalary,
    ot: input.ot,
    allowance: input.allowance,
    half: lm.half,
    lateDeduct: lm.total,
    unpaidDeduct,
  });
  return { pay, half: lm.half, lateRows: lm.rows };
}

/**
 * Live figures for one still-open payslip: reads this month's late arrivals and
 * approved unpaid leave so the number shown before the run is approved always
 * reflects today's attendance.
 */
export async function computeOpenPeriod(
  user: Pick<User, 'id' | 'basicSalary'>,
  periodMonth: string,
  ot: number,
  allowance: number,
): Promise<OpenPeriodFigures> {
  const [records, holidayISO, unpaidByUser] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { userId: user.id, date: { startsWith: periodMonth }, lateMinutes: { gt: 0 } },
    }),
    periodHolidayISO(periodMonth),
    unpaidLeaveDaysByUser([user.id], periodMonth),
  ]);
  return figuresFrom(
    { userId: user.id, basicSalary: user.basicSalary, ot, allowance },
    records.map((r) => ({ date: r.date, lateMinutes: r.lateMinutes })),
    workingDaysInMonth(periodMonth, holidayISO),
    unpaidByUser.get(user.id) ?? 0,
  );
}

/**
 * Same as `computeOpenPeriod`, for a whole payroll run at once: one attendance
 * query for every employee instead of one per payslip.
 */
export async function computeOpenPeriodMany(
  inputs: OpenPeriodInput[],
  periodMonth: string,
): Promise<Map<string, OpenPeriodFigures>> {
  const ids = inputs.map((i) => i.userId);
  const [records, holidayISO, unpaidByUser] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { userId: { in: ids }, date: { startsWith: periodMonth }, lateMinutes: { gt: 0 } },
    }),
    periodHolidayISO(periodMonth),
    unpaidLeaveDaysByUser(ids, periodMonth),
  ]);
  const workingDays = workingDaysInMonth(periodMonth, holidayISO);

  const lateByUser = new Map<string, { date: string; lateMinutes: number }[]>();
  for (const id of ids) lateByUser.set(id, []);
  for (const r of records) lateByUser.get(r.userId)!.push({ date: r.date, lateMinutes: r.lateMinutes });

  const out = new Map<string, OpenPeriodFigures>();
  for (const input of inputs) {
    out.set(
      input.userId,
      figuresFrom(input, lateByUser.get(input.userId) ?? [], workingDays, unpaidByUser.get(input.userId) ?? 0),
    );
  }
  return out;
}
