-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "stdMexId" TEXT;

-- CreateTable
CREATE TABLE "public"."StdMex" (
    "id" TEXT NOT NULL,
    "clabe" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "instructions" JSONB NOT NULL,

    CONSTRAINT "StdMex_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_stdMexId_fkey" FOREIGN KEY ("stdMexId") REFERENCES "public"."StdMex"("id") ON DELETE SET NULL ON UPDATE CASCADE;
