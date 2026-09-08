import type { User } from '@prisma/client';

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
  };
}
