-- B-ASS-02 (M1) — catálogo de planos e assinatura por organização. ADITIVA e forward-only; nenhuma tabela
-- existente é alterada. AUTORIZADA pela fala do dono de 31/10 ~22:15 (siga na recomendação de tudo, exceto p14),
-- que respondeu a P1 (autorizar as 7 de esquema e 3 de dados, uma a uma) — §3.10 e §12.1 do plano.
-- O QUE TOCA: cria subscription_plans e subscription_plan_versions (GLOBAIS, sem RLS — catálogo da plataforma,
-- leitura só por rota platform:*) e tenant_subscriptions e tenant_subscription_addons (RLS ENABLE+FORCE, molde
-- 20260879000000). CHECKs, UNIQUEs parciais e RLS vivem aqui (o Prisma não modela). TRANSAÇÃO EXPLÍCITA
-- (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): falha em qualquer sentença -> nada aplicado.
-- ROLLBACK (runbook, MANUAL): bloco -- down no fim deste arquivo.

BEGIN;

CREATE TABLE "subscription_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'base',
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_plans_kind_check" CHECK ("kind" IN ('base', 'addon_tracking'))
);

CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

CREATE TABLE "subscription_plan_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "valid_from" TIMESTAMPTZ(6) NOT NULL,
  "valid_to" TIMESTAMPTZ(6),
  "monthly_price" DECIMAL(12,2) NOT NULL,
  "included_users" INTEGER NOT NULL,
  "included_storage_gb" DECIMAL(12,3) NOT NULL,
  "extra_user_price" DECIMAL(12,2) NOT NULL,
  "extra_gb_price" DECIMAL(12,2) NOT NULL,
  "per_vehicle_price" DECIMAL(12,2),
  "pricing_unit" TEXT NOT NULL DEFAULT 'flat',
  "modules" TEXT[] NOT NULL,
  "notes" TEXT,
  "inaugural" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "subscription_plan_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "subscription_plan_versions_pricing_unit_check" CHECK ("pricing_unit" IN ('flat', 'per_vehicle')),
  CONSTRAINT "subscription_plan_versions_valid_to_check" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from")
);

CREATE UNIQUE INDEX "subscription_plan_versions_plan_id_version_key" ON "subscription_plan_versions"("plan_id", "version");
CREATE INDEX "subscription_plan_versions_plan_id_valid_from_idx" ON "subscription_plan_versions"("plan_id", "valid_from");

ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tenant_subscriptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "valid_from" TIMESTAMPTZ(6) NOT NULL,
  "valid_to" TIMESTAMPTZ(6),
  "monthly_price_override" DECIMAL(12,2),
  "included_users_override" INTEGER,
  "included_storage_gb_override" DECIMAL(12,3),
  "extra_user_price_override" DECIMAL(12,2),
  "extra_gb_price_override" DECIMAL(12,2),
  "due_days" INTEGER NOT NULL DEFAULT 10,
  "status" TEXT NOT NULL DEFAULT 'active',
  "ended_reason" TEXT,
  "ended_by" UUID,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_subscriptions_status_check" CHECK ("status" IN ('active', 'ended')),
  CONSTRAINT "tenant_subscriptions_valid_to_check" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from")
);

CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_id_key" ON "tenant_subscriptions"("tenant_id", "id");
CREATE INDEX "tenant_subscriptions_tenant_id_plan_id_idx" ON "tenant_subscriptions"("tenant_id", "plan_id");
CREATE INDEX "tenant_subscriptions_tenant_id_valid_from_idx" ON "tenant_subscriptions"("tenant_id", "valid_from");
-- UNIQUE parcial: UMA vigente por organização (vive só na migração; o Prisma não modela).
CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_active_key" ON "tenant_subscriptions"("tenant_id") WHERE "valid_to" IS NULL;

ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "tenant_subscription_addons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "valid_from" TIMESTAMPTZ(6) NOT NULL,
  "valid_to" TIMESTAMPTZ(6),
  "per_vehicle_price_override" DECIMAL(12,2),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_subscription_addons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_subscription_addons_valid_to_check" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from")
);

CREATE UNIQUE INDEX "tenant_subscription_addons_tenant_id_id_key" ON "tenant_subscription_addons"("tenant_id", "id");
CREATE INDEX "tenant_subscription_addons_tenant_id_subscription_id_idx" ON "tenant_subscription_addons"("tenant_id", "subscription_id");
CREATE INDEX "tenant_subscription_addons_tenant_id_valid_from_idx" ON "tenant_subscription_addons"("tenant_id", "valid_from");
-- UNIQUE parcial: UM add-on de rastreamento vigente por assinatura (Básico OU Plus; G15).
CREATE UNIQUE INDEX "tenant_subscription_addons_tenant_id_subscription_active_key"
  ON "tenant_subscription_addons"("tenant_id", "subscription_id") WHERE "valid_to" IS NULL;

ALTER TABLE "tenant_subscription_addons" ADD CONSTRAINT "tenant_subscription_addons_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscription_addons" ADD CONSTRAINT "tenant_subscription_addons_tenant_id_subscription_id_fkey"
  FOREIGN KEY ("tenant_id", "subscription_id") REFERENCES "tenant_subscriptions"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_subscription_addons" ADD CONSTRAINT "tenant_subscription_addons_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS nas tabelas de organização (molde 20260879000000: ENABLE + FORCE + política do GUC).
ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscriptions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_subscriptions_tenant_isolation" ON "tenant_subscriptions";
CREATE POLICY "tenant_subscriptions_tenant_isolation" ON "tenant_subscriptions"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tenant_subscription_addons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscription_addons" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_subscription_addons_tenant_isolation" ON "tenant_subscription_addons";
CREATE POLICY "tenant_subscription_addons_tenant_isolation" ON "tenant_subscription_addons"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real; psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>):
--   DROP TABLE IF EXISTS "tenant_subscription_addons";
--   DROP TABLE IF EXISTS "tenant_subscriptions";
--   DROP TABLE IF EXISTS "subscription_plan_versions";
--   DROP TABLE IF EXISTS "subscription_plans";
--   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260893000000_ass02_subscription_plans';
--   -- as políticas, índices e FKs caem junto com as tabelas; nenhuma outra tabela é tocada.
