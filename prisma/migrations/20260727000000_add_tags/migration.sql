-- Block Ω2-d (Tags): tabela "tags" — cadastro de marcadores/etiquetas por tenant.
-- Espelha o padrão do suppliers/price_tables: PK uuid, @@unique([tenant_id,id]) e
-- ([tenant_id,name]) (chave natural — 409 duplicate_name no serviço), timestamptz, FK tenant
-- Restrict, RLS ENABLE+FORCE + policy em app.current_tenant_id. Aditivo (CREATE TABLE).
--
-- Rollback:
--   DROP TABLE IF EXISTS "tags" CASCADE;

CREATE TABLE "tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tags_tenant_id_id_key" ON "tags"("tenant_id", "id");
CREATE UNIQUE INDEX "tags_tenant_id_name_key" ON "tags"("tenant_id", "name");
CREATE INDEX "tags_tenant_id_is_active_idx" ON "tags"("tenant_id", "is_active");
CREATE INDEX "tags_tenant_id_created_at_idx" ON "tags"("tenant_id", "created_at");

ALTER TABLE "tags"
  ADD CONSTRAINT "tags_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tags_tenant_isolation" ON "tags";
CREATE POLICY "tags_tenant_isolation" ON "tags"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
