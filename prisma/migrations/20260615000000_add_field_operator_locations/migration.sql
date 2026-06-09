CREATE TABLE "field_operator_locations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "operator_user_id" UUID NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'mobile',
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracy_meters" DOUBLE PRECISION,
  "heading_degrees" DOUBLE PRECISION,
  "speed_meters_per_second" DOUBLE PRECISION,
  "battery_level" INTEGER,
  "recorded_at" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "field_operator_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_operator_locations_source_check" CHECK ("source" IN ('mobile', 'web', 'system')),
  CONSTRAINT "field_operator_locations_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
  CONSTRAINT "field_operator_locations_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180),
  CONSTRAINT "field_operator_locations_accuracy_meters_check" CHECK ("accuracy_meters" IS NULL OR "accuracy_meters" >= 0),
  CONSTRAINT "field_operator_locations_heading_degrees_check" CHECK ("heading_degrees" IS NULL OR ("heading_degrees" >= 0 AND "heading_degrees" <= 360)),
  CONSTRAINT "field_operator_locations_speed_meters_per_second_check" CHECK ("speed_meters_per_second" IS NULL OR "speed_meters_per_second" >= 0),
  CONSTRAINT "field_operator_locations_battery_level_check" CHECK ("battery_level" IS NULL OR ("battery_level" >= 0 AND "battery_level" <= 100))
);

CREATE UNIQUE INDEX "field_operator_locations_tenant_id_id_key"
  ON "field_operator_locations"("tenant_id", "id");
CREATE INDEX "field_operator_locations_tenant_id_idx"
  ON "field_operator_locations"("tenant_id");
CREATE INDEX "field_operator_locations_tenant_id_operator_user_id_recorded_at_idx"
  ON "field_operator_locations"("tenant_id", "operator_user_id", "recorded_at");
CREATE INDEX "field_operator_locations_tenant_id_recorded_at_idx"
  ON "field_operator_locations"("tenant_id", "recorded_at");

ALTER TABLE "field_operator_locations"
  ADD CONSTRAINT "field_operator_locations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_operator_locations"
  ADD CONSTRAINT "field_operator_locations_tenant_id_operator_user_id_fkey"
  FOREIGN KEY ("tenant_id", "operator_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "field_operator_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_operator_locations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "field_operator_locations_tenant_isolation" ON "field_operator_locations";
CREATE POLICY "field_operator_locations_tenant_isolation" ON "field_operator_locations"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
