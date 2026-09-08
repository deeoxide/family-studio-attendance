import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { computeOpenPeriod } from '../lib/payslipCompute';
import { currentPeriodMonth, nextPeriodMonth } from '../lib/period';
import type { LateDayResult } from '../lib/lateDeduction';

export const payrollRouter = Router();
payrollRouter.use(requireAuth);

interface PayslipCore {
  id: string; userId: string; periodMonth: string; status: string;
  basic: number; ot: number; allowance: number; gross: number; sso: number;
  tax: number; lateDeduction: number; net: number; half: boolean; paidAt: Date | null;
}

/**
 * Builds the response shape explicitly (rather than `{ ...payslip }`) so a
 * caller that queried the payslip `include`-ing its `user` relation can never
 * have that (passwordHash and all) leak through into the API response.
 */
async function liveFigures(payslip: PayslipCore, basicSalary: number) {
  const core: PayslipCore = {
    id: payslip.id, userId: payslip.userId, periodMonth: payslip.periodMonth, status: payslip.status,
    basic: payslip.basic, ot: payslip.ot, allowance: payslip.allowance, gross: payslip.gross,
    sso: payslip.sso, tax: payslip.tax, lateDeduction: payslip.lateDeduction, net: payslip.net,
    half: payslip.half, paidAt: payslip.paidAt,
  };
  if (payslip.status !== 'OPEN') {
    return { ...core, lateRows: [] as LateDayResult[] };
  }
  const { pay, half, lateRows } = await computeOpenPeriod(
    { id: payslip.userId, basicSalary },
    payslip.periodMonth,
    payslip.ot,
    payslip.allowance,
  );
  return {
    ...core,
    basic: pay.basic, gross: pay.gross, sso: pay.sso, tax: pay.tax,
    lateDeduction: pay.lateDeduct, net: pay.net, half, lateRows,
  };
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
  if (!slip || slip.userId !== req.user!.id) return res.status(404).json({ error: 'Not found' });
  res.json({ payslip: await liveFigures(slip, req.user!.basicSalary) });
});

/** HR: everyone's figures for the currently open payroll period. */
payrollRouter.get('/run', requireRole('HR'), async (_req, res) => {
  const periodMonth = currentPeriodMonth();
  const slips = await prisma.payslip.findMany({ where: { periodMonth, status: 'OPEN' }, include: { user: true } });
  const rows = await Promise.all(
    slips.map(async (s) => {
      const live = await liveFigures(s, s.user.basicSalary);
      return { ...live, user: { id: s.user.id, nameEn: s.user.nameEn, nameLo: s.user.nameLo, roleTitleEn: s.user.roleTitleEn, roleTitleLo: s.user.roleTitleLo } };
    }),
  );
  res.json({
    periodMonth,
    headcount: rows.length,
    ssoTotal: rows.reduce((sum, r) => sum + r.sso, 0),
    taxTotal: rows.reduce((sum, r) => sum + r.tax, 0),
    netTotal: rows.reduce((sum, r) => sum + r.net, 0),
    rows,
  });
});

/** HR: close out the open period — freezes each payslip's final figures and opens next month. */
payrollRouter.post('/run/approve', requireRole('HR'), async (_req, res) => {
  const periodMonth = currentPeriodMonth();
  const openSlips = await prisma.payslip.findMany({ where: { periodMonth, status: 'OPEN' }, include: { user: true } });
  if (openSlips.length === 0) return res.status(409).json({ error: 'No open payroll period to approve' });

  const now = new Date();
  const next = nextPeriodMonth(periodMonth);
  for (const s of openSlips) {
    const { pay, half } = await computeOpenPeriod({ id: s.userId, basicSalary: s.user.basicSalary }, periodMonth, s.ot, s.allowance);
    await prisma.payslip.update({
      where: { id: s.id },
      data: {
        basic: pay.basic, gross: pay.gross, sso: pay.sso, tax: pay.tax,
        lateDeduction: pay.lateDeduct, net: pay.net, half, status: 'PAID', paidAt: now,
      },
    });
    await prisma.payslip.upsert({
      where: { userId_periodMonth: { userId: s.userId, periodMonth: next } },
      create: {
        userId: s.userId, periodMonth: next, basic: s.user.basicSalary, ot: s.user.otAmount,
        allowance: s.user.allowance, gross: s.user.basicSalary + s.user.otAmount + s.user.allowance,
        sso: 0, tax: 0, lateDeduction: 0, net: 0, half: false, status: 'OPEN',
      },
      update: {},
    });
  }
  res.json({ approved: true, periodMonth, paidAt: now });
});
