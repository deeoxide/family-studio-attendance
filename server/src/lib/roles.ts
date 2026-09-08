/**
 * Roles are plain strings in SQLite (see schema.prisma). This is the single
 * source of truth for the allowed values and how they nest.
 *
 *  - EMPLOYEE  attendance / leave / payslip, own records only
 *  - MANAGER   + team roll call and leave approvals for direct reports
 *  - HR        + payroll run and the people directory
 *  - ADMIN     superuser: every route, plus registering new staff
 */
export const ROLES = ['EMPLOYEE', 'MANAGER', 'HR', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Roles an admin/HR may assign when registering or editing an employee. */
export const ASSIGNABLE_ROLES = ROLES;
