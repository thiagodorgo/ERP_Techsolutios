-- Block Ω5P PR-02 (Perfis normativos): tabela "jurisdiction_profiles" — a parametrização NACIONAL white-label
-- do centro de custódia (ESTUDO §9). Um perfil por natureza (convênio público × contrato privado) carrega os
-- prazos legais (notificação ao proprietário, edital, elegibilidade de leilão, edital do leilão), o modelo e o
-- teto de diária, e o checklist de liberação. É a FONTE de verdade que o motor de diárias (charging PR-07, I4)
-- e os relógios do leilão (auction/notificações PR-09/12, I6) leem — via jurisdiction.defaults.ts.
--
-- ADITIVA / UP-ONLY (C7.5): 1 CREATE TABLE nova + índices + 1 FK composta tenant-first + RLS. Toque em tabela
-- existente = APENAS a back-relation implícita em "tenants" (nenhum DDL em tenants). NENHUMA coluna nova,
-- ALTER de coluna ou DROP em objeto existente; NENHUMA FK a partir de entidade inexistente (o ImpoundProcess é
-- PR-05; a referência ao perfil nasce lá, via @@unique([tenant_id, id]) forward-compat).
--
-- Enums em INGLÊS validados na APP (scope PUBLIC_AGREEMENT|PRIVATE_CONTRACT; daily_model ROLLING_24H|CALENDAR;
-- daily_cap SIX_MONTHS|THIRTY_DAYS_LEGACY|UNLIMITED) — SEM CHECK de enum no banco (padrão FASE0 §3.5). Labels
-- PT-BR na fronteira do DTO. Sem dinheiro/km nesta fatia (só prazos Int e enums; valores tarifários = tariffs).
--
-- CHECK ESTRUTURAL de integridade (NÃO enum-CHECK; mesmo espírito do yard_spots_status_process_coherence_chk do
-- PR-01 — belt-and-suspenders sobre a validação app-level, D-Ω5P-JUR-05): prazo <= 0 é impossível no domínio.
--
-- RLS ENABLE+FORCE+policy (USING + WITH CHECK em app.current_tenant_id) obrigatória — clonada de
-- 20260833000000_add_yard:138-157 (que clona 20260831000000_add_telemetry_events:75-80). tenant_id 1º em todo
-- índice composto.
--
-- Rollback (runbook — tabela NOVA; reverter o PR remove tudo sem afetar dado existente — não há toque DDL em
-- tabela pré-existente a desfazer):
--   DROP TABLE IF EXISTS "jurisdiction_profiles" CASCADE;
-- (policy, índices e CHECK caem junto da tabela.)

-- CreateTable
CREATE TABLE "jurisdiction_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "owner_notif_days" INTEGER NOT NULL DEFAULT 10,
    "notice_edict_day" INTEGER NOT NULL DEFAULT 30,
    "auction_eligible_day" INTEGER NOT NULL DEFAULT 60,
    "auction_edict_business_days" INTEGER NOT NULL DEFAULT 15,
    "daily_model" TEXT NOT NULL DEFAULT 'ROLLING_24H',
    "daily_cap" TEXT NOT NULL DEFAULT 'SIX_MONTHS',
    "release_requirements" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "jurisdiction_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jurisdiction_profiles_tenant_id_idx" ON "jurisdiction_profiles"("tenant_id");
CREATE INDEX "jurisdiction_profiles_tenant_id_scope_idx" ON "jurisdiction_profiles"("tenant_id", "scope");
CREATE INDEX "jurisdiction_profiles_tenant_id_active_idx" ON "jurisdiction_profiles"("tenant_id", "active");
-- forward-compat: habilita a FK composta do ImpoundProcess (PR-05, RN-JUR-01).
CREATE UNIQUE INDEX "jurisdiction_profiles_tenant_id_id_key" ON "jurisdiction_profiles"("tenant_id", "id");
-- chave natural (D-Ω5P-JUR-01): nome único por tenant, independe do scope (o scope é atributo, não identidade).
CREATE UNIQUE INDEX "jurisdiction_profiles_tenant_id_name_key" ON "jurisdiction_profiles"("tenant_id", "name");

-- AddForeignKey (tenant-first; tenant->RESTRICT — o perfil não pode órfão de tenant, nem some com ele)
ALTER TABLE "jurisdiction_profiles" ADD CONSTRAINT "jurisdiction_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK estrutural de integridade (NÃO enum-CHECK; D-Ω5P-JUR-05): todo prazo > 0. Belt-and-suspenders sobre o
-- parsePositiveDeadline do validator (app-level primário). Os enums (scope/daily_model/daily_cap) NÃO têm CHECK.
ALTER TABLE "jurisdiction_profiles"
  ADD CONSTRAINT "jurisdiction_profiles_positive_deadlines_chk"
  CHECK (
    "owner_notif_days" > 0
    AND "notice_edict_day" > 0
    AND "auction_eligible_day" > 0
    AND "auction_edict_business_days" > 0
  );

-- RLS (clona 20260833000000_add_yard:138-157).
ALTER TABLE "jurisdiction_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jurisdiction_profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jurisdiction_profiles_tenant_isolation" ON "jurisdiction_profiles";
CREATE POLICY "jurisdiction_profiles_tenant_isolation" ON "jurisdiction_profiles"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
