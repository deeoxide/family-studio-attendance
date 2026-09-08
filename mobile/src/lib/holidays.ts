import type { Holiday } from '@/api/types';
import type { Lang } from '@/i18n/strings';
import { pick } from './format';

export interface HolidayGroup {
  key: string;
  fromISO: string;
  toISO: string;
  dateLabel: string;
  name: string;
  note: string;
  days: number;
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dateLabel(fromISO: string, toISO: string, lang: Lang): string {
  const from = new Date(`${fromISO}T12:00:00Z`);
  const to = new Date(`${toISO}T12:00:00Z`);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', timeZone: 'UTC' };
  const monthOpts: Intl.DateTimeFormatOptions = { month: 'short', timeZone: 'UTC' };
  const locale = lang === 'lo' ? 'lo-LA' : 'en-GB';
  if (fromISO === toISO) return `${from.toLocaleDateString(locale, opts)} ${from.toLocaleDateString(locale, monthOpts)}`;
  if (from.getUTCMonth() === to.getUTCMonth()) {
    return `${from.toLocaleDateString(locale, opts)}–${to.toLocaleDateString(locale, opts)} ${to.toLocaleDateString(locale, monthOpts)}`;
  }
  return `${from.toLocaleDateString(locale, opts)} ${from.toLocaleDateString(locale, monthOpts)} – ${to.toLocaleDateString(locale, opts)} ${to.toLocaleDateString(locale, monthOpts)}`;
}

/** Merges consecutive same-name holiday rows (e.g. the 3-day Pi Mai Lao) into one display group. */
export function groupHolidays(holidays: Holiday[], lang: Lang): HolidayGroup[] {
  const sorted = [...holidays].sort((a, b) => (a.date < b.date ? -1 : 1));
  const groups: HolidayGroup[] = [];
  for (const h of sorted) {
    const last = groups[groups.length - 1];
    const name = pick(lang, h.nameEn, h.nameLo);
    if (last && last.name === name && nextDay(last.toISO) === h.date) {
      last.toISO = h.date;
      last.days += 1;
      last.dateLabel = dateLabel(last.fromISO, last.toISO, lang);
    } else {
      groups.push({
        key: h.id,
        fromISO: h.date,
        toISO: h.date,
        dateLabel: dateLabel(h.date, h.date, lang),
        name,
        note: pick(lang, h.noteEn, h.noteLo),
        days: 1,
      });
    }
  }
  return groups;
}

export function nextUpcoming(groups: HolidayGroup[], todayISO: string): HolidayGroup | null {
  return groups.find((g) => g.fromISO >= todayISO) ?? groups[groups.length - 1] ?? null;
}

export function daysUntil(iso: string, todayISO: string): number {
  const a = new Date(`${todayISO}T12:00:00Z`).getTime();
  const b = new Date(`${iso}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}
