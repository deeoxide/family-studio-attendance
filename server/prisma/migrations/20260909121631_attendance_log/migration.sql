-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "distanceM" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceLog_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AttendanceLog_userId_createdAt_idx" ON "AttendanceLog"("userId", "createdAt");
