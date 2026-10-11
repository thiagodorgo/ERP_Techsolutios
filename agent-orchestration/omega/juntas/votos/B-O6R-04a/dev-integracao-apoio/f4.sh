#!/bin/bash
# As 4 suites -db do bloco (plano §10.4): banco RECRIADO antes; MODE=serial (--test-concurrency=1) ou paralelo (node --test default).
N="$1"; MODE="$2"
bash /tmp/recreate.sh erp_dev389i || exit 90
cd /work
export DATABASE_URL="postgresql://postgres:dev389i@dev389i-pg:5432/erp_dev389i"
export REDIS_URL="redis://dev389i-redis:6379"
export CORE_SAAS_PERSISTENCE=prisma
FILES="tests/inventory-balance-lock-race-db.test.ts tests/inventory-cycle-count-close-units-db.test.ts tests/inventory-unique-backstops-db.test.ts tests/inventory-migration-drill-db.test.ts"
t0=$(date +%s)
if [ "$MODE" = serial ]; then node --test --import tsx --test-concurrency=1 $FILES > /tmp/f4-$N.log 2>&1; else node --test --import tsx $FILES > /tmp/f4-$N.log 2>&1; fi
ec=$?
echo "f4 run $N ($MODE): ec=$ec duracao=$(( $(date +%s)-t0 ))s :: $(grep -E '^# (tests|pass|fail|skipped|cancelled) ' /tmp/f4-$N.log | tr '\n' ' ')"
for f in $FILES; do s=$(basename $f); echo "   $s: $(awk -v s="$s" '$0 ~ "^# Subtest: " s {p=1} p && /^# (tests|pass|fail)/ {print; exit}' /tmp/f4-$N.log)"; done
grep -E '^not ok' /tmp/f4-$N.log | head -5
exit $ec
