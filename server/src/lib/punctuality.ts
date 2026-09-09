/**
 * Traffic-light punctuality for one calendar month, aligned with the
 * late-deduction rule in lateDeduction.ts:
 *
 *   green   0 late days      — on time
 *   yellow  1–3 late days    — warning-letter zone, no money deducted yet
 *   red     4+ late days     — deductions apply (15+ also halves basic salary)
 */
export type PunctualityLevel = 'green' | 'yellow' | 'red';

export function punctualityLevel(lateCount: number): PunctualityLevel {
  if (lateCount <= 0) return 'green';
  if (lateCount <= 3) return 'yellow';
  return 'red';
}
