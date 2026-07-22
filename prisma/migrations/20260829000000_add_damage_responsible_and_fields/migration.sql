-- Block Ω4C PR-09 (Danos): colunas ADITIVAS em "damages" (D-Ω4C-DANO-MODEL). O Dano é análogo à Multa
-- (PR-07): quando há um PROFISSIONAL RESPONSÁVEL + valor a descontar, o desconto é lançado como débito
-- PARCELADO no extrato desse profissional (RN-EXT-01 / rail interno da PR-03). Aditivo puro — nenhum
-- ALTER/DROP destrutivo em coluna existente (§C7.5). custo_estimado/custo_real (Decimal(20,6) legado)
-- permanecem INTOCADOS: o dinheiro cobrado vive SÓ no extrato (Decimal(12,2)); não se duplica money.
--
-- (1) ADD COLUMN responsible_operator_profile_id UUID (nullable, SEM backfill): NULL = sem responsável;
--     setado = profissional que sofreu/causou o dano (o desconto no extrato é aplicado quando também há
--     valor a cobrar — D-Ω4C-DANO-STATEMENT-EFFECT).
-- (2) FK COMPOSTA (tenant_id, responsible_operator_profile_id) → operator_profiles(tenant_id, id)
--     ON DELETE RESTRICT (perfil com dano atribuído não é apagado; referência cross-tenant → 23503).
--     Clona byte-a-byte a FK de "fines" (20260827000000) e de professional_statement_entries (20260823000000).
-- (3) ÍNDICE (tenant_id, responsible_operator_profile_id) — tenant_id 1º (isolamento multi-tenant).
-- (4) 5 colunas descritivas ADITIVAS (todas nullable, TEXT, SEM regra de negócio além do parseamento —
--     display/impressão): "tipo" (enum-app internal|external|both, labels INTERNO/EXTERNO/AMBOS, SEM CHECK,
--     validado na app), "origem" (classificação string; MULTA entre os valores, SEM FK — D-Ω4C-RECON-04),
--     "objeto", "identificacao_objeto", "analise_interna" (a Análise Interna NUNCA é impressa — ANALISE:126).
--
-- Aditivo puro (5 ADD COLUMN nullable + 1 ADD COLUMN + CREATE INDEX + ADD CONSTRAINT; nenhum ALTER/DROP em
-- objeto existente). As colunas herdam a RLS da tabela — "damages" já tem ENABLE/FORCE ROW LEVEL SECURITY +
-- policy "damages_tenant_isolation" (nenhuma policy nova). O efeito no extrato NÃO toca o banco aqui
-- (é chamada interna service→service sobre professional_statement_entries, já existente na 20260823000000).
--
-- Rollback (ordem reversa; up-only por política — DROP só em rollback manual):
--   ALTER TABLE "damages" DROP CONSTRAINT IF EXISTS "damages_responsible_operator_fkey";
--   DROP INDEX IF EXISTS "damages_responsible_operator_idx";
--   ALTER TABLE "damages" DROP COLUMN IF EXISTS "analise_interna";
--   ALTER TABLE "damages" DROP COLUMN IF EXISTS "identificacao_objeto";
--   ALTER TABLE "damages" DROP COLUMN IF EXISTS "objeto";
--   ALTER TABLE "damages" DROP COLUMN IF EXISTS "origem";
--   ALTER TABLE "damages" DROP COLUMN IF EXISTS "tipo";
--   ALTER TABLE "damages" DROP COLUMN IF EXISTS "responsible_operator_profile_id";

ALTER TABLE "damages" ADD COLUMN "responsible_operator_profile_id" UUID;
ALTER TABLE "damages" ADD COLUMN "tipo" TEXT;
ALTER TABLE "damages" ADD COLUMN "origem" TEXT;
ALTER TABLE "damages" ADD COLUMN "objeto" TEXT;
ALTER TABLE "damages" ADD COLUMN "identificacao_objeto" TEXT;
ALTER TABLE "damages" ADD COLUMN "analise_interna" TEXT;

CREATE INDEX "damages_responsible_operator_idx"
  ON "damages" ("tenant_id", "responsible_operator_profile_id");

ALTER TABLE "damages"
  ADD CONSTRAINT "damages_responsible_operator_fkey"
  FOREIGN KEY ("tenant_id", "responsible_operator_profile_id")
  REFERENCES "operator_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
