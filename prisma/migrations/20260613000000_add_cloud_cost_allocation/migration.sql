CREATE TABLE "cloud_cost_allocation_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period_end" TIMESTAMPTZ(6) NOT NULL,
  "strategy" TEXT NOT NULL,
  "total_imported_cost" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "total_allocated_cost" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "total_unallocated_cost" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "currency" TEXT,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "created_by" TEXT,
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cloud_cost_allocation_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cloud_cost_allocation_runs_provider_check" CHECK ("provider" IN ('aws')),
  CONSTRAINT "cloud_cost_allocation_runs_status_check" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT "cloud_cost_allocation_runs_strategy_check" CHECK ("strategy" IN ('usage_weighted_v1', 'direct_tag_then_usage_weighted_v1')),
  CONSTRAINT "cloud_cost_allocation_runs_costs_check" CHECK (
    "total_imported_cost" >= 0 AND "total_allocated_cost" >= 0 AND "total_unallocated_cost" >= 0
  )
);

CREATE INDEX "cloud_cost_allocation_runs_provider_idx" ON "cloud_cost_allocation_runs"("provider");
CREATE INDEX "cloud_cost_allocation_runs_status_idx" ON "cloud_cost_allocation_runs"("status");
CREATE INDEX "cloud_cost_allocation_runs_period_idx" ON "cloud_cost_allocation_runs"("period_start", "period_end");

CREATE TABLE "tenant_cloud_cost_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "allocation_run_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "period_start" TIMESTAMPTZ(6) NOT NULL,
  "period_end" TIMESTAMPTZ(6) NOT NULL,
  "service_code" TEXT NOT NULL,
  "usage_type" TEXT NOT NULL DEFAULT 'unknown',
  "cost_category" TEXT NOT NULL DEFAULT 'unknown',
  "allocation_method" TEXT NOT NULL,
  "allocation_basis_metric_key" TEXT,
  "allocation_basis_quantity" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "allocation_ratio" DECIMAL(20, 12) NOT NULL DEFAULT 0,
  "allocated_cost" DECIMAL(20, 6) NOT NULL,
  "currency" TEXT NOT NULL,
  "source_cost_line_item_ids" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_cloud_cost_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_cloud_cost_allocations_provider_check" CHECK ("provider" IN ('aws')),
  CONSTRAINT "tenant_cloud_cost_allocations_method_check" CHECK (
    "allocation_method" IN (
      'direct_tenant_tag',
      'storage_usage_weight',
      'download_usage_weight',
      'api_request_weight',
      'job_execution_weight',
      'checklist_run_weight',
      'equal_split',
      'unallocated'
    )
  ),
  CONSTRAINT "tenant_cloud_cost_allocations_cost_check" CHECK ("allocated_cost" >= 0),
  CONSTRAINT "tenant_cloud_cost_allocations_ratio_check" CHECK ("allocation_ratio" >= 0)
);

CREATE UNIQUE INDEX "tenant_cloud_cost_allocations_run_tenant_service_usage_category_method_key"
  ON "tenant_cloud_cost_allocations"("allocation_run_id", "tenant_id", "service_code", "usage_type", "cost_category", "allocation_method");
CREATE INDEX "tenant_cloud_cost_allocations_run_idx" ON "tenant_cloud_cost_allocations"("allocation_run_id");
CREATE INDEX "tenant_cloud_cost_allocations_tenant_idx" ON "tenant_cloud_cost_allocations"("tenant_id");
CREATE INDEX "tenant_cloud_cost_allocations_period_idx" ON "tenant_cloud_cost_allocations"("period_start", "period_end");
CREATE INDEX "tenant_cloud_cost_allocations_service_code_idx" ON "tenant_cloud_cost_allocations"("service_code");
CREATE INDEX "tenant_cloud_cost_allocations_cost_category_idx" ON "tenant_cloud_cost_allocations"("cost_category");

ALTER TABLE "tenant_cloud_cost_allocations"
  ADD CONSTRAINT "tenant_cloud_cost_allocations_run_id_fkey"
  FOREIGN KEY ("allocation_run_id") REFERENCES "cloud_cost_allocation_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_cloud_cost_allocations"
  ADD CONSTRAINT "tenant_cloud_cost_allocations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tenant_cloud_cost_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_cloud_cost_allocations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_cloud_cost_allocations_tenant_isolation" ON "tenant_cloud_cost_allocations";
CREATE POLICY "tenant_cloud_cost_allocations_tenant_isolation" ON "tenant_cloud_cost_allocations"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
