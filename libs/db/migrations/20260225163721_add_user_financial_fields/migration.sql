-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "bondBinary" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bondDirect" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bondRank" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "bondRewards" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "membershipLimitDeposits" DECIMAL(18,2),
ADD COLUMN     "membershipStatus" TEXT DEFAULT 'active',
ADD COLUMN     "walletUsdt" TEXT;
