/*
  Warnings:

  - A unique constraint covering the columns `[fromCDMX]` on the table `CasinoWeeklyReport` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[toCDMX]` on the table `CasinoWeeklyReport` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CasinoWeeklyReport_fromCDMX_key" ON "public"."CasinoWeeklyReport"("fromCDMX");

-- CreateIndex
CREATE UNIQUE INDEX "CasinoWeeklyReport_toCDMX_key" ON "public"."CasinoWeeklyReport"("toCDMX");
