CREATE TABLE "service_catalog" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "estimated_duration_minutes" INTEGER,
  "base_price" DECIMAL(12,2),
  "status" TEXT NOT NULL DEFAULT 'active',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_catalog_tenant_id_id_key"
  ON "service_catalog"("tenant_id", "id");
CREATE UNIQUE INDEX "service_catalog_tenant_id_name_key"
  ON "service_catalog"("tenant_id", "name");
CREATE INDEX "service_catalog_tenant_id_is_active_idx"
  ON "service_catalog"("tenant_id", "is_active");
CREATE INDEX "service_catalog_tenant_id_created_at_idx"
  ON "service_catalog"("tenant_id", "created_at");

ALTER TABLE "service_catalog"
  ADD CONSTRAINT "service_catalog_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_catalog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_catalog_tenant_isolation" ON "service_catalog";
CREATE POLICY "service_catalog_tenant_isolation" ON "service_catalog"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
