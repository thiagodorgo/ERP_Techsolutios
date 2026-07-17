-- Block Ω3F-6a (D-Ω3F-6) — Cancelar com DECISÃO FINANCEIRA + Duplicar idempotente.
-- ADITIVA PURA: só ADD COLUMN (nullable, sem default) + CREATE UNIQUE INDEX parcial em work_orders.
-- Nenhuma coluna/linha existente é reescrita; toda OS legada fica com NULL nas duas colunas.
--
-- financial_cancellation_decision: keep | keep_unpaid | zero (validado na aplicação, sem enum/CHECK —
--   precedente work_orders.status/priority, que também são TEXT livres no banco). É a FONTE DE VERDADE
--   que o módulo de comissões vai honrar depois (P-Ω3F6-COMISSAO); NULL = OS nunca cancelada por este
--   fluxo (inclui as canceladas pelo endpoint de status legado, anterior ao bloco).
-- client_action_id: idempotência do DUPLICATE (GAP-1 do dossiê Ω3F-4 — o create de OS não tinha).
--   TENANT-SCOPED: RLS não limita UNIQUE, então a chave inclui tenant_id (precedente
--   work_order_attachments 20260801000000 / work_order_financial_items 20260803000000).
--
-- Índice único PARCIAL (WHERE client_action_id IS NOT NULL): replay do duplicate → 409. O `create`
-- normal de OS NÃO carimba client_action_id (fica NULL) e por isso cai FORA do índice — N linhas com
-- NULL convivem sem colidir. work_orders NÃO tem deleted_at (não há delete lógico de OS: o ciclo
-- termina em status=cancelled), então — ao contrário dos vizinhos — a cláusula parcial NÃO filtra por
-- deleted_at.
--
-- RLS: work_orders JÁ tem ENABLE/FORCE + policy tenant_isolation desde a migration de origem; ADD
-- COLUMN não a afeta e ela NÃO é recriada aqui.
--
-- Rollback (ordem reversa):
--   DROP INDEX IF EXISTS "work_orders_idem_key";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "client_action_id";
--   ALTER TABLE "work_orders" DROP COLUMN IF EXISTS "financial_cancellation_decision";

ALTER TABLE "work_orders" ADD COLUMN "financial_cancellation_decision" TEXT;
ALTER TABLE "work_orders" ADD COLUMN "client_action_id" TEXT;

-- Idempotência (409) do duplicate: TENANT-SCOPED e só entre as OS que carregam a chave.
CREATE UNIQUE INDEX "work_orders_idem_key"
  ON "work_orders"("tenant_id", "client_action_id")
  WHERE "client_action_id" IS NOT NULL;
