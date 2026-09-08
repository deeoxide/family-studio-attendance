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

export function isSamePeriod(dateISO: string, periodMonth: string): boolean {
  return dateISO.startsWith(periodMonth);
}

/** Next "YYYY-MM" after the given period. */
export function nextPeriodMonth(periodMonth: string): string {
  const [y, m] = periodMonth.split('-').map(Number);
  const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}`;
}
