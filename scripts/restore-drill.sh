#!/usr/bin/env bash
# Ω-INFRA-4 — drill de restore CRONOMETRADO (RTO) do MESMO artefato .dump (pg_dump -Fc) que
# scripts/backup-database.mjs produz e envia ao S3 — não um formato paralelo (fecha o merge-gate
# do dba/critico: "restaurar o artefato REAL"). NÃO destrutivo: usa DB throwaway erp_restore_drill.
#
# Uso (dev, contra o container local erp-postgres):
#   PGPASSWORD=<dev> bash scripts/restore-drill.sh <caminho-do-.dump-dentro-do-container> [container]
# Prova: pg_restore EXIT=0 + contagens de integridade + preservação das RLS policies. A prova
# COMPORTAMENTAL de isolamento por tenant sob role NÃO-superuser está no runbook (docs/deployment.md
# §Operação) — em produção o app conecta com role não-superuser (FORCE RLS), nunca 'postgres'.
set -euo pipefail

DUMP="${1:?informe o caminho do .dump dentro do container}"
CONTAINER="${2:-erp-postgres}"
DB_SRC="${DB_SRC:-erp_techsolutions}"
DB_DRILL="erp_restore_drill"
PGUSER="${PGUSER:-postgres}"
: "${PGPASSWORD:?exporte PGPASSWORD (credencial dev-only; nunca versionar)}"

exec_pg() { docker exec -e PGPASSWORD="$PGPASSWORD" "$CONTAINER" "$@"; }

echo "[drill] 0) pre-check (pg_isready)"
exec_pg pg_isready -U "$PGUSER" -d "$DB_SRC"

echo "[drill] 1) DB vazio de drill ($DB_DRILL) — não toca $DB_SRC"
exec_pg sh -lc "dropdb -U $PGUSER --if-exists $DB_DRILL && createdb -U $PGUSER $DB_DRILL"

echo "[drill] 2) RESTORE do artefato real (mede RTO)"
time exec_pg pg_restore -U "$PGUSER" -d "$DB_DRILL" -j4 "$DUMP"

echo "[drill] 3) integridade: contagens + policies RLS preservadas"
exec_pg psql -U "$PGUSER" -d "$DB_DRILL" -c \
  "SELECT (SELECT count(*) FROM tenants) tenants, (SELECT count(*) FROM users) users, (SELECT count(*) FROM pg_policies WHERE schemaname='public') rls_policies, (SELECT count(*) FROM pg_tables WHERE schemaname='public') tables;"

echo "[drill] VERDE — restore do .dump real OK. (RLS comportamental sob não-superuser: ver runbook §Operação.)"
