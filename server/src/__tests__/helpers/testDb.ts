import { execSync } from 'node:child_process';
import path from 'node:path';

const serverRoot = path.resolve(__dirname, '../../..');

/**
 * Rebuild the throwaway test schema from scratch and seed it.
 *
 * `DATABASE_URL` is already pointed at the isolated `test` Postgres schema by
 * vitest.config.ts, so the Prisma CLI and the seed script both write there,
 * never to the dev database's schema. `--force-reset` drops everything in
 * that schema first, so every run starts from the same known fixture (see
 * prisma/seed.ts).
 */
export function provisionTestDb() {
  const url = process.env.DATABASE_URL ?? '';
  // Hard stop: never let --force-reset run against anything but the dedicated
  // test schema vitest.config.ts points us at.
  if (!/[?&]schema=test(&|$)/.test(url)) {
    throw new Error(`refusing to provision: DATABASE_URL is not the isolated test schema (${url || 'unset'})`);
  }

  const env = { ...process.env, DATABASE_URL: url };
  const run = (cmd: string) => execSync(cmd, { cwd: serverRoot, stdio: 'pipe', env });

  run('npx prisma db push --force-reset --skip-generate --accept-data-loss');
  run('npx tsx prisma/seed.ts');
}
