#!/usr/bin/env bash
# DEMO-A · AC-05 do plano DEMO-SOCIO — confere a pilha da demonstração SEM `docker compose`.
#
# Por que sem compose: o overlay exige o segredo do forward por interpolação obrigatória (`:?`), e o script da pilha
# (scripts/traccar-dev-demo.mjs) o sorteia e não imprime — `docker compose … ps` falha. E um `up` recriaria api e
# Traccar com outro segredo. Aqui só se LÊ: rótulo do compose, `docker ps`, redes, volumes e o /health/ready.
#
# Uso:  bash scripts/demo-socio-status.sh
# Saída: contêineres do projeto (nome, estado, criação, portas), redes, volumes, e a prontidão da API e da web.
# Nunca imprime segredo, token, id de organização ou coordenada. Nunca muda nada.

set -uo pipefail

PROJECT="demo-socio"
if [ "${TRC_DEMO_PROJECT:-$PROJECT}" != "$PROJECT" ]; then
  echo "[demo-status] RECUSADO: este script só confere o projeto $PROJECT (TRC_DEMO_PROJECT=${TRC_DEMO_PROJECT})" >&2
  exit 2
fi
LABEL="com.docker.compose.project=$PROJECT"
API_URL="http://127.0.0.1:3102/api/v1/health/ready"
WEB_URL="http://127.0.0.1:18080/"
EXPECTED="api postgres redis traccar web"

if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "[demo-status] FALHA: o Docker não responde" >&2
  exit 1
fi

echo "[demo-status] contêineres do projeto $PROJECT (docker ps -a --filter label=$LABEL):"
docker ps -a --filter "label=$LABEL" --format 'table {{.Names}}\t{{.State}}\t{{.Status}}\t{{.CreatedAt}}\t{{.Ports}}'

missing=""
for service in $EXPECTED; do
  running=$(docker ps -q --filter "label=$LABEL" --filter "label=com.docker.compose.service=$service" --filter "status=running")
  [ -z "$running" ] && missing="$missing $service"
done

echo "[demo-status] redes: $(docker network ls --filter "label=$LABEL" --format '{{.Name}}' | tr '\n' ' ')"
echo "[demo-status] volumes: $(docker volume ls --filter "label=$LABEL" --format '{{.Name}}' | tr '\n' ' ')"

api_code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$API_URL" || true)
web_code=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$WEB_URL" || true)
echo "[demo-status] API  $API_URL -> ${api_code:-sem resposta}"
echo "[demo-status] web  $WEB_URL -> ${web_code:-sem resposta}"

if [ -n "$missing" ] || [ "$api_code" != "200" ] || [ "$web_code" != "200" ]; then
  echo "[demo-status] ATENÇÃO: fora do ar:${missing:- (nenhum serviço parado)}; API $api_code; web $web_code."
  echo "[demo-status] Se o PC reiniciou: NUNCA suba pelo script nem pelo compose. Use, nesta ordem:"
  echo "[demo-status]   docker start ${PROJECT}-postgres-1 ${PROJECT}-redis-1 ${PROJECT}-api-1 ${PROJECT}-traccar-1 ${PROJECT}-web-1"
  echo "[demo-status] e depois rode este status de novo e o --posicao do seed."
  exit 1
fi
echo "[demo-status] VERDE: $EXPECTED de pé; API e web respondem 200"
