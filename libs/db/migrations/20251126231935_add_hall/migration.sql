-- AlterTable
ALTER TABLE "public"."BetSession" ADD COLUMN     "hall" TEXT NOT NULL DEFAULT '3208656';

-- AlterTable
ALTER TABLE "public"."BetTicket" ADD COLUMN     "hall" TEXT NOT NULL DEFAULT '3208656';

-- AlterTable
ALTER TABLE "public"."Server" ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'MX';
