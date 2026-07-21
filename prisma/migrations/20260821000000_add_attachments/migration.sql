-- Block Ω4C PR-01 (Anexos genéricos polimórficos): tabela "attachments". ADITIVA / UP-ONLY
-- (CREATE TABLE + índices + FK RESTRICT + RLS). COEXISTÊNCIA: NÃO toca work_order_attachments,
-- damage_attachments nem checklist_attachments (seguem vivos). Espelha work_order_attachments
-- trocando a FK à OS pelo par POLIMÓRFICO (entity_type app-enum em inglês + entity_id). Net-new
-- vs work_order_attachments: entity_type/entity_id, extension, content_type, uploaded_at.
-- storage_key/provider/checksum/file_url são INTERNOS (nunca no DTO — §2.8). `status` reserva o
-- AV-assíncrono (default 'stored'); `client_action_id` = idempotência TENANT-SCOPED (RLS não limita
-- UNIQUE, então a chave inclui tenant_id — CLAUDE §6); `deleted_at` = delete lógico. RLS
-- ENABLE+FORCE+policy (USING + WITH CHECK) obrigatória — clonada de 20260708000000_add_vehicles.
--
-- Rollback (tabela NOVA — drop total, sem afetar outras tabelas):
--   DROP TABLE IF EXISTS "attachments";

CREATE TABLE "attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" UUID NOT NULL,
  "file_name" TEXT,
  "extension" TEXT,
  "content_type" TEXT,
  "size_bytes" INTEGER,
  "checksum_sha256" TEXT,
  "storage_provider" TEXT,
  "storage_key" TEXT,
  "file_url" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'stored',
  "client_action_id" TEXT,
  "metadata" JSONB NOT NULL,
  "uploaded_by" UUID,
  "created_by" UUID,
  "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attachments_status_check" CHECK ("status" IN ('stored','rejected','scan_failed','pending_review'))
);

CREATE UNIQUE INDEX "attachments_tenant_id_id_key" ON "attachments"("tenant_id", "id");
CREATE INDEX "attachments_tenant_id_entity_type_entity_id_idx" ON "attachments"("tenant_id", "entity_type", "entity_id");
CREATE INDEX "attachments_tenant_id_status_idx" ON "attachments"("tenant_id", "status");
-- Idempotência (409): TENANT-SCOPED + só entre ATIVOS (client_action_id presente e não-excluído).
CREATE UNIQUE INDEX "attachments_idem_key"
  ON "attachments"("tenant_id", "entity_type", "entity_id", "client_action_id")
  WHERE "client_action_id" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attachments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attachments_tenant_isolation" ON "attachments";
CREATE POLICY "attachments_tenant_isolation" ON "attachments"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
