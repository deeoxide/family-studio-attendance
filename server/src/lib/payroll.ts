/**
 * Payroll arithmetic and Lao statutory calculation for Family Studio.
 *
 * Chain: gross = basic (post punctuality half) + OT + allowance
 *   -> employee social-security contribution on the capped contributory wage
 *   -> taxable income = gross - SSO - PIT-exempt overtime
 *   -> monthly salary tax by progressive bands
 *   -> net = gross - SSO - tax - late deduction (never negative)
 *   -> minimum-wage floor applied only when the half-salary rule trips.
 *
 * Rounding rule: whole kip, per component. SSO is rounded once; total PIT is
 * rounded once (not per band); net is derived by subtraction. SSO and PIT are
 * each remitted separately (NSSF, Tax Department) so each must be a valid
 * whole-kip figure on its own; net by subtraction then reconciles exactly.
 *
 * !! Every statutory constant below is from secondary sources (PwC Worldwide Tax
 * Summaries, VDB Loi, Acclime) captured 2026-09-10. See
 * .claude/agent-memory/financial-consultant/ for the citations. None has been
 * checked against the primary Lao gazette text yet.
 */

/**
 * Employee contribution rate to the National Social Security Fund (NSSF / LSSO).
 * Value: 5.5% (employer pays a further 6% which is not part of employee net pay).
 * Source: PwC Worldwide Tax Summaries - Lao PDR, Individual - Other taxes
 *   (reviewed 7 Aug 2026); Acclime "Social Security Obligations for Employers in
 *   Laos". Legal basis: Law on Social Security No. 34/NA (2013), LSSO relaunched
 *   3 June 2020. See .claude/agent-memory/financial-consultant/lao-sso-2026.md
 * TODO: confirm against primary Lao gazette text with the studio accountant.
 */
export const SSO_RATE = 0.055;

/**
 * Monthly contributory-wage ceiling: the employee contribution is charged only on
 * the first LAK 4,500,000 of remuneration (max employee contribution 247,500/mo).
 * Source: PwC Worldwide Tax Summaries - Lao PDR, Individual - Other taxes;
 *   Acclime, as above. Secondary sources only - no NSSF notice / decree number
 *   or effective date located. See lao-sso-2026.md
 * TODO: confirm against primary Lao gazette / NSSF notice with the accountant.
 */
export const SSO_CEILING = 4_500_000;

/**
 * Overtime pay is exempt from personal income tax when the employee's monthly
 * salary does not exceed this amount. Value: LAK 3,000,000 (was 2,000,000 under
 * the 2019 law). Tested against the employee's actual contracted salary, i.e.
 * the pre-half basic - the threshold is about the real salary, not a
 * punctuality-reduced figure.
 * Source: VDB Loi "Laos Alert - New Income Tax Law 2025 (effective 1 July 2026)".
 *   See lao-pit-bands-2026.md
 * TODO: confirm against primary Lao gazette text with the studio accountant.
 */
export const OT_PIT_EXEMPT_MAX = 3_000_000;

/**
 * Statutory monthly minimum wage, used to floor the half-salary punctuality
 * penalty. Value: LAK 2,500,000 - also the peg for the PIT exemption threshold.
 * Source: VDB Loi "Laos Alert - New Income Tax Law 2025": the PIT exemption
 *   "is now linked to the statutory minimum wage (currently LAK2.5 million per
 *   month)". See lao-pit-bands-2026.md
 * TODO: confirm the current minimum wage against the primary Lao decree with the
 *   studio accountant - historically it has trailed 2.5M.
 */
export const MIN_WAGE = 2_500_000;

export interface PitBand {
  /** Upper bound of this band, in LAK/month of taxable income. Infinity for the top band. */
  readonly upTo: number;
  /** Marginal rate applied to the slice of taxable income within this band. */
  readonly rate: number;
}

/**
 * Monthly salary-tax bands, applied to taxable income (gross - SSO - exempt OT).
 * Law on Income Tax No. 88/NA, published in the Official Gazette 19 June 2026,
 * effective 1 July 2026, replacing Law No. 67/NA (2019) and its amendments.
 * First LAK 2,500,000 exempt; no upper cap (top band runs to infinity).
 * Source: VDB Loi "Laos Alert - New Income Tax Law 2025 (effective 1 July 2026)";
 *   PwC Worldwide Tax Summaries - Lao PDR, Individual - Taxes on personal income
 *   (reviewed 7 Aug 2026). See lao-pit-bands-2026.md
 * TODO: confirm against primary Lao gazette text with the studio accountant -
 *   some secondary trackers still showed the old 1,300,000 threshold in Sep 2026.
 */
export const PIT_BANDS: readonly PitBand[] = [
  { upTo: 2_500_000, rate: 0.0 },
  { upTo: 5_000_000, rate: 0.05 },
  { upTo: 15_000_000, rate: 0.1 },
  { upTo: 25_000_000, rate: 0.15 },
  { upTo: 65_000_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.25 },
];

export interface PayInputs {
  /** Contracted monthly basic salary (before any half-salary reduction). */
  basic: number;
  ot: number;
  allowance: number;
  /** Half the basic salary applies once the punctuality rule trips (15+ late days). */
  half?: boolean;
  /** LAK already withheld for late arrivals this period (see lateDeduction.ts). */
  lateDeduct?: number;
}

export interface PayResult {
  /** Basic actually paid: halved if `half`, then raised back toward `basic` if the minimum-wage floor bit. */
  basic: number;
  ot: number;
  allowance: number;
  gross: number;
  sso: number;
  tax: number;
  /** Late deduction actually applied (may be less than requested if the minimum-wage floor bit). */
  lateDeduct: number;
  net: number;
}

/**
 * Monthly salary tax on `taxable` income (already net of SSO and exempt OT).
 * Sums slice x rate across PIT_BANDS and rounds the total once.
 */
export function computeTax(taxable: number): number {
  let tax = 0;
  let lower = 0;
  for (const band of PIT_BANDS) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, band.upTo) - lower) * band.rate;
    lower = band.upTo;
  }
  return Math.round(tax);
}

export function computePay(inputs: PayInputs): PayResult {
  const preHalfBasic = inputs.basic;
  const halvedBasic = inputs.half ? Math.round(preHalfBasic / 2) : preHalfBasic;
  const requestedLate = inputs.lateDeduct ?? 0;

  // OT PIT-exemption is decided on the employee's real contracted salary, not the
  // punctuality-reduced figure.
  const exemptOt = preHalfBasic <= OT_PIT_EXEMPT_MAX ? inputs.ot : 0;

  let effectiveBasic = halvedBasic;
  let lateDeduct = requestedLate;

  // Minimum-wage floor - only when the half-salary punctuality rule trips.
  // Minimum-wage law floors the WAGE, not take-home pay: SSO (and PIT) are levied
  // on every employee, including one earning exactly the minimum wage, so they
  // are never treated as "what pushed pay below the minimum". Equivalently, the
  // protected take-home for the basic-wage portion is (MIN_WAGE - sso) - at a
  // MIN_WAGE wage PIT is zero, since 2,500,000 is also the PIT-exempt threshold.
  // OT and allowance ride on top and are excluded. The protected quantity is
  // therefore the basic wage actually paid: effectiveBasic - lateDeduct.
  if (inputs.half && effectiveBasic - lateDeduct < MIN_WAGE) {
    const shortfall = MIN_WAGE - (effectiveBasic - lateDeduct);
    // 1) hand back the late-arrival deduction first
    const lateReturn = Math.min(lateDeduct, shortfall);
    lateDeduct -= lateReturn;
    // 2) if still short, raise the halved basic back up - but never above the
    //    contracted (pre-half) salary. A contract already below minimum wage is a
    //    data problem for HR, not something payroll can top up.
    const stillShort = shortfall - lateReturn;
    if (stillShort > 0) {
      effectiveBasic = Math.min(preHalfBasic, effectiveBasic + stillShort);
    }
  }

  const gross = effectiveBasic + inputs.ot + inputs.allowance;

  // SSO contributory wage = the gross actually paid (post-half). The half-salary
  // rule is a genuine reduction in remuneration, so the contributory base follows
  // it down. Capped at the monthly ceiling.
  const sso = Math.round(Math.min(gross, SSO_CEILING) * SSO_RATE);

  const taxable = Math.max(0, gross - sso - exemptOt);
  const tax = computeTax(taxable);

  const net = Math.max(0, gross - sso - tax - lateDeduct);

  return {
    basic: effectiveBasic,
    ot: inputs.ot,
    allowance: inputs.allowance,
    gross,
    sso,
    tax,
    lateDeduct,
    net,
  };
}
