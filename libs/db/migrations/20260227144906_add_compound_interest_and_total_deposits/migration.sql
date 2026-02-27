-- AlterTable
ALTER TABLE "public"."Deposit" ADD COLUMN     "compoundInterest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "compoundInterest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalDeposits" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."SystemReport" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "SystemReport_pkey" PRIMARY KEY ("id")
);
