-- B-GRUPO-GESTOR · FM — marca do gestor e pedidos de desativação.
-- Migração aditiva e atômica. Runbook manual de volta:
--   DROP TABLE IF EXISTS "user_deactivation_requests";
--   DROP TABLE IF EXISTS "economic_group_managers";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260906000000_group_managers';
-- Sem o último passo, o `prisma migrate deploy` seguinte diz "No pending migrations" e não recria as tabelas
-- (drill da F0, C2.4). `prisma migrate resolve --rolled-back` não serve aqui: só aceita migração em estado de falha.
BEGIN;

CREATE TABLE "economic_group_managers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "identity_id" uuid NOT NULL,
  "granted_by" uuid,
  "granted_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_by" uuid,
  "revoked_at" timestamptz(6),
  CONSTRAINT "economic_group_managers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "economic_group_managers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "economic_group_managers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "economic_groups"("id") ON DELETE RESTRICT,
  CONSTRAINT "economic_group_managers_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "auth_identities"("id") ON DELETE RESTRICT,
  CONSTRAINT "economic_group_managers_revocation_check" CHECK (("revoked_at" IS NULL AND "revoked_by" IS NULL) OR "revoked_at" IS NOT NULL)
);

CREATE UNIQUE INDEX "economic_group_managers_active_key"
  ON "economic_group_managers" ("group_id", "identity_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "economic_group_managers_tenant_group_idx" ON "economic_group_managers" ("tenant_id", "group_id");
CREATE INDEX "economic_group_managers_identity_id_idx" ON "economic_group_managers" ("identity_id");

ALTER TABLE "economic_group_managers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economic_group_managers" FORCE ROW LEVEL SECURITY;
CREATE POLICY "economic_group_managers_select" ON "economic_group_managers" FOR SELECT
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    OR "identity_id"::text = current_setting('app.current_identity_id', true));
CREATE POLICY "economic_group_managers_insert" ON "economic_group_managers" FOR INSERT
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND EXISTS (SELECT 1 FROM "tenants" t WHERE t.id = "economic_group_managers".tenant_id AND t.slug = 'platform'));
CREATE POLICY "economic_group_managers_update" ON "economic_group_managers" FOR UPDATE
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND EXISTS (SELECT 1 FROM "tenants" t WHERE t.id = "economic_group_managers".tenant_id AND t.slug = 'platform'));

CREATE TABLE "user_deactivation_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "target_user_id" uuid NOT NULL,
  "group_id" uuid NOT NULL,
  "state" text NOT NULL DEFAULT 'pendente',
  "reason" text NOT NULL,
  "requested_by" uuid NOT NULL,
  "requested_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_by" uuid,
  "decided_at" timestamptz(6),
  "decision_note" text,
  CONSTRAINT "user_deactivation_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_deactivation_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT,
  CONSTRAINT "user_deactivation_requests_target_user_fkey" FOREIGN KEY ("tenant_id", "target_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "user_deactivation_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "economic_groups"("id") ON DELETE RESTRICT,
  CONSTRAINT "user_deactivation_requests_requested_by_fkey" FOREIGN KEY ("tenant_id", "requested_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "user_deactivation_requests_decided_by_fkey" FOREIGN KEY ("tenant_id", "decided_by") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "user_deactivation_requests_state_check" CHECK ("state" IN ('pendente', 'aprovado', 'recusado', 'cancelado')),
  CONSTRAINT "user_deactivation_requests_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 1000)
);

CREATE UNIQUE INDEX "user_deactivation_requests_pending_key"
  ON "user_deactivation_requests" ("tenant_id", "target_user_id") WHERE "state" = 'pendente';
CREATE INDEX "user_deactivation_requests_tenant_requested_idx" ON "user_deactivation_requests" ("tenant_id", "requested_at");
CREATE INDEX "user_deactivation_requests_tenant_state_idx" ON "user_deactivation_requests" ("tenant_id", "state");

ALTER TABLE "user_deactivation_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_deactivation_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_deactivation_requests_tenant_isolation" ON "user_deactivation_requests"
  USING ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK ("tenant_id" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;
