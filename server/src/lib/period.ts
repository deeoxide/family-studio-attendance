/** Calendar-day/period helpers, anchored to Laos local time (Asia/Vientiane, UTC+7). */

const TZ = 'Asia/Vientiane';

function vientianeParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA gives YYYY-MM-DD directly
  return fmt.format(d); // "2026-09-08"
}

/** Today's calendar date in Vientiane local time, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return vientianeParts(now);
}

/** Current billing period ("YYYY-MM") in Vientiane local time. */
export function currentPeriodMonth(now: Date = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/** Current calendar year in Vientiane local time (for "…this year" totals). */
export function currentYear(now: Date = new Date()): number {
  return Number(todayISO(now).slice(0, 4));
}

/** Minutes since local midnight, Vientiane time. */
export function minutesOfDayVientiane(now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const [h, m] = fmt.format(now).split(':').map(Number);
  return h * 60 + m;
}

/**
 * A wall-clock time on a given Vientiane calendar day, as a real Date.
 * Vientiane is UTC+7 year-round (no DST), so H:M there is (H-7):M UTC.
 * `hhmm` is "HH:MM" (24h). Returns null if either input is malformed.
 */
export function vientianeWallClock(dateISO: string, hhmm: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  const tm = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!dm || !tm) return null;
  const [y, mo, d] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  const [h, mi] = [Number(tm[1]), Number(tm[2])];
  if (h > 23 || mi > 59) return null;
  return new Date(Date.UTC(y, mo - 1, d, h - 7, mi));
}

/** Next "YYYY-MM" after the given period. */
export function nextPeriodMonth(periodMonth: string): string {
  const [y, m] = periodMonth.split('-').map(Number);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}`;
}
