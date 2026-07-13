-- Block Ω3-d (Anexos de OS): tabela "work_order_attachments". Aditiva pura (CREATE TABLE). Espelha
-- damage_attachments (storage/checksum/FK composta CASCADE) + net-new: status (reserva AV/B-108),
-- client_action_id (idempotência TENANT-SCOPED — RLS não limita UNIQUE, então a chave inclui tenant_id;
-- CLAUDE §6), deleted_at (delete lógico). RLS ENABLE+FORCE+policy. NÃO toca a tabela work_orders.
--
-- Rollback (ordem reversa):
--   ALTER TABLE "work_order_attachments" DROP CONSTRAINT IF EXISTS "work_order_attachments_tenant_id_work_order_id_fkey";
--   ALTER TABLE "work_order_attachments" DROP CONSTRAINT IF EXISTS "work_order_attachments_tenant_id_fkey";
--   DROP TABLE IF EXISTS "work_order_attachments";

CREATE TABLE "work_order_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_name" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "checksum_sha256" TEXT,
  "storage_provider" TEXT,
  "storage_key" TEXT,
  "status" TEXT NOT NULL DEFAULT 'stored',
  "client_action_id" TEXT,
  "metadata" JSONB NOT NULL,
  "uploaded_by" UUID,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "work_order_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_attachments_status_check" CHECK ("status" IN ('stored','rejected','scan_failed','pending_review'))
);

CREATE UNIQUE INDEX "work_order_attachments_tenant_id_id_key" ON "work_order_attachments"("tenant_id", "id");
CREATE INDEX "work_order_attachments_tenant_id_work_order_id_idx" ON "work_order_attachments"("tenant_id", "work_order_id");
CREATE INDEX "work_order_attachments_tenant_id_status_idx" ON "work_order_attachments"("tenant_id", "status");
-- Idempotência (409): TENANT-SCOPED + só entre ativos (client_action_id presente e não-excluído).
CREATE UNIQUE INDEX "work_order_attachments_idem_key"
  ON "work_order_attachments"("tenant_id", "work_order_id", "client_action_id")
  WHERE "client_action_id" IS NOT NULL AND "deleted_at" IS NULL;

ALTER TABLE "work_order_attachments"
  ADD CONSTRAINT "work_order_attachments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_attachments"
  ADD CONSTRAINT "work_order_attachments_tenant_id_work_order_id_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "work_order_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "work_order_attachments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_attachments_tenant_isolation" ON "work_order_attachments";
CREATE POLICY "work_order_attachments_tenant_isolation" ON "work_order_attachments"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
