export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR';
export type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PayslipStatus = 'OPEN' | 'PAID';

export interface User {
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

export interface PersonRow {
  id: string;
  nameEn: string;
  nameLo: string;
  roleTitleEn: string;
  roleTitleLo: string;
  initials: string;
  role: Role;
  annualLeaveLeft: number;
}
