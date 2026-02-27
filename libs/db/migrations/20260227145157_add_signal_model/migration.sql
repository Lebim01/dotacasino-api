-- CreateTable
CREATE TABLE "public"."Signal" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "type" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);
