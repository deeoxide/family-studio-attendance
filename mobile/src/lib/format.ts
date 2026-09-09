import type { Lang } from '@/i18n/strings';

const TZ = 'Asia/Vientiane';

export function lak(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function pick(lang: Lang, en: string, lo: string): string {
  return lang === 'lo' ? lo : en;
}

/** Vientiane-local "09:41" from an ISO timestamp, or a placeholder if null. */
export function hhmm(iso: string | null): string {
  if (!iso) return '––:––';
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Vientiane-local "Wed 9 Sept, 09:41" from a full ISO timestamp. */
export function formatTimestamp(iso: string, lang: Lang): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(lang === 'lo' ? 'lo-LA' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  });
  return `${day}, ${hhmm(iso)}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function elapsedClock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function hoursMinutes(mins: number): string {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** A pure YYYY-MM-DD calendar date, anchored at UTC noon so no device timezone can roll it to the next/previous day. */
function anchorDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function formatDateLong(iso: string, lang: Lang): string {
  return anchorDate(iso).toLocaleDateString(lang === 'lo' ? 'lo-LA' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  });
}

export function formatDateShort(iso: string, lang: Lang): string {
  return anchorDate(iso).toLocaleDateString(lang === 'lo' ? 'lo-LA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  });
}

export function formatDateWeekdayShort(iso: string, lang: Lang): string {
  return anchorDate(iso).toLocaleDateString(lang === 'lo' ? 'lo-LA' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  });
}

export function formatRange(fromISO: string, toISO: string, lang: Lang): string {
  return fromISO === toISO ? formatDateShort(fromISO, lang) : `${formatDateShort(fromISO, lang)} – ${formatDateShort(toISO, lang)}`;
}

/** HH:MM-of-day (minutes since midnight) as a clock string, e.g. 570 -> "09:30". */
export function minutesToClock(mins: number): string {
  return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;
}
