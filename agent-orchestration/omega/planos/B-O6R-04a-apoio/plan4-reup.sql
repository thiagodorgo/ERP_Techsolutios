CREATE UNIQUE INDEX "stock_movements_reversal_active_key"
  ON "stock_movements" ("tenant_id", "reverses_movement_id") WHERE "reverses_movement_id" IS NOT NULL;
CREATE UNIQUE INDEX "stock_movements_cycle_count_item_key"
  ON "stock_movements" ("tenant_id", "cycle_count_id", "item_id") WHERE "cycle_count_id" IS NOT NULL;
