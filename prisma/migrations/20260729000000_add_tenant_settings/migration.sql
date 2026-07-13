-- Block Ω2-e (Parâmetros): tabela "tenant_settings" — cadastro key-value administrativo por tenant.
-- Espelha o padrão do suppliers: PK uuid, @@unique([tenant_id,id]) e ([tenant_id,key]) (chave natural
-- do upsert por chave), timestamptz, FK tenant Restrict, RLS ENABLE+FORCE + policy em
-- app.current_tenant_id. value é TEXT (pode conter JSON serializado). Aditivo (CREATE TABLE).
--
-- Rollback:
--   DROP TABLE IF EXISTS "tenant_settings" CASCADE;

CREATE TABLE "tenant_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "category" TEXT,
  "description" TEXT,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_settings_tenant_id_id_key" ON "tenant_settings"("tenant_id", "id");
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key_key" ON "tenant_settings"("tenant_id", "key");
CREATE INDEX "tenant_settings_tenant_id_category_idx" ON "tenant_settings"("tenant_id", "category");

ALTER TABLE "tenant_settings"
  ADD CONSTRAINT "tenant_settings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_settings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_settings_tenant_isolation" ON "tenant_settings";
CREATE POLICY "tenant_settings_tenant_isolation" ON "tenant_settings"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
