export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR' | 'ADMIN';
export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayslipStatus = 'OPEN' | 'PAID';
export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PunctualityLevel = 'green' | 'yellow' | 'red';

/** Personal information carried on every user / person record. */
export interface PersonalInfo {
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  startDate: string | null;
  nationalId: string | null;
  bankAccount: string | null;
}

export interface User extends PersonalInfo {
  id: string;
  email: string;
  employeeCode: string;
  nameEn: string;
  nameLo: string;
  roleTitleEn: string;
  roleTitleLo: string;
  initials: string;
  role: Role;
  managerId: string | null;
}

/** What the signed-in user may edit on their own Profile. */
export interface UpdateMeInput {
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  nationalId?: string;
  bankAccount?: string;
}

export interface Office {
  id: string;
  name: string;
  addressEn: string;
  addressLo: string;
  lat: number;
  lng: number;
  radiusM: number;
  shiftStartMin: number;
  graceEndMin: number;
  shiftEndMin: number;
  lunchStartMin: number;
  lunchEndMin: number;
  workDays: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInDistanceM: number | null;
  checkOutDistanceM: number | null;
  lateMinutes: number;
}

export interface LateDayRow {
  date: string;
  lateMinutes: number;
  index: number;
  charged: boolean;
  unpaid: boolean;
  amount: number;
}

export interface AttendanceSummary {
  periodMonth: string;
  presentCount: number;
  lateCount: number;
  onLeaveCount: number;
  punctuality: { warned: boolean; deducting: boolean; half: boolean; total: number; count: number };
  lateRows: LateDayRow[];
}

export interface TeamTodayMember {
  user: { id: string; nameEn: string; nameLo: string; initials: string };
  onLeave: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  distance: number | null;
}

export interface LeaveBalance {
  leaveType: LeaveType;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface Holiday {
  id: string;
  date: string;
  nameEn: string;
  nameLo: string;
  noteEn: string;
  noteLo: string;
  days: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  workingDays: number;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
  user?: { nameEn: string; nameLo: string; initials: string };
}

export interface Payslip {
  id: string;
  userId: string;
  periodMonth: string;
  basic: number;
  ot: number;
  allowance: number;
  gross: number;
  sso: number;
  tax: number;
  lateDeduction: number;
  net: number;
  half: boolean;
  status: PayslipStatus;
  paidAt: string | null;
  lateRows: LateDayRow[];
}

export interface PayrollRunRow extends Payslip {
  user: { id: string; nameEn: string; nameLo: string; roleTitleEn: string; roleTitleLo: string };
}

export interface PayrollRun {
  periodMonth: string;
  headcount: number;
  ssoTotal: number;
  taxTotal: number;
  netTotal: number;
  rows: PayrollRunRow[];
}

export interface PersonRow extends PersonalInfo {
  id: string;
  email: string;
  employeeCode: string;
  nameEn: string;
  nameLo: string;
  roleTitleEn: string;
  roleTitleLo: string;
  initials: string;
  role: Role;
  basicSalary: number;
  allowance: number;
  otAmount: number;
  managerId: string | null;
  annualLeaveLeft: number;
  // Current-month punctuality + this-year leave, from the server.
  lateCount: number;
  punctuality: PunctualityLevel;
  lateDeduction: number;
  leftEarlyCount: number;
  leaveDaysYtd: number;
}

export interface PeopleList {
  people: PersonRow[];
  canManage: boolean;
  canAdminister: boolean;
  periodMonth: string;
}

export interface KpiRow {
  user: { id: string; nameEn: string; nameLo: string; initials: string; roleTitleEn: string; roleTitleLo: string };
  lateCount: number;
  level: PunctualityLevel;
  lateDeduction: number;
  halfSalary: boolean;
  leftEarlyCount: number;
  leaveDaysYtd: number;
}

export interface KpiBoard {
  periodMonth: string;
  rows: KpiRow[];
  totals: { green: number; yellow: number; red: number; lateDays: number; lateDeduction: number };
}

export interface PunctualityDetail {
  periodMonth: string;
  lateCount: number;
  level: PunctualityLevel;
  lateDeduction: number;
  halfSalary: boolean;
  warned: boolean;
  leftEarlyCount: number;
  leaveDaysYtd: number;
  lateRows: LateDayRow[];
}

export interface LeaveEntitlement {
  leaveType: LeaveType;
  year: number;
  totalDays: number;
}

export interface PersonDetail {
  person: PersonRow;
  leaveBalances: LeaveEntitlement[];
  punctuality: PunctualityDetail;
  canAdminister: boolean;
}

export interface AttendanceCorrection {
  id: string;
  userId: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  reason: string;
  status: CorrectionStatus;
  createdAt: string;
  user?: { nameEn: string; nameLo: string; initials: string };
}

export interface RegisterEmployeeInput {
  email: string;
  nameEn: string;
  nameLo: string;
  roleTitleEn: string;
  roleTitleLo: string;
  role: Role;
  password: string;
  basicSalary: number;
  allowance: number;
  otAmount?: number;
  managerId?: string;
  employeeCode?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  startDate?: string;
  nationalId?: string;
  bankAccount?: string;
}

/**
 * Fields on a person's record. Managers may send the "personal" ones for a
 * direct report; the rest need HR/Admin and the server rejects them otherwise.
 */
export interface UpdateEmployeeInput {
  nameEn?: string;
  nameLo?: string;
  initials?: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  bankAccount?: string | null;
  // HR / Admin only:
  email?: string;
  employeeCode?: string;
  roleTitleEn?: string;
  roleTitleLo?: string;
  role?: Role;
  basicSalary?: number;
  allowance?: number;
  otAmount?: number;
  managerId?: string | null;
  startDate?: string | null;
}
