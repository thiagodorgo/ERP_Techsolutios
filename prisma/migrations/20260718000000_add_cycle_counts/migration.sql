-- Block F7b (Estoque avançado): net-new tenant-scoped "cycle_counts" + "cycle_count_entries"
-- tables (contagem cíclica, R7.6) plus the DEFERRED FK from the F7a "stock_movements.cycle_count_id"
-- column to "cycle_counts". Mirrors the F5 (damages) / F7a (inventory) pattern: tenant-scoped
-- composite unique keys, tenant-first composite indexes, FK to "tenants", composite FKs, and RLS
-- (ENABLE + FORCE + policy on app.current_tenant_id) on BOTH new tables.
--
-- "cycle_counts" (a counting SESSION):
--   - "abc_class" ('A'|'B'|'C'|NULL) is the class being counted (NULL = all active items).
--   - "status" in ('aberta','concluida','cancelada') default 'aberta' — a linear-ish state
--     machine enforced at the service layer: a concluida/cancelada session is terminal, any
--     further mutation is a 422 (mirror the F2/F5 status-machine pattern).
--   - "is_active" allows logical deactivation; audit columns follow the repo precedent.
--
-- "cycle_count_entries" (the counted lines):
--   - composite FK (tenant_id, cycle_count_id) -> cycle_counts(tenant_id, id) ON DELETE CASCADE
--     (removing a session removes its entries).
--   - composite FK (tenant_id, item_id) -> inventory_items(tenant_id, id) ON DELETE RESTRICT
--     (an item referenced by an entry cannot be removed).
--   - "system_quantity" snapshots the derived saldo at OPEN time; "counted_quantity" is NULL
--     until counted; "variance" (counted − system) and "adjustment_movement_id" (the generated
--     ajuste) are filled at CLOSE. Money/quantity columns follow DECIMAL(20,6).
--   - one line per item per session: unique (tenant_id, cycle_count_id, item_id).
--
-- Deferred FK on "stock_movements" (F7a left "cycle_count_id" a plain column):
--   - composite FK (tenant_id, cycle_count_id) -> cycle_counts(tenant_id, id) ON DELETE RESTRICT.
--     MATCH SIMPLE (the default) means the FK is NOT enforced when "cycle_count_id" is NULL, so
--     every pre-existing F7a movement (cycle_count_id NULL) still validates — nothing breaks.
--
-- Rollback (reverse order — drop the stock_movements FK first, then entries, then cycle_counts):
--   ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_tenant_id_cycle_count_id_fkey";
--   ALTER TABLE "cycle_count_entries" DROP CONSTRAINT IF EXISTS "cycle_count_entries_tenant_id_item_id_fkey";
--   ALTER TABLE "cycle_count_entries" DROP CONSTRAINT IF EXISTS "cycle_count_entries_tenant_id_cycle_count_id_fkey";
--   ALTER TABLE "cycle_count_entries" DROP CONSTRAINT IF EXISTS "cycle_count_entries_tenant_id_fkey";
--   DROP TABLE IF EXISTS "cycle_count_entries";
--   ALTER TABLE "cycle_counts" DROP CONSTRAINT IF EXISTS "cycle_counts_tenant_id_fkey";
--   DROP TABLE IF EXISTS "cycle_counts";

CREATE TABLE "cycle_counts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "abc_class" TEXT,
  "status" TEXT NOT NULL DEFAULT 'aberta',
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "cycle_counts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cycle_counts_tenant_id_id_key"
  ON "cycle_counts"("tenant_id", "id");
CREATE INDEX "cycle_counts_tenant_id_status_idx"
  ON "cycle_counts"("tenant_id", "status");
CREATE INDEX "cycle_counts_tenant_id_is_active_idx"
  ON "cycle_counts"("tenant_id", "is_active");
CREATE INDEX "cycle_counts_tenant_id_created_at_idx"
  ON "cycle_counts"("tenant_id", "created_at");

ALTER TABLE "cycle_counts"
  ADD CONSTRAINT "cycle_counts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cycle_counts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cycle_counts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cycle_counts_tenant_isolation" ON "cycle_counts";
CREATE POLICY "cycle_counts_tenant_isolation" ON "cycle_counts"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE TABLE "cycle_count_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "cycle_count_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "system_quantity" DECIMAL(20,6) NOT NULL,
  "counted_quantity" DECIMAL(20,6),
  "variance" DECIMAL(20,6),
  "adjustment_movement_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "cycle_count_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cycle_count_entries_tenant_id_id_key"
  ON "cycle_count_entries"("tenant_id", "id");
CREATE UNIQUE INDEX "cycle_count_entries_tenant_id_cycle_count_id_item_id_key"
  ON "cycle_count_entries"("tenant_id", "cycle_count_id", "item_id");
CREATE INDEX "cycle_count_entries_tenant_id_cycle_count_id_idx"
  ON "cycle_count_entries"("tenant_id", "cycle_count_id");
CREATE INDEX "cycle_count_entries_tenant_id_item_id_idx"
  ON "cycle_count_entries"("tenant_id", "item_id");

ALTER TABLE "cycle_count_entries"
  ADD CONSTRAINT "cycle_count_entries_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cycle_count_entries"
  ADD CONSTRAINT "cycle_count_entries_tenant_id_cycle_count_id_fkey"
  FOREIGN KEY ("tenant_id", "cycle_count_id") REFERENCES "cycle_counts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cycle_count_entries"
  ADD CONSTRAINT "cycle_count_entries_tenant_id_item_id_fkey"
  FOREIGN KEY ("tenant_id", "item_id") REFERENCES "inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cycle_count_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cycle_count_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cycle_count_entries_tenant_isolation" ON "cycle_count_entries";
CREATE POLICY "cycle_count_entries_tenant_isolation" ON "cycle_count_entries"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- Deferred FK: F7a left "stock_movements.cycle_count_id" a plain column so the ajuste generated
-- when a cycle count is CLOSED links back to its session. MATCH SIMPLE leaves NULL rows unchecked,
-- so every existing F7a movement (cycle_count_id NULL) keeps validating.
ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_tenant_id_cycle_count_id_fkey"
  FOREIGN KEY ("tenant_id", "cycle_count_id") REFERENCES "cycle_counts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
