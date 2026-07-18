-- Block Ω4-2a (Título financeiro + chokepoint de fechamento): tabelas "financial_titles" e
-- "financial_period_closes". financial_titles é o agregado-núcleo do financeiro do tenant (a
-- pagar/receber). Dinheiro DECIMAL(12,2). FKs compostas (tenant_id, X) → (tenant_id, id) TODAS
-- RESTRICT (título NUNCA cai em cascata — precedente work_order_financial_items 20260803000000).
-- account_id e work_order_id são NULLABLE: o Postgres só cobra a FK quando a coluna NÃO é NULL
-- (título "a pagar" avulso pode não ter conta de liquidação prevista; work_order_id só é populado
-- no Ω4-3). party_id é polimórfico (customer/supplier/other) e NÃO tem FK nativa (integridade
-- app-level, como tag_assignments 20260805000000). Delete LÓGICO via deleted_at.
--
-- financial_period_closes é MÍNIMO: só sustenta o CHOKEPOINT assertPeriodOpen (toda escrita de
-- título consulta (tenant_id, period=competencia); period 'closed' → 422 period_closed). Nesta fatia
-- NÃO há endpoint de escrita (fechar/reabrir vem no Ω4-6); nasce vazia, guard nunca bloqueia, fiação
-- REAL. unique (tenant_id, period) garante um único registro de fechamento por competência/tenant.
--
-- RLS ENABLE+FORCE+policy em app.current_tenant_id nas DUAS tabelas. Aditivo puro (CREATE TABLE).
--
-- Rollback (ordem reversa):
--   DROP TABLE IF EXISTS "financial_period_closes" CASCADE;
--   DROP TABLE IF EXISTS "financial_titles" CASCADE;

CREATE TABLE "financial_titles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "direction" TEXT NOT NULL,
  "party_type" TEXT NOT NULL,
  "party_id" UUID,
  "party_name" TEXT NOT NULL,
  "document" TEXT,
  "category" TEXT,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "issue_date" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "due_date" TIMESTAMPTZ(6) NOT NULL,
  "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'open',
  "competencia" TEXT NOT NULL,
  "account_id" UUID,
  "work_order_id" UUID,
  "service_quote_id" UUID,
  "client_action_id" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "financial_titles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_titles_tenant_id_id_key" ON "financial_titles"("tenant_id", "id");
CREATE INDEX "financial_titles_tenant_id_direction_status_idx" ON "financial_titles"("tenant_id", "direction", "status");
CREATE INDEX "financial_titles_tenant_id_due_date_idx" ON "financial_titles"("tenant_id", "due_date");
CREATE INDEX "financial_titles_tenant_id_deleted_at_idx" ON "financial_titles"("tenant_id", "deleted_at");

ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_tenant_id_account_id_fkey"
  FOREIGN KEY ("tenant_id", "account_id") REFERENCES "financial_accounts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_titles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_titles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financial_titles_tenant_isolation" ON "financial_titles";
CREATE POLICY "financial_titles_tenant_isolation" ON "financial_titles"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE TABLE "financial_period_closes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "period" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "closed_at" TIMESTAMPTZ(6),
  "closed_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "financial_period_closes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_period_closes_tenant_id_id_key" ON "financial_period_closes"("tenant_id", "id");
-- Um único registro de fechamento por competência/tenant (o chokepoint lê por (tenant_id, period)).
CREATE UNIQUE INDEX "financial_period_closes_tenant_id_period_key" ON "financial_period_closes"("tenant_id", "period");

ALTER TABLE "financial_period_closes"
  ADD CONSTRAINT "financial_period_closes_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_period_closes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_period_closes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financial_period_closes_tenant_isolation" ON "financial_period_closes";
CREATE POLICY "financial_period_closes_tenant_isolation" ON "financial_period_closes"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
