-- B-O6R-04a (Ω6R-DAT-002 / DAT-003) — DOIS backstops de banco, para QUALQUER escritor:
--   (1) no máximo UMA compensação por movimento original;  (2) no máximo UM ajuste por (sessão de contagem, item).
-- Aditiva pura: 2 índices parciais únicos; nenhuma coluna, nenhum DROP, nenhum UPDATE/DELETE de dado.
-- FAIL-CLOSED: o censo abaixo ABORTA (zero mutação) se houver duplicata de legado e NUNCA deduplica. A mensagem traz a
-- CONTAGEM REAL de grupos (M-01) e uma amostra de até 20, por id de MOVIMENTO / CONTAGEM / ITEM (nunca tenant_id — §B2.8).
-- Se abortar: a migração fica marcada como falhada em _prisma_migrations e TODO deploy seguinte responde P3009 até
-- `prisma migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops` (M-02; roteiro no plano §4.3).
DO $censo$
DECLARE grupos bigint; amostra text;
BEGIN
  WITH g AS (
    SELECT 'estorno duplicado: original=' || reverses_movement_id::text || ' x' || count(*) AS chave
      FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1
    UNION ALL
    SELECT 'ajuste duplicado: contagem=' || cycle_count_id::text || ' item=' || item_id::text || ' x' || count(*)
      FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1)
  SELECT count(*), (SELECT string_agg(chave, '; ') FROM (SELECT chave FROM g ORDER BY 1 LIMIT 20) s) INTO grupos, amostra FROM g;
  IF grupos > 0 THEN
    RAISE EXCEPTION 'stock_movements: % grupo(s) DUPLICADO(S) de legado (Ω6R-DAT-002/003). Os indices unicos nao podem nascer sobre dado inconsistente; NADA foi mutado; NADA foi deduplicado (qual compensacao vale e decisao humana). Rode scripts/inventory-duplicates-census.sql, consulte P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD e, depois de sanear, `prisma migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops`. Amostra (ate 20 de %): %', grupos, grupos, amostra
      USING ERRCODE = 'raise_exception';
  END IF;
END $censo$;

CREATE UNIQUE INDEX "stock_movements_reversal_active_key"
  ON "stock_movements" ("tenant_id", "reverses_movement_id") WHERE "reverses_movement_id" IS NOT NULL;
CREATE UNIQUE INDEX "stock_movements_cycle_count_item_key"
  ON "stock_movements" ("tenant_id", "cycle_count_id", "item_id") WHERE "cycle_count_id" IS NOT NULL;

-- down (provado em T-C4: up -> down -> re-up em banco descartável, pg_indexes 2 -> 0 -> 2):
--   DROP INDEX IF EXISTS "stock_movements_cycle_count_item_key";
--   DROP INDEX IF EXISTS "stock_movements_reversal_active_key";
