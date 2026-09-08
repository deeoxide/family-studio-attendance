import { describe, expect, it } from 'vitest';
import { computePay, computeTax } from '../lib/payroll';

describe('computeTax', () => {
  it('is zero at or below the first band', () => {
    expect(computeTax(1_300_000)).toBe(0);
    expect(computeTax(900_000)).toBe(0);
  });

  it('applies 5% between 1.3m and 5m', () => {
    expect(computeTax(2_300_000)).toBe(50_000); // (2.3m-1.3m)*5%
  });

  it('applies 10% above 5m on top of the 5% band', () => {
    // band1: (5m-1.3m)*5% = 185,000 ; band2: (6m-5m)*10% = 100,000
    expect(computeTax(6_000_000)).toBe(285_000);
  });

  it('caps the top band at 15m', () => {
    const at15 = computeTax(15_000_000);
    const above15 = computeTax(20_000_000);
    expect(above15).toBe(at15);
  });
});

describe('computePay', () => {
  it('nets gross minus SSO, tax and late deduction', () => {
    const result = computePay({ basic: 4_500_000, ot: 320_000, allowance: 500_000 });
    expect(result.gross).toBe(5_320_000);
    expect(result.sso).toBe(Math.round(5_320_000 * 0.055));
    expect(result.net).toBe(result.gross - result.sso - result.tax - result.lateDeduct);
  });

  it('halves only the basic component, not OT or allowance', () => {
    const full = computePay({ basic: 4_500_000, ot: 320_000, allowance: 500_000 });
    const half = computePay({ basic: 4_500_000, ot: 320_000, allowance: 500_000, half: true });
    expect(half.basic).toBe(Math.round(4_500_000 / 2));
    expect(half.ot).toBe(full.ot);
    expect(half.allowance).toBe(full.allowance);
  });

  it('subtracts an explicit late deduction from net', () => {
    const base = computePay({ basic: 3_000_000, ot: 0, allowance: 0 });
    const withDeduction = computePay({ basic: 3_000_000, ot: 0, allowance: 0, lateDeduct: 40_000 });
    expect(withDeduction.net).toBe(base.net - 40_000);
  });
});
