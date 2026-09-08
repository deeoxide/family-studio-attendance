import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { serializeUser } from '../lib/dto';
import { ASSIGNABLE_ROLES } from '../lib/roles';

export const peopleRouter = Router();
peopleRouter.use(requireAuth, requireRole('HR', 'ADMIN'));

peopleRouter.get('/', async (_req, res) => {
  const year = new Date().getFullYear();
  const users = await prisma.user.findMany({ orderBy: { nameEn: 'asc' } });
  const balances = await prisma.leaveBalance.findMany({ where: { leaveType: 'ANNUAL', year } });
  const approved = await prisma.leaveRequest.findMany({
    where: { leaveType: 'ANNUAL', status: 'APPROVED', fromDate: { startsWith: String(year) } },
  });
  const usedByUser = new Map<string, number>();
  for (const r of approved) usedByUser.set(r.userId, (usedByUser.get(r.userId) ?? 0) + r.workingDays);
  const totalByUser = new Map(balances.map((b) => [b.userId, b.totalDays]));

  res.json({
    people: users.map((u) => ({
      id: u.id,
      email: u.email,
      employeeCode: u.employeeCode,
      nameEn: u.nameEn,
      nameLo: u.nameLo,
      roleTitleEn: u.roleTitleEn,
      roleTitleLo: u.roleTitleLo,
      initials: u.initials,
      role: u.role,
      basicSalary: u.basicSalary,
      allowance: u.allowance,
      otAmount: u.otAmount,
      managerId: u.managerId,
      annualLeaveLeft: (totalByUser.get(u.id) ?? 15) - (usedByUser.get(u.id) ?? 0),
    })),
  });
});

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

const registerSchema = z.object({
  email: z.string().email(),
  nameEn: z.string().min(1).max(80),
  nameLo: z.string().min(1).max(80),
  roleTitleEn: z.string().min(1).max(80),
  roleTitleLo: z.string().min(1).max(80),
  role: z.enum(ASSIGNABLE_ROLES).default('EMPLOYEE'),
  password: z.string().min(6).max(72),
  basicSalary: z.number().int().min(0).default(0),
  allowance: z.number().int().min(0).default(0),
  otAmount: z.number().int().min(0).default(0),
  managerId: z.string().optional(),
  employeeCode: z.string().trim().min(1).max(12).optional(),
  initials: z.string().trim().min(1).max(4).optional(),
});

peopleRouter.post('/', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid employee details' });
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();

  if (await prisma.user.findUnique({ where: { email } })) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }
  const employeeCode = d.employeeCode ?? (await nextEmployeeCode());
  if (await prisma.user.findUnique({ where: { employeeCode } })) {
    return res.status(409).json({ error: `Employee code ${employeeCode} is already in use` });
  }
  if (d.managerId && !(await prisma.user.findUnique({ where: { id: d.managerId } }))) {
    return res.status(400).json({ error: 'Selected manager was not found' });
  }

  const passwordHash = await bcrypt.hash(d.password, 10);
  const year = new Date().getFullYear();
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
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

const updateSchema = z.object({
  nameEn: z.string().min(1).max(80).optional(),
  nameLo: z.string().min(1).max(80).optional(),
  roleTitleEn: z.string().min(1).max(80).optional(),
  roleTitleLo: z.string().min(1).max(80).optional(),
  role: z.enum(ASSIGNABLE_ROLES).optional(),
  basicSalary: z.number().int().min(0).optional(),
  allowance: z.number().int().min(0).optional(),
  otAmount: z.number().int().min(0).optional(),
  managerId: z.string().nullable().optional(),
});

peopleRouter.patch('/:id', async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Employee not found' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid changes' });
  }
  if (parsed.data.managerId) {
    if (parsed.data.managerId === target.id) {
      return res.status(400).json({ error: 'An employee cannot be their own manager' });
    }
    if (!(await prisma.user.findUnique({ where: { id: parsed.data.managerId } }))) {
      return res.status(400).json({ error: 'Selected manager was not found' });
    }
  }
  const user = await prisma.user.update({ where: { id: target.id }, data: parsed.data });
  res.json({ user: serializeUser(user) });
});

const resetSchema = z.object({ password: z.string().min(6).max(72) });

peopleRouter.post('/:id/reset-password', async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) return res.status(404).json({ error: 'Employee not found' });

  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });
  res.json({ ok: true });
});
