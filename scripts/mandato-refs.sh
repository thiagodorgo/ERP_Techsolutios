#!/usr/bin/env bash
# Imprime as REFERÊNCIAS de um bloco para o orquestrador COLAR no mandato — nunca digitar.
#
# POR QUE ESTE SCRIPT EXISTE.
# Em 2026-09-20 o orquestrador publicou `approved_head = a62d04e2` para o #390. O commit EXISTE e
# `git cat-file -e` passaria; ele estava errado mesmo assim, porque `approved_head` é o head que a
# JUNTA aprovou — e a ata `J-B-SAN3-04a.md:5` diz `fbda96b0`. Uma cadeira pegou (achado C1-A2). No dia
# seguinte, no mandato do PR que CONSERTAVA esse erro, ele passou `09dc4345` — de novo o head do merge.
# Dessa vez quem pegou foi o desenvolvedor, que RECUSOU o valor e publicou o certo.
# Registro: `agent-orchestration/controle/decisoes.md` → REGISTRO-SAN3-00-APPROVED-HEAD-DUAS-VEZES.
#
# A lição é estreita e mecânica: `approved_head` se LÊ DA ATA, nunca de `gh pr view` nem do head do
# ramo. Onde houve pré-merge, os dois divergem POR CONSTRUÇÃO, e publicar o head do merge apaga a
# informação de *o que foi julgado*.
#
# Uso:  bash scripts/mandato-refs.sh <PR>            # ex.: 389
#       bash scripts/mandato-refs.sh <PR> --sha-only # só os SHAs, um por linha (para o pré-voo)
set -u
PR="${1:-}"; MODO="${2:-}"
[ -n "$PR" ] || { echo "uso: mandato-refs.sh <PR> [--sha-only]" >&2; exit 1; }
REPO="${MANDATO_REPO:-thiagodorgo/ERP_Techsolutios}"

ver() { command -v "$1" >/dev/null 2>&1 || { echo "PARADO: falta '$1' no PATH" >&2; exit 1; }; }
ver git; ver gh

# --- o que o GitHub diz -------------------------------------------------------
J=$(gh pr view "$PR" --repo "$REPO" --json headRefOid,headRefName,baseRefName,state,isDraft,mergeable,mergeCommit 2>/dev/null) \
  || { echo "PARADO: não li o PR #$PR em $REPO" >&2; exit 1; }
g() { printf '%s' "$J" | python -c "import json,sys;d=json.load(sys.stdin);v=d.get('$1');print(v.get('oid') if isinstance(v,dict) and 'oid' in v else ('' if v is None else v))" 2>/dev/null; }
HEAD_PR=$(g headRefOid); RAMO=$(g headRefName); BASE=$(g baseRefName)
ESTADO=$(g state); RASCUNHO=$(g isDraft); MERGEAVEL=$(g mergeable); MERGE=$(g mergeCommit)

git fetch -q origin 2>/dev/null || true
MB=$(git merge-base "origin/$BASE" "$HEAD_PR" 2>/dev/null || echo "")

# --- o que a ATA diz (a única fonte de approved_head) -------------------------
# Procura a ata do bloco pelo ramo; aceita "**Objeto julgado:**" e "**Objeto:**".
ATA=""; OBJ=""
# CASA PELO TITULO + LINHA DO OBJETO — as duas linhas em que a ata declara DE QUEM ela e.
# Tres tentativas, tres vezes a mesma classe (a ferramenta respondendo a pergunta VIZINHA), todas
# medidas em 2026-09-25:
#   1a) casava pelo RAMO           -> falso-negativo no #390 (a ata cita "PR #390", nao o ramo);
#   2a) casava por "o DOCUMENTO menciona #PR" -> devolvia a ata do #392 para os tres PRs, porque ela
#       menciona #390 e #391 ao pagar as dividas deles. Mencionar != ser sobre;
#   3a) casava pelas "primeiras 8 linhas" -> JANELA, nao propriedade: basta a mencao cair dentro dela.
#       Quem pegou foi o guard `tests/mandato-refs.test.ts`.
# O discriminador e estrutural: o TITULO (`# J-...`) e a linha `- **Objeto...:**`. Nenhuma outra linha vota.
for f in $(git ls-tree -r --name-only "origin/$BASE" agent-orchestration/omega/juntas/ 2>/dev/null | grep -E '/J-.*\.md$'); do
  C=$(git show "origin/$BASE:$f" 2>/dev/null) || continue
  L=$(printf '%s' "$C" | grep -m1 -E '^\- \*\*Objeto( julgado)?:\*\*') || continue
  T=$(printf '%s' "$C" | grep -m1 -E '^# ') || T=""
  ID=$(printf '%s\n%s' "$T" "$L")
  printf '%s' "$ID" | grep -qE "(^|[^0-9])#${PR}([^0-9]|$)" || printf '%s' "$ID" | grep -q "$RAMO" || continue
  S=$(printf '%s' "$L" | grep -oE '`[0-9a-f]{7,40}`' | head -1 | tr -d '`')
  [ -n "$S" ] && { ATA="$f"; OBJ="$S"; break; }
done
[ -n "$OBJ" ] && OBJ_FULL=$(git rev-parse "$OBJ" 2>/dev/null || printf '%s' "$OBJ") || OBJ_FULL=""

# --- check-runs ---------------------------------------------------------------
CR=$(gh api "repos/$REPO/commits/$HEAD_PR/check-runs" --jq '"\(.total_count) \([.check_runs[]|select(.conclusion!="success")]|length) \([.check_runs[]|select(.status!="completed")]|length)"' 2>/dev/null || echo "0 0 0")
CR_TOT=$(echo "$CR" | cut -d' ' -f1); CR_RUIM=$(echo "$CR" | cut -d' ' -f2); CR_PEND=$(echo "$CR" | cut -d' ' -f3)

if [ "$MODO" = "--sha-only" ]; then
  for s in "$HEAD_PR" "$MB" "$OBJ_FULL" "$MERGE"; do [ -n "$s" ] && echo "$s"; done
  exit 0
fi

echo "# refs do PR #$PR — GERADO por scripts/mandato-refs.sh, para COLAR no mandato"
echo "# gerado em: $(date -u +%Y-%m-%dT%H:%MZ) · repo: $REPO"
echo
echo "ramo:            $RAMO"
echo "base:            origin/$BASE"
echo "estado:          $ESTADO | rascunho=$RASCUNHO | $MERGEAVEL"
echo "head do PR:      ${HEAD_PR:-<vazio>}"
echo "merge-base:      ${MB:-<vazio>}"
echo "merge commit:    ${MERGE:-<ainda nao mergeado>}"
echo "check-runs:      total=$CR_TOT nao-verdes=$CR_RUIM pendentes=$CR_PEND"
if [ -n "$OBJ_FULL" ]; then
  echo "approved_head:   $OBJ_FULL"
  echo "                 ^ LIDO DA ATA: $ATA"
else
  echo "approved_head:   <NAO ENCONTRADO NA ATA>"
  echo "                 ^ nenhuma ata em agent-orchestration/omega/juntas/ cita o ramo '$RAMO'"
  echo "                   com linha '- **Objeto julgado:**' ou '- **Objeto:**'."
  echo "                   NAO invente: se a junta ainda nao votou, nao ha approved_head."
fi
echo
if [ -n "$MERGE" ] && [ -n "$OBJ_FULL" ] && [ "$MERGE" != "$OBJ_FULL" ]; then
  echo "AVISO: merge commit != approved_head. Isso e NORMAL quando houve pre-merge —"
  echo "       e e exatamente o par que o orquestrador ja trocou duas vezes."
fi
[ "$CR_TOT" = "0" ] && echo "AVISO: ZERO check-run no head. O §C7.1-bis 4.3 manda o inspetor devolver BLOQUEADO."
[ "$CR_PEND" != "0" ] && echo "AVISO: $CR_PEND check-run(s) ainda rodando."
exit 0
