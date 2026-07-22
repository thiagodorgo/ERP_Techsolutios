-- Block Ω4C PR-08 (Estoque com custódia e movimentos — ledger imutável): ALTER ADITIVA sobre
-- stock_movements + inventory_items (ambas já existentes da 20260709000000). NÃO cria tabela; NÃO
-- altera tipo de coluna existente. Estritamente up-only / NÃO-DESTRUTIVA (respeita a parada §C7.5 —
-- sem DROP/ALTER destrutivo). Ambas as tabelas já têm ENABLE/FORCE ROW LEVEL SECURITY + policy de
-- isolamento por tenant desde a criação; as colunas novas HERDAM a RLS (mesma linha) — nenhuma
-- policy nova. seed.ts / catalog de permissões INTOCADOS (PR-08 reusa inventory_items:* / stock_movements:*).
--
-- === stock_movements — custódia + par de transferência + estorno (D-Ω4C-INV-CUSTODY-MODEL) ===
-- (1) custody_type — enum-app BASE/PROFISSIONAL/VIATURA da custódia (validado na app, SEM CHECK, padrão da
--     rodada). TEXT NOT NULL DEFAULT 'base': o default faz backfill semanticamente correto de TODO movimento
--     legado (era estoque da base; espelha o default 'external' do PR-05).
-- (2) custody_operator_profile_id — custódia detida por um PROFISSIONAL (nullable; base/vehicle ficam NULL).
--     FK COMPOSTA (tenant_id, custody_operator_profile_id) -> operator_profiles(tenant_id, id) ON DELETE
--     RESTRICT: um movimento só referencia perfil do MESMO tenant; RESTRICT bloqueia remover um profissional
--     que AINDA detém saldo em custódia (fiel ao AutEM "desvincular devolve à base" ANTES de remover). Com a
--     coluna NULL a FK composta (MATCH SIMPLE, default do Postgres) não é checada.
-- (3) custody_vehicle_id — custódia detida por uma VIATURA (nullable; base/professional ficam NULL). FK
--     COMPOSTA (tenant_id, custody_vehicle_id) -> vehicles(tenant_id, id) ON DELETE RESTRICT. DISTINTA do
--     vehicle_id legado (movimento ATRIBUÍDO a viatura), que permanece INTOCADO — semânticas distintas (D-007).
-- (4) transfer_group_id — par irmão de LINK/UNLINK (2 linhas na MESMA tx compartilham o grupo; global neta a
--     zero). Nullable (movimento simples fica NULL). SEM FK nativa (id de agrupamento lógico).
-- (5) reverses_movement_id — estorno (movimento compensatório aponta ao original; sinal invertido, mesma
--     custódia). Nullable, app-level SEM FK nativa (mesmo tenant — como source_id de financial_titles).
-- Índices (tenant_id 1º — invariante multi-tenant): groupBy por custódia; lookup do par de transferência;
-- lookup do estorno (backstop do guard "estornar 2x -> 409 movement_already_reversed").
--
-- === inventory_items — campos AutEM do item (D-Ω4C-INV-ITEM-FIELDS) ===
-- (6) is_fuel BOOLEAN NOT NULL DEFAULT false — checkbox "Combustível" (habilita no Abastecimento interno; é o
--     contrato que PR-08b lê para a baixa automática). Backfill false = correto (item comum).
-- (7) item_type TEXT NOT NULL DEFAULT 'product' — enum-app PRODUTO/EQUIPAMENTO (SEM CHECK; EQUIPAMENTO oculta
--     compra/venda no front). Backfill 'product' = correto (todo item legado é produto).
-- (8) purchase_price / (9) sale_price NUMERIC(12,2) NULL — atributos do item (só PRODUTO). Seguem a invariante
--     Decimal(12,2) — DISTINTOS do avg_cost legado (20,6), cuja precisão NÃO é alterada (ALTER de tipo seria
--     destrutivo/proibido §C7.5). (10) description TEXT NULL — descrição livre do item.
--
-- A BAIXA AUTOMÁTICA (fuel interno / item Tipo=ESTOQUE / venda-em-serviço no profissional) é DEFERIDA a PR-08b
-- (falta stock_item_id em fuel_logs/maintenance_order_items — ligar agora fabricaria QUAL item baixar;
-- D-Ω4C-INV-STOCK-DEFER-CONSUMER). Esta migração só entrega a FUNDAÇÃO (custódia + LINK/UNLINK/EXIT + flag
-- combustível). NENHUM stock_item_id / movimento fabricado aqui.
--
-- Rollback (ordem reversa; up-only por política — DROP só em rollback manual):
--   DROP INDEX IF EXISTS "stock_movements_tenant_id_reverses_movement_id_idx";
--   DROP INDEX IF EXISTS "stock_movements_tenant_id_transfer_group_id_idx";
--   DROP INDEX IF EXISTS "stock_movements_custody_lookup_idx";
--   ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_custody_vehicle_fkey";
--   ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_custody_operator_fkey";
--   ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "reverses_movement_id";
--   ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "transfer_group_id";
--   ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "custody_vehicle_id";
--   ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "custody_operator_profile_id";
--   ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "custody_type";
--   ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "description";
--   ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "sale_price";
--   ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "purchase_price";
--   ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "item_type";
--   ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "is_fuel";

ALTER TABLE "stock_movements" ADD COLUMN "custody_type" TEXT NOT NULL DEFAULT 'base';
ALTER TABLE "stock_movements" ADD COLUMN "custody_operator_profile_id" UUID;
ALTER TABLE "stock_movements" ADD COLUMN "custody_vehicle_id" UUID;
ALTER TABLE "stock_movements" ADD COLUMN "transfer_group_id" UUID;
ALTER TABLE "stock_movements" ADD COLUMN "reverses_movement_id" UUID;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_custody_operator_fkey"
  FOREIGN KEY ("tenant_id", "custody_operator_profile_id")
  REFERENCES "operator_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_custody_vehicle_fkey"
  FOREIGN KEY ("tenant_id", "custody_vehicle_id")
  REFERENCES "vehicles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "stock_movements_custody_lookup_idx"
  ON "stock_movements" ("tenant_id", "item_id", "custody_type", "custody_operator_profile_id", "custody_vehicle_id");

CREATE INDEX "stock_movements_tenant_id_transfer_group_id_idx"
  ON "stock_movements" ("tenant_id", "transfer_group_id");

CREATE INDEX "stock_movements_tenant_id_reverses_movement_id_idx"
  ON "stock_movements" ("tenant_id", "reverses_movement_id");

ALTER TABLE "inventory_items" ADD COLUMN "is_fuel" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "inventory_items" ADD COLUMN "item_type" TEXT NOT NULL DEFAULT 'product';
ALTER TABLE "inventory_items" ADD COLUMN "purchase_price" NUMERIC(12,2);
ALTER TABLE "inventory_items" ADD COLUMN "sale_price" NUMERIC(12,2);
ALTER TABLE "inventory_items" ADD COLUMN "description" TEXT;
