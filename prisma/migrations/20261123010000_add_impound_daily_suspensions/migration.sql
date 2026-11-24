-- E11.2 — período sem diária (leilão/legado congelado). Tabela NOVA e aditiva: "impound_daily_suspensions".
-- A diária para na preparação (AUCTION_PREP) e fecha em cada saída do leilão; o teto é 180 para tudo e o tempo
-- em leilão não conta. A conversão do congelamento legado grava LEGACY_FREEZE. Sem exclusão: a linha só nasce e
-- só se fecha. Rollback: DROP TABLE IF EXISTS "impound_daily_suspensions"; (policy, índices, índice parcial e
-- CHECKs caem junto do DROP TABLE).

BEGIN;

CREATE TABLE "impound_daily_suspensions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "process_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    CONSTRAINT "impound_daily_suspensions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "impound_daily_suspensions_tenant_id_id_key"
  ON "impound_daily_suspensions"("tenant_id", "id");
CREATE INDEX "impound_daily_suspensions_tenant_id_process_id_started_at_idx"
  ON "impound_daily_suspensions"("tenant_id", "process_id", "started_at");

-- Idempotência de período aberto: no máximo um período sem fim por processo.
CREATE UNIQUE INDEX "impound_daily_suspensions_open_idem_key"
  ON "impound_daily_suspensions"("tenant_id", "process_id")
  WHERE "ended_at" IS NULL;

ALTER TABLE "impound_daily_suspensions"
  ADD CONSTRAINT "impound_daily_suspensions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "impound_daily_suspensions"
  ADD CONSTRAINT "impound_daily_suspensions_tenant_id_process_id_fkey"
  FOREIGN KEY ("tenant_id", "process_id") REFERENCES "impound_processes"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "impound_daily_suspensions"
  ADD CONSTRAINT "impound_daily_suspensions_ended_at_chk"
  CHECK ("ended_at" IS NULL OR "ended_at" >= "started_at");

ALTER TABLE "impound_daily_suspensions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "impound_daily_suspensions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impound_daily_suspensions_tenant_isolation" ON "impound_daily_suspensions";
CREATE POLICY "impound_daily_suspensions_tenant_isolation" ON "impound_daily_suspensions"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;