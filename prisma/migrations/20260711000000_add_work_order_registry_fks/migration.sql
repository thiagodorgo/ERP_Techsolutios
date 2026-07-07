-- Block B1 (OS integrada + snapshot): 4 optional registry FKs on "work_orders".
-- ADDITIVE ONLY. No existing column is touched. The snapshot columns
-- ("customer_name" / "customer_document" / "customer_phone") are kept as-is and
-- continue to hold the point-in-time snapshot derived on OS create.
-- All FKs are composite (tenant_id, <col>) referencing the tenant-scoped unique
-- keys of the cadastro tables, so tenant isolation is preserved at the DB level.
-- ON DELETE RESTRICT blocks removing a cadastro row still referenced by an OS.
--
-- Rollback (reverse order):
--   ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "work_orders_tenant_id_service_catalog_id_fkey";
--   ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "work_orders_tenant_id_team_id_fkey";
--   ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "work_orders_tenant_id_vehicle_id_fkey";
--   ALTER TABLE "work_orders" DROP CONSTRAINT IF EXISTS "work_orders_tenant_id_customer_id_fkey";
--   DROP INDEX IF EXISTS "work_orders_tenant_id_service_catalog_id_idx";
--   DROP INDEX IF EXISTS "work_orders_tenant_id_team_id_idx";
--   DROP INDEX IF EXISTS "work_orders_tenant_id_vehicle_id_idx";
--   DROP INDEX IF EXISTS "work_orders_tenant_id_customer_id_idx";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "service_catalog_id";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "team_id";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "vehicle_id";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "customer_id";

ALTER TABLE "work_orders" ADD COLUMN "customer_id" UUID;
ALTER TABLE "work_orders" ADD COLUMN "vehicle_id" UUID;
ALTER TABLE "work_orders" ADD COLUMN "team_id" UUID;
ALTER TABLE "work_orders" ADD COLUMN "service_catalog_id" UUID;

CREATE INDEX "work_orders_tenant_id_customer_id_idx"
  ON "work_orders"("tenant_id", "customer_id");
CREATE INDEX "work_orders_tenant_id_vehicle_id_idx"
  ON "work_orders"("tenant_id", "vehicle_id");
CREATE INDEX "work_orders_tenant_id_team_id_idx"
  ON "work_orders"("tenant_id", "team_id");
CREATE INDEX "work_orders_tenant_id_service_catalog_id_idx"
  ON "work_orders"("tenant_id", "service_catalog_id");

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_customer_id_fkey"
  FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "customers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_team_id_fkey"
  FOREIGN KEY ("tenant_id", "team_id") REFERENCES "teams"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_service_catalog_id_fkey"
  FOREIGN KEY ("tenant_id", "service_catalog_id") REFERENCES "service_catalog"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
