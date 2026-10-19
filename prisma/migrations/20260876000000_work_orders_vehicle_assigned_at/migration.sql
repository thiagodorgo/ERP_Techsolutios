-- B-TRC-01 ciclo 2 (J-B-TRC-01-ciclo1, (c)-1; decisão do dono 2026-09-08 "vínculo por janela de tempo, nunca mapa
-- estático") — desde QUANDO a OS tem a viatura atual. Gravada SÓ pelo gatilho (o valor que o cliente mandar é
-- ignorado), espelho de field_dispatches.operator_assigned_at (20260874000000, item 5). Nulo nas linhas anteriores
-- à migração = inelegível na atribuição (falha fechada), até a próxima troca/atribuição de viatura ou o próximo
-- UPDATE da linha (ver função). SECURITY INVOKER; não é RULE; não eleva privilégio.
-- ROLLBACK (manual, só em ambiente SEM dado real), em ordem reversa:
--   DROP TRIGGER IF EXISTS "work_orders_vehicle_assigned_at" ON "work_orders";
--   DROP FUNCTION IF EXISTS "work_order_vehicle_assigned_at"();
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "vehicle_assigned_at";

ALTER TABLE "work_orders" ADD COLUMN "vehicle_assigned_at" TIMESTAMPTZ(6);

CREATE FUNCTION "work_order_vehicle_assigned_at"() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER AS $trc01c2$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.vehicle_assigned_at := CASE WHEN NEW.vehicle_id IS NULL THEN NULL ELSE now() END;
  ELSIF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
    NEW.vehicle_assigned_at := CASE WHEN NEW.vehicle_id IS NULL THEN NULL ELSE now() END;
  ELSIF OLD.vehicle_assigned_at IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    -- Linha anterior à migração: passa a ser elegível a partir do primeiro UPDATE depois dela. Conservador: a
    -- viatura já era esta em algum instante <= now(); fixes anteriores continuam fora.
    NEW.vehicle_assigned_at := now();
  ELSE
    NEW.vehicle_assigned_at := OLD.vehicle_assigned_at;
  END IF;
  RETURN NEW;
END;
$trc01c2$;

CREATE TRIGGER "work_orders_vehicle_assigned_at"
  BEFORE INSERT OR UPDATE ON "work_orders" FOR EACH ROW EXECUTE FUNCTION "work_order_vehicle_assigned_at"();
