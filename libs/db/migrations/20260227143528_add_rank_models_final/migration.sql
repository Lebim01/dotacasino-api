-- CreateTable
CREATE TABLE "public"."RankPromotion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RankHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "leftPoints" DECIMAL(18,2) NOT NULL,
    "rightPoints" DECIMAL(18,2) NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankPromotion_userId_idx" ON "public"."RankPromotion"("userId");

-- CreateIndex
CREATE INDEX "RankHistory_userId_idx" ON "public"."RankHistory"("userId");

-- AddForeignKey
ALTER TABLE "public"."RankPromotion" ADD CONSTRAINT "RankPromotion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RankHistory" ADD CONSTRAINT "RankHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
