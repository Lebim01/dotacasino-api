-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'ERROR', 'SUCCESS');

-- CreateTable
CREATE TABLE "public"."SoftGamingRecords" (
    "id" TEXT NOT NULL,
    "tid" TEXT NOT NULL,
    "status" "public"."RequestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftGamingRecords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SoftGamingRecords_tid_key" ON "public"."SoftGamingRecords"("tid");
