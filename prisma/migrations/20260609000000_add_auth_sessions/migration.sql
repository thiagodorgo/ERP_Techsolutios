CREATE TABLE "auth_sessions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "refresh_token_hash" TEXT NOT NULL,
  "user_agent" TEXT,
  "ip_address" TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key"
  ON "auth_sessions"("refresh_token_hash");

CREATE UNIQUE INDEX "auth_sessions_tenant_id_id_key"
  ON "auth_sessions"("tenant_id", "id");

CREATE INDEX "auth_sessions_tenant_id_idx"
  ON "auth_sessions"("tenant_id");

CREATE INDEX "auth_sessions_tenant_id_user_id_idx"
  ON "auth_sessions"("tenant_id", "user_id");

CREATE INDEX "auth_sessions_tenant_id_revoked_at_idx"
  ON "auth_sessions"("tenant_id", "revoked_at");

CREATE INDEX "auth_sessions_expires_at_idx"
  ON "auth_sessions"("expires_at");

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_sessions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_sessions_tenant_isolation" ON "auth_sessions";
CREATE POLICY "auth_sessions_tenant_isolation" ON "auth_sessions"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
