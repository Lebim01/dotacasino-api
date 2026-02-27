-- AlterTable
ALTER TABLE "public"."NodePayment" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "network" TEXT;
