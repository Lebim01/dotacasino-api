-- CreateIndex
CREATE INDEX "referral_parent_idx" ON "public"."Referral"("parentId");

-- CreateIndex
CREATE INDEX "referral_user_idx" ON "public"."Referral"("userId");
