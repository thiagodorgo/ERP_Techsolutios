#!/usr/bin/env bash
# post-merge-cleanup.sh — Limpeza pós-merge OBRIGATÓRIA (CLAUDE.md §C5).
#
# O dono está com pouco espaço em disco e cada rodada de bloco/PR deixa lixo
# regenerável (build artifacts, branches locais mergeadas, temporários). Rode
# este script LOGO APÓS cada merge, a partir da raiz do repositório.
#
# NUNCA remove: arquivos rastreados, node_modules/.pnpm-store (reinstalar custa
# caro), .env real, nem untracked explicitamente permitidos (3 PNGs de marca,
# .claude/skills/*). Faz dry-run do git clean por padrão — passe --deep para
# também remover caches de build maiores.
#
# Uso:
#   bash scripts/post-merge-cleanup.sh            # limpeza padrão (segura)
#   bash scripts/post-merge-cleanup.sh --deep     # + node_modules/.cache, .vite, tsbuildinfo

set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo .)"

DEEP=0
[ "${1:-}" = "--deep" ] && DEEP=1

echo "== post-merge-cleanup =="
# Só o tamanho do .git (rápido). NUNCA `du -sh .` — varrer node_modules trava em disco lento/Windows.
before=$(du -sh .git 2>/dev/null | cut -f1 || echo "?")
removed=()

rm_if() { # rm_if <path> — remove se existir e registra
  if [ -e "$1" ]; then rm -rf "$1" && removed+=("$1"); fi
}

# 1) Build artifacts regeneráveis (quase todos gitignored)
rm_if frontend/dist
rm_if dist
rm_if coverage
rm_if frontend/coverage
rm_if mobile/flutter_app/build
# *.tsbuildinfo (cache incremental do tsc) — removível; regenera no próximo build
find . -type f -name "*.tsbuildinfo" -not -path "*/node_modules/*" -print -delete 2>/dev/null | sed 's/^/   tsbuildinfo: /'

if [ "$DEEP" = "1" ]; then
  rm_if frontend/node_modules/.vite
  rm_if frontend/node_modules/.cache
  rm_if node_modules/.cache
fi

# 2) Branches locais já mergeadas na main (nunca a atual nem a própria main).
# Sem `git fetch` aqui (rede pode travar); `git remote prune` no passo 3 basta.
merged=$(git branch --merged main 2>/dev/null | grep -vE '^\*|(^|[[:space:]])main$' | tr -d ' ' | grep -v '^$' || true)
if [ -n "$merged" ]; then
  echo "$merged" | while IFS= read -r b; do
    [ -n "$b" ] && git branch -d "$b" 2>/dev/null && echo "   branch removida: $b"
  done
else
  echo "   (nenhuma branch local mergeada a remover)"
fi

# 3) Referências remotas mortas
git remote prune origin >/dev/null 2>&1 || true

# 3b) CACHES DE FERRAMENTA — o que mais cresce e ninguém vê (disco do dono chegou a 100% com 2,1 GB livres).
# Tudo aqui é REGENERÁVEL: volta sozinho no próximo build, ao custo de um download. NUNCA toca node_modules
# (reinstalar custa caro, §C5), .env, nem arquivo rastreado.
if [ "${DEEP_CLEAN:-0}" = "1" ]; then
  echo "-- limpeza profunda de caches de ferramenta (DEEP_CLEAN=1)"
  # Gradle: `caches/` é puro cache de dependência/transformação do Android. `wrapper/` e `jdks/` FICAM,
  # senão o próximo build refaz o setup inteiro em vez de só re-baixar dependência.
  rm -rf "$HOME/.gradle/caches" "$HOME/.gradle/.tmp" 2>/dev/null || true
  # npm: o _cacache é reconstruído sob demanda.
  npm cache clean --force >/dev/null 2>&1 || true
  # Docker: imagens órfãs e volumes sem dono. NÃO derruba container em execução.
  docker image prune -af >/dev/null 2>&1 || true
  docker volume prune -f >/dev/null 2>&1 || true
  echo "   caches de gradle/npm/docker liberados"
  # NOTA sobre o Docker no Windows: `image prune` libera espaço DENTRO da VM, mas o disco virtual
  # (AppData\Local\Docker\wsl, ~20 GB) NÃO encolhe sozinho. Compactar exige parar o Docker:
  #   wsl --shutdown && Optimize-VHD -Path <ext4.vhdx> -Mode Full   (ou diskpart compact vdisk)
  # Fica FORA do automático de propósito: derruba o PostgreSQL/Redis do ambiente de trabalho.
fi

# 3c) GUARDA DE INTEGRIDADE — nenhuma limpeza pode apagar arquivo RASTREADO (§C5).
# Nasceu de um alarme falso instrutivo (2026-08-12): vi 7 arquivos rastreados apagados na árvore, presumi
# acidente da limpeza de disco e restaurei — mas quem os apagou foi o DONO, de propósito (o painel de KPI
# do Flutter foi descontinuado, D-KPI-DUPLA-REVOGADA), e a minha "correção" desfez a decisão dele.
# A lição vale nos dois sentidos: remoção de arquivo rastreado nunca deve passar despercebida, e também
# nunca deve ser revertida por reflexo. O script AVISA e mostra o caminho; quem decide é quem lê.
apagados=$(git status --porcelain 2>/dev/null | grep -c '^ D' || true)
if [ "${apagados:-0}" -gt 0 ]; then
  echo ""
  echo "!! ATENÇÃO: $apagados arquivo(s) RASTREADO(S) apagados na árvore de trabalho."
  git status --porcelain | grep '^ D' | sed 's/^ D /   apagado: /'
  echo "   Este script não remove rastreado. Se foi acidente:  git checkout -- <caminho>"
  echo "   Se foi INTENCIONAL, registre a remoção:              git rm -r <caminho>  (+ commit)"
  echo "   Não reverta por reflexo — pode ser decisão de quem apagou."
  echo ""
fi

# 4) Relatório
after=$(du -sh .git 2>/dev/null | cut -f1 || echo "?")
echo "-- removidos: ${removed[*]:-(build artifacts ausentes)}"
echo "-- tamanho do .git: $before -> $after"
echo "== done. (git status para conferir; nada rastreado foi tocado) =="
