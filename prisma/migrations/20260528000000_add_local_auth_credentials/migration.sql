CREATE UNIQUE INDEX "users_tenant_id_id_key"
  ON "users"("tenant_id", "id");

CREATE TABLE "local_auth_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "password_algorithm" TEXT NOT NULL,
  "password_updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "locked_until" TIMESTAMPTZ(6),
  "last_login_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "local_auth_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "local_auth_credentials_tenant_id_user_id_key"
  ON "local_auth_credentials"("tenant_id", "user_id");

CREATE UNIQUE INDEX "local_auth_credentials_tenant_id_email_key"
  ON "local_auth_credentials"("tenant_id", "email");

CREATE INDEX "local_auth_credentials_tenant_id_idx"
  ON "local_auth_credentials"("tenant_id");

CREATE INDEX "local_auth_credentials_tenant_id_user_id_idx"
  ON "local_auth_credentials"("tenant_id", "user_id");

CREATE INDEX "local_auth_credentials_tenant_id_email_idx"
  ON "local_auth_credentials"("tenant_id", "email");

ALTER TABLE "local_auth_credentials"
  ADD CONSTRAINT "local_auth_credentials_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "local_auth_credentials"
  ADD CONSTRAINT "local_auth_credentials_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
