import { PrismaClient } from '@prisma/client';

// Single shared client for the whole process — one PrismaClient = one
// connection pool against Supabase's pooler. Never `new PrismaClient()`
// per-request (exhausts the pooler's connection slots fast) and never store
// one on `req`/a per-request object (leaks a pool per request).
//
// Cached on `globalThis` so `tsx watch`'s hot-reload (dev only) reuses the
// same client instead of opening a fresh pool on every file save — in
// production (plain `node dist/index.js`) this is just module-level caching,
// identical to `export const prisma = new PrismaClient()`.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;
