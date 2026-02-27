-- AlterTable
ALTER TABLE "public"."LedgerEntry" ADD COLUMN     "currency" "public"."Currency";

-- AlterTable
ALTER TABLE "public"."NodePayment" ADD COLUMN     "category" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "userId" TEXT;
