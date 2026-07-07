CREATE TABLE "vehicles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plate" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "type" TEXT,
  "year" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicles_tenant_id_id_key"
  ON "vehicles"("tenant_id", "id");
CREATE UNIQUE INDEX "vehicles_tenant_id_plate_key"
  ON "vehicles"("tenant_id", "plate");
CREATE INDEX "vehicles_tenant_id_is_active_idx"
  ON "vehicles"("tenant_id", "is_active");
CREATE INDEX "vehicles_tenant_id_created_at_idx"
  ON "vehicles"("tenant_id", "created_at");

ALTER TABLE "vehicles"
  ADD CONSTRAINT "vehicles_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicles_tenant_isolation" ON "vehicles";
CREATE POLICY "vehicles_tenant_isolation" ON "vehicles"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
