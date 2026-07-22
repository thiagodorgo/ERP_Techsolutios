-- Block Ω4C PR-05 (Abastecimento — posto interno/externo + fornecedor): ALTER ADITIVA sobre
-- fuel_logs (tabela já existente da 20260712000000). NÃO cria tabela; NÃO altera tipo de coluna
-- existente. Estritamente up-only / não-destrutiva (respeita a parada §C7.5 — sem DROP/ALTER
-- destrutivo). fuel_logs já tem ENABLE/FORCE ROW LEVEL SECURITY + policy fuel_logs_tenant_isolation
-- (da 20260712000000); as colunas novas HERDAM a RLS da tabela (mesma linha) — nenhuma policy nova.
--
-- (1) station_type — enum-app INTERNO/EXTERNO da MARCAÇÃO do posto (validado na aplicação, SEM CHECK,
--     padrão de enum-app da rodada). TEXT NOT NULL DEFAULT 'external': o default faz backfill
--     semanticamente correto das linhas legadas (que só tinham `station` texto = posto externo;
--     "interno" era inexpressável antes da coluna).
--
-- (2) supplier_id — fornecedor do abastecimento EXTERNO (posto/rede). NULLABLE (INTERNO e legado
--     ficam NULL). FK COMPOSTA (tenant_id, supplier_id) -> suppliers(tenant_id, id) ON DELETE RESTRICT
--     (espelha a FK composta de vehicle da 20260712000000): um fuel_log só referencia fornecedor do
--     MESMO tenant; RESTRICT bloqueia remover fornecedor ainda referenciado. Com supplier_id NULL a
--     FK composta (MATCH SIMPLE, default do Postgres) não é checada — INTERNO/legado ficam livres.
--     Índice (tenant_id, supplier_id) com tenant_id 1º (invariante multi-tenant).
--
-- A baixa de estoque do abastecimento INTERNO é DEFERIDA a PR-10/11 (custódia BASE/PROFESSIONAL/VEHICLE
-- + flag "combustível" no item ainda não existem) — esta migração só entrega a MARCAÇÃO. NENHUM
-- stock_item_id / movimento de estoque aqui (D-Ω4C-FUEL-STOCK-DEFER). total_value/liters permanecem
-- Decimal(20,6) pré-existente — ALTER de tipo seria destrutivo/proibido (D-Ω4C-FUEL-MONEY-PRECISION).
--
-- Rollback (ordem reversa; up-only por política — DROP só em rollback manual):
--   DROP INDEX IF EXISTS "fuel_logs_tenant_id_supplier_id_idx";
--   ALTER TABLE "fuel_logs" DROP CONSTRAINT IF EXISTS "fuel_logs_tenant_id_supplier_id_fkey";
--   ALTER TABLE "fuel_logs" DROP COLUMN IF EXISTS "supplier_id";
--   ALTER TABLE "fuel_logs" DROP COLUMN IF EXISTS "station_type";

ALTER TABLE "fuel_logs" ADD COLUMN "station_type" TEXT NOT NULL DEFAULT 'external';
ALTER TABLE "fuel_logs" ADD COLUMN "supplier_id" UUID;

ALTER TABLE "fuel_logs"
  ADD CONSTRAINT "fuel_logs_tenant_id_supplier_id_fkey"
  FOREIGN KEY ("tenant_id", "supplier_id") REFERENCES "suppliers"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "fuel_logs_tenant_id_supplier_id_idx"
  ON "fuel_logs"("tenant_id", "supplier_id");
