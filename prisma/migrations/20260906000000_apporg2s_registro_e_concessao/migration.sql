-- B-APP-ORG-2S (S1) — registro de criacoes de usuario + modo 'concessao' nos dois CHECK.
-- Aditiva, com transacao explicita (D-MIGRACAO-COM-TRANSACAO-EXPLICITA). A volta (down) apaga a
-- tabela e restaura os dois CHECK sem a linha 'concessao'.

BEGIN;

-- Tabela nova: registro de criacoes. seq = identidade (sequencia do banco), chave. Sem group_id:
-- o grupo e lido NA HORA pela volta pátio a pátio (group-peer-probe.ts, dia de negocio de Sao Paulo).
CREATE TABLE "user_creation_log" (
    "seq" BIGINT GENERATED ALWAYS AS IDENTITY,
    "tenant_id" UUID NOT NULL,
    "email_key" TEXT NOT NULL,
    "user_id" UUID,
    "actor_user_id" UUID,
    "origin_tenant_id" UUID,
    "state" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "user_creation_log_pkey" PRIMARY KEY ("seq"),
    CONSTRAINT "user_creation_log_state_chk" CHECK ("state" IN ('em_curso', 'confirmado', 'cancelado', 'concessao'))
);

-- Indice unico parcial: so uma linha 'em_curso' por email_key. E ele que faz a outra criacao
-- esperar ate a transacao em voo terminar.
CREATE UNIQUE INDEX "user_creation_log_em_curso_key" ON "user_creation_log"("email_key") WHERE "state" = 'em_curso';
CREATE INDEX "user_creation_log_tenant_id_seq_idx" ON "user_creation_log"("tenant_id", "seq");

ALTER TABLE "user_creation_log" ADD CONSTRAINT "user_creation_log_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS forcada por organizacao (molde 20260608000000_enable_tenant_rls).
ALTER TABLE "user_creation_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_creation_log" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_creation_log_tenant_isolation" ON "user_creation_log";
CREATE POLICY "user_creation_log_tenant_isolation" ON "user_creation_log"
  USING ("tenant_id"::text = current_setting('app.current_tenant_id', true)) WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true));

-- modo 'concessao' nos dois CHECK (1.8.1 par. 3): vínculo de acesso concedido e o evento dele.
ALTER TABLE "auth_identity_links" DROP CONSTRAINT "auth_identity_links_attached_via_chk";
ALTER TABLE "auth_identity_links"
  ADD CONSTRAINT "auth_identity_links_attached_via_chk" CHECK ("attached_via" IN ('backfill', 'religacao', 'desvinculo', 'concessao'));
ALTER TABLE "auth_identity_link_events" DROP CONSTRAINT "auth_identity_link_events_event_chk";
ALTER TABLE "auth_identity_link_events"
  ADD CONSTRAINT "auth_identity_link_events_event_chk" CHECK ("event" IN ('backfill', 'religacao', 'desvinculo', 'concessao'));

COMMIT;

-- down (drill: desce e sobe). Apaga a tabela e restaura os CHECK sem 'concessao'.
--   DROP TABLE IF EXISTS "user_creation_log";
--   ALTER TABLE "auth_identity_links" DROP CONSTRAINT "auth_identity_links_attached_via_chk";
--   ALTER TABLE "auth_identity_links" ADD CONSTRAINT "auth_identity_links_attached_via_chk" CHECK ("attached_via" IN ('backfill', 'religacao', 'desvinculo'));
--   ALTER TABLE "auth_identity_link_events" DROP CONSTRAINT "auth_identity_link_events_event_chk";
--   ALTER TABLE "auth_identity_link_events" ADD CONSTRAINT "auth_identity_link_events_event_chk" CHECK ("event" IN ('backfill', 'religacao', 'desvinculo'));
