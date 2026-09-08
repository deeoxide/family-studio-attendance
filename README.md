# Family Studio — Attendance, Leave & Payroll

A real employee attendance app for Family Studio (Vientiane): geofenced
check-in/out, leave against the 2026 Lao public holiday calendar, and
payroll with the studio's punctuality rule. Implemented from the Claude
Design prototype in `project/Attendance App.dc.html` (design source and
chat transcript kept in `project/` and `chats/` for reference).

- **`server/`** — Node.js/Express + TypeScript API, Prisma + SQLite.
- **`mobile/`** — React Native (Expo) app, iOS/Android, real device GPS.

## Quick start

### 1. Server

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init   # creates dev.db and applies the schema
npm run dev                          # http://localhost:4000
```

Seeding runs automatically on `prisma migrate dev`. To reseed later:
`npx prisma migrate reset --force`. Demo accounts (password `familystudio`
for all):

| Email | Role |
|---|---|
| somchai@familystudio.la | Manager |
| phetsamone@familystudio.la | Employee |
| noy@familystudio.la, khamla@familystudio.la, thongdy@familystudio.la | Employee |
| manivone@familystudio.la | HR / Admin |

Run the unit tests (payroll, punctuality/late-deduction, working-day
calculator, geofence distance): `npm test`.

### 2. Mobile app

```bash
cd mobile
cp .env.example .env   # set EXPO_PUBLIC_API_URL to your machine's LAN IP for a physical device
npm install
npm start               # opens Expo dev tools — press i / a, or scan the QR code with Expo Go
```

`localhost` in the default `.env` only resolves from the iOS Simulator,
Android emulator, or `npm run web` — a physical phone needs your
computer's LAN address (e.g. `http://192.168.1.20:4000`) since it talks to
`server/` over your Wi-Fi.

## What's implemented

**Attendance** — a 10 m geofence read from the device's real GPS
(`expo-location`), validated again server-side from raw lat/lng (never
trusts a client-reported distance). Clock in 09:00, grace to 09:30, lunch
12:00–13:30 deducted from the day total, out 18:00, Monday–Friday.

**Leave** — annual (15), sick (30) and personal (5) balances per the
Labour Law + studio policy; a working-day counter that excludes weekends
and the 2026 Ministry of Labour and Social Welfare holiday notice; apply
→ pending → manager/HR approve or reject, live in the Approvals tab.

**Payroll** — gross = basic + overtime + allowance; social security
withheld at 5.5%; progressive income tax (5% over 1.3m LAK, 10% over 5m,
capped at 15m); a payroll run screen for HR that freezes the month's
figures and opens the next period.

**Punctuality / late deduction** (`server/src/lib/lateDeduction.ts`) —
the rule as specified: the first 3 late days in a month draw a warning
letter only (ໃບຕັກເຕືອນ); from the 4th, each started hour after 09:30
costs 10,000 LAK; arriving more than 2 hours late leaves the day unpaid
(basic ÷ 22); 15+ late days in the month halves the basic salary (overtime
and allowance are unaffected). Driven off real attendance records, not a
demo slider — every rule has a unit test in `server/src/__tests__/`.

**Roles** — Employee (Attendance / Leave / Payroll / Profile), Manager
(Team roll call / Approvals / Leave / Profile), HR (Payroll run / Leave /
People / Profile), each with its own bottom-tab set and JWT-gated API
routes.

**Bilingual** — EN / ລາວ toggle in the header and Profile, Noto Sans Lao
for Lao text. The Lao copy in `mobile/src/i18n/strings.ts` is carried over
from the prototype's own translation — it hasn't been reviewed by a Lao
speaker, so have someone check it before this ships.

## Known simplifications (carried over from the prototype's own "next steps")

- Overtime is a per-payslip LAK figure set by HR when a period opens, not
  computed from timesheets.
- No offline check-in queueing for weak signal.
- No monthly attendance export for HR.
- Notification toggles in Profile are local device preferences only (no
  push notifications wired up yet).

## Project layout

```
server/            Express API
  prisma/          schema.prisma, seed.ts
  src/lib/          payroll, late-deduction, geofence, leave, shift — pure,
                     unit-tested business logic
  src/routes/        auth, office, attendance, leave, payroll, people
  src/__tests__/      vitest suites for the lib/ modules

mobile/            Expo app
  src/screens/      one file per tab screen
  src/api/          typed fetch client + endpoint functions
  src/state/        auth + language React contexts
  src/theme/        design tokens ported from the Claude Design system
  src/i18n/         EN/LO string catalogue

project/, chats/   the original Claude Design handoff bundle (reference)
```
