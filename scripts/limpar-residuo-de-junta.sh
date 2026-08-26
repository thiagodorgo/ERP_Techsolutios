#!/usr/bin/env bash
# Varre o resíduo que as JUNTAS deixam — clusters descartáveis, worktrees de jurado
# e volumes órfãos.
#
# POR QUE ESTE SCRIPT EXISTE, e por que não bastava o post-merge-cleanup.sh:
#
# Cada jurado que precisa de banco cria um cluster Postgres/Redis DESCARTÁVEL
# próprio (`jur-*`, `crit-*`) e um worktree próprio, para medir sem tocar a base
# viva. É regra fail-closed: sem isolamento, um jurado contamina a medição do
# outro — já aconteceu duas vezes nesta casa, e está registrado nas atas dos
# ciclos 2 e 3 do B-O6R-02.
#
# O jurado DEVE derrubar o que criou ao terminar. Mas jurado que morre no meio
# (limite de sessão, erro de API, rede) não derruba nada — e aí sobra container
# parado, worktree pendurado e volume sem dono. Medido em 2026-08-25: 15 volumes
# órfãos ocupando 1,03 GB de rodadas anteriores.
#
# O `post-merge-cleanup.sh` já faz `volume prune`, mas só roda PÓS-MERGE — e
# juntas rodam ENTRE merges, às vezes muitas antes de um merge acontecer. Por
# isso a varredura de junta é própria, e pode rodar a qualquer momento.
#
# O QUE ESTE SCRIPT NUNCA FAZ:
#   · não derruba container em EXECUÇÃO (pode ser jurado trabalhando agora)
#   · não toca em `erp-postgres`/`erp-redis` (a base viva do ambiente de trabalho)
#   · não remove worktree com alteração não commitada (pode ser trabalho vivo)
#
# Uso:  bash scripts/limpar-residuo-de-junta.sh            # varre e limpa
#       bash scripts/limpar-residuo-de-junta.sh --dry-run  # só mostra o que faria

set -uo pipefail

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
say() { [ "$DRY" = 1 ] && echo "   [dry-run] $*" || echo "   $*"; }
run() { [ "$DRY" = 1 ] || eval "$@"; }

echo "== resíduo de junta =="

# ── 1. Containers de jurado PARADOS ──────────────────────────────────────────
# Só os parados. Um `jur-*` em execução é jurado medindo agora — derrubar seria
# invalidar o voto dele no meio.
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  vivos=$(docker ps --format '{{.Names}}' | grep -cE '^(jur-|crit-)' || true)
  parados=$(docker ps -a --filter status=exited --filter status=created --format '{{.Names}}' \
            | grep -E '^(jur-|crit-)' || true)
  if [ -n "$parados" ]; then
    n=$(echo "$parados" | wc -l)
    say "containers de jurado parados: $n"
    echo "$parados" | while read -r c; do
      [ -n "$c" ] && { say "  derrubando $c"; run "docker rm -fv '$c' >/dev/null 2>&1"; }
    done
  else
    echo "   containers de jurado parados: nenhum"
  fi
  [ "$vivos" -gt 0 ] && echo "   ($vivos em EXECUÇÃO — preservados: podem ser jurados trabalhando)"

  # ── 2. Volumes sem dono ────────────────────────────────────────────────────
  orf=$(docker volume ls -qf dangling=true 2>/dev/null | wc -l | tr -d ' ')
  if [ "$orf" -gt 0 ]; then
    say "volumes órfãos: $orf"
    if [ "$DRY" = 0 ]; then
      docker volume prune -f 2>&1 | grep -i "reclaimed" | sed 's/^/   /' || true
    fi
  else
    echo "   volumes órfãos: nenhum"
  fi
else
  echo "   docker não respondeu — pulando containers e volumes"
fi

# ── 3. Worktrees de jurado ───────────────────────────────────────────────────
# Um worktree com alteração não commitada pode ser trabalho vivo: fica, e o
# script AVISA em vez de apagar em silêncio.
echo "== worktrees de jurado =="
achou=0
while read -r linha; do
  cam=$(echo "$linha" | awk '{print $1}')
  case "$cam" in
    *jur-c4*|*jur-*|*crit-*|*wt-jur*)
      achou=1
      sujo=$(git -C "$cam" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
      if [ "${sujo:-0}" -gt 0 ]; then
        echo "   PRESERVADO (tem $sujo alteração não commitada): $cam"
      else
        say "removendo worktree limpo: $cam"
        run "git worktree remove --force '$cam' >/dev/null 2>&1"
      fi
      ;;
  esac
done < <(git worktree list 2>/dev/null)
[ "$achou" = 0 ] && echo "   nenhum worktree de jurado"
run "git worktree prune >/dev/null 2>&1"

echo "== fim =="
[ "$DRY" = 1 ] && echo "(dry-run: nada foi alterado)"
exit 0
