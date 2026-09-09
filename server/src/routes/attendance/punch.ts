import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { distanceMeters } from '../../lib/geofence';
import { lateMinutesFor, netWorkedMinutes } from '../../lib/shift';
import { lateModel } from '../../lib/lateDeduction';
import { todayISO, currentPeriodMonth } from '../../lib/period';
import { requireOffice } from '../../lib/office';
import { parse } from '../../http/validate';
import { conflict, unprocessable } from '../../http/errors';

/** Self-service attendance for the signed-in employee: office, punches, history, summary. */
export const punchRouter = Router();

const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Parse the body coordinates and confirm they're inside the office geofence. */
async function requireInsideGeofence(body: unknown) {
  const { lat, lng } = parse(coordsSchema, body, 'lat/lng required');
  const office = await requireOffice();
  const distance = distanceMeters(office.lat, office.lng, lat, lng);
  if (distance > office.radiusM) {
    throw unprocessable('Outside the check-in radius', { distance });
  }
  return { office, lat, lng, distance };
}

/** Append-only GPS audit row for one accepted punch. */
type Fix = { office: { id: string }; lat: number; lng: number; distance: number };
const logPunch = (userId: string, type: 'CHECK_IN' | 'CHECK_OUT', fix: Fix) =>
  prisma.attendanceLog.create({
    data: { userId, officeId: fix.office.id, type, lat: fix.lat, lng: fix.lng, distanceM: fix.distance },
  });

const recordForToday = (userId: string) =>
  prisma.attendanceRecord.findUnique({ where: { userId_date: { userId, date: todayISO() } } });

punchRouter.get('/office', async (_req, res) => {
  res.json({ office: await requireOffice() });
});

punchRouter.get('/today', async (req, res) => {
  const date = todayISO();
  const record = await prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId: req.user!.id, date } },
  });
  res.json({ record, date });
});

punchRouter.post('/check-in', async (req, res) => {
  const fix = await requireInsideGeofence(req.body);
  const { office, distance } = fix;

  const date = todayISO();
  const existing = await recordForToday(req.user!.id);
  if (existing?.checkInAt) {
    throw conflict('Already checked in today', { record: existing });
  }

  const now = new Date();
  const lateMinutes = lateMinutesFor(now, { graceEndMin: office.graceEndMin, lunchMinutes: 0 });
  const [record] = await prisma.$transaction([
    prisma.attendanceRecord.upsert({
      where: { userId_date: { userId: req.user!.id, date } },
      create: { userId: req.user!.id, date, checkInAt: now, checkInDistanceM: distance, lateMinutes },
      update: { checkInAt: now, checkInDistanceM: distance, lateMinutes },
    }),
    logPunch(req.user!.id, 'CHECK_IN', fix),
  ]);
  res.json({ record, distance });
});

punchRouter.post('/check-out', async (req, res) => {
  const fix = await requireInsideGeofence(req.body);
  const { office, distance } = fix;

  const existing = await recordForToday(req.user!.id);
  if (!existing?.checkInAt) throw conflict('Not checked in yet');
  if (existing.checkOutAt) throw conflict('Already checked out today', { record: existing });

  const now = new Date();
  const [record] = await prisma.$transaction([
    prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutAt: now, checkOutDistanceM: distance },
    }),
    logPunch(req.user!.id, 'CHECK_OUT', fix),
  ]);
  res.json({
    record,
    distance,
    netWorkedMinutes: netWorkedMinutes(existing.checkInAt, now, { graceEndMin: office.graceEndMin, lunchMinutes: 90 }),
  });
});

punchRouter.get('/history', async (req, res) => {
  const raw = Number(req.query.limit);
  const limit = Number.isFinite(raw) ? Math.max(1, Math.min(50, raw)) : 10;
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: req.user!.id, date: { lt: todayISO() } },
    orderBy: { date: 'desc' },
    take: limit,
  });
  res.json({ records });
});

/** This month's punctuality summary + late-deduction breakdown for the signed-in employee. */
punchRouter.get('/summary', async (req, res) => {
  const periodMonth = currentPeriodMonth();
  const [records, approvedLeave] = await Promise.all([
    prisma.attendanceRecord.findMany({ where: { userId: req.user!.id, date: { startsWith: periodMonth } } }),
    prisma.leaveRequest.findMany({
      where: { userId: req.user!.id, status: 'APPROVED', fromDate: { startsWith: periodMonth } },
    }),
  ]);

  const lateDays = records
    .filter((r) => r.lateMinutes > 0)
    .map((r) => ({ date: r.date, lateMinutes: r.lateMinutes }));
  const lm = lateModel(lateDays, req.user!.basicSalary);

  res.json({
    periodMonth,
    presentCount: records.filter((r) => r.checkInAt).length,
    lateCount: lm.count,
    onLeaveCount: approvedLeave.reduce((sum, r) => sum + r.workingDays, 0),
    punctuality: { warned: lm.warned, deducting: lm.deducting, half: lm.half, total: lm.total, count: lm.count },
    lateRows: lm.rows,
  });
});
