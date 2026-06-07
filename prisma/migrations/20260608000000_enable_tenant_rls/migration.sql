ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "branches" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_tenant_isolation" ON "branches";
CREATE POLICY "branches_tenant_isolation" ON "branches"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_tenant_isolation" ON "users";
CREATE POLICY "users_tenant_isolation" ON "users"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "local_auth_credentials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "local_auth_credentials" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "local_auth_credentials_tenant_isolation" ON "local_auth_credentials";
CREATE POLICY "local_auth_credentials_tenant_isolation" ON "local_auth_credentials"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles_tenant_isolation" ON "roles";
CREATE POLICY "roles_tenant_isolation" ON "roles"
  USING ("tenant_id" IS NULL OR "tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id" IS NULL OR "tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "user_role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_role_assignments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_role_assignments_tenant_isolation" ON "user_role_assignments";
CREATE POLICY "user_role_assignments_tenant_isolation" ON "user_role_assignments"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON "audit_logs";
CREATE POLICY "audit_logs_tenant_isolation" ON "audit_logs"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "checklist_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_templates_tenant_isolation" ON "checklist_templates";
CREATE POLICY "checklist_templates_tenant_isolation" ON "checklist_templates"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "checklist_template_components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_template_components" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_template_components_tenant_isolation" ON "checklist_template_components";
CREATE POLICY "checklist_template_components_tenant_isolation" ON "checklist_template_components"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "checklist_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_runs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_runs_tenant_isolation" ON "checklist_runs";
CREATE POLICY "checklist_runs_tenant_isolation" ON "checklist_runs"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "checklist_run_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_run_answers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_run_answers_tenant_isolation" ON "checklist_run_answers";
CREATE POLICY "checklist_run_answers_tenant_isolation" ON "checklist_run_answers"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "checklist_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_attachments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_attachments_tenant_isolation" ON "checklist_attachments";
CREATE POLICY "checklist_attachments_tenant_isolation" ON "checklist_attachments"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "checklist_markers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_markers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_markers_tenant_isolation" ON "checklist_markers";
CREATE POLICY "checklist_markers_tenant_isolation" ON "checklist_markers"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

ALTER TABLE "checklist_acknowledgements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "checklist_acknowledgements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_acknowledgements_tenant_isolation" ON "checklist_acknowledgements";
CREATE POLICY "checklist_acknowledgements_tenant_isolation" ON "checklist_acknowledgements"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true))
  WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));
