/**
 * One-off, idempotent: ensure the studio administrator account exists in the
 * current database without wiping anything (unlike `prisma migrate reset`).
 *
 *   npx tsx prisma/addAdmin.ts
 *
 * The same account is also created by seed.ts on a fresh reset.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const EMAIL = 'deexaypanya0@gmail.com';
const PASSWORD = 'familystudio'; // temporary — change from Profile after first sign-in

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    const user = await prisma.user.update({ where: { email: EMAIL }, data: { role: 'ADMIN' } });
    console.log(`Already present — ensured role ADMIN for ${user.email} (code ${user.employeeCode}).`);
    return;
  }
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash,
      employeeCode: '0001',
      nameEn: 'Deexaypanya',
      nameLo: 'Deexaypanya',
      roleTitleEn: 'Administrator',
      roleTitleLo: 'ຜູ້ຄຸ້ມຄອງລະບົບ',
      initials: 'DX',
      role: 'ADMIN',
      basicSalary: 0,
      otAmount: 0,
      allowance: 0,
      leaveBalances: {
        create: [
          { leaveType: 'ANNUAL', year: 2026, totalDays: 15 },
          { leaveType: 'SICK', year: 2026, totalDays: 30 },
          { leaveType: 'PERSONAL', year: 2026, totalDays: 5 },
        ],
      },
    },
  });
  console.log(`Created ADMIN ${user.email} (code ${user.employeeCode}), password "${PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
