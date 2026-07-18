-- Block Ω4-1 (Contas financeiras): tabela "financial_accounts" — cadastro puro de contas por tenant
-- (caixa/banco/carteira). Espelha o padrão de suppliers/service_quotes: PK uuid,
-- @@unique([tenant_id,id]), timestamptz, FK tenant Restrict, RLS ENABLE+FORCE + policy em
-- app.current_tenant_id. Aditivo (CREATE TABLE).
--
-- C1: a unicidade de NOME é um índice único PARCIAL (WHERE is_active = true) — NÃO um unique cheio —
-- para permitir RECRIAR o nome depois do soft-delete (is_active=false). Espelha o padrão parcial de
-- service_quotes. opening_balance é DECIMAL(12,2) DEFAULT 0 (saldo de abertura ≥ 0, validado no app).
--
-- Rollback:
--   DROP TABLE IF EXISTS "financial_accounts" CASCADE;

CREATE TABLE "financial_accounts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'cash',
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "bank_name" TEXT,
  "agency" TEXT,
  "account_number" TEXT,
  "document" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "financial_accounts_tenant_id_id_key" ON "financial_accounts"("tenant_id", "id");
-- Chave natural PARCIAL: só um nome ATIVO por tenant. Soft-delete (is_active=false) libera recriar.
CREATE UNIQUE INDEX "financial_accounts_tenant_name_active_key"
  ON "financial_accounts"("tenant_id", "name")
  WHERE "is_active" = true;
CREATE INDEX "financial_accounts_tenant_id_is_active_idx" ON "financial_accounts"("tenant_id", "is_active");
CREATE INDEX "financial_accounts_tenant_id_created_at_idx" ON "financial_accounts"("tenant_id", "created_at");

ALTER TABLE "financial_accounts"
  ADD CONSTRAINT "financial_accounts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "financial_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "financial_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financial_accounts_tenant_isolation" ON "financial_accounts";
CREATE POLICY "financial_accounts_tenant_isolation" ON "financial_accounts"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
