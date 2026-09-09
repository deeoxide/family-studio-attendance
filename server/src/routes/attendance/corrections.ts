import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireRole } from '../../middleware/auth';
import { lateMinutesFor } from '../../lib/shift';
import { vientianeWallClock, todayISO } from '../../lib/period';
import { requireOffice } from '../../lib/office';
import { assertCanManage } from '../../middleware/loadTarget';
import { scopedTeamIds } from '../../middleware/scopedTeam';
import { parse } from '../../http/validate';
import { conflict, notFound, unprocessable } from '../../http/errors';
import { hhmm, isoDate } from '../../lib/validators';

/** Manual attendance edits (HR/Admin) and the employee missed-punch correction workflow. */
export const correctionsRouter = Router();

/**
 * Write a check-in / check-out onto one day's record and recompute late minutes.
 * `checkInAt` / `checkOutAt`: a Date sets it, `null` clears it, `undefined` keeps
 * whatever the record already has.
 */
async function applyToRecord(
  userId: string,
  date: string,
  checkInAt: Date | null | undefined,
  checkOutAt: Date | null | undefined,
  graceEndMin: number,
) {
  const existing = await prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date } } });
  const nextIn = checkInAt === undefined ? (existing?.checkInAt ?? null) : checkInAt;
  const nextOut = checkOutAt === undefined ? (existing?.checkOutAt ?? null) : checkOutAt;
  const lateMinutes = nextIn ? lateMinutesFor(nextIn, { graceEndMin, lunchMinutes: 0 }) : 0;
  return prisma.attendanceRecord.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, checkInAt: nextIn, checkOutAt: nextOut, lateMinutes },
    update: { checkInAt: nextIn, checkOutAt: nextOut, lateMinutes },
  });
}

/** `'HH:MM'` on `date` as a real instant; `undefined`/`null` pass through unchanged. */
function wallClock(date: string, value: string | null | undefined): Date | null | undefined {
  if (value === undefined || value === null) return value;
  // hhmm has already range-checked the string, so this cannot be null.
  return vientianeWallClock(date, value)!;
}

const manualSchema = z.object({
  userId: z.string().min(1),
  date: isoDate,
  checkIn: hhmm.nullish(),
  checkOut: hhmm.nullish(),
});

/** HR / Admin: set or correct any employee's attendance for a past day, no request needed. */
correctionsRouter.put('/manual', requireRole('HR', 'ADMIN'), async (req, res) => {
  const { userId, date, checkIn, checkOut } = parse(manualSchema, req.body, 'Invalid attendance edit');
  if (date > todayISO()) throw unprocessable('That date is in the future');
  if (checkIn === undefined && checkOut === undefined) throw unprocessable('Nothing to change');

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw notFound('Employee not found');

  const office = await requireOffice();
  const record = await applyToRecord(
    userId,
    date,
    wallClock(date, checkIn),
    wallClock(date, checkOut),
    office.graceEndMin,
  );
  res.json({ record });
});

const correctionSchema = z.object({
  date: isoDate,
  checkIn: hhmm.optional(),
  checkOut: hhmm.optional(),
  reason: z.string().trim().min(1, 'Add a short reason').max(500),
});

/** Employee: ask for a missed / wrong punch to be fixed. Approved by manager, HR or Admin. */
correctionsRouter.post('/corrections', async (req, res) => {
  const { date, checkIn, checkOut, reason } = parse(correctionSchema, req.body, 'Invalid request');
  if (!checkIn && !checkOut) throw unprocessable('Enter a check-in time, a check-out time, or both');
  if (date > todayISO()) throw unprocessable('That date is in the future');

  const dup = await prisma.attendanceCorrection.findFirst({
    where: { userId: req.user!.id, date, status: 'PENDING' },
  });
  if (dup) throw conflict('You already have a pending correction for that day');

  const correction = await prisma.attendanceCorrection.create({
    data: {
      userId: req.user!.id,
      date,
      checkInAt: checkIn ? vientianeWallClock(date, checkIn) : null,
      checkOutAt: checkOut ? vientianeWallClock(date, checkOut) : null,
      reason,
    },
  });
  res.status(201).json({ correction });
});

/** The signed-in employee's own correction history. */
correctionsRouter.get('/corrections', async (req, res) => {
  const corrections = await prisma.attendanceCorrection.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json({ corrections });
});

/** Pending corrections to decide, scoped to the caller's team (see scopedTeam / B4). */
correctionsRouter.get('/corrections/pending', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const corrections = await prisma.attendanceCorrection.findMany({
    where: { status: 'PENDING', userId: { in: await scopedTeamIds(req.user!) } },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { nameEn: true, nameLo: true, initials: true } } },
  });
  res.json({ corrections });
});

async function decideCorrection(req: Request, res: Response, approve: boolean) {
  const correction = await prisma.attendanceCorrection.findUnique({ where: { id: req.params.id } });
  if (!correction || correction.status !== 'PENDING') throw notFound('Not found');

  const target = await prisma.user.findUnique({ where: { id: correction.userId } });
  if (!target) throw notFound('Not found');
  assertCanManage(req.user!, target);

  if (approve) {
    const office = await requireOffice();
    await applyToRecord(
      correction.userId,
      correction.date,
      correction.checkInAt ?? undefined,
      correction.checkOutAt ?? undefined,
      office.graceEndMin,
    );
  }
  const updated = await prisma.attendanceCorrection.update({
    where: { id: correction.id },
    data: { status: approve ? 'APPROVED' : 'REJECTED', decidedById: req.user!.id, decidedAt: new Date() },
  });
  res.json({ correction: updated });
}

correctionsRouter.post('/corrections/:id/approve', requireRole('MANAGER', 'HR', 'ADMIN'), (req, res) =>
  decideCorrection(req, res, true),
);
correctionsRouter.post('/corrections/:id/reject', requireRole('MANAGER', 'HR', 'ADMIN'), (req, res) =>
  decideCorrection(req, res, false),
);
