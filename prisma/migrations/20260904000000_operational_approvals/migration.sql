-- B-APROVACOES-DURAVEIS (item 67 do portão) — a fila de Aprovações operacionais passa a ser gravada no banco, isolada
-- por organização. Só aditiva: 1 tabela nova, os índices, as restrições e o isolamento; nenhuma tabela existente muda,
-- nenhum dado entra. Sem GRANT: o papel de execução recebe as tabelas futuras do migrador por ALTER DEFAULT PRIVILEGES
-- (scripts/db-runtime-role.sh). Transacional (D-MIGRACAO-COM-TRANSACAO-EXPLICITA); o drill é
-- tests/b-aprov-duraveis-migration-drill-db.test.ts.
--
-- O índice único PARCIAL garante no máximo 1 pendente por (organização, tipo, entidade): 1 pendente de conclusão por OS
-- (entity_id = id da OS) e 1 pendente por pedido do técnico (entity_id = a chave do pedido). Ele vive só aqui, sem linha
-- no schema.prisma (o precedente de work_order_checklists).
BEGIN;

CREATE TABLE "operational_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "work_order_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'pending_approval',
  "requested_by_user_id" UUID NOT NULL,
  "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "pending_reason" TEXT NOT NULL,
  "decided_by_user_id" UUID,
  "decided_at" TIMESTAMPTZ(6),
  "decision_note" TEXT,
  "rejection_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "operational_approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "operational_approvals_entity_type_check" CHECK ("entity_type" IN ('work_order', 'checklist_run', 'evidence')),
  CONSTRAINT "operational_approvals_entity_id_not_blank_check" CHECK (btrim("entity_id") <> ''),
  CONSTRAINT "operational_approvals_work_order_required_check" CHECK ("entity_type" <> 'work_order' OR "work_order_id" IS NOT NULL),
  CONSTRAINT "operational_approvals_status_check" CHECK ("status" IN ('pending_approval', 'approved', 'rejected')),
  CONSTRAINT "operational_approvals_pending_reason_check" CHECK (btrim("pending_reason") <> ''),
  CONSTRAINT "operational_approvals_decision_coherence_check" CHECK (("status" = 'pending_approval' AND "decided_by_user_id" IS NULL AND "decided_at" IS NULL) OR ("status" <> 'pending_approval' AND "decided_by_user_id" IS NOT NULL AND "decided_at" IS NOT NULL)),
  CONSTRAINT "operational_approvals_decider_differs_check" CHECK ("decided_by_user_id" IS NULL OR "decided_by_user_id" <> "requested_by_user_id"),
  CONSTRAINT "operational_approvals_rejection_reason_check" CHECK ("status" <> 'rejected' OR btrim(coalesce("rejection_reason", '')) <> '')
);

CREATE UNIQUE INDEX "operational_approvals_tenant_id_id_key" ON "operational_approvals"("tenant_id", "id");

CREATE UNIQUE INDEX "operational_approvals_one_pending_per_entity" ON "operational_approvals"("tenant_id", "entity_type", "entity_id")
  WHERE "status" = 'pending_approval';

CREATE INDEX "operational_approvals_tenant_id_status_requested_at_idx" ON "operational_approvals"("tenant_id", "status", "requested_at" DESC);

CREATE INDEX "operational_approvals_tenant_id_work_order_id_idx" ON "operational_approvals"("tenant_id", "work_order_id");

ALTER TABLE "operational_approvals" ADD CONSTRAINT "operational_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operational_approvals" ADD CONSTRAINT "operational_approvals_tenant_id_work_order_id_fkey" FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operational_approvals" ADD CONSTRAINT "operational_approvals_tenant_id_requested_by_user_id_fkey" FOREIGN KEY ("tenant_id", "requested_by_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operational_approvals" ADD CONSTRAINT "operational_approvals_tenant_id_decided_by_user_id_fkey" FOREIGN KEY ("tenant_id", "decided_by_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operational_approvals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "operational_approvals" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operational_approvals_tenant_isolation" ON "operational_approvals";

CREATE POLICY "operational_approvals_tenant_isolation" ON "operational_approvals"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;

-- down (só no drill; em ambiente real, reverter o PR basta: a tabela fica sem uso). Uma sentença: a tabela leva junto
-- os índices, as restrições e a política dela, e nada mais.
--   DROP TABLE IF EXISTS "operational_approvals";
