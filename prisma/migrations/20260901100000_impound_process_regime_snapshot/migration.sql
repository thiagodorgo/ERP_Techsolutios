-- B-O6R-12 (Ω6R-DAT-004) — regime normativo gravado no processo na abertura.
-- O backfill usa o perfil atual por decisão do dono (D-PORTAO-9-RECOMENDACOES-1011, Q4).
-- Se SET NOT NULL falhar, a transação inteira reverte. Sanear e executar:
-- npx prisma migrate resolve --rolled-back 20260901100000_impound_process_regime_snapshot
BEGIN;

ALTER TABLE public."impound_processes" ADD COLUMN "regime_scope" TEXT, ADD COLUMN "regime_owner_notif_days" INTEGER, ADD COLUMN "regime_notice_edict_day" INTEGER, ADD COLUMN "regime_auction_eligible_day" INTEGER, ADD COLUMN "regime_auction_edict_business_days" INTEGER, ADD COLUMN "regime_daily_model" TEXT, ADD COLUMN "regime_daily_cap" TEXT, ADD COLUMN "regime_release_requirements" JSONB, ADD COLUMN "regime_daily_service_catalog_id" UUID;

DO $b12backfill$
DECLARE v_tenant uuid;
BEGIN
  FOR v_tenant IN SELECT id FROM public.tenants ORDER BY id LOOP
    PERFORM set_config('app.current_tenant_id', v_tenant::text, true);
    UPDATE public."impound_processes" ip SET "regime_scope" = jp."scope", "regime_owner_notif_days" = jp."owner_notif_days", "regime_notice_edict_day" = jp."notice_edict_day", "regime_auction_eligible_day" = jp."auction_eligible_day", "regime_auction_edict_business_days" = jp."auction_edict_business_days", "regime_daily_model" = jp."daily_model", "regime_daily_cap" = jp."daily_cap", "regime_release_requirements" = jp."release_requirements", "regime_daily_service_catalog_id" = jp."daily_service_catalog_id"
      FROM public."jurisdiction_profiles" jp
     WHERE jp."tenant_id" = ip."tenant_id" AND jp."id" = ip."profile_id" AND ip."tenant_id" = v_tenant;
  END LOOP;
END $b12backfill$;

ALTER TABLE public."impound_processes" ALTER COLUMN "regime_scope" SET NOT NULL, ALTER COLUMN "regime_owner_notif_days" SET NOT NULL, ALTER COLUMN "regime_notice_edict_day" SET NOT NULL, ALTER COLUMN "regime_auction_eligible_day" SET NOT NULL, ALTER COLUMN "regime_auction_edict_business_days" SET NOT NULL, ALTER COLUMN "regime_daily_model" SET NOT NULL, ALTER COLUMN "regime_daily_cap" SET NOT NULL, ALTER COLUMN "regime_release_requirements" SET NOT NULL;

ALTER TABLE public."impound_processes" ADD CONSTRAINT "impound_processes_tenant_id_regime_daily_service_catalog_i_fkey" FOREIGN KEY ("tenant_id", "regime_daily_service_catalog_id") REFERENCES public."service_catalog"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION public."impound_process_regime_stamp"() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $b12stamp$
DECLARE p RECORD;
BEGIN
  SELECT "scope", "owner_notif_days", "notice_edict_day", "auction_eligible_day", "auction_edict_business_days", "daily_model", "daily_cap", "release_requirements", "daily_service_catalog_id"
    INTO p FROM public."jurisdiction_profiles" WHERE "tenant_id" = NEW."tenant_id" AND "id" = NEW."profile_id";
  IF NOT FOUND THEN
    RAISE EXCEPTION 'impound_processes: perfil normativo inexistente nesta organizacao' USING ERRCODE = 'foreign_key_violation', CONSTRAINT = 'impound_processes_tenant_id_profile_id_fkey';
  END IF;
  NEW."regime_scope" := p."scope";
  NEW."regime_owner_notif_days" := p."owner_notif_days";
  NEW."regime_notice_edict_day" := p."notice_edict_day";
  NEW."regime_auction_eligible_day" := p."auction_eligible_day";
  NEW."regime_auction_edict_business_days" := p."auction_edict_business_days";
  NEW."regime_daily_model" := p."daily_model";
  NEW."regime_daily_cap" := p."daily_cap";
  NEW."regime_release_requirements" := p."release_requirements";
  NEW."regime_daily_service_catalog_id" := p."daily_service_catalog_id";
  RETURN NEW;
END;
$b12stamp$;

CREATE TRIGGER "impound_processes_regime_stamp" BEFORE INSERT ON public."impound_processes" FOR EACH ROW EXECUTE FUNCTION public."impound_process_regime_stamp"();

CREATE FUNCTION public."impound_process_regime_immutable"() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp AS $b12immut$
BEGIN
  IF NEW."profile_id" IS DISTINCT FROM OLD."profile_id" OR NEW."regime_scope" IS DISTINCT FROM OLD."regime_scope" OR NEW."regime_owner_notif_days" IS DISTINCT FROM OLD."regime_owner_notif_days" OR NEW."regime_notice_edict_day" IS DISTINCT FROM OLD."regime_notice_edict_day" OR NEW."regime_auction_eligible_day" IS DISTINCT FROM OLD."regime_auction_eligible_day" OR NEW."regime_auction_edict_business_days" IS DISTINCT FROM OLD."regime_auction_edict_business_days" OR NEW."regime_daily_model" IS DISTINCT FROM OLD."regime_daily_model" OR NEW."regime_daily_cap" IS DISTINCT FROM OLD."regime_daily_cap" OR NEW."regime_release_requirements" IS DISTINCT FROM OLD."regime_release_requirements" OR NEW."regime_daily_service_catalog_id" IS DISTINCT FROM OLD."regime_daily_service_catalog_id" THEN
    RAISE EXCEPTION 'impound_processes: regime normativo do processo e imutavel' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$b12immut$;

CREATE TRIGGER "impound_processes_regime_immutable" BEFORE UPDATE ON public."impound_processes" FOR EACH ROW EXECUTE FUNCTION public."impound_process_regime_immutable"();

COMMIT;

-- ROLLBACK (desligar sem perder o retrato). Executar numa transação com ON_ERROR_STOP.
--   ALTER TABLE "impound_processes" ALTER COLUMN "regime_scope" DROP NOT NULL, ALTER COLUMN "regime_owner_notif_days" DROP NOT NULL, ALTER COLUMN "regime_notice_edict_day" DROP NOT NULL, ALTER COLUMN "regime_auction_eligible_day" DROP NOT NULL, ALTER COLUMN "regime_auction_edict_business_days" DROP NOT NULL, ALTER COLUMN "regime_daily_model" DROP NOT NULL, ALTER COLUMN "regime_daily_cap" DROP NOT NULL, ALTER COLUMN "regime_release_requirements" DROP NOT NULL;
--   DROP TRIGGER IF EXISTS "impound_processes_regime_immutable" ON "impound_processes";
--   DROP TRIGGER IF EXISTS "impound_processes_regime_stamp" ON "impound_processes";
--   DROP FUNCTION IF EXISTS "impound_process_regime_immutable"();
--   DROP FUNCTION IF EXISTS "impound_process_regime_stamp"();
-- Correção excepcional de retrato não nulo incorreto: migração aditiva própria, censo por organização,
-- DISABLE/ENABLE TRIGGER dentro da mesma transação e auditoria do conjunto corrigido. Não usar em runtime.
