CREATE TABLE "checklist_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "schema" JSONB NOT NULL,
  "created_by" UUID,
  "updated_by" UUID,
  "published_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklist_templates_type_check" CHECK ("type" IN ('towing_collection', 'towing_delivery', 'technical_evidence', 'custom')),
  CONSTRAINT "checklist_templates_status_check" CHECK ("status" IN ('draft', 'published', 'inactive', 'archived'))
);

CREATE TABLE "checklist_template_components" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "component_key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "order_index" INTEGER NOT NULL,
  "config" JSONB NOT NULL,
  "validation_rules" JSONB NOT NULL,
  "visibility_rules" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_template_components_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklist_template_components_type_check" CHECK ("type" IN ('vehicle_selector', 'damage_map', 'photo_upload', 'observation', 'comparison', 'acknowledgement', 'before_after'))
);

CREATE TABLE "checklist_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "template_id" UUID NOT NULL,
  "template_version" INTEGER NOT NULL,
  "related_entity_type" TEXT,
  "related_entity_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'in_progress',
  "started_by" UUID,
  "completed_by" UUID,
  "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checklist_runs_status_check" CHECK ("status" IN ('in_progress', 'completed', 'completed_with_divergence', 'pending_acknowledgement', 'cancelled'))
);

CREATE TABLE "checklist_run_answers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "component_id" UUID NOT NULL,
  "value" JSONB NOT NULL,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_run_answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checklist_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "component_id" UUID NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_name" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "metadata" JSONB NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checklist_markers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "component_id" UUID NOT NULL,
  "x" DOUBLE PRECISION NOT NULL,
  "y" DOUBLE PRECISION NOT NULL,
  "marker_type" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checklist_markers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checklist_acknowledgements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "acknowledged_by" UUID NOT NULL,
  "message" TEXT NOT NULL,
  "observation" TEXT,
  "acknowledged_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL,
  CONSTRAINT "checklist_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "checklist_templates_tenant_id_id_key" ON "checklist_templates"("tenant_id", "id");
CREATE INDEX "checklist_templates_tenant_id_idx" ON "checklist_templates"("tenant_id");
CREATE INDEX "checklist_templates_tenant_id_status_idx" ON "checklist_templates"("tenant_id", "status");
CREATE INDEX "checklist_templates_tenant_id_type_idx" ON "checklist_templates"("tenant_id", "type");

CREATE UNIQUE INDEX "checklist_template_components_tenant_id_id_key" ON "checklist_template_components"("tenant_id", "id");
CREATE UNIQUE INDEX "checklist_template_components_tenant_id_template_id_component_key_key" ON "checklist_template_components"("tenant_id", "template_id", "component_key");
CREATE INDEX "checklist_template_components_tenant_id_idx" ON "checklist_template_components"("tenant_id");
CREATE INDEX "checklist_template_components_tenant_id_template_id_idx" ON "checklist_template_components"("tenant_id", "template_id");
CREATE INDEX "checklist_template_components_tenant_id_type_idx" ON "checklist_template_components"("tenant_id", "type");

CREATE UNIQUE INDEX "checklist_runs_tenant_id_id_key" ON "checklist_runs"("tenant_id", "id");
CREATE INDEX "checklist_runs_tenant_id_idx" ON "checklist_runs"("tenant_id");
CREATE INDEX "checklist_runs_tenant_id_status_idx" ON "checklist_runs"("tenant_id", "status");
CREATE INDEX "checklist_runs_tenant_id_template_id_idx" ON "checklist_runs"("tenant_id", "template_id");
CREATE INDEX "checklist_runs_tenant_id_related_entity_type_related_entity_id_idx" ON "checklist_runs"("tenant_id", "related_entity_type", "related_entity_id");

CREATE INDEX "checklist_run_answers_tenant_id_idx" ON "checklist_run_answers"("tenant_id");
CREATE INDEX "checklist_run_answers_tenant_id_run_id_idx" ON "checklist_run_answers"("tenant_id", "run_id");
CREATE INDEX "checklist_run_answers_tenant_id_component_id_idx" ON "checklist_run_answers"("tenant_id", "component_id");

CREATE INDEX "checklist_attachments_tenant_id_idx" ON "checklist_attachments"("tenant_id");
CREATE INDEX "checklist_attachments_tenant_id_run_id_idx" ON "checklist_attachments"("tenant_id", "run_id");
CREATE INDEX "checklist_attachments_tenant_id_component_id_idx" ON "checklist_attachments"("tenant_id", "component_id");

CREATE INDEX "checklist_markers_tenant_id_idx" ON "checklist_markers"("tenant_id");
CREATE INDEX "checklist_markers_tenant_id_run_id_idx" ON "checklist_markers"("tenant_id", "run_id");
CREATE INDEX "checklist_markers_tenant_id_component_id_idx" ON "checklist_markers"("tenant_id", "component_id");

CREATE INDEX "checklist_acknowledgements_tenant_id_idx" ON "checklist_acknowledgements"("tenant_id");
CREATE INDEX "checklist_acknowledgements_tenant_id_run_id_idx" ON "checklist_acknowledgements"("tenant_id", "run_id");

ALTER TABLE "checklist_templates"
  ADD CONSTRAINT "checklist_templates_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_template_components"
  ADD CONSTRAINT "checklist_template_components_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_template_components"
  ADD CONSTRAINT "checklist_template_components_tenant_id_template_id_fkey"
  FOREIGN KEY ("tenant_id", "template_id") REFERENCES "checklist_templates"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_runs"
  ADD CONSTRAINT "checklist_runs_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_runs"
  ADD CONSTRAINT "checklist_runs_tenant_id_template_id_fkey"
  FOREIGN KEY ("tenant_id", "template_id") REFERENCES "checklist_templates"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_run_answers"
  ADD CONSTRAINT "checklist_run_answers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_run_answers"
  ADD CONSTRAINT "checklist_run_answers_tenant_id_run_id_fkey"
  FOREIGN KEY ("tenant_id", "run_id") REFERENCES "checklist_runs"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_run_answers"
  ADD CONSTRAINT "checklist_run_answers_tenant_id_component_id_fkey"
  FOREIGN KEY ("tenant_id", "component_id") REFERENCES "checklist_template_components"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_attachments"
  ADD CONSTRAINT "checklist_attachments_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_attachments"
  ADD CONSTRAINT "checklist_attachments_tenant_id_run_id_fkey"
  FOREIGN KEY ("tenant_id", "run_id") REFERENCES "checklist_runs"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_attachments"
  ADD CONSTRAINT "checklist_attachments_tenant_id_component_id_fkey"
  FOREIGN KEY ("tenant_id", "component_id") REFERENCES "checklist_template_components"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_markers"
  ADD CONSTRAINT "checklist_markers_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_markers"
  ADD CONSTRAINT "checklist_markers_tenant_id_run_id_fkey"
  FOREIGN KEY ("tenant_id", "run_id") REFERENCES "checklist_runs"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_markers"
  ADD CONSTRAINT "checklist_markers_tenant_id_component_id_fkey"
  FOREIGN KEY ("tenant_id", "component_id") REFERENCES "checklist_template_components"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_acknowledgements"
  ADD CONSTRAINT "checklist_acknowledgements_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_acknowledgements"
  ADD CONSTRAINT "checklist_acknowledgements_tenant_id_run_id_fkey"
  FOREIGN KEY ("tenant_id", "run_id") REFERENCES "checklist_runs"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
