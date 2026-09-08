# Employee Attendance Mobile App

_Started 2026-09-08 09:03 UTC_

---

## User

Design a mobile app for employee attendance online (check-in, check-out) with 10 meter distance and give the function leave online management which is depends on Lao's holiday based on Ministry of Labour and Welfare rule. The function and feature must be minimal and easy to use, no need the a complicated UX UI. The app interface must iclusive of white 90%, yellow 7% and black 3%. Please using the rule of UX UI and use it for capacity elements. Giving the function of payroll

## Assistant



## Assistant

_[tool: ask_user]_

_[tool: list_files]_

_[tool: view_image]_

_[tool: read_file]_

_[tool: grep]_

_[tool: copy_starter_component]_

_[tool: grep]_

_[tool: dc_write]_

_[tool: show_html]_

_[tool: ready_for_verification]_

Built as a live prototype: four tabs (Attendance, Leave, Payroll, Profile) in an iPhone frame.

- **Check-in** is gated on a 10 m geofence — a plan-view radius diagram, distance readout, and a button that disables outside the radius. Use the slider above the phone to walk in and out of range, then check in/out with a live timer.
- **Leave** has balance bars (annual 15, sick 30 per the Labour Law), the 2026 official holiday list, and an apply sheet that counts working days excluding weekends and holidays, with balance validation.
- **Payroll** shows net pay, then the breakdown: gross, social security 5.5%, progressive income tax.

Copy is English — I didn't want to guess at Lao wording. Say the word and I'll localise it. Tweaks expose office name and geofence radius.

## User

Answered — language: Bilingual toggle; roles: Employee (self-service), Manager (approve leave, see team), HR/Admin (payroll, holiday calendar); screens: Check-in / check-out with geofence, Attendance history, Apply for leave, Leave balance & Lao holiday calendar, Payslip list + detail, Profile / settings; geofence: Simple distance meter, no map; payroll_depth: Breakdown + tax/social security; leave_types: Annual leave, Sick leave; company: Family Studio, Clock in 09:00, above 09:30 is late, clock out 18:00, lunch time is 12:00-13:30. working mon to fri. Add on personal leave 5 days

## Assistant

_[tool: copy_files]_

_[tool: dc_write]_

_[tool: ready_for_verification]_

Rebuilt to your answers. v1 is preserved as `Attendance App v1.dc.html`.

**What changed**
- **Bilingual toggle** — EN / ລາວ in the header and in Profile; switches every string and swaps to Noto Sans Lao. My translation, so please have a Lao speaker read it.
- **Geofence** is now a plain distance meter: big number, a 0–40 m bar with the 10 m zone marked in gold and your position as an ink tick. No map.
- **Three roles**, switchable above the phone. Employee: Attendance, Leave, Payroll, Profile. Manager: Team roll call, Approvals (approve/reject actually works), Leave, Profile. HR: Payroll run, Leave, People, Profile.
- **Family Studio rules** wired in — 09:00 in, late after 09:30, 18:00 out, lunch 12:00–13:30 deducted from the day total, Mon–Fri.
- **Leave** is annual 15, sick 30, personal 5, with validation against remaining balance.

## User

Add on the function of salary deduction: if employee arrive late above 09:30 with 3 times in a month will receive ໃບຕັກເຕືອນ, if more than 3 times will deduct salary= 09:30AM-10:30AM equals 10,000LAK that means 1 hour will deduct 10,000LAK. However if employee arrive on 11:50 that means no need to calculate the wage in that day. Also, if employee arrive late 15 times a month above, they will get paid in a half of salary.

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

Now the logic.

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_js_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Added the late-deduction rules. A **Late days** slider sits next to the distance slider so you can walk through every threshold.

**On the Attendance tab** — a punctuality card that changes state with the count: clear → warning letter issued at 3 (ໃບຕັກເຕືອນ) → deduction applies from 4 → half salary at 15. Below it, each late day with arrival time, minutes late, and what it costs.

**On the payslip** — a Late deduction line plus a per-day breakdown, and the basic salary line switches to "half" once you hit 15.

Two things I had to decide, tell me if either is wrong:
- Your 11:50 case: I treated "more than two hours late" as the unpaid-day trigger, valued at basic ÷ 22 days.
- Half salary halves the basic only — overtime and allowance still pay in full.

