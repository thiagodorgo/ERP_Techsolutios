-- Block Ω3-a (ServiceQuote): tabela "service_quotes" — orçamento que CONGELA preço/total a partir de
-- uma Tarifa de Tabela de Valores PUBLICADA (anti-refaturamento). Aditivo (CREATE TABLE).
-- frozen_unit_price/frozen_total/quantity DECIMAL(12,2) (dinheiro). FKs compostas (tenant_id, X) →
-- (tenant_id, id): work_orders, customers, service_catalog, tariffs, price_tables — TODAS Restrict
-- (registro financeiro nunca é apagado em cascata; C5/R5 do plano). RLS ENABLE+FORCE + policy.
--
-- C1 (crítico): a chave natural (tenant_id, work_order_id, service_catalog_id) é um índice único
-- PARCIAL (WHERE is_active AND status<>'void') — NÃO um unique cheio — para permitir re-orçar após
-- void e para orçamentos avulsos (work_order_id NULL) coexistirem (NULLs distintos no índice).
--
-- Rollback:
--   DROP TABLE IF EXISTS "service_quotes" CASCADE;

CREATE TABLE "service_quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "work_order_id" UUID,
  "customer_id" UUID,
  "service_catalog_id" UUID NOT NULL,
  "source_tariff_id" UUID,
  "source_price_table_id" UUID,
  "frozen_unit_price" DECIMAL(12,2) NOT NULL,
  "frozen_currency" TEXT NOT NULL DEFAULT 'BRL',
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
  "frozen_total" DECIMAL(12,2) NOT NULL,
  "frozen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "price_source" TEXT NOT NULL DEFAULT 'tariff',
  "status" TEXT NOT NULL DEFAULT 'draft',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "service_quotes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_quotes_tenant_id_id_key" ON "service_quotes"("tenant_id", "id");
-- Chave natural PARCIAL: só um orçamento ATIVO (não-void) por (tenant, work_order, service). void
-- (is_active=false) libera re-orçar. work_order_id NULL não entra na unicidade → avulsos coexistem.
CREATE UNIQUE INDEX "service_quotes_active_natural_key"
  ON "service_quotes"("tenant_id", "work_order_id", "service_catalog_id")
  WHERE "is_active" = true AND "status" <> 'void';
CREATE INDEX "service_quotes_tenant_id_work_order_id_idx" ON "service_quotes"("tenant_id", "work_order_id");
CREATE INDEX "service_quotes_tenant_id_status_idx" ON "service_quotes"("tenant_id", "status");

ALTER TABLE "service_quotes"
  ADD CONSTRAINT "service_quotes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quotes"
  ADD CONSTRAINT "service_quotes_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quotes"
  ADD CONSTRAINT "service_quotes_tenant_id_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quotes"
  ADD CONSTRAINT "service_quotes_tenant_id_service_catalog_id_fkey"
  FOREIGN KEY ("tenant_id", "service_catalog_id") REFERENCES "service_catalog"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quotes"
  ADD CONSTRAINT "service_quotes_tenant_id_source_tariff_id_fkey"
  FOREIGN KEY ("tenant_id", "source_tariff_id") REFERENCES "tariffs"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_quotes"
  ADD CONSTRAINT "service_quotes_tenant_id_source_price_table_id_fkey"
  FOREIGN KEY ("tenant_id", "source_price_table_id") REFERENCES "price_tables"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_quotes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_quotes_tenant_isolation" ON "service_quotes";
CREATE POLICY "service_quotes_tenant_isolation" ON "service_quotes"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
