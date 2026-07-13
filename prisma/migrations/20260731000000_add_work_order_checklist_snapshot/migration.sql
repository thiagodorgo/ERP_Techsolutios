-- Block Ω3-c: coluna aditiva durável do snapshot de checklist congelado no despacho.
-- SOMENTE ADITIVO (ADD COLUMN JSONB nullable) → metadata-only no Postgres: toda OS pré-existente
-- valida sem reescrita de linha, sem lock relevante. work_orders JÁ tem RLS ENABLE+FORCE+policy
-- (20260616000000_add_work_orders) — esta migration NÃO toca RLS/FK/índice.
--
-- Rollback:
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "checklist_snapshot";

ALTER TABLE "work_orders" ADD COLUMN "checklist_snapshot" JSONB;
