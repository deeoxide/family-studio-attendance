import type { Payslip, User } from '@prisma/client';

/** The signed-in user's own record, including their personal information. */
export function serializeUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    employeeCode: u.employeeCode,
    nameEn: u.nameEn,
    nameLo: u.nameLo,
    roleTitleEn: u.roleTitleEn,
    roleTitleLo: u.roleTitleLo,
    initials: u.initials,
    role: u.role,
    managerId: u.managerId,
    phone: u.phone,
    address: u.address,
    dateOfBirth: u.dateOfBirth,
    startDate: u.startDate,
    nationalId: u.nationalId,
    bankAccount: u.bankAccount,
  };
}

/**
 * Full record for the People / Team management screens — personal info plus the
 * pay figures. Only ever sent to a caller allowed to manage this person
 * (HR/Admin, or a manager viewing a direct report); a manager's client hides
 * the salary block, but the gate is enforced route-side, not here.
 */
export function serializePerson(u: User) {
  return {
    ...serializeUser(u),
    basicSalary: u.basicSalary,
    allowance: u.allowance,
    otAmount: u.otAmount,
    createdAt: u.createdAt,
  };
}

/**
 * A payslip's own columns only. Built field-by-field (not `{ ...payslip }`) so a
 * caller that loaded the payslip `include`-ing its `user` relation can never leak
 * that (passwordHash and all) into the response.
 */
export function serializePayslip(p: Payslip) {
  return {
    id: p.id,
    userId: p.userId,
    periodMonth: p.periodMonth,
    status: p.status,
    basic: p.basic,
    ot: p.ot,
    allowance: p.allowance,
    gross: p.gross,
    sso: p.sso,
    tax: p.tax,
    lateDeduction: p.lateDeduction,
    unpaidDeduction: p.unpaidDeduction,
    net: p.net,
    half: p.half,
    paidAt: p.paidAt,
  };
}
