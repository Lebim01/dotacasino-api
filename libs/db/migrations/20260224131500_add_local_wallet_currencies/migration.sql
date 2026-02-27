-- Add local currencies for wallets/topups
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'MXN';
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'ARS';
ALTER TYPE "Currency" ADD VALUE IF NOT EXISTS 'COP';

-- Backfill existing USD wallets to local currency for MX/AR/CO users
WITH wallet_targets AS (
  SELECT
    w."id" AS wallet_id,
    w."userId" AS user_id,
    CASE
      WHEN UPPER(TRIM(u."country")) IN ('MX', 'MEX', 'MEXICO') THEN 'MXN'
      WHEN UPPER(TRIM(u."country")) IN ('AR', 'ARG', 'ARGENTINA') THEN 'ARS'
      WHEN UPPER(TRIM(u."country")) IN ('CO', 'COL', 'COLOMBIA') THEN 'COP'
      ELSE NULL
    END AS target_currency
  FROM "Wallet" w
  INNER JOIN "User" u ON u."id" = w."userId"
  WHERE w."currency" = 'USD'
)
UPDATE "Wallet" w
SET "currency" = wt.target_currency::"Currency"
FROM wallet_targets wt
WHERE w."id" = wt.wallet_id
  AND wt.target_currency IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Wallet" w2
    WHERE w2."userId" = wt.user_id
      AND w2."currency" = wt.target_currency::"Currency"
  );
