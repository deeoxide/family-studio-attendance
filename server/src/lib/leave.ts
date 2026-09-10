/** Working-day counter for leave requests: excludes weekends and public holidays. */
export interface WorkingDaysResult {
  days: number;
  weekendDays: number;
  holidayDays: number;
}

function parseISO(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function workingDaysBetween(
  fromISO: string,
  toISO: string,
  holidayISO: readonly string[],
): WorkingDaysResult | null {
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null;

  const holidaySet = new Set(holidayISO);
  let days = 0;
  let weekendDays = 0;
  let holidayDays = 0;
  for (let d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (dow === 0 || dow === 6) {
      weekendDays++;
      continue;
    }
    if (holidaySet.has(iso)) {
      holidayDays++;
      continue;
    }
    days++;
  }
  return { days, weekendDays, holidayDays };
}

export interface LeaveSplit {
  paid: { from: string; to: string; days: number } | null;
  unpaid: { from: string; to: string; days: number } | null;
}

/**
 * Split a leave date range so the first `paidWorkingDays` working days stay on
 * the requested (paid) type and the rest fall to unpaid leave. Used when an
 * employee asks for more days than their balance covers.
 *
 *  - `paidWorkingDays <= 0`           → the whole range is unpaid
 *  - range fits within `paidWorkingDays` → the whole range is paid
 *  - otherwise                        → paid = [from … Nth working day],
 *                                       unpaid = [next working day … to]
 *
 * Returns null for a malformed or inverted range.
 */
export function splitLeaveRange(
  fromISO: string,
  toISO: string,
  holidayISO: readonly string[],
  paidWorkingDays: number,
): LeaveSplit | null {
  const total = workingDaysBetween(fromISO, toISO, holidayISO);
  if (!total) return null;

  if (paidWorkingDays <= 0) {
    return { paid: null, unpaid: { from: fromISO, to: toISO, days: total.days } };
  }
  if (total.days <= paidWorkingDays) {
    return { paid: { from: fromISO, to: toISO, days: total.days }, unpaid: null };
  }

  const holidaySet = new Set(holidayISO);
  const a = parseISO(fromISO);
  const b = parseISO(toISO);
  let seen = 0;
  let lastPaidISO = fromISO;
  let firstUnpaidISO: string | null = null;
  for (let d = new Date(a); d <= b; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (dow === 0 || dow === 6 || holidaySet.has(iso)) continue;
    seen++;
    if (seen <= paidWorkingDays) {
      lastPaidISO = iso;
    } else {
      firstUnpaidISO = iso;
      break;
    }
  }

  return {
    paid: { from: fromISO, to: lastPaidISO, days: paidWorkingDays },
    unpaid: { from: firstUnpaidISO!, to: toISO, days: total.days - paidWorkingDays },
  };
}

/**
 * Count the working days (Mon–Fri, minus public holidays) in one calendar month.
 * `periodMonth` is "YYYY-MM". Used as the divisor when a whole day of pay has to
 * be valued (e.g. an unpaid day in the late-deduction ladder), so it reflects the
 * actual month rather than a flat 22. Pure; day-of-week is evaluated in UTC to
 * stay consistent with `workingDaysBetween` (a bare calendar date has a stable
 * weekday regardless of zone).
 */
export function workingDaysInMonth(
  periodMonth: string,
  holidays: Set<string> | readonly string[],
): number {
  const m = /^(\d{4})-(\d{2})$/.exec(periodMonth);
  if (!m) return 0;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1–12
  if (month < 1 || month > 12) return 0;
  const holidaySet = holidays instanceof Set ? holidays : new Set(holidays);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const iso = `${m[1]}-${m[2]}-${String(day).padStart(2, '0')}`;
    if (holidaySet.has(iso)) continue;
    count++;
  }
  return count;
}
