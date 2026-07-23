-- Block Ω4C PR-10 (Remunerações — conferência + liquidação em lote → extrato + marcador de liquidação):
-- ALTER ADITIVA sobre "commission_calculations" (tabela já existente do motor de comissões). 2 colunas
-- nullable + 1 índice tenant-first. Estritamente up-only / não-destrutiva (respeita a parada §C7.5 — sem
-- DROP/ALTER destrutivo em objeto existente). "commission_calculations" já tem ENABLE/FORCE ROW LEVEL
-- SECURITY + policy de isolamento por tenant; as colunas novas HERDAM a RLS da tabela (mesma linha) —
-- NENHUMA policy nova.
--
-- (1) settled_at TIMESTAMPTZ (nullable, SEM backfill): o MARCADOR de liquidação — a "bolinha" do AutEM
--     (VERDE = settled_at IS NOT NULL / VERMELHA = NULL). Linhas legadas ficam NULL = não-liquidadas
--     (backfill semanticamente correto: "liquidada" era inexpressável antes da coluna). ZERO dinheiro na
--     coluna — o valor do crédito vive SÓ no extrato do profissional (lição PR-09: não duplicar money).
-- (2) settlement_ref UUID (nullable): o group_id do lançamento de CRÉDITO no extrato do profissional
--     (habilita o deep-link "Ver no extrato"). SEM FK nativa (app-level, como source_id de
--     professional_statement_entries) — a integridade fica no seam do serviço de liquidação.
-- (3) ÍNDICE (tenant_id, settled_at) — tenant_id 1º (invariante multi-tenant); o grid de conferência
--     filtra liquidado/não-liquidado.
--
-- O status legado permanece INTOCADO (settled_at é ortogonal — NÃO se adiciona 'settled' ao enum de status).
-- amount Decimal(20,6) legado INTOCADO (crédito no extrato é Decimal(12,2), arredondado no seam). As colunas
-- novas são ESTADO + LINK, sem valor monetário.
--
-- Rollback (ordem reversa; up-only por política — DROP só em rollback manual):
--   DROP INDEX IF EXISTS "commission_calculations_tenant_id_settled_at_idx";
--   ALTER TABLE "commission_calculations" DROP COLUMN IF EXISTS "settlement_ref";
--   ALTER TABLE "commission_calculations" DROP COLUMN IF EXISTS "settled_at";

ALTER TABLE "commission_calculations" ADD COLUMN "settled_at" TIMESTAMPTZ(6);
ALTER TABLE "commission_calculations" ADD COLUMN "settlement_ref" UUID;

CREATE INDEX "commission_calculations_tenant_id_settled_at_idx"
  ON "commission_calculations" ("tenant_id", "settled_at");
