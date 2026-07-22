-- Block Ω4C PR-07 (Multas + Seguros): coluna ADITIVA responsible_operator_profile_id em "fines"
-- (D-Ω4C-MULSEG-RESPONSIBLE-MODEL). O CONDUTOR RESPONSÁVEL do CTB/extrato é um operator_profile
-- (o profissional de campo que tem FOLHA) — semanticamente distinto do driver_id existente, que
-- referencia um User genérico e permanece INTOCADO (coexistência informativa).
--
-- (1) ADD COLUMN responsible_operator_profile_id UUID (nullable, SEM backfill): NULL = disposição
--     "empresa paga" (rail de contas a pagar, PR-02); setado = "lançado no extrato do profissional"
--     (RN-MUL-01, débito no razão via caminho interno da PR-03).
-- (2) FK COMPOSTA (tenant_id, responsible_operator_profile_id) → operator_profiles(tenant_id, id)
--     ON DELETE RESTRICT (perfil com multa atribuída não é apagado; referência cross-tenant → 23503).
--     Espelha a FK composta de professional_statement_entries (20260823000000).
-- (3) ÍNDICE (tenant_id, responsible_operator_profile_id) — tenant_id 1º (isolamento multi-tenant).
--
-- Aditivo puro (ADD COLUMN nullable + CREATE INDEX + ADD CONSTRAINT; nenhum ALTER/DROP destrutivo em
-- objeto existente). A coluna herda a RLS da tabela — "fines" já tem ENABLE/FORCE ROW LEVEL SECURITY +
-- policy "fines_tenant_isolation" desde 20260714000000 — nenhuma policy nova. Insurance/seguros e o
-- motor de notificações NÃO tocam o banco nesta fatia (a notificação de vencimento é efeito de domínio
-- com client_action_id determinístico sobre scheduled_notifications, já existente na 20260824000000).
--
-- Rollback (ordem reversa; up-only por política — DROP só em rollback manual):
--   ALTER TABLE "fines" DROP CONSTRAINT IF EXISTS "fines_responsible_operator_fkey";
--   DROP INDEX IF EXISTS "fines_responsible_operator_idx";
--   ALTER TABLE "fines" DROP COLUMN IF EXISTS "responsible_operator_profile_id";

ALTER TABLE "fines" ADD COLUMN "responsible_operator_profile_id" UUID;

CREATE INDEX "fines_responsible_operator_idx"
  ON "fines" ("tenant_id", "responsible_operator_profile_id");

ALTER TABLE "fines"
  ADD CONSTRAINT "fines_responsible_operator_fkey"
  FOREIGN KEY ("tenant_id", "responsible_operator_profile_id")
  REFERENCES "operator_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
