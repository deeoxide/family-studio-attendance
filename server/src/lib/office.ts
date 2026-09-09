import { prisma } from './prisma';
import { notFound } from '../http/errors';

/** The single office row, or null if the studio hasn't been configured yet. */
export function getOffice() {
  return prisma.office.findFirst();
}

/** The office row, or a 404 — every attendance/geofence/KPI path needs it. */
export async function requireOffice() {
  const office = await getOffice();
  if (!office) throw notFound('No office configured');
  return office;
}
