-- B-ASS-08 (M5) — fila (outbox), eventos de webhook, índice de referências, notas, cobranças e numeração da nota.
-- ADITIVA e forward-only; NENHUMA tabela existente é alterada, renomeada ou muda de tipo. AUTORIZADA nominalmente
-- pelo dono em D-ASS08-MIGRACAO-M5 (2026-11-09, agent-orchestration/controle/decisoes.md) — §3.10 e §12.1 do plano.
-- O QUE CRIA: billing_outbox, billing_webhook_events, billing_statement_refs, subscription_statement_invoices,
-- subscription_statement_charges, billing_invoice_sequences.
--   Tenant-scoped (RLS ENABLE+FORCE, molde 20260879000000): billing_outbox, subscription_statement_invoices,
--   subscription_statement_charges.
--   GLOBAIS (exceção declarada no plano, precedente `tenants`): billing_webhook_events (organização desconhecida ao
--   receber), billing_statement_refs (só ids — leva do externalReference ao tenant_id sem varrer N organizações),
--   billing_invoice_sequences (numeração do emissor, a plataforma).
-- CHECKs de listas fechadas, UNIQUEs (parciais na migração), FKs compostas (tenant_id primeiro) e RLS abaixo.
-- TRANSAÇÃO EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): falha em qualquer sentença -> nada aplicado.
-- ROLLBACK (runbook, MANUAL): bloco -- down no fim deste arquivo.

BEGIN;

-- ─────────────────────────────── billing_outbox (RLS) ───────────────────────────────
CREATE TABLE "billing_outbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "statement_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "provider_idempotency_key" UUID NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "skip_reason" TEXT,
  "claimed_at" TIMESTAMPTZ(6),
  "claimed_by" TEXT,
  "attempt_started_at" TIMESTAMPTZ(6),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMPTZ(6),
  "last_error" TEXT,
  "external_id" TEXT,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "billing_outbox_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_outbox_kind_check" CHECK ("kind" IN ('charge_create', 'charge_cancel', 'refund', 'invoice_issue', 'invoice_cancel')),
  CONSTRAINT "billing_outbox_status_check" CHECK ("status" IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'NEEDS_REVIEW', 'SKIPPED')),
  CONSTRAINT "billing_outbox_skip_reason_check" CHECK ("skip_reason" IS NULL OR "skip_reason" IN ('provider_disabled', 'provider_disabled_by_platform', 'statement_paid', 'statement_cancelled', 'statement_reopened'))
);

CREATE UNIQUE INDEX "billing_outbox_idempotency_key_key" ON "billing_outbox"("idempotency_key");
CREATE INDEX "billing_outbox_tenant_id_status_idx" ON "billing_outbox"("tenant_id", "status");
CREATE INDEX "billing_outbox_status_next_attempt_at_idx" ON "billing_outbox"("status", "next_attempt_at");

ALTER TABLE "billing_outbox" ADD CONSTRAINT "billing_outbox_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- FK composta: a linha pertence a um demonstrativo da MESMA organização.
ALTER TABLE "billing_outbox" ADD CONSTRAINT "billing_outbox_tenant_id_statement_id_fkey"
  FOREIGN KEY ("tenant_id", "statement_id") REFERENCES "subscription_statements"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────── billing_webhook_events (GLOBAL, sem RLS) ───────────────────────────────
CREATE TABLE "billing_webhook_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "external_event_id" TEXT NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "body_digest" TEXT NOT NULL,
  "signature_ok" BOOLEAN NOT NULL,
  "external_resource_id" TEXT,
  "external_reference" TEXT,
  "status" TEXT NOT NULL DEFAULT 'received',
  "job_attempts" INTEGER NOT NULL DEFAULT 0,
  "resolved_tenant_id" UUID,
  "resolved_statement_id" UUID,
  "error" TEXT,
  CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_webhook_events_status_check" CHECK ("status" IN ('received', 'processed', 'ignored', 'rejected', 'stale'))
);

CREATE UNIQUE INDEX "billing_webhook_events_provider_external_event_id_key" ON "billing_webhook_events"("provider", "external_event_id");
CREATE INDEX "billing_webhook_events_status_received_at_idx" ON "billing_webhook_events"("status", "received_at");

-- ─────────────────────────────── billing_statement_refs (GLOBAL, sem RLS — só ids) ───────────────────────────────
CREATE TABLE "billing_statement_refs" (
  "statement_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL,
  "provider" TEXT,
  "external_charge_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "billing_statement_refs_pkey" PRIMARY KEY ("statement_id")
);

CREATE INDEX "billing_statement_refs_tenant_id_idx" ON "billing_statement_refs"("tenant_id");

ALTER TABLE "billing_statement_refs" ADD CONSTRAINT "billing_statement_refs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────── subscription_statement_invoices (RLS) ───────────────────────────────
CREATE TABLE "subscription_statement_invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "statement_id" UUID NOT NULL,
  "seq" INTEGER NOT NULL DEFAULT 1,
  "provider" TEXT NOT NULL,
  "external_ref" TEXT NOT NULL,
  "provider_invoice_id" TEXT,
  "serie_dps" INTEGER,
  "numero_dps" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "number" TEXT,
  "verification_code" TEXT,
  "pdf_url" TEXT,
  "xml_url" TEXT,
  "pdf_source" TEXT,
  "issued_at" TIMESTAMPTZ(6),
  "cancelled_at" TIMESTAMPTZ(6),
  "cancel_reason" TEXT,
  "cancel_code" TEXT,
  "error" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_statement_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_statement_invoices_status_check" CHECK ("status" IN ('pending', 'authorized', 'rejected', 'cancel_pending', 'cancelled')),
  CONSTRAINT "subscription_statement_invoices_pdf_source_check" CHECK ("pdf_source" IS NULL OR "pdf_source" IN ('public_url', 'provider_fetch'))
);

CREATE UNIQUE INDEX "subscription_statement_invoices_provider_external_ref_key" ON "subscription_statement_invoices"("provider", "external_ref");
CREATE INDEX "subscription_statement_invoices_tenant_id_statement_id_idx" ON "subscription_statement_invoices"("tenant_id", "statement_id");
-- UNIQUE parcial: uma nota VIVA por demonstrativo.
CREATE UNIQUE INDEX "subscription_statement_invoices_live_per_statement_key"
  ON "subscription_statement_invoices"("statement_id") WHERE "status" IN ('pending', 'authorized', 'cancel_pending');

ALTER TABLE "subscription_statement_invoices" ADD CONSTRAINT "subscription_statement_invoices_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_statement_invoices" ADD CONSTRAINT "subscription_statement_invoices_tenant_id_statement_id_fkey"
  FOREIGN KEY ("tenant_id", "statement_id") REFERENCES "subscription_statements"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────── subscription_statement_charges (RLS) ───────────────────────────────
CREATE TABLE "subscription_statement_charges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "statement_id" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "external_charge_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "pay_url" TEXT,
  "pix_copy_paste" TEXT,
  "boleto_line" TEXT,
  "boleto_url" TEXT,
  "due_date" DATE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "cancelled_at" TIMESTAMPTZ(6),
  CONSTRAINT "subscription_statement_charges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_statement_charges_status_check" CHECK ("status" IN ('none', 'pending', 'confirmed', 'failed', 'cancelled', 'partially_refunded', 'refunded', 'chargeback_disputed', 'charged_back', 'needs_review'))
);

CREATE UNIQUE INDEX "subscription_statement_charges_provider_external_charge_id_key" ON "subscription_statement_charges"("provider", "external_charge_id");
CREATE INDEX "subscription_statement_charges_tenant_id_statement_id_idx" ON "subscription_statement_charges"("tenant_id", "statement_id");
-- UNIQUE parcial: uma cobrança PENDENTE por demonstrativo.
CREATE UNIQUE INDEX "subscription_statement_charges_pending_per_statement_key"
  ON "subscription_statement_charges"("statement_id") WHERE "status" = 'pending';

ALTER TABLE "subscription_statement_charges" ADD CONSTRAINT "subscription_statement_charges_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "subscription_statement_charges" ADD CONSTRAINT "subscription_statement_charges_tenant_id_statement_id_fkey"
  FOREIGN KEY ("tenant_id", "statement_id") REFERENCES "subscription_statements"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────── billing_invoice_sequences (GLOBAL, sem RLS) ───────────────────────────────
CREATE TABLE "billing_invoice_sequences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "serie" INTEGER NOT NULL,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "billing_invoice_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_invoice_sequences_environment_check" CHECK ("environment" IN ('sandbox', 'production'))
);

CREATE UNIQUE INDEX "billing_invoice_sequences_provider_environment_serie_key" ON "billing_invoice_sequences"("provider", "environment", "serie");

-- ─────────────────────────────── RLS nas tabelas de organização (molde 20260879000000) ───────────────────────────────
ALTER TABLE "billing_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "billing_outbox" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_outbox_tenant_isolation" ON "billing_outbox";
CREATE POLICY "billing_outbox_tenant_isolation" ON "billing_outbox"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "subscription_statement_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_statement_invoices" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_statement_invoices_tenant_isolation" ON "subscription_statement_invoices";
CREATE POLICY "subscription_statement_invoices_tenant_isolation" ON "subscription_statement_invoices"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "subscription_statement_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription_statement_charges" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscription_statement_charges_tenant_isolation" ON "subscription_statement_charges";
CREATE POLICY "subscription_statement_charges_tenant_isolation" ON "subscription_statement_charges"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real; psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>):
--   DROP TABLE IF EXISTS "billing_invoice_sequences";
--   DROP TABLE IF EXISTS "subscription_statement_charges";
--   DROP TABLE IF EXISTS "subscription_statement_invoices";
--   DROP TABLE IF EXISTS "billing_statement_refs";
--   DROP TABLE IF EXISTS "billing_webhook_events";
--   DROP TABLE IF EXISTS "billing_outbox";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260900000000_ass08_billing_outbox';
--   -- as políticas, índices e FKs caem junto com as tabelas; nenhuma outra tabela é tocada.
