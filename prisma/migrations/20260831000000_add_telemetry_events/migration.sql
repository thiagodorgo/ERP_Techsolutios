-- Block Ω4C PR-12 (Telemetria): tabela "telemetry_events" — fonte de verdade da telemetria do app AutEM
-- Mobile (heartbeat GPS + acessos APP_CONNECT/APP_DISCONNECT + recusas SERVICE_REFUSAL). Model NOVO,
-- NÃO estende field_operator_locations (D-Ω4C-TELE-MODEL): isola o consent-gate LGPD, o event_type e a
-- idempotência de lote, sem poluir a "última posição" que o Mapa Ω1 lê. Espelha o padrão canônico das
-- fatias anteriores: PK uuid, @@unique([tenant_id,id]) (habilita FKs compostas futuras), timestamptz,
-- RLS ENABLE+FORCE + policy em app.current_tenant_id (clona 20260823000000).
--
-- Enums em INGLÊS validados na APP (SEM CHECK de enum no banco — padrão FASE0 §3.5): event_type
-- heartbeat|app_connect|app_disconnect|service_refusal; signal_type wifi|mobile|none. Labels PT-BR na
-- fronteira do DTO. lat/lng NULL (só heartbeat CONSENTIDO grava coordenada — D-Ω4C-TELE-CONSENT); os
-- demais eventos não têm GPS. CHECK ±90/±180 quando não-nulo (espelha field_operator_locations);
-- accuracy_m/speed_kmh ≥ 0; battery_pct 0..100. km = Decimal(10,1) DERIVADO on-read (haversine), SEM
-- coluna (D-Ω4C-TELE-KM-ONREAD).
--
-- Idempotência persistente (D-Ω4C-TELE-IDEMP): UNIQUE (tenant_id, operator_profile_id, client_action_id)
-- — reprocessar o lote → already_applied (P2002 capturado na app, NÃO duplica, NÃO 409). FK composta
-- (tenant_id, operator_profile_id) → operator_profiles(tenant_id, id) ON DELETE CASCADE: apagar o
-- profissional apaga a sua telemetria (direito ao esquecimento LGPD). FK tenant RESTRICT. work_order_id
-- SEM FK dura em v1 (classificação da recusa — evita acoplamento, como D-Ω4C-RECON-04).
--
-- Aditivo puro (CREATE TABLE + índices/constraints/policy da tabela nova; nenhum ALTER/DROP em objeto
-- existente). up-only por política (C7.5) — a migração NÃO faz DROP; rollback é manual.
--
-- Rollback (runbook — tabela nova, sem dependente; reverter o PR remove tudo sem afetar dado existente):
--   DROP TABLE IF EXISTS "telemetry_events" CASCADE;
-- (a policy e os índices caem junto da tabela; nenhuma tabela alheia é tocada para desfazer.)

CREATE TABLE "telemetry_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "operator_profile_id" UUID NOT NULL,
  "event_type" TEXT NOT NULL,
  "captured_at" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  "accuracy_m" DOUBLE PRECISION,
  "speed_kmh" DOUBLE PRECISION,
  "battery_pct" INTEGER,
  "signal_type" TEXT,
  "app_version" TEXT,
  "device_model" TEXT,
  "sdk_int" INTEGER,
  "client_action_id" TEXT NOT NULL,
  "refusal_reason" TEXT,
  "work_order_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "telemetry_events_lat_range_chk" CHECK ("lat" IS NULL OR ("lat" >= -90 AND "lat" <= 90)),
  CONSTRAINT "telemetry_events_lng_range_chk" CHECK ("lng" IS NULL OR ("lng" >= -180 AND "lng" <= 180)),
  CONSTRAINT "telemetry_events_accuracy_chk" CHECK ("accuracy_m" IS NULL OR "accuracy_m" >= 0),
  CONSTRAINT "telemetry_events_speed_chk" CHECK ("speed_kmh" IS NULL OR "speed_kmh" >= 0),
  CONSTRAINT "telemetry_events_battery_chk" CHECK ("battery_pct" IS NULL OR ("battery_pct" >= 0 AND "battery_pct" <= 100))
);

CREATE UNIQUE INDEX "telemetry_events_tenant_id_id_key"
  ON "telemetry_events"("tenant_id", "id");
-- Idempotência de lote (D-Ω4C-TELE-IDEMP): no MÁXIMO 1 evento por (tenant, profissional, client_action_id).
CREATE UNIQUE INDEX "telemetry_events_idem_key"
  ON "telemetry_events"("tenant_id", "operator_profile_id", "client_action_id");
-- Volume/janela (D-Ω4C-RECON-06): leitura de km/rastreamento por profissional no período. tenant_id 1º.
CREATE INDEX "telemetry_events_profile_captured_idx"
  ON "telemetry_events"("tenant_id", "operator_profile_id", "captured_at");
-- Acessos/recusas por tipo no período.
CREATE INDEX "telemetry_events_type_captured_idx"
  ON "telemetry_events"("tenant_id", "event_type", "captured_at");

ALTER TABLE "telemetry_events"
  ADD CONSTRAINT "telemetry_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "telemetry_events"
  ADD CONSTRAINT "telemetry_events_operator_fkey"
  FOREIGN KEY ("tenant_id", "operator_profile_id") REFERENCES "operator_profiles"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "telemetry_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "telemetry_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "telemetry_events_tenant_isolation" ON "telemetry_events";
CREATE POLICY "telemetry_events_tenant_isolation" ON "telemetry_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
