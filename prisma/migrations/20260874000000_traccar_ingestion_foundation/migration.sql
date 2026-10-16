-- B-TRC-01 (plano do Traccar v2.1 §3.1, §4.3–§4.5; A2-12; N2-06) — fundação da ingestão do Traccar. ADITIVA e
-- forward-only, sob o agente-dba-guardiao. Todas as datas em timestamptz(6).
--
-- (1) vehicle_tracking_bindings — vínculo rastreador → viatura, por organização, ENABLE + FORCE RLS. Desativar é gravar
--     valid_to (delete lógico); a aplicação não apaga linha. Índices parciais (só ativos, valid_to IS NULL):
--       - ÚNICO GLOBAL (instance_key, external_device_key), SEM tenant_id DE PROPÓSITO: índice único não passa pela
--         política de RLS, então a qualquer instante existe no máximo UM vínculo ativo por dispositivo no banco todo,
--         para qualquer escritor (medido pela crítica: 23505 sob o GUC de B embora B enxergue zero linhas de A);
--       - ÚNICO (tenant_id, vehicle_id): uma viatura, um rastreador ativo;
--       - (tenant_id, instance_key, external_device_key): a sondagem por organização.
-- (2) traccar_ingress_receipts — recibo por posição, por organização, ENABLE + FORCE RLS. ÚNICO GLOBAL
--     (instance_key, message_kind, external_event_key): uma posição do Traccar nunca vira duas linhas em duas
--     organizações. Não guarda JSON bruto.
-- (3) traccar_quarantine_items — GLOBAL, sem RLS, sem tenant_id, sem coordenada, sem payload (nota N-02: sem
--     organização resolvida, uma linha por organização fabricaria contexto). Um episódio aberto por (instância,
--     dispositivo, motivo): índice único parcial WHERE resolved_at IS NULL.
-- (4) CHECK de field_operator_locations.source alargado para 'traccar': DROP + ADD … NOT VALID aqui; o VALIDATE vai na
--     migração seguinte (20260875000000), em transação separada, para não segurar o ACCESS EXCLUSIVE (N2-06).
-- (5) field_dispatches.operator_assigned_at (nulo, sem default: ADD COLUMN só de metadado) + função de gatilho
--     plpgsql SECURITY INVOKER + gatilho BEFORE INSERT OR UPDATE FOR EACH ROW. No INSERT grava now(); no UPDATE grava
--     now() quando operator_user_id muda (IS DISTINCT FROM) e repõe o valor antigo em qualquer outro caso, ignorando o
--     que o cliente mandar. Linhas antigas ficam com nulo, e nulo é inelegível na atribuição (falha fechada). Não é
--     RULE (não reabre P-SAN3-05-REGRA-EM-TABELA) e não eleva privilégio.
--
-- RLS e acesso: o papel de runtime recebe DML nas tabelas novas pelos DEFAULT PRIVILEGES do migrador
-- (scripts/db-runtime-role.sh); esta migração não concede nada além.
--
-- ROLLBACK (manual, só em ambiente SEM dado real; nunca como rollback produtivo automático), em ordem reversa:
--   DROP TRIGGER IF EXISTS "field_dispatches_operator_assigned_at" ON "field_dispatches";
--   DROP FUNCTION IF EXISTS "field_dispatch_operator_assigned_at"();
--   ALTER TABLE "field_dispatches" DROP COLUMN IF EXISTS "operator_assigned_at";
--   -- re-estreitar o CHECK SÓ depois de provar zero linhas 'traccar' (SELECT count(*) … WHERE source = 'traccar' = 0):
--   ALTER TABLE "field_operator_locations" DROP CONSTRAINT "field_operator_locations_source_check";
--   ALTER TABLE "field_operator_locations" ADD CONSTRAINT "field_operator_locations_source_check"
--     CHECK ("source" IN ('mobile', 'web', 'system'));
--   DROP TABLE IF EXISTS "traccar_quarantine_items";
--   DROP TABLE IF EXISTS "traccar_ingress_receipts";
--   DROP TABLE IF EXISTS "vehicle_tracking_bindings";

-- (1) vehicle_tracking_bindings --------------------------------------------------------------------------------------
CREATE TABLE "vehicle_tracking_bindings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "instance_key" TEXT NOT NULL,
  "external_device_key" TEXT NOT NULL,
  "valid_from" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "valid_to" TIMESTAMPTZ(6),
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "vehicle_tracking_bindings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicle_tracking_bindings_validity_check" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from")
);

CREATE UNIQUE INDEX "vehicle_tracking_bindings_tenant_id_id_key"
  ON "vehicle_tracking_bindings"("tenant_id", "id");
CREATE UNIQUE INDEX "vehicle_tracking_bindings_active_device_key"
  ON "vehicle_tracking_bindings"("instance_key", "external_device_key")
  WHERE "valid_to" IS NULL;
CREATE UNIQUE INDEX "vehicle_tracking_bindings_active_vehicle_key"
  ON "vehicle_tracking_bindings"("tenant_id", "vehicle_id")
  WHERE "valid_to" IS NULL;
CREATE INDEX "vehicle_tracking_bindings_tenant_probe_idx"
  ON "vehicle_tracking_bindings"("tenant_id", "instance_key", "external_device_key")
  WHERE "valid_to" IS NULL;

ALTER TABLE "vehicle_tracking_bindings"
  ADD CONSTRAINT "vehicle_tracking_bindings_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicle_tracking_bindings"
  ADD CONSTRAINT "vehicle_tracking_bindings_tenant_id_vehicle_id_fkey"
  FOREIGN KEY ("tenant_id", "vehicle_id") REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vehicle_tracking_bindings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_tracking_bindings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_tracking_bindings_tenant_isolation" ON "vehicle_tracking_bindings";
CREATE POLICY "vehicle_tracking_bindings_tenant_isolation" ON "vehicle_tracking_bindings"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- (2) traccar_ingress_receipts -----------------------------------------------------------------------------------------
CREATE TABLE "traccar_ingress_receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "instance_key" TEXT NOT NULL,
  "message_kind" TEXT NOT NULL,
  "external_event_key" TEXT NOT NULL,
  "payload_digest" TEXT NOT NULL,
  "binding_id" UUID NOT NULL,
  "vehicle_id" UUID NOT NULL,
  "location_id" UUID,
  "traccar_device_id" TEXT NOT NULL,
  "fix_time" TIMESTAMPTZ(6) NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "conflict_count" INTEGER NOT NULL DEFAULT 0,
  "last_conflict_at" TIMESTAMPTZ(6),
  CONSTRAINT "traccar_ingress_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "traccar_ingress_receipts_message_kind_check" CHECK ("message_kind" IN ('position')),
  CONSTRAINT "traccar_ingress_receipts_conflict_count_check" CHECK ("conflict_count" >= 0)
);

CREATE UNIQUE INDEX "traccar_ingress_receipts_tenant_id_id_key"
  ON "traccar_ingress_receipts"("tenant_id", "id");
CREATE UNIQUE INDEX "traccar_ingress_receipts_event_key"
  ON "traccar_ingress_receipts"("instance_key", "message_kind", "external_event_key");
CREATE INDEX "traccar_ingress_receipts_tenant_id_binding_id_idx"
  ON "traccar_ingress_receipts"("tenant_id", "binding_id");

ALTER TABLE "traccar_ingress_receipts"
  ADD CONSTRAINT "traccar_ingress_receipts_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "traccar_ingress_receipts"
  ADD CONSTRAINT "traccar_ingress_receipts_tenant_id_binding_id_fkey"
  FOREIGN KEY ("tenant_id", "binding_id") REFERENCES "vehicle_tracking_bindings"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "traccar_ingress_receipts"
  ADD CONSTRAINT "traccar_ingress_receipts_tenant_id_location_id_fkey"
  FOREIGN KEY ("tenant_id", "location_id") REFERENCES "field_operator_locations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "traccar_ingress_receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "traccar_ingress_receipts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "traccar_ingress_receipts_tenant_isolation" ON "traccar_ingress_receipts";
CREATE POLICY "traccar_ingress_receipts_tenant_isolation" ON "traccar_ingress_receipts"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- (3) traccar_quarantine_items (GLOBAL: sem RLS, sem tenant_id, sem coordenada, sem payload) -----------------------
CREATE TABLE "traccar_quarantine_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "instance_key" TEXT NOT NULL,
  "external_device_key" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "first_fix_at" TIMESTAMPTZ(6) NOT NULL,
  "last_fix_at" TIMESTAMPTZ(6) NOT NULL,
  "delivery_count" INTEGER NOT NULL DEFAULT 1,
  "last_event_key" TEXT NOT NULL,
  "last_payload_digest" TEXT NOT NULL,
  "resolved_at" TIMESTAMPTZ(6),
  "resolution" TEXT,
  CONSTRAINT "traccar_quarantine_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "traccar_quarantine_items_delivery_count_check" CHECK ("delivery_count" >= 1),
  CONSTRAINT "traccar_quarantine_items_fix_window_check" CHECK ("first_fix_at" <= "last_fix_at"),
  CONSTRAINT "traccar_quarantine_items_reason_check" CHECK ("reason" IN (
    'unmapped_device',
    'invalid_fix',
    'tenant_inactive',
    'fix_before_active_binding',
    'fix_in_future',
    'no_operator_at_fix_time',
    'ambiguous_operator_at_fix_time',
    'operator_history_ambiguous',
    'resolution_budget_exceeded',
    'idempotency_key_owned_elsewhere'
  ))
);

CREATE UNIQUE INDEX "traccar_quarantine_items_open_episode_key"
  ON "traccar_quarantine_items"("instance_key", "external_device_key", "reason")
  WHERE "resolved_at" IS NULL;

-- (4) CHECK de field_operator_locations.source: DROP + ADD NOT VALID (o VALIDATE vai na migração seguinte) ---------
ALTER TABLE "field_operator_locations" DROP CONSTRAINT "field_operator_locations_source_check";
ALTER TABLE "field_operator_locations" ADD CONSTRAINT "field_operator_locations_source_check"
  CHECK ("source" IN ('mobile', 'web', 'system', 'traccar')) NOT VALID;

-- (5) field_dispatches.operator_assigned_at + gatilho ------------------------------------------------------------
ALTER TABLE "field_dispatches" ADD COLUMN "operator_assigned_at" TIMESTAMPTZ(6);

CREATE FUNCTION "field_dispatch_operator_assigned_at"() RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
AS $trc01$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.operator_assigned_at := now();
  ELSIF NEW.operator_user_id IS DISTINCT FROM OLD.operator_user_id THEN
    NEW.operator_assigned_at := now();
  ELSE
    NEW.operator_assigned_at := OLD.operator_assigned_at;
  END IF;
  RETURN NEW;
END;
$trc01$;

CREATE TRIGGER "field_dispatches_operator_assigned_at"
  BEFORE INSERT OR UPDATE ON "field_dispatches"
  FOR EACH ROW EXECUTE FUNCTION "field_dispatch_operator_assigned_at"();
