import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { computePay } from '../src/lib/payroll';
import { workingDaysBetween } from '../src/lib/leave';

type LeaveType = 'ANNUAL' | 'SICK' | 'PERSONAL';
type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const prisma = new PrismaClient();

const HOLIDAYS_2026 = [
  { date: '2026-01-01', nameEn: "International New Year's Day", nameLo: 'ວັນປີໃໝ່ສາກົນ', noteEn: 'Thursday', noteLo: 'ວັນພະຫັດ', days: 1 },
  { date: '2026-03-08', nameEn: "International Women's Day", nameLo: 'ວັນແມ່ຍິງສາກົນ', noteEn: 'Sunday · women employees', noteLo: 'ວັນອາທິດ · ພະນັກງານຍິງ', days: 1 },
  { date: '2026-04-14', nameEn: 'Lao New Year (Pi Mai Lao)', nameLo: 'ບຸນປີໃໝ່ລາວ', noteEn: 'Tuesday to Thursday', noteLo: 'ວັນອັງຄານ ຫາ ວັນພະຫັດ', days: 3 },
  { date: '2026-04-15', nameEn: 'Lao New Year (Pi Mai Lao)', nameLo: 'ບຸນປີໃໝ່ລາວ', noteEn: 'Tuesday to Thursday', noteLo: 'ວັນອັງຄານ ຫາ ວັນພະຫັດ', days: 3 },
  { date: '2026-04-16', nameEn: 'Lao New Year (Pi Mai Lao)', nameLo: 'ບຸນປີໃໝ່ລາວ', noteEn: 'Tuesday to Thursday', noteLo: 'ວັນອັງຄານ ຫາ ວັນພະຫັດ', days: 3 },
  { date: '2026-05-01', nameEn: 'International Labour Day', nameLo: 'ວັນກຳມະກອນສາກົນ', noteEn: 'Friday', noteLo: 'ວັນສຸກ', days: 1 },
  { date: '2026-12-02', nameEn: 'Lao National Day', nameLo: 'ວັນຊາດລາວ', noteEn: 'Wednesday', noteLo: 'ວັນພຸດ', days: 1 },
];

const STAFF = [
  {
    email: 'somchai@familystudio.la', employeeCode: '0142', initials: 'SK', role: 'MANAGER' as const,
    nameEn: 'Somchai Keomany', nameLo: 'ສົມໄຊ ແກ້ວມະນີ',
    roleTitleEn: 'Studio manager', roleTitleLo: 'ຜູ້ຈັດການສະຕູດິໂອ',
    basicSalary: 4_500_000, otAmount: 320_000, allowance: 500_000,
    phone: '020 5511 2233', address: 'Ban Nongbone, Saysettha, Vientiane',
    dateOfBirth: '1988-02-17', startDate: '2019-03-01', nationalId: '1-88-0217-00042', bankAccount: 'BCEL 040-12-00-01234567-001',
  },
  {
    email: 'phetsamone@familystudio.la', employeeCode: '0201', initials: 'PV', role: 'EMPLOYEE' as const,
    nameEn: 'Phetsamone Vilay', nameLo: 'ເພັດສະໝອນ ວິໄລ',
    roleTitleEn: 'Photographer', roleTitleLo: 'ຊ່າງພາບ',
    basicSalary: 3_800_000, otAmount: 240_000, allowance: 300_000, managerCode: '0142',
    phone: '020 7722 8899', address: 'Ban Phonsavanh, Sisattanak, Vientiane',
    dateOfBirth: '1994-09-05', startDate: '2021-06-14', nationalId: '1-94-0905-00318', bankAccount: 'BCEL 040-12-00-07654321-001',
  },
  {
    email: 'noy@familystudio.la', employeeCode: '0202', initials: 'NC', role: 'EMPLOYEE' as const,
    nameEn: 'Noy Chanthavong', nameLo: 'ນ້ອຍ ຈັນທະວົງ',
    roleTitleEn: 'Retoucher', roleTitleLo: 'ຊ່າງແກ້ໄຂພາບ',
    basicSalary: 3_200_000, otAmount: 160_000, allowance: 200_000, managerCode: '0142',
    phone: '020 9933 4455', address: 'Ban Dongpalane, Sisattanak, Vientiane',
    dateOfBirth: '1996-11-22', startDate: '2022-01-10', nationalId: '1-96-1122-00577', bankAccount: 'JDB 010-20-00-00223344-002',
  },
  {
    email: 'khamla@familystudio.la', employeeCode: '0203', initials: 'KS', role: 'EMPLOYEE' as const,
    nameEn: 'Khamla Sisouk', nameLo: 'ຄຳລ້າ ສີສຸກ',
    roleTitleEn: 'Front desk', roleTitleLo: 'ພະນັກງານຕ້ອນຮັບ',
    basicSalary: 2_600_000, otAmount: 80_000, allowance: 150_000, managerCode: '0142',
    phone: '020 2244 6677', address: 'Ban Thatluang, Xaysettha, Vientiane',
    dateOfBirth: '1999-04-30', startDate: '2023-02-20', nationalId: '1-99-0430-00812', bankAccount: 'BCEL 040-12-00-09112233-001',
  },
  {
    email: 'thongdy@familystudio.la', employeeCode: '0204', initials: 'TL', role: 'EMPLOYEE' as const,
    nameEn: 'Thongdy Latsamy', nameLo: 'ທອງດີ ລັດສະໝີ',
    roleTitleEn: 'Assistant', roleTitleLo: 'ຜູ້ຊ່ວຍ',
    basicSalary: 2_400_000, otAmount: 120_000, allowance: 100_000, managerCode: '0142',
    phone: '020 5566 7788', address: 'Ban Sokpaluang, Sisattanak, Vientiane',
    dateOfBirth: '2000-07-08', startDate: '2024-05-06', nationalId: '1-00-0708-01099', bankAccount: 'JDB 010-20-00-00445566-002',
  },
  {
    email: 'manivone@familystudio.la', employeeCode: '0147', initials: 'MV', role: 'HR' as const,
    nameEn: 'Manivone Douangdy', nameLo: 'ມະນີວອນ ດວງດີ',
    roleTitleEn: 'Accounts', roleTitleLo: 'ບັນຊີ',
    basicSalary: 3_000_000, otAmount: 0, allowance: 250_000,
    phone: '020 7788 1122', address: 'Ban Haysok, Chanthabouly, Vientiane',
    dateOfBirth: '1990-12-01', startDate: '2020-08-17', nationalId: '1-90-1201-00203', bankAccount: 'BCEL 040-12-00-05566778-001',
  },
];

const DEMO_PASSWORD = 'familystudio';
const CLOSED_PERIODS = ['2026-06', '2026-07', '2026-08'];
const OPEN_PERIOD = '2026-09';

async function main() {
  console.log('Seeding…');

  await prisma.payslip.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.attendanceCorrection.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.office.deleteMany();

  await prisma.office.create({
    data: {
      name: 'Family Studio',
      addressEn: 'Ban Phonthan, Saysettha, Vientiane',
      addressLo: 'ບ້ານໂພນທັນ, ເມືອງໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
      lat: 17.9890155,
      lng: 102.6368713,
      radiusM: 25, // ~17 m from the XJQP+GPX pin + room for GPS drift
      shiftStartMin: 9 * 60,
      graceEndMin: 9 * 60 + 30,
      shiftEndMin: 18 * 60,
      lunchStartMin: 12 * 60,
      lunchEndMin: 13 * 60 + 30,
      workDays: '1,2,3,4,5',
    },
  });

  await prisma.holiday.createMany({ data: HOLIDAYS_2026 });
  const holidayISO = HOLIDAYS_2026.map((h) => h.date);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const byCode: Record<string, string> = {};
  for (const s of STAFF) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        employeeCode: s.employeeCode,
        nameEn: s.nameEn,
        nameLo: s.nameLo,
        roleTitleEn: s.roleTitleEn,
        roleTitleLo: s.roleTitleLo,
        initials: s.initials,
        role: s.role,
        basicSalary: s.basicSalary,
        otAmount: s.otAmount,
        allowance: s.allowance,
        phone: s.phone,
        address: s.address,
        dateOfBirth: s.dateOfBirth,
        startDate: s.startDate,
        nationalId: s.nationalId,
        bankAccount: s.bankAccount,
      },
    });
    byCode[s.employeeCode] = user.id;
  }
  for (const s of STAFF) {
    if ('managerCode' in s && s.managerCode) {
      await prisma.user.update({
        where: { id: byCode[s.employeeCode] },
        data: { managerId: byCode[s.managerCode] },
      });
    }
  }

  // System administrator — the studio owner's account. Superuser role: every
  // screen plus staff registration. Seeded with the demo password; change it
  // from Profile after first sign-in.
  const admin = await prisma.user.create({
    data: {
      email: 'deexaypanya0@gmail.com',
      passwordHash,
      employeeCode: '0001',
      nameEn: 'Deexaypanya',
      nameLo: 'Deexaypanya', // TODO: replace with the Lao spelling once confirmed
      roleTitleEn: 'Administrator',
      roleTitleLo: 'ຜູ້ຄຸ້ມຄອງລະບົບ',
      initials: 'DX',
      role: 'ADMIN',
      basicSalary: 0,
      otAmount: 0,
      allowance: 0,
      startDate: '2019-01-01',
    },
  });
  await prisma.leaveBalance.createMany({
    data: [
      { userId: admin.id, leaveType: 'ANNUAL', year: 2026, totalDays: 15 },
      { userId: admin.id, leaveType: 'SICK', year: 2026, totalDays: 30 },
      { userId: admin.id, leaveType: 'PERSONAL', year: 2026, totalDays: 5 },
    ],
  });

  // Leave balances — Labour Law annual 15 + sick 30, studio policy personal 5.
  for (const code of Object.keys(byCode)) {
    await prisma.leaveBalance.createMany({
      data: [
        { userId: byCode[code], leaveType: 'ANNUAL', year: 2026, totalDays: 15 },
        { userId: byCode[code], leaveType: 'SICK', year: 2026, totalDays: 30 },
        { userId: byCode[code], leaveType: 'PERSONAL', year: 2026, totalDays: 5 },
      ],
    });
  }

  // Demo leave history for the primary employee login (Phetsamone).
  const pv = byCode['0201'];
  const leaveSeed: Array<{
    userId: string; leaveType: LeaveType; from: string; to: string;
    reason: string; status: LeaveStatus; deciderCode?: string;
  }> = [
    { userId: pv, leaveType: 'ANNUAL', from: '2026-07-13', to: '2026-07-14', reason: 'Family trip to Luang Prabang', status: 'APPROVED', deciderCode: '0142' },
    { userId: pv, leaveType: 'ANNUAL', from: '2026-03-02', to: '2026-03-05', reason: 'Home village visit', status: 'APPROVED', deciderCode: '0142' },
    { userId: pv, leaveType: 'SICK', from: '2026-06-02', to: '2026-06-02', reason: 'Clinic certificate attached', status: 'APPROVED', deciderCode: '0142' },
    { userId: pv, leaveType: 'PERSONAL', from: '2026-04-20', to: '2026-04-20', reason: 'Overlapped with a wedding shoot', status: 'REJECTED', deciderCode: '0142' },
    // Pending, waiting on the manager — shows up in Somchai's Approvals queue.
    { userId: byCode['0203'], leaveType: 'ANNUAL', from: '2026-09-28', to: '2026-09-30', reason: "Sister's wedding in Pakse", status: 'PENDING' },
    { userId: byCode['0202'], leaveType: 'SICK', from: '2026-09-09', to: '2026-09-09', reason: 'Dentist appointment', status: 'PENDING' },
  ];
  for (const l of leaveSeed) {
    const wd = workingDaysBetween(l.from, l.to, holidayISO);
    await prisma.leaveRequest.create({
      data: {
        userId: l.userId,
        leaveType: l.leaveType,
        fromDate: l.from,
        toDate: l.to,
        workingDays: wd?.days ?? 0,
        reason: l.reason,
        status: l.status,
        decidedById: l.deciderCode ? byCode[l.deciderCode] : null,
        decidedAt: l.deciderCode ? new Date() : null,
      },
    });
  }

  // A week of real attendance history for Phetsamone (1–7 Sep 2026), one late day.
  const attendanceSeed = [
    { date: '2026-09-01', inH: 8, inM: 55, outH: 18, outM: 2 },
    { date: '2026-09-02', inH: 9, inM: 47, outH: 18, outM: 6 }, // late, +17m
    { date: '2026-09-03', inH: 8, inM: 58, outH: 18, outM: 0 },
    { date: '2026-09-04', inH: 9, inM: 42, outH: 18, outM: 2 }, // late, +12m
    { date: '2026-09-07', inH: 8, inM: 56, outH: 18, outM: 4 },
  ];
  const GRACE = 9 * 60 + 30;
  // Vientiane is UTC+7 with no DST, so a wall-clock H:M there is (H-7):M in UTC.
  const vientianeToUTC = (y: number, m: number, d: number, h: number, min: number) =>
    new Date(Date.UTC(y, m - 1, d, h - 7, min));
  for (const a of attendanceSeed) {
    const [y, m, d] = a.date.split('-').map(Number);
    const checkInAt = vientianeToUTC(y, m, d, a.inH, a.inM);
    const checkOutAt = vientianeToUTC(y, m, d, a.outH, a.outM);
    const lateMinutes = Math.max(0, a.inH * 60 + a.inM - GRACE);
    await prisma.attendanceRecord.create({
      data: {
        userId: pv,
        date: a.date,
        checkInAt,
        checkOutAt,
        checkInDistanceM: 4 + Math.round(Math.random() * 3),
        checkOutDistanceM: 3 + Math.round(Math.random() * 3),
        lateMinutes,
      },
    });
  }

  // Closed payslips (Jun–Aug 2026) for everyone, no late deductions on record.
  for (const period of CLOSED_PERIODS) {
    for (const code of Object.keys(byCode)) {
      const s = STAFF.find((x) => x.employeeCode === code)!;
      const pay = computePay({ basic: s.basicSalary, ot: s.otAmount, allowance: s.allowance });
      await prisma.payslip.create({
        data: {
          userId: byCode[code],
          periodMonth: period,
          basic: pay.basic, ot: pay.ot, allowance: pay.allowance, gross: pay.gross,
          sso: pay.sso, tax: pay.tax, lateDeduction: 0, net: pay.net, half: false,
          status: 'PAID',
          paidAt: new Date(`${period}-29T00:00:00`),
        },
      });
    }
  }

  // Current open period (Sep 2026) — basic/ot/allowance staged, figures finalise on payroll run.
  for (const code of Object.keys(byCode)) {
    const s = STAFF.find((x) => x.employeeCode === code)!;
    const pay = computePay({ basic: s.basicSalary, ot: s.otAmount, allowance: s.allowance });
    await prisma.payslip.create({
      data: {
        userId: byCode[code],
        periodMonth: OPEN_PERIOD,
        basic: pay.basic, ot: pay.ot, allowance: pay.allowance, gross: pay.gross,
        sso: pay.sso, tax: pay.tax, lateDeduction: 0, net: pay.net, half: false,
        status: 'OPEN',
      },
    });
  }

  console.log('Seeded. Demo login password for every account:', DEMO_PASSWORD);
  console.log(` - deexaypanya0@gmail.com  (ADMIN)`);
  for (const s of STAFF) console.log(` - ${s.email}  (${s.role})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
