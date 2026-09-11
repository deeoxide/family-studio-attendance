import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { scopedTeamIds } from '../middleware/scopedTeam';
import { parse } from '../http/validate';
import { conflict, notFound } from '../http/errors';
import { todayISO } from '../lib/period';
import { buildJobOrderNo, WORK_TYPES, type WorkType } from '../lib/jobOrderNumber';
import { toCsv } from '../lib/csv';

/**
 * Open Job — the studio's work-order tracker.
 *
 *  - EMPLOYEE          → create and track their own job orders
 *  - MANAGER            → view + export their direct reports' job orders
 *  - HR / ADMIN         → view + export everyone's
 *
 * A row is: job order no., name of person, client code, type of work, task,
 * date opened, status, date closed. See lib/jobOrderNumber.ts for the
 * JO<seq><MMYY>-<code> numbering scheme.
 */
export const jobOrdersRouter = Router();
jobOrdersRouter.use(requireAuth);

const STATUSES = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = { OPEN: 'Open', IN_PROGRESS: 'In Progress', CLOSED: 'Closed' };
const WORK_TYPE_LABEL: Record<WorkType, string> = { INTERNAL: 'Studio Internal', EXTERNAL: 'External Production' };

const userSummary = { select: { nameEn: true, nameLo: true, initials: true } } as const;

const createSchema = z.object({
  clientCode: z.string().trim().min(1).max(40),
  workType: z.enum(WORK_TYPES),
  task: z.string().trim().min(1).max(500),
});

/** Log a new job order for the signed-in employee. Open date is always today. */
jobOrdersRouter.post('/', requireRole('EMPLOYEE'), async (req, res) => {
  const { clientCode, workType, task } = parse(createSchema, req.body, 'Invalid job order');
  const openDate = todayISO();
  const monthPrefix = openDate.slice(0, 7); // YYYY-MM

  // The unique constraint on jobOrderNo is the real guard against two job
  // orders in the same month/category landing on the same sequence number; a
  // handful of retries just makes that race invisible to the caller.
  for (let attempt = 0; attempt < 5; attempt++) {
    const existingCount = await prisma.jobOrder.count({
      where: { workType, openDate: { startsWith: monthPrefix } },
    });
    const jobOrderNo = buildJobOrderNo(openDate, workType, existingCount);
    try {
      const jobOrder = await prisma.jobOrder.create({
        data: { jobOrderNo, userId: req.user!.id, clientCode: clientCode.trim(), workType, task: task.trim(), openDate },
      });
      return res.status(201).json({ jobOrder });
    } catch (e: any) {
      if (e?.code === 'P2002') continue; // unique clash on jobOrderNo — retry with a recounted sequence
      throw e;
    }
  }
  throw conflict('Could not assign a job order number, try again');
});

/** The signed-in employee's own job orders. */
jobOrdersRouter.get('/', async (req, res) => {
  const jobOrders = await prisma.jobOrder.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ openDate: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ jobOrders });
});

/** Everyone's job orders the caller may see — Manager: their reports, HR/Admin: all. */
jobOrdersRouter.get('/team', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const jobOrders = await prisma.jobOrder.findMany({
    where: { userId: { in: await scopedTeamIds(req.user!) } },
    orderBy: [{ openDate: 'desc' }, { createdAt: 'desc' }],
    include: { user: userSummary },
  });
  res.json({ jobOrders });
});

/** CSV export of the same scope as /team, for the frequency / statistics tracking. */
jobOrdersRouter.get('/export', requireRole('MANAGER', 'HR', 'ADMIN'), async (req, res) => {
  const jobOrders = await prisma.jobOrder.findMany({
    where: { userId: { in: await scopedTeamIds(req.user!) } },
    orderBy: [{ openDate: 'asc' }, { createdAt: 'asc' }],
    include: { user: userSummary },
  });

  const rows = jobOrders.map((j) => [
    j.jobOrderNo,
    j.user.nameEn,
    j.clientCode,
    WORK_TYPE_LABEL[j.workType as WorkType],
    j.task,
    j.openDate,
    STATUS_LABEL[j.status as Status],
    j.closeDate ?? '',
  ]);
  const csv = toCsv(
    ['Job Order No.', 'Name of Person', 'Client Code', 'Type of Work', 'Task', 'Date of Open Job', 'Status', 'Date of Close Job'],
    rows,
  );

  res.setHeader('content-type', 'text/csv; charset=utf-8');
  res.setHeader('content-disposition', `attachment; filename="job-orders-${todayISO()}.csv"`);
  res.send(csv);
});

const statusSchema = z.object({ status: z.enum(STATUSES) });

/** Advance (or reopen) a job order's status. Owner only. Closing sets today's date; leaving CLOSED clears it. */
jobOrdersRouter.patch('/:id/status', async (req, res) => {
  const { status } = parse(statusSchema, req.body, 'Invalid status');
  const jobOrder = await prisma.jobOrder.findUnique({ where: { id: req.params.id } });
  if (!jobOrder || jobOrder.userId !== req.user!.id) throw notFound('Job order not found');

  const closeDate = status === 'CLOSED' ? (jobOrder.closeDate ?? todayISO()) : null;
  const updated = await prisma.jobOrder.update({ where: { id: jobOrder.id }, data: { status, closeDate } });
  res.json({ jobOrder: updated });
});
