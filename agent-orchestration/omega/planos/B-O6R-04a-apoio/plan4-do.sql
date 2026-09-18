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
