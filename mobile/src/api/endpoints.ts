import { api } from './client';
import type {
  AttendanceCorrection,
  AttendanceRecord,
  AttendanceSummary,
  Holiday,
  KpiBoard,
  LeaveBalance,
  LeaveEntitlement,
  LeaveRequest,
  LeaveType,
  Office,
  PayrollRun,
  PayrollRunRow,
  Payslip,
  PeopleList,
  PersonDetail,
  RegisterEmployeeInput,
  TeamTodayMember,
  UpdateEmployeeInput,
  UpdateMeInput,
  User,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/api/auth/login', { email, password }),
  me: () => api.get<{ user: User }>('/api/auth/me'),
  updateMe: (input: UpdateMeInput) => api.patch<{ user: User }>('/api/auth/me', input),
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
  /** Punctuality KPI board for the current month (Manager: team · HR/Admin: all). */
  kpi: () => api.get<KpiBoard>('/api/attendance/kpi'),

  // Missed-punch corrections
  myCorrections: () => api.get<{ corrections: AttendanceCorrection[] }>('/api/attendance/corrections'),
  submitCorrection: (input: { date: string; checkIn?: string; checkOut?: string; reason: string }) =>
    api.post<{ correction: AttendanceCorrection }>('/api/attendance/corrections', input),
  pendingCorrections: () =>
    api.get<{ corrections: AttendanceCorrection[] }>('/api/attendance/corrections/pending'),
  approveCorrection: (id: string) =>
    api.post<{ correction: AttendanceCorrection }>(`/api/attendance/corrections/${id}/approve`),
  rejectCorrection: (id: string) =>
    api.post<{ correction: AttendanceCorrection }>(`/api/attendance/corrections/${id}/reject`),

  // HR / Admin: direct edit, no request
  setManual: (input: { userId: string; date: string; checkIn?: string | null; checkOut?: string | null }) =>
    api.put<{ record: AttendanceRecord }>('/api/attendance/manual', input),
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
  /** HR / Admin (anyone) or a manager (their team): record leave as already approved. */
  record: (input: { userId: string; leaveType: LeaveType; from: string; to: string; reason: string }) =>
    api.post<{ request: LeaveRequest }>('/api/leave/record', input),
};

export const payrollApi = {
  payslips: () => api.get<{ payslips: Payslip[] }>('/api/payroll/payslips'),
  payslip: (id: string) => api.get<{ payslip: Payslip }>(`/api/payroll/payslips/${id}`),
  run: () => api.get<PayrollRun>('/api/payroll/run'),
  approveRun: () => api.post<{ approved: boolean; periodMonth: string; paidAt: string }>('/api/payroll/run/approve'),
  /** HR / Admin: set this month's overtime / allowance for one person. */
  setOpenFigures: (userId: string, input: { ot?: number; allowance?: number }) =>
    api.patch<{ row: PayrollRunRow }>(`/api/payroll/run/${userId}`, input),
};

export const peopleApi = {
  list: () => api.get<PeopleList>('/api/people'),
  get: (id: string) => api.get<PersonDetail>(`/api/people/${id}`),
  register: (input: RegisterEmployeeInput) => api.post<{ user: User }>('/api/people', input),
  update: (id: string, input: UpdateEmployeeInput) => api.patch<{ user: User }>(`/api/people/${id}`, input),
  resetPassword: (id: string, password: string) =>
    api.post<{ ok: true }>(`/api/people/${id}/reset-password`, { password }),
  setLeaveBalance: (id: string, input: { leaveType: LeaveType; totalDays: number; year?: number }) =>
    api.post<{ balance: LeaveEntitlement }>(`/api/people/${id}/leave-balance`, input),
};
