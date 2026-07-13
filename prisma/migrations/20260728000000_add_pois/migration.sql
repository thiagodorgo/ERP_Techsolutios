-- Block Ω2-d (POIs): tabela "pois" — pontos de interesse geográficos por tenant.
-- Espelha o padrão do suppliers/price_tables: PK uuid, @@unique([tenant_id,id]) e
-- ([tenant_id,name]) (chave natural — 409 duplicate_name no serviço), timestamptz, FK tenant
-- Restrict, RLS ENABLE+FORCE + policy em app.current_tenant_id. Aditivo (CREATE TABLE).
-- latitude/longitude NUMERIC(10,7) NOT NULL (predicado do mapa Ω1 valida faixa/sentinela na app).
--
-- Rollback:
--   DROP TABLE IF EXISTS "pois" CASCADE;

CREATE TABLE "pois" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "latitude" NUMERIC(10,7) NOT NULL,
  "longitude" NUMERIC(10,7) NOT NULL,
  "address" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "pois_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pois_tenant_id_id_key" ON "pois"("tenant_id", "id");
CREATE UNIQUE INDEX "pois_tenant_id_name_key" ON "pois"("tenant_id", "name");
CREATE INDEX "pois_tenant_id_is_active_idx" ON "pois"("tenant_id", "is_active");
CREATE INDEX "pois_tenant_id_created_at_idx" ON "pois"("tenant_id", "created_at");

ALTER TABLE "pois"
  ADD CONSTRAINT "pois_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pois" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pois" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pois_tenant_isolation" ON "pois";
CREATE POLICY "pois_tenant_isolation" ON "pois"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
