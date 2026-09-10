/**
 * Punctuality / late-deduction rule, ported from the prototype's `lateModel`,
 * but driven off real attendance rows instead of a hardcoded demo array.
 *
 * Rule (Family Studio, as specified by the user):
 *  - Clock-in grace ends 09:30; arriving after that is "late".
 *  - The first 3 late days in a calendar month get a warning letter
 *    (ໃບຕັກເຕືອນ) only — no deduction.
 *  - From the 4th late day, every *started* hour after 09:30 costs 10,000 LAK.
 *  - Arriving more than 2 hours late (i.e. after 11:30) leaves the whole day
 *    unpaid, valued at basic ÷ the number of working days in that month
 *    (Mon–Fri minus public holidays; see workingDaysInMonth in leave.ts).
 *  - 15 or more late days in the month drops the whole month's basic salary
 *    to half (overtime and allowance are unaffected).
 */

export const GRACE_MIN = 570; // 09:30 in minutes-from-midnight
export const LATE_RATE = 10_000; // LAK per started hour after the grace cutoff
export const LATE_FREE = 3; // first N late days: warning letter only
export const HALF_AT = 15; // half salary from this many late days
export const UNPAID_AFTER_MIN = 120; // more than 2h late -> day unpaid
/** Fallback divisor for an unpaid day when the caller does not pass the month's
 *  real working-day count. Callers on the payroll path always pass the real
 *  number (workingDaysInMonth); this only covers ad-hoc/legacy calls. */
export const WORKING_DAYS_PER_MONTH = 22;

export interface LateDay {
  date: string; // YYYY-MM-DD
  lateMinutes: number; // minutes past GRACE_MIN
}

export interface LateDayResult extends LateDay {
  index: number; // 0-based order within the month
  charged: boolean; // false for the first LATE_FREE days (warning only)
  unpaid: boolean; // true if more than UNPAID_AFTER_MIN minutes late
  amount: number; // LAK deducted for this day
}

export interface LateModelResult {
  rows: LateDayResult[];
  total: number; // total LAK deducted this month
  count: number;
  warned: boolean; // hit the warning-letter threshold
  deducting: boolean; // past the free days, deductions are active
  half: boolean; // hit the half-salary threshold
  dailyRate: number; // basic / working-days-in-month, used for unpaid days
}

export function lateModel(
  days: LateDay[],
  basicSalary: number,
  workingDays: number = WORKING_DAYS_PER_MONTH,
): LateModelResult {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const divisor = workingDays > 0 ? workingDays : WORKING_DAYS_PER_MONTH;
  const dailyRate = Math.round(basicSalary / divisor);
  let total = 0;
  const rows: LateDayResult[] = sorted.map((d, index) => {
    const unpaid = d.lateMinutes > UNPAID_AFTER_MIN;
    const charged = index >= LATE_FREE;
    const amount = !charged ? 0 : unpaid ? dailyRate : Math.ceil(d.lateMinutes / 60) * LATE_RATE;
    total += amount;
    return { ...d, index, charged, unpaid, amount };
  });
  const count = sorted.length;
  return {
    rows,
    total,
    count,
    warned: count >= LATE_FREE,
    deducting: count > LATE_FREE,
    half: count >= HALF_AT,
    dailyRate,
  };
}
