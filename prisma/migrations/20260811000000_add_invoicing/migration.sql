-- Block Ω4-3 (Faturamento OS→Título): ALTER ADITIVA sobre duas tabelas já existentes. Não cria tabela.
--
-- (1) financial_titles — ÍNDICE PARCIAL de idempotência anti-refaturamento (D-Ω4-C2): no MÁXIMO 1 título
--     ATIVO por (tenant, OS, direção). Independe de competência — um 2º POST /work-orders/:id/invoice na
--     mesma OS colide (P2002) e o serviço devolve 409 already_invoiced. `WHERE deleted_at IS NULL` deixa
--     de fora os títulos cancelados (delete lógico), liberando refaturar após cancelar; `work_order_id IS
--     NOT NULL` deixa de fora os títulos AVULSOS (criados sem OS pelo POST /financial-titles), que nunca
--     participam da idempotência de OS.
--
-- (2) work_order_financial_items — CARIMBO de faturamento (D-Ω4-C1): invoiced_at + title_id (ambos
--     NULLABLE; item não-faturado = ambos NULL). FK composta tenant-scoped (tenant_id, title_id) →
--     financial_titles(tenant_id, id) ON DELETE RESTRICT: um item já faturado TRAVA a exclusão física do
--     título (integridade referencial). A trava de mutação do PRÓPRIO item (PATCH/DELETE de item com
--     invoiced_at != NULL → 422 item_invoiced) é app-level no serviço; o banco garante só a referência.
--
-- Aditivo puro (ADD COLUMN nullable + CREATE INDEX + ADD CONSTRAINT). As colunas herdam a RLS da tabela
-- (mesma linha) — nenhuma policy nova.
--
-- Rollback (ordem reversa):
--   ALTER TABLE "work_order_financial_items" DROP CONSTRAINT IF EXISTS "work_order_financial_items_tenant_id_title_id_fkey";
--   ALTER TABLE "work_order_financial_items" DROP COLUMN IF EXISTS "title_id";
--   ALTER TABLE "work_order_financial_items" DROP COLUMN IF EXISTS "invoiced_at";
--   DROP INDEX IF EXISTS "financial_titles_wo_direction_active_key";

CREATE UNIQUE INDEX "financial_titles_wo_direction_active_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction")
  WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL;

ALTER TABLE "work_order_financial_items" ADD COLUMN "invoiced_at" TIMESTAMPTZ(6);
ALTER TABLE "work_order_financial_items" ADD COLUMN "title_id" UUID;

ALTER TABLE "work_order_financial_items"
  ADD CONSTRAINT "work_order_financial_items_tenant_id_title_id_fkey"
  FOREIGN KEY ("tenant_id", "title_id") REFERENCES "financial_titles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
