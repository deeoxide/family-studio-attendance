/**
 * Job order numbers: JO<seq><MMYY>-<code>.
 *
 *  - seq   two-digit running count, resets every calendar month and is kept
 *          separately per work-type category — the first internal job opened
 *          in a month is 01, and the first external job opened that same
 *          month is separately also 01.
 *  - MMYY  the month and year the job was opened (September 2026 -> "0926").
 *  - code  001 = studio-internal work, 002 = external production.
 */
export const WORK_TYPES = ['INTERNAL', 'EXTERNAL'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

const CATEGORY_CODE: Record<WorkType, string> = { INTERNAL: '001', EXTERNAL: '002' };

/**
 * `existingCount` is how many job orders already exist for that exact
 * (month, year, workType) — the caller counts the matching rows in the DB.
 */
export function buildJobOrderNo(openDate: string, workType: WorkType, existingCount: number): string {
  const [year, month] = openDate.split('-');
  const seq = String(existingCount + 1).padStart(2, '0');
  return `JO${seq}${month}${year.slice(2)}-${CATEGORY_CODE[workType]}`;
}
