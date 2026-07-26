-- Block Ω5P PR-05 (NÚCLEO da custódia): tabelas "impound_processes" (agregado-raiz, ESTUDO §4.1) e
-- "custody_events" (timeline APPEND-ONLY hash-encadeada, I2). É o registro-PROVA do domínio: integridade,
-- atribuição e retenção antes de conveniência.
--
-- ADITIVA / UP-ONLY (C7.5): CREATE TABLE das 2 tabelas NOVAS + índices + FK compostas tenant-first + partial-
-- unique de idempotência + CHECKs estruturais + TRIGGER append-only + RLS. Toque em tabela existente = ZERO
-- (só back-relations no schema Prisma — nenhuma coluna nova/ALTER/DROP). Enums em INGLÊS validados na APP
-- (status FSM §4.2 14 estados; type CustodyEventType) — SEM CHECK de enum no banco (padrão FASE0 §3.5).
-- Labels PT-BR na fronteira do DTO. Dinheiro/km NÃO nesta fatia (a diária é PR-07); valores futuros no
-- payload Json vão como STRING (nunca float — determinismo da cadeia).
--
-- I2 (CustodyEvent append-only, hash-encadeado) tem DUAS garantias estruturais além da app:
--   (1) TRIGGER "custody_events_block_mutation" BEFORE UPDATE OR DELETE → RAISE EXCEPTION: nenhuma linha de
--       evento pode ser mutada/apagada pela role da app (NOSUPERUSER). Correção retroativa = novo evento
--       ADJUSTMENT (nunca UPDATE). Diverge do padrão WorkOrderEvent/AuditLog (que confiam na disciplina da
--       app) — proposta explícita ao dba-guardião: append-only é INQUEBRÁVEL nesta fatia probatória. O
--       teardown de teste/manutenção usa session_replication_role=replica (SÓ superuser pode setar), o caminho
--       padrão do Postgres — a role da app permanece bloqueada. Consistente com I9 (retenção ≥5 anos, exclusão
--       física VEDADA). MODELO DE AMEAÇA HONESTO: tamper-EVIDENT (detecta), não tamper-PROOF contra escrita
--       irrestrita de superuser que recompute a cadeia + a âncora; a âncora externa forte (Sivec/notarização)
--       é Ω6 (D-Ω5P-05). O cross-anchor em audit_logs (store independente, na MESMA tx do append) eleva o
--       custo do forjamento a adulterar DOIS stores auditados.
--   (2) process → RESTRICT (NÃO Cascade): apagar um processo com eventos falha; o evento nunca cascateia (I9).
--
-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator, espírito do
-- yard_spots_status_process_coherence_chk):
--   - identity: não-identificado ⇒ justificativa; identificado ⇒ ≥1 identificador (fecha D-Ω5P-09 no banco).
--   - freeze: não congela (frozen_at) antes de entrar (entered_at).
--   - seq >= 1; hash/prev_hash no formato sha256 hex (^[0-9a-f]{64}$) — hash malformado é rejeitado pelo banco.
--
-- Idempotência do gatilho OS→custódia (D-Ω5P-RECON-B): índice PARCIAL único (tenant_id, service_order_id)
-- WHERE service_order_id IS NOT NULL — no MÁX. 1 processo por OS (raw-only, padrão yard_spots_current_process_key).
-- 2º processo p/ a mesma OS → 23505 → a app traduz para 409. NULLs distintos ⇒ N processos sem OS convivem.
--
-- NÃO nesta migração (deferido, evita tocar yard_spots): a FK dura yard_spots.current_process_id →
-- impound_processes fica p/ PR-06 (quando a alocação ganha o wire real). Aqui a integridade
-- current_process_id ↔ processo segue app-level (mesma disciplina de PR-01).
--
-- RLS ENABLE+FORCE+policy (USING + WITH CHECK em app.current_tenant_id) nas 2 tabelas — clonada de
-- 20260833000000_add_yard:138-157. tenant_id 1º em todo índice composto.
--
-- Rollback (runbook — tabelas NOVAS + função/trigger; reverter o PR remove tudo sem afetar dado existente):
--   DROP TRIGGER IF EXISTS "custody_events_block_mutation" ON "custody_events";
--   DROP FUNCTION IF EXISTS custody_events_block_mutation();
--   DROP TABLE IF EXISTS "custody_events", "impound_processes" CASCADE;
-- (policies, índices, partial-unique e CHECKs caem junto das tabelas; a função/trigger são o único objeto a
--  desfazer à parte.)

-- CreateTable
CREATE TABLE "impound_processes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "vehicle_plate" TEXT,
    "vehicle_chassis" TEXT,
    "vehicle_renavam" TEXT,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_color" TEXT,
    "vehicle_year" INTEGER,
    "vehicle_unidentified" BOOLEAN NOT NULL DEFAULT false,
    "unidentified_reason" TEXT,
    "yard_id" UUID,
    "profile_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_REMOVAL',
    "entered_at" TIMESTAMPTZ(6),
    "frozen_at" TIMESTAMPTZ(6),
    "origin_authority" TEXT NOT NULL,
    "origin_agent_name" TEXT,
    "authority_case_number" TEXT,
    "incident_report_number" TEXT,
    "legal_basis" TEXT,
    "service_order_id" UUID,
    "custody_seq_head" INTEGER NOT NULL DEFAULT 0,
    "custody_hash_head" TEXT,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "impound_processes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custody_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "actor_id" UUID,
    "prev_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "custody_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "impound_processes_tenant_id_id_key" ON "impound_processes"("tenant_id", "id");
CREATE INDEX "impound_processes_tenant_id_yard_id_status_idx" ON "impound_processes"("tenant_id", "yard_id", "status");
CREATE INDEX "impound_processes_tenant_id_vehicle_plate_idx" ON "impound_processes"("tenant_id", "vehicle_plate");
CREATE INDEX "impound_processes_tenant_id_status_idx" ON "impound_processes"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "custody_events_tenant_id_id_key" ON "custody_events"("tenant_id", "id");
-- Ordem contígua por processo + backstop de corrida: 2 tx que passem do lock por caminhos distintos e computem
-- o mesmo seq → o 2º commit viola este índice (23505 → a app traduz para 409 concurrent_custody_append).
CREATE UNIQUE INDEX "custody_events_tenant_id_process_id_seq_key" ON "custody_events"("tenant_id", "process_id", "seq");
CREATE INDEX "custody_events_tenant_id_process_id_occurred_at_idx" ON "custody_events"("tenant_id", "process_id", "occurred_at");
CREATE INDEX "custody_events_tenant_id_type_idx" ON "custody_events"("tenant_id", "type");

-- AddForeignKey (compostas tenant-first; TODAS RESTRICT — I9: nada de custódia cascateia)
ALTER TABLE "impound_processes" ADD CONSTRAINT "impound_processes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_processes" ADD CONSTRAINT "impound_processes_tenant_id_yard_id_fkey" FOREIGN KEY ("tenant_id", "yard_id") REFERENCES "yards"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_processes" ADD CONSTRAINT "impound_processes_tenant_id_profile_id_fkey" FOREIGN KEY ("tenant_id", "profile_id") REFERENCES "jurisdiction_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_processes" ADD CONSTRAINT "impound_processes_tenant_id_service_order_id_fkey" FOREIGN KEY ("tenant_id", "service_order_id") REFERENCES "work_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_tenant_id_actor_id_fkey" FOREIGN KEY ("tenant_id", "actor_id") REFERENCES "users"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Idempotência OS→custódia (D-Ω5P-RECON-B): índice PARCIAL único (raw-only, não declarado no Prisma model,
-- como yard_spots_current_process_key / attachments_idem_key). No máx. 1 processo por OS; NULLs distintos.
CREATE UNIQUE INDEX "impound_processes_tenant_service_order_key"
  ON "impound_processes"("tenant_id", "service_order_id")
  WHERE "service_order_id" IS NOT NULL;

-- CHECKs ESTRUTURAIS (NÃO enum-CHECK; belt-and-suspenders sobre o validator).
-- identidade: não-identificado ⇒ justificativa não vazia; identificado ⇒ ≥1 identificador (placa/chassi/renavam).
ALTER TABLE "impound_processes"
  ADD CONSTRAINT "impound_processes_identity_chk"
  CHECK (
    ("vehicle_unidentified" = true
       AND "unidentified_reason" IS NOT NULL
       AND length(btrim("unidentified_reason")) > 0)
    OR ("vehicle_unidentified" = false
       AND ("vehicle_plate" IS NOT NULL OR "vehicle_chassis" IS NOT NULL OR "vehicle_renavam" IS NOT NULL))
  );
-- congelamento coerente: não há T_stop (frozen_at) sem t0 (entered_at).
ALTER TABLE "impound_processes"
  ADD CONSTRAINT "impound_processes_freeze_chk"
  CHECK ("frozen_at" IS NULL OR "entered_at" IS NOT NULL);
-- seq contíguo começa em 1.
ALTER TABLE "custody_events"
  ADD CONSTRAINT "custody_events_seq_chk"
  CHECK ("seq" >= 1);
-- formato do hash: sha256 hex minúsculo de 64 chars — hash/prev_hash malformado é rejeitado pelo próprio banco.
ALTER TABLE "custody_events"
  ADD CONSTRAINT "custody_events_hash_shape_chk"
  CHECK ("hash" ~ '^[0-9a-f]{64}$' AND "prev_hash" ~ '^[0-9a-f]{64}$');

-- TRIGGER append-only (I2 no nível do banco). Bloqueia QUALQUER UPDATE ou DELETE em custody_events. A role da
-- app (NOSUPERUSER) não consegue contornar; a manutenção/teardown usa session_replication_role=replica
-- (só superuser), o caminho de manutenção padrão do Postgres (o trigger não dispara em modo replica).
CREATE OR REPLACE FUNCTION custody_events_block_mutation() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'custody_events is append-only (I2): % is forbidden. Retroactive correction = new ADJUSTMENT event.', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "custody_events_block_mutation"
  BEFORE UPDATE OR DELETE ON "custody_events"
  FOR EACH ROW EXECUTE FUNCTION custody_events_block_mutation();

-- RLS por tabela (clona 20260833000000_add_yard:138-157).
ALTER TABLE "impound_processes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impound_processes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impound_processes_tenant_isolation" ON "impound_processes";
CREATE POLICY "impound_processes_tenant_isolation" ON "impound_processes"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "custody_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custody_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custody_events_tenant_isolation" ON "custody_events";
CREATE POLICY "custody_events_tenant_isolation" ON "custody_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
