import { prisma } from './prisma';
import { computePay, PayResult } from './payroll';
import { lateModel, LateDayResult } from './lateDeduction';
import type { User } from '@prisma/client';

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

/** Apply the punctuality rule from a set of this-month late days + staged figures. */
function figuresFrom(input: OpenPeriodInput, lateDays: { date: string; lateMinutes: number }[]): OpenPeriodFigures {
  const lm = lateModel(lateDays, input.basicSalary);
  const pay = computePay({
    basic: input.basicSalary,
    ot: input.ot,
    allowance: input.allowance,
    half: lm.half,
    lateDeduct: lm.total,
  });
  return { pay, half: lm.half, lateRows: lm.rows };
}

/**
 * Live figures for one still-open payslip: reads this month's late arrivals so
 * the number shown before the run is approved always reflects today's
 * attendance.
 */
export async function computeOpenPeriod(
  user: Pick<User, 'id' | 'basicSalary'>,
  periodMonth: string,
  ot: number,
  allowance: number,
): Promise<OpenPeriodFigures> {
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: user.id, date: { startsWith: periodMonth }, lateMinutes: { gt: 0 } },
  });
  return figuresFrom(
    { userId: user.id, basicSalary: user.basicSalary, ot, allowance },
    records.map((r) => ({ date: r.date, lateMinutes: r.lateMinutes })),
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
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: { in: ids }, date: { startsWith: periodMonth }, lateMinutes: { gt: 0 } },
  });

  const lateByUser = new Map<string, { date: string; lateMinutes: number }[]>();
  for (const id of ids) lateByUser.set(id, []);
  for (const r of records) lateByUser.get(r.userId)!.push({ date: r.date, lateMinutes: r.lateMinutes });

  const out = new Map<string, OpenPeriodFigures>();
  for (const input of inputs) out.set(input.userId, figuresFrom(input, lateByUser.get(input.userId) ?? []));
  return out;
}
