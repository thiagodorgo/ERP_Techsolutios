-- Block Ω4C PR-04 (Motor de Notificações): tabela "scheduled_notifications" — camada de DEFINIÇÃO agendada
-- (D-Ω4C-NOTIF-MODEL). É o "cadastro" de notificação do AutEM (Data/Hora, Antecedência, Título, Mensagem,
-- Tipo PRIVADA/PÚBLICA/PERSONALIZADA). A tabela `notifications` existente permanece a ENTREGA/inbox por
-- destinatário e NÃO É TOCADA (zero ALTER) — o disparo fan-out do scheduler cai nela.
--
-- DUAS CAMADAS (a mais aditiva): reescrever a tabela viva `notifications` seria destrutivo (§C7.5). Aqui só
-- CRIAMOS a tabela nova. Espelha o padrão operator_profiles/professional_statement_entries: PK uuid,
-- @@unique([tenant_id,id]), timestamptz, RLS ENABLE+FORCE + policy em app.current_tenant_id (clona 20260726000000).
-- FK composta (tenant_id,created_by) → users(tenant_id,id) ON DELETE CASCADE (como Notification.recipient_user);
-- FK tenant RESTRICT.
--
-- Enums em INGLÊS validados na APP (SEM CHECK no banco): visibility private|public|custom; status
-- pending|fired|cancelled; source_type maintenance_item|fine|insurance_policy|financial_title|manual.
-- custom_recipient_ids JSONB (array de user_ids p/ CUSTOM; validado app-level contra usuários ATIVOS no disparo,
-- SEM join table — espelha visibility_rules/metadata Json). source_id SEM FK nativa (app-level, como party_id).
-- reminder_at é DERIVADA server-side (notify_at − remind_before) e persistida p/ scan indexável.
--
-- ÍNDICE UNIQUE PARCIAL de idempotência de CREATE: no máx. 1 definição por (tenant, client_action_id) enquanto
-- client_action_id não é NULL — espelha o índice parcial de attachments/work_order_financial_items.
-- Índices de SCAN: (tenant_id,status,notify_at) [principal] e (tenant_id,status,reminder_at) [lembrete];
-- (tenant_id,created_by,created_at) ["minhas agendadas"]; (tenant_id,source_type,source_id) [lookup consumidores].
-- tenant_id é o 1º campo de TODO índice.
--
-- Aditivo puro (CREATE TABLE + índices/constraints da tabela nova; nenhum ALTER/DROP em objeto existente).
--
-- Rollback (tabela nova, sem dependente — up-only por política; DROP só em rollback manual):
--   DROP TABLE IF EXISTS "scheduled_notifications" CASCADE;

CREATE TABLE "scheduled_notifications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "notify_at" TIMESTAMPTZ(6) NOT NULL,
  "remind_before_minutes" INTEGER,
  "reminder_at" TIMESTAMPTZ(6),
  "visibility" TEXT NOT NULL,
  "custom_recipient_ids" JSONB NOT NULL DEFAULT '[]',
  "source_type" TEXT,
  "source_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reminder_fired_at" TIMESTAMPTZ(6),
  "fired_at" TIMESTAMPTZ(6),
  "created_by" UUID NOT NULL,
  "client_action_id" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scheduled_notifications_tenant_id_id_key"
  ON "scheduled_notifications"("tenant_id", "id");
CREATE UNIQUE INDEX "scheduled_notifications_client_action_key"
  ON "scheduled_notifications"("tenant_id", "client_action_id")
  WHERE "client_action_id" IS NOT NULL;
CREATE INDEX "scheduled_notifications_scan_main_idx"
  ON "scheduled_notifications"("tenant_id", "status", "notify_at");
CREATE INDEX "scheduled_notifications_scan_reminder_idx"
  ON "scheduled_notifications"("tenant_id", "status", "reminder_at");
CREATE INDEX "scheduled_notifications_creator_idx"
  ON "scheduled_notifications"("tenant_id", "created_by", "created_at");
CREATE INDEX "scheduled_notifications_source_idx"
  ON "scheduled_notifications"("tenant_id", "source_type", "source_id");

ALTER TABLE "scheduled_notifications"
  ADD CONSTRAINT "scheduled_notifications_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "scheduled_notifications"
  ADD CONSTRAINT "scheduled_notifications_created_by_fkey"
  FOREIGN KEY ("tenant_id", "created_by") REFERENCES "users"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "scheduled_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scheduled_notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "scheduled_notifications_tenant_isolation" ON "scheduled_notifications";
CREATE POLICY "scheduled_notifications_tenant_isolation" ON "scheduled_notifications"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
