-- Block Ω3F-7a — Quilometragem (km) da OS: o app PREENCHE (via sync), a base CORRIGE (via PATCH).
-- ADITIVA PURA: só ADD COLUMN (nullable, sem default) em work_orders. Nenhuma coluna/linha existente é
-- reescrita; toda OS legada fica com NULL nas quatro colunas novas.
--
-- mileage_start / mileage_end: quilometragem inicial/final do atendimento (odômetro). DECIMAL(10,1) —
--   uma casa decimal basta para km (precedente das colunas Decimal já existentes na tabela). NULL até o
--   app/base preencher. A validação de faixa (end >= start) e de valor (>= 0) vive na APLICAÇÃO
--   (parseOptionalMileage / setMileage), sem CHECK — precedente work_orders.status/priority (TEXT livres).
-- mileage_source: origem do último preenchimento — "app" (técnico de campo, via fila offline) ou "base"
--   (correção do escritório, via PATCH). TEXT livre validado na aplicação. NULL enquanto não preenchida.
-- mileage_corrected_at: carimbo de quando a BASE corrigiu (source="base"); NULL quando só o app preencheu
--   ou quando ainda não houve km. Rastreabilidade da correção do escritório.
--
-- RLS: work_orders JÁ tem ENABLE/FORCE + policy tenant_isolation desde a migration de origem; ADD COLUMN
-- não a afeta e ela NÃO é recriada aqui.
--
-- Rollback (ordem reversa):
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "mileage_corrected_at";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "mileage_source";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "mileage_end";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "mileage_start";

ALTER TABLE "work_orders" ADD COLUMN "mileage_start" DECIMAL(10,1);
ALTER TABLE "work_orders" ADD COLUMN "mileage_end" DECIMAL(10,1);
ALTER TABLE "work_orders" ADD COLUMN "mileage_source" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "mileage_corrected_at" TIMESTAMPTZ(6);
