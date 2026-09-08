import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import type { User } from '@prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  try {
    const payload = verifyToken(header.slice('Bearer '.length));
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // ADMIN is a superuser and clears every role gate.
    if (!req.user || (req.user.role !== 'ADMIN' && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden for this role' });
    }
    next();
  };
}
