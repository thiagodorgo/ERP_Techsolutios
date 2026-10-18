#!/usr/bin/env bash
# Bateria exata de §8.8 do plano (B-TRC-01), com a porta 47432 do trc01-pg (errata da decisão T13) e REDIS_URL do
# trc01-redis também na 1ª forma (a 6379 desta máquina é o erp-redis do dono; ver o incidente no relatório).
# Cada comando grava a saída inteira num arquivo e uma linha de resumo no LOG. Sem tail -f, tudo com timeout.
set -u
W=/c/Users/AMP/w-trc01
OUT=/c/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/bateria
LOG=$OUT/resumo.log
mkdir -p "$OUT"; : > "$LOG"
DB='postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/erp_techsolutions?schema=public'
RD='redis://127.0.0.1:56379'
cd "$W" || exit 1

step() {
  local name="$1"; shift
  local started=$(date -u +%H:%M:%SZ)
  local t0=$(date +%s)
  "$@" > "$OUT/$name.txt" 2>&1
  local ec=$?
  local t1=$(date +%s)
  local tap=$(grep -E '^# (tests|pass|fail|skipped) ' "$OUT/$name.txt" | tr '\n' ' ')
  echo "$started $name ec=$ec $((t1-t0))s $tap" >> "$LOG"
}

step 01-check            timeout -k 15 600 npm run check
step 02-lint             timeout -k 15 600 npm run lint
step 03-novos-sem-banco  env REDIS_URL="$RD" timeout -k 15 300 npm test -- tests/traccar-ingest-listener.test.ts tests/traccar-forward-auth.test.ts tests/traccar-ingest-logs.test.ts tests/traccar-position-contract.test.ts tests/traccar-resolution-cost.test.ts tests/traccar-rate-limit.test.ts
step 04-topologia        env REDIS_URL="$RD" timeout -k 15 300 npm test -- tests/traccar-dev-topology.test.ts
step 05-novos-com-banco  env DATABASE_URL="$DB" REDIS_URL="$RD" timeout -k 15 900 npm test -- tests/traccar-binding-uniqueness-db.test.ts tests/traccar-resolution-race-db.test.ts tests/traccar-idempotency-db.test.ts tests/traccar-quarantine-db.test.ts tests/traccar-position-ingestion-db.test.ts tests/traccar-ingest-pool-db.test.ts
step 06-regressoes       env REDIS_URL="$RD" timeout -k 15 300 npm test -- tests/field-location-routes.test.ts tests/field-ops-realtime.test.ts tests/field-ops-events.test.ts tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts
step 07-papel-runtime    env DATABASE_URL="$DB" REDIS_URL="$RD" timeout -k 15 900 npm test -- tests/san3-05-leituras-de-plataforma-db.test.ts
step 08-suite-sem-banco  env REDIS_URL="$RD" timeout -k 15 2400 npm test
step 09-suite-com-banco  env DATABASE_URL="$DB" REDIS_URL="$RD" timeout -k 15 3000 npm test
step 10-front-smoke      timeout -k 15 900 npm --prefix frontend run test:smoke
step 11-front-check      timeout -k 15 600 npm --prefix frontend run check
step 12-front-build      timeout -k 15 900 npm --prefix frontend run build
step 13-build            timeout -k 15 900 npm run build
step 14-demo             timeout -k 30 900 node scripts/traccar-dev-demo.mjs
step 15-diff-check       git diff --check
echo "FIM $(date -u +%H:%M:%SZ)" >> "$LOG"
