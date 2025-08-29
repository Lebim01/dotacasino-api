-- CreateTable
CREATE TABLE "public"."ProviderPostTransfer" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "uniqueKey" TEXT NOT NULL,
    "transactionID" TEXT NOT NULL,
    "billNo" TEXT,
    "transactionType" TEXT NOT NULL,
    "ticketStatus" TEXT,
    "playname" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "netAmount" DECIMAL(65,30),
    "validBetAmount" DECIMAL(65,30),
    "value" DECIMAL(65,30),
    "balanceAfter" DECIMAL(65,30) NOT NULL,
    "responseCode" TEXT NOT NULL,
    "finish" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderPostTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderPostTransfer_uniqueKey_key" ON "public"."ProviderPostTransfer"("uniqueKey");
