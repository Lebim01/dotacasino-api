-- CreateTable
CREATE TABLE "public"."Topup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" "public"."Currency" NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'SUCCEEDED',
    "provider" TEXT NOT NULL DEFAULT 'DIRECT',
    "providerRef" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Topup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Topup_idempotencyKey_key" ON "public"."Topup"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Topup_userId_idx" ON "public"."Topup"("userId");

-- AddForeignKey
ALTER TABLE "public"."Topup" ADD CONSTRAINT "Topup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
