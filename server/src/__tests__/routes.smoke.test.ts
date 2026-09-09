import { beforeAll, describe, expect, it } from 'vitest';
import { provisionTestDb } from './helpers/testDb';
import { ACCOUNTS, allTokens, api, authed, DEMO_PASSWORD } from './helpers/api';
import { prisma } from '../lib/prisma';

/**
 * Route-level smoke suite: for every endpoint, check the auth gate (no token →
 * 401), the role gate (wrong role → 403), the row-level scope gate (acting
 * outside your team → 403), and one representative happy path. It deliberately
 * asserts status codes and a key or two of the response shape, not exact
 * business numbers — those are covered by the lib/ unit tests. The point is to
 * catch a regression while the routes layer is refactored.
 */

let t: Awaited<ReturnType<typeof allTokens>>;
const id: Record<string, string> = {};

beforeAll(async () => {
  provisionTestDb();
  t = await allTokens();
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  for (const u of users) id[u.email] = u.id;
});

describe('auth', () => {
  it('POST /api/auth/login — valid credentials return a token + user', async () => {
    const res = await api.post('/api/auth/login').send({ email: ACCOUNTS.employee, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe(ACCOUNTS.employee);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('POST /api/auth/login — wrong password is 401', async () => {
    const res = await api.post('/api/auth/login').send({ email: ACCOUNTS.employee, password: 'nope' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/login — malformed body is 400', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.status).toBe(400);
  });

  it('GET /api/auth/me — needs a token', async () => {
    expect((await api.get('/api/auth/me')).status).toBe(401);
    const res = await authed('get', '/api/auth/me', t.employee);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ACCOUNTS.employee);
  });

  it('PATCH /api/auth/me — a user can edit their own contact details', async () => {
    const res = await authed('patch', '/api/auth/me', t.employee).send({ phone: '020 0000 0000' });
    expect(res.status).toBe(200);
    expect(res.body.user.phone).toBe('020 0000 0000');
  });

  it('POST /api/auth/change-password — wrong current password is 400', async () => {
    const res = await authed('post', '/api/auth/change-password', t.employee).send({
      currentPassword: 'wrong',
      newPassword: 'abcdef',
    });
    expect(res.status).toBe(400);
  });
});

describe('office', () => {
  it('GET /api/office — needs a token, then returns the geofence', async () => {
    expect((await api.get('/api/office')).status).toBe(401);
    const res = await authed('get', '/api/office', t.employee);
    expect(res.status).toBe(200);
    expect(typeof res.body.office.lat).toBe('number');
  });

  it('GET /api/attendance/office — returns the same office', async () => {
    const res = await authed('get', '/api/attendance/office', t.employee);
    expect(res.status).toBe(200);
    expect(res.body.office).toBeTruthy();
  });
});

describe('attendance — punch', () => {
  it('GET /api/attendance/today — 401 without a token, shape with one', async () => {
    expect((await api.get('/api/attendance/today')).status).toBe(401);
    const res = await authed('get', '/api/attendance/today', t.employee);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('date');
    expect(res.body).toHaveProperty('record');
  });

  it('POST /api/attendance/check-in — missing coords is 400', async () => {
    const res = await authed('post', '/api/attendance/check-in', t.employee).send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/attendance/check-in — outside the radius is 422', async () => {
    const res = await authed('post', '/api/attendance/check-in', t.employee).send({ lat: 0, lng: 0 });
    expect(res.status).toBe(422);
  });

  it('POST /api/attendance/check-in then /check-out — inside the radius works, repeat is 409', async () => {
    const office = await prisma.office.findFirstOrThrow();
    const at = { lat: office.lat, lng: office.lng };

    const first = await authed('post', '/api/attendance/check-in', t.otherEmployee).send(at);
    expect(first.status).toBe(200);
    expect(first.body.record.checkInAt).toBeTruthy();

    const dup = await authed('post', '/api/attendance/check-in', t.otherEmployee).send(at);
    expect(dup.status).toBe(409);

    const out = await authed('post', '/api/attendance/check-out', t.otherEmployee).send(at);
    expect(out.status).toBe(200);
    expect(out.body).toHaveProperty('netWorkedMinutes');
  });

  it('POST /api/attendance/check-out — 409 when never checked in', async () => {
    const office = await prisma.office.findFirstOrThrow();
    const res = await authed('post', '/api/attendance/check-out', t.admin).send({ lat: office.lat, lng: office.lng });
    expect(res.status).toBe(409);
  });

  it('GET /api/attendance/history — returns the caller\'s own records', async () => {
    const res = await authed('get', '/api/attendance/history', t.employee);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
  });

  it('GET /api/attendance/summary — this month\'s punctuality summary', async () => {
    const res = await authed('get', '/api/attendance/summary', t.employee);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('periodMonth');
    expect(res.body).toHaveProperty('punctuality');
  });
});

describe('attendance — team views (role-gated)', () => {
  it('GET /api/attendance/team-today — 401 / 403 employee / 200 manager & HR', async () => {
    expect((await api.get('/api/attendance/team-today')).status).toBe(401);
    expect((await authed('get', '/api/attendance/team-today', t.employee)).status).toBe(403);

    const mgr = await authed('get', '/api/attendance/team-today', t.manager);
    expect(mgr.status).toBe(200);
    expect(Array.isArray(mgr.body.team)).toBe(true);

    expect((await authed('get', '/api/attendance/team-today', t.hr)).status).toBe(200);
  });

  it('GET /api/attendance/kpi — 403 employee / 200 manager & HR', async () => {
    expect((await authed('get', '/api/attendance/kpi', t.employee)).status).toBe(403);
    const res = await authed('get', '/api/attendance/kpi', t.manager);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body).toHaveProperty('totals');
  });
});

describe('attendance — corrections workflow', () => {
  it('GET /api/attendance/corrections — the caller\'s own history', async () => {
    const res = await authed('get', '/api/attendance/corrections', t.employee);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.corrections)).toBe(true);
  });

  it('POST /api/attendance/corrections — 422 with no times, 201 valid, 409 duplicate', async () => {
    const noTimes = await authed('post', '/api/attendance/corrections', t.employee).send({
      date: '2026-08-15',
      reason: 'forgot',
    });
    expect(noTimes.status).toBe(422);

    const ok = await authed('post', '/api/attendance/corrections', t.employee).send({
      date: '2026-08-15',
      checkIn: '09:05',
      reason: 'forgot to clock in',
    });
    expect(ok.status).toBe(201);
    id.correction = ok.body.correction.id;

    const dup = await authed('post', '/api/attendance/corrections', t.employee).send({
      date: '2026-08-15',
      checkIn: '09:05',
      reason: 'again',
    });
    expect(dup.status).toBe(409);
  });

  it('GET /api/attendance/corrections/pending — 403 employee / 200 manager', async () => {
    expect((await authed('get', '/api/attendance/corrections/pending', t.employee)).status).toBe(403);
    const res = await authed('get', '/api/attendance/corrections/pending', t.manager);
    expect(res.status).toBe(200);
    expect(res.body.corrections.some((c: { id: string }) => c.id === id.correction)).toBe(true);
  });

  it('POST /api/attendance/corrections/:id/approve — 403 employee, 404 unknown id, 200 for a manager\'s report', async () => {
    expect(
      (await authed('post', `/api/attendance/corrections/${id.correction}/approve`, t.otherEmployee)).status,
    ).toBe(403);
    expect((await authed('post', '/api/attendance/corrections/does-not-exist/approve', t.manager)).status).toBe(404);

    const res = await authed('post', `/api/attendance/corrections/${id.correction}/approve`, t.manager);
    expect(res.status).toBe(200);
    expect(res.body.correction.status).toBe('APPROVED');
  });

  it('PUT /api/attendance/manual — HR/Admin only', async () => {
    const body = { userId: id[ACCOUNTS.otherEmployee], date: '2026-08-10', checkIn: '09:00' };
    expect((await authed('put', '/api/attendance/manual', t.employee).send(body)).status).toBe(403);
    expect((await authed('put', '/api/attendance/manual', t.manager).send(body)).status).toBe(403);

    const res = await authed('put', '/api/attendance/manual', t.hr).send(body);
    expect(res.status).toBe(200);
    expect(res.body.record.date).toBe('2026-08-10');
  });

  it('GET /api/attendance/logs/:userId — the GPS audit trail written by check-in / check-out', async () => {
    // the "check-in then check-out" test above ran for otherEmployee at the office coords
    const noyId = id[ACCOUNTS.otherEmployee];

    expect((await authed('get', `/api/attendance/logs/${noyId}`, t.employee)).status).toBe(403);
    expect((await authed('get', `/api/attendance/logs/${noyId}`, t.manager).query({ limit: -1 })).status).toBe(200);
    expect((await authed('get', `/api/attendance/logs/${id[ACCOUNTS.hr]}`, t.manager)).status).toBe(403); // outside team

    const res = await authed('get', `/api/attendance/logs/${noyId}`, t.hr);
    expect(res.status).toBe(200);
    const types = res.body.logs.map((l: { type: string }) => l.type);
    expect(types).toContain('CHECK_IN');
    expect(types).toContain('CHECK_OUT');
    const first = res.body.logs[0];
    expect(typeof first.lat).toBe('number');
    expect(typeof first.lng).toBe('number');
    expect(typeof first.distanceM).toBe('number');
  });
});

describe('leave', () => {
  it('GET /api/leave/balance — the caller\'s balances', async () => {
    const res = await authed('get', '/api/leave/balance', t.employee);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.balances)).toBe(true);
  });

  it('GET /api/leave/holidays — the seeded 2026 calendar', async () => {
    const res = await authed('get', '/api/leave/holidays', t.employee);
    expect(res.status).toBe(200);
    expect(res.body.holidays.length).toBeGreaterThan(0);
  });

  it('GET /api/leave/requests — the caller\'s own requests', async () => {
    const res = await authed('get', '/api/leave/requests', t.employee);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requests)).toBe(true);
  });

  it('POST /api/leave/apply — 400 malformed, 422 no working days, 201 valid', async () => {
    expect((await authed('post', '/api/leave/apply', t.employee).send({ leaveType: 'ANNUAL' })).status).toBe(400);

    const weekend = await authed('post', '/api/leave/apply', t.employee).send({
      leaveType: 'ANNUAL',
      from: '2026-09-05',
      to: '2026-09-06',
    });
    expect(weekend.status).toBe(422);

    const ok = await authed('post', '/api/leave/apply', t.employee).send({
      leaveType: 'ANNUAL',
      from: '2026-10-05',
      to: '2026-10-06',
      reason: 'trip',
    });
    expect(ok.status).toBe(201);
    expect(ok.body.request.status).toBe('PENDING');
  });

  it('POST /api/leave/record — 403 employee, 403 manager outside team, 201 manager for a report, 201 HR', async () => {
    const forReport = { userId: id[ACCOUNTS.otherEmployee], leaveType: 'PERSONAL', from: '2026-10-12', to: '2026-10-12' };

    expect((await authed('post', '/api/leave/record', t.employee).send(forReport)).status).toBe(403);
    expect(
      (await authed('post', '/api/leave/record', t.manager).send({ ...forReport, userId: id[ACCOUNTS.hr] })).status,
    ).toBe(403);

    const mgr = await authed('post', '/api/leave/record', t.manager).send(forReport);
    expect(mgr.status).toBe(201);
    expect(mgr.body.request.status).toBe('APPROVED');

    const hr = await authed('post', '/api/leave/record', t.hr).send({
      userId: id[ACCOUNTS.employee],
      leaveType: 'PERSONAL',
      from: '2026-10-13',
      to: '2026-10-13',
    });
    expect(hr.status).toBe(201);
  });

  it('GET /api/leave/pending — 403 employee / 200 manager with the seeded queue', async () => {
    expect((await authed('get', '/api/leave/pending', t.employee)).status).toBe(403);
    const res = await authed('get', '/api/leave/pending', t.manager);
    expect(res.status).toBe(200);
    expect(res.body.requests.length).toBeGreaterThan(0);
  });

  it('POST /api/leave/:id/approve & /reject — role + scope gated', async () => {
    const pending = await prisma.leaveRequest.findMany({ where: { status: 'PENDING' }, orderBy: { fromDate: 'asc' } });
    const [a, b] = pending;

    expect((await authed('post', `/api/leave/${a.id}/approve`, t.employee)).status).toBe(403);
    expect((await authed('post', '/api/leave/nope/approve', t.manager)).status).toBe(404);

    expect((await authed('post', `/api/leave/${a.id}/approve`, t.manager)).status).toBe(200);
    expect((await authed('post', `/api/leave/${b.id}/reject`, t.manager)).status).toBe(200);
  });
});

describe('payroll', () => {
  it('GET /api/payroll/payslips — the caller\'s own slips', async () => {
    const res = await authed('get', '/api/payroll/payslips', t.employee);
    expect(res.status).toBe(200);
    expect(res.body.payslips.length).toBeGreaterThan(0);
  });

  it('GET /api/payroll/payslips/:id — 200 own, 404 someone else\'s', async () => {
    const mine = await prisma.payslip.findFirstOrThrow({ where: { userId: id[ACCOUNTS.employee] } });
    const theirs = await prisma.payslip.findFirstOrThrow({ where: { userId: id[ACCOUNTS.manager] } });

    expect((await authed('get', `/api/payroll/payslips/${mine.id}`, t.employee)).status).toBe(200);
    expect((await authed('get', `/api/payroll/payslips/${theirs.id}`, t.employee)).status).toBe(404);
  });

  it('PATCH /api/payroll/run/:userId — HR/Admin only', async () => {
    const body = { ot: 111_000 };
    expect((await authed('patch', `/api/payroll/run/${id[ACCOUNTS.otherEmployee]}`, t.employee).send(body)).status).toBe(403);
    expect((await authed('patch', `/api/payroll/run/${id[ACCOUNTS.otherEmployee]}`, t.manager).send(body)).status).toBe(403);

    const res = await authed('patch', `/api/payroll/run/${id[ACCOUNTS.otherEmployee]}`, t.hr).send(body);
    expect(res.status).toBe(200);
    expect(res.body.row.ot).toBe(111_000);
  });

  it('GET /api/payroll/run — 403 for non-HR, 200 board for HR', async () => {
    expect((await authed('get', '/api/payroll/run', t.employee)).status).toBe(403);
    expect((await authed('get', '/api/payroll/run', t.manager)).status).toBe(403);

    const res = await authed('get', '/api/payroll/run', t.hr);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('periodMonth');
    expect(res.body.rows.length).toBeGreaterThan(0);
  });

  // Destructive: closes the open period and opens the next one. Keep it last.
  it('POST /api/payroll/run/approve — 403 for non-HR, 200 for HR', async () => {
    expect((await authed('post', '/api/payroll/run/approve', t.employee)).status).toBe(403);
    expect((await authed('post', '/api/payroll/run/approve', t.manager)).status).toBe(403);

    const res = await authed('post', '/api/payroll/run/approve', t.hr);
    expect(res.status).toBe(200);
    expect(res.body.approved).toBe(true);
  });
});

describe('people (role + scope gated)', () => {
  it('GET /api/people — 403 employee / 200 manager (their reports) & HR (everyone but ADMIN-scoped rules aside)', async () => {
    expect((await authed('get', '/api/people', t.employee)).status).toBe(403);

    const mgr = await authed('get', '/api/people', t.manager);
    expect(mgr.status).toBe(200);
    expect(mgr.body.people.length).toBeGreaterThan(0);

    expect((await authed('get', '/api/people', t.hr)).status).toBe(200);
  });

  it('GET /api/people/:id — a report: 200, someone outside the team: 403, yourself: 200 (B6)', async () => {
    expect((await authed('get', `/api/people/${id[ACCOUNTS.employee]}`, t.manager)).status).toBe(200);
    expect((await authed('get', `/api/people/${id[ACCOUNTS.hr]}`, t.manager)).status).toBe(403);
    expect((await authed('get', `/api/people/${id[ACCOUNTS.manager]}`, t.manager)).status).toBe(200);
  });

  it('PATCH /api/people/:id — manager may edit a report\'s personal info but not salary', async () => {
    const okName = await authed('patch', `/api/people/${id[ACCOUNTS.otherEmployee]}`, t.manager).send({
      phone: '020 1234 5678',
    });
    expect(okName.status).toBe(200);

    const salary = await authed('patch', `/api/people/${id[ACCOUNTS.otherEmployee]}`, t.manager).send({
      basicSalary: 9_999_999,
    });
    expect(salary.status).toBe(403);
  });

  it('PATCH /api/people/:id — HR may edit salary; outside-of-directory id is 404', async () => {
    const res = await authed('patch', `/api/people/${id[ACCOUNTS.otherEmployee]}`, t.hr).send({ basicSalary: 3_300_000 });
    expect(res.status).toBe(200);
    expect((await authed('patch', '/api/people/nope', t.hr).send({ phone: 'x' })).status).toBe(404);
  });

  it('POST /api/people — HR registers a new employee; managers cannot', async () => {
    const body = {
      email: `smoke-${Date.now()}@familystudio.la`,
      nameEn: 'Smoke Test',
      nameLo: 'ທົດສອບ',
      roleTitleEn: 'Tester',
      roleTitleLo: 'ຜູ້ທົດສອບ',
      password: 'secret123',
      managerId: id[ACCOUNTS.manager],
    };
    expect((await authed('post', '/api/people', t.manager).send(body)).status).toBe(403);

    const res = await authed('post', '/api/people', t.hr).send(body);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(body.email);
  });

  it('POST /api/people/:id/reset-password — HR/Admin only', async () => {
    expect(
      (await authed('post', `/api/people/${id[ACCOUNTS.otherEmployee]}/reset-password`, t.manager).send({ password: 'abcdef' })).status,
    ).toBe(403);
    const res = await authed('post', `/api/people/${id[ACCOUNTS.otherEmployee]}/reset-password`, t.hr).send({
      password: 'newpass123',
    });
    expect(res.status).toBe(200);
  });

  it('POST /api/people/:id/leave-balance — HR/Admin only', async () => {
    const body = { leaveType: 'ANNUAL', totalDays: 18 };
    expect(
      (await authed('post', `/api/people/${id[ACCOUNTS.otherEmployee]}/leave-balance`, t.manager).send(body)).status,
    ).toBe(403);
    const res = await authed('post', `/api/people/${id[ACCOUNTS.otherEmployee]}/leave-balance`, t.hr).send(body);
    expect(res.status).toBe(200);
    expect(res.body.balance.totalDays).toBe(18);
  });
});

describe('refactor bug fixes stay fixed', () => {
  it('B2 — a negative or non-numeric ?limit falls back to a sane page, never a tail slice', async () => {
    for (const limit of ['-5', 'abc', '0']) {
      const res = await authed('get', `/api/attendance/history?limit=${limit}`, t.employee);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.records)).toBe(true);
    }
  });

  it('B3 — an out-of-range HH:MM is rejected, not silently dropped', async () => {
    const correction = await authed('post', '/api/attendance/corrections', t.employee).send({
      date: '2026-07-15',
      checkIn: '29:99',
      reason: 'bad time',
    });
    expect(correction.status).toBe(400);

    const manual = await authed('put', '/api/attendance/manual', t.hr).send({
      userId: id[ACCOUNTS.otherEmployee],
      date: '2026-07-15',
      checkIn: '25:00',
    });
    expect(manual.status).toBe(400);
  });

  it('B4 — ADMIN accounts are hidden from the directory and from :id lookups', async () => {
    const list = await authed('get', '/api/people', t.hr);
    expect(list.body.people.every((p: { role: string }) => p.role !== 'ADMIN')).toBe(true);

    expect((await authed('get', `/api/people/${id[ACCOUNTS.admin]}`, t.hr)).status).toBe(404);
    expect((await authed('get', `/api/people/${id[ACCOUNTS.admin]}`, t.admin)).status).toBe(200);
  });

  it('B6 — you can view your own record but still not edit it via /people', async () => {
    expect((await authed('get', `/api/people/${id[ACCOUNTS.manager]}`, t.manager)).status).toBe(200);
    expect((await authed('patch', `/api/people/${id[ACCOUNTS.manager]}`, t.manager).send({ phone: 'x' })).status).toBe(403);
  });

  it('B7 — only an ADMIN may grant the ADMIN role', async () => {
    expect(
      (await authed('patch', `/api/people/${id[ACCOUNTS.otherEmployee]}`, t.hr).send({ role: 'ADMIN' })).status,
    ).toBe(403);
    expect(
      (await authed('patch', `/api/people/${id[ACCOUNTS.otherEmployee]}`, t.admin).send({ role: 'ADMIN' })).status,
    ).toBe(200);
    // put it back so later reads see a normal employee
    await authed('patch', `/api/people/${id[ACCOUNTS.otherEmployee]}`, t.admin).send({ role: 'EMPLOYEE' });
  });
});
