-- CreateEnum
CREATE TYPE "public"."KycDocType" AS ENUM ('PASSPORT', 'ID_CARD', 'DRIVER_LICENSE', 'ADDRESS_PROOF', 'SELFIE');

-- CreateEnum
CREATE TYPE "public"."KycDocStatus" AS ENUM ('UPLOADED', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."KycDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."KycDocType" NOT NULL,
    "status" "public"."KycDocStatus" NOT NULL DEFAULT 'UPLOADED',
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "country" TEXT,
    "expiresAt" TIMESTAMP(3),
    "checksum" TEXT,
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KycSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentIds" TEXT[],
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "decision" "public"."KycStatus",
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycDocument_userId_type_idx" ON "public"."KycDocument"("userId", "type");

-- CreateIndex
CREATE INDEX "KycSubmission_userId_idx" ON "public"."KycSubmission"("userId");

-- AddForeignKey
ALTER TABLE "public"."KycDocument" ADD CONSTRAINT "KycDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KycSubmission" ADD CONSTRAINT "KycSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
