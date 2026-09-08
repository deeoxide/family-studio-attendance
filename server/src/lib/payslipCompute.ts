import { prisma } from './prisma';
import { computePay, PayResult } from './payroll';
import { lateModel, LateDayResult } from './lateDeduction';
import type { User } from '@prisma/client';

/**
 * Live figures for a still-open payroll period: reads this month's attendance
 * to apply the punctuality/late-deduction rule, so the number shown before
 * the run is approved always reflects today's attendance.
 */
export async function computeOpenPeriod(
  user: Pick<User, 'id' | 'basicSalary'>,
  periodMonth: string,
  ot: number,
  allowance: number,
): Promise<{ pay: PayResult; half: boolean; lateRows: LateDayResult[] }> {
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: user.id, date: { startsWith: periodMonth }, lateMinutes: { gt: 0 } },
  });
  const lm = lateModel(
    records.map((r) => ({ date: r.date, lateMinutes: r.lateMinutes })),
    user.basicSalary,
  );
  const pay = computePay({ basic: user.basicSalary, ot, allowance, half: lm.half, lateDeduct: lm.total });
  return { pay, half: lm.half, lateRows: lm.rows };
}
