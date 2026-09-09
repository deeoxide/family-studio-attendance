/**
 * Roles are plain strings in SQLite (see schema.prisma). This is the single
 * source of truth for the allowed values and how they nest.
 *
 *  - EMPLOYEE  attendance / leave / payslip and own profile, own records only
 *  - MANAGER   + direct reports: roll call, leave approve/record, decide
 *              attendance corrections, edit personal info
 *  - HR        + everyone: payroll run & salary, leave entitlements, register
 *              staff, edit attendance records directly
 *  - ADMIN     superuser: everything HR can do, for everyone
 *
 * See src/lib/scope.ts for the row-level "…but only my team" checks.
 */
export const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Roles an admin/HR may assign when registering or editing an employee. */
export const ASSIGNABLE_ROLES = ROLES;
