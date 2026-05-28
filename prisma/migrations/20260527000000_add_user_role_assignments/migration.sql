CREATE TABLE "user_role_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "branch_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_role_assignments_tenant_id_user_id_role_id_branch_id_key"
  ON "user_role_assignments"("tenant_id", "user_id", "role_id", "branch_id");

-- Prisma represents the composite unique constraint above, but PostgreSQL allows
-- repeated NULL values in unique indexes. This partial unique index prevents
-- duplicate global user-role assignments where branch_id IS NULL.
CREATE UNIQUE INDEX "user_role_assignments_unique_global_branch"
  ON "user_role_assignments"("tenant_id", "user_id", "role_id")
  WHERE "branch_id" IS NULL;

CREATE INDEX "user_role_assignments_tenant_id_idx"
  ON "user_role_assignments"("tenant_id");

CREATE INDEX "user_role_assignments_tenant_id_user_id_idx"
  ON "user_role_assignments"("tenant_id", "user_id");

CREATE INDEX "user_role_assignments_tenant_id_role_id_idx"
  ON "user_role_assignments"("tenant_id", "role_id");

CREATE INDEX "user_role_assignments_branch_id_idx"
  ON "user_role_assignments"("branch_id");

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_role_assignments"
  ADD CONSTRAINT "user_role_assignments_branch_id_fkey"
  FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
