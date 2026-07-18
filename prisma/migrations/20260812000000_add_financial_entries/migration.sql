-- Block Ω4-4 (Caixa/Extrato + liquidação de título): tabela "financial_entries" (lançamento de caixa).
-- Dinheiro DECIMAL(12,2) > 0. direction (in|out) e payment_method (cash|pix|boleto|card|transfer|check)
-- são validados na APLICAÇÃO (sem enum/CHECK, como status/priority da OS). competencia ('YYYY-MM') é
-- DERIVADA de occurred_at no servidor (mesma deriveCompetencia do título).
--
-- FKs compostas (tenant_id, X) → (tenant_id, id) TODAS RESTRICT (um lançamento NUNCA cai em cascata):
--   * (tenant_id, account_id) → financial_accounts — conta OBRIGATÓRIA (account_id NOT NULL).
--   * (tenant_id, title_id)   → financial_titles   — title_id NULLABLE: só a liquidação preenche
--     (o Postgres só cobra a FK quando a coluna NÃO é NULL). reversal_of é polimórfico/app-level
--     (aponta o lançamento original de um estorno) — SEM FK nativa, como party_id do título.
--
-- Índice PARCIAL de idempotência da liquidação (D-Ω4, P-Ω4-4): no MÁX. 1 lançamento ATIVO por
-- (tenant, título, client_action_id). Um replay do MESMO pagamento (mesmo client_action_id) colide
-- (P2002) e a liquidação devolve 409 duplicate_payment. `WHERE client_action_id IS NOT NULL` deixa de
-- fora os lançamentos sem token; `deleted_at IS NULL` libera reprocessar após exclusão lógica. Lançamentos
-- AVULSOS (title_id NULL) não participam da idempotência (NULLs distintos no índice).
--
-- RLS ENABLE+FORCE+policy em app.current_tenant_id. Aditivo puro (CREATE TABLE).
--
-- Rollback (ordem reversa):
--   DROP TABLE IF EXISTS "financial_entries" CASCADE;

CREATE TABLE "financial_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "title_id" UUID,
  "direction" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "payment_method" TEXT NOT NULL,
  "category" TEXT,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "competencia" TEXT NOT NULL,
  "description" TEXT,
  "reversal_of" UUID,
  "reconciled" BOOLEAN NOT NULL DEFAULT false,
  "client_action_id" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_entries_tenant_id_id_key" ON "financial_entries"("tenant_id", "id");
CREATE INDEX "financial_entries_tenant_id_account_id_occurred_at_idx" ON "financial_entries"("tenant_id", "account_id", "occurred_at");
CREATE INDEX "financial_entries_tenant_id_title_id_idx" ON "financial_entries"("tenant_id", "title_id");
CREATE INDEX "financial_entries_tenant_id_deleted_at_idx" ON "financial_entries"("tenant_id", "deleted_at");
-- Idempotência PARCIAL da liquidação (replay do mesmo pagamento → P2002 → 409 duplicate_payment).
CREATE UNIQUE INDEX "financial_entries_title_client_action_active_key"
  ON "financial_entries" ("tenant_id", "title_id", "client_action_id")
  WHERE "client_action_id" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "financial_entries"
  ADD CONSTRAINT "financial_entries_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries"
  ADD CONSTRAINT "financial_entries_tenant_id_account_id_fkey"
  FOREIGN KEY ("tenant_id", "account_id") REFERENCES "financial_accounts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries"
  ADD CONSTRAINT "financial_entries_tenant_id_title_id_fkey"
  FOREIGN KEY ("tenant_id", "title_id") REFERENCES "financial_titles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financial_entries_tenant_isolation" ON "financial_entries";
CREATE POLICY "financial_entries_tenant_isolation" ON "financial_entries"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
