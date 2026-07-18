-- Block Ω4-7 (Cheque): tabela "cheques" — instrumento de pagamento com ciclo de vida próprio.
-- direction (received|issued) e status (registered|deposited|cleared|bounced|cancelled) são validados na
-- APLICAÇÃO (sem enum/CHECK, como status/priority da OS e direction do lançamento). amount DECIMAL(12,2) > 0
-- (MESMA faixa monetária do lançamento → um cheque registrado é sempre compensável). due_date ("bom para"/
-- pré-datado) é MEMO: a compensação posta caixa na competência CORRENTE (server-now), NUNCA na due_date.
--
-- FK composta (tenant_id, account_id) → financial_accounts RESTRICT (a conta de depósito/pagadora é
-- OBRIGATÓRIA; account_id NOT NULL). cleared_entry_id/bounce_entry_id apontam os lançamentos postados na
-- compensação/devolução — app-level, SEM FK nativa (o lançamento vive no seu módulo; como reversal_of do
-- lançamento e party_id do título). Sem índice de idempotência (o cheque não tem client_action_id; a
-- idempotência das transições que movem dinheiro é o FLIP CONDICIONAL de status — mutex na aplicação).
--
-- RLS ENABLE+FORCE+policy em app.current_tenant_id. Aditivo puro (CREATE TABLE).
--
-- Rollback:
--   DROP TABLE IF EXISTS "cheques" CASCADE;

CREATE TABLE "cheques" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "direction" TEXT NOT NULL,
  "cheque_number" TEXT NOT NULL,
  "bank" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "due_date" DATE,
  "status" TEXT NOT NULL DEFAULT 'registered',
  "cleared_entry_id" UUID,
  "bounce_entry_id" UUID,
  "bounce_reason" TEXT,
  "notes" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cheques_tenant_id_id_key" ON "cheques"("tenant_id", "id");
CREATE INDEX "cheques_tenant_id_account_id_due_date_idx" ON "cheques"("tenant_id", "account_id", "due_date");
CREATE INDEX "cheques_tenant_id_status_idx" ON "cheques"("tenant_id", "status");
CREATE INDEX "cheques_tenant_id_deleted_at_idx" ON "cheques"("tenant_id", "deleted_at");

ALTER TABLE "cheques"
  ADD CONSTRAINT "cheques_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cheques"
  ADD CONSTRAINT "cheques_tenant_id_account_id_fkey"
  FOREIGN KEY ("tenant_id", "account_id") REFERENCES "financial_accounts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cheques" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cheques" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cheques_tenant_isolation" ON "cheques";
CREATE POLICY "cheques_tenant_isolation" ON "cheques"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
