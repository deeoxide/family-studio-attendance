import type { Prisma, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isAdminOrHR } from '../lib/scope';

type Actor = Pick<User, 'id' | 'role'>;

/**
 * The employees a manager / HR / Admin acts on in a list view:
 *  - MANAGER      → their direct reports
 *  - HR / ADMIN   → all staff
 * ADMIN accounts are always excluded — they're superusers, not names on a roll
 * call / approvals queue / directory (B4). One place so every list agrees.
 */
function teamWhere(actor: Actor): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { role: { not: 'ADMIN' } };
  return isAdminOrHR(actor) ? base : { ...base, managerId: actor.id };
}

export function scopedTeam(actor: Actor, orderBy?: Prisma.UserFindManyArgs['orderBy']) {
  return prisma.user.findMany({ where: teamWhere(actor), orderBy });
}

export async function scopedTeamIds(actor: Actor): Promise<string[]> {
  const rows = await prisma.user.findMany({ where: teamWhere(actor), select: { id: true } });
  return rows.map((r) => r.id);
}
