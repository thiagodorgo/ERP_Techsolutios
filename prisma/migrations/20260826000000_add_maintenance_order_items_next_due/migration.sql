-- Block Ω4C PR-06 (Manutenção — itens + totais derivados + próxima manutenção):
--   (1) CREATE TABLE "maintenance_order_items" — grade de itens (linhas) de uma manutenção
--       (D-Ω4C-MANUT-ITEMS). Tabela FILHA (não JSON embutido): query por linha, RLS própria e total
--       honesto/verificável exigem tabela filha. item_type enum-app service|product|stock (labels
--       SERVIÇO/PRODUTO/ESTOQUE, SEM CHECK — validado na app, padrão da rodada). unit_value é coluna NOVA
--       Decimal(12,2) (invariante da rodada; NÃO reusa o `cost` legado 20,6 da manutenção). quantity
--       Decimal(10,3). O total da LINHA (unit_value × quantity) e os totais do cabeçalho (Σ) são DERIVADOS
--       server-side, NUNCA persistidos (mesma disciplina KM/L do PR-05 e saldo do PR-03).
--   (2) ALTER TABLE "maintenance_orders" ADD COLUMN "next_due_at" — data prevista da PRÓXIMA manutenção,
--       por TEMPO (D-Ω4C-MANUT-NEXTDUE-NOTIF). Nullable, SEM default → aditivo puro (sem reescrita de linha).
--       A recorrência por KM/hodômetro é parada honesta D-007 → PR-16 (telemetria não existe).
--
-- FK COMPOSTA (tenant_id, maintenance_order_id) → maintenance_orders(tenant_id, id) ON DELETE RESTRICT
-- (posse do pai; manutenção com item não é apagada). FK tenant RESTRICT. Espelha o padrão
-- operator_profiles/professional_statement_entries/scheduled_notifications: PK uuid, @@unique([tenant_id,id]),
-- timestamptz, RLS ENABLE+FORCE + policy em app.current_tenant_id (clona 20260823000000). tenant_id é o 1º
-- campo de TODO índice.
--
-- Aditivo puro (CREATE TABLE + índices/constraints da tabela nova + ADD COLUMN nullable; nenhum ALTER/DROP
-- destrutivo em coluna existente — respeita a parada §C7.5). NENHUMA mudança em scheduled_notifications (o
-- dedupe da próxima manutenção usa o client_action_id determinístico já suportado pelo motor PR-04).
--
-- Rollback (tabela nova sem dependente + coluna nova — up-only por política; DROP só em rollback manual):
--   DROP TABLE IF EXISTS "maintenance_order_items" CASCADE;
--   ALTER TABLE "maintenance_orders" DROP COLUMN IF EXISTS "next_due_at";

CREATE TABLE "maintenance_order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "maintenance_order_id" UUID NOT NULL,
  "item_type" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit_value" DECIMAL(12,2) NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "maintenance_order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "maintenance_order_items_tenant_id_id_key"
  ON "maintenance_order_items"("tenant_id", "id");
CREATE INDEX "maintenance_order_items_order_idx"
  ON "maintenance_order_items"("tenant_id", "maintenance_order_id");
CREATE INDEX "maintenance_order_items_order_type_idx"
  ON "maintenance_order_items"("tenant_id", "maintenance_order_id", "item_type");

ALTER TABLE "maintenance_order_items"
  ADD CONSTRAINT "maintenance_order_items_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_order_items"
  ADD CONSTRAINT "maintenance_order_items_order_fkey"
  FOREIGN KEY ("tenant_id", "maintenance_order_id") REFERENCES "maintenance_orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "maintenance_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_order_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "maintenance_order_items_tenant_isolation" ON "maintenance_order_items";
CREATE POLICY "maintenance_order_items_tenant_isolation" ON "maintenance_order_items"
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

-- (2) Coluna aditiva na tabela EXISTENTE maintenance_orders (nullable, sem default → aditivo puro).
ALTER TABLE "maintenance_orders" ADD COLUMN "next_due_at" TIMESTAMPTZ(6);
