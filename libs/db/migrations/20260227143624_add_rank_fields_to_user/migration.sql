-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "maxRank" TEXT DEFAULT 'none',
ADD COLUMN     "rank" TEXT DEFAULT 'none';
