-- Block Ω2-b (Fornecedores): tabela "suppliers" — cadastro de fornecedores por tenant.
-- Espelha o padrão do price_tables/service_catalog: PK uuid, @@unique([tenant_id,id]) e
-- ([tenant_id,name]) (chave natural — 409 duplicate_name no serviço), timestamptz, FK tenant
-- Restrict, RLS ENABLE+FORCE + policy em app.current_tenant_id. Aditivo (CREATE TABLE).
--
-- Rollback:
--   DROP TABLE IF EXISTS "suppliers" CASCADE;

CREATE TABLE "suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "document" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "category" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_tenant_id_id_key" ON "suppliers"("tenant_id", "id");
CREATE UNIQUE INDEX "suppliers_tenant_id_name_key" ON "suppliers"("tenant_id", "name");
CREATE INDEX "suppliers_tenant_id_is_active_idx" ON "suppliers"("tenant_id", "is_active");
CREATE INDEX "suppliers_tenant_id_created_at_idx" ON "suppliers"("tenant_id", "created_at");

ALTER TABLE "suppliers"
  ADD CONSTRAINT "suppliers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "suppliers_tenant_isolation" ON "suppliers";
CREATE POLICY "suppliers_tenant_isolation" ON "suppliers"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
