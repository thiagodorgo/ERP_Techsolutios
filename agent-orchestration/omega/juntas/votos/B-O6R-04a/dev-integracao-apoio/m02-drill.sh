#!/bin/bash
# Drill do M-02 (plano §10.8) numa base PROPRIA do dev389i. ec lido de cada passo.
DB=erp_dev389i_m02
ADMIN="postgresql://postgres:dev389i@dev389i-pg:5432/postgres"
URL="postgresql://postgres:dev389i@dev389i-pg:5432/$DB"
MIG=20260873000000_add_stock_movements_unique_backstops
cd /work
psql "$ADMIN" -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS $DB WITH (FORCE)" -c "CREATE DATABASE $DB" || exit 91
rm -rf /tmp/m02prisma && cp -r /work/prisma /tmp/m02prisma && rm -rf /tmp/m02prisma/migrations/$MIG
# Integracao 2: o prisma.config.ts da raiz fixa migrations.path = prisma/migrations, entao `--schema` da copia
# NAO exclui a migracao do bloco (medido: 108 aplicadas no passo 0). A copia ganha um config proprio (Prisma 7 `--config`).
cat > /tmp/m02prisma.config.ts <<'CFG'
export default { schema: "/tmp/m02prisma/schema.prisma", migrations: { path: "/tmp/m02prisma/migrations" }, datasource: { url: process.env.DATABASE_URL } };
CFG
DATABASE_URL="$URL" npx prisma migrate deploy --config /tmp/m02prisma.config.ts > /tmp/m02-pre.log 2>&1; echo "== 0. migra SEM o bloco -> ec=$? · aplicadas=$(psql "$URL" -tAc "select count(*) from _prisma_migrations where finished_at is not null")"
echo "== 1. semeia 21 grupos"; psql "$URL" -v ON_ERROR_STOP=1 -tA -F'|' -f /tmp/m02-seed.sql; echo "   seed ec=$?"
for n in 1 2; do
  DATABASE_URL="$URL" npx prisma migrate deploy > /tmp/m02-deploy$n.log 2>&1; ec=$?
  echo "== deploy #$n (dado SUJO) -> ec=$ec · $(grep -oE 'P30[0-9]{2}' /tmp/m02-deploy$n.log | sort -u | tr '\n' ' ')· $(grep -oE 'Database error code: P[0-9]+' /tmp/m02-deploy$n.log | head -1) · $(grep -oE '[0-9]+ grupo\(s\) DUPLICADO\(S\)' /tmp/m02-deploy$n.log | head -1) · $(grep -oE 'Amostra \(ate [0-9]+ de [0-9]+\)' /tmp/m02-deploy$n.log | head -1)"
done
echo "== censo por stdin (sujo):"; psql "$URL" -tA -F'|' -f scripts/inventory-duplicates-census.sql > /tmp/m02-censo-sujo.txt 2>&1; echo "   ec=$? linhas=$(grep -c . /tmp/m02-censo-sujo.txt)"; tail -3 /tmp/m02-censo-sujo.txt
echo "== limpeza escopada (slug dev389i-m02-%):"
psql "$URL" -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DELETE FROM stock_movements WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'dev389i-m02-%');
DELETE FROM inventory_items WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'dev389i-m02-%');
DELETE FROM cycle_counts WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'dev389i-m02-%');
DELETE FROM tenants WHERE slug LIKE 'dev389i-m02-%';
COMMIT;
SQL
echo "   limpeza ec=$?"
DATABASE_URL="$URL" npx prisma migrate deploy > /tmp/m02-deploy3.log 2>&1; ec=$?
echo "== deploy #3 (dado LIMPO) -> ec=$ec · $(grep -oE 'P30[0-9]{2}' /tmp/m02-deploy3.log | sort -u | tr '\n' ' ')"
DATABASE_URL="$URL" npx prisma migrate resolve --rolled-back $MIG > /tmp/m02-resolve.log 2>&1; ec=$?
echo "== migrate resolve --rolled-back -> ec=$ec · $(grep -iE 'marked as rolled back' /tmp/m02-resolve.log | head -1)"
DATABASE_URL="$URL" npx prisma migrate deploy > /tmp/m02-deploy4.log 2>&1; ec=$?
echo "== deploy #4 -> ec=$ec · $(grep -iE 'successfully applied|No pending' /tmp/m02-deploy4.log | head -1)"
echo "== pg_indexes:"; psql "$URL" -tAc "select indexname || ' :: ' || regexp_replace(indexdef, '^.* WHERE ', 'WHERE ') from pg_indexes where tablename='stock_movements' and indexname in ('stock_movements_reversal_active_key','stock_movements_cycle_count_item_key') order by 1"
echo "== _prisma_migrations $MIG:"; psql "$URL" -tAc "select (finished_at is not null) as aplicada, (rolled_back_at is not null) as rolled_back from _prisma_migrations where migration_name='$MIG' order by started_at"
echo "== censo por stdin (limpo):"; psql "$URL" -tA -F'|' -f scripts/inventory-duplicates-census.sql > /tmp/m02-censo-limpo.txt 2>&1; echo "   ec=$?"; cat /tmp/m02-censo-limpo.txt
psql "$ADMIN" -q -c "DROP DATABASE IF EXISTS $DB WITH (FORCE)"; echo "== base $DB derrubada ec=$?"
