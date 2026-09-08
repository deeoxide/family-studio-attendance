import { api } from './client';
import type {
  AttendanceRecord,
  AttendanceSummary,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  Office,
  PayrollRun,
  Payslip,
  PersonRow,
  RegisterEmployeeInput,
  TeamTodayMember,
  UpdateEmployeeInput,
  User,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/api/auth/login', { email, password }),
  me: () => api.get<{ user: User }>('/api/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ ok: true }>('/api/auth/change-password', { currentPassword, newPassword }),
};

export const officeApi = {
  get: () => api.get<{ office: Office }>('/api/office'),
};

export const attendanceApi = {
  office: () => api.get<{ office: Office }>('/api/attendance/office'),
  today: () => api.get<{ record: AttendanceRecord | null; date: string }>('/api/attendance/today'),
  checkIn: (lat: number, lng: number) =>
    api.post<{ record: AttendanceRecord; distance: number }>('/api/attendance/check-in', { lat, lng }),
  checkOut: (lat: number, lng: number) =>
    api.post<{ record: AttendanceRecord; distance: number; netWorkedMinutes: number }>(
      '/api/attendance/check-out',
      { lat, lng },
    ),
  history: (limit = 10) => api.get<{ records: AttendanceRecord[] }>(`/api/attendance/history?limit=${limit}`),
  summary: () => api.get<AttendanceSummary>('/api/attendance/summary'),
  teamToday: () => api.get<{ date: string; team: TeamTodayMember[] }>('/api/attendance/team-today'),
};

export const leaveApi = {
  balance: () => api.get<{ balances: LeaveBalance[] }>('/api/leave/balance'),
  holidays: () => api.get<{ holidays: Holiday[] }>('/api/leave/holidays'),
  requests: () => api.get<{ requests: LeaveRequest[] }>('/api/leave/requests'),
  apply: (leaveType: LeaveType, from: string, to: string, reason: string) =>
    api.post<{ request: LeaveRequest }>('/api/leave/apply', { leaveType, from, to, reason }),
  pending: () => api.get<{ requests: LeaveRequest[] }>('/api/leave/pending'),
  approve: (id: string) => api.post<{ request: LeaveRequest }>(`/api/leave/${id}/approve`),
  reject: (id: string) => api.post<{ request: LeaveRequest }>(`/api/leave/${id}/reject`),
};

export const payrollApi = {
  payslips: () => api.get<{ payslips: Payslip[] }>('/api/payroll/payslips'),
  payslip: (id: string) => api.get<{ payslip: Payslip }>(`/api/payroll/payslips/${id}`),
  run: () => api.get<PayrollRun>('/api/payroll/run'),
  approveRun: () => api.post<{ approved: boolean; periodMonth: string; paidAt: string }>('/api/payroll/run/approve'),
};

export const peopleApi = {
  list: () => api.get<{ people: PersonRow[] }>('/api/people'),
  register: (input: RegisterEmployeeInput) => api.post<{ user: User }>('/api/people', input),
  update: (id: string, input: UpdateEmployeeInput) =>
    api.patch<{ user: User }>(`/api/people/${id}`, input),
  resetPassword: (id: string, password: string) =>
    api.post<{ ok: true }>(`/api/people/${id}/reset-password`, { password }),
};
