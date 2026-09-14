---
name: Payroll rounding rule (recommended, pending user sign-off)
description: Per-component rounding to whole kip; net derived by subtraction
---

# Rounding rule

CONFIRMED by user 2026-09-10 and implemented in payroll.ts:

- All money in **whole kip** (LAK has no subunit in practice).
- Round **each statutory component once**: employee SSO to nearest kip; total PIT
  to nearest kip (round the total, not per band).
- **Net = gross - SSO - tax - lateDeduct** by plain subtraction (no separate
  rounding), so gross always reconciles exactly to the parts.
- Rationale: SSO and PIT are each remitted separately (to NSSF and the Tax Dept),
  so each must be a valid whole-kip figure in its own right; deriving net by
  subtraction then leaves no rounding residual.
- No source mandates rounding to 1,000 kip; if the studio's accountant wants that
  for the remittance forms, apply it to SSO and PIT only, still net by subtraction.

## Related decisions (user, 2026-09-10)
- Adopt the new 2026 Income Tax Law (No. 88/NA) bands now; every statutory
  constant carries a `TODO: confirm against primary Lao gazette` comment.
- Keep the half-salary punctuality rule, but floor it at the minimum wage
  (MIN_WAGE = 2,500,000). Implementation: when `half` is true, protect the basic
  wage actually paid = `effectiveBasic - lateDeduct >= MIN_WAGE`. Give back the
  late deduction first, then raise the halved basic (never above the contracted
  pre-half salary). Minimum wage floors the WAGE, not take-home; SSO/PIT are
  levied on everyone so they never count as "what pushed pay below the minimum".
- SSO contributory base = post-half gross (the half reduction is a real cut in
  remuneration). OT PIT-exemption tested on the pre-half contracted salary.
- `net = max(0, gross - sso - tax - lateDeduct)` — never negative.
