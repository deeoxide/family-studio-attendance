import { describe, it, expect } from 'vitest';
import { isAdminOrHR, canManageOther, canAdminister } from '../lib/scope';
import { vientianeWallClock } from '../lib/period';

const admin = { id: 'a', role: 'ADMIN' };
const hr = { id: 'h', role: 'HR' };
const mgr = { id: 'm', role: 'MANAGER' };
const emp = { id: 'e', role: 'EMPLOYEE' };

const report = { id: 'r', managerId: 'm' };
const otherReport = { id: 'r2', managerId: 'x' };

describe('scope', () => {
  it('HR and Admin reach everyone; employees reach no one else', () => {
    expect(isAdminOrHR(admin)).toBe(true);
    expect(isAdminOrHR(hr)).toBe(true);
    expect(isAdminOrHR(mgr)).toBe(false);

    expect(canManageOther(admin, otherReport)).toBe(true);
    expect(canManageOther(hr, otherReport)).toBe(true);
    expect(canManageOther(emp, report)).toBe(false);
  });

  it('a manager reaches only their direct reports', () => {
    expect(canManageOther(mgr, report)).toBe(true);
    expect(canManageOther(mgr, otherReport)).toBe(false);
  });

  it('no one "manages" themselves through canManageOther', () => {
    expect(canManageOther(mgr, { id: 'm', managerId: null })).toBe(false);
    expect(canManageOther(admin, { id: 'a', managerId: null })).toBe(false);
  });

  it('salary / payroll / entitlements are HR+Admin only', () => {
    expect(canAdminister(admin)).toBe(true);
    expect(canAdminister(hr)).toBe(true);
    expect(canAdminister(mgr)).toBe(false);
    expect(canAdminister(emp)).toBe(false);
  });
});

describe('vientianeWallClock', () => {
  it('maps a Vientiane wall-clock time to the right UTC instant (UTC+7)', () => {
    const d = vientianeWallClock('2026-09-05', '09:15');
    expect(d?.toISOString()).toBe('2026-09-05T02:15:00.000Z');
  });

  it('rejects malformed input', () => {
    expect(vientianeWallClock('2026-9-5', '09:15')).toBeNull();
    expect(vientianeWallClock('2026-09-05', '9:15')).toBeNull();
    expect(vientianeWallClock('2026-09-05', '25:00')).toBeNull();
  });
});
