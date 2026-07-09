-- Block F7a (Estoque core): net-new tenant-scoped "inventory_items" + "stock_movements" tables.
-- Mirrors the F5 (damages) / F3 (fines) pattern: tenant-scoped composite unique keys,
-- tenant-first composite indexes, FK to "tenants" on both tables, a composite FK
-- movements -> items, and RLS (ENABLE + FORCE + policy on app.current_tenant_id) on BOTH.
--
-- "inventory_items":
--   - "sku" is unique PER TENANT ((tenant_id, sku)) — duplicate in the SAME tenant is a
--     409 duplicate_sku; the same sku in another tenant is allowed (P6).
--   - The BALANCE IS NEVER A COLUMN (R7.1): saldo = SUM(stock_movements.quantidade_sinalizada),
--     derived inside a transaction (aggregate -> check -> insert) so an over-draw is a 409
--     insufficient_balance before any row is written.
--   - "avg_cost" is the MOVING AVERAGE recalculated on "entrada" (R7.3), updated atomically
--     with the movement insert inside the same transaction.
--   - "abc_class" ('A'|'B'|'C') is populated by the F7b ABC job — schema-only in F7a
--     (the API does not expose a write). "lead_time_days"/"safety_stock" feed the F7b
--     reorder-point rule (R7.5).
--   - Money/quantity columns follow the repo precedent: DECIMAL(20,6).
--
-- "stock_movements" (IMMUTABLE ledger — the API exposes no PATCH/DELETE):
--   - "quantidade_sinalizada" is stored SIGNED: + for entrada / positive ajuste,
--     − for saida / consumo / negative ajuste.
--   - composite FK (tenant_id, item_id) -> inventory_items(tenant_id, id) ON DELETE RESTRICT
--     blocks removing an item that still has ledger entries.
--   - "work_order_id" (REQUIRED for type=consumo, R7.2) and "vehicle_id" are OPTIONAL and
--     have NO hard FK: they are validated in-tenant at the service layer
--     (400 invalid_work_order_reference / invalid_vehicle_reference).
--   - "cycle_count_id" is a plain column with NO FK — F7b adds the "cycle_counts" table.
--
-- Rollback (reverse order — stock_movements before inventory_items):
--   ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_tenant_id_item_id_fkey";
--   ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_tenant_id_fkey";
--   DROP TABLE IF EXISTS "stock_movements";
--   ALTER TABLE "inventory_items" DROP CONSTRAINT IF EXISTS "inventory_items_tenant_id_fkey";
--   DROP TABLE IF EXISTS "inventory_items";

CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "min_quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "max_quantity" DECIMAL(20,6),
  "abc_class" TEXT,
  "avg_cost" DECIMAL(20,6) NOT NULL DEFAULT 0,
  "lead_time_days" INTEGER,
  "safety_stock" DECIMAL(20,6),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventory_items_tenant_id_id_key"
  ON "inventory_items"("tenant_id", "id");
CREATE UNIQUE INDEX "inventory_items_tenant_id_sku_key"
  ON "inventory_items"("tenant_id", "sku");
CREATE INDEX "inventory_items_tenant_id_is_active_idx"
  ON "inventory_items"("tenant_id", "is_active");
CREATE INDEX "inventory_items_tenant_id_created_at_idx"
  ON "inventory_items"("tenant_id", "created_at");

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_items_tenant_isolation" ON "inventory_items";
CREATE POLICY "inventory_items_tenant_isolation" ON "inventory_items"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE TABLE "stock_movements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "quantidade_sinalizada" DECIMAL(20,6) NOT NULL,
  "unit_cost" DECIMAL(20,6),
  "work_order_id" UUID,
  "vehicle_id" UUID,
  "reason" TEXT,
  "cycle_count_id" UUID,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_movements_tenant_id_id_key"
  ON "stock_movements"("tenant_id", "id");
CREATE INDEX "stock_movements_tenant_id_item_id_created_at_idx"
  ON "stock_movements"("tenant_id", "item_id", "created_at");
CREATE INDEX "stock_movements_tenant_id_work_order_id_idx"
  ON "stock_movements"("tenant_id", "work_order_id");
CREATE INDEX "stock_movements_tenant_id_created_at_idx"
  ON "stock_movements"("tenant_id", "created_at");

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_tenant_id_item_id_fkey"
  FOREIGN KEY ("tenant_id", "item_id") REFERENCES "inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_movements_tenant_isolation" ON "stock_movements";
CREATE POLICY "stock_movements_tenant_isolation" ON "stock_movements"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
