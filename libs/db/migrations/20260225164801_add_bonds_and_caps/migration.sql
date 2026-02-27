-- AlterTable
ALTER TABLE "public"."ProfitDetail" ADD COLUMN     "originUserId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "bondCasino" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bondResidual" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "membershipCapCurrent" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "membershipCapLimit" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "membershipExpiresAt" TIMESTAMP(3),
ADD COLUMN     "profits" DECIMAL(18,2) NOT NULL DEFAULT 0;
