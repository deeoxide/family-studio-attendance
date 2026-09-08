import { describe, expect, it } from 'vitest';
import { lateModel, GRACE_MIN, LATE_RATE, WORKING_DAYS_PER_MONTH } from '../lib/lateDeduction';

const day = (n: number) => `2026-09-${String(n).padStart(2, '0')}`;

describe('lateModel', () => {
  it('charges nothing for the first three late days (warning only)', () => {
    const days = [day(2), day(4), day(8)].map((date) => ({ date, lateMinutes: 20 }));
    const m = lateModel(days, 3_600_000);
    expect(m.total).toBe(0);
    expect(m.warned).toBe(true);
    expect(m.deducting).toBe(false);
    expect(m.rows.every((r) => !r.charged)).toBe(true);
  });

  it('deducts 10,000 LAK per started hour from the fourth late day', () => {
    const days = [2, 4, 8, 10].map((n) => ({ date: day(n), lateMinutes: 12 })); // < 1h each
    const m = lateModel(days, 3_600_000);
    expect(m.deducting).toBe(true);
    expect(m.total).toBe(LATE_RATE); // only the 4th day is charged, 1 started hour
    expect(m.rows[3].amount).toBe(LATE_RATE);
  });

  it('rounds a started hour up (e.g. 61 minutes late = 2 hours charged)', () => {
    const days = [2, 4, 8, 10].map((n) => ({ date: day(n), lateMinutes: 61 }));
    const m = lateModel(days, 3_600_000);
    expect(m.rows[3].amount).toBe(2 * LATE_RATE);
  });

  it('treats arrival more than 2 hours after grace as a fully unpaid day (basic / 22)', () => {
    // 09:30 + 130 min = 11:40, i.e. the "arrive at 11:50" case from the brief
    const days = [2, 4, 8, 10].map((n) => ({ date: day(n), lateMinutes: 140 }));
    const m = lateModel(days, 4_400_000);
    const dailyRate = Math.round(4_400_000 / WORKING_DAYS_PER_MONTH);
    expect(m.rows[3].unpaid).toBe(true);
    expect(m.rows[3].amount).toBe(dailyRate);
  });

  it('flags half salary at 15 or more late days in the month', () => {
    const days = Array.from({ length: 15 }, (_, i) => ({ date: day(i + 1), lateMinutes: 5 }));
    const m = lateModel(days, 3_600_000);
    expect(m.half).toBe(true);
    expect(m.count).toBe(15);
  });

  it('does not flag half salary at 14 late days', () => {
    const days = Array.from({ length: 14 }, (_, i) => ({ date: day(i + 1), lateMinutes: 5 }));
    const m = lateModel(days, 3_600_000);
    expect(m.half).toBe(false);
  });

  it('sorts by date regardless of input order, so charging always starts on day 4 chronologically', () => {
    const days = [day(10), day(2), day(8), day(4)].map((date) => ({ date, lateMinutes: 15 }));
    const m = lateModel(days, 3_600_000);
    expect(m.rows.map((r) => r.date)).toEqual([day(2), day(4), day(8), day(10)]);
  });

  it('grace cutoff constant matches 09:30', () => {
    expect(GRACE_MIN).toBe(9 * 60 + 30);
  });
});
