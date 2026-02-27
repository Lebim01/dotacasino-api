-- CreateTable
CREATE TABLE "public"."IpnLog" (
    "id" TEXT NOT NULL,
    "txnId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IpnLog_pkey" PRIMARY KEY ("id")
);
