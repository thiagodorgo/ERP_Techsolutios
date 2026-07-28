-- Block Ω5P PR-16 (owner-portal, superfície PÚBLICA): tabela "portal_access_logs" — trilha probatória IMUTÁVEL
-- de TODO acesso à(s) superfície(s) pública(s) do módulo Pátios (I10 + modelo de ameaças ESTUDO §7). É o
-- registro forense: quem consultou o quê, quando, de onde — sem NUNCA guardar os dados crus.
--
-- ADITIVA / UP-ONLY (C7.5): CREATE TABLE da tabela NOVA + índices tenant-first + FK compostas tenant-first +
-- CHECKs estruturais + TRIGGER append-only + RLS. Toque em tabela existente = ZERO (só back-relations no schema
-- Prisma — Tenant.portal_access_logs, ImpoundProcess.portal_access_logs; nenhuma coluna/ALTER/DROP).
--
-- §2.8 / RN-POR-02 (MINIMIZAÇÃO — INQUEBRÁVEL): a tabela NUNCA guarda placa/Renavam/IP CRUS. Só HMAC:
--   query_fingerprint = HMAC_SHA256(PORTAL_LOG_SECRET, normalize(placa)‖Renavam) — correlaciona a MESMA consulta
--     sem reconstituir os fatores; ip_hash = HMAC_SHA256(PORTAL_LOG_SECRET, ip). Sem dado pessoal do proprietário.
--   O `outcome` (FOUND/NOT_FOUND/FACTOR_MISMATCH/RATE_LIMITED/CHALLENGE_FAILED/ISSUED) é INTERNO — a resposta
--   pública é UNIFORME (NOT_FOUND ≡ FACTOR_MISMATCH). O log NUNCA é servido em superfície pública.
--
-- Enums em INGLÊS validados na APP (portal/action/outcome) — SEM enum-CHECK amplo no banco (padrão FASE0 §3.5).
-- CHECKs ESTRUTURAIS (belt-and-suspenders, espírito de impound_processes_identity_chk):
--   - portal IN ('OWNER','AUTHORITY'); action IN ('CHALLENGE_ISSUED','LOOKUP') — domínios pequenos e estáveis.
--   - process_id só aponta processo quando o desfecho foi FOUND (I9: só o acesso que RESOLVEU referencia o bem).
--
-- I10 (append-only, IMUTÁVEL) — TRIGGER "portal_access_logs_block_mutation" BEFORE UPDATE OR DELETE →
--   RAISE EXCEPTION: nenhuma linha pode ser mutada/apagada pela role da app (NOSUPERUSER). Espelha o padrão de
--   custody_events (20260836000000). Retenção: a tabela guarda só HMAC/hash (SEM PII), logo a imutabilidade não
--   conflita com o direito ao esquecimento (LGPD art.18 — não há dado pessoal a apagar). Manutenção/teardown usa
--   session_replication_role=replica (só superuser) — a role da app permanece bloqueada.
--   process → RESTRICT (NÃO Cascade): apagar um processo com acessos logados falha; a trilha nunca cascateia (I9).
--
-- RLS ENABLE+FORCE+POLICY (USING + WITH CHECK em app.current_tenant_id) — o portal escreve/lê SEMPRE sob
-- withTenantRls(tenant vinculado); jamais vê a trilha de outro tenant (mata a enumeração cross-tenant). tenant_id
-- 1º em TODO índice composto.
--
-- Rollback (runbook — tabela NOVA + função/trigger; reverter o PR remove tudo sem afetar dado existente):
--   DROP TRIGGER IF EXISTS "portal_access_logs_block_mutation" ON "portal_access_logs";
--   DROP FUNCTION IF EXISTS portal_access_logs_block_mutation();
--   DROP TABLE IF EXISTS "portal_access_logs" CASCADE;
-- (policy, índices e CHECKs caem junto da tabela; a função/trigger são o único objeto a desfazer à parte.)

-- CreateTable
CREATE TABLE "portal_access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "portal" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "process_id" UUID,
    "query_fingerprint" TEXT,
    "ip_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "session_id" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "portal_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "portal_access_logs_tenant_id_id_key" ON "portal_access_logs"("tenant_id", "id");
CREATE INDEX "portal_access_logs_tenant_id_occurred_at_idx" ON "portal_access_logs"("tenant_id", "occurred_at");
-- Correlação por consulta (fingerprint) e por origem (ip) na janela — detecção de varredura/enumeração.
CREATE INDEX "portal_access_logs_tenant_fp_idx" ON "portal_access_logs"("tenant_id", "query_fingerprint", "occurred_at");
CREATE INDEX "portal_access_logs_tenant_ip_idx" ON "portal_access_logs"("tenant_id", "ip_hash", "occurred_at");

-- AddForeignKey (compostas tenant-first; RESTRICT — I9: nada da trilha cascateia)
ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS (domínios estáveis + I9).
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_portal_chk" CHECK ("portal" IN ('OWNER', 'AUTHORITY'));
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_action_chk" CHECK ("action" IN ('CHALLENGE_ISSUED', 'LOOKUP'));
-- process_id só existe quando o desfecho foi FOUND (a trilha só amarra o bem no acesso que RESOLVEU).
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_process_found_chk"
  CHECK ("process_id" IS NULL OR "outcome" = 'FOUND');

-- TRIGGER append-only (I10 no nível do banco). Bloqueia QUALQUER UPDATE ou DELETE. A role da app (NOSUPERUSER)
-- não contorna; a manutenção usa session_replication_role=replica (só superuser) — o trigger não dispara em replica.
CREATE OR REPLACE FUNCTION portal_access_logs_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'portal_access_logs is append-only (I10): % is forbidden.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "portal_access_logs_block_mutation"
  BEFORE UPDATE OR DELETE ON "portal_access_logs"
  FOR EACH ROW EXECUTE FUNCTION portal_access_logs_block_mutation();

-- RLS (clona 20260836000000_add_impound).
ALTER TABLE "portal_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_access_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_access_logs_tenant_isolation" ON "portal_access_logs";
CREATE POLICY "portal_access_logs_tenant_isolation" ON "portal_access_logs"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
