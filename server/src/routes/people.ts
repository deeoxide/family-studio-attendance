import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { serializeUser, serializePerson } from '../lib/dto';
import { ASSIGNABLE_ROLES } from '../lib/roles';
import { canAdminister } from '../lib/scope';
import { loadTarget } from '../middleware/loadTarget';
import { scopedTeam } from '../middleware/scopedTeam';
import { punctualityKpis } from '../lib/kpi';
import { currentPeriodMonth, currentYear } from '../lib/period';
import { requireOffice } from '../lib/office';
import { parse } from '../http/validate';
import { badRequest, conflict, forbidden } from '../http/errors';
import { nullifyBlanks } from '../lib/nullify';
import { isoDate, optionalDate } from '../lib/validators';

export const peopleRouter = Router();
peopleRouter.use(requireAuth);

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'PERSONAL'] as const;

// ─── Shared field definitions (used required on register, optional on patch) ───
const F = {
  nameEn: z.string().min(1).max(80),
  nameLo: z.string().min(1).max(80),
  initials: z.string().trim().min(1).max(4),
  roleTitleEn: z.string().min(1).max(80),
  roleTitleLo: z.string().min(1).max(80),
  role: z.enum(ASSIGNABLE_ROLES),
  email: z.string().email(),
  employeeCode: z.string().trim().min(1).max(12),
  basicSalary: z.number().int().min(0),
  allowance: z.number().int().min(0),
  otAmount: z.number().int().min(0),
  phone: z.string().trim().max(120),
  address: z.string().trim().max(240),
  nationalId: z.string().trim().max(120),
  bankAccount: z.string().trim().max(120),
};

/** Fields a manager may edit on a direct report. */
const personalSchema = z.object({
  nameEn: F.nameEn.optional(),
  nameLo: F.nameLo.optional(),
  initials: F.initials.optional(),
  phone: F.phone.nullish(),
  address: F.address.nullish(),
  dateOfBirth: optionalDate.nullish(),
  nationalId: F.nationalId.nullish(),
  bankAccount: F.bankAccount.nullish(),
});

/** Fields only HR / Admin may edit (job title, role, pay, reporting line, start date). */
const administeredSchema = z.object({
  email: F.email.optional(),
  employeeCode: F.employeeCode.optional(),
  roleTitleEn: F.roleTitleEn.optional(),
  roleTitleLo: F.roleTitleLo.optional(),
  role: F.role.optional(),
  basicSalary: F.basicSalary.optional(),
  allowance: F.allowance.optional(),
  otAmount: F.otAmount.optional(),
  managerId: z.string().nullable().optional(),
  startDate: optionalDate.nullish(),
});
const ADMINISTERED_KEYS = administeredSchema.keyof().options as string[];

const registerSchema = personalSchema.merge(administeredSchema).extend({
  email: F.email,
  nameEn: F.nameEn,
  nameLo: F.nameLo,
  roleTitleEn: F.roleTitleEn,
  roleTitleLo: F.roleTitleLo,
  role: F.role.default('EMPLOYEE'),
  password: z.string().min(6).max(72),
  basicSalary: F.basicSalary.default(0),
  allowance: F.allowance.default(0),
  otAmount: F.otAmount.default(0),
  employeeCode: F.employeeCode.optional(),
  dateOfBirth: isoDate.optional(),
  startDate: isoDate.optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Two initials from a display name, e.g. "Somchai Keomany" -> "SK". */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '');
  return letters.toUpperCase() || 'NA';
}

/** Next free 4-digit employee code (numeric max + 1), for when one isn't supplied. */
async function nextEmployeeCode(): Promise<string> {
  const users = await prisma.user.findMany({ select: { employeeCode: true } });
  const max = users.reduce((m, u) => {
    const n = Number(u.employeeCode);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1).padStart(4, '0');
}

async function assertEmailFree(email: string, exceptUserId?: string) {
  const clash = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (clash && clash.id !== exceptUserId) throw conflict('That email is already in use');
}

async function assertEmployeeCodeFree(code: string, exceptUserId?: string) {
  const clash = await prisma.user.findUnique({ where: { employeeCode: code } });
  if (clash && clash.id !== exceptUserId) throw conflict(`Employee code ${code} is already in use`);
}

async function assertManagerExists(managerId: string) {
  if (!(await prisma.user.findUnique({ where: { id: managerId } }))) {
    throw badRequest('Selected manager was not found');
  }
}

/** Only an ADMIN may create or promote another ADMIN (B7). */
function assertMayAssignRole(actorRole: string, role: string | undefined) {
  if (role === 'ADMIN' && actorRole !== 'ADMIN') {
    throw forbidden('Only an administrator can grant the administrator role');
  }
}

/** Batch punctuality scorecard for a set of users this month. */
async function kpisFor(userIds: Array<{ id: string; basicSalary: number }>) {
  const office = await requireOffice();
  const periodMonth = currentPeriodMonth();
  const kpis = await punctualityKpis(userIds, periodMonth, {
    shiftEndMin: office.shiftEndMin,
    year: currentYear(),
  });
  return { periodMonth, kpis };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/** Directory. HR/Admin see everyone; a manager sees only their direct reports. */
peopleRouter.get('/', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const actor = req.user!;
  const year = currentYear();
  const users = await scopedTeam(actor, { nameEn: 'asc' });
  const ids = users.map((u) => u.id);

  const [balances, approved, { periodMonth, kpis }] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { leaveType: 'ANNUAL', year, userId: { in: ids } } }),
    prisma.leaveRequest.findMany({
      where: { leaveType: 'ANNUAL', status: 'APPROVED', userId: { in: ids }, fromDate: { startsWith: String(year) } },
    }),
    kpisFor(users.map((u) => ({ id: u.id, basicSalary: u.basicSalary }))),
  ]);

  const usedByUser = new Map<string, number>();
  for (const r of approved) usedByUser.set(r.userId, (usedByUser.get(r.userId) ?? 0) + r.workingDays);
  const totalByUser = new Map(balances.map((b) => [b.userId, b.totalDays]));

  res.json({
    canManage: canAdminister(actor) || actor.role === 'MANAGER',
    canAdminister: canAdminister(actor),
    periodMonth,
    people: users.map((u) => {
      const k = kpis.get(u.id)!;
      return {
        ...serializePerson(u),
        annualLeaveLeft: (totalByUser.get(u.id) ?? 15) - (usedByUser.get(u.id) ?? 0),
        lateCount: k.lateCount,
        punctuality: k.level,
        lateDeduction: k.lateDeduction,
        leftEarlyCount: k.leftEarlyCount,
        leaveDaysYtd: k.leaveDaysYtd,
      };
    }),
  });
});

/** One person's full record, for the detail/edit screen. */
peopleRouter.get('/:id', requireRole('MANAGER', 'HR', 'ADMIN'), loadTarget('id', 'view'), async (req, res) => {
  const target = req.target!;
  const year = currentYear();
  const [balances, { periodMonth, kpis }] = await Promise.all([
    prisma.leaveBalance.findMany({ where: { userId: target.id, year }, orderBy: { leaveType: 'asc' } }),
    kpisFor([{ id: target.id, basicSalary: target.basicSalary }]),
  ]);
  const kpi = kpis.get(target.id)!;

  res.json({
    person: serializePerson(target),
    leaveBalances: balances.map((b) => ({ leaveType: b.leaveType, year: b.year, totalDays: b.totalDays })),
    punctuality: {
      periodMonth,
      lateCount: kpi.lateCount,
      level: kpi.level,
      lateDeduction: kpi.lateDeduction,
      halfSalary: kpi.halfSalary,
      warned: kpi.warned,
      leftEarlyCount: kpi.leftEarlyCount,
      leaveDaysYtd: kpi.leaveDaysYtd,
      lateRows: kpi.lateRows,
    },
    canAdminister: canAdminister(req.user!),
  });
});

/** Register a new employee. HR / Admin only — managers cannot add staff. */
peopleRouter.post('/', requireRole('HR', 'ADMIN'), async (req, res) => {
  const d = parse(registerSchema, req.body, 'Invalid employee details');
  assertMayAssignRole(req.user!.role, d.role);

  const email = d.email.toLowerCase();
  await assertEmailFree(email);
  const employeeCode = d.employeeCode ?? (await nextEmployeeCode());
  await assertEmployeeCodeFree(employeeCode);
  if (d.managerId) await assertManagerExists(d.managerId);

  const year = currentYear();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(d.password, 10),
      employeeCode,
      nameEn: d.nameEn,
      nameLo: d.nameLo,
      roleTitleEn: d.roleTitleEn,
      roleTitleLo: d.roleTitleLo,
      initials: d.initials?.toUpperCase() ?? initialsFrom(d.nameEn),
      role: d.role,
      basicSalary: d.basicSalary,
      allowance: d.allowance,
      otAmount: d.otAmount,
      managerId: d.managerId ?? null,
      phone: d.phone ?? null,
      address: d.address ?? null,
      dateOfBirth: d.dateOfBirth ?? null,
      startDate: d.startDate ?? null,
      nationalId: d.nationalId ?? null,
      bankAccount: d.bankAccount ?? null,
      leaveBalances: {
        create: [
          { leaveType: 'ANNUAL', year, totalDays: 15 },
          { leaveType: 'SICK', year, totalDays: 30 },
          { leaveType: 'PERSONAL', year, totalDays: 5 },
        ],
      },
    },
  });
  res.status(201).json({ user: serializeUser(user) });
});

peopleRouter.patch('/:id', requireRole('MANAGER', 'HR', 'ADMIN'), loadTarget('id', 'manage'), async (req, res) => {
  const actor = req.user!;
  const target = req.target!;
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (ADMINISTERED_KEYS.some((k) => k in body) && !canAdminister(actor)) {
    throw forbidden('Only HR or an administrator can change job title, role, salary or start date');
  }

  const schema = canAdminister(actor) ? personalSchema.merge(administeredSchema) : personalSchema;
  const d = parse(schema, body, 'Invalid changes') as z.infer<typeof administeredSchema> &
    z.infer<typeof personalSchema>;

  assertMayAssignRole(actor.role, d.role);

  if (d.managerId) {
    if (d.managerId === target.id) throw badRequest('An employee cannot be their own manager');
    await assertManagerExists(d.managerId);
  }
  if (d.email) await assertEmailFree(d.email, target.id);
  if (d.employeeCode) await assertEmployeeCodeFree(d.employeeCode, target.id);

  const data = nullifyBlanks(d);
  if (typeof data.email === 'string') data.email = data.email.toLowerCase();

  const user = await prisma.user.update({ where: { id: target.id }, data });
  res.json({ user: serializePerson(user) });
});

const resetSchema = z.object({ password: z.string().min(6).max(72) });

peopleRouter.post('/:id/reset-password', requireRole('HR', 'ADMIN'), loadTarget('id', 'manage'), async (req, res) => {
  const { password } = parse(resetSchema, req.body, 'Password must be at least 6 characters');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: req.target!.id }, data: { passwordHash } });
  res.json({ ok: true });
});

const balanceSchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  year: z.number().int().min(2020).max(2100).optional(),
  totalDays: z.number().int().min(0).max(365),
});

/** Adjust a person's yearly leave entitlement. HR / Admin only. */
peopleRouter.post('/:id/leave-balance', requireRole('HR', 'ADMIN'), loadTarget('id', 'manage'), async (req, res) => {
  const d = parse(balanceSchema, req.body, 'Invalid entitlement');
  const year = d.year ?? currentYear();
  const balance = await prisma.leaveBalance.upsert({
    where: { userId_leaveType_year: { userId: req.target!.id, leaveType: d.leaveType, year } },
    create: { userId: req.target!.id, leaveType: d.leaveType, year, totalDays: d.totalDays },
    update: { totalDays: d.totalDays },
  });
  res.json({ balance: { leaveType: balance.leaveType, year: balance.year, totalDays: balance.totalDays } });
});
