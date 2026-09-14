---
name: Lao PIT tax base for employment income
description: Taxable income = gross remuneration minus employee SSO minus exempt OT
---

# Lao salary tax base

PIT is withheld on **gross remuneration less the employee's social security
contribution**. Social security contributions are "deductible when calculating
PIT" (PwC WWTS, Other taxes, reviewed 7 Aug 2026).

Order:
1. gross = basic + OT + allowances + bonuses
2. employee SSO = 5.5% x min(gross, 4,500,000)
3. taxable = gross - SSO - (OT if employee monthly salary <= 3,000,000)
4. tax = progressive bands on taxable
5. net = gross - SSO - tax - other withholdings

Current code (audit 2026-09) taxed raw gross with no SSO deduction — overstated
tax for every employee above the exempt line.

## Source
- PwC Worldwide Tax Summaries, Lao PDR – Individual – Other taxes:
  https://taxsummaries.pwc.com/lao-pdr/individual/other-taxes

Verified 2026-09-10.
