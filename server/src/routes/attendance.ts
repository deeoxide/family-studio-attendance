import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { distanceMeters } from '../lib/geofence';
import { lateMinutesFor, netWorkedMinutes } from '../lib/shift';
import { lateModel } from '../lib/lateDeduction';
import { todayISO, currentPeriodMonth } from '../lib/period';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

const coordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

async function getOfficeOrThrow() {
  const office = await prisma.office.findFirst();
  if (!office) throw new Error('No office configured');
  return office;
}

attendanceRouter.get('/office', async (_req, res) => {
  res.json({ office: await getOfficeOrThrow() });
});

attendanceRouter.get('/today', async (req, res) => {
  const record = await prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId: req.user!.id, date: todayISO() } },
  });
  res.json({ record, date: todayISO() });
});

attendanceRouter.post('/check-in', async (req, res) => {
  const parsed = coordsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'lat/lng required' });

  const office = await getOfficeOrThrow();
  const distance = distanceMeters(office.lat, office.lng, parsed.data.lat, parsed.data.lng);
  if (distance > office.radiusM) {
    return res.status(422).json({ error: 'Outside the check-in radius', distance });
  }

  const date = todayISO();
  const existing = await prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId: req.user!.id, date } },
  });
  if (existing?.checkInAt) {
    return res.status(409).json({ error: 'Already checked in today', record: existing });
  }

  const now = new Date();
  const lateMinutes = lateMinutesFor(now, { graceEndMin: office.graceEndMin, lunchMinutes: 0 });
  const record = await prisma.attendanceRecord.upsert({
    where: { userId_date: { userId: req.user!.id, date } },
    create: { userId: req.user!.id, date, checkInAt: now, checkInDistanceM: distance, lateMinutes },
    update: { checkInAt: now, checkInDistanceM: distance, lateMinutes },
  });
  res.json({ record, distance });
});

attendanceRouter.post('/check-out', async (req, res) => {
  const parsed = coordsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'lat/lng required' });

  const office = await getOfficeOrThrow();
  const distance = distanceMeters(office.lat, office.lng, parsed.data.lat, parsed.data.lng);
  if (distance > office.radiusM) {
    return res.status(422).json({ error: 'Outside the check-out radius', distance });
  }

  const date = todayISO();
  const existing = await prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId: req.user!.id, date } },
  });
  if (!existing?.checkInAt) return res.status(409).json({ error: 'Not checked in yet' });
  if (existing.checkOutAt) return res.status(409).json({ error: 'Already checked out today', record: existing });

  const now = new Date();
  const record = await prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: { checkOutAt: now, checkOutDistanceM: distance },
  });
  res.json({
    record,
    distance,
    netWorkedMinutes: netWorkedMinutes(existing.checkInAt, now, { graceEndMin: office.graceEndMin, lunchMinutes: 90 }),
  });
});

attendanceRouter.get('/history', async (req, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 10);
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: req.user!.id, date: { lt: todayISO() } },
    orderBy: { date: 'desc' },
    take: limit,
  });
  res.json({ records });
});

/** This month's punctuality summary + late-deduction breakdown for the signed-in employee. */
attendanceRouter.get('/summary', async (req, res) => {
  const periodMonth = currentPeriodMonth();
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: req.user!.id, date: { startsWith: periodMonth } },
  });
  const approvedLeave = await prisma.leaveRequest.findMany({
    where: { userId: req.user!.id, status: 'APPROVED', fromDate: { startsWith: periodMonth } },
  });

  const lateDays = records.filter((r) => r.lateMinutes > 0).map((r) => ({ date: r.date, lateMinutes: r.lateMinutes }));
  const lm = lateModel(lateDays, req.user!.basicSalary);

  res.json({
    periodMonth,
    presentCount: records.filter((r) => r.checkInAt).length,
    lateCount: lm.count,
    onLeaveCount: approvedLeave.reduce((sum, r) => sum + r.workingDays, 0),
    punctuality: {
      warned: lm.warned,
      deducting: lm.deducting,
      half: lm.half,
      total: lm.total,
      count: lm.count,
    },
    lateRows: lm.rows,
  });
});

/** Roll call — today's status. Managers see their direct reports; HR/ADMIN see all staff. */
attendanceRouter.get('/team-today', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const reports =
    req.user!.role === 'MANAGER'
      ? await prisma.user.findMany({ where: { managerId: req.user!.id } })
      : await prisma.user.findMany({ where: { role: { not: 'ADMIN' } }, orderBy: { nameEn: 'asc' } });
  const date = todayISO();
  const records = await prisma.attendanceRecord.findMany({
    where: { userId: { in: reports.map((r) => r.id) }, date },
  });
  const onLeaveToday = await prisma.leaveRequest.findMany({
    where: { userId: { in: reports.map((r) => r.id) }, status: 'APPROVED', fromDate: { lte: date }, toDate: { gte: date } },
  });
  const byUser = new Map(records.map((r) => [r.userId, r]));
  const leaveByUser = new Set(onLeaveToday.map((r) => r.userId));

  res.json({
    date,
    team: reports.map((u) => {
      const rec = byUser.get(u.id);
      const onLeave = leaveByUser.has(u.id);
      return {
        user: { id: u.id, nameEn: u.nameEn, nameLo: u.nameLo, initials: u.initials },
        onLeave,
        checkInAt: rec?.checkInAt ?? null,
        checkOutAt: rec?.checkOutAt ?? null,
        lateMinutes: rec?.lateMinutes ?? 0,
        distance: rec?.checkInDistanceM ?? null,
      };
    }),
  });
});
