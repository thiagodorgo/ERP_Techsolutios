-- PRE-CONDICAO DE PAPEL (C1-F1, fail-closed): rode com um papel SUPERUSUARIO ou BYPASSRLS. Sob FORCE RLS, qualquer outro papel veria ZERO linhas e este censo mentiria "0 grupos"; a linha SET abaixo faz o Postgres RECUSAR (42501) em vez de filtrar.
\set ON_ERROR_STOP on
SET row_security = off;
-- B-O6R-04a — CENSO de duplicatas em stock_movements (Ω6R-DAT-002/003). SOMENTE LEITURA: o arquivo contém apenas consultas (SELECT); nada é gravado.
-- Uso (ato do dono, ANTES do próximo deploy de staging/produção — P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD):
--   psql "$STAGING_DATABASE_URL" -f scripts/inventory-duplicates-census.sql
--   psql "$PROD_DATABASE_URL" -f scripts/inventory-duplicates-census.sql
-- Saída: uma linha por grupo duplicado (com tenant_id — a saída fica com o dono, NÃO é versionada) + um resumo.
-- 0 linhas na primeira consulta SOB UM PAPEL QUE ENXERGA (superusuario/BYPASSRLS; senao o SET acima aborta com 42501)
-- = a migration 20260873000000_add_stock_movements_unique_backstops aplica.
-- N > 0 = decisão humana por grupo (qual compensação/ajuste vale; o outro é estornado por movimento compensatório,
-- nunca apagado — o razão é imutável) ANTES do deploy. Roteiro completo: plano do B-O6R-04a §4.3.
SELECT 'estorno' AS tipo, tenant_id, reverses_movement_id AS chave_1, NULL::uuid AS chave_2, count(*) AS linhas, array_agg(id ORDER BY created_at) AS movimentos
  FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1
UNION ALL
SELECT 'ajuste_contagem', tenant_id, cycle_count_id, item_id, count(*), array_agg(id ORDER BY created_at)
  FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1
ORDER BY 1, 2;
SELECT count(*) FILTER (WHERE reverses_movement_id IS NOT NULL) AS estornos, count(*) FILTER (WHERE cycle_count_id IS NOT NULL) AS ajustes_de_contagem FROM stock_movements;
-- (3) R19 — sessoes NAO terminais sobrepostas por item (I9): o anexo de P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD
-- referencia ESTA consulta, nunca SQL solto. O lado fechado e derivado: NOT IN (terminais).
SELECT 'sessoes_sobrepostas' AS tipo, e.tenant_id, e.item_id AS chave_1, NULL::uuid AS chave_2, count(DISTINCT c.id) AS linhas, array_agg(DISTINCT c.id) AS sessoes FROM cycle_count_entries e JOIN cycle_counts c ON c.tenant_id = e.tenant_id AND c.id = e.cycle_count_id WHERE c.status NOT IN ('concluida', 'cancelada') GROUP BY e.tenant_id, e.item_id HAVING count(DISTINCT c.id) > 1;
