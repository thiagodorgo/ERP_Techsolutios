-- Block F4 (Seguros): net-new tenant-scoped "insurance_policies" table.
-- Mirrors the F3 (fines) / F2 (maintenance_orders) pattern: tenant-scoped
-- composite unique keys, tenant-first composite indexes, FK to "tenants", a
-- composite FK to "vehicles", and RLS (ENABLE + FORCE + policy on
-- app.current_tenant_id).
-- "vehicle_id" is REQUIRED and enforced by a composite FK
-- (tenant_id, vehicle_id) -> vehicles(tenant_id, id), so a policy can only
-- reference a vehicle of the same tenant; ON DELETE RESTRICT blocks removing a
-- vehicle still referenced by a policy.
-- "numero_apolice" is unique PER TENANT (@@unique(tenant_id, numero_apolice));
-- the same number CAN exist in another tenant (isolation test P6). Money columns
-- follow the repo precedent: DECIMAL(20,6) (converted at the boundary via
-- decimalToNumber).
-- "status" stores ONLY 'vigente' | 'cancelada' (default 'vigente'). The
-- 'vencida' status is NEVER persisted (R4.1): it is DERIVED at read time from
-- "vigencia_fim" < now(). Editable transitions are 'vigente' <-> 'cancelada'
-- only; a PATCH setting status='vencida' is rejected at the service layer (422
-- cannot_set_derived_status). "vigencia_fim" must be strictly after
-- "vigencia_inicio" (service validates: 400 invalid_vigencia).
--
-- Rollback (reverse order):
--   ALTER TABLE "insurance_policies" DROP CONSTRAINT IF EXISTS "insurance_policies_tenant_id_vehicle_id_fkey";
--   ALTER TABLE "insurance_policies" DROP CONSTRAINT IF EXISTS "insurance_policies_tenant_id_fkey";
--   DROP TABLE IF EXISTS "insurance_policies";

CREATE TABLE "insurance_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "seguradora" TEXT NOT NULL,
  "numero_apolice" TEXT NOT NULL,
  "vigencia_inicio" TIMESTAMPTZ(6) NOT NULL,
  "vigencia_fim" TIMESTAMPTZ(6) NOT NULL,
  "valor" DECIMAL(20,6) NOT NULL,
  "cobertura" TEXT,
  "status" TEXT NOT NULL DEFAULT 'vigente',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "insurance_policies_tenant_id_id_key"
  ON "insurance_policies"("tenant_id", "id");
CREATE UNIQUE INDEX "insurance_policies_tenant_id_numero_apolice_key"
  ON "insurance_policies"("tenant_id", "numero_apolice");
CREATE INDEX "insurance_policies_tenant_id_status_vigencia_fim_idx"
  ON "insurance_policies"("tenant_id", "status", "vigencia_fim");
CREATE INDEX "insurance_policies_tenant_id_vehicle_id_idx"
  ON "insurance_policies"("tenant_id", "vehicle_id");
CREATE INDEX "insurance_policies_tenant_id_created_at_idx"
  ON "insurance_policies"("tenant_id", "created_at");

ALTER TABLE "insurance_policies"
  ADD CONSTRAINT "insurance_policies_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "insurance_policies"
  ADD CONSTRAINT "insurance_policies_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "insurance_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "insurance_policies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_policies_tenant_isolation" ON "insurance_policies";
CREATE POLICY "insurance_policies_tenant_isolation" ON "insurance_policies"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
