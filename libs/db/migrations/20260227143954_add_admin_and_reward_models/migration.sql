-- CreateTable
CREATE TABLE "public"."Reward" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "year_week" INTEGER NOT NULL,
    "compoundInterest" BOOLEAN NOT NULL DEFAULT false,
    "depositAmount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "targetId" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminRewardPayment" (
    "id" TEXT NOT NULL,
    "percent" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminRewardPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reward_year_year_week_compoundInterest_status_idx" ON "public"."Reward"("year", "year_week", "compoundInterest", "status");

-- CreateIndex
CREATE INDEX "Reward_userId_idx" ON "public"."Reward"("userId");

-- CreateIndex
CREATE INDEX "AdminLog_type_idx" ON "public"."AdminLog"("type");

-- AddForeignKey
ALTER TABLE "public"."Reward" ADD CONSTRAINT "Reward_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "public"."Deposit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reward" ADD CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
