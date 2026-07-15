-- Block Ω3F-4a (Orçamento multi-item): estende ServiceQuote de item único para orçamento com CABEÇALHO
-- (number/issued_at/valid_until) + rastros de aprovar→OS (created_work_order_id) e compartilhar
-- (share_token), e cria a tabela filha "service_quote_items" — linha do orçamento que CONGELA
-- unit_amount/total_amount a partir da Tarifa vigente do cliente (leitura única, anti-refaturamento) ou
-- valor manual. Espelho de work_order_financial_items (20260803000000). Aditiva pura. Dinheiro
-- DECIMAL(12,2). FKs compostas (tenant_id, X) → (tenant_id, id) TODAS RESTRICT (linha financeira NUNCA
-- cai em cascata). Idempotência: unique PARCIAL (tenant_id, service_quote_id, client_action_id) só entre
-- ativos. Delete LÓGICO via deleted_at. RLS ENABLE+FORCE+policy em app.current_tenant_id.
--
-- Rollback (ordem reversa):
--   ALTER TABLE "service_quote_items" DROP CONSTRAINT IF EXISTS "service_quote_items_tenant_id_price_table_id_fkey";
--   ALTER TABLE "service_quote_items" DROP CONSTRAINT IF EXISTS "service_quote_items_tenant_id_tariff_id_fkey";
--   ALTER TABLE "service_quote_items" DROP CONSTRAINT IF EXISTS "service_quote_items_tenant_id_service_quote_id_fkey";
--   ALTER TABLE "service_quote_items" DROP CONSTRAINT IF EXISTS "service_quote_items_tenant_id_fkey";
--   DROP TABLE IF EXISTS "service_quote_items";
--   ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "share_token";
--   ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "created_work_order_id";
--   ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "valid_until";
--   ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "issued_at";
--   ALTER TABLE "service_quotes" DROP COLUMN IF EXISTS "number";

-- 1) Cabeçalho aditivo no orçamento (nullable — item único legado permanece válido).
ALTER TABLE "service_quotes" ADD COLUMN "number" TEXT;
ALTER TABLE "service_quotes" ADD COLUMN "issued_at" TIMESTAMPTZ(6);
ALTER TABLE "service_quotes" ADD COLUMN "valid_until" TIMESTAMPTZ(6);
ALTER TABLE "service_quotes" ADD COLUMN "created_work_order_id" UUID;
ALTER TABLE "service_quotes" ADD COLUMN "share_token" TEXT;

-- 2) Tabela filha (linha do orçamento).
CREATE TABLE "service_quote_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "service_quote_id" UUID NOT NULL,
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
  CONSTRAINT "service_quote_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_quote_items_tenant_id_id_key" ON "service_quote_items"("tenant_id", "id");
CREATE INDEX "service_quote_items_tenant_id_service_quote_id_idx" ON "service_quote_items"("tenant_id", "service_quote_id");
-- Idempotência (409): TENANT-SCOPED + só entre ativos (client_action_id presente e não-excluído).
-- Unique PARCIAL não é expressável no schema.prisma — precedente work_order_financial_items_idem_key.
CREATE UNIQUE INDEX "service_quote_items_idem_key"
  ON "service_quote_items"("tenant_id", "service_quote_id", "client_action_id")
  WHERE "client_action_id" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "service_quote_items"
  ADD CONSTRAINT "service_quote_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quote_items"
  ADD CONSTRAINT "service_quote_items_tenant_id_service_quote_id_fkey"
  FOREIGN KEY ("tenant_id", "service_quote_id") REFERENCES "service_quotes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quote_items"
  ADD CONSTRAINT "service_quote_items_tenant_id_tariff_id_fkey"
  FOREIGN KEY ("tenant_id", "tariff_id") REFERENCES "tariffs"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quote_items"
  ADD CONSTRAINT "service_quote_items_tenant_id_price_table_id_fkey"
  FOREIGN KEY ("tenant_id", "price_table_id") REFERENCES "price_tables"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_quote_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_quote_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_quote_items_tenant_isolation" ON "service_quote_items";
CREATE POLICY "service_quote_items_tenant_isolation" ON "service_quote_items"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
