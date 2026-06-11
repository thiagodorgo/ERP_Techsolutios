CREATE TABLE "commission_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "vertical" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "effective_from" TIMESTAMPTZ(6) NOT NULL,
  "effective_to" TIMESTAMPTZ(6),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "commission_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_policies_status_check" CHECK ("status" IN ('draft', 'active', 'paused', 'archived')),
  CONSTRAINT "commission_policies_version_check" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "commission_policies_tenant_id_id_key"
  ON "commission_policies"("tenant_id", "id");
CREATE INDEX "commission_policies_tenant_id_idx"
  ON "commission_policies"("tenant_id");
CREATE INDEX "commission_policies_tenant_id_status_idx"
  ON "commission_policies"("tenant_id", "status");
CREATE INDEX "commission_policies_tenant_id_vertical_idx"
  ON "commission_policies"("tenant_id", "vertical");
CREATE INDEX "commission_policies_tenant_id_effective_from_effective_to_idx"
  ON "commission_policies"("tenant_id", "effective_from", "effective_to");

CREATE TABLE "commission_policy_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "policy_id" UUID NOT NULL,
  "rule_type" TEXT NOT NULL,
  "basis_type" TEXT NOT NULL,
  "rate_type" TEXT NOT NULL,
  "rate_value" NUMERIC(20, 6) NOT NULL,
  "conditions" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "commission_policy_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_policy_rules_rate_value_check" CHECK ("rate_value" >= 0)
);

CREATE UNIQUE INDEX "commission_policy_rules_tenant_id_id_key"
  ON "commission_policy_rules"("tenant_id", "id");
CREATE INDEX "commission_policy_rules_tenant_id_idx"
  ON "commission_policy_rules"("tenant_id");
CREATE INDEX "commission_policy_rules_tenant_id_policy_id_idx"
  ON "commission_policy_rules"("tenant_id", "policy_id");
CREATE INDEX "commission_policy_rules_tenant_id_policy_id_active_priority_idx"
  ON "commission_policy_rules"("tenant_id", "policy_id", "active", "priority");

CREATE TABLE "commission_basis_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "source_event_name" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'received',
  "policy_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "commission_basis_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_basis_events_status_check" CHECK ("status" IN ('received', 'eligible', 'ineligible', 'pending_review', 'superseded'))
);

CREATE UNIQUE INDEX "commission_basis_events_tenant_id_id_key"
  ON "commission_basis_events"("tenant_id", "id");
CREATE UNIQUE INDEX "commission_basis_events_tenant_id_idempotency_key_key"
  ON "commission_basis_events"("tenant_id", "idempotency_key");
CREATE INDEX "commission_basis_events_tenant_id_idx"
  ON "commission_basis_events"("tenant_id");
CREATE INDEX "commission_basis_events_tenant_id_source_type_source_id_idx"
  ON "commission_basis_events"("tenant_id", "source_type", "source_id");
CREATE INDEX "commission_basis_events_tenant_id_source_event_name_idx"
  ON "commission_basis_events"("tenant_id", "source_event_name");
CREATE INDEX "commission_basis_events_tenant_id_status_idx"
  ON "commission_basis_events"("tenant_id", "status");
CREATE INDEX "commission_basis_events_tenant_id_occurred_at_idx"
  ON "commission_basis_events"("tenant_id", "occurred_at");
CREATE INDEX "commission_basis_events_tenant_id_policy_id_idx"
  ON "commission_basis_events"("tenant_id", "policy_id");

CREATE TABLE "commission_calculations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "basis_event_id" UUID NOT NULL,
  "policy_id" UUID NOT NULL,
  "eligible_user_id" UUID,
  "payee_id" UUID,
  "amount" NUMERIC(20, 6) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "calculation_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "idempotency_key" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "commission_calculations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_calculations_status_check" CHECK ("status" IN ('pending', 'calculated', 'disputed', 'approved', 'rejected', 'reversed')),
  CONSTRAINT "commission_calculations_amount_check" CHECK ("amount" >= 0)
);

CREATE UNIQUE INDEX "commission_calculations_tenant_id_id_key"
  ON "commission_calculations"("tenant_id", "id");
CREATE UNIQUE INDEX "commission_calculations_tenant_id_idempotency_key_key"
  ON "commission_calculations"("tenant_id", "idempotency_key");
CREATE INDEX "commission_calculations_tenant_id_idx"
  ON "commission_calculations"("tenant_id");
CREATE INDEX "commission_calculations_tenant_id_basis_event_id_idx"
  ON "commission_calculations"("tenant_id", "basis_event_id");
CREATE INDEX "commission_calculations_tenant_id_policy_id_idx"
  ON "commission_calculations"("tenant_id", "policy_id");
CREATE INDEX "commission_calculations_tenant_id_payee_id_idx"
  ON "commission_calculations"("tenant_id", "payee_id");
CREATE INDEX "commission_calculations_tenant_id_status_idx"
  ON "commission_calculations"("tenant_id", "status");

CREATE TABLE "commission_statements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "payee_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "total_amount" NUMERIC(20, 6) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "commission_statements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commission_statements_status_check" CHECK ("status" IN ('open', 'closed', 'approved', 'exported', 'settled')),
  CONSTRAINT "commission_statements_total_amount_check" CHECK ("total_amount" >= 0),
  CONSTRAINT "commission_statements_period_check" CHECK ("period_end" >= "period_start")
);

CREATE UNIQUE INDEX "commission_statements_tenant_id_id_key"
  ON "commission_statements"("tenant_id", "id");
CREATE UNIQUE INDEX "commission_statements_tenant_id_payee_id_period_start_period_end_currency_key"
  ON "commission_statements"("tenant_id", "payee_id", "period_start", "period_end", "currency");
CREATE INDEX "commission_statements_tenant_id_idx"
  ON "commission_statements"("tenant_id");
CREATE INDEX "commission_statements_tenant_id_payee_id_idx"
  ON "commission_statements"("tenant_id", "payee_id");
CREATE INDEX "commission_statements_tenant_id_status_idx"
  ON "commission_statements"("tenant_id", "status");
CREATE INDEX "commission_statements_tenant_id_period_start_period_end_idx"
  ON "commission_statements"("tenant_id", "period_start", "period_end");

ALTER TABLE "commission_policies"
  ADD CONSTRAINT "commission_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_policies"
  ADD CONSTRAINT "commission_policies_tenant_id_created_by_fkey"
  FOREIGN KEY ("tenant_id", "created_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_policy_rules"
  ADD CONSTRAINT "commission_policy_rules_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_policy_rules"
  ADD CONSTRAINT "commission_policy_rules_tenant_id_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "policy_id") REFERENCES "commission_policies"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commission_basis_events"
  ADD CONSTRAINT "commission_basis_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_basis_events"
  ADD CONSTRAINT "commission_basis_events_tenant_id_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "policy_id") REFERENCES "commission_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_calculations"
  ADD CONSTRAINT "commission_calculations_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_calculations"
  ADD CONSTRAINT "commission_calculations_tenant_id_basis_event_id_fkey"
  FOREIGN KEY ("tenant_id", "basis_event_id") REFERENCES "commission_basis_events"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "commission_calculations"
  ADD CONSTRAINT "commission_calculations_tenant_id_policy_id_fkey"
  FOREIGN KEY ("tenant_id", "policy_id") REFERENCES "commission_policies"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_calculations"
  ADD CONSTRAINT "commission_calculations_tenant_id_eligible_user_id_fkey"
  FOREIGN KEY ("tenant_id", "eligible_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_calculations"
  ADD CONSTRAINT "commission_calculations_tenant_id_payee_id_fkey"
  FOREIGN KEY ("tenant_id", "payee_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_statements"
  ADD CONSTRAINT "commission_statements_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_statements"
  ADD CONSTRAINT "commission_statements_tenant_id_payee_id_fkey"
  FOREIGN KEY ("tenant_id", "payee_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_policies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_policies_tenant_isolation" ON "commission_policies";
CREATE POLICY "commission_policies_tenant_isolation" ON "commission_policies"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "commission_policy_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_policy_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_policy_rules_tenant_isolation" ON "commission_policy_rules";
CREATE POLICY "commission_policy_rules_tenant_isolation" ON "commission_policy_rules"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "commission_basis_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_basis_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_basis_events_tenant_isolation" ON "commission_basis_events";
CREATE POLICY "commission_basis_events_tenant_isolation" ON "commission_basis_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "commission_calculations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_calculations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_calculations_tenant_isolation" ON "commission_calculations";
CREATE POLICY "commission_calculations_tenant_isolation" ON "commission_calculations"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "commission_statements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_statements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_statements_tenant_isolation" ON "commission_statements";
CREATE POLICY "commission_statements_tenant_isolation" ON "commission_statements"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
