-- Block Ω4-5 (Conciliação bancária): ALTER ADITIVA sobre "financial_entries" (já existente). Não cria tabela.
-- Metadados de conciliação do extrato: divergence_type (value|date — "conciliado com ressalva", validado na
-- APLICAÇÃO, sem enum/CHECK, como direction/payment_method), reconciliation_ref (referência opaca do extrato),
-- reconciled_at/reconciled_by (carimbo server-side de quem conciliou e quando). A flag "reconciled" (boolean)
-- já existe desde 20260812000000. Todas NULLABLE, SEM default volátil (metadata-only): lançamento não
-- conciliado = as quatro colunas NULL e reconciled=false.
--
-- Índice de apoio ao filtro do extrato por status de conciliação (?reconciled=): (tenant_id, reconciled).
-- Índice PLANO (modelável no schema.prisma via @@index) — aditivo, não altera dado existente.
--
-- As colunas herdam a RLS da tabela (mesma linha) — NENHUMA policy nova (RLS de financial_entries já existe
-- desde 20260812000000). Aditivo puro (ADD COLUMN nullable + CREATE INDEX).
--
-- Rollback (ordem reversa):
--   DROP INDEX IF EXISTS "financial_entries_tenant_id_reconciled_idx";
--   ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "reconciled_by";
--   ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "reconciled_at";
--   ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "reconciliation_ref";
--   ALTER TABLE "financial_entries" DROP COLUMN IF EXISTS "divergence_type";

ALTER TABLE "financial_entries" ADD COLUMN "divergence_type" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "reconciliation_ref" TEXT;
ALTER TABLE "financial_entries" ADD COLUMN "reconciled_at" TIMESTAMPTZ(6);
ALTER TABLE "financial_entries" ADD COLUMN "reconciled_by" UUID;

CREATE INDEX "financial_entries_tenant_id_reconciled_idx" ON "financial_entries" ("tenant_id", "reconciled");
