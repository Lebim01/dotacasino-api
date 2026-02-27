ALTER TABLE "public"."LedgerEntry"
ADD COLUMN "currency" "public"."Currency" NOT NULL DEFAULT 'USD';

UPDATE "public"."LedgerEntry" le
SET "currency" = w."currency"
FROM "public"."Wallet" w
WHERE w."id" = le."walletId";

CREATE INDEX "LedgerEntry_currency_idx" ON "public"."LedgerEntry"("currency");
