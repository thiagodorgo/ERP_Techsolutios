-- Block Ω5P PR-18a (authority-portal, superfície CREDENCIADA): tabela NOVA "authority_credentials" — a 1ª ENTIDADE
-- de identidade da AUTORIDADE SOLICITANTE (persona credenciada do 2º PWA público). PRÓPRIA e ISOLADA (D-Ω5P-AUTH-01):
-- ≠ users/auth_sessions/Cognito do ERP e ≠ posse do owner. NÃO recebe roles/permissions do ERP e NÃO alcança
-- /api/v1 — só autentica a sessão JWE do authority-portal. + WIDENING ADITIVO do CHECK de allowlist de action de
-- "portal_access_logs" (+ 'LOGIN' — a tentativa de login do authority-portal, I10).
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só:
--   (1) CREATE TABLE "authority_credentials" (NOVA) + índices tenant-first + FK tenant RESTRICT (I9) +
--       @@unique(tenant,id) + UNIQUE(tenant,username) (chave natural de login) + CHECKs estruturais + RLS.
--   (2) WIDENING de 1 CHECK de "portal_access_logs" (DROP + re-ADD MAIS LARGO): alargar um CHECK só ACEITA mais —
--       jamais reprova linha existente (não-destrutivo). Nenhuma coluna/tabela existente é alterada.
--   Back-relation no schema Prisma (Tenant.authority_credentials) é metadata-only; nenhuma coluna nova em tabela
--   existente.
--
-- TABELA MUTÁVEL — SEM TRIGGER APPEND-ONLY (justificado, D-Ω5P-AUTH-01/05): diferente de portal_access_logs e
-- custody_events (imutáveis por serem PROVA), a authority_credentials é ESTADO OPERACIONAL que MUDA por desenho —
-- rotação de senha (password_hash) e lockout (failed_login_count/locked_until/last_login_at). Um trigger
-- append-only aqui IMPEDIRIA o próprio mecanismo de segurança (contador de falhas + lockout persistente). A
-- trilha PROBATÓRIA do ACESSO vive no PortalAccessLog (append-only, ação 'LOGIN'); as escritas de PROVISIONAMENTO
-- (create/rotate/suspend/revoke) são auditadas pela auditoria global do ERP (Ω4C). Integridade do dado sensível =
-- RLS FORCE + hash scrypt + nunca servir o hash.
--
-- Enums em INGLÊS validados na APP (status ACTIVE|SUSPENDED|REVOKED) — SEM enum-CHECK amplo (padrão FASE0 §3.5),
-- MAS com CHECK ESTRUTURAL de domínio pequeno/estável (belt-and-suspenders, espelha portal_access_logs_portal_chk).
-- tenant_id 1º em todo índice composto. RLS clona 20260847000000/20260848000000.
--
-- §2.8 / RN-POR-02 (MINIMIZAÇÃO): password_hash = scrypt self-describing (node:crypto, params OWASP —
-- PD-Ω5P-AUTH-SCRYPT) — NUNCA a senha em claro, NUNCA servido em resposta/log. authority_name = nome do ÓRGÃO (não
-- pessoal, white-label). Nenhum dado pessoal do agente. UNIQUE(tenant_id, username) é a chave natural do login.
--
-- Rollback (runbook — tabela NOVA + reverter o widening ao domínio anterior):
--   DROP TABLE IF EXISTS "authority_credentials" CASCADE;
--   ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
--   ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_action_chk"
--     CHECK ("action" IN ('CHALLENGE_ISSUED','LOOKUP','DOSSIER_VIEWED','RELEASE_REQUESTED'));
-- (índices, UNIQUEs, CHECKs e policy da tabela nova caem junto do DROP TABLE. Reverter o widening exige que não
--  haja linha com a ação nova 'LOGIN' — reverter o PR remove-as junto.)

-- CreateTable
CREATE TABLE "authority_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "authority_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "authority_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "authority_credentials_tenant_id_id_key" ON "authority_credentials"("tenant_id", "id");
-- Chave natural do LOGIN: no máx. 1 credencial por (tenant, username). É a barreira ATÔMICA anti-duplicata.
CREATE UNIQUE INDEX "authority_credentials_tenant_id_username_key" ON "authority_credentials"("tenant_id", "username");
CREATE INDEX "authority_credentials_tenant_id_status_idx" ON "authority_credentials"("tenant_id", "status");

-- AddForeignKey (tenant-first; RESTRICT — I9: nada cascateia; a credencial some só por revogação lógica/DROP do PR)
ALTER TABLE "authority_credentials" ADD CONSTRAINT "authority_credentials_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS (domínios pequenos e estáveis; belt-and-suspenders sobre o validator da APP).
ALTER TABLE "authority_credentials"
  ADD CONSTRAINT "authority_credentials_status_chk" CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'REVOKED'));
-- Contador nunca negativo (invariante do lockout).
ALTER TABLE "authority_credentials"
  ADD CONSTRAINT "authority_credentials_failed_login_count_chk" CHECK ("failed_login_count" >= 0);

-- RLS (clona 20260847000000_add_portal_access_log). O console/BFF escreve/lê SEMPRE sob withTenantRls(tenant
-- vinculado); jamais vê a credencial de outro tenant (mata a enumeração cross-tenant no login e no provisionamento).
ALTER TABLE "authority_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "authority_credentials" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authority_credentials_tenant_isolation" ON "authority_credentials";
CREATE POLICY "authority_credentials_tenant_isolation" ON "authority_credentials"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── WIDENING ADITIVO do CHECK de allowlist de action de "portal_access_logs" (I10) ──────────────────────────────
-- PR-18a acrescenta a ação LOGIN (tentativa de login do authority-portal). Alargar um CHECK ACEITA mais — nunca
-- reprova linha existente (não-destrutivo). DROP + re-ADD é o único caminho de alterar um CHECK no Postgres. O CHECK
-- de outcome NÃO existe no banco (outcome é app-validado); o process_found_chk NÃO muda (LOGIN nunca amarra bem →
-- process_id sempre NULL, já satisfeito por "process_id IS NULL").
ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_action_chk"
  CHECK ("action" IN ('CHALLENGE_ISSUED', 'LOOKUP', 'DOSSIER_VIEWED', 'RELEASE_REQUESTED', 'LOGIN'));
