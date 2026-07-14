-- Ω3F-2: origem/destino + discriminador de tipo + campos dinâmicos. SOMENTE ADITIVO (ADD COLUMN
-- nullable, e requires_destination com DEFAULT false não-volátil) → metadata-only no Postgres: toda
-- linha pré-existente valida sem reescrita, sem lock relevante. `work_orders` e `service_catalog` JÁ
-- têm RLS ENABLE+FORCE+policy — esta migration NÃO toca RLS/FK/índice. A origem continua nos campos
-- `service_*` (sem rename, retrocompat); só o destino é novo.
--
-- Rollback (down):
--   ALTER TABLE "work_orders"
--     DROP COLUMN IF EXISTS "service_details",
--     DROP COLUMN IF EXISTS "destination_geocode_source",
--     DROP COLUMN IF EXISTS "destination_geocoded_at",
--     DROP COLUMN IF EXISTS "destination_longitude",
--     DROP COLUMN IF EXISTS "destination_latitude",
--     DROP COLUMN IF EXISTS "destination_zip_code",
--     DROP COLUMN IF EXISTS "destination_state",
--     DROP COLUMN IF EXISTS "destination_city",
--     DROP COLUMN IF EXISTS "destination_address";
--   ALTER TABLE "service_catalog"
--     DROP COLUMN IF EXISTS "requires_destination",
--     DROP COLUMN IF EXISTS "service_type";

-- ServiceCatalog: discriminador de tipo (C4)
ALTER TABLE "service_catalog" ADD COLUMN "service_type" TEXT;
ALTER TABLE "service_catalog" ADD COLUMN "requires_destination" BOOLEAN NOT NULL DEFAULT false;

-- WorkOrder: destino (espelho simétrico da origem) + campos dinâmicos por tipo
ALTER TABLE "work_orders" ADD COLUMN "destination_address" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "destination_city" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "destination_state" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "destination_zip_code" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "destination_latitude" DECIMAL(10,7);
ALTER TABLE "work_orders" ADD COLUMN "destination_longitude" DECIMAL(10,7);
ALTER TABLE "work_orders" ADD COLUMN "destination_geocoded_at" TIMESTAMPTZ(6);
ALTER TABLE "work_orders" ADD COLUMN "destination_geocode_source" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "service_details" JSONB;
