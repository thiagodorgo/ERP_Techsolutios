-- Block F3 (Multas): net-new tenant-scoped "fines" table.
-- Mirrors the F2 (maintenance_orders) pattern: tenant-scoped composite unique
-- keys, tenant-first composite indexes, FK to "tenants", composite FK to
-- "vehicles", and RLS (ENABLE + FORCE + policy on app.current_tenant_id).
-- "vehicle_id" is REQUIRED and enforced by a composite FK
-- (tenant_id, vehicle_id) -> vehicles(tenant_id, id), so a fine can only
-- reference a vehicle of the same tenant; ON DELETE RESTRICT blocks removing a
-- vehicle still referenced by a fine.
-- "driver_id" is OPTIONAL and references a User, but intentionally has NO hard
-- FK — it is validated at the service layer (resolve the user in-tenant; a
-- cross-tenant / missing id is rejected as 400 invalid_driver_reference).
-- "numero_auto" is unique PER TENANT (@@unique(tenant_id, numero_auto)); the
-- same number CAN exist in another tenant (isolation test P6). Money columns
-- follow the repo precedent: DECIMAL(20,6) (converted at the boundary via
-- decimalToNumber). "status" transitions are enforced in the service (R3.1
-- state machine, 422 on invalid transition; transition to "cancelada" is
-- tenant_admin/super_admin only, 403 otherwise).
--
-- Rollback (reverse order):
--   ALTER TABLE "fines" DROP CONSTRAINT IF EXISTS "fines_tenant_id_vehicle_id_fkey";
--   ALTER TABLE "fines" DROP CONSTRAINT IF EXISTS "fines_tenant_id_fkey";
--   DROP TABLE IF EXISTS "fines";

CREATE TABLE "fines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "driver_id" UUID,
  "numero_auto" TEXT NOT NULL,
  "data_infracao" TIMESTAMPTZ(6) NOT NULL,
  "orgao" TEXT NOT NULL,
  "descricao" TEXT,
  "valor" DECIMAL(20,6) NOT NULL,
  "pontos" INTEGER NOT NULL DEFAULT 0,
  "prazo_recurso" TIMESTAMPTZ(6),
  "prazo_pagamento" TIMESTAMPTZ(6),
  "status" TEXT NOT NULL DEFAULT 'recebida',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fines_tenant_id_id_key"
  ON "fines"("tenant_id", "id");
CREATE UNIQUE INDEX "fines_tenant_id_numero_auto_key"
  ON "fines"("tenant_id", "numero_auto");
CREATE INDEX "fines_tenant_id_status_prazo_pagamento_idx"
  ON "fines"("tenant_id", "status", "prazo_pagamento");
CREATE INDEX "fines_tenant_id_vehicle_id_idx"
  ON "fines"("tenant_id", "vehicle_id");
CREATE INDEX "fines_tenant_id_created_at_idx"
  ON "fines"("tenant_id", "created_at");

ALTER TABLE "fines"
  ADD CONSTRAINT "fines_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fines"
  ADD CONSTRAINT "fines_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "fines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fines_tenant_isolation" ON "fines";
CREATE POLICY "fines_tenant_isolation" ON "fines"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
