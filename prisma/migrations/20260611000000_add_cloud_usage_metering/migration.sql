CREATE TABLE "cloud_usage_events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "source_type" text NOT NULL,
  "source_id" text,
  "metric_key" text NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "unit" text NOT NULL,
  "occurred_at" timestamptz(6) NOT NULL DEFAULT now(),
  "idempotency_key" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "cloud_usage_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cloud_usage_events_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "cloud_usage_events_unit_check" CHECK ("unit" IN ('bytes', 'count', 'gb_month'))
);

CREATE UNIQUE INDEX "cloud_usage_events_tenant_id_id_key" ON "cloud_usage_events"("tenant_id", "id");
CREATE UNIQUE INDEX "cloud_usage_events_tenant_id_idempotency_key_key"
  ON "cloud_usage_events"("tenant_id", "idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
CREATE INDEX "cloud_usage_events_tenant_id_idx" ON "cloud_usage_events"("tenant_id");
CREATE INDEX "cloud_usage_events_tenant_id_metric_key_idx" ON "cloud_usage_events"("tenant_id", "metric_key");
CREATE INDEX "cloud_usage_events_tenant_id_occurred_at_idx" ON "cloud_usage_events"("tenant_id", "occurred_at");
CREATE INDEX "cloud_usage_events_tenant_id_metric_key_occurred_at_idx" ON "cloud_usage_events"("tenant_id", "metric_key", "occurred_at");

ALTER TABLE "cloud_usage_events"
  ADD CONSTRAINT "cloud_usage_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "cloud_usage_daily_aggregates" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "date" date NOT NULL,
  "metric_key" text NOT NULL,
  "quantity" numeric(20, 6) NOT NULL,
  "unit" text NOT NULL,
  "source_type" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "cloud_usage_daily_aggregates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cloud_usage_daily_aggregates_quantity_check" CHECK ("quantity" >= 0),
  CONSTRAINT "cloud_usage_daily_aggregates_unit_check" CHECK ("unit" IN ('bytes', 'count', 'gb_month'))
);

CREATE UNIQUE INDEX "cloud_usage_daily_aggregates_tenant_date_metric_unit_source_key"
  ON "cloud_usage_daily_aggregates"("tenant_id", "date", "metric_key", "unit", "source_type");
CREATE INDEX "cloud_usage_daily_aggregates_tenant_id_idx" ON "cloud_usage_daily_aggregates"("tenant_id");
CREATE INDEX "cloud_usage_daily_aggregates_tenant_id_metric_key_idx" ON "cloud_usage_daily_aggregates"("tenant_id", "metric_key");
CREATE INDEX "cloud_usage_daily_aggregates_tenant_id_date_idx" ON "cloud_usage_daily_aggregates"("tenant_id", "date");

ALTER TABLE "cloud_usage_daily_aggregates"
  ADD CONSTRAINT "cloud_usage_daily_aggregates_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cloud_usage_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cloud_usage_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cloud_usage_events_tenant_isolation" ON "cloud_usage_events";
CREATE POLICY "cloud_usage_events_tenant_isolation" ON "cloud_usage_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "cloud_usage_daily_aggregates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cloud_usage_daily_aggregates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cloud_usage_daily_aggregates_tenant_isolation" ON "cloud_usage_daily_aggregates";
CREATE POLICY "cloud_usage_daily_aggregates_tenant_isolation" ON "cloud_usage_daily_aggregates"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
