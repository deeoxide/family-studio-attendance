import type { Lang } from '@/i18n/strings';

/** "2026-09" -> "September 2026" (or the Lao equivalent). */
export function periodLabel(periodMonth: string, lang: Lang): string {
  const [y, m] = periodMonth.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1, 12));
  return d.toLocaleDateString(lang === 'lo' ? 'lo-LA' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
