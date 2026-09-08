/** Shift-time helpers: late-minute calculation and worked-time-minus-lunch. */
import { minutesOfDayVientiane } from './period';

export interface ShiftConfig {
  graceEndMin: number; // e.g. 570 = 09:30
  lunchMinutes: number; // flat lunch deduction from a full day worked, e.g. 90
}

/** Minutes past the grace cutoff; 0 (not late) if arriving at or before it. */
export function lateMinutesFor(checkInAt: Date, config: ShiftConfig): number {
  const mins = minutesOfDayVientiane(checkInAt);
  return Math.max(0, mins - config.graceEndMin);
}

/** Net minutes worked between check-in and check-out, with the lunch break deducted
 * once worked time exceeds it (mirrors the prototype: 90 min off any day over 90 min). */
export function netWorkedMinutes(checkInAt: Date, checkOutAt: Date, config: ShiftConfig): number {
  const worked = Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60_000);
  const deducted = worked > config.lunchMinutes ? config.lunchMinutes : 0;
  return Math.max(0, worked - deducted);
}
