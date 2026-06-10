CREATE TABLE "field_dispatches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "operator_user_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'assigned',
  "observation" TEXT,
  "reason" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "accepted_at" TIMESTAMPTZ(6),
  "on_route_at" TIMESTAMPTZ(6),
  "arrived_at" TIMESTAMPTZ(6),
  "in_service_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "failed_at" TIMESTAMPTZ(6),
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "field_dispatches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_dispatches_status_check" CHECK ("status" IN ('draft', 'assigned', 'accepted', 'on_route', 'arrived', 'in_service', 'completed', 'cancelled', 'reassigned', 'failed'))
);

CREATE UNIQUE INDEX "field_dispatches_tenant_id_id_key"
  ON "field_dispatches"("tenant_id", "id");
CREATE INDEX "field_dispatches_tenant_id_work_order_id_idx"
  ON "field_dispatches"("tenant_id", "work_order_id");
CREATE INDEX "field_dispatches_tenant_id_operator_user_id_status_idx"
  ON "field_dispatches"("tenant_id", "operator_user_id", "status");
CREATE INDEX "field_dispatches_tenant_id_status_idx"
  ON "field_dispatches"("tenant_id", "status");
CREATE INDEX "field_dispatches_tenant_id_created_at_idx"
  ON "field_dispatches"("tenant_id", "created_at");

CREATE TABLE "field_dispatch_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "dispatch_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT,
  "actor_user_id" UUID,
  "message" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "field_dispatch_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_dispatch_events_event_type_check" CHECK ("event_type" IN ('field_dispatch_created', 'field_dispatch_status_changed', 'field_dispatch_reassigned', 'field_dispatch_cancelled'))
);

CREATE UNIQUE INDEX "field_dispatch_events_tenant_id_id_key"
  ON "field_dispatch_events"("tenant_id", "id");
CREATE INDEX "field_dispatch_events_tenant_id_dispatch_id_created_at_idx"
  ON "field_dispatch_events"("tenant_id", "dispatch_id", "created_at");
CREATE INDEX "field_dispatch_events_tenant_id_work_order_id_created_at_idx"
  ON "field_dispatch_events"("tenant_id", "work_order_id", "created_at");
CREATE INDEX "field_dispatch_events_tenant_id_event_type_idx"
  ON "field_dispatch_events"("tenant_id", "event_type");

ALTER TABLE "field_dispatches"
  ADD CONSTRAINT "field_dispatches_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_dispatches"
  ADD CONSTRAINT "field_dispatches_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "field_dispatches"
  ADD CONSTRAINT "field_dispatches_tenant_id_operator_user_id_fkey"
  FOREIGN KEY ("tenant_id", "operator_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_dispatches"
  ADD CONSTRAINT "field_dispatches_tenant_id_created_by_fkey"
  FOREIGN KEY ("tenant_id", "created_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_dispatches"
  ADD CONSTRAINT "field_dispatches_tenant_id_updated_by_fkey"
  FOREIGN KEY ("tenant_id", "updated_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_dispatch_events"
  ADD CONSTRAINT "field_dispatch_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_dispatch_events"
  ADD CONSTRAINT "field_dispatch_events_tenant_id_dispatch_id_fkey"
  FOREIGN KEY ("tenant_id", "dispatch_id") REFERENCES "field_dispatches"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "field_dispatch_events"
  ADD CONSTRAINT "field_dispatch_events_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "field_dispatch_events"
  ADD CONSTRAINT "field_dispatch_events_tenant_id_actor_user_id_fkey"
  FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_dispatches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_dispatches" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "field_dispatches_tenant_isolation" ON "field_dispatches";
CREATE POLICY "field_dispatches_tenant_isolation" ON "field_dispatches"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "field_dispatch_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "field_dispatch_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "field_dispatch_events_tenant_isolation" ON "field_dispatch_events";
CREATE POLICY "field_dispatch_events_tenant_isolation" ON "field_dispatch_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
