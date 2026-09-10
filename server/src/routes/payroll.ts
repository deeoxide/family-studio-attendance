import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { serializePayslip } from '../lib/dto';
import {
  computeOpenPeriod,
  computeOpenPeriodMany,
  type OpenPeriodFigures,
} from '../lib/payslipCompute';
import { currentPeriodMonth, nextPeriodMonth } from '../lib/period';
import { parse } from '../http/validate';
import { badRequest, conflict, notFound } from '../http/errors';
import type { LateDayResult } from '../lib/lateDeduction';
import type { Payslip } from '@prisma/client';

export const payrollRouter = Router();
payrollRouter.use(requireAuth);

/** Merge a payslip's stored columns with live open-period figures (if still OPEN). */
function withFigures(payslip: Payslip, figures: OpenPeriodFigures | null) {
  const base = serializePayslip(payslip);
  if (!figures) return { ...base, lateRows: [] as LateDayResult[] };
  const { pay, half, lateRows } = figures;
  return {
    ...base,
    basic: pay.basic,
    gross: pay.gross,
    sso: pay.sso,
    tax: pay.tax,
    lateDeduction: pay.lateDeduct,
    unpaidDeduction: pay.unpaidDeduct,
    net: pay.net,
    half,
    lateRows,
  };
}

/** One payslip with live figures — recomputed from attendance only while OPEN. */
async function liveFigures(payslip: Payslip, basicSalary: number) {
  const figures =
    payslip.status === 'OPEN'
      ? await computeOpenPeriod({ id: payslip.userId, basicSalary }, payslip.periodMonth, payslip.ot, payslip.allowance)
      : null;
  return withFigures(payslip, figures);
}

payrollRouter.get('/payslips', async (req, res) => {
  const slips = await prisma.payslip.findMany({
    where: { userId: req.user!.id },
    orderBy: { periodMonth: 'desc' },
  });
  const withLive = await Promise.all(slips.map((s) => liveFigures(s, req.user!.basicSalary)));
  res.json({ payslips: withLive });
});

payrollRouter.get('/payslips/:id', async (req, res) => {
  const slip = await prisma.payslip.findUnique({ where: { id: req.params.id } });
  if (!slip || slip.userId !== req.user!.id) throw notFound('Not found');
  res.json({ payslip: await liveFigures(slip, req.user!.basicSalary) });
});

const openFiguresSchema = z.object({
  ot: z.number().int().min(0).max(100_000_000).optional(),
  allowance: z.number().int().min(0).max(100_000_000).optional(),
});

/**
 * HR / Admin: set this month's overtime and allowance for one person on the open
 * payslip. Basic salary lives on the employee record (PATCH /api/people/:id);
 * the late-arrival deduction is computed from attendance at run time.
 */
payrollRouter.patch('/run/:userId', requireRole('HR', 'ADMIN'), async (req, res) => {
  const figures = parse(openFiguresSchema, req.body, 'Provide an overtime and/or allowance amount');
  if (figures.ot === undefined && figures.allowance === undefined) {
    throw badRequest('Provide an overtime and/or allowance amount');
  }

  const periodMonth = currentPeriodMonth();
  const slip = await prisma.payslip.findUnique({
    where: { userId_periodMonth: { userId: req.params.userId, periodMonth } },
  });
  if (!slip) throw notFound('No open payslip for this person');
  if (slip.status !== 'OPEN') throw conflict('This period is already closed');

  const updated = await prisma.payslip.update({
    where: { id: slip.id },
    data: { ot: figures.ot ?? slip.ot, allowance: figures.allowance ?? slip.allowance },
    include: { user: true },
  });
  res.json({ row: await liveFigures(updated, updated.user.basicSalary) });
});

/** HR / Admin: everyone's figures for the currently open payroll period. */
payrollRouter.get('/run', requireRole('HR', 'ADMIN'), async (_req, res) => {
  const periodMonth = currentPeriodMonth();
  const slips = await prisma.payslip.findMany({ where: { periodMonth, status: 'OPEN' }, include: { user: true } });

  const figures = await computeOpenPeriodMany(
    slips.map((s) => ({ userId: s.userId, basicSalary: s.user.basicSalary, ot: s.ot, allowance: s.allowance })),
    periodMonth,
  );

  const rows = slips.map((s) => ({
    ...withFigures(s, figures.get(s.userId) ?? null),
    user: {
      id: s.user.id,
      nameEn: s.user.nameEn,
      nameLo: s.user.nameLo,
      roleTitleEn: s.user.roleTitleEn,
      roleTitleLo: s.user.roleTitleLo,
    },
  }));

  res.json({
    periodMonth,
    headcount: rows.length,
    ssoTotal: rows.reduce((sum, r) => sum + r.sso, 0),
    taxTotal: rows.reduce((sum, r) => sum + r.tax, 0),
    netTotal: rows.reduce((sum, r) => sum + r.net, 0),
    rows,
  });
});

/** HR / Admin: close out the open period — freeze each payslip's final figures and open next month. */
payrollRouter.post('/run/approve', requireRole('HR', 'ADMIN'), async (_req, res) => {
  const periodMonth = currentPeriodMonth();
  const openSlips = await prisma.payslip.findMany({ where: { periodMonth, status: 'OPEN' }, include: { user: true } });
  if (openSlips.length === 0) throw conflict('No open payroll period to approve');

  const now = new Date();
  const next = nextPeriodMonth(periodMonth);
  const figures = await computeOpenPeriodMany(
    openSlips.map((s) => ({ userId: s.userId, basicSalary: s.user.basicSalary, ot: s.ot, allowance: s.allowance })),
    periodMonth,
  );

  // All-or-nothing: either every payslip freezes and next month opens, or nothing does.
  await prisma.$transaction(
    openSlips.flatMap((s) => {
      const { pay, half } = figures.get(s.userId)!;
      return [
        prisma.payslip.update({
          where: { id: s.id },
          data: {
            basic: pay.basic,
            gross: pay.gross,
            sso: pay.sso,
            tax: pay.tax,
            lateDeduction: pay.lateDeduct,
            unpaidDeduction: pay.unpaidDeduct,
            net: pay.net,
            half,
            status: 'PAID',
            paidAt: now,
          },
        }),
        prisma.payslip.upsert({
          where: { userId_periodMonth: { userId: s.userId, periodMonth: next } },
          create: {
            userId: s.userId,
            periodMonth: next,
            basic: s.user.basicSalary,
            ot: s.user.otAmount,
            allowance: s.user.allowance,
            gross: s.user.basicSalary + s.user.otAmount + s.user.allowance,
            sso: 0,
            tax: 0,
            lateDeduction: 0,
            net: 0,
            half: false,
            status: 'OPEN',
          },
          update: {},
        }),
      ];
    }),
  );

  res.json({ approved: true, periodMonth, paidAt: now });
});
