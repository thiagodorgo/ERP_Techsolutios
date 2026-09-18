-- crit3: semeia 13 grupos de estorno duplicado + 8 grupos de ajuste duplicado (total real = 21) em 2 tenants descartaveis
DO $$
DECLARE t uuid; it uuid; m uuid; cc uuid; i int; k int;
BEGIN
  FOR k IN 1..2 LOOP
    INSERT INTO tenants (name, slug) VALUES ('crit3-mig-'||k, 'crit3-mig-'||k||'-'||substr(md5(random()::text),1,6)) RETURNING id INTO t;
    INSERT INTO inventory_items (tenant_id, sku, name, unit) VALUES (t, 'SKU-MIG-'||k, 'Item', 'un') RETURNING id INTO it;
    INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type) VALUES (t,it,'entrada',1000,'base');
    FOR i IN 1..(CASE WHEN k=1 THEN 7 ELSE 6 END) LOOP
      INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type) VALUES (t,it,'saida',-3,'base') RETURNING id INTO m;
      INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,reverses_movement_id) VALUES (t,it,'saida',3,'base',m),(t,it,'saida',3,'base',m);
    END LOOP;
    FOR i IN 1..4 LOOP
      INSERT INTO cycle_counts (tenant_id) VALUES (t) RETURNING id INTO cc;
      INSERT INTO stock_movements (tenant_id,item_id,type,quantidade_sinalizada,custody_type,cycle_count_id) VALUES (t,it,'ajuste',-1,'base',cc),(t,it,'ajuste',-1,'base',cc);
    END LOOP;
  END LOOP;
END $$;
SELECT 'estorno_grupos', count(*) FROM (SELECT 1 FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*)>1) d
UNION ALL SELECT 'ajuste_grupos', count(*) FROM (SELECT 1 FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*)>1) d;
