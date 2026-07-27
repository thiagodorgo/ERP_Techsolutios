-- Block Ω5P PR-07 (Motor de diárias I4 + LEDGER de encargos): tabelas "process_charges" (ledger amount-imutável,
-- base de cálculo da guia/quitação) e "daily_accrual_runs" (bookkeeping do sweep) + 1 coluna ADITIVA nullable
-- em jurisdiction_profiles (ponteiro do serviço-tarifa "diária"). É a materialização consultável do acumulador
-- de diárias; a PROVA vive no CustodyEvent CHARGE_ACCRUAL (append-only, migração 20260836000000), escrito na
-- MESMA tx do INSERT deste ledger.
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva:
--   (1) CREATE TABLE "process_charges", "daily_accrual_runs" (NOVAS) + índices tenant-first + FK compostas
--       tenant-first RESTRICT (I9) + @@unique(tenant,id) + CHECKs estruturais + partial-uniques de idempotência
--       + RLS ENABLE+FORCE+policy.
--   (2) ADD COLUMN aditiva NULLABLE-sem-default (metadata-only, instantânea): jurisdiction_profiles.
--       daily_service_catalog_id (FK composta → service_catalog, RESTRICT). NULL ⇒ fail-closed (o motor não
--       cobra 0 em silêncio). Retrocompat total, regressão ZERO. Mesmo trilho ADD-COLUMN-nullable do PR-06.
--
-- Enums em INGLÊS validados na APP (kind REMOVAL|DAILY|ADDITIONAL|ADJUSTMENT; status running|completed|failed)
-- — SEM CHECK de enum no banco (padrão FASE0 §3.5). Labels PT-BR no DTO. Dinheiro = Decimal(12,2) (invariante da
-- rodada). tenant_id 1º em todo índice composto. RLS clona 20260833000000_add_yard:138-157.
--
-- IDEMPOTÊNCIA da diária (D-Ω5P-CHG-02) = índice PARCIAL único (tenant_id, process_id, period_seq) WHERE
-- kind='DAILY' (raw-only, padrão yard_spots_current_process_key / impound_processes_tenant_service_order_key).
-- É o period_seq (ordinal monotônico DST-IMUNE), NÃO a chave chapada (tenant,process,kind,ref_date) do prompt
-- §6.5 — essa colidiria sob ADJUSTMENT repetido na MESMA ref_date (furaria RN-DIA-05) e é frágil a colisão de
-- data por DST. ref_date fica como legenda humana/legal. A REMOVAL tem partial-unique próprio (no máx. 1
-- encargo-base de remoção por processo).
--
-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator):
--   - quantity >= 0; unit_amount >= 0.
--   - DAILY ⇒ period_seq >= 1 AND ref_date IS NOT NULL (a diária SEMPRE tem ordinal + legenda).
--   - total_amount >= 0 CONDICIONAL por kind: relaxado só p/ ADJUSTMENT (que carrega delta COM SINAL —
--     D-Ω5P-CHG-04); os demais kinds nunca são negativos.
--
-- Rollback (runbook — objetos NOVOS + coluna aditiva; reverter o PR remove tudo sem tocar dado existente):
--   ALTER TABLE "jurisdiction_profiles" DROP CONSTRAINT IF EXISTS "jurisdiction_profiles_tenant_id_daily_service_catalog_id_fkey";
--   ALTER TABLE "jurisdiction_profiles" DROP COLUMN IF EXISTS "daily_service_catalog_id";
--   DROP TABLE IF EXISTS "process_charges", "daily_accrual_runs" CASCADE;
-- (policies, índices, partial-uniques e CHECKs das tabelas novas caem junto do DROP TABLE.)

-- ── (1) LEDGER de encargos + bookkeeping do sweep ───────────────────────────────────────────────────────────
-- CreateTable
CREATE TABLE "process_charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "period_seq" INTEGER,
    "ref_date" DATE,
    "description" TEXT,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "tariff_id" UUID,
    "adjustment_of_charge_id" UUID,
    "settled_at" TIMESTAMPTZ(6),
    "settlement_note" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "process_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_accrual_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "run_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "accrued_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "daily_accrual_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "process_charges_tenant_id_id_key" ON "process_charges"("tenant_id", "id");
CREATE INDEX "process_charges_tenant_id_process_id_idx" ON "process_charges"("tenant_id", "process_id");
CREATE INDEX "process_charges_tenant_id_process_id_kind_idx" ON "process_charges"("tenant_id", "process_id", "kind");
CREATE INDEX "process_charges_tenant_id_kind_idx" ON "process_charges"("tenant_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "daily_accrual_runs_tenant_id_id_key" ON "daily_accrual_runs"("tenant_id", "id");
CREATE INDEX "daily_accrual_runs_tenant_id_run_date_idx" ON "daily_accrual_runs"("tenant_id", "run_date");

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — I9: nada de custódia cascateia)
ALTER TABLE "process_charges" ADD CONSTRAINT "process_charges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "process_charges" ADD CONSTRAINT "process_charges_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_accrual_runs" ADD CONSTRAINT "daily_accrual_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Idempotência da diária (D-Ω5P-CHG-02): índice PARCIAL único por period_seq (raw-only, não declarado no Prisma
-- model — como todos os partial-unique da casa). 2ª acumulação da MESMA diária → 23505 → engolida sob o lock.
CREATE UNIQUE INDEX "process_charges_daily_idem_key"
  ON "process_charges"("tenant_id", "process_id", "period_seq")
  WHERE "kind" = 'DAILY';
-- No máx. 1 encargo-base de remoção por processo (raw-only).
CREATE UNIQUE INDEX "process_charges_removal_once_key"
  ON "process_charges"("tenant_id", "process_id")
  WHERE "kind" = 'REMOVAL';

-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator).
ALTER TABLE "process_charges"
  ADD CONSTRAINT "process_charges_quantity_chk"
  CHECK ("quantity" >= 0);
ALTER TABLE "process_charges"
  ADD CONSTRAINT "process_charges_unit_amount_chk"
  CHECK ("unit_amount" >= 0);
-- DAILY sempre tem ordinal + legenda de data. period_seq IS NOT NULL EXPLÍCITO: sem ele, a lógica-3-valores do
-- Postgres deixa passar um DAILY com period_seq NULL (`false OR (NULL AND true)` = NULL → CHECK NÃO reprova), e o
-- partial-unique trata NULLs como distintos → idempotência da diária BURLADA (dupla cobrança). Fecha o furo (C1).
ALTER TABLE "process_charges"
  ADD CONSTRAINT "process_charges_daily_shape_chk"
  CHECK ("kind" <> 'DAILY' OR ("period_seq" IS NOT NULL AND "period_seq" >= 1 AND "ref_date" IS NOT NULL));
-- total_amount >= 0 CONDICIONAL por kind (relaxado só p/ ADJUSTMENT, que carrega delta com sinal — D-Ω5P-CHG-04).
ALTER TABLE "process_charges"
  ADD CONSTRAINT "process_charges_total_amount_chk"
  CHECK ("kind" = 'ADJUSTMENT' OR "total_amount" >= 0);

-- RLS por tabela (clona 20260833000000_add_yard:138-157).
ALTER TABLE "process_charges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_charges" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "process_charges_tenant_isolation" ON "process_charges";
CREATE POLICY "process_charges_tenant_isolation" ON "process_charges"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "daily_accrual_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "daily_accrual_runs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_accrual_runs_tenant_isolation" ON "daily_accrual_runs";
CREATE POLICY "daily_accrual_runs_tenant_isolation" ON "daily_accrual_runs"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── (2) Coluna aditiva nullable: ponteiro do serviço-tarifa "diária" (D-Ω5P-CHG-01) ─────────────────────────
-- ADD COLUMN nullable-sem-default = metadata-only, instantâneo; retrocompat total. NULL ⇒ fail-closed no motor.
ALTER TABLE "jurisdiction_profiles" ADD COLUMN "daily_service_catalog_id" UUID;

-- CreateIndex (tenant-first) para a FK/consulta.
CREATE INDEX "jurisdiction_profiles_tenant_id_daily_service_catalog_id_idx" ON "jurisdiction_profiles"("tenant_id", "daily_service_catalog_id");

-- AddForeignKey (composta tenant-first; RESTRICT). Coluna nasce 100% NULL, mas usamos NOT VALID + VALIDATE
-- (trilho prudente do dba-guardião p/ FK em tabela viva): ADD ... NOT VALID pega ACCESS EXCLUSIVE breve sem
-- varrer; VALIDATE varre concorrentemente (SHARE UPDATE EXCLUSIVE) e falha alto se houver órfão — como tudo é
-- NULL, valida instantaneamente e a constraint fica plenamente válida (drift ZERO vs. a declaração Prisma).
ALTER TABLE "jurisdiction_profiles" ADD CONSTRAINT "jurisdiction_profiles_tenant_id_daily_service_catalog_id_fkey" FOREIGN KEY ("tenant_id", "daily_service_catalog_id") REFERENCES "service_catalog"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
ALTER TABLE "jurisdiction_profiles" VALIDATE CONSTRAINT "jurisdiction_profiles_tenant_id_daily_service_catalog_id_fkey";
