-- B-O6R-09 (item 7 do portão; plano v2 §2.2 P3 e R-A10) — a chave de repetição da CRIAÇÃO do despacho.
-- Aditiva: coluna nula (as linhas anteriores ficam sem chave), um CHECK que exige autor quando há chave (sem autor, a
-- unicidade sumiria com o NULL) e o índice único (organização, autor, chave). Sem CONCURRENTLY: a tabela é pequena e a
-- migração é transacional (BEGIN/COMMIT, D-MIGRACAO-COM-TRANSACAO-EXPLICITA); o drill é
-- tests/b-o6r-09-dispatch-migration-drill-db.test.ts.
BEGIN;

ALTER TABLE "field_dispatches" ADD COLUMN "idempotency_key" TEXT;

ALTER TABLE "field_dispatches" ADD CONSTRAINT "field_dispatches_idempotency_key_requires_author" CHECK ("idempotency_key" IS NULL OR "created_by" IS NOT NULL);

CREATE UNIQUE INDEX "field_dispatches_tenant_id_created_by_idempotency_key_key" ON "field_dispatches"("tenant_id", "created_by", "idempotency_key");

COMMIT;

-- down (só no drill; em ambiente real, reverter o PR basta: a coluna, o CHECK e o índice ficam sem uso):
--   DROP INDEX IF EXISTS "field_dispatches_tenant_id_created_by_idempotency_key_key";
--   ALTER TABLE "field_dispatches" DROP CONSTRAINT IF EXISTS "field_dispatches_idempotency_key_requires_author";
--   ALTER TABLE "field_dispatches" DROP COLUMN IF EXISTS "idempotency_key";
