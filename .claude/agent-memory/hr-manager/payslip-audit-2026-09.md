---
name: payslipCompute / lateDeduction audit — open gaps (Sept 2026)
description: What the audit found; nothing changed yet (audit-only pass). Merge with financial-consultant before editing.
---

Code layout note: the task brief's file list is stale. Server has NO
`holidays.ts` or `workingDays.ts`; `server/src/lib/leave.ts` IS the working-day
counter (`workingDaysBetween`). Holiday calendar lives only in the `Holiday` DB
table + `mobile/src/lib/holidays.ts` (display only). Attendance routes are under
`server/src/routes/attendance/{punch,corrections,team}.ts`.

Open gaps found (all unverified against gazette; no code changed):

1. **Unpaid absence has zero payroll effect.** `payslipCompute.ts` only queries
   `attendanceRecord` rows with `lateMinutes > 0`. Leave (paid or over-balance),
   no-shows, and unauthorised absence never touch `basic`. There is no LWOP leave
   type (only ANNUAL/SICK/PERSONAL, all paid). `/leave/record` (HR) bypasses the
   balance check, so over-entitlement leave is silently full-paid.

2. RESOLVED (2026-09, coordinator go-ahead). Added `workingDaysInMonth(periodMonth,
   holidays)` to `server/src/lib/leave.ts`; `lateModel(days, basic, workingDays?)`
   now takes the real count, `WORKING_DAYS_PER_MONTH = 22` kept only as a fallback
   default. `payslipCompute.ts` queries the Holiday table per period and passes it
   in. NOT yet threaded into `kpi.ts` or `routes/attendance/punch.ts` /summary —
   those still use the 22 fallback, so the KPI board and the employee summary can
   disagree with the payslip by a few % in months that aren't 22 weekdays. Follow-up.
   Tests: lateDeduction.test.ts + leave.test.ts (89 passing).

3. **Late ladder + half-salary stack.** At 15 late days the employee loses half
   basic AND the per-hour charges for days 4-14. Likely double punishment.

4. **Half-salary floor.** No check that basic/2 stays >= statutory minimum wage
   (2.5M LAK/month). Also `computePay` halves basic before SSO/tax — lowers the
   SSO/tax base (financial-consultant owns that arithmetic).

5. **Holiday/weekend not excluded from "late".** `punch.ts` computes lateMinutes
   on any check-in; if the office ever opens on a Saturday or a public holiday,
   that day counts toward the late ladder. Low risk today (Mon-Fri only).

6. **New hire always gets 15/30/5 leave regardless of start date** (people.ts
   register) — no pro-rata for the first partial year, and Lao law only grants
   annual leave after 1 year service.

7. **No payslip row created on hire** — a mid-month starter has no OPEN payslip
   until the next approve run generates next month's.

Baseline: `npm test` in server/ = 81 passing before any change.
