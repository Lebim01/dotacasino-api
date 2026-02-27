-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "activation" TEXT,
ADD COLUMN     "countDirectPeople" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "firstCycleStartedAt" TIMESTAMP(3),
ADD COLUMN     "isBinaryActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "leftBinaryUserId" TEXT,
ADD COLUMN     "leftPoints" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "membershipStartedAt" TIMESTAMP(3),
ADD COLUMN     "monthSalesVolumen" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "parentBinaryUserId" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "rightBinaryUserId" TEXT,
ADD COLUMN     "rightPoints" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."UserCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "txnId" TEXT,
    "isUpgrade" BOOLEAN NOT NULL DEFAULT false,
    "volumen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BinaryPoint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" DECIMAL(18,2) NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'matching',
    "originUserId" TEXT,
    "originName" TEXT,
    "originEmail" TEXT,
    "concept" TEXT,
    "txnId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinaryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCycle_userId_idx" ON "public"."UserCycle"("userId");

-- CreateIndex
CREATE INDEX "BinaryPoint_userId_side_type_idx" ON "public"."BinaryPoint"("userId", "side", "type");

-- AddForeignKey
ALTER TABLE "public"."UserCycle" ADD CONSTRAINT "UserCycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BinaryPoint" ADD CONSTRAINT "BinaryPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
