-- Block Ω4C PR-03 (Extrato do Profissional): tabela "professional_statement_entries" — razão financeiro POR
-- profissional (D-Ω4C-EXTRATO-MODEL). TABELA ÚNICA, 1 linha por PARCELA, agrupada por group_id (o "lançamento"
-- é lógico). Espelha o padrão operator_profiles/financial_titles: PK uuid, @@unique([tenant_id,id]) (para as FKs
-- compostas futuras), timestamptz, RLS ENABLE+FORCE + policy em app.current_tenant_id (clona 20260726000000).
-- FK composta (tenant_id,operator_profile_id) → operator_profiles(tenant_id,id) ON DELETE RESTRICT (extrato é
-- POR profissional; perfil com lançamento não é apagado — RN-EXT-01). FK tenant RESTRICT.
--
-- Enums em INGLÊS validados na APP (SEM CHECK no banco): entry_type damage|fine|remuneration|adjustment;
-- direction debit|credit; status pending|settled|cancelled; source_type damage|fine|remuneration|manual.
-- amount Decimal(12,2) > 0 (valor DA PARCELA); source_id SEM FK nativa (app-level, como party_id de títulos).
--
-- ÍNDICE PARCIAL de idempotência de ORIGEM (foundation-ready p/ Multa PR-09 · Dano PR-12/13 · Remuneração
-- PR-14/15): no MÁXIMO 1 parcela ATIVA por (tenant, source_type, source_id, installment_number). Espelha
-- financial_titles_source_direction_active_key (20260822000000). `WHERE deleted_at IS NULL` deixa de fora as
-- parcelas retiradas (delete lógico); `source_id IS NOT NULL` deixa de fora os AJUSTES manuais (sempre livres).
--
-- Aditivo puro (CREATE TABLE + índices/constraints da tabela nova; nenhum ALTER/DROP em objeto existente).
--
-- Rollback (tabela nova, sem dependente — up-only por política; DROP só em rollback manual):
--   DROP TABLE IF EXISTS "professional_statement_entries" CASCADE;

CREATE TABLE "professional_statement_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "operator_profile_id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "entry_type" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "installment_number" INTEGER NOT NULL,
  "installment_total" INTEGER NOT NULL,
  "due_date" TIMESTAMPTZ(6) NOT NULL,
  "competencia" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "settled_at" TIMESTAMPTZ(6),
  "settlement_ref" UUID,
  "source_type" TEXT,
  "source_id" UUID,
  "client_action_id" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "professional_statement_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "professional_statement_entries_tenant_id_id_key"
  ON "professional_statement_entries"("tenant_id", "id");
CREATE UNIQUE INDEX "professional_statement_entries_group_installment_key"
  ON "professional_statement_entries"("tenant_id", "group_id", "installment_number");
CREATE INDEX "professional_statement_entries_profile_due_idx"
  ON "professional_statement_entries"("tenant_id", "operator_profile_id", "due_date");
CREATE INDEX "professional_statement_entries_tenant_id_status_idx"
  ON "professional_statement_entries"("tenant_id", "status");
CREATE UNIQUE INDEX "professional_statement_entries_source_idem_key"
  ON "professional_statement_entries"("tenant_id", "source_type", "source_id", "installment_number")
  WHERE "deleted_at" IS NULL AND "source_id" IS NOT NULL;

ALTER TABLE "professional_statement_entries"
  ADD CONSTRAINT "professional_statement_entries_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "professional_statement_entries"
  ADD CONSTRAINT "professional_statement_entries_operator_fkey"
  FOREIGN KEY ("tenant_id", "operator_profile_id") REFERENCES "operator_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "professional_statement_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "professional_statement_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "professional_statement_entries_tenant_isolation" ON "professional_statement_entries";
CREATE POLICY "professional_statement_entries_tenant_isolation" ON "professional_statement_entries"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
