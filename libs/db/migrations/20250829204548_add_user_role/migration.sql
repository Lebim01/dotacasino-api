-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "roles" TEXT[] DEFAULT ARRAY['user']::TEXT[];
