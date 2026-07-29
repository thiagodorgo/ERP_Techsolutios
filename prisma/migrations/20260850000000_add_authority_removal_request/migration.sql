-- Block Ω5P PR-18b (authority-portal, superfície CREDENCIADA): tabela NOVA "authority_removal_requests" — o registro
-- da SOLICITAÇÃO de remoção originada pela AUTORIDADE credenciada no 2º PWA público (CTB art.269; Res. CONTRAN
-- 1025/2026 art.9º-I identificação da autoridade + art.14 Termo: órgão/fundamento/local). A solicitação ORIGINA uma
-- WorkOrder(open) quando o catálogo de remoção do tenant resolve (D-Ω5P-AUTH-06); senão fica ENFILEIRADA
-- (work_order_id NULL) para o console despachar. SoD: a OS nasce 'open' — a CUSTÓDIA só abre na CONCLUSÃO pela
-- operação de campo (o sweep dispara). + WIDENING ADITIVO do CHECK de action de "portal_access_logs"
-- (+ 'REMOVAL_REQUESTED' — a solicitação registrada na trilha I10).
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só:
--   (1) CREATE TABLE "authority_removal_requests" (NOVA) + índices tenant-first + partial-unique anti-spam (raw) +
--       FK COMPOSTAS tenant-first RESTRICT (I9) → tenants + authority_credentials + work_orders + CHECK status + RLS.
--   (2) WIDENING de 1 CHECK de "portal_access_logs" (DROP + re-ADD MAIS LARGO): alargar um CHECK só ACEITA mais —
--       jamais reprova linha existente (não-destrutivo). Nenhuma coluna/tabela existente é alterada.
--   Back-relations no schema Prisma (Tenant/WorkOrder/AuthorityCredential.authority_removal_requests) são
--   metadata-only; NENHUMA coluna nova em tabela existente.
--
-- TABELA MUTÁVEL — SEM TRIGGER APPEND-ONLY (justificado): a solicitação é ESTADO OPERACIONAL que TRANSICIONA por
-- desenho (OPEN → DISPATCHED/CANCELLED por um consumidor de console FUTURO) e recebe work_order_id ao originar a OS.
-- Um trigger append-only IMPEDIRIA essas transições. A PROVA do ATO (quem solicitou, quando, de onde) vive no
-- PortalAccessLog (append-only, ação 'REMOVAL_REQUESTED'). Integridade = RLS FORCE + FK RESTRICT + CHECK.
--
-- Enums em INGLÊS validados na APP (status OPEN|DISPATCHED|CANCELLED) — SEM enum-CHECK amplo (padrão FASE0 §3.5),
-- MAS com CHECK ESTRUTURAL de domínio pequeno/estável (belt-and-suspenders, espelha authority_credentials_status_chk).
-- tenant_id 1º em todo índice composto. RLS clona 20260849000000_add_authority_credential.
--
-- §2.8 / RN-POR-02 (MINIMIZAÇÃO): a autoria vem do credential_id da SESSÃO (nunca do corpo — anti-spoof do órgão) e
-- o nome do órgão NÃO entra na OS (white-label neutra). session_ref = ref OPACA (HMAC truncado, nunca a JWE). plate/
-- legal_basis/location_note são dados do BEM/ato (art.14) — nenhum dado pessoal do proprietário/agente.
--
-- Anti-spam ATÔMICO (RN-POR-01): índice PARCIAL único (tenant_id, plate) WHERE status='OPEN' — no máx. 1 solicitação
-- ABERTA por placa. A 2ª solicitação OPEN da MESMA placa bate 23505 → tratada como duplicata (resposta genérica; a tx
-- inteira aborta, NADA extra é criado). Raw-only (índice parcial não é expressável no Prisma model — padrão da casa,
-- como portal_release_requests_open_key / work_orders client_action_id).
--
-- Rollback (runbook — tabela NOVA + reverter o widening ao domínio anterior):
--   DROP TABLE IF EXISTS "authority_removal_requests" CASCADE;
--   ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
--   ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_action_chk"
--     CHECK ("action" IN ('CHALLENGE_ISSUED','LOOKUP','DOSSIER_VIEWED','RELEASE_REQUESTED','LOGIN'));
-- (índices, UNIQUE, partial-unique, CHECK e policy da tabela nova caem junto do DROP TABLE. Reverter o widening exige
--  que não haja linha com a ação nova 'REMOVAL_REQUESTED' — reverter o PR remove-as junto.)

-- CreateTable
CREATE TABLE "authority_removal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "credential_id" UUID NOT NULL,
    "work_order_id" UUID,
    "plate" TEXT NOT NULL,
    "legal_basis" TEXT,
    "location_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "session_ref" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "authority_removal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "authority_removal_requests_tenant_id_id_key" ON "authority_removal_requests"("tenant_id", "id");
-- Anti-spam ATÔMICO: no máx. 1 solicitação ABERTA por (tenant, placa). Índice PARCIAL único (raw-only).
CREATE UNIQUE INDEX "authority_removal_requests_open_plate_key" ON "authority_removal_requests"("tenant_id", "plate") WHERE "status" = 'OPEN';
CREATE INDEX "authority_removal_requests_tenant_id_status_idx" ON "authority_removal_requests"("tenant_id", "status");
CREATE INDEX "authority_removal_requests_tenant_id_credential_id_idx" ON "authority_removal_requests"("tenant_id", "credential_id");
CREATE INDEX "authority_removal_requests_tenant_id_work_order_id_idx" ON "authority_removal_requests"("tenant_id", "work_order_id");

-- AddForeignKey (COMPOSTAS tenant-first; RESTRICT — I9: nada cascateia)
ALTER TABLE "authority_removal_requests" ADD CONSTRAINT "authority_removal_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authority_removal_requests" ADD CONSTRAINT "authority_removal_requests_tenant_id_credential_id_fkey" FOREIGN KEY ("tenant_id", "credential_id") REFERENCES "authority_credentials"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "authority_removal_requests" ADD CONSTRAINT "authority_removal_requests_tenant_id_work_order_id_fkey" FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK ESTRUTURAL (domínio pequeno e estável; belt-and-suspenders sobre o validator da APP).
ALTER TABLE "authority_removal_requests"
  ADD CONSTRAINT "authority_removal_requests_status_chk" CHECK ("status" IN ('OPEN', 'DISPATCHED', 'CANCELLED'));

-- RLS (clona 20260849000000_add_authority_credential). O BFF/console escreve/lê SEMPRE sob withTenantRls(tenant
-- vinculado); jamais vê a solicitação de outro tenant (mata cross-tenant).
ALTER TABLE "authority_removal_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "authority_removal_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authority_removal_requests_tenant_isolation" ON "authority_removal_requests";
CREATE POLICY "authority_removal_requests_tenant_isolation" ON "authority_removal_requests"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── WIDENING ADITIVO do CHECK de allowlist de action de "portal_access_logs" (I10) ──────────────────────────────
-- PR-18b acrescenta a ação REMOVAL_REQUESTED (solicitação de remoção). Alargar um CHECK ACEITA mais — nunca reprova
-- linha existente (não-destrutivo). DROP + re-ADD é o único caminho de alterar um CHECK no Postgres. O
-- process_found_chk NÃO muda (REMOVAL_REQUESTED nunca amarra bem → process_id sempre NULL, já satisfeito).
ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_action_chk"
  CHECK ("action" IN ('CHALLENGE_ISSUED', 'LOOKUP', 'DOSSIER_VIEWED', 'RELEASE_REQUESTED', 'LOGIN', 'REMOVAL_REQUESTED'));
