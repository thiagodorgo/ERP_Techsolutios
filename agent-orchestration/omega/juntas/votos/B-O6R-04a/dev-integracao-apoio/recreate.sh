#!/bin/bash
# Derruba e recria a base do dev389i e aplica as migracoes. ec lido de cada passo.
DB="${1:-erp_dev389i}"
ADMIN="postgresql://postgres:dev389i@dev389i-pg:5432/postgres"
psql "$ADMIN" -v ON_ERROR_STOP=1 -q -c "DROP DATABASE IF EXISTS $DB WITH (FORCE)" -c "CREATE DATABASE $DB" || { echo "recreate: DROP/CREATE falhou"; exit 1; }
cd /work
DATABASE_URL="postgresql://postgres:dev389i@dev389i-pg:5432/$DB" npx prisma migrate deploy > /tmp/migrate-$DB.log 2>&1
ec=$?
n=$(psql "postgresql://postgres:dev389i@dev389i-pg:5432/$DB" -tAc "select count(*) from _prisma_migrations where finished_at is not null and rolled_back_at is null")
echo "recreate $DB: migrate deploy ec=$ec, migracoes aplicadas=$n, $(grep -E 'migrations? found' /tmp/migrate-$DB.log | head -1)"
exit $ec
