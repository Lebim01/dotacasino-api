/*
  Warnings:

  - Added the required column `primaryColor` to the `Server` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secondaryColor` to the `Server` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Server" ADD COLUMN     "primaryColor" TEXT NOT NULL,
ADD COLUMN     "secondaryColor" TEXT NOT NULL;
