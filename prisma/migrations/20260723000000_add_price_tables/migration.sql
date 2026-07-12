-- Block Ω2-a.1 (Tabela de Valores): tabela "price_tables" — contêiner versionado de preços por tenant
-- (RN-CAD-007/008). status draft|published|archived (máquina de estado no serviço). Espelha o padrão do
-- service_catalog: PK uuid, @@unique([tenant_id,id]) e ([tenant_id,name]), Decimal N/A (sem dinheiro aqui;
-- o valor unitário vive em "tariffs", Ω2-a.2), timestamptz, FK tenant Restrict, RLS ENABLE+FORCE + policy
-- em app.current_tenant_id. Aditivo (CREATE TABLE).
--
-- Rollback:
--   DROP TABLE IF EXISTS "price_tables" CASCADE;

CREATE TABLE "price_tables" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "version" INTEGER NOT NULL DEFAULT 1,
  "valid_from" TIMESTAMPTZ(6),
  "valid_to" TIMESTAMPTZ(6),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "price_tables_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "price_tables_tenant_id_id_key" ON "price_tables"("tenant_id", "id");
CREATE UNIQUE INDEX "price_tables_tenant_id_name_key" ON "price_tables"("tenant_id", "name");
CREATE INDEX "price_tables_tenant_id_is_active_idx" ON "price_tables"("tenant_id", "is_active");
CREATE INDEX "price_tables_tenant_id_status_idx" ON "price_tables"("tenant_id", "status");
CREATE INDEX "price_tables_tenant_id_created_at_idx" ON "price_tables"("tenant_id", "created_at");

ALTER TABLE "price_tables"
  ADD CONSTRAINT "price_tables_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "price_tables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "price_tables" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_tables_tenant_isolation" ON "price_tables";
CREATE POLICY "price_tables_tenant_isolation" ON "price_tables"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
