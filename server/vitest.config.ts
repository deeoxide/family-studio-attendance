import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Integration tests run against their own throwaway SQLite file, never dev.db.
// An absolute path keeps the Prisma CLI (schema-relative) and the Prisma Client
// (cwd-relative) pointing at the same file.
const testDbPath = path.join(__dirname, 'prisma', 'test.db').replace(/\\/g, '/');

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: `file:${testDbPath}`,
      JWT_SECRET: 'test-secret',
    },
    // One shared SQLite file — don't let files race each other.
    fileParallelism: false,
    // Provisioning the test DB (db push + seed) runs in a beforeAll.
    hookTimeout: 120_000,
  },
});
