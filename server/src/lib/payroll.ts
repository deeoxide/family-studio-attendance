/**
 * Payroll math ported from the Claude Design prototype's `computePay`.
 * Social security is withheld at a flat 5.5% of gross. Income tax uses
 * Lao progressive monthly bands (5% over 1.3m, 10% over 5m, capped at 15m
 * in this simplified two-band model — matches the prototype exactly).
 */

export const SSO_RATE = 0.055;

export interface PayInputs {
  basic: number;
  ot: number;
  allowance: number;
  /** Half the basic salary applies once the punctuality rule trips (15+ late days). */
  half?: boolean;
  /** LAK already withheld for late arrivals this period (see lateDeduction.ts). */
  lateDeduct?: number;
}

export interface PayResult {
  basic: number;
  ot: number;
  allowance: number;
  gross: number;
  sso: number;
  tax: number;
  lateDeduct: number;
  net: number;
}

export function computeTax(gross: number): number {
  let tax = 0;
  if (gross > 1_300_000) {
    tax += Math.round((Math.min(gross, 5_000_000) - 1_300_000) * 0.05);
  }
  if (gross > 5_000_000) {
    tax += Math.round((Math.min(gross, 15_000_000) - 5_000_000) * 0.1);
  }
  return tax;
}

export function computePay(inputs: PayInputs): PayResult {
  const basic = inputs.half ? Math.round(inputs.basic / 2) : inputs.basic;
  const gross = basic + inputs.ot + inputs.allowance;
  const sso = Math.round(gross * SSO_RATE);
  const tax = computeTax(gross);
  const lateDeduct = inputs.lateDeduct ?? 0;
  const net = gross - sso - tax - lateDeduct;
  return { basic, ot: inputs.ot, allowance: inputs.allowance, gross, sso, tax, lateDeduct, net };
}
