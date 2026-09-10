-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payslip" (
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
    "unpaidDeduction" INTEGER NOT NULL DEFAULT 0,
    "net" INTEGER NOT NULL,
    "half" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "paidAt" DATETIME,
    CONSTRAINT "Payslip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Payslip" ("allowance", "basic", "gross", "half", "id", "lateDeduction", "net", "ot", "paidAt", "periodMonth", "sso", "status", "tax", "userId") SELECT "allowance", "basic", "gross", "half", "id", "lateDeduction", "net", "ot", "paidAt", "periodMonth", "sso", "status", "tax", "userId" FROM "Payslip";
DROP TABLE "Payslip";
ALTER TABLE "new_Payslip" RENAME TO "Payslip";
CREATE UNIQUE INDEX "Payslip_userId_periodMonth_key" ON "Payslip"("userId", "periodMonth");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
