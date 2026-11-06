-- B-ASS-04 (M3) — demonstrativo mensal por organização: demonstrativo, pagamentos, créditos e perfil de
-- cobrança. ADITIVA e forward-only; nenhuma tabela existente é alterada. AUTORIZADA pela fala do dono de
-- 31/10 ~22:15 (siga na recomendação de tudo, exceto p14), que respondeu a P1 (autorizar as 7 de esquema e
-- 3 de dados, uma a uma) — §3.10 e §12.1 do plano.
-- O QUE TOCA: cria subscription_statements, subscription_statement_payments, subscription_credits e
-- tenant_billing_profiles (RLS ENABLE+FORCE, molde 20260879000000). CHECKs de listas fechadas e de valor,
-- UNIQUEs (tenant_id primeiro) e a FK composta (tenant_id, statement_id) do pagamento. TRANSAÇÃO EXPLÍCITA
-- (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): falha em qualquer sentença -> nada aplicado.
-- ROLLBACK (runbook, MANUAL): bloco -- down no fim deste arquivo.

BEGIN;

CREATE TABLE "subscription_statements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period" CHAR(7) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "charge_status" TEXT NOT NULL DEFAULT 'none',
  "invoice_status" TEXT NOT NULL DEFAULT 'none',
  "unreconciled_since" TIMESTAMPTZ(6),
  "keep_invoice_on_reversal" BOOLEAN NOT NULL DEFAULT false,
  "subscription_id" UUID,
  "plan_version_id" UUID,
  "addon_plan_version_id" UUID,
  "segments" JSONB NOT NULL,
  "users_included" INTEGER NOT NULL,
  "users_peak" INTEGER NOT NULL,
  "users_extra" INTEGER NOT NULL,
  "storage_included_gb" DECIMAL(12,3) NOT NULL,
  "storage_peak_gb" DECIMAL(12,3) NOT NULL,
  "storage_extra_gb" DECIMAL(12,3) NOT NULL,
  "tracked_vehicles" INTEGER NOT NULL,
  "days_in_month" INTEGER NOT NULL,
  "days_measured" INTEGER NOT NULL,
  "extra_user_price" DECIMAL(12,2) NOT NULL,
  "extra_gb_price" DECIMAL(12,2) NOT NULL,
  "per_vehicle_price" DECIMAL(12,2),
  "base_amount" DECIMAL(12,2) NOT NULL,
  "users_extra_amount" DECIMAL(12,2) NOT NULL,
  "storage_extra_amount" DECIMAL(12,2) NOT NULL,
  "tracking_amount" DECIMAL(12,2) NOT NULL,
  "adjustments_amount" DECIMAL(12,2) NOT NULL,
  "credits_applied_amount" DECIMAL(12,2) NOT NULL,
  "total_amount" DECIMAL(12,2) NOT NULL,
  "adjustment_note" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "due_date" DATE,
  "closed_at" TIMESTAMPTZ(6),
  "closed_by" UUID,
  "reopened_at" TIMESTAMPTZ(6),
  "reopened_by" UUID,
  "reopen_reason" TEXT,
  "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paid_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "cancelled_by" UUID,
  "cancel_reason" TEXT,
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_statements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_statements_status_check" CHECK ("status" IN ('open', 'reopened', 'closed', 'paid', 'cancelled')),
  CONSTRAINT "subscription_statements_charge_status_check" CHECK ("charge_status" IN ('none', 'pending', 'confirmed', 'failed', 'cancelled', 'partially_refunded', 'refunded', 'chargeback_disputed', 'charged_back', 'needs_review')),
  CONSTRAINT "subscription_statements_invoice_status_check" CHECK ("invoice_status" IN ('none', 'pending', 'authorized', 'rejected', 'cancel_pending', 'cancelled')),
  CONSTRAINT "subscription_statements_total_amount_check" CHECK ("total_amount" >= 0)
);

CREATE UNIQUE INDEX "subscription_statements_tenant_id_period_key" ON "subscription_statements"("tenant_id", "period");
CREATE UNIQUE INDEX "subscription_statements_tenant_id_id_key" ON "subscription_statements"("tenant_id", "id");
CREATE INDEX "subscription_statements_tenant_id_status_idx" ON "subscription_statements"("tenant_id", "status");

ALTER TABLE "subscription_statements" ADD CONSTRAINT "subscription_statements_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_statements" ADD CONSTRAINT "subscription_statements_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_statements" ADD CONSTRAINT "subscription_statements_plan_version_id_fkey"
  FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_statements" ADD CONSTRAINT "subscription_statements_addon_plan_version_id_fkey"
  FOREIGN KEY ("addon_plan_version_id") REFERENCES "subscription_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "subscription_statement_payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "statement_id" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "external_charge_id" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "applied_amount" DECIMAL(12,2) NOT NULL,
  "paid_at" TIMESTAMPTZ(6) NOT NULL,
  "method" TEXT,
  "note" TEXT,
  "recorded_by" UUID,
  "reversed_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "reversed_at" TIMESTAMPTZ(6),
  "reversed_by" UUID,
  "reversal_reason" TEXT,
  "reversal_kind" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_statement_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_statement_payments_source_check" CHECK ("source" IN ('manual', 'asaas', 'mercadopago')),
  CONSTRAINT "subscription_statement_payments_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "subscription_statement_payments_reversal_kind_check" CHECK ("reversal_kind" IS NULL OR "reversal_kind" IN ('manual', 'refund', 'chargeback'))
);

CREATE INDEX "subscription_statement_payments_tenant_id_statement_id_idx" ON "subscription_statement_payments"("tenant_id", "statement_id");
-- UNIQUE parcial: id de cobrança externa é global por provedor (deduplicação de webhook).
CREATE UNIQUE INDEX "subscription_statement_payments_source_external_charge_id_key"
  ON "subscription_statement_payments"("source", "external_charge_id") WHERE "external_charge_id" IS NOT NULL;

ALTER TABLE "subscription_statement_payments" ADD CONSTRAINT "subscription_statement_payments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- FK composta: o pagamento pertence a um demonstrativo da MESMA organização.
ALTER TABLE "subscription_statement_payments" ADD CONSTRAINT "subscription_statement_payments_tenant_id_statement_id_fkey"
  FOREIGN KEY ("tenant_id", "statement_id") REFERENCES "subscription_statements"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "subscription_credits" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "origin_statement_id" UUID NOT NULL,
  "origin_payment_id" UUID,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "applied_to_statement_id" UUID,
  "refund_outbox_id" UUID,
  "created_by" UUID,
  "resolved_by" UUID,
  "resolution_note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_credits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_credits_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "subscription_credits_reason_check" CHECK ("reason" IN ('overpayment', 'duplicate_payment', 'paid_after_cancel', 'paid_after_manual_settlement', 'late_fee_received')),
  CONSTRAINT "subscription_credits_status_check" CHECK ("status" IN ('open', 'applied', 'refunded', 'written_off'))
);

CREATE INDEX "subscription_credits_tenant_id_origin_statement_id_idx" ON "subscription_credits"("tenant_id", "origin_statement_id");
CREATE INDEX "subscription_credits_tenant_id_status_idx" ON "subscription_credits"("tenant_id", "status");

ALTER TABLE "subscription_credits" ADD CONSTRAINT "subscription_credits_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_credits" ADD CONSTRAINT "subscription_credits_origin_statement_id_fkey"
  FOREIGN KEY ("origin_statement_id") REFERENCES "subscription_statements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_credits" ADD CONSTRAINT "subscription_credits_origin_payment_id_fkey"
  FOREIGN KEY ("origin_payment_id") REFERENCES "subscription_statement_payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tenant_billing_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "legal_name" TEXT,
  "document" TEXT,
  "email" TEXT,
  "postal_code" TEXT,
  "street" TEXT,
  "number" TEXT,
  "district" TEXT,
  "city" TEXT,
  "city_ibge" TEXT,
  "state" TEXT,
  "payment_method" TEXT NOT NULL DEFAULT 'undefined',
  "asaas_customer_id" TEXT,
  "mp_customer_id" TEXT,
  "complete" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "tenant_billing_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_billing_profiles_payment_method_check" CHECK ("payment_method" IN ('pix', 'boleto', 'credit_card', 'debit_card', 'undefined'))
);

CREATE UNIQUE INDEX "tenant_billing_profiles_tenant_id_key" ON "tenant_billing_profiles"("tenant_id");

ALTER TABLE "tenant_billing_profiles" ADD CONSTRAINT "tenant_billing_profiles_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS nas tabelas de organização (molde 20260879000000: ENABLE + FORCE + política do GUC).
ALTER TABLE "subscription_statements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_statements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_statements_tenant_isolation" ON "subscription_statements";
CREATE POLICY "subscription_statements_tenant_isolation" ON "subscription_statements"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "subscription_statement_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_statement_payments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_statement_payments_tenant_isolation" ON "subscription_statement_payments";
CREATE POLICY "subscription_statement_payments_tenant_isolation" ON "subscription_statement_payments"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "subscription_credits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_credits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_credits_tenant_isolation" ON "subscription_credits";
CREATE POLICY "subscription_credits_tenant_isolation" ON "subscription_credits"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tenant_billing_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_billing_profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_billing_profiles_tenant_isolation" ON "tenant_billing_profiles";
CREATE POLICY "tenant_billing_profiles_tenant_isolation" ON "tenant_billing_profiles"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real; psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>):
--   DROP TABLE IF EXISTS "tenant_billing_profiles";
--   DROP TABLE IF EXISTS "subscription_credits";
--   DROP TABLE IF EXISTS "subscription_statement_payments";
--   DROP TABLE IF EXISTS "subscription_statements";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260898000000_ass04_subscription_statements';
--   -- as políticas, índices e FKs caem junto com as tabelas; nenhuma outra tabela é tocada.
