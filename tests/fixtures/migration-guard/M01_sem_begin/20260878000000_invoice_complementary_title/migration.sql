-- B-SAN3-02 — título COMPLEMENTAR para o delta de itens (D-SAN3-02-TITULO-COMPLEMENTAR revê o MECANISMO da D-Ω4-C2;
-- o motivo e a D-Ω4-C1 não mudam). Q1–Q3 = SIM ("sim para tudo") e Q4 = SIM ("Q4, sim"), dono, 2026-10-19.
-- Aditiva (ADD COLUMN anulável + índice único auxiliar + FK + CHECK + CREATE INDEX) mais a TROCA do índice de
-- idempotência autorizada no §5 do SAN3: o velho só sai DEPOIS de o novo existir, dentro da transação EXPLÍCITA
-- abaixo (BEGIN … COMMIT; sem CONCURRENTLY). Nenhuma linha removida; nenhum UPDATE/DELETE de dado.
--
-- TRANSAÇÃO EXPLÍCITA (ciclo 2, achado C2-01 da junta de 2026-10-20): o `prisma migrate deploy` 7.8 executa o script
-- sentença a sentença, em autocommit — NÃO numa transação única (medido: falha depois da sentença k deixava 1..k
-- aplicadas, P3018, e o redeploy quebrava em 42701). Por isso o corpo vai entre BEGIN e COMMIT: falha em qualquer
-- sentença → nada aplicado, índice antigo intacto (T-D(f)). Deploy falho: o CLI mostra só "current transaction is
-- aborted" (a causa real está no log do servidor Postgres); recuperação = `prisma migrate resolve --rolled-back
-- 20260878000000_invoice_complementary_title` e `prisma migrate deploy` de novo (converge; T-D(f)). Sem CONCURRENTLY.

-- (1) parent_title_id: NULL = título ORIGINAL (todo o legado); id = COMPLEMENTAR do original ativo da MESMA OS e direção.
ALTER TABLE "financial_titles" ADD COLUMN "parent_title_id" UUID;

-- (2) chave única AUXILIAR, alvo da FK de 4 colunas (id já é PK → sempre satisfeita; aditiva). Q4.
CREATE UNIQUE INDEX "financial_titles_tenant_wo_direction_id_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction", "id");

-- (3) o pai é da MESMA organização, OS e direção — amarrado pelo BANCO. RESTRICT: pai nunca é apagado fisicamente. Q4.
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_parent_title_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id", "direction", "parent_title_id")
  REFERENCES "financial_titles" ("tenant_id", "work_order_id", "direction", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- (4) MATCH SIMPLE não avalia a FK se work_order_id for NULL: complementar só existe com OS, e nunca aponta para
--     si (legado: parent NULL → satisfaz). Q4.
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_parent_requires_work_order_check"
  CHECK ("parent_title_id" IS NULL OR ("work_order_id" IS NOT NULL AND "parent_title_id" <> "id"));

-- (5) backstop de "no máximo um ORIGINAL ativo por (tenant, OS, direção)": mesmo conjunto de chaves do índice
--     antigo para TODO o legado (parent NULL) → não pode violar; complementares ficam fora do predicado.
CREATE UNIQUE INDEX "financial_titles_wo_direction_original_active_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction")
  WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL AND "parent_title_id" IS NULL;

-- (6) só depois de o novo existir: o antigo sai.
DROP INDEX IF EXISTS "financial_titles_wo_direction_active_key";

COMMIT;

-- RLS: a coluna herda financial_titles_tenant_isolation (20260810); a FK não passa pela RLS, mas tenant_id está na
-- chave. Nenhuma policy nova.
--
-- down (MANUAL, nunca automático; invocar `psql -v ON_ERROR_STOP=1 --single-transaction -f <down.sql>` — sem ON_ERROR_STOP o psql segue no 23505 e derruba coluna e backstop com ec 0, R2 do DBA; provado no drill: up → down → re-up em base própria; DUAS PONTAS, como 20260869):
--   CREATE UNIQUE INDEX "financial_titles_wo_direction_active_key" ON "financial_titles" ("tenant_id","work_order_id","direction")
--     WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL;   -- FALHA (23505) se já existir complementar ativo: o down
--                                                                   -- PARA aqui, o índice novo FICA e o resto é decisão humana (§C7.5)
--   DROP INDEX IF EXISTS "financial_titles_wo_direction_original_active_key";
--   ALTER TABLE "financial_titles" DROP CONSTRAINT IF EXISTS "financial_titles_parent_requires_work_order_check";
--   ALTER TABLE "financial_titles" DROP CONSTRAINT IF EXISTS "financial_titles_parent_title_fkey";
--   DROP INDEX IF EXISTS "financial_titles_tenant_wo_direction_id_key";
--   ALTER TABLE "financial_titles" DROP COLUMN IF EXISTS "parent_title_id";   -- perde dado se houver complementar: NUNCA automático
