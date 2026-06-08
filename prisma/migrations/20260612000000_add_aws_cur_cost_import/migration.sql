CREATE TABLE "cloud_cost_imports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_uri" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "period_start" TIMESTAMPTZ(6),
  "period_end" TIMESTAMPTZ(6),
  "imported_at" TIMESTAMPTZ(6),
  "imported_by" TEXT,
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "total_unblended_cost" DECIMAL(20, 6) NOT NULL DEFAULT 0,
  "currency" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cloud_cost_imports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cloud_cost_imports_provider_check" CHECK ("provider" IN ('aws')),
  CONSTRAINT "cloud_cost_imports_source_type_check" CHECK ("source_type" IN ('manual_csv', 's3_cur', 'athena_query', 'mock_fixture')),
  CONSTRAINT "cloud_cost_imports_status_check" CHECK ("status" IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT "cloud_cost_imports_row_count_check" CHECK ("row_count" >= 0)
);

CREATE INDEX "cloud_cost_imports_provider_idx" ON "cloud_cost_imports"("provider");
CREATE INDEX "cloud_cost_imports_source_type_idx" ON "cloud_cost_imports"("source_type");
CREATE INDEX "cloud_cost_imports_status_idx" ON "cloud_cost_imports"("status");
CREATE INDEX "cloud_cost_imports_period_idx" ON "cloud_cost_imports"("period_start", "period_end");

CREATE TABLE "cloud_cost_line_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "import_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "billing_period_start" TIMESTAMPTZ(6) NOT NULL,
  "billing_period_end" TIMESTAMPTZ(6) NOT NULL,
  "usage_start" TIMESTAMPTZ(6),
  "usage_end" TIMESTAMPTZ(6),
  "service_code" TEXT NOT NULL,
  "usage_type" TEXT,
  "operation" TEXT,
  "region" TEXT,
  "resource_id" TEXT,
  "cost_category" TEXT,
  "environment" TEXT,
  "project" TEXT,
  "tenant_tag" TEXT,
  "module_tag" TEXT,
  "usage_amount" DECIMAL(20, 6),
  "usage_unit" TEXT,
  "unblended_cost" DECIMAL(20, 6) NOT NULL,
  "amortized_cost" DECIMAL(20, 6),
  "currency" TEXT NOT NULL,
  "raw_line_hash" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cloud_cost_line_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cloud_cost_line_items_provider_check" CHECK ("provider" IN ('aws'))
);

CREATE UNIQUE INDEX "cloud_cost_line_items_import_id_raw_line_hash_key"
  ON "cloud_cost_line_items"("import_id", "raw_line_hash");
CREATE INDEX "cloud_cost_line_items_import_id_idx" ON "cloud_cost_line_items"("import_id");
CREATE INDEX "cloud_cost_line_items_billing_period_idx" ON "cloud_cost_line_items"("billing_period_start", "billing_period_end");
CREATE INDEX "cloud_cost_line_items_service_code_idx" ON "cloud_cost_line_items"("service_code");
CREATE INDEX "cloud_cost_line_items_usage_type_idx" ON "cloud_cost_line_items"("usage_type");
CREATE INDEX "cloud_cost_line_items_region_idx" ON "cloud_cost_line_items"("region");
CREATE INDEX "cloud_cost_line_items_tenant_tag_idx" ON "cloud_cost_line_items"("tenant_tag");

ALTER TABLE "cloud_cost_line_items"
  ADD CONSTRAINT "cloud_cost_line_items_import_id_fkey"
  FOREIGN KEY ("import_id") REFERENCES "cloud_cost_imports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
