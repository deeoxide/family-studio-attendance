-- CreateTable
CREATE TABLE "JobOrder" (
    "id" TEXT NOT NULL,
    "jobOrderNo" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientCode" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "openDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closeDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobOrder_jobOrderNo_key" ON "JobOrder"("jobOrderNo");

-- CreateIndex
CREATE INDEX "JobOrder_userId_openDate_idx" ON "JobOrder"("userId", "openDate");

-- AddForeignKey
ALTER TABLE "JobOrder" ADD CONSTRAINT "JobOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
