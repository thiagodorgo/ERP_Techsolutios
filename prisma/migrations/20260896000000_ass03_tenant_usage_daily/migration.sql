-- B-ASS-03 (M2) — medição diária por organização. ADITIVA e forward-only; nenhuma tabela existente é
-- alterada. AUTORIZADA pela fala do dono de 31/10 ~22:15 ("siga na recomendação de tudo, exceto p14"),
-- que respondeu a P1 (autorizar as 7 de esquema e 3 de dados, uma a uma) — §3.10 e §12.1 do plano.
-- O QUE TOCA: cria tenant_usage_daily (RLS ENABLE+FORCE, molde 20260879000000). UNIQUE (tenant_id,date)
-- e índice (tenant_id,date). TRANSAÇÃO EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA).
-- ROLLBACK (runbook, MANUAL): bloco -- down no fim deste arquivo.

BEGIN;

CREATE TABLE "tenant_usage_daily" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "active_users" INTEGER,
  "db_bytes_estimated" BIGINT,
  "files_bytes" BIGINT,
  "files_without_size" INTEGER,
  "tracked_vehicles" INTEGER,
  "method_version" INTEGER NOT NULL,
  "measured_at" TIMESTAMPTZ(6) NOT NULL,
  "metadata" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_usage_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_usage_daily_tenant_id_date_key" ON "tenant_usage_daily"("tenant_id", "date");
CREATE INDEX "tenant_usage_daily_tenant_id_date_idx" ON "tenant_usage_daily"("tenant_id", "date");

ALTER TABLE "tenant_usage_daily" ADD CONSTRAINT "tenant_usage_daily_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS nas tabelas de organização (molde 20260879000000: ENABLE + FORCE + política do GUC).
ALTER TABLE "tenant_usage_daily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_usage_daily" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_usage_daily_tenant_isolation" ON "tenant_usage_daily";
CREATE POLICY "tenant_usage_daily_tenant_isolation" ON "tenant_usage_daily"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real; psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>):
--   DROP TABLE IF EXISTS "tenant_usage_daily";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260896000000_ass03_tenant_usage_daily';
--   -- as políticas, índices e FK caem junto com a tabela; nenhuma outra tabela é tocada.
