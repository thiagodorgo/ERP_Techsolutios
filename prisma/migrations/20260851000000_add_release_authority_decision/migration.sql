-- Block Ω5P PR-19 (authority-portal, superfície CREDENCIADA) — a autoridade APROVA/REJEITA a liberação in-system,
-- só nos processos que ELA PRÓPRIA originou (D-Ω5P-AUTH-08: vinculação por proveniência via
-- AuthorityRemovalRequest.credential_id → work_order_id → ImpoundProcess.service_order_id). A aprovação portal
-- SOMA-SE ao stand-in release:approve (D-Ω5P-AUTH-09) — não o substitui. A rejeição NÃO cabe na FSM de
-- ImpoundRelease (D-Ω5P-AUTH-10): não muda o status do dossiê, só grava uma decisão formal append-only.
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só:
--   (1) ALTER "impound_releases" ADD COLUMN "authority_credential_id" (NULLABLE) + FK COMPOSTA tenant-first RESTRICT
--       → authority_credentials + índice tenant-first. Coluna nova NULLABLE não quebra nenhuma linha existente.
--   (2) CREATE TABLE "release_authority_decisions" (NOVA) — append-only (trigger BEFORE UPDATE OR DELETE, espelha
--       custody_events/portal_access_logs) + CHECK de decision + FK COMPOSTAS tenant-first RESTRICT (I9) →
--       tenants + impound_releases + authority_credentials + RLS ENABLE+FORCE+POLICY.
--   (3) WIDENING ADITIVO do CHECK de action de "portal_access_logs" (+ 'RELEASE_DECIDED' — alargar um CHECK só
--       ACEITA mais, jamais reprova linha existente).
--   (4) WIDENING ADITIVO do CHECK "impound_releases_authority_shape_chk" (20260840000000): a via do portal aprova
--       SEM actorId (authority_approved_by fica NULL de propósito — D-Ω5P-AUTH-09) e carimba authority_credential_id
--       no lugar; o CHECK original (authority_approved_at IS NULL OR authority_approved_by IS NOT NULL) rejeitaria
--       essa linha. Alargar p/ aceitar authority_approved_by OU authority_credential_id (qualquer um identifica o
--       ATO) — só ACEITA mais, nenhuma linha existente (que sempre tem authority_approved_by) deixa de satisfazer.
--   (5) WIDENING ADITIVO do CHECK "portal_access_logs_process_found_chk" (20260847/48): RELEASE_DECIDED loga
--       process_id CONFIRMADO (I10) com outcome APPROVED|REJECTED (nunca em SESSION_INVALID/NOT_FOUND — ver
--       authority-release-approval.service.ts). Alargar p/ aceitar os 2 novos outcomes — só ACEITA mais.
--
-- §2.8 / RN-POR-02 (MINIMIZAÇÃO): reference/note da decisão NUNCA vão ao PortalAccessLog (só o outcome
-- APPROVED/REJECTED + o process_id, já uma FK composta tenant-first RESTRICT existente na tabela).
--
-- Rollback (runbook — tabela NOVA + coluna NOVA nullable + reverter os 2 widenings ao domínio anterior):
--   ALTER TABLE "impound_releases" DROP CONSTRAINT IF EXISTS "impound_releases_tenant_id_authority_credential_id_fkey";
--   DROP INDEX IF EXISTS "impound_releases_tenant_id_authority_credential_id_idx";
--   ALTER TABLE "impound_releases" DROP COLUMN IF EXISTS "authority_credential_id";
--   DROP TABLE IF EXISTS "release_authority_decisions" CASCADE;
--   ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
--   ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_action_chk"
--     CHECK ("action" IN ('CHALLENGE_ISSUED','LOOKUP','DOSSIER_VIEWED','RELEASE_REQUESTED','LOGIN','REMOVAL_REQUESTED'));
--   ALTER TABLE "impound_releases" DROP CONSTRAINT IF EXISTS "impound_releases_authority_shape_chk";
--   ALTER TABLE "impound_releases" ADD CONSTRAINT "impound_releases_authority_shape_chk"
--     CHECK ("authority_approved_at" IS NULL OR "authority_approved_by" IS NOT NULL);
--   ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_process_found_chk";
--   ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_process_found_chk"
--     CHECK ("process_id" IS NULL OR "outcome" IN ('FOUND', 'AUTHORIZED'));
-- (reverter os widenings exige que não haja linha com a ação nova 'RELEASE_DECIDED' nem aprovação SÓ por
--  authority_credential_id — reverter o PR remove-as junto.)

-- ── (1) ALTER impound_releases: coluna NOVA (proveniência do ATO da autoridade via portal) ─────────────────────
ALTER TABLE "impound_releases" ADD COLUMN "authority_credential_id" UUID;

CREATE INDEX "impound_releases_tenant_id_authority_credential_id_idx" ON "impound_releases"("tenant_id", "authority_credential_id");

ALTER TABLE "impound_releases" ADD CONSTRAINT "impound_releases_tenant_id_authority_credential_id_fkey"
  FOREIGN KEY ("tenant_id", "authority_credential_id") REFERENCES "authority_credentials"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── (2) CREATE TABLE release_authority_decisions (NOVA, append-only) ────────────────────────────────────────────
CREATE TABLE "release_authority_decisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "credential_id" UUID NOT NULL,
    "decision" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "decided_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "release_authority_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "release_authority_decisions_tenant_id_id_key" ON "release_authority_decisions"("tenant_id", "id");
CREATE INDEX "release_authority_decisions_tenant_id_release_id_idx" ON "release_authority_decisions"("tenant_id", "release_id");
CREATE INDEX "release_authority_decisions_tenant_id_credential_id_idx" ON "release_authority_decisions"("tenant_id", "credential_id");

-- AddForeignKey (COMPOSTAS tenant-first; RESTRICT — I9: nada cascateia)
ALTER TABLE "release_authority_decisions" ADD CONSTRAINT "release_authority_decisions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_authority_decisions" ADD CONSTRAINT "release_authority_decisions_tenant_id_release_id_fkey" FOREIGN KEY ("tenant_id", "release_id") REFERENCES "impound_releases"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "release_authority_decisions" ADD CONSTRAINT "release_authority_decisions_tenant_id_credential_id_fkey" FOREIGN KEY ("tenant_id", "credential_id") REFERENCES "authority_credentials"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK ESTRUTURAL (domínio pequeno e estável).
ALTER TABLE "release_authority_decisions"
  ADD CONSTRAINT "release_authority_decisions_decision_chk" CHECK ("decision" IN ('APPROVED', 'REJECTED'));

-- TRIGGER append-only (espelha custody_events_block_mutation / 20260836000000). Bloqueia QUALQUER UPDATE/DELETE: a
-- decisão da autoridade é um ATO — nunca editado/apagado. A role da app (NOSUPERUSER) não contorna; manutenção usa
-- session_replication_role=replica (só superuser; o trigger não dispara em modo replica).
CREATE OR REPLACE FUNCTION release_authority_decisions_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'release_authority_decisions is append-only: % is forbidden. The decision is a formal act and cannot be edited or removed.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "release_authority_decisions_block_mutation"
  BEFORE UPDATE OR DELETE ON "release_authority_decisions"
  FOR EACH ROW EXECUTE FUNCTION release_authority_decisions_block_mutation();

-- RLS (clona 20260850000000_add_authority_removal_request). O BFF/console escreve/lê SEMPRE sob
-- withTenantRls(tenant vinculado); jamais vê a decisão de outro tenant (mata cross-tenant).
ALTER TABLE "release_authority_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "release_authority_decisions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "release_authority_decisions_tenant_isolation" ON "release_authority_decisions";
CREATE POLICY "release_authority_decisions_tenant_isolation" ON "release_authority_decisions"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── (3) WIDENING ADITIVO do CHECK de allowlist de action de "portal_access_logs" (I10) ──────────────────────────
-- PR-19 acrescenta a ação RELEASE_DECIDED (decisão APPROVE/REJECT registrada). Alargar um CHECK ACEITA mais —
-- nunca reprova linha existente (não-destrutivo). DROP + re-ADD é o único caminho de alterar um CHECK no Postgres.
ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_action_chk"
  CHECK ("action" IN ('CHALLENGE_ISSUED', 'LOOKUP', 'DOSSIER_VIEWED', 'RELEASE_REQUESTED', 'LOGIN', 'REMOVAL_REQUESTED', 'RELEASE_DECIDED'));

-- ── (4) WIDENING ADITIVO do CHECK impound_releases_authority_shape_chk (20260840000000) ──────────────────────────
-- A via do authority-portal aprova SEM actorId (authority_approved_by fica NULL de propósito — D-Ω5P-AUTH-09) e
-- carimba authority_credential_id no lugar. Alargar p/ aceitar QUALQUER UM dos dois identificando o ato — jamais
-- reprova uma linha existente (toda linha pré-PR-19 tem authority_approved_by setado quando aprovada).
ALTER TABLE "impound_releases" DROP CONSTRAINT IF EXISTS "impound_releases_authority_shape_chk";
ALTER TABLE "impound_releases"
  ADD CONSTRAINT "impound_releases_authority_shape_chk"
  CHECK ("authority_approved_at" IS NULL OR "authority_approved_by" IS NOT NULL OR "authority_credential_id" IS NOT NULL);

-- ── (5) WIDENING ADITIVO do CHECK portal_access_logs_process_found_chk (20260847000000/20260848000000) ──────────
-- RELEASE_DECIDED loga process_id (CONFIRMADO, nunca cru) com outcome APPROVED|REJECTED. Alargar p/ aceitar os 2
-- novos outcomes — só ACEITA mais, nenhuma linha existente deixa de satisfazer.
ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_process_found_chk";
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_process_found_chk"
  CHECK ("process_id" IS NULL OR "outcome" IN ('FOUND', 'AUTHORIZED', 'APPROVED', 'REJECTED'));
