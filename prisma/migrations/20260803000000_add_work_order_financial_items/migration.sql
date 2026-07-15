-- Block Ω3F-3a (Financeiro da OS): tabela "work_order_financial_items" — item financeiro lançado na
-- OS que CONGELA unit_amount/total_amount a partir da Tarifa vigente (resolvida numa ÚNICA leitura
-- pela mesma máquina do orçamento) ou de valor manual (anti-refaturamento). Aditiva pura
-- (CREATE TABLE). Dinheiro DECIMAL(12,2). FKs compostas (tenant_id, X) → (tenant_id, id) TODAS
-- RESTRICT (item financeiro NUNCA cai em cascata — precedente service_quotes 20260730000000).
-- Idempotência: unique PARCIAL (tenant_id, work_order_id, client_action_id) só entre ativos
-- (precedente work_order_attachments 20260801000000). Delete LÓGICO via deleted_at.
-- RLS ENABLE+FORCE+policy em app.current_tenant_id.
--
-- Rollback (ordem reversa):
--   ALTER TABLE "work_order_financial_items" DROP CONSTRAINT IF EXISTS "work_order_financial_items_tenant_id_price_table_id_fkey";
--   ALTER TABLE "work_order_financial_items" DROP CONSTRAINT IF EXISTS "work_order_financial_items_tenant_id_tariff_id_fkey";
--   ALTER TABLE "work_order_financial_items" DROP CONSTRAINT IF EXISTS "work_order_financial_items_tenant_id_work_order_id_fkey";
--   ALTER TABLE "work_order_financial_items" DROP CONSTRAINT IF EXISTS "work_order_financial_items_tenant_id_fkey";
--   DROP TABLE IF EXISTS "work_order_financial_items";

CREATE TABLE "work_order_financial_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "tariff_id" UUID,
  "price_table_id" UUID,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "unit_amount" DECIMAL(12,2) NOT NULL,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "source" TEXT NOT NULL DEFAULT 'tariff',
  "notes" TEXT,
  "client_action_id" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "work_order_financial_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_order_financial_items_tenant_id_id_key" ON "work_order_financial_items"("tenant_id", "id");
CREATE INDEX "work_order_financial_items_tenant_id_work_order_id_idx" ON "work_order_financial_items"("tenant_id", "work_order_id");
-- Idempotência (409): TENANT-SCOPED + só entre ativos (client_action_id presente e não-excluído).
-- Unique PARCIAL não é expressável no schema.prisma — precedente work_order_attachments_idem_key.
CREATE UNIQUE INDEX "work_order_financial_items_idem_key"
  ON "work_order_financial_items"("tenant_id", "work_order_id", "client_action_id")
  WHERE "client_action_id" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "work_order_financial_items"
  ADD CONSTRAINT "work_order_financial_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_financial_items"
  ADD CONSTRAINT "work_order_financial_items_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_financial_items"
  ADD CONSTRAINT "work_order_financial_items_tenant_id_tariff_id_fkey"
  FOREIGN KEY ("tenant_id", "tariff_id") REFERENCES "tariffs"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_financial_items"
  ADD CONSTRAINT "work_order_financial_items_tenant_id_price_table_id_fkey"
  FOREIGN KEY ("tenant_id", "price_table_id") REFERENCES "price_tables"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_financial_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_order_financial_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_financial_items_tenant_isolation" ON "work_order_financial_items";
CREATE POLICY "work_order_financial_items_tenant_isolation" ON "work_order_financial_items"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
