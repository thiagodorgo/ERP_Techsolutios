-- Block Ω5P PR-17 (owner-portal, dossiê + solicitar liberação): tabela NOVA "portal_release_requests" — a INTENÇÃO
-- de liberação originada pelo PROPRIETÁRIO no portal público (posse provada por placa+Renavam → sessão JWE). NÃO é a
-- liberação (I5 = impound_releases, com aprovação da autoridade in-system): é o PEDIDO, uma fila para o operador/
-- autoridade tratar no console. SEM upload de binário público (CORTE PR-17; fotos/upload = PR-17b). + WIDENING
-- ADITIVO dos CHECKs de allowlist de "portal_access_logs" (novas ações/desfechos do dossiê/liberação — I10).
--
-- ADITIVA / UP-ONLY (C7.5) — NENHUM DROP/ALTER destrutivo em tabela viva. Só:
--   (1) CREATE TABLE "portal_release_requests" (NOVA) + índices tenant-first + FK compostas tenant-first RESTRICT
--       (I9) + @@unique(tenant,id) + índice PARCIAL único anti-spam (raw-only) + CHECKs estruturais + RLS.
--   (2) WIDENING de 2 CHECKs de "portal_access_logs" (DROP + re-ADD MAIS LARGO): alargar um CHECK só ACEITA mais —
--       jamais reprova linha existente (não-destrutivo). Nenhuma coluna/tabela existente é alterada.
--   Back-relations no schema Prisma (Tenant.portal_release_requests, ImpoundProcess.portal_release_requests) são
--   metadata-only; nenhuma coluna nova em tabela existente.
--
-- Enums em INGLÊS validados na APP (status PENDING|IN_REVIEW|SCHEDULED|DISMISSED; origin PORTAL_OWNER) — SEM
-- enum-CHECK amplo (padrão FASE0 §3.5), MAS com CHECK ESTRUTURAL de domínio pequeno/estável (belt-and-suspenders,
-- espelha portal_access_logs_portal_chk). tenant_id 1º em todo índice composto. RLS clona 20260847000000.
--
-- ANTI-SPAM (D-Ω5P-PR17) = índice PARCIAL único (tenant_id, process_id) WHERE status IN ('PENDING','IN_REVIEW') —
-- no máximo 1 pedido ABERTO por processo (raw-only, não declarado no Prisma model — como todos os partial-unique da
-- casa: impound_releases_active_release_key / process_charges_daily_idem_key). A 2ª intenção concorrente do mesmo
-- processo bate 23505 → o repositório mapeia para created:false; a resposta ao portal é genérica ({received:true}).
-- SCHEDULED/DISMISSED (terminais do fluxo do console) NÃO travam um novo pedido futuro.
--
-- §2.8 / RN-POR-02 (MINIMIZAÇÃO): a tabela NUNCA guarda placa/Renavam/proprietário/JWE crua. note = texto curto
-- sanitizado (sem PII exigida); session_ref = HMAC truncado (ref opaca da sessão, jamais o token). process_id é
-- resolvido SEMPRE da sessão (nunca do corpo) — a FK composta tenant-first amarra o pedido ao bem sob RLS.
--
-- Rollback (runbook — tabela NOVA + reverter o widening ao domínio original):
--   DROP TABLE IF EXISTS "portal_release_requests" CASCADE;
--   ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
--   ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_action_chk" CHECK ("action" IN ('CHALLENGE_ISSUED','LOOKUP'));
--   ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_process_found_chk";
--   ALTER TABLE "portal_access_logs" ADD CONSTRAINT "portal_access_logs_process_found_chk" CHECK ("process_id" IS NULL OR "outcome" = 'FOUND');
-- (índices, partial-unique, CHECKs e policy da tabela nova caem junto do DROP TABLE. Reverter o widening exige que
--  não haja linha com as ações/desfechos novos — reverter o PR remove-as junto.)

-- CreateTable
CREATE TABLE "portal_release_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'PORTAL_OWNER',
    "session_ref" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "portal_release_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "portal_release_requests_tenant_id_id_key" ON "portal_release_requests"("tenant_id", "id");
CREATE INDEX "portal_release_requests_tenant_id_process_id_idx" ON "portal_release_requests"("tenant_id", "process_id");
CREATE INDEX "portal_release_requests_tenant_id_status_idx" ON "portal_release_requests"("tenant_id", "status");

-- Anti-spam (D-Ω5P-PR17): índice PARCIAL único (tenant, process) WHERE status ABERTO — no máx. 1 pedido em curso
-- por processo. Raw-only (Prisma não modela índice parcial ⇒ sem drift).
CREATE UNIQUE INDEX "portal_release_requests_open_key"
  ON "portal_release_requests"("tenant_id", "process_id")
  WHERE "status" IN ('PENDING', 'IN_REVIEW');

-- AddForeignKey (compostas tenant-first; RESTRICT — I9: nada de custódia cascateia)
ALTER TABLE "portal_release_requests" ADD CONSTRAINT "portal_release_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "portal_release_requests" ADD CONSTRAINT "portal_release_requests_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs ESTRUTURAIS (domínios pequenos e estáveis; belt-and-suspenders sobre o validator da APP).
ALTER TABLE "portal_release_requests"
  ADD CONSTRAINT "portal_release_requests_status_chk" CHECK ("status" IN ('PENDING', 'IN_REVIEW', 'SCHEDULED', 'DISMISSED'));
ALTER TABLE "portal_release_requests"
  ADD CONSTRAINT "portal_release_requests_origin_chk" CHECK ("origin" IN ('PORTAL_OWNER'));

-- RLS (clona 20260847000000_add_portal_access_log).
ALTER TABLE "portal_release_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portal_release_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal_release_requests_tenant_isolation" ON "portal_release_requests";
CREATE POLICY "portal_release_requests_tenant_isolation" ON "portal_release_requests"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- ── WIDENING ADITIVO dos CHECKs de allowlist de "portal_access_logs" (I10) ──────────────────────────────────────
-- PR-17 acrescenta as ações DOSSIER_VIEWED / RELEASE_REQUESTED e os desfechos AUTHORIZED / SESSION_INVALID à trilha.
-- Alargar um CHECK ACEITA mais — nunca reprova linha existente (não-destrutivo). DROP + re-ADD é o único caminho de
-- alterar um CHECK no Postgres. O CHECK de outcome NÃO existe no banco (outcome é app-validado) — só action e
-- process_found (que passa a permitir process_id quando o desfecho amarra o bem: FOUND OU AUTHORIZED).
ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_action_chk";
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_action_chk"
  CHECK ("action" IN ('CHALLENGE_ISSUED', 'LOOKUP', 'DOSSIER_VIEWED', 'RELEASE_REQUESTED'));

ALTER TABLE "portal_access_logs" DROP CONSTRAINT IF EXISTS "portal_access_logs_process_found_chk";
ALTER TABLE "portal_access_logs"
  ADD CONSTRAINT "portal_access_logs_process_found_chk"
  CHECK ("process_id" IS NULL OR "outcome" IN ('FOUND', 'AUTHORIZED'));
