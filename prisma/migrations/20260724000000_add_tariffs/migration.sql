-- Block Ω2-a.2 (Tarifas): tabela "tariffs" — item de preço de uma Tabela de Valores (RN-CAD-009).
-- Aditivo (CREATE TABLE). Depende de price_tables (Ω2-a.1). unit_price DECIMAL(12,2) (dinheiro).
-- FKs compostas (tenant_id, X) → (tenant_id, id): price_tables (Cascade — apagar tabela remove tarifas),
-- service_catalog e customers (Restrict). RLS ENABLE+FORCE + policy em app.current_tenant_id.
--
-- A1 (crítico): chave natural única INCLUI customer_id → tarifa padrão (customer NULL) e por-cliente para
-- o mesmo serviço NÃO colidem (NULLs distintos no índice único do Postgres).
--
-- Rollback:
--   DROP TABLE IF EXISTS "tariffs" CASCADE;

CREATE TABLE "tariffs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "price_table_id" UUID NOT NULL,
  "service_catalog_id" UUID,
  "customer_id" UUID,
  "name" TEXT,
  "unit_price" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "origin" TEXT NOT NULL,
  "rule" TEXT,
  "valid_from" TIMESTAMPTZ(6),
  "valid_to" TIMESTAMPTZ(6),
  "status" TEXT NOT NULL DEFAULT 'active',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tariffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tariffs_tenant_id_id_key" ON "tariffs"("tenant_id", "id");
CREATE UNIQUE INDEX "tariffs_natural_key"
  ON "tariffs"("tenant_id", "price_table_id", "service_catalog_id", "customer_id");
CREATE INDEX "tariffs_tenant_id_price_table_id_idx" ON "tariffs"("tenant_id", "price_table_id");
CREATE INDEX "tariffs_tenant_id_is_active_idx" ON "tariffs"("tenant_id", "is_active");

ALTER TABLE "tariffs"
  ADD CONSTRAINT "tariffs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tariffs"
  ADD CONSTRAINT "tariffs_tenant_id_price_table_id_fkey"
  FOREIGN KEY ("tenant_id", "price_table_id") REFERENCES "price_tables"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tariffs"
  ADD CONSTRAINT "tariffs_tenant_id_service_catalog_id_fkey"
  FOREIGN KEY ("tenant_id", "service_catalog_id") REFERENCES "service_catalog"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tariffs"
  ADD CONSTRAINT "tariffs_tenant_id_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tariffs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tariffs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tariffs_tenant_isolation" ON "tariffs";
CREATE POLICY "tariffs_tenant_isolation" ON "tariffs"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
