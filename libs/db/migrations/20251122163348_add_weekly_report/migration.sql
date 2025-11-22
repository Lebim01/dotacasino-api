/*
  Warnings:

  - A unique constraint covering the columns `[betId]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "public"."CasinoWeeklyReport" (
    "id" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "fromCDMX" TIMESTAMP(3) NOT NULL,
    "toCDMX" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CasinoWeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CasinoWeeklyUserDetail" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "totalNeto" DECIMAL(18,2) NOT NULL,
    "totalBonus" DECIMAL(18,2) NOT NULL,
    "detallePorUsuario" JSONB NOT NULL,

    CONSTRAINT "CasinoWeeklyUserDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CasinoWeeklyUserDetail_reportId_idx" ON "public"."CasinoWeeklyUserDetail"("reportId");

-- CreateIndex
CREATE INDEX "CasinoWeeklyUserDetail_userId_idx" ON "public"."CasinoWeeklyUserDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_betId_key" ON "public"."Game"("betId");

-- AddForeignKey
ALTER TABLE "public"."CasinoWeeklyUserDetail" ADD CONSTRAINT "CasinoWeeklyUserDetail_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."CasinoWeeklyReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CasinoWeeklyUserDetail" ADD CONSTRAINT "CasinoWeeklyUserDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
