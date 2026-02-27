/*
  Warnings:

  - You are about to drop the column `currency` on the `LedgerEntry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tid]` on the table `LedgerEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."LedgerEntry_currency_idx";

-- AlterTable
ALTER TABLE "public"."LedgerEntry" DROP COLUMN "currency",
ADD COLUMN     "tid" TEXT;

-- CreateTable
CREATE TABLE "public"."Course" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "countLesson" INTEGER NOT NULL DEFAULT 0,
    "countLikes" INTEGER NOT NULL DEFAULT 0,
    "countViews" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CourseSection" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "countLessons" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lesson" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "videoUrl" TEXT,
    "content" TEXT,
    "countLikes" INTEGER NOT NULL DEFAULT 0,
    "countViews" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'opened',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "images" TEXT[],
    "unread" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProviderCurrency" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "isCrypto" BOOLEAN NOT NULL DEFAULT false,
    "disclaimer" TEXT,

    CONSTRAINT "ProviderCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SoftgamingWebhookLog" (
    "id" TEXT NOT NULL,
    "requestBody" JSONB NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SoftgamingWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Deposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "rewardsBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rewardsPending" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rewardsGenerated" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "rewardsWithdrawed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "nextReward" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL,
    "total" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "walletUsdt" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "depositId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfitDetail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfitDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NodePayment" (
    "id" TEXT NOT NULL,
    "address" TEXT,
    "amount" DECIMAL(18,2),
    "paymentStatus" TEXT,
    "processStatus" TEXT,
    "expiresAt" TIMESTAMP(3),
    "qrcodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LostProfit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originUserId" TEXT,
    "userName" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LostProfit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OTP" (
    "id" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_CountryToGameProvider" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CountryToGameProvider_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "public"."SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "public"."SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "ProviderCurrency_currencyCode_idx" ON "public"."ProviderCurrency"("currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCurrency_providerId_currencyCode_key" ON "public"."ProviderCurrency"("providerId", "currencyCode");

-- CreateIndex
CREATE INDEX "Deposit_userId_idx" ON "public"."Deposit"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "public"."WithdrawalRequest"("userId");

-- CreateIndex
CREATE INDEX "ProfitDetail_userId_idx" ON "public"."ProfitDetail"("userId");

-- CreateIndex
CREATE INDEX "LostProfit_userId_idx" ON "public"."LostProfit"("userId");

-- CreateIndex
CREATE INDEX "_CountryToGameProvider_B_index" ON "public"."_CountryToGameProvider"("B");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_tid_key" ON "public"."LedgerEntry"("tid");

-- CreateIndex
CREATE INDEX "LedgerEntry_idempotencyKey_idx" ON "public"."LedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_tid_idx" ON "public"."LedgerEntry"("tid");

-- AddForeignKey
ALTER TABLE "public"."Course" ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CourseSection" ADD CONSTRAINT "CourseSection_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."CourseSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProviderCurrency" ADD CONSTRAINT "ProviderCurrency_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."GameProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Deposit" ADD CONSTRAINT "Deposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfitDetail" ADD CONSTRAINT "ProfitDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LostProfit" ADD CONSTRAINT "LostProfit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LostProfit" ADD CONSTRAINT "LostProfit_originUserId_fkey" FOREIGN KEY ("originUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CountryToGameProvider" ADD CONSTRAINT "_CountryToGameProvider_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CountryToGameProvider" ADD CONSTRAINT "_CountryToGameProvider_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."GameProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
