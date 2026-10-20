-- B-TRC-02 (plano v2 §6.1, variante Q1 = NÃO por decisão do dono de 19/10 — §Q1.7) — telemetria VEICULAR do Traccar. ADITIVA e forward-only.
-- Carimbo renumerado pelo orquestrador (20260878000000 é do B-SAN3-02): esta é a 20260879000000; o VALIDATE é a 20260880000000.
-- O QUE TOCA: (1) cria vehicle_telemetry_events; (2) em traccar_ingress_receipts: UM índice único novo (alvo da FK de 4 colunas) e o
--   CHECK de message_kind alargado (DROP + ADD … NOT VALID; o VALIDATE vai na 20260880000000, N2-06). Nada mais é tocado.
-- RLS e acesso: DML pelo papel de runtime via DEFAULT PRIVILEGES do migrador (scripts/db-runtime-role.sh); NENHUMA concessão aqui.
-- Os domínios numéricos dos CHECKs abaixo são os MESMOS de src/modules/telemetry/vehicle-telemetry.bounds.ts (uma fonte; B9/F9 provam).
-- Q1 = NÃO: a amostra só nasce com a posição ACEITA, pendurada no recibo dela; "uma amostra por recibo" é o UNIQUE (tenant_id, receipt_id).
--
-- TRANSAÇÃO EXPLÍCITA (emenda v2.3; achado D1 do DBA de 2026-10-20 — o mesmo fato do C2-01 do B-SAN3-02, 20260878000000): o
-- `prisma migrate deploy` 7.8 executa o script sentença a sentença, em autocommit — NÃO numa transação única (medido: falha depois
-- da sentença k deixava 1..k aplicadas; k = 16 deixava traccar_ingress_receipts SEM o CHECK de message_kind; `resolve --rolled-back`
-- + redeploy quebrava em P3018). Por isso as 17 sentenças vão entre BEGIN e COMMIT — todas DDL transacionais (sem CONCURRENTLY):
-- falha em qualquer uma → nada aplicado (drill T-M(e)). Deploy falho: o CLI mostra só "current transaction is aborted" (a causa real
-- está no log do servidor Postgres); recuperação = `prisma migrate resolve --rolled-back 20260879000000_vehicle_telemetry_events` e
-- `prisma migrate deploy` de novo (converge; T-M(e)). Lock: o CREATE UNIQUE INDEX do recibo segura ShareLock em traccar_ingress_receipts
-- até o COMMIT (escritas esperam; leituras não) — ~2-4 s por 1 M de recibos, janela declarada em docs/deployment.md.
-- ROLLBACK: o bloco `-- down` no fim deste arquivo (manual, transação única, guarda ANTES de qualquer DROP; só em ambiente SEM dado real).
BEGIN;

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
    AND ("battery_level_pct" IS NULL OR ("battery_level_pct" BETWEEN 0 AND 100)))
);

CREATE UNIQUE INDEX "vehicle_telemetry_events_tenant_id_id_key" ON "vehicle_telemetry_events"("tenant_id", "id");
CREATE UNIQUE INDEX "vehicle_telemetry_events_receipt_key" ON "vehicle_telemetry_events"("tenant_id", "receipt_id");
CREATE INDEX "vehicle_telemetry_events_vehicle_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_vehicle_kind_time_idx" ON "vehicle_telemetry_events"("tenant_id", "vehicle_id", "kind", "occurred_at" DESC);
CREATE INDEX "vehicle_telemetry_events_time_idx" ON "vehicle_telemetry_events"("tenant_id", "occurred_at");

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
  CHECK ("message_kind" IN ('position', 'event')) NOT VALID;

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real; invocar `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>`:
-- a guarda é a 1ª sentença e PARA (22P02, com a contagem na mensagem) antes de qualquer DROP; sem --single-transaction o 23514 da
-- 5ª sentença deixaria o recibo SEM CHECK (R2 do DBA). Provado no drill T-M(b)/(c)/(d): up → down → re-up pelo `migrate deploy`):
--   SELECT CASE WHEN n = 0 THEN 'ok' ELSE ('PARE: ' || n || ' linha(s) de telemetria ou recibo(s) de evento - dado nao se apaga para voltar')::int::text END AS guarda_do_down
--     FROM (SELECT (SELECT count(*) FROM "vehicle_telemetry_events") + (SELECT count(*) FROM "traccar_ingress_receipts" WHERE "message_kind" <> 'position') AS n) g;
--   DROP TABLE IF EXISTS "vehicle_telemetry_events";
--   DROP INDEX IF EXISTS "traccar_ingress_receipts_tenant_id_id_vehicle_binding_key";
--   ALTER TABLE "traccar_ingress_receipts" DROP CONSTRAINT "traccar_ingress_receipts_message_kind_check";
--   ALTER TABLE "traccar_ingress_receipts" ADD CONSTRAINT "traccar_ingress_receipts_message_kind_check" CHECK ("message_kind" IN ('position'));
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" IN ('20260879000000_vehicle_telemetry_events', '20260880000000_validate_receipt_message_kind_check');
--   -- a tabela leva consigo política, índices e as 4 FKs; toca traccar_ingress_receipts (CHECK e um índice) e _prisma_migrations; nenhuma outra tabela.
