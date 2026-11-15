-- B-ASS-09 (M6) — grupo econômico, vínculo de organização a grupo por vigência e câmbio da plataforma.
-- AUTORIZADA pela P1 de 31/10 (`D-COBRANCA-RESPOSTAS-3110`, "7 de esquema", a M6 entre elas). ADITIVA e forward-only:
-- nenhuma tabela existente é alterada; a relação inversa em `model Tenant` não gera DDL em `tenants`.
-- O QUE TOCA:
--   * `btree_gist` (extensão "trusted" do contrib do PG 16): permite `tenant_id WITH =` dentro do índice GiST da exclusão.
--   * `economic_groups` (GLOBAL, sem RLS — exceção declarada no plano: o grupo não pertence a organização nenhuma; só rotas
--     requirePlatformPermission leem e escrevem). CHECK do nome (1 a 120 caracteres depois do btrim) e índice único
--     funcional `lower(btrim(name))` entre os não excluídos (vive só aqui; o Prisma não modela índice de expressão).
--   * `economic_group_members` (DA ORGANIZAÇÃO, RLS ENABLE + FORCE, molde 20260896000000). Vigência em data de negócio SP,
--     `[valid_from, valid_to)`, `valid_to` NULL = aberto. Uma organização tem no máximo um vínculo em qualquer dia:
--     `EXCLUDE USING gist (tenant_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&)` — o limite superior NULL é
--     infinito, então dois vínculos abertos também se excluem. A checagem da restrição enxerga a tabela toda (sem filtro de
--     RLS) e só compara linhas da mesma organização.
--   * `platform_fx_rates` (GLOBAL, só acréscimo: cada correção é versão nova; a vigente é a de maior `version`).
-- TRANSAÇÃO EXPLÍCITA (D-MIGRACAO-COM-TRANSACAO-EXPLICITA): falha em qualquer sentença -> nada aplicado. Drill por prefixo em
-- `tests/ass-09-groups-fx-migration-drill-db.test.ts`.
-- ROLLBACK (runbook, MANUAL): bloco -- down no fim deste arquivo. A extensão FICA (exceção declarada): é inerte sem a tabela.

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "economic_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "notes" TEXT,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "economic_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "economic_groups_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX "economic_groups_name_active_key" ON "economic_groups" (lower(btrim("name"))) WHERE "deleted_at" IS NULL;

CREATE TABLE "economic_group_members" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "valid_from" DATE NOT NULL,
  "valid_to" DATE,
  "created_by" UUID,
  "closed_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "economic_group_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "economic_group_members_valid_to_check" CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from")
);

CREATE INDEX "economic_group_members_tenant_id_valid_from_idx" ON "economic_group_members"("tenant_id", "valid_from");
CREATE INDEX "economic_group_members_group_id_valid_from_idx" ON "economic_group_members"("group_id", "valid_from");

ALTER TABLE "economic_group_members" ADD CONSTRAINT "economic_group_members_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "economic_group_members" ADD CONSTRAINT "economic_group_members_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "economic_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE economic_group_members ADD CONSTRAINT economic_group_members_no_overlap EXCLUDE USING gist (tenant_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&);

-- RLS nas tabelas de organização (molde 20260896000000: ENABLE + FORCE + política do GUC).
ALTER TABLE "economic_group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economic_group_members" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "economic_group_members_tenant_isolation" ON "economic_group_members";
CREATE POLICY "economic_group_members_tenant_isolation" ON "economic_group_members"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE TABLE "platform_fx_rates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "month" CHAR(7) NOT NULL,
  "currency_from" CHAR(3) NOT NULL,
  "currency_to" CHAR(3) NOT NULL DEFAULT 'BRL',
  "rate" DECIMAL(18,6) NOT NULL,
  "version" INTEGER NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "platform_fx_rates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_fx_rates_month_check" CHECK ("month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "platform_fx_rates_rate_check" CHECK ("rate" > 0),
  CONSTRAINT "platform_fx_rates_version_check" CHECK ("version" >= 1),
  CONSTRAINT "platform_fx_rates_currency_check" CHECK ("currency_from" ~ '^[A-Z]{3}$' AND "currency_to" = 'BRL' AND "currency_from" <> "currency_to")
);

CREATE UNIQUE INDEX "platform_fx_rates_month_currency_from_currency_to_version_key" ON "platform_fx_rates"("month", "currency_from", "currency_to", "version");

COMMIT;

-- down (MANUAL, nunca automático; só em ambiente SEM dado real — destrói os grupos e as taxas cadastrados; em produção o
-- rollback é reverter o código e deixar as tabelas; psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>):
--   DROP TABLE IF EXISTS "platform_fx_rates";
--   DROP TABLE IF EXISTS "economic_group_members";
--   DROP TABLE IF EXISTS "economic_groups";
--   -- a extensão btree_gist FICA (exceção declarada): inerte sem a tabela, e derrubá-la quebraria migração futura que a use.
--   -- DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260903000000_ass09_economic_groups_fx_rates';
