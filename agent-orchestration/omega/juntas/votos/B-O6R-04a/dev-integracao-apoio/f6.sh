#!/bin/bash
# Regressao focada (retomada, linha f(6)).
cd /work
echo "== (a) 7 suites de estoque EM MEMORIA (sem DATABASE_URL):"
MEM="tests/inventory-abc.test.ts tests/inventory-cycle-counts-routes.test.ts tests/inventory-items-routes.test.ts tests/inventory-stock-decrement.test.ts tests/inventory.test.ts tests/stock-custody.test.ts tests/stock-movements-routes.test.ts"
env -u DATABASE_URL -u REDIS_URL -u CORE_SAAS_PERSISTENCE node --test --import tsx $MEM > /tmp/f6-mem.log 2>&1; ec=$?
echo "   ec=$ec :: $(grep -E '^# (tests|pass|fail|skipped) ' /tmp/f6-mem.log | tr '\n' ' ')"
bash /tmp/recreate.sh erp_dev389i || exit 90
export DATABASE_URL="postgresql://postgres:dev389i@dev389i-pg:5432/erp_dev389i"
export REDIS_URL="redis://dev389i-redis:6379"
DBF=$(ls tests/financial-*-db.test.ts tests/o6r06-*-db.test.ts tests/pg-barrier-scoped-db.test.ts tests/checklist-run-*-db.test.ts tests/san3-05-*-db.test.ts tests/san3-09-*-db.test.ts 2>/dev/null)
echo "== (b) regressao -db no mesmo cluster ($(echo $DBF | wc -w) arquivos): $(echo $DBF | tr ' ' '\n' | sed 's#tests/##' | tr '\n' ' ')"
t0=$(date +%s); node --test --import tsx $DBF > /tmp/f6-db.log 2>&1; ec=$?
echo "   ec=$ec duracao=$(( $(date +%s)-t0 ))s :: $(grep -E '^# (tests|pass|fail|skipped|cancelled) ' /tmp/f6-db.log | tr '\n' ' ')"
grep -E '^not ok' /tmp/f6-db.log | head -5
echo "== (c) guards transversais: db-catalog-write-guard e san3-05-acessos-de-plataforma-guard (T13):"
node --test --import tsx tests/db-catalog-write-guard.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts > /tmp/f6-guards.log 2>&1; ec=$?
echo "   ec=$ec :: $(grep -E '^# (tests|pass|fail|skipped) ' /tmp/f6-guards.log | tr '\n' ' ')"
grep -E '^not ok' /tmp/f6-guards.log | head -5
grep -iE 'chaves|sha1|INVENT' /tmp/f6-guards.log | head -8
