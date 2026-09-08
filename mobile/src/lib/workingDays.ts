/** Client-side mirror of server/src/lib/leave.ts, for live preview in the apply-leave form. */
export interface WorkingDaysResult {
  days: number;
  weekendDays: number;
  holidayDays: number;
}

function parseISO(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function workingDaysBetween(fromISO: string, toISO: string, holidayISO: readonly string[]): WorkingDaysResult | null {
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
