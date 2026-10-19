-- B-TRC-02 (plano v2 §6.1; emenda v2.1 R1-1) — telemetria VEICULAR do Traccar. ADITIVA e forward-only.
-- Carimbo renumerado pelo orquestrador (20260878000000 é do B-SAN3-02): esta é a 20260879000000; o VALIDATE é a 20260880000000.
-- O QUE TOCA: (1) cria vehicle_telemetry_events; (2) em traccar_ingress_receipts: UM índice único novo (alvo da FK de 4 colunas) e o
--   CHECK de message_kind alargado (DROP + ADD … NOT VALID; o VALIDATE vai na 20260880000000, N2-06). Nada mais é tocado.
-- RLS e acesso: DML pelo papel de runtime via DEFAULT PRIVILEGES do migrador (scripts/db-runtime-role.sh); NENHUMA concessão aqui.
-- Os domínios numéricos dos CHECKs abaixo são os MESMOS de src/modules/telemetry/vehicle-telemetry.bounds.ts (uma fonte; B9/F9 provam).
-- [Q1=SIM] fix_key + índice único parcial POR ORGANIZAÇÃO: "um fix → uma amostra" é propriedade do banco dentro da organização.
-- ROLLBACK: ver o bloco no fim deste arquivo (ordem executável; só em ambiente SEM dado real).
CREATE TABLE "vehicle_telemetry_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "binding_id" UUID NOT NULL,
  "receipt_id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "alarm_code" TEXT,
  "source" TEXT NOT NULL DEFAULT 'forward',
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "traccar_event_id" BIGINT,
  "traccar_position_id" BIGINT,
  "fix_key" TEXT,
  "ignition" BOOLEAN,
  "motion" BOOLEAN,
  "odometer_m" BIGINT,
  "total_distance_m" BIGINT,
  "engine_hours_s" BIGINT,
  "power_mv" INTEGER,
  "battery_level_pct" INTEGER,
  CONSTRAINT "vehicle_telemetry_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_telemetry_events_kind_check" CHECK ("kind" IN (
    'sample','device_online','device_unknown','device_offline','device_moving','device_stopped','device_overspeed',
    'ignition_on','ignition_off','alarm')),
  CONSTRAINT "vehicle_telemetry_events_source_check" CHECK ("source" IN ('forward','reconciliation')),
  CONSTRAINT "vehicle_telemetry_events_alarm_code_check"
    CHECK (("kind" = 'alarm') = ("alarm_code" IS NOT NULL) AND ("alarm_code" IS NULL OR "alarm_code" ~ '^[a-zA-Z]{1,32}$')),
  CONSTRAINT "vehicle_telemetry_events_measures_check" CHECK (
    ("kind" = 'sample' AND ("ignition" IS NOT NULL OR "motion" IS NOT NULL OR "odometer_m" IS NOT NULL
       OR "total_distance_m" IS NOT NULL OR "engine_hours_s" IS NOT NULL OR "power_mv" IS NOT NULL OR "battery_level_pct" IS NOT NULL))
    OR ("kind" <> 'sample' AND "ignition" IS NULL AND "motion" IS NULL AND "odometer_m" IS NULL AND "total_distance_m" IS NULL
       AND "engine_hours_s" IS NULL AND "power_mv" IS NULL AND "battery_level_pct" IS NULL)),
  CONSTRAINT "vehicle_telemetry_events_ranges_check" CHECK (
    ("odometer_m" IS NULL OR ("odometer_m" BETWEEN 0 AND 9007199254740991))
    AND ("total_distance_m" IS NULL OR ("total_distance_m" BETWEEN 0 AND 9007199254740991))
    AND ("engine_hours_s" IS NULL OR ("engine_hours_s" BETWEEN 0 AND 9007199254740991))
    AND ("power_mv" IS NULL OR ("power_mv" BETWEEN 0 AND 1000000))
    AND ("battery_level_pct" IS NULL OR ("battery_level_pct" BETWEEN 0 AND 100))),
  CONSTRAINT "vehicle_telemetry_events_fix_key_check"
    CHECK (("kind" = 'sample') = ("fix_key" IS NOT NULL) AND ("fix_key" IS NULL OR "fix_key" ~ '^[0-9a-f]{64}$'))
);

CREATE UNIQUE INDEX "vehicle_telemetry_events_tenant_id_id_key" ON "vehicle_telemetry_events"("tenant_id", "id");
CREATE UNIQUE INDEX "vehicle_telemetry_events_receipt_key" ON "vehicle_telemetry_events"("tenant_id", "receipt_id");
CREATE INDEX "vehicle_telemetry_events_vehicle_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_vehicle_kind_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "kind", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_time_idx" ON "vehicle_telemetry_events"("tenant_id", "occurred_at");
-- [Q1=SIM] um fix → uma amostra DENTRO DA ORGANIZAÇÃO, por QUALQUER caminho (posição aceita ou quarentena por operador; emenda R1-1).
CREATE UNIQUE INDEX "vehicle_telemetry_events_sample_fix_key" ON "vehicle_telemetry_events"("tenant_id", "fix_key") WHERE "kind" = 'sample';

-- (2) traccar_ingress_receipts: alvo da FK de 4 colunas (índice único NOVO; redundante com a PK, necessário para a FK)
CREATE UNIQUE INDEX "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key"
  ON "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id");

ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_tenant_id_binding_id_fkey"
  FOREIGN KEY ("tenant_id", "binding_id") REFERENCES "vehicle_tracking_bindings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- A-12: a linha e o recibo concordam em viatura E vínculo — no banco, não no código.
ALTER TABLE "vehicle_telemetry_events" ADD CONSTRAINT "vehicle_telemetry_events_receipt_fkey"
  FOREIGN KEY ("tenant_id", "receipt_id", "vehicle_id", "binding_id")
  REFERENCES "traccar_ingress_receipts"("tenant_id", "id", "vehicle_id", "binding_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vehicle_telemetry_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_telemetry_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events";
CREATE POLICY "vehicle_telemetry_events_tenant_isolation" ON "vehicle_telemetry_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- (3) CHECK de message_kind do recibo: DROP + ADD NOT VALID (o VALIDATE vai na migração seguinte). 'position' ⊂ lista nova.
ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check"
  CHECK ("message_kind" IN ('position', 'event', 'position_sample')) NOT VALID;

-- ROLLBACK (manual; só em ambiente SEM dado real; NUNCA como rollback produtivo nem como reversão da Q1 — emenda R2-3).
-- ORDEM EXECUTÁVEL — a dependente cai primeiro (o drill G9 de tests/traccar-event-rls-db.test.ts executa estas linhas):
--   1. DROP TABLE IF EXISTS "vehicle_telemetry_events";
--      (política, índices e as 4 FKs caem com ela)
--   2. DROP INDEX IF EXISTS "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key";
--   3. SELECT count(*) FROM "traccar_ingress_receipts" WHERE "message_kind" <> 'position';
--      (tem de ser 0. Se não for, PARE: recibo de evento/amostra é dado; não se apaga para "voltar".)
--   4. ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
--      ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check" CHECK ("message_kind" IN ('position'));
--   5. DELETE FROM "_prisma_migrations" WHERE "migration_name" IN ('20260879000000_vehicle_telemetry_events', '20260880000000_validate_receipt_message_kind_check');
--   Toca traccar_ingress_receipts (CHECK e um índice) e _prisma_migrations; nenhuma outra tabela.
