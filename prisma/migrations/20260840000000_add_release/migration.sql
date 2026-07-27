-- Block Ω5P PR-10a (Liberação do veículo — núcleo I5): tabelas "impound_releases" (dossiê da liberação:
-- quem-retira + aprovação da autoridade in-system + snapshot do total quitado) e "release_requirement_checks"
-- (checklist de liberação SNAPSHOT do perfil no ato — I9: história congelada mesmo se o perfil mudar). A PROVA
-- de integridade da liberação vive no CustodyEvent RELEASE (append-only, migração 20260836000000), escrito na
-- MESMA tx da consumação; estas 2 tabelas são o registro-prova durável (RLS, retido >=5 anos — I9).
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só CREATE TABLE novas +
-- back-relation aditiva em impound_processes (metadata-only no Prisma; nenhuma coluna em tabela existente):
--   CREATE TABLE "impound_releases", "release_requirement_checks" (NOVAS) + índices tenant-first + FK compostas
--   tenant-first RESTRICT (I9) + @@unique(tenant,id) + índice PARCIAL único anti-dupla-liberação (raw-only) +
--   CHECKs estruturais + RLS ENABLE+FORCE+policy.
--
-- Enums em INGLÊS validados na APP (kind STANDARD|FOR_REPAIR; status IN_PROGRESS|AUTHORIZED|COMPLETED|RETURNED;
-- recipient_relationship OWNER|ATTORNEY|THIRD_PARTY) — SEM CHECK de enum no banco (padrão FASE0 §3.5). Labels
-- PT-BR no DTO. Dinheiro = Decimal(12,2) (invariante da rodada). tenant_id 1º em todo índice composto. RLS clona
-- 20260839000000_add_process_notifications:73-78.
--
-- ANTI-DUPLA-LIBERAÇÃO (D-Ω5P-REL-01) = índice PARCIAL único (tenant_id, process_id) WHERE status IN
-- ('IN_PROGRESS','AUTHORIZED') — no máximo 1 liberação EM CURSO por processo (raw-only, não declarado no Prisma
-- model — como todos os partial-unique da casa: process_charges_daily_idem_key / process_notifications_kind_idem_key).
-- COMPLETED/RETURNED (terminais) não travam nova tentativa; o próprio RELEASED ser sink (I9) é o backstop final.
--
-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator). IS NOT NULL EXPLÍCITO (lição
-- PR-07 C1 / lógica-3-valores do Postgres): sem ele, um COMPLETED com released_at/settled_total NULL passaria
-- (NULL → CHECK não reprova). Espelha process_notifications_issued_shape_chk / IntakeInspection completed⇒completed_by.
--   - impound_releases: status COMPLETED ⇒ released_at E settled_total NOT NULL; aprovação carimbada ⇒ approver NOT NULL.
--   - release_requirement_checks: satisfied=true ⇒ checked_at NOT NULL.
--
-- Rollback (runbook — objetos NOVOS; reverter o PR remove tudo sem tocar dado existente):
--   DROP TABLE IF EXISTS "release_requirement_checks" CASCADE;
--   DROP TABLE IF EXISTS "impound_releases" CASCADE;
-- (policies, índices, partial-unique e CHECKs das tabelas novas caem junto do DROP TABLE. release_requirement_checks
-- ANTES de impound_releases: FK composta RESTRICT filha→mãe.)

-- CreateTable
CREATE TABLE "impound_releases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "authority_approved_by" UUID,
    "authority_approved_at" TIMESTAMPTZ(6),
    "authority_reference" TEXT,
    "authority_note" TEXT,
    "recipient_name" TEXT,
    "recipient_document" TEXT,
    "recipient_relationship" TEXT,
    "released_at" TIMESTAMPTZ(6),
    "repair_deadline" TIMESTAMPTZ(6),
    "settled_total" DECIMAL(12,2),
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "impound_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_requirement_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "satisfied" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "attachment_id" UUID,
    "checked_by" UUID,
    "checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "release_requirement_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "impound_releases_tenant_id_id_key" ON "impound_releases"("tenant_id", "id");
CREATE INDEX "impound_releases_tenant_id_process_id_idx" ON "impound_releases"("tenant_id", "process_id");
CREATE INDEX "impound_releases_tenant_id_status_idx" ON "impound_releases"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "release_requirement_checks_tenant_id_id_key" ON "release_requirement_checks"("tenant_id", "id");
CREATE UNIQUE INDEX "release_requirement_checks_tenant_id_release_id_code_key" ON "release_requirement_checks"("tenant_id", "release_id", "code");
CREATE INDEX "release_requirement_checks_tenant_id_release_id_idx" ON "release_requirement_checks"("tenant_id", "release_id");

-- Anti-dupla-liberação (D-Ω5P-REL-01): índice PARCIAL único (tenant, process) WHERE status IN curso — no máx. 1
-- liberação EM CURSO por processo. Raw-only (Prisma não modela índice parcial ⇒ sem drift). 2ª tentativa de abrir
-- liberação com uma já em curso → 23505 → 409 release_already_in_progress (checado sob FOR UPDATE no repo).
CREATE UNIQUE INDEX "impound_releases_active_release_key"
  ON "impound_releases"("tenant_id", "process_id")
  WHERE "status" IN ('IN_PROGRESS', 'AUTHORIZED');

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — I9: nada de custódia cascateia; retenção >=5 anos)
ALTER TABLE "impound_releases" ADD CONSTRAINT "impound_releases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_releases" ADD CONSTRAINT "impound_releases_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_requirement_checks" ADD CONSTRAINT "release_requirement_checks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_requirement_checks" ADD CONSTRAINT "release_requirement_checks_tenant_id_release_id_fkey" FOREIGN KEY ("tenant_id", "release_id") REFERENCES "impound_releases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator; IS NOT NULL EXPLÍCITO — lição PR-07 C1).
-- COMPLETED exige o comprovante de saída (released_at) E o snapshot do total quitado (settled_total).
ALTER TABLE "impound_releases"
  ADD CONSTRAINT "impound_releases_completed_shape_chk"
  CHECK ("status" <> 'COMPLETED' OR ("released_at" IS NOT NULL AND "settled_total" IS NOT NULL));
-- Aprovação carimbada exige o ator aprovador (não-repúdio do ato da autoridade — D-Ω5P-12).
ALTER TABLE "impound_releases"
  ADD CONSTRAINT "impound_releases_authority_shape_chk"
  CHECK ("authority_approved_at" IS NULL OR "authority_approved_by" IS NOT NULL);
-- satisfied=true exige o carimbo de quem/quando verificou (trilha do requisito).
ALTER TABLE "release_requirement_checks"
  ADD CONSTRAINT "release_requirement_checks_satisfied_shape_chk"
  CHECK ("satisfied" = false OR "checked_at" IS NOT NULL);

-- RLS por tabela (clona 20260839000000_add_process_notifications:73-78).
ALTER TABLE "impound_releases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impound_releases" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impound_releases_tenant_isolation" ON "impound_releases";
CREATE POLICY "impound_releases_tenant_isolation" ON "impound_releases"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "release_requirement_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "release_requirement_checks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "release_requirement_checks_tenant_isolation" ON "release_requirement_checks";
CREATE POLICY "release_requirement_checks_tenant_isolation" ON "release_requirement_checks"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
