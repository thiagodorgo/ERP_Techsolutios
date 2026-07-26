-- Block Ω5P PR-06 (Recepção + Vistoria de entrada I3 + gatilho OS→custódia DURÁVEL + alocação atômica I1):
-- fecha a recepção. Três movimentos ADITIVOS / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva:
--   (1) CREATE TABLE "impound_intake_inspections" (vistoria de recepção, art. 9º I / art. 14) NOVA + índices
--       tenant-first + FK compostas tenant-first RESTRICT (I9) + @@unique(tenant,id)/(tenant,process) + CHECKs
--       estruturais + RLS ENABLE+FORCE+policy.
--   (2) ADD COLUMN aditivas NULLABLE (metadata-only, instantâneas): service_catalog.custody_profile_id (FK
--       composta → jurisdiction_profiles, RESTRICT, nullable = "esta OS abre custódia") + índice; e
--       jurisdiction_profiles.required_photo_sets JSONB (conjuntos fotográficos obrigatórios por perfil, I3;
--       NULL = default federal). Ambas nullable/sem default ⇒ retrocompat total, regressão ZERO.
--   (3) FK DURA yard_spots.(tenant_id,current_process_id) → impound_processes(tenant_id,id) RESTRICT: a vaga
--       referencia o processo custodiado (I1 real + I9). A alocação nunca teve wire HTTP até aqui (PR-01/04
--       ocupação read-only ⇒ current_process_id está NULL em 100% da base viva), então ADD CONSTRAINT é seguro.
--       Mesmo assim usamos NOT VALID + VALIDATE CONSTRAINT (padrão prudente do dba-guardião para FK numa tabela
--       viva): ADD ... NOT VALID não trava a tabela nem varre linhas; VALIDATE varre concorrentemente (SHARE
--       UPDATE EXCLUSIVE) e falha alto se houver órfão — em vez de rejeitar silenciosamente escritas futuras.
--
-- Enums em INGLÊS validados na APP (signature_status SIGNED|REFUSED|ABSENT; SET codes das fotos) — SEM CHECK de
-- enum no banco (padrão FASE0 §3.5). Labels PT-BR na fronteira do DTO. km = Decimal(10,1) (invariante da rodada).
-- tenant_id 1º em todo índice composto. RLS clona 20260836000000_add_impound:167-179.
--
-- CHECKs ESTRUTURAIS de impound_intake_inspections (NÃO enum-CHECK; belt-and-suspenders sobre o validator):
--   - completed coerente: vistoria marcada completa exige quem a completou (completed_at ⇒ completed_by).
--   - odômetro não-negativo: odometer_km IS NULL OR odometer_km >= 0.
--
-- Rollback (runbook — objetos NOVOS + colunas/constraint aditivas; reverter o PR remove tudo sem tocar dado):
--   ALTER TABLE "yard_spots" DROP CONSTRAINT IF EXISTS "yard_spots_tenant_id_current_process_id_fkey";
--   ALTER TABLE "service_catalog" DROP CONSTRAINT IF EXISTS "service_catalog_tenant_id_custody_profile_id_fkey";
--   DROP INDEX IF EXISTS "service_catalog_tenant_id_custody_profile_id_idx";
--   ALTER TABLE "service_catalog" DROP COLUMN IF EXISTS "custody_profile_id";
--   ALTER TABLE "jurisdiction_profiles" DROP COLUMN IF EXISTS "required_photo_sets";
--   DROP TABLE IF EXISTS "impound_intake_inspections" CASCADE;
-- (policies/índices/CHECKs da tabela nova caem junto com o DROP TABLE.)

-- ── (1) Vistoria de recepção ────────────────────────────────────────────────────────────────────────────────
-- CreateTable
CREATE TABLE "impound_intake_inspections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "inspected_at" TIMESTAMPTZ(6) NOT NULL,
    "agent_name" TEXT,
    "bodywork_state" TEXT,
    "paint_state" TEXT,
    "tires_state" TEXT,
    "internal_objects" TEXT,
    "missing_equipment" TEXT,
    "odometer_km" DECIMAL(10,1),
    "observations" TEXT,
    "signer_name" TEXT,
    "signature_status" TEXT NOT NULL DEFAULT 'ABSENT',
    "signed_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "completed_by" UUID,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "impound_intake_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "impound_intake_inspections_tenant_id_id_key" ON "impound_intake_inspections"("tenant_id", "id");
-- 1 vistoria por processo (@@unique tenant+process).
CREATE UNIQUE INDEX "impound_intake_inspections_tenant_id_process_id_key" ON "impound_intake_inspections"("tenant_id", "process_id");
CREATE INDEX "impound_intake_inspections_tenant_id_process_id_idx" ON "impound_intake_inspections"("tenant_id", "process_id");

-- AddForeignKey (compostas tenant-first; RESTRICT — I9: vistoria/processo não somem por cascade)
ALTER TABLE "impound_intake_inspections" ADD CONSTRAINT "impound_intake_inspections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_intake_inspections" ADD CONSTRAINT "impound_intake_inspections_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator).
ALTER TABLE "impound_intake_inspections"
  ADD CONSTRAINT "impound_intake_inspections_completed_chk"
  CHECK ("completed_at" IS NULL OR "completed_by" IS NOT NULL);
ALTER TABLE "impound_intake_inspections"
  ADD CONSTRAINT "impound_intake_inspections_odometer_chk"
  CHECK ("odometer_km" IS NULL OR "odometer_km" >= 0);

-- RLS por tabela (clona 20260836000000_add_impound:167-179).
ALTER TABLE "impound_intake_inspections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impound_intake_inspections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impound_intake_inspections_tenant_isolation" ON "impound_intake_inspections";
CREATE POLICY "impound_intake_inspections_tenant_isolation" ON "impound_intake_inspections"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── (2) Colunas aditivas nullable (gatilho OS→custódia + conjuntos obrigatórios por perfil) ─────────────────
-- AlterTable (ADD COLUMN nullable = metadata-only, instantâneo; retrocompat total).
ALTER TABLE "service_catalog" ADD COLUMN "custody_profile_id" UUID;
ALTER TABLE "jurisdiction_profiles" ADD COLUMN "required_photo_sets" JSONB;

-- CreateIndex (tenant-first) para o filtro do sweep e a FK.
CREATE INDEX "service_catalog_tenant_id_custody_profile_id_idx" ON "service_catalog"("tenant_id", "custody_profile_id");

-- AddForeignKey (composta tenant-first; RESTRICT — perfil referenciado por catálogo não some).
ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_tenant_id_custody_profile_id_fkey" FOREIGN KEY ("tenant_id", "custody_profile_id") REFERENCES "jurisdiction_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── (3) FK DURA da ocupação (I1 real): yard_spots.current_process_id → impound_processes ────────────────────
-- NOT VALID: adiciona a constraint sem varrer/travar a tabela viva (só valida escritas FUTURAS). current_process_id
-- está NULL em 100% da base (ocupação nunca teve wire de escrita), então nada é órfão.
ALTER TABLE "yard_spots" ADD CONSTRAINT "yard_spots_tenant_id_current_process_id_fkey" FOREIGN KEY ("tenant_id", "current_process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
-- VALIDATE: varre o backlog concorrentemente (SHARE UPDATE EXCLUSIVE) e falha alto se houver órfão. Como tudo é
-- NULL, valida instantaneamente e deixa a constraint plenamente válida (drift ZERO vs. a declaração Prisma).
ALTER TABLE "yard_spots" VALIDATE CONSTRAINT "yard_spots_tenant_id_current_process_id_fkey";
