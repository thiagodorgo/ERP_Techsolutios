-- B-O6R-04a — CENSO de duplicatas em stock_movements (Ω6R-DAT-002/003). SOMENTE LEITURA: o arquivo contém apenas consultas (SELECT); nada é gravado.
-- Uso (ato do dono, ANTES do próximo deploy de staging/produção): psql "$STAGING_DATABASE_URL" -f scripts/inventory-duplicates-census.sql
-- Saída: uma linha por grupo duplicado (com tenant_id — a saída fica com o dono, não é versionada) + um resumo. 0 linhas = deploy livre.
SELECT 'estorno' AS tipo, tenant_id, reverses_movement_id AS chave_1, NULL::uuid AS chave_2, count(*) AS linhas, array_agg(id ORDER BY created_at) AS movimentos
  FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1
UNION ALL
SELECT 'ajuste_contagem', tenant_id, cycle_count_id, item_id, count(*), array_agg(id ORDER BY created_at)
  FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1
ORDER BY 1, 2;
SELECT count(*) FILTER (WHERE reverses_movement_id IS NOT NULL) AS estornos, count(*) FILTER (WHERE cycle_count_id IS NOT NULL) AS ajustes_de_contagem FROM stock_movements;
