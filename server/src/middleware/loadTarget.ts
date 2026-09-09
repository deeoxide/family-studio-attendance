import type { RequestHandler } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { canManageOther } from '../lib/scope';
import { forbidden, notFound } from '../http/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by loadTarget() — the employee this request acts on. */
      target?: User;
    }
  }
}

/** ADMIN accounts are invisible to everyone but another ADMIN (see scope.ts / B4). */
function adminIsHidden(actor: Pick<User, 'role'>, target: Pick<User, 'role'>): boolean {
  return target.role === 'ADMIN' && actor.role !== 'ADMIN';
}

/**
 * Load the employee named by a route param into `req.target` and enforce that
 * the caller may act on them. Replaces the "findUnique → 404 → canManageOther →
 * 403" block that was copy-pasted across people / leave / attendance routes.
 *
 *  - `mode: 'manage'` (default): caller must manage the target (HR/Admin: anyone,
 *    manager: a direct report). Acting on yourself is not "managing".
 *  - `mode: 'view'`: additionally lets the caller load their own record.
 */
export function loadTarget(param = 'id', mode: 'manage' | 'view' = 'manage'): RequestHandler {
  return async (req, _res, next) => {
    const actor = req.user!;
    const target = await prisma.user.findUnique({ where: { id: req.params[param] } });
    if (!target || adminIsHidden(actor, target)) throw notFound('Employee not found');

    const isSelf = target.id === actor.id;
    const allowed = (mode === 'view' && isSelf) || canManageOther(actor, target);
    if (!allowed) throw forbidden('Not your team member');

    req.target = target;
    next();
  };
}

/** Same scope check for a target that isn't a route param (e.g. a request's owner). */
export function assertCanManage(actor: Pick<User, 'id' | 'role'>, target: Pick<User, 'id' | 'managerId'>): void {
  if (!canManageOther(actor, target)) throw forbidden('Not your team member');
}
