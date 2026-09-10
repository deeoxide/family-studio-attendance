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
