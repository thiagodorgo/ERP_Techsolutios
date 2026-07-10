-- Block Ω1b-2 (Mapa · geocodificação de chamados): 2 colunas aditivas de cache de geocoding em
-- "work_orders". SOMENTE ADITIVO. Nenhuma coluna existente é tocada; ambas são NULL, então toda OS
-- pré-existente valida sem reescrita (linha sem geocode fica NULL e o mapa a lista no painel
-- "Sem localização" — PD-002). "work_orders" já carrega "service_latitude"/"service_longitude"
-- NUMERIC(10,7) desde 20260616000000_add_work_orders; este bloco só adiciona o METADADO do cache:
-- quando o endereço foi geocodificado e qual a fonte. A tabela já tem RLS
-- (ENABLE+FORCE+policy em app.current_tenant_id) — nenhuma mudança de RLS/FK/índice (a query do
-- mapa não filtra por estas colunas; o geocode filtra por PK+tenant). Espelha o padrão aditivo do
-- bloco 20260711000000_add_work_order_registry_fks.
--
--   - "service_geocoded_at"     (TIMESTAMPTZ(6), NULL): quando o endereço virou lat/lng.
--   - "service_geocode_source"  (TEXT, NULL): fonte da coordenada (ex.: 'nominatim' | 'seed').
--
-- Rollback (reverse order):
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "service_geocode_source";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "service_geocoded_at";

ALTER TABLE "work_orders" ADD COLUMN "service_geocoded_at" TIMESTAMPTZ(6);
ALTER TABLE "work_orders" ADD COLUMN "service_geocode_source" TEXT;
