-- Semente do drill M-02 (forma do C5' de tests/inventory-migration-drill-db.test.ts): 2 organizacoes,
-- 13 grupos de estorno duplicado (7 + 6) e 8 de ajuste duplicado (4 + 4) = 21 grupos. Slug dev389i-m02-%.
DO $$
DECLARE t uuid; it uuid; o uuid; s uuid; other uuid; k int; i int; n_est int;
BEGIN
  FOR k IN 1..2 LOOP
    INSERT INTO tenants (name, slug) VALUES ('dev389i-m02-' || k, 'dev389i-m02-' || k) RETURNING id INTO t;
    it := gen_random_uuid();
    INSERT INTO inventory_items (id, tenant_id, sku, name, unit) VALUES (it, t, 'SKU-M02-' || k, 'SKU-M02-' || k, 'un');
    n_est := CASE WHEN k = 1 THEN 7 ELSE 6 END;
    FOR i IN 1..n_est LOOP
      INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type)
        VALUES (t, it, 'ajuste', 1, 'base') RETURNING id INTO o;
      INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, reverses_movement_id)
        VALUES (t, it, 'ajuste', 1, 'base', o);
      INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, reverses_movement_id)
        VALUES (t, it, 'ajuste', 1, 'base', o);
    END LOOP;
    INSERT INTO cycle_counts (tenant_id) VALUES (t) RETURNING id INTO s;
    FOR i IN 1..4 LOOP
      other := gen_random_uuid();
      INSERT INTO inventory_items (id, tenant_id, sku, name, unit)
        VALUES (other, t, 'SKU-M02-' || k || '-' || i, 'SKU-M02-' || k || '-' || i, 'un');
      INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, cycle_count_id)
        VALUES (t, other, 'ajuste', 1, 'base', s);
      INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, cycle_count_id)
        VALUES (t, other, 'ajuste', 1, 'base', s);
    END LOOP;
  END LOOP;
END $$;
SELECT 'estorno_grupos', count(*) FROM (SELECT 1 FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1) g
UNION ALL
SELECT 'ajuste_grupos', count(*) FROM (SELECT 1 FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1) g;
