-- Block Ω4C PR-02 (Contas a Pagar por ORIGEM): ALTER ADITIVA sobre financial_titles (tabela já existente).
-- Não cria tabela. Estritamente up-only / não-destrutiva.
--
-- (1) source_type / source_id — par GENÉRICO de proveniência de FROTA (fuel_log|maintenance_order|fine|
--     insurance_policy). Ambos NULLABLE, SEM backfill: coexiste com work_order_id/service_quote_id
--     (INTOCADOS) e com títulos avulsos (POST /financial-titles). SEM FK nativa ao alvo variável —
--     integridade é app-level (o resolveOwnership via service.get() do módulo-fonte dá 404 cross-tenant,
--     como party_id). source_type é TEXT (String no Prisma); source_id é UUID.
--
-- (2) ÍNDICE PARCIAL de idempotência anti-relançamento (D-Ω4C-FIN-ORIGEM): no MÁXIMO 1 título ATIVO por
--     (tenant, source_type, source_id, direção). Espelha financial_titles_wo_direction_active_key da
--     migration 20260811000000 (troca work_order_id → source_type/source_id). Um 2º POST /:module/:id/payable
--     na mesma fonte colide (P2002) e o serviço devolve 409 source_already_launched. `WHERE deleted_at IS
--     NULL` deixa de fora os títulos retirados (delete lógico), liberando RELANÇAR após retirar; `source_id
--     IS NOT NULL` deixa de fora os títulos de OS/avulsos, que nunca participam da idempotência por origem.
--
-- Aditivo puro (ADD COLUMN nullable + CREATE UNIQUE INDEX). As colunas herdam a RLS da tabela (mesma linha;
-- financial_titles já tem ENABLE/FORCE + policy financial_titles_tenant_isolation desde 20260810000000) —
-- nenhuma policy nova.
--
-- Rollback (ordem reversa; up-only por política — DROP só em rollback manual):
--   DROP INDEX IF EXISTS "financial_titles_source_direction_active_key";
--   ALTER TABLE "financial_titles" DROP COLUMN IF EXISTS "source_id";
--   ALTER TABLE "financial_titles" DROP COLUMN IF EXISTS "source_type";

ALTER TABLE "financial_titles" ADD COLUMN "source_type" TEXT;
ALTER TABLE "financial_titles" ADD COLUMN "source_id" UUID;

CREATE UNIQUE INDEX "financial_titles_source_direction_active_key"
  ON "financial_titles" ("tenant_id", "source_type", "source_id", "direction")
  WHERE "deleted_at" IS NULL AND "source_id" IS NOT NULL;
