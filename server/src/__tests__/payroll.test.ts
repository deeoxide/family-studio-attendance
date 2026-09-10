import { describe, expect, it } from 'vitest';
import {
  computePay,
  computeTax,
  PIT_BANDS,
  SSO_RATE,
  SSO_CEILING,
  MIN_WAGE,
} from '../lib/payroll';

/**
 * Statutory basis (all secondary sources, captured 2026-09-10 - see
 * .claude/agent-memory/financial-consultant/):
 *  - Income tax: Law No. 88/NA, effective 1 July 2026. Monthly bands
 *    0% <=2.5M, 5% <=5M, 10% <=15M, 15% <=25M, 20% <=65M, 25% above. No cap.
 *    Tax base = gross - employee SSO - PIT-exempt overtime.
 *  - Social security: employee 5.5%, contributory wage capped at 4,500,000/mo.
 *  - Overtime is PIT-exempt when contracted salary <= 3,000,000/mo.
 */

describe('computeTax - progressive bands on taxable income', () => {
  it('is zero up to the 2.5M exempt threshold', () => {
    expect(computeTax(0)).toBe(0);
    expect(computeTax(1_300_000)).toBe(0);
    expect(computeTax(2_500_000)).toBe(0); // band edge
    expect(computeTax(2_500_001)).toBe(0); // 1 kip into the 5% band -> rounds to 0
  });

  it('taxes the slice above 2.5M at 5% up to 5M', () => {
    expect(computeTax(3_000_000)).toBe(25_000); // 500,000 * 5%
    expect(computeTax(5_000_000)).toBe(125_000); // 2,500,000 * 5% (band edge)
    expect(computeTax(5_000_001)).toBe(125_000); // rounds
  });

  it('adds the 10% band between 5M and 15M', () => {
    expect(computeTax(6_000_000)).toBe(125_000 + 100_000);
    expect(computeTax(15_000_000)).toBe(125_000 + 1_000_000); // 1,125,000 (band edge)
  });

  it('adds the 15% band between 15M and 25M', () => {
    expect(computeTax(25_000_000)).toBe(1_125_000 + 1_500_000); // 2,625,000 (band edge)
  });

  it('adds the 20% band between 25M and 65M', () => {
    expect(computeTax(65_000_000)).toBe(2_625_000 + 8_000_000); // 10,625,000 (band edge)
  });

  it('adds the 25% top band with no upper cap', () => {
    expect(computeTax(80_000_000)).toBe(10_625_000 + 15_000_000 * 0.25); // 14,375,000
    expect(computeTax(30_000_000)).toBeGreaterThan(computeTax(25_000_000));
    expect(computeTax(200_000_000)).toBeGreaterThan(computeTax(65_000_000));
  });

  it('PIT_BANDS is an ascending table ending in an open top band', () => {
    for (let i = 1; i < PIT_BANDS.length; i++) {
      expect(PIT_BANDS[i].upTo).toBeGreaterThan(PIT_BANDS[i - 1].upTo);
    }
    expect(PIT_BANDS[0].rate).toBe(0);
    expect(PIT_BANDS[PIT_BANDS.length - 1].upTo).toBe(Infinity);
  });
});

describe('computePay - social security', () => {
  it('applies 5.5% below the contributory-wage ceiling', () => {
    const r = computePay({ basic: 3_000_000, ot: 0, allowance: 0 });
    expect(r.sso).toBe(Math.round(3_000_000 * SSO_RATE)); // 165,000
  });

  it('caps SSO at the ceiling for gross at or above 4.5M', () => {
    const capped = Math.round(SSO_CEILING * SSO_RATE); // 247,500
    expect(computePay({ basic: 4_500_000, ot: 0, allowance: 0 }).sso).toBe(capped); // edge
    expect(computePay({ basic: 9_000_000, ot: 500_000, allowance: 1_000_000 }).sso).toBe(capped);
  });
});

describe('computePay - taxable base', () => {
  it('taxes gross minus SSO, not raw gross (regression guard)', () => {
    const r = computePay({ basic: 6_000_000, ot: 0, allowance: 500_000 });
    expect(r.sso).toBe(247_500);
    expect(r.tax).toBe(computeTax(r.gross - r.sso));
    expect(r.tax).not.toBe(computeTax(r.gross));
  });

  it('excludes overtime from the taxable base when contracted salary <= 3M', () => {
    const r = computePay({ basic: 2_800_000, ot: 1_000_000, allowance: 0 });
    expect(r.tax).toBe(computeTax(r.gross - r.sso - 1_000_000));
  });

  it('includes overtime in the taxable base when contracted salary > 3M', () => {
    const r = computePay({ basic: 3_200_000, ot: 1_000_000, allowance: 0 });
    expect(r.tax).toBe(computeTax(r.gross - r.sso));
  });
});

describe('computePay - net', () => {
  it('nets gross minus SSO, tax and late deduction', () => {
    const r = computePay({ basic: 4_500_000, ot: 320_000, allowance: 500_000 });
    expect(r.gross).toBe(5_320_000);
    expect(r.net).toBe(r.gross - r.sso - r.tax - r.lateDeduct);
  });

  it('never returns a negative net', () => {
    const r = computePay({ basic: 1_000_000, ot: 0, allowance: 0, lateDeduct: 5_000_000 });
    expect(r.net).toBe(0);
  });

  it('halves only the basic component, not OT or allowance', () => {
    const full = computePay({ basic: 4_500_000, ot: 320_000, allowance: 500_000 });
    const half = computePay({ basic: 4_500_000, ot: 320_000, allowance: 500_000, half: true });
    expect(half.ot).toBe(full.ot);
    expect(half.allowance).toBe(full.allowance);
    expect(half.basic).toBeLessThan(full.basic);
  });

  it('subtracts an explicit late deduction from net', () => {
    const base = computePay({ basic: 4_000_000, ot: 0, allowance: 0 });
    const deducted = computePay({ basic: 4_000_000, ot: 0, allowance: 0, lateDeduct: 40_000 });
    expect(deducted.net).toBe(base.net - 40_000);
  });
});

describe('computePay - half-salary rule x SSO ceiling', () => {
  it('caps SSO on the post-half gross', () => {
    // contracted 10M -> halved 5M gross, still at/above the 4.5M ceiling
    const r = computePay({ basic: 10_000_000, ot: 0, allowance: 0, half: true });
    expect(r.basic).toBe(5_000_000);
    expect(r.sso).toBe(247_500);
  });
});

describe('computePay - minimum-wage floor on the half-salary rule', () => {
  it('hands back the late deduction before touching wage', () => {
    const r = computePay({ basic: 3_000_000, ot: 0, allowance: 0, half: true, lateDeduct: 200_000 });
    expect(r.lateDeduct).toBe(0);
    expect(r.basic - r.lateDeduct).toBeGreaterThanOrEqual(MIN_WAGE);
  });

  it('raises the halved basic back up to hold the wage at the minimum', () => {
    const r = computePay({ basic: 3_000_000, ot: 0, allowance: 0, half: true });
    expect(r.basic).toBeGreaterThan(1_500_000);
    expect(r.basic).toBe(MIN_WAGE);
  });

  it('never restores basic above the contracted (pre-half) salary', () => {
    // contract itself is below minimum wage - payroll cannot top it up
    const r = computePay({ basic: 2_000_000, ot: 0, allowance: 0, half: true, lateDeduct: 100_000 });
    expect(r.lateDeduct).toBe(0);
    expect(r.basic).toBe(2_000_000);
  });

  it('protects the wage only - OT and allowance are left out of the floor test', () => {
    const r = computePay({ basic: 3_000_000, ot: 1_000_000, allowance: 800_000, half: true });
    expect(r.ot).toBe(1_000_000);
    expect(r.allowance).toBe(800_000);
    expect(r.basic - r.lateDeduct).toBeGreaterThanOrEqual(MIN_WAGE);
  });

  it('does not apply when the half-salary rule has not tripped', () => {
    const r = computePay({ basic: 1_800_000, ot: 0, allowance: 0 });
    expect(r.basic).toBe(1_800_000);
    expect(r.net).toBeLessThan(MIN_WAGE);
  });
});

describe('computePay - representative Family Studio salaries', () => {
  it('low earner near the tax-exempt line', () => {
    const r = computePay({ basic: 2_700_000, ot: 0, allowance: 0 });
    expect(r).toMatchObject({ gross: 2_700_000, sso: 148_500, tax: 2_575, net: 2_548_925 });
  });

  it('mid earner', () => {
    const r = computePay({ basic: 6_000_000, ot: 0, allowance: 500_000 });
    expect(r).toMatchObject({ gross: 6_500_000, sso: 247_500, tax: 250_250, net: 6_002_250 });
  });

  it('high earner above the SSO ceiling', () => {
    const r = computePay({ basic: 18_000_000, ot: 0, allowance: 0 });
    expect(r).toMatchObject({ gross: 18_000_000, sso: 247_500, tax: 1_537_875, net: 16_214_625 });
  });
});
