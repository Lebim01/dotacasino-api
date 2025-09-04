/*
  Warnings:

  - Added the required column `betId` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Game" ADD COLUMN     "betId" TEXT NOT NULL;
