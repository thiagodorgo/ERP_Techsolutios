-- Block F5 (Danos): net-new tenant-scoped "damages" + "damage_attachments" tables.
-- Mirrors the F4 (insurance_policies) / F3 (fines) pattern: tenant-scoped composite
-- unique keys, tenant-first composite indexes, FK to "tenants", a composite FK to
-- "vehicles", and RLS (ENABLE + FORCE + policy on app.current_tenant_id) on BOTH tables.
--
-- "damages":
--   - "vehicle_id" is REQUIRED and enforced by a composite FK
--     (tenant_id, vehicle_id) -> vehicles(tenant_id, id); ON DELETE RESTRICT blocks
--     removing a vehicle still referenced by a damage.
--   - "work_order_id" is OPTIONAL and has NO hard FK: it is validated in-tenant at
--     the service layer (400 invalid_work_order_reference) so a cross-tenant / missing
--     reference is rejected without coupling the schema to work_orders.
--   - "gravidade" in ('leve','moderada','grave'); "status" in
--     ('registrado','em_tratativa','resolvido') default 'registrado' (linear state
--     machine enforced at the service layer, 422 on invalid transition).
--   - Money columns follow the repo precedent: DECIMAL(20,6) (converted at the
--     boundary via decimalToNumber). Dates are TIMESTAMPTZ(6).
--
-- "damage_attachments" (mirrors checklist_attachments, damage-scoped):
--   - composite FK (tenant_id, damage_id) -> damages(tenant_id, id) ON DELETE CASCADE
--     (deleting a damage removes its attachment rows).
--   - photos reuse the checklist STORAGE PROVIDER (D-014): "storage_provider" /
--     "storage_key" / "checksum_sha256" persist the private object location; the DTO
--     NEVER exposes them (allowlist section 2.8) — only a download path is public.
--   - "marker" (optional {x,y,description}) and "metadata" hold non-sensitive fields.
--
-- Rollback (reverse order — damage_attachments before damages):
--   ALTER TABLE "damage_attachments" DROP CONSTRAINT IF EXISTS "damage_attachments_tenant_id_damage_id_fkey";
--   ALTER TABLE "damage_attachments" DROP CONSTRAINT IF EXISTS "damage_attachments_tenant_id_fkey";
--   DROP TABLE IF EXISTS "damage_attachments";
--   ALTER TABLE "damages" DROP CONSTRAINT IF EXISTS "damages_tenant_id_vehicle_id_fkey";
--   ALTER TABLE "damages" DROP CONSTRAINT IF EXISTS "damages_tenant_id_fkey";
--   DROP TABLE IF EXISTS "damages";

CREATE TABLE "damages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "work_order_id" UUID,
  "data" TIMESTAMPTZ(6) NOT NULL,
  "gravidade" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'registrado',
  "custo_estimado" DECIMAL(20,6),
  "custo_real" DECIMAL(20,6),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "damages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "damages_tenant_id_id_key"
  ON "damages"("tenant_id", "id");
CREATE INDEX "damages_tenant_id_status_idx"
  ON "damages"("tenant_id", "status");
CREATE INDEX "damages_tenant_id_vehicle_id_idx"
  ON "damages"("tenant_id", "vehicle_id");
CREATE INDEX "damages_tenant_id_work_order_id_idx"
  ON "damages"("tenant_id", "work_order_id");
CREATE INDEX "damages_tenant_id_created_at_idx"
  ON "damages"("tenant_id", "created_at");

ALTER TABLE "damages"
  ADD CONSTRAINT "damages_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "damages"
  ADD CONSTRAINT "damages_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "damages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "damages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "damages_tenant_isolation" ON "damages";
CREATE POLICY "damages_tenant_isolation" ON "damages"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE TABLE "damage_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "damage_id" UUID NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_name" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "checksum_sha256" TEXT,
  "storage_provider" TEXT,
  "storage_key" TEXT,
  "marker" JSONB,
  "metadata" JSONB NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "damage_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "damage_attachments_tenant_id_id_key"
  ON "damage_attachments"("tenant_id", "id");
CREATE INDEX "damage_attachments_tenant_id_damage_id_idx"
  ON "damage_attachments"("tenant_id", "damage_id");

ALTER TABLE "damage_attachments"
  ADD CONSTRAINT "damage_attachments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "damage_attachments"
  ADD CONSTRAINT "damage_attachments_tenant_id_damage_id_fkey"
  FOREIGN KEY ("tenant_id", "damage_id") REFERENCES "damages"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "damage_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "damage_attachments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "damage_attachments_tenant_isolation" ON "damage_attachments";
CREATE POLICY "damage_attachments_tenant_isolation" ON "damage_attachments"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
