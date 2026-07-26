-- Block Ω5P PR-03 (tariffs ESTENDER — Rota P): estende o CONTÊINER "price_tables" com 2 eixos NULLABLE —
-- scope (dupla natureza tarifária, ESTUDO §9: convênio público × contrato privado) e vehicle_category (eixo
-- categoria-de-veículo × serviço, FASE0 §5e). A tarifa por categoria×serviço×escopo×data que o motor de diárias
-- (charging PR-07, I4) vai resolver via resolveTariff (inerte/aditivo neste PR, igual ao findApplicable do Ω3-a).
--
-- ROTA P (D-Ω5P-TAR-01) — escopar o CONTÊINER, NÃO a linha: a categoria/escopo entram como colunas do
-- "price_tables"; a tabela "tariffs" e a sua chave natural @@unique([tenant_id, price_table_id,
-- service_catalog_id, customer_id]) ("tariffs_natural_key", 20260724000000:35-36) permanecem BYTE-IDÊNTICAS.
-- Categoria-na-linha seria impossível truly-additive (exigiria DROP+CREATE da unique = DESTRUTIVO, vedado por
-- J-OMEGA5P §5 / FASE0 ACHADO-4). ServiceCatalog-por-categoria descartado (polui WorkOrder).
--
-- ADITIVA / UP-ONLY (C7.5): 2 ADD COLUMN nullable (sem default → legado = NULL = curinga vale-para-todos, os 10
-- registros existentes na base de dev seguem íntegros) + 1 CREATE INDEX (tenant_id 1º). ZERO toque em "tariffs".
-- ZERO DROP/ALTER destrutivo. NENHUM enum-CHECK (scope/vehicle_category validados na APP — padrão FASE0 §3.5,
-- idêntico ao jurisdiction). Enums em INGLÊS na APP (PUBLIC_AGREEMENT|PRIVATE_CONTRACT — MESMO enum de
-- JurisdictionProfile.scope, 20260834000000:33); labels PT-BR na fronteira do DTO.
--
-- RLS já EXISTE e é HERDADA: "price_tables" já tem ENABLE+FORCE ROW LEVEL SECURITY + policy
-- "price_tables_tenant_isolation" (20260723000000:38-43); ADD COLUMN/CREATE INDEX não alteram RLS — nada a
-- refazer. ("tariffs" também já tem RLS, 20260724000000:53-58 — e não é tocada aqui.)
--
-- Rollback (runbook — reverte só o aditivo; dado legado intacto, as colunas nasceram NULL):
--   DROP INDEX IF EXISTS "price_tables_tenant_id_status_scope_vehicle_category_idx";
--   ALTER TABLE "price_tables" DROP COLUMN IF EXISTS "vehicle_category", DROP COLUMN IF EXISTS "scope";

-- AlterTable — 2 colunas NULLABLE, sem default (legado = NULL = curinga).
ALTER TABLE "price_tables" ADD COLUMN "scope" TEXT;
ALTER TABLE "price_tables" ADD COLUMN "vehicle_category" TEXT;

-- CreateIndex — suporta o lookup publicado×escopo×categoria da resolução escopada; tenant_id 1º (equality-prefix).
CREATE INDEX "price_tables_tenant_id_status_scope_vehicle_category_idx" ON "price_tables"("tenant_id", "status", "scope", "vehicle_category");
