#!/bin/bash
# npm test na forma canonica 3: DATABASE_URL/REDIS_URL exportadas, CORE_SAAS_PERSISTENCE NAO exportado.
N="$1"
bash /tmp/recreate.sh erp_dev389i || exit 90
cd /work
unset CORE_SAAS_PERSISTENCE
export DATABASE_URL="postgresql://postgres:dev389i@dev389i-pg:5432/erp_dev389i"
export REDIS_URL="redis://dev389i-redis:6379"
t0=$(date +%s)
npm test > /tmp/npmtest-$N.log 2>&1
ec=$?
t1=$(date +%s)
echo "npm test #$N: ec=$ec duracao=$((t1-t0))s"
grep -E '^\[run-backend-tests\]' /tmp/npmtest-$N.log
grep -E '^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms)' /tmp/npmtest-$N.log | tail -8
exit $ec
