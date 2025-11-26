-- AlterTable
ALTER TABLE "public"."BetSession" ALTER COLUMN "hall" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."BetTicket" ALTER COLUMN "hall" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."Server" ALTER COLUMN "country" DROP DEFAULT;
