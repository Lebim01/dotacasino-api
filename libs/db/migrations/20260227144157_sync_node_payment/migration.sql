-- AlterTable
ALTER TABLE "public"."NodePayment" ADD COLUMN     "isUpgrade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "volumen" BOOLEAN NOT NULL DEFAULT true;
