-- Block Ω2-c (Profissionais): tabela "operator_profiles" — perfil profissional do operador de campo,
-- extensão 1-1 de "users". Dado sensível LGPD (CNH, consentimento de rastreamento). Espelha o padrão
-- suppliers/price_tables: PK uuid, @@unique([tenant_id,id]) e ([tenant_id,user_id]) (relação 1-1 —
-- 409 duplicate_profile no serviço), timestamptz, RLS ENABLE+FORCE + policy em app.current_tenant_id.
-- FK composta (tenant_id,user_id) → users(tenant_id,id) ON DELETE CASCADE (apagar o usuário remove o
-- perfil); FK tenant Restrict. Aditivo (CREATE TABLE).
--
-- Rollback:
--   DROP TABLE IF EXISTS "operator_profiles" CASCADE;

CREATE TABLE "operator_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "full_name" TEXT,
  "cnh_number" TEXT,
  "cnh_category" TEXT,
  "cnh_expires_at" TIMESTAMPTZ(6),
  "tracking_consent" BOOLEAN NOT NULL DEFAULT false,
  "tracking_consent_at" TIMESTAMPTZ(6),
  "phone" TEXT,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "operator_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "operator_profiles_tenant_id_id_key" ON "operator_profiles"("tenant_id", "id");
CREATE UNIQUE INDEX "operator_profiles_tenant_id_user_id_key" ON "operator_profiles"("tenant_id", "user_id");
CREATE INDEX "operator_profiles_tenant_id_is_active_idx" ON "operator_profiles"("tenant_id", "is_active");
CREATE INDEX "operator_profiles_tenant_id_created_at_idx" ON "operator_profiles"("tenant_id", "created_at");

ALTER TABLE "operator_profiles"
  ADD CONSTRAINT "operator_profiles_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operator_profiles"
  ADD CONSTRAINT "operator_profiles_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operator_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "operator_profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operator_profiles_tenant_isolation" ON "operator_profiles";
CREATE POLICY "operator_profiles_tenant_isolation" ON "operator_profiles"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
