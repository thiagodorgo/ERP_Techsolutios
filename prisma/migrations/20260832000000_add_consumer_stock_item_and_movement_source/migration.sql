-- Block Ω4C PR-08b (Baixa automática de estoque — seam consumidor) — ALTER ADITIVA sobre fuel_logs +
-- maintenance_order_items + stock_movements (as três já existentes). NÃO cria tabela; NÃO altera tipo de coluna
-- existente. Estritamente up-only / NÃO-DESTRUTIVA (respeita a parada §C7.5 — sem DROP/ALTER destrutivo). As três
-- tabelas já têm ENABLE/FORCE ROW LEVEL SECURITY + policy de isolamento por tenant desde a criação; as colunas
-- novas HERDAM a RLS (mesma linha) — nenhuma policy nova. seed.ts / catalog de permissões INTOCADOS (a fatia reusa
-- inventory_items:* / stock_movements:* e é EFEITO DE DOMÍNIO service→service, sem permissão nova — como o PR-06).
--
-- === fuel_logs — item de estoque baixado no abastecimento INTERNO (D-Ω4C-INV-STOCK-DECREMENT) ===
-- (1) stock_item_id — QUAL item de estoque a baixa do abastecimento INTERNO consome (nullable; externo/legado
--     ficam NULL). FK COMPOSTA (tenant_id, stock_item_id) -> inventory_items(tenant_id, id) ON DELETE RESTRICT: o
--     item referenciado é do MESMO tenant (23503 cross-tenant); RESTRICT bloqueia remover um item que AINDA é
--     fonte de uma baixa. Coluna NULL → FK composta (MATCH SIMPLE, default do Postgres) não é checada. Índice
--     tenant-first (tenant_id 1º — invariante multi-tenant) p/ o lookup por item.
--
-- === maintenance_order_items — item de estoque baixado no item Tipo=ESTOQUE (idem) ===
-- (2) stock_item_id — idem (nullable; service/product/legado ficam NULL) + FK COMPOSTA RESTRICT + índice tenant-first.
--
-- === stock_movements — proveniência genérica da baixa + idempotência POR ORIGEM (D-Ω4C-INV-MOVEMENT-SOURCE) ===
-- (3) source_type / (4) source_id — par GENÉRICO de proveniência (fuel_log|maintenance_item). Ambos NULLABLE, SEM
--     backfill, SEM FK nativa ao alvo variável (integridade app-level, como financial_titles 20260822000000 e
--     professional_statement_entries 20260823000000). O movimento manual/legado e o estorno compensatório ficam
--     com source_id NULL. source_type é TEXT (String no Prisma); source_id é UUID.
-- (5) ÍNDICE PARCIAL UNIQUE de idempotência de origem: no MÁX. 1 movimento por (tenant, source_type, source_id) —
--     a baixa é ONE-SHOT por entidade-fonte (fuel_log:id / maintenance_item:id); o estorno compensatório carrega
--     source_id NULL (identificado por reverses_movement_id) → fora do índice; movimentos manuais/legados (source_id
--     NULL) também ficam de fora. Espelha financial_titles_source_direction_active_key. O Prisma NÃO modela índice
--     PARCIAL → vive só aqui (como o unique parcial dos vizinhos).
--
-- Aditivo puro (ADD COLUMN nullable + ADD CONSTRAINT FK + CREATE INDEX). Rollback (ordem reversa; up-only por
-- política — DROP só em rollback manual):
--   DROP INDEX IF EXISTS "stock_movements_source_active_key";
--   ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "source_id";
--   ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "source_type";
--   DROP INDEX IF EXISTS "maintenance_order_items_tenant_id_stock_item_id_idx";
--   ALTER TABLE "maintenance_order_items" DROP CONSTRAINT IF EXISTS "maintenance_order_items_stock_item_fkey";
--   ALTER TABLE "maintenance_order_items" DROP COLUMN IF EXISTS "stock_item_id";
--   DROP INDEX IF EXISTS "fuel_logs_tenant_id_stock_item_id_idx";
--   ALTER TABLE "fuel_logs" DROP CONSTRAINT IF EXISTS "fuel_logs_stock_item_fkey";
--   ALTER TABLE "fuel_logs" DROP COLUMN IF EXISTS "stock_item_id";

ALTER TABLE "fuel_logs" ADD COLUMN "stock_item_id" UUID;

ALTER TABLE "fuel_logs"
  ADD CONSTRAINT "fuel_logs_stock_item_fkey"
  FOREIGN KEY ("tenant_id", "stock_item_id")
  REFERENCES "inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fuel_logs_tenant_id_stock_item_id_idx"
  ON "fuel_logs" ("tenant_id", "stock_item_id");

ALTER TABLE "maintenance_order_items" ADD COLUMN "stock_item_id" UUID;

ALTER TABLE "maintenance_order_items"
  ADD CONSTRAINT "maintenance_order_items_stock_item_fkey"
  FOREIGN KEY ("tenant_id", "stock_item_id")
  REFERENCES "inventory_items"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "maintenance_order_items_tenant_id_stock_item_id_idx"
  ON "maintenance_order_items" ("tenant_id", "stock_item_id");

ALTER TABLE "stock_movements" ADD COLUMN "source_type" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "source_id" UUID;

CREATE UNIQUE INDEX "stock_movements_source_active_key"
  ON "stock_movements" ("tenant_id", "source_type", "source_id")
  WHERE "source_id" IS NOT NULL;
