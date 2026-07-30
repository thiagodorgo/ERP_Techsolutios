-- Block Ω5P PR-20 (interop Sivec-ready): tabela NOVA "impound_outbox_events" — fila de entrega da interoperabilidade
-- com o sistema eletrônico do órgão máximo executivo de trânsito da União (Res. CONTRAN 1025/2026 art.9º III/IV;
-- janela de transição do art.44 — lança "pronto para" ANTES da especificação técnica final, SEM integração
-- prematura). Projeta o CustodyEvent do marco-chave (transição ACTIVE_CUSTODY/RELEASED/AUCTIONED/CLOSED, emissão
-- de notificação, fechamento de liquidação) NA MESMA tx do append hash-encadeado — não bifurca uma 2ª fonte de
-- verdade.
--
-- ADITIVA / UP-ONLY (C7.5): CREATE TABLE (NOVA) + índices tenant-first + FK composta tenant-first RESTRICT (I9) +
-- CHECK de status + TRIGGER BEFORE DELETE (bloqueia exclusão física — I9) + RLS ENABLE+FORCE+POLICY. ZERO toque em
-- tabela existente (só a back-relation no schema Prisma de Tenant/ImpoundProcess — metadata-only).
--
-- NÃO é append-only ESTRITO (diverge de custody_events por desenho): é uma FILA de entrega — status/attempts/
-- last_error MUDAM conforme o drenador (Ω6, fora do MVP) tenta a entrega. Mas DELETE é SEMPRE vedado (I9):
-- TRIGGER BEFORE DELETE bloqueia qualquer exclusão física, mesmo espírito de custody_events_block_mutation porém
-- restrito a DELETE (UPDATE de status/attempts/last_error é permitido por desenho da fila).
--
-- Escopo = SÓ CAPTURA (inserir na fila). NENHUM worker de drenagem, NENHUMA chamada HTTP/SDK a um endpoint Sivec
-- real nesta migração/PR (exigiria homologação/credencial do órgão — fora do MVP, mesma fronteira de
-- PD-Ω5P-NOTIF-SEND/PD-Ω5P-SIGN).
--
-- Rollback (runbook — tabela NOVA; reverter o PR remove tudo sem afetar dado existente):
--   DROP TRIGGER IF EXISTS "impound_outbox_events_guard_update" ON "impound_outbox_events";
--   DROP FUNCTION IF EXISTS impound_outbox_events_guard_update();
--   DROP TRIGGER IF EXISTS "impound_outbox_events_block_delete" ON "impound_outbox_events";
--   DROP FUNCTION IF EXISTS impound_outbox_events_block_delete();
--   DROP TABLE IF EXISTS "impound_outbox_events" CASCADE;

-- CreateTable
CREATE TABLE "impound_outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'SIVEC',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "impound_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (tenant_id 1º em todos)
CREATE UNIQUE INDEX "impound_outbox_events_tenant_id_id_key" ON "impound_outbox_events"("tenant_id", "id");
CREATE INDEX "impound_outbox_events_tenant_id_process_id_idx" ON "impound_outbox_events"("tenant_id", "process_id");
CREATE INDEX "impound_outbox_events_tenant_id_status_idx" ON "impound_outbox_events"("tenant_id", "status");

-- AddForeignKey (compostas tenant-first; RESTRICT — I9: nada de custódia cascateia)
ALTER TABLE "impound_outbox_events" ADD CONSTRAINT "impound_outbox_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_outbox_events" ADD CONSTRAINT "impound_outbox_events_tenant_id_process_id_fkey" FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECK ESTRUTURAL (domínio pequeno/estável; belt-and-suspenders sobre o validator da APP).
ALTER TABLE "impound_outbox_events"
  ADD CONSTRAINT "impound_outbox_events_status_chk" CHECK ("status" IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED'));
ALTER TABLE "impound_outbox_events"
  ADD CONSTRAINT "impound_outbox_events_attempts_chk" CHECK ("attempts" >= 0);
ALTER TABLE "impound_outbox_events"
  ADD CONSTRAINT "impound_outbox_events_schema_version_chk" CHECK ("schema_version" >= 1);

-- TRIGGER BEFORE DELETE (I9 no nível do banco): bloqueia QUALQUER DELETE em impound_outbox_events. UPDATE de
-- status/attempts/last_error permanece LIVRE (a fila muda por desenho — não é append-only estrito); UPDATE de
-- qualquer OUTRA coluna é bloqueado pelo trigger BEFORE UPDATE abaixo (captura imutável). A role da app
-- (NOSUPERUSER) não consegue contornar nenhum dos dois; a manutenção/teardown usa
-- session_replication_role=replica (só superuser), o caminho de manutenção padrão do Postgres (os triggers não
-- disparam em modo replica).
CREATE OR REPLACE FUNCTION impound_outbox_events_block_delete() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'impound_outbox_events forbids DELETE (I9 — delivery queue keeps full history): %', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "impound_outbox_events_block_delete"
  BEFORE DELETE ON "impound_outbox_events"
  FOR EACH ROW EXECUTE FUNCTION impound_outbox_events_block_delete();

-- TRIGGER BEFORE UPDATE (achado do crítico-adversarial): a captura é imutável — só a MECÂNICA DE ENTREGA da fila
-- (status/attempts/last_error) pode mudar. Sem esta trava, um UPDATE (bug do drenador Ω6 ou acesso direto)
-- reescreveria payload/tenant_id/process_id/event_type/occurred_at/schema_version/target/created_at já
-- capturados, quebrando a reconciliação 1:1 com o CustodyEvent de origem — a razão de existir do outbox.
CREATE OR REPLACE FUNCTION impound_outbox_events_guard_update() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payload IS DISTINCT FROM OLD.payload
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.process_id IS DISTINCT FROM OLD.process_id
     OR NEW.event_type IS DISTINCT FROM OLD.event_type
     OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
     OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
     OR NEW.target IS DISTINCT FROM OLD.target
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'impound_outbox_events: only status/attempts/last_error may change (immutable capture)'
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "impound_outbox_events_guard_update"
  BEFORE UPDATE ON "impound_outbox_events"
  FOR EACH ROW EXECUTE FUNCTION impound_outbox_events_guard_update();

-- RLS (clona 20260836000000_add_impound:166-172).
ALTER TABLE "impound_outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impound_outbox_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impound_outbox_events_tenant_isolation" ON "impound_outbox_events";
CREATE POLICY "impound_outbox_events_tenant_isolation" ON "impound_outbox_events"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
