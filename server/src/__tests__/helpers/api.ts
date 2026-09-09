import supertest from 'supertest';
import { app } from '../../app';

export const api = supertest(app);

/** Seeded demo accounts — password is the same for all of them. */
export const ACCOUNTS = {
  admin: 'deexaypanya0@gmail.com',
  manager: 'somchai@familystudio.la',
  hr: 'manivone@familystudio.la',
  employee: 'phetsamone@familystudio.la', // reports to `manager`
  otherEmployee: 'noy@familystudio.la', //   reports to `manager`
} as const;

export const DEMO_PASSWORD = 'familystudio';

export type Role = keyof typeof ACCOUNTS;

/** Log a seeded account in and return its bearer token. */
export async function tokenFor(role: Role): Promise<string> {
  const res = await api
    .post('/api/auth/login')
    .send({ email: ACCOUNTS[role], password: DEMO_PASSWORD });
  if (res.status !== 200) {
    throw new Error(`login for ${role} failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

/** All the tokens the smoke suite needs, fetched once. */
export async function allTokens() {
  const [admin, manager, hr, employee, otherEmployee] = await Promise.all([
    tokenFor('admin'),
    tokenFor('manager'),
    tokenFor('hr'),
    tokenFor('employee'),
    tokenFor('otherEmployee'),
  ]);
  return { admin, manager, hr, employee, otherEmployee };
}

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** `authed('get', '/api/leave/balance', token)` → a supertest request with the bearer header set. */
export function authed(method: Method, url: string, token: string) {
  return api[method](url).set('Authorization', `Bearer ${token}`);
}
