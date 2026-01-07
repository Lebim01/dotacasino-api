/*
  Warnings:

  - Added the required column `metadata` to the `SoftGamingRecords` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."SoftGamingRecords" ADD COLUMN     "metadata" JSONB NOT NULL;
