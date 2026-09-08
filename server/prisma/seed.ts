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
  },
  {
    email: 'phetsamone@familystudio.la', employeeCode: '0201', initials: 'PV', role: 'EMPLOYEE' as const,
    nameEn: 'Phetsamone Vilay', nameLo: 'ເພັດສະໝອນ ວິໄລ',
    roleTitleEn: 'Photographer', roleTitleLo: 'ຊ່າງພາບ',
    basicSalary: 3_800_000, otAmount: 240_000, allowance: 300_000, managerCode: '0142',
  },
  {
    email: 'noy@familystudio.la', employeeCode: '0202', initials: 'NC', role: 'EMPLOYEE' as const,
    nameEn: 'Noy Chanthavong', nameLo: 'ນ້ອຍ ຈັນທະວົງ',
    roleTitleEn: 'Retoucher', roleTitleLo: 'ຊ່າງແກ້ໄຂພາບ',
    basicSalary: 3_200_000, otAmount: 160_000, allowance: 200_000, managerCode: '0142',
  },
  {
    email: 'khamla@familystudio.la', employeeCode: '0203', initials: 'KS', role: 'EMPLOYEE' as const,
    nameEn: 'Khamla Sisouk', nameLo: 'ຄຳລ້າ ສີສຸກ',
    roleTitleEn: 'Front desk', roleTitleLo: 'ພະນັກງານຕ້ອນຮັບ',
    basicSalary: 2_600_000, otAmount: 80_000, allowance: 150_000, managerCode: '0142',
  },
  {
    email: 'thongdy@familystudio.la', employeeCode: '0204', initials: 'TL', role: 'EMPLOYEE' as const,
    nameEn: 'Thongdy Latsamy', nameLo: 'ທອງດີ ລັດສະໝີ',
    roleTitleEn: 'Assistant', roleTitleLo: 'ຜູ້ຊ່ວຍ',
    basicSalary: 2_400_000, otAmount: 120_000, allowance: 100_000, managerCode: '0142',
  },
  {
    email: 'manivone@familystudio.la', employeeCode: '0147', initials: 'MV', role: 'HR' as const,
    nameEn: 'Manivone Douangdy', nameLo: 'ມະນີວອນ ດວງດີ',
    roleTitleEn: 'Accounts', roleTitleLo: 'ບັນຊີ',
    basicSalary: 3_000_000, otAmount: 0, allowance: 250_000,
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
  await prisma.attendanceRecord.deleteMany();
  await prisma.user.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.office.deleteMany();

  await prisma.office.create({
    data: {
      name: 'Family Studio',
      addressEn: 'Ban Phonthan, Saysettha, Vientiane',
      addressLo: 'ບ້ານໂພນທັນ, ເມືອງໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
      lat: 17.9757,
      lng: 102.6331,
      radiusM: 10,
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
