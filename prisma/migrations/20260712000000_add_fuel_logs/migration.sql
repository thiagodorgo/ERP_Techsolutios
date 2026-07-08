-- Block F1 (Abastecimento): net-new tenant-scoped "fuel_logs" table.
-- Mirrors the cadastro pattern (A4 service_catalog): tenant-scoped unique key,
-- tenant-first composite indexes, FK to "tenants", and RLS (ENABLE + FORCE +
-- policy on app.current_tenant_id). "vehicle_id" is REQUIRED and enforced by a
-- composite FK (tenant_id, vehicle_id) -> vehicles(tenant_id, id), so a fuel log
-- can only reference a vehicle of the same tenant; ON DELETE RESTRICT blocks
-- removing a vehicle still referenced by a fuel log.
-- Money columns follow the repo precedent: DECIMAL(20,6) (converted at the
-- boundary via decimalToNumber). km/L is NEVER stored: it is derived at read
-- time from the vehicle's ordered odometer history (R1.1).
--
-- Rollback (reverse order):
--   ALTER TABLE "fuel_logs" DROP CONSTRAINT IF EXISTS "fuel_logs_tenant_id_vehicle_id_fkey";
--   ALTER TABLE "fuel_logs" DROP CONSTRAINT IF EXISTS "fuel_logs_tenant_id_fkey";
--   DROP TABLE IF EXISTS "fuel_logs";

CREATE TABLE "fuel_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "operator_id" UUID,
  "work_order_id" UUID,
  "fueled_at" TIMESTAMPTZ(6) NOT NULL,
  "fuel_type" TEXT NOT NULL DEFAULT 'gasolina',
  "liters" DECIMAL(20,6) NOT NULL,
  "total_value" DECIMAL(20,6) NOT NULL,
  "odometer" INTEGER NOT NULL,
  "station" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fuel_logs_tenant_id_id_key"
  ON "fuel_logs"("tenant_id", "id");
CREATE INDEX "fuel_logs_tenant_id_vehicle_id_fueled_at_idx"
  ON "fuel_logs"("tenant_id", "vehicle_id", "fueled_at");
CREATE INDEX "fuel_logs_tenant_id_is_active_idx"
  ON "fuel_logs"("tenant_id", "is_active");
CREATE INDEX "fuel_logs_tenant_id_created_at_idx"
  ON "fuel_logs"("tenant_id", "created_at");

ALTER TABLE "fuel_logs"
  ADD CONSTRAINT "fuel_logs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fuel_logs"
  ADD CONSTRAINT "fuel_logs_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fuel_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fuel_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fuel_logs_tenant_isolation" ON "fuel_logs";
CREATE POLICY "fuel_logs_tenant_isolation" ON "fuel_logs"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
