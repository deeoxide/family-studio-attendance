/**
 * Who may act on whom. One place for the role model so every route agrees.
 *
 *  - EMPLOYEE  own records only (attendance, leave, own profile personal info)
 *  - MANAGER   + their direct reports: edit personal info, approve/record leave,
 *              decide attendance-correction requests
 *  - HR        + everyone: payroll run, salary, leave entitlements, register staff,
 *              edit attendance records directly
 *  - ADMIN     superuser — everything HR can do, for everyone
 *
 * `requireRole()` in middleware/auth.ts already lets ADMIN through every gate;
 * these helpers cover the row-level "…but only for my team" checks.
 */
import type { User } from '@prisma/client';

export type Actor = Pick<User, 'id' | 'role'>;
export type Target = Pick<User, 'id' | 'managerId'>;

/** HR and Admin share the same org-wide reach. */
export const isAdminOrHR = (a: Actor): boolean => a.role === 'ADMIN' || a.role === 'HR';

/** Can `actor` act on `target` (a *different* person)? HR/Admin: anyone. Manager: direct reports. */
export function canManageOther(actor: Actor, target: Target): boolean {
  if (actor.id === target.id) return false;
  if (isAdminOrHR(actor)) return true;
  if (actor.role === 'MANAGER') return target.managerId === actor.id;
  return false;
}

/** Decide (approve/reject) a leave or attendance-correction request from `target`. */
export const canDecideFor = canManageOther;

/** Salary, payroll figures, leave entitlements, direct attendance edits, staff registration. */
export const canAdminister = isAdminOrHR;
