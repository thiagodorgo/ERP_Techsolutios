CREATE TABLE "expense_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "version" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "category_rules" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "limits" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "approval_rules" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "receipt_rules" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "effective_from" TIMESTAMPTZ(6) NOT NULL,
  "effective_to" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expense_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expense_policies_status_check" CHECK ("status" IN ('draft', 'active', 'paused', 'archived'))
);

CREATE UNIQUE INDEX "expense_policies_tenant_id_id_key" ON "expense_policies"("tenant_id", "id");
CREATE UNIQUE INDEX "expense_policies_tenant_id_version_key" ON "expense_policies"("tenant_id", "version");
CREATE INDEX "expense_policies_tenant_id_idx" ON "expense_policies"("tenant_id");
CREATE INDEX "expense_policies_tenant_id_status_idx" ON "expense_policies"("tenant_id", "status");
CREATE INDEX "expense_policies_tenant_id_effective_from_effective_to_idx" ON "expense_policies"("tenant_id", "effective_from", "effective_to");

CREATE TABLE "expense_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_user_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "origin" TEXT NOT NULL,
  "work_order_id" UUID,
  "project_id" TEXT,
  "cost_center" TEXT,
  "city" TEXT,
  "advance_amount" NUMERIC(20, 6) NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(20, 6) NOT NULL DEFAULT 0,
  "reimbursement_amount" NUMERIC(20, 6) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "policy_version" TEXT,
  "created_by" UUID NOT NULL,
  "submitted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expense_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expense_reports_status_check" CHECK ("status" IN ('draft', 'sync_pending', 'ready_to_submit', 'submitted', 'under_review', 'returned', 'approved_manager', 'approved_finance', 'rejected', 'scheduled_for_payment', 'paid', 'cancelled')),
  CONSTRAINT "expense_reports_amounts_check" CHECK ("advance_amount" >= 0 AND "total_amount" >= 0 AND "reimbursement_amount" >= 0),
  CONSTRAINT "expense_reports_period_check" CHECK ("period_end" >= "period_start")
);

CREATE UNIQUE INDEX "expense_reports_tenant_id_id_key" ON "expense_reports"("tenant_id", "id");
CREATE INDEX "expense_reports_tenant_id_idx" ON "expense_reports"("tenant_id");
CREATE INDEX "expense_reports_tenant_id_employee_user_id_idx" ON "expense_reports"("tenant_id", "employee_user_id");
CREATE INDEX "expense_reports_tenant_id_status_idx" ON "expense_reports"("tenant_id", "status");
CREATE INDEX "expense_reports_tenant_id_period_start_period_end_idx" ON "expense_reports"("tenant_id", "period_start", "period_end");
CREATE INDEX "expense_reports_tenant_id_work_order_id_idx" ON "expense_reports"("tenant_id", "work_order_id");

CREATE TABLE "expense_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "category_key" TEXT NOT NULL,
  "spent_at" TIMESTAMPTZ(6) NOT NULL,
  "city" TEXT,
  "vendor_name" TEXT,
  "amount" NUMERIC(20, 6) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "km" NUMERIC(20, 6),
  "notes" TEXT,
  "policy_flags" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expense_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expense_items_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "expense_items_km_check" CHECK ("km" IS NULL OR "km" >= 0)
);

CREATE UNIQUE INDEX "expense_items_tenant_id_id_key" ON "expense_items"("tenant_id", "id");
CREATE INDEX "expense_items_tenant_id_idx" ON "expense_items"("tenant_id");
CREATE INDEX "expense_items_tenant_id_report_id_idx" ON "expense_items"("tenant_id", "report_id");
CREATE INDEX "expense_items_tenant_id_category_key_idx" ON "expense_items"("tenant_id", "category_key");
CREATE INDEX "expense_items_tenant_id_spent_at_idx" ON "expense_items"("tenant_id", "spent_at");

CREATE TABLE "expense_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "file_key" TEXT,
  "local_hash" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "ocr_text" TEXT,
  "ocr_fields" JSONB,
  "confidence" NUMERIC(8, 6),
  "upload_status" TEXT NOT NULL DEFAULT 'local',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expense_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expense_receipts_upload_status_check" CHECK ("upload_status" IN ('local', 'pending_upload', 'uploading', 'uploaded', 'failed')),
  CONSTRAINT "expense_receipts_confidence_check" CHECK ("confidence" IS NULL OR ("confidence" >= 0 AND "confidence" <= 1))
);

CREATE UNIQUE INDEX "expense_receipts_tenant_id_id_key" ON "expense_receipts"("tenant_id", "id");
CREATE INDEX "expense_receipts_tenant_id_idx" ON "expense_receipts"("tenant_id");
CREATE INDEX "expense_receipts_tenant_id_item_id_idx" ON "expense_receipts"("tenant_id", "item_id");
CREATE INDEX "expense_receipts_tenant_id_local_hash_idx" ON "expense_receipts"("tenant_id", "local_hash");
CREATE INDEX "expense_receipts_tenant_id_upload_status_idx" ON "expense_receipts"("tenant_id", "upload_status");

CREATE TABLE "expense_advances" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "employee_user_id" UUID NOT NULL,
  "report_id" UUID,
  "amount" NUMERIC(20, 6) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "source" TEXT NOT NULL DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'open',
  "issued_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expense_advances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expense_advances_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "expense_advances_status_check" CHECK ("status" IN ('open', 'linked', 'settled', 'cancelled'))
);

CREATE UNIQUE INDEX "expense_advances_tenant_id_id_key" ON "expense_advances"("tenant_id", "id");
CREATE INDEX "expense_advances_tenant_id_idx" ON "expense_advances"("tenant_id");
CREATE INDEX "expense_advances_tenant_id_employee_user_id_idx" ON "expense_advances"("tenant_id", "employee_user_id");
CREATE INDEX "expense_advances_tenant_id_report_id_idx" ON "expense_advances"("tenant_id", "report_id");
CREATE INDEX "expense_advances_tenant_id_status_idx" ON "expense_advances"("tenant_id", "status");

CREATE TABLE "expense_approval_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "step_type" TEXT NOT NULL,
  "actor_user_id" UUID,
  "decision" TEXT NOT NULL DEFAULT 'pending',
  "reason" TEXT,
  "decided_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expense_approval_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expense_approval_steps_decision_check" CHECK ("decision" IN ('pending', 'approved', 'returned', 'rejected'))
);

CREATE UNIQUE INDEX "expense_approval_steps_tenant_id_id_key" ON "expense_approval_steps"("tenant_id", "id");
CREATE INDEX "expense_approval_steps_tenant_id_idx" ON "expense_approval_steps"("tenant_id");
CREATE INDEX "expense_approval_steps_tenant_id_report_id_idx" ON "expense_approval_steps"("tenant_id", "report_id");
CREATE INDEX "expense_approval_steps_tenant_id_step_type_idx" ON "expense_approval_steps"("tenant_id", "step_type");
CREATE INDEX "expense_approval_steps_tenant_id_decision_idx" ON "expense_approval_steps"("tenant_id", "decision");

CREATE TABLE "expense_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "aggregate_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "actor_user_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expense_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "expense_events_tenant_id_id_key" ON "expense_events"("tenant_id", "id");
CREATE INDEX "expense_events_tenant_id_idx" ON "expense_events"("tenant_id");
CREATE INDEX "expense_events_tenant_id_aggregate_id_idx" ON "expense_events"("tenant_id", "aggregate_id");
CREATE INDEX "expense_events_tenant_id_event_type_idx" ON "expense_events"("tenant_id", "event_type");

CREATE TABLE "mobile_action_receipts" (
  "tenant_id" UUID NOT NULL,
  "client_action_id" TEXT NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "action_type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'processed',
  "result_ref" TEXT,
  "processed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "mobile_action_receipts_pkey" PRIMARY KEY ("tenant_id", "client_action_id"),
  CONSTRAINT "mobile_action_receipts_status_check" CHECK ("status" IN ('processed', 'failed', 'conflict'))
);

CREATE INDEX "mobile_action_receipts_tenant_id_idx" ON "mobile_action_receipts"("tenant_id");
CREATE INDEX "mobile_action_receipts_tenant_id_actor_user_id_idx" ON "mobile_action_receipts"("tenant_id", "actor_user_id");
CREATE INDEX "mobile_action_receipts_tenant_id_action_type_idx" ON "mobile_action_receipts"("tenant_id", "action_type");
CREATE INDEX "mobile_action_receipts_tenant_id_status_idx" ON "mobile_action_receipts"("tenant_id", "status");

ALTER TABLE "expense_policies" ADD CONSTRAINT "expense_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_reports" ADD CONSTRAINT "expense_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_reports" ADD CONSTRAINT "expense_reports_tenant_id_employee_user_id_fkey" FOREIGN KEY ("tenant_id", "employee_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_reports" ADD CONSTRAINT "expense_reports_tenant_id_created_by_fkey" FOREIGN KEY ("tenant_id", "created_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_reports" ADD CONSTRAINT "expense_reports_tenant_id_work_order_id_fkey" FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_items" ADD CONSTRAINT "expense_items_tenant_id_report_id_fkey" FOREIGN KEY ("tenant_id", "report_id") REFERENCES "expense_reports"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_receipts" ADD CONSTRAINT "expense_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_receipts" ADD CONSTRAINT "expense_receipts_tenant_id_item_id_fkey" FOREIGN KEY ("tenant_id", "item_id") REFERENCES "expense_items"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_advances" ADD CONSTRAINT "expense_advances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_advances" ADD CONSTRAINT "expense_advances_tenant_id_employee_user_id_fkey" FOREIGN KEY ("tenant_id", "employee_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_advances" ADD CONSTRAINT "expense_advances_tenant_id_report_id_fkey" FOREIGN KEY ("tenant_id", "report_id") REFERENCES "expense_reports"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_approval_steps" ADD CONSTRAINT "expense_approval_steps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_approval_steps" ADD CONSTRAINT "expense_approval_steps_tenant_id_report_id_fkey" FOREIGN KEY ("tenant_id", "report_id") REFERENCES "expense_reports"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_approval_steps" ADD CONSTRAINT "expense_approval_steps_tenant_id_actor_user_id_fkey" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_events" ADD CONSTRAINT "expense_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_events" ADD CONSTRAINT "expense_events_tenant_id_aggregate_id_fkey" FOREIGN KEY ("tenant_id", "aggregate_id") REFERENCES "expense_reports"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "expense_events" ADD CONSTRAINT "expense_events_tenant_id_actor_user_id_fkey" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mobile_action_receipts" ADD CONSTRAINT "mobile_action_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mobile_action_receipts" ADD CONSTRAINT "mobile_action_receipts_tenant_id_actor_user_id_fkey" FOREIGN KEY ("tenant_id", "actor_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "expense_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_policies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_policies_tenant_isolation" ON "expense_policies";
CREATE POLICY "expense_policies_tenant_isolation" ON "expense_policies"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "expense_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_reports_tenant_isolation" ON "expense_reports";
CREATE POLICY "expense_reports_tenant_isolation" ON "expense_reports"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "expense_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_items_tenant_isolation" ON "expense_items";
CREATE POLICY "expense_items_tenant_isolation" ON "expense_items"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "expense_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_receipts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_receipts_tenant_isolation" ON "expense_receipts";
CREATE POLICY "expense_receipts_tenant_isolation" ON "expense_receipts"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "expense_advances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_advances" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_advances_tenant_isolation" ON "expense_advances";
CREATE POLICY "expense_advances_tenant_isolation" ON "expense_advances"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "expense_approval_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_approval_steps" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_approval_steps_tenant_isolation" ON "expense_approval_steps";
CREATE POLICY "expense_approval_steps_tenant_isolation" ON "expense_approval_steps"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "expense_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "expense_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expense_events_tenant_isolation" ON "expense_events";
CREATE POLICY "expense_events_tenant_isolation" ON "expense_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "mobile_action_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mobile_action_receipts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mobile_action_receipts_tenant_isolation" ON "mobile_action_receipts";
CREATE POLICY "mobile_action_receipts_tenant_isolation" ON "mobile_action_receipts"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
