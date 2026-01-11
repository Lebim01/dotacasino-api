-- AlterTable
ALTER TABLE "public"."Game" ADD COLUMN     "LowRtpMobileUrl" TEXT,
ADD COLUMN     "LowRtpMobileUrlExternal" TEXT,
ADD COLUMN     "LowRtpUrl" TEXT,
ADD COLUMN     "LowRtpUrlExternal" TEXT,
ADD COLUMN     "PageCode" TEXT,
ADD COLUMN     "System" TEXT NOT NULL DEFAULT '';
