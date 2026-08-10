#!/usr/bin/env bash
# DRILL do provisionamento de RBAC (achado B1/ALTA — junta do CHECKLIST P1 PR-03).
#
# Prova, contra PostgreSQL de verdade, as duas coisas que nenhum teste em memória pega:
#   (1) REPRODUÇÃO DO BUG — numa base NOVA (só `prisma migrate deploy`, como o CD de produção faz)
#       a tabela `roles` fica VAZIA e as migrações de dados 20260861/20260862 casam ZERO linhas:
#       "aplicadas" com sucesso, efeito nenhum, e nunca mais rodam.
#   (2) A CORREÇÃO — `npm run db:provision-rbac` converge o RBAC a partir do catálogo em código, e
#       rodar de novo NÃO duplica nada (idempotência medida, não prometida).
#
# NÃO DESTRUTIVO: cria, usa e apaga um banco DESCARTÁVEL próprio (erp_provision_drill). O nome é
# constante literal aqui dentro — o script nunca apaga um banco vindo de parâmetro/ambiente, para
# que um DATABASE_URL errado não vire `DROP DATABASE` no banco de trabalho.
#
# Uso (dev, contra o container local erp-postgres):
#   bash scripts/rbac-provision-drill.sh [container]
set -euo pipefail

CONTAINER="${1:-erp-postgres}"
DB_DRILL="erp_provision_drill"
PGUSER="${PGUSER:-postgres}"

cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  # Só para descobrir host/porta/credencial do PostgreSQL de desenvolvimento. O banco de trabalho
  # em si NUNCA é aberto para escrita por este script: a URL é reescrita para o banco de drill logo
  # abaixo, antes de qualquer comando.
  DATABASE_URL="$(sed -nE 's/^DATABASE_URL="?([^"]*)"?$/\1/p' .env | head -1)"
fi
: "${DATABASE_URL:?exporte DATABASE_URL (ou tenha .env) apontando para o PostgreSQL de desenvolvimento}"

DRILL_URL="$(printf '%s' "$DATABASE_URL" | sed -E "s#(://[^/]+)/[^/?]+#\1/${DB_DRILL}#")"
case "$DRILL_URL" in
  *"/${DB_DRILL}"|*"/${DB_DRILL}?"*) : ;;
  *) echo "[drill] ABORTADO: não consegui reescrever a URL para $DB_DRILL — recusando rodar em outro banco." >&2; exit 1 ;;
esac

psql_drill() { docker exec "$CONTAINER" psql -U "$PGUSER" -d "$DB_DRILL" -tAc "$1"; }

# O banco descartável some MESMO quando o drill falha no meio — drill que reprova é justamente o
# caso em que ninguém volta para varrer, e disco sobrando não é dado deste projeto.
trap 'docker exec "$CONTAINER" dropdb -U "$PGUSER" --if-exists "$DB_DRILL" >/dev/null 2>&1 || true' EXIT

esperado() { # <rótulo> <obtido> <esperado>
  if [ "$2" != "$3" ]; then
    echo "[drill] FALHOU: $1 = $2 (esperado $3)" >&2
    exit 1
  fi
  echo "[drill]   ok: $1 = $2"
}

echo "[drill] 0) banco descartável ($DB_DRILL) — o banco de trabalho não é tocado"
docker exec "$CONTAINER" sh -lc "dropdb -U $PGUSER --if-exists $DB_DRILL && createdb -U $PGUSER $DB_DRILL"

echo "[drill] 1) base NOVA: só migrate deploy (exatamente o que deploy-production.yml faz)"
DATABASE_URL="$DRILL_URL" npx prisma migrate deploy >/dev/null

echo "[drill] 2) REPRODUÇÃO DO BUG: as migrações de grant rodaram contra \`roles\` vazia"
esperado "papéis após migrate" "$(psql_drill 'select count(*) from roles')" "0"
esperado "concessões após migrate" "$(psql_drill 'select count(*) from role_permissions')" "0"
esperado "grants de checklist_runs:reopen (migração 20260861)" \
  "$(psql_drill "select count(*) from role_permissions rp join permissions p on p.id=rp.permission_id where p.key='checklist_runs:reopen'")" "0"

echo "[drill] 3) CORREÇÃO: provisionamento (1ª execução)"
DATABASE_URL="$DRILL_URL" npm run --silent db:provision-rbac

PAPEIS_1="$(psql_drill 'select count(*) from roles')"
CONCESSOES_1="$(psql_drill 'select count(*) from role_permissions')"
PERMISSOES_1="$(psql_drill 'select count(*) from permissions')"
echo "[drill]   estado: papéis=$PAPEIS_1 permissões=$PERMISSOES_1 concessões=$CONCESSOES_1"

echo "[drill] 4) o que a junta cobrou: os dois grants que as migrações não entregaram"
esperado "checklist_runs:reopen (super_admin, tenant_admin, manager)" \
  "$(psql_drill "select count(*) from role_permissions rp join roles r on r.id=rp.role_id join permissions p on p.id=rp.permission_id where p.key='checklist_runs:reopen' and r.key in ('super_admin','tenant_admin','manager')")" "3"
esperado "checklist do field_technician (read/update/complete/acknowledge)" \
  "$(psql_drill "select count(*) from role_permissions rp join roles r on r.id=rp.role_id join permissions p on p.id=rp.permission_id where r.key='field_technician' and p.key in ('checklist_runs:read','checklist_runs:update','checklist_runs:complete','checklist_runs:acknowledge')")" "4"
esperado "papel field_technician existe" "$(psql_drill "select count(*) from roles where key='field_technician' and tenant_id is null")" "1"

echo "[drill] 5) IDEMPOTÊNCIA: 2ª execução não pode criar nem duplicar nada"
DATABASE_URL="$DRILL_URL" npm run --silent db:provision-rbac
esperado "papéis (2ª execução)" "$(psql_drill 'select count(*) from roles')" "$PAPEIS_1"
esperado "permissões (2ª execução)" "$(psql_drill 'select count(*) from permissions')" "$PERMISSOES_1"
esperado "concessões (2ª execução)" "$(psql_drill 'select count(*) from role_permissions')" "$CONCESSOES_1"
esperado "papéis de sistema duplicados" \
  "$(psql_drill 'select count(*) from (select key from roles where tenant_id is null group by key having count(*) > 1) d')" "0"

echo "[drill] 5b) ISOLAMENTO: papel de ORGANIZAÇÃO não recebe concessão do catálogo"
# A propriedade de segurança MAIS anunciada do script é o filtro `tenant_id: null` — e nenhum passo a
# exercitava (mutação do verificador: remover o filtro passava verde, e no formato real de produção
# 140 concessões do catálogo entravam no papel do cliente). Aqui uma organização com perfil próprio
# 'manager' existe ANTES do provisionamento; depois dele, o papel dela precisa continuar com ZERO
# concessões — mexer no que é do cliente é exatamente o que o script promete nunca fazer.
psql_drill "insert into tenants (id, name, slug, status) values (gen_random_uuid(), 'Organização do Drill', 'drill-org', 'active');
            insert into roles (id, tenant_id, key, name, scope)
            select gen_random_uuid(), t.id, 'manager', 'Perfil próprio do cliente', 'tenant' from tenants t;" >/dev/null
DATABASE_URL="$DRILL_URL" npm run --silent db:provision-rbac
esperado "concessões gravadas em papel de organização"   "$(psql_drill 'select count(*) from role_permissions rp join roles r on r.id = rp.role_id where r.tenant_id is not null')" "0"
esperado "papel platform_admin criado (não pode: viraria atribuível por tenant_admin)"   "$(psql_drill "select count(*) from roles where key='platform_admin'")" "0"

echo "[drill] 6) produção não pode ganhar dado de demonstração (o tenant do 5b é do drill, criado à mão)"
esperado "organizações além da criada pelo próprio drill" "$(psql_drill 'select count(*) from tenants')" "1"
esperado "usuários criados pelo provisionamento" "$(psql_drill 'select count(*) from users')" "0"

echo "[drill] 7) limpeza do banco descartável"
docker exec "$CONTAINER" dropdb -U "$PGUSER" "$DB_DRILL"

echo "[drill] VERDE — bug reproduzido numa base nova, provisionamento converge, 2ª execução é no-op e nada de demonstração entrou."
