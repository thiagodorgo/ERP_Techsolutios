#!/usr/bin/env bash
# DEMO-A · AC-05 do plano DEMO-SOCIO — desmonta a pilha da demonstração DEPOIS da demo, com os volumes, SEM
# `docker compose` (o compose exige o segredo do forward, que o script da pilha não imprime).
#
# Uso:
#   bash scripts/demo-socio-down.sh                          # SIMULAÇÃO: lista o que seria removido e não remove nada
#   bash scripts/demo-socio-down.sh --confirmo               # remove contêineres, volumes e redes do projeto
#   bash scripts/demo-socio-down.sh --confirmo --com-imagens # e também as imagens demo-socio-* (libera ~1,3 GB)
#
# Alcance: SÓ o que tem o rótulo com.docker.compose.project=demo-socio (mais os contêineres do trajeto, rótulo
# demo-socio.role=trajeto). Recusa se qualquer alvo se chamar erp-* (base viva, pilha de dev). Nunca toca a imagem
# compartilhada erp-trc01-demo-api:local, nem imagens base (postgres, redis, node, traccar).
# Os volumes levam os DADOS DA DEMO (banco do ensaio): depois disto, só subindo a pilha e o seed de novo.

set -uo pipefail

PROJECT="demo-socio"
if [ "${TRC_DEMO_PROJECT:-$PROJECT}" != "$PROJECT" ]; then
  echo "[demo-down] RECUSADO: este script só desmonta o projeto $PROJECT (TRC_DEMO_PROJECT=${TRC_DEMO_PROJECT})" >&2
  exit 2
fi
LABEL="com.docker.compose.project=$PROJECT"
CONFIRM=0
WITH_IMAGES=0
for arg in "$@"; do
  case "$arg" in
    --confirmo) CONFIRM=1 ;;
    --com-imagens) WITH_IMAGES=1 ;;
    *) echo "[demo-down] argumento desconhecido: $arg" >&2; exit 2 ;;
  esac
done

if ! docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
  echo "[demo-down] FALHA: o Docker não responde" >&2
  exit 1
fi

container_names=$( { docker ps -a --filter "label=$LABEL" --format '{{.Names}}'; docker ps -a --filter "label=demo-socio.role=trajeto" --format '{{.Names}}'; } | sort -u | sed '/^$/d')
volume_names=$(docker volume ls --filter "label=$LABEL" --format '{{.Name}}' | sed '/^$/d')
network_names=$(docker network ls --filter "label=$LABEL" --format '{{.Name}}' | sed '/^$/d')
image_names=""
if [ "$WITH_IMAGES" = "1" ]; then
  image_names=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "^${PROJECT}-[a-z0-9_-]+:" | sed '/^$/d')
fi

# Trava: nenhum alvo pode ser erp-* (nome de contêiner, volume, rede ou imagem).
if printf '%s\n%s\n%s\n%s\n' "$container_names" "$volume_names" "$network_names" "$image_names" | grep -qE '^erp-'; then
  echo "[demo-down] RECUSADO: há alvo erp-* na lista; nada foi removido" >&2
  exit 2
fi
# Trava: todo alvo é do projeto (prefixo demo-socio).
if printf '%s\n%s\n%s\n%s\n' "$container_names" "$volume_names" "$network_names" "$image_names" | sed '/^$/d' | grep -vqE "^${PROJECT}[-_]"; then
  echo "[demo-down] RECUSADO: há alvo sem o prefixo ${PROJECT}; nada foi removido" >&2
  exit 2
fi

count() { if [ -z "$1" ]; then echo 0; else printf '%s\n' "$1" | wc -l | tr -d ' '; fi; }
echo "[demo-down] contêineres ($(count "$container_names")): $(echo $container_names)"
echo "[demo-down] volumes ($(count "$volume_names")): $(echo $volume_names)"
echo "[demo-down] redes ($(count "$network_names")): $(echo $network_names)"
[ "$WITH_IMAGES" = "1" ] && echo "[demo-down] imagens ($(count "$image_names")): $(echo $image_names)"

if [ "$CONFIRM" != "1" ]; then
  echo "[demo-down] SIMULAÇÃO: nada removido. Para remover, rode de novo com --confirmo."
  exit 0
fi

status=0
[ -n "$container_names" ] && { docker rm -f $container_names >/dev/null || status=1; }
[ -n "$volume_names" ] && { docker volume rm $volume_names >/dev/null || status=1; }
[ -n "$network_names" ] && { docker network rm $network_names >/dev/null || status=1; }
[ -n "$image_names" ] && { docker rmi $image_names >/dev/null || status=1; }

left_c=$(docker ps -a -q --filter "label=$LABEL" | wc -l | tr -d ' ')
left_v=$(docker volume ls -q --filter "label=$LABEL" | wc -l | tr -d ' ')
left_n=$(docker network ls -q --filter "label=$LABEL" | wc -l | tr -d ' ')
echo "[demo-down] depois: contêineres $left_c, volumes $left_v, redes $left_n do projeto $PROJECT"
if [ "$status" != "0" ] || [ "$left_c" != "0" ] || [ "$left_v" != "0" ] || [ "$left_n" != "0" ]; then
  echo "[demo-down] FALHA: sobrou algo do projeto $PROJECT" >&2
  exit 1
fi
echo "[demo-down] VERDE: projeto $PROJECT desmontado (contêineres, volumes e redes)"
