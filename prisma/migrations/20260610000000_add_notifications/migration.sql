CREATE TABLE "notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "recipient_user_id" uuid NOT NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'info',
  "status" text NOT NULL DEFAULT 'unread',
  "source_type" text,
  "source_id" text,
  "action_url" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "idempotency_key" text,
  "read_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_severity_check" CHECK ("severity" IN ('info', 'success', 'warning', 'critical')),
  CONSTRAINT "notifications_status_check" CHECK ("status" IN ('unread', 'read', 'archived'))
);

CREATE UNIQUE INDEX "notifications_tenant_id_id_key" ON "notifications"("tenant_id", "id");
CREATE UNIQUE INDEX "notifications_tenant_id_recipient_user_id_idempotency_key_key"
  ON "notifications"("tenant_id", "recipient_user_id", "idempotency_key");
CREATE INDEX "notifications_tenant_id_idx" ON "notifications"("tenant_id");
CREATE INDEX "notifications_tenant_id_recipient_user_id_idx" ON "notifications"("tenant_id", "recipient_user_id");
CREATE INDEX "notifications_tenant_id_recipient_user_id_status_idx" ON "notifications"("tenant_id", "recipient_user_id", "status");
CREATE INDEX "notifications_tenant_id_recipient_user_id_created_at_idx" ON "notifications"("tenant_id", "recipient_user_id", "created_at");
CREATE INDEX "notifications_tenant_id_status_created_at_idx" ON "notifications"("tenant_id", "status", "created_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_tenant_id_recipient_user_id_fkey"
  FOREIGN KEY ("tenant_id", "recipient_user_id") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_tenant_isolation" ON "notifications";
CREATE POLICY "notifications_tenant_isolation" ON "notifications"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
