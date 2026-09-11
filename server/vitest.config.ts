import { defineConfig } from 'vitest/config';
import 'dotenv/config';

// Integration tests run against their own throwaway Postgres schema, never the
// dev database's public schema. They reuse whatever Postgres DATABASE_URL dev
// already points at (same server, same credentials) and just isolate the
// schema, so no second database has to be provisioned to run `npm test`.
function testDatabaseUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL must be set (see .env.example) to run tests');
  const url = new URL(base);
  url.searchParams.set('schema', 'test');
  return url.toString();
}

export default defineConfig({
  test: {
    env: {
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: 'test-secret',
    },
    // One shared schema — don't let files race each other.
    fileParallelism: false,
    // Provisioning the test DB (db push + seed) runs in a beforeAll.
    hookTimeout: 120_000,
  },
});
