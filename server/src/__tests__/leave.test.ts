import { describe, expect, it } from 'vitest';
import { workingDaysBetween } from '../lib/leave';

const HOLIDAYS_2026 = ['2026-01-01', '2026-03-08', '2026-04-14', '2026-04-15', '2026-04-16', '2026-05-01', '2026-12-02'];

describe('workingDaysBetween', () => {
  it('counts a plain weekday range inclusive', () => {
    // Mon 2026-09-07 .. Wed 2026-09-09 = 3 working days
    expect(workingDaysBetween('2026-09-07', '2026-09-09', HOLIDAYS_2026)).toEqual({
      days: 3, weekendDays: 0, holidayDays: 0,
    });
  });

  it('excludes weekends', () => {
    // Fri 2026-09-04 .. Mon 2026-09-07 spans Sat+Sun
    expect(workingDaysBetween('2026-09-04', '2026-09-07', HOLIDAYS_2026)).toEqual({
      days: 2, weekendDays: 2, holidayDays: 0,
    });
  });

  it('excludes public holidays even on weekdays', () => {
    // Pi Mai Lao 14-16 Apr 2026 (Tue-Thu)
    expect(workingDaysBetween('2026-04-13', '2026-04-17', HOLIDAYS_2026)).toEqual({
      days: 2, weekendDays: 0, holidayDays: 3,
    });
  });

  it('returns 0 working days for a range that is entirely a holiday/weekend', () => {
    const r = workingDaysBetween('2026-04-14', '2026-04-16', HOLIDAYS_2026);
    expect(r?.days).toBe(0);
  });

  it('returns null for an inverted range', () => {
    expect(workingDaysBetween('2026-09-10', '2026-09-01', HOLIDAYS_2026)).toBeNull();
  });

  it('handles a single day', () => {
    expect(workingDaysBetween('2026-09-08', '2026-09-08', HOLIDAYS_2026)?.days).toBe(1);
  });
});
