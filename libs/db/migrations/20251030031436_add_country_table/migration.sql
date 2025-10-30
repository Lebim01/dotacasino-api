-- CreateTable
CREATE TABLE "public"."Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Country_code_idx" ON "public"."Country"("code");
