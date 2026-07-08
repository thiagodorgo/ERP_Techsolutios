-- Block F2 (Manutenção): net-new tenant-scoped "maintenance_orders" table.
-- Mirrors the F1 (fuel_logs) pattern: tenant-scoped unique key, tenant-first
-- composite indexes, FK to "tenants", and RLS (ENABLE + FORCE + policy on
-- app.current_tenant_id). "vehicle_id" is REQUIRED and enforced by a composite
-- FK (tenant_id, vehicle_id) -> vehicles(tenant_id, id), so a maintenance order
-- can only reference a vehicle of the same tenant; ON DELETE RESTRICT blocks
-- removing a vehicle still referenced by a maintenance order.
-- Money columns follow the repo precedent: DECIMAL(20,6) (converted at the
-- boundary via decimalToNumber). "status" transitions are enforced in the
-- service (R2.1 state machine, 422 on invalid transition).
--
-- Rollback (reverse order):
--   ALTER TABLE "maintenance_orders" DROP CONSTRAINT IF EXISTS "maintenance_orders_tenant_id_vehicle_id_fkey";
--   ALTER TABLE "maintenance_orders" DROP CONSTRAINT IF EXISTS "maintenance_orders_tenant_id_fkey";
--   DROP TABLE IF EXISTS "maintenance_orders";

CREATE TABLE "maintenance_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'agendada',
  "scheduled_for" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "cost" DECIMAL(20,6),
  "supplier" TEXT,
  "odometer" INTEGER,
  "description" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "maintenance_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "maintenance_orders_tenant_id_id_key"
  ON "maintenance_orders"("tenant_id", "id");
CREATE INDEX "maintenance_orders_tenant_id_vehicle_id_status_idx"
  ON "maintenance_orders"("tenant_id", "vehicle_id", "status");
CREATE INDEX "maintenance_orders_tenant_id_status_scheduled_for_idx"
  ON "maintenance_orders"("tenant_id", "status", "scheduled_for");
CREATE INDEX "maintenance_orders_tenant_id_created_at_idx"
  ON "maintenance_orders"("tenant_id", "created_at");

ALTER TABLE "maintenance_orders"
  ADD CONSTRAINT "maintenance_orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_orders"
  ADD CONSTRAINT "maintenance_orders_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_orders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_orders_tenant_isolation" ON "maintenance_orders";
CREATE POLICY "maintenance_orders_tenant_isolation" ON "maintenance_orders"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
