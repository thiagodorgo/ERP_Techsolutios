CREATE TABLE "cloud_charge_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID,
  "plan_code" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "effective_from" TIMESTAMPTZ(6) NOT NULL,
  "effective_until" TIMESTAMPTZ(6),
  "currency" TEXT NOT NULL,
  "markup_type" TEXT NOT NULL,
  "markup_value" DECIMAL(20, 6) NOT NULL,
  "minimum_monthly_charge" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "included_cloud_cost" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "included_usage_amount" DECIMAL(20, 6),
  "included_usage_metric_key" TEXT,
  "overage_markup_type" TEXT,
  "overage_markup_value" DECIMAL(20, 6),
  "rounding_mode" TEXT NOT NULL DEFAULT 'nearest_cent',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cloud_charge_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cloud_charge_rules_markup_type_check" CHECK ("markup_type" IN ('percentage', 'fixed_multiplier', 'fixed_amount')),
  CONSTRAINT "cloud_charge_rules_overage_markup_type_check" CHECK ("overage_markup_type" IS NULL OR "overage_markup_type" IN ('percentage', 'fixed_multiplier', 'fixed_amount')),
  CONSTRAINT "cloud_charge_rules_rounding_mode_check" CHECK ("rounding_mode" IN ('none', 'nearest_cent', 'nearest_10_cents', 'nearest_real', 'ceil_real')),
  CONSTRAINT "cloud_charge_rules_amounts_check" CHECK (
    "markup_value" >= 0
    AND "minimum_monthly_charge" >= 0
    AND "included_cloud_cost" >= 0
    AND ("included_usage_amount" IS NULL OR "included_usage_amount" >= 0)
    AND ("overage_markup_value" IS NULL OR "overage_markup_value" >= 0)
  ),
  CONSTRAINT "cloud_charge_rules_effective_range_check" CHECK ("effective_until" IS NULL OR "effective_until" >= "effective_from")
);

CREATE INDEX "cloud_charge_rules_tenant_idx" ON "cloud_charge_rules"("tenant_id");
CREATE INDEX "cloud_charge_rules_plan_code_idx" ON "cloud_charge_rules"("plan_code");
CREATE INDEX "cloud_charge_rules_is_active_idx" ON "cloud_charge_rules"("is_active");
CREATE INDEX "cloud_charge_rules_effective_idx" ON "cloud_charge_rules"("effective_from", "effective_until");

CREATE TABLE "cloud_charge_calculation_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period_end" TIMESTAMPTZ(6) NOT NULL,
  "source_allocation_run_id" UUID NOT NULL,
  "strategy" TEXT NOT NULL,
  "total_allocated_cost" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "total_charge_amount" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "total_margin_amount" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "total_discount_amount" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "currency" TEXT,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "created_by" TEXT,
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cloud_charge_calculation_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cloud_charge_calculation_runs_status_check" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT "cloud_charge_calculation_runs_strategy_check" CHECK ("strategy" IN ('markup_rules_v1')),
  CONSTRAINT "cloud_charge_calculation_runs_amounts_check" CHECK (
    "total_allocated_cost" >= 0
    AND "total_charge_amount" >= 0
    AND "total_discount_amount" >= 0
  ),
  CONSTRAINT "cloud_charge_calculation_runs_period_check" CHECK ("period_end" >= "period_start")
);

CREATE INDEX "cloud_charge_calculation_runs_status_idx" ON "cloud_charge_calculation_runs"("status");
CREATE INDEX "cloud_charge_calculation_runs_period_idx" ON "cloud_charge_calculation_runs"("period_start", "period_end");
CREATE INDEX "cloud_charge_calculation_runs_source_allocation_run_idx" ON "cloud_charge_calculation_runs"("source_allocation_run_id");

CREATE TABLE "tenant_cloud_charges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calculation_run_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "source_allocation_run_id" UUID NOT NULL,
  "cloud_charge_rule_id" UUID,
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period_end" TIMESTAMPTZ(6) NOT NULL,
  "allocated_cost" DECIMAL(20, 6) NOT NULL,
  "included_cloud_cost" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "billable_cost" DECIMAL(20, 6) NOT NULL,
  "markup_type" TEXT NOT NULL,
  "markup_value" DECIMAL(20, 6) NOT NULL,
  "minimum_monthly_charge" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "gross_charge_amount" DECIMAL(20, 6) NOT NULL,
  "discount_amount" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "final_charge_amount" DECIMAL(20, 6) NOT NULL,
  "margin_amount" DECIMAL(20, 6) NOT NULL,
  "margin_percentage" DECIMAL(20, 6),
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_cloud_charges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_cloud_charges_status_check" CHECK ("status" IN ('draft', 'ready', 'locked', 'voided')),
  CONSTRAINT "tenant_cloud_charges_markup_type_check" CHECK ("markup_type" IN ('percentage', 'fixed_multiplier', 'fixed_amount')),
  CONSTRAINT "tenant_cloud_charges_amounts_check" CHECK (
    "allocated_cost" >= 0
    AND "included_cloud_cost" >= 0
    AND "billable_cost" >= 0
    AND "markup_value" >= 0
    AND "minimum_monthly_charge" >= 0
    AND "gross_charge_amount" >= 0
    AND "discount_amount" >= 0
    AND "final_charge_amount" >= 0
  )
);

CREATE UNIQUE INDEX "tenant_cloud_charges_run_tenant_key"
  ON "tenant_cloud_charges"("calculation_run_id", "tenant_id");
CREATE INDEX "tenant_cloud_charges_tenant_idx" ON "tenant_cloud_charges"("tenant_id");
CREATE INDEX "tenant_cloud_charges_period_idx" ON "tenant_cloud_charges"("period_start", "period_end");
CREATE INDEX "tenant_cloud_charges_calculation_run_idx" ON "tenant_cloud_charges"("calculation_run_id");
CREATE INDEX "tenant_cloud_charges_source_allocation_run_idx" ON "tenant_cloud_charges"("source_allocation_run_id");
CREATE INDEX "tenant_cloud_charges_rule_idx" ON "tenant_cloud_charges"("cloud_charge_rule_id");
CREATE INDEX "tenant_cloud_charges_status_idx" ON "tenant_cloud_charges"("status");

ALTER TABLE "cloud_charge_rules"
  ADD CONSTRAINT "cloud_charge_rules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cloud_charge_calculation_runs"
  ADD CONSTRAINT "cloud_charge_calculation_runs_source_allocation_run_id_fkey"
  FOREIGN KEY ("source_allocation_run_id") REFERENCES "cloud_cost_allocation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_cloud_charges"
  ADD CONSTRAINT "tenant_cloud_charges_calculation_run_id_fkey"
  FOREIGN KEY ("calculation_run_id") REFERENCES "cloud_charge_calculation_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_cloud_charges"
  ADD CONSTRAINT "tenant_cloud_charges_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_cloud_charges"
  ADD CONSTRAINT "tenant_cloud_charges_source_allocation_run_id_fkey"
  FOREIGN KEY ("source_allocation_run_id") REFERENCES "cloud_cost_allocation_runs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_cloud_charges"
  ADD CONSTRAINT "tenant_cloud_charges_cloud_charge_rule_id_fkey"
  FOREIGN KEY ("cloud_charge_rule_id") REFERENCES "cloud_charge_rules"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenant_cloud_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_cloud_charges" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_cloud_charges_tenant_isolation" ON "tenant_cloud_charges";
CREATE POLICY "tenant_cloud_charges_tenant_isolation" ON "tenant_cloud_charges"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
