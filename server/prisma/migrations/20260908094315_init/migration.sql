-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "addressEn" TEXT NOT NULL,
    "addressLo" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "radiusM" INTEGER NOT NULL DEFAULT 10,
    "shiftStartMin" INTEGER NOT NULL DEFAULT 540,
    "graceEndMin" INTEGER NOT NULL DEFAULT 570,
    "shiftEndMin" INTEGER NOT NULL DEFAULT 1080,
    "lunchStartMin" INTEGER NOT NULL DEFAULT 720,
    "lunchEndMin" INTEGER NOT NULL DEFAULT 810,
    "workDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameLo" TEXT NOT NULL,
    "roleTitleEn" TEXT NOT NULL,
    "roleTitleLo" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "basicSalary" INTEGER NOT NULL,
    "otAmount" INTEGER NOT NULL DEFAULT 0,
    "allowance" INTEGER NOT NULL DEFAULT 0,
    "managerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "checkInAt" DATETIME,
    "checkOutAt" DATETIME,
    "checkInDistanceM" REAL,
    "checkOutDistanceM" REAL,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalDays" INTEGER NOT NULL,
    CONSTRAINT "LeaveBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "fromDate" TEXT NOT NULL,
    "toDate" TEXT NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LeaveRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameLo" TEXT NOT NULL,
    "noteEn" TEXT NOT NULL,
    "noteLo" TEXT NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "basic" INTEGER NOT NULL,
    "ot" INTEGER NOT NULL,
    "allowance" INTEGER NOT NULL,
    "gross" INTEGER NOT NULL,
    "sso" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "lateDeduction" INTEGER NOT NULL DEFAULT 0,
    "net" INTEGER NOT NULL,
    "half" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "paidAt" DATETIME,
    CONSTRAINT "Payslip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_userId_date_key" ON "AttendanceRecord"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_userId_leaveType_year_key" ON "LeaveBalance"("userId", "leaveType", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_userId_periodMonth_key" ON "Payslip"("userId", "periodMonth");
