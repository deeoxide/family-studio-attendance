---
name: Payroll engine audit findings 2026-09
description: What server/src/lib/payroll.ts got wrong and the fix direction
---

# payroll.ts audit (2026-09-10, audit-only pass)

Bugs found in `server/src/lib/payroll.ts`:
1. SSO applied to uncapped gross — must cap base at LAK 4,500,000.
2. `computeTax` runs on gross, not gross - SSO.
3. Only two tax bands + a wrong 15,000,000 "cap"; law has 5/10/15/20/25% and no cap.
4. Exempt threshold hard-wired at 1,300,000; new law No. 88/NA (eff. 1 Jul 2026)
   raised it to 2,500,000.
5. OT PIT-exemption for salary <= 3,000,000 not implemented.

Fix direction: table-driven `PIT_BANDS`, `SSO_CEILING = 4_500_000`, taxable base
= gross - sso (- exempt OT), tax total rounded once. Keep computeTax/computePay pure.

Net-pay impact (all employees net MORE): e.g. basic 4.5M + OT 320k + allow 500k
went from net 4,810,400 to 4,940,250 (+129,850/mo).

Not in scope / handed to hr-manager: lateDeduction, leave, holidays, workingDays,
and the attendance-rule parts of payslipCompute.ts.

## IMPLEMENTED 2026-09-10 (payroll.ts + payroll.test.ts)
All 5 bugs fixed. Table-driven `PIT_BANDS`, `SSO_CEILING`, `OT_PIT_EXEMPT_MAX`,
`MIN_WAGE` constants each with source + `TODO: confirm against primary gazette`.
`computeTax(taxable)` renamed param; `computePay` does taxable = gross - sso -
exemptOt, sso capped, net floored at 0, minimum-wage floor when `half`.
payslipCompute.ts unchanged (already passes pre-half basic + half flag).
server tests: 107 passed, `npx tsc --noEmit` clean.

Final net-pay deltas (no half, so floor inactive):
- basic 2,700,000: net 2,481,500 -> 2,548,925 (+67,425)
- basic 6,000,000 + allowance 500,000: net 5,807,500 -> 6,002,250 (+194,750)
- basic 18,000,000: net 15,825,000 -> 16,214,625 (+389,625)
Every employee nets more; total SSO remittance drops for anyone above 4.5M gross.
