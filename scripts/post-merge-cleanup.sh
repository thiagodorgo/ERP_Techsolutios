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

# 4) Relatório
after=$(du -sh .git 2>/dev/null | cut -f1 || echo "?")
echo "-- removidos: ${removed[*]:-(build artifacts ausentes)}"
echo "-- tamanho do .git: $before -> $after"
echo "== done. (git status para conferir; nada rastreado foi tocado) =="
