CREATE TABLE "work_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "customer_name" TEXT,
  "customer_document" TEXT,
  "customer_phone" TEXT,
  "service_address" TEXT,
  "service_city" TEXT,
  "service_state" TEXT,
  "service_zip_code" TEXT,
  "service_latitude" NUMERIC(10, 7),
  "service_longitude" NUMERIC(10, 7),
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "assigned_operator_id" UUID,
  "assigned_user_id" UUID,
  "checklist_id" UUID,
  "scheduled_for" TIMESTAMPTZ(6),
  "started_at" TIMESTAMPTZ(6),
  "arrived_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "cancellation_reason" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_orders_priority_check" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT "work_orders_status_check" CHECK ("status" IN ('open', 'assigned', 'accepted', 'on_route', 'on_site', 'in_progress', 'paused', 'completed', 'cancelled', 'rejected')),
  CONSTRAINT "work_orders_service_latitude_check" CHECK ("service_latitude" IS NULL OR ("service_latitude" >= -90 AND "service_latitude" <= 90)),
  CONSTRAINT "work_orders_service_longitude_check" CHECK ("service_longitude" IS NULL OR ("service_longitude" >= -180 AND "service_longitude" <= 180))
);

CREATE UNIQUE INDEX "work_orders_tenant_id_id_key"
  ON "work_orders"("tenant_id", "id");
CREATE UNIQUE INDEX "work_orders_tenant_id_code_key"
  ON "work_orders"("tenant_id", "code");
CREATE INDEX "work_orders_tenant_id_status_idx"
  ON "work_orders"("tenant_id", "status");
CREATE INDEX "work_orders_tenant_id_priority_idx"
  ON "work_orders"("tenant_id", "priority");
CREATE INDEX "work_orders_tenant_id_assigned_operator_id_idx"
  ON "work_orders"("tenant_id", "assigned_operator_id");
CREATE INDEX "work_orders_tenant_id_assigned_user_id_idx"
  ON "work_orders"("tenant_id", "assigned_user_id");
CREATE INDEX "work_orders_tenant_id_scheduled_for_idx"
  ON "work_orders"("tenant_id", "scheduled_for");
CREATE INDEX "work_orders_tenant_id_created_at_idx"
  ON "work_orders"("tenant_id", "created_at");

CREATE TABLE "work_order_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT,
  "actor_user_id" UUID,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "work_order_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "work_order_events_tenant_id_id_key"
  ON "work_order_events"("tenant_id", "id");
CREATE INDEX "work_order_events_tenant_id_work_order_id_created_at_idx"
  ON "work_order_events"("tenant_id", "work_order_id", "created_at");
CREATE INDEX "work_order_events_tenant_id_event_type_idx"
  ON "work_order_events"("tenant_id", "event_type");

CREATE TABLE "work_order_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "operator_id" UUID NOT NULL,
  "user_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'assigned',
  "assigned_by" UUID,
  "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "accepted_at" TIMESTAMPTZ(6),
  "rejected_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "work_order_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_assignments_status_check" CHECK ("status" IN ('assigned', 'accepted', 'rejected', 'completed', 'cancelled'))
);

CREATE UNIQUE INDEX "work_order_assignments_tenant_id_id_key"
  ON "work_order_assignments"("tenant_id", "id");
CREATE INDEX "work_order_assignments_tenant_id_work_order_id_idx"
  ON "work_order_assignments"("tenant_id", "work_order_id");
CREATE INDEX "work_order_assignments_tenant_id_operator_id_idx"
  ON "work_order_assignments"("tenant_id", "operator_id");
CREATE INDEX "work_order_assignments_tenant_id_user_id_idx"
  ON "work_order_assignments"("tenant_id", "user_id");
CREATE INDEX "work_order_assignments_tenant_id_status_idx"
  ON "work_order_assignments"("tenant_id", "status");

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_assigned_user_id_fkey"
  FOREIGN KEY ("tenant_id", "assigned_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_checklist_id_fkey"
  FOREIGN KEY ("tenant_id", "checklist_id") REFERENCES "checklist_templates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_created_by_fkey"
  FOREIGN KEY ("tenant_id", "created_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_tenant_id_updated_by_fkey"
  FOREIGN KEY ("tenant_id", "updated_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_events"
  ADD CONSTRAINT "work_order_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_events"
  ADD CONSTRAINT "work_order_events_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_order_events"
  ADD CONSTRAINT "work_order_events_tenant_id_actor_user_id_fkey"
  FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_assignments"
  ADD CONSTRAINT "work_order_assignments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_assignments"
  ADD CONSTRAINT "work_order_assignments_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_order_assignments"
  ADD CONSTRAINT "work_order_assignments_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_orders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_orders_tenant_isolation" ON "work_orders";
CREATE POLICY "work_orders_tenant_isolation" ON "work_orders"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "work_order_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_order_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_events_tenant_isolation" ON "work_order_events";
CREATE POLICY "work_order_events_tenant_isolation" ON "work_order_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "work_order_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_order_assignments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_assignments_tenant_isolation" ON "work_order_assignments";
CREATE POLICY "work_order_assignments_tenant_isolation" ON "work_order_assignments"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
