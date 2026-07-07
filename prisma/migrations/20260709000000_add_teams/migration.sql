-- Block A3 (Equipe): teams + team_members (junction: team x user).
-- Create order: "teams" FIRST, then "team_members" (team_members FKs teams).
-- Rollback order (reverse): drop "team_members" BEFORE "teams".
--   DROP TABLE IF EXISTS "team_members";
--   DROP TABLE IF EXISTS "teams";

CREATE TABLE "teams" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "leader_user_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "teams_tenant_id_id_key"
  ON "teams"("tenant_id", "id");
CREATE UNIQUE INDEX "teams_tenant_id_name_key"
  ON "teams"("tenant_id", "name");
CREATE INDEX "teams_tenant_id_is_active_idx"
  ON "teams"("tenant_id", "is_active");
CREATE INDEX "teams_tenant_id_created_at_idx"
  ON "teams"("tenant_id", "created_at");

CREATE TABLE "team_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "team_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role_in_team" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_members_tenant_id_id_key"
  ON "team_members"("tenant_id", "id");
CREATE UNIQUE INDEX "team_members_tenant_id_team_id_user_id_key"
  ON "team_members"("tenant_id", "team_id", "user_id");
CREATE INDEX "team_members_tenant_id_team_id_idx"
  ON "team_members"("tenant_id", "team_id");

ALTER TABLE "teams"
  ADD CONSTRAINT "teams_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teams"
  ADD CONSTRAINT "teams_tenant_id_leader_user_id_fkey"
  FOREIGN KEY ("tenant_id", "leader_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_tenant_id_team_id_fkey"
  FOREIGN KEY ("tenant_id", "team_id") REFERENCES "teams"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_members"
  ADD CONSTRAINT "team_members_tenant_id_user_id_fkey"
  FOREIGN KEY ("tenant_id", "user_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_tenant_isolation" ON "teams";
CREATE POLICY "teams_tenant_isolation" ON "teams"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_members" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_members_tenant_isolation" ON "team_members";
CREATE POLICY "team_members_tenant_isolation" ON "team_members"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
