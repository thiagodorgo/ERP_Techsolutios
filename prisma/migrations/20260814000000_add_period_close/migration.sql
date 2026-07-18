-- Block Ω4-6 (Fechamento de período): colunas ADITIVAS em "financial_period_closes" para
-- reabertura (reopened_*), janela de fechamento (closing_started_at, reservada) e o SNAPSHOT
-- financeiro congelado (JSONB). RLS já habilitada na 20260810000000 (NÃO recriar). Sem default
-- volátil. Todas nullable → aditivo puro sobre tabela possivelmente populada.
--
-- Rollback (ordem reversa):
--   ALTER TABLE "financial_period_closes" DROP COLUMN IF EXISTS "snapshot";
--   ALTER TABLE "financial_period_closes" DROP COLUMN IF EXISTS "closing_started_at";
--   ALTER TABLE "financial_period_closes" DROP COLUMN IF EXISTS "reopen_reason";
--   ALTER TABLE "financial_period_closes" DROP COLUMN IF EXISTS "reopened_by";
--   ALTER TABLE "financial_period_closes" DROP COLUMN IF EXISTS "reopened_at";

ALTER TABLE "financial_period_closes" ADD COLUMN "reopened_at"       TIMESTAMPTZ(6);
ALTER TABLE "financial_period_closes" ADD COLUMN "reopened_by"       UUID;
ALTER TABLE "financial_period_closes" ADD COLUMN "reopen_reason"     TEXT;
ALTER TABLE "financial_period_closes" ADD COLUMN "closing_started_at" TIMESTAMPTZ(6);
ALTER TABLE "financial_period_closes" ADD COLUMN "snapshot"          JSONB;
