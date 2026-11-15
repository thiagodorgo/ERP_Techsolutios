#!/usr/bin/env bash
# B-ASS-10b (T5) — a trava de escopo do bloco (plano v2 §9.1, A10; Emenda 1, A10-r2). Mede SÓ o diff do bloco, em qualquer
# momento do empilhamento sobre o B-ASS-09.
# Uso: bash docs/revisoes/ASSINATURA/B-ASS-10b-trava-escopo.sh [ref do bloco, padrão HEAD]. Sai 0 só quando o diff
# próprio não toca caminho proibido.
# Base: enquanto o ramo do B-ASS-09 existir e for ancestral do bloco, é a ponta dele; senão, é a origin/main.
# Fail-closed: bloco atrasado em relação ao pai (não ancestral) cai na origin/main e acusa os arquivos do pai -> integrar
# a ponta do pai primeiro (por merge).
# A10-r2: a lista inclui os caminhos de front que o §10 do plano proíbe — o arquivo do T40, AppShell.tsx,
# BalanceBridge.tsx, as telas do Financeiro e tests/e2e/**.
set -u
ref="${1:-HEAD}"
pai="${PAI:-origin/feat/ass-09-visao-custo}"
if git rev-parse --verify --quiet "$pai^{commit}" >/dev/null && git merge-base --is-ancestor "$pai" "$ref"; then
  base="$(git rev-parse "$pai")"; origem="ponta do B-ASS-09"
else
  base="$(git merge-base origin/main "$ref")" || { echo "TRAVA: sem base comum com a origin/main"; exit 1; }
  origem="origin/main"
fi
proibidos="$(git diff --name-only "$base" "$ref" | grep -E '^(src|prisma|migrations|infra|\.github|Kpis)/|(^|/)\.env|package-lock\.json$|pubspec\.(yaml|lock)$|^RBAC_MATRIX\.md$|^frontend/tests/san3-06b-navegacao-plataforma\.test\.ts$|^frontend/src/layouts/AppShell\.tsx$|^frontend/src/components/charts/BalanceBridge\.tsx$|^frontend/src/modules/finance/|^tests/e2e/')"
echo "base=${base:0:8} ($origem) · arquivos do bloco=$(git diff --name-only "$base" "$ref" | wc -l | tr -d ' ')"
if [ -n "$proibidos" ]; then echo "TRAVA: o bloco toca caminho proibido:"; printf '%s\n' "$proibidos"; exit 1; fi
echo "TRAVA: ok"
