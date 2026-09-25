#!/usr/bin/env bash
# Pre-voo do MANDATO do orquestrador. Falha -> o mandato NAO sai.
#
# POR QUE EXISTE. Numa unica rodada o orquestrador cometeu dez afirmacoes da mesma classe — afirmar
# sem executar a checagem que falsificaria — e todas foram pegas por outro papel. A pior esta no
# mandato do ciclo 3 do B-O6R-11: a linha 8 diz "A raiz, MEDIDA: ... a perda MEDIDA e 0/N", com um
# numero HERDADO da ata do ciclo anterior. O plano seguinte apontou para a classe que nao perde dado
# hoje, e o ciclo inteiro foi gasto. No mesmo arquivo, treze linhas abaixo, o orquestrador exigia do
# planejador "para CADA criterio, a mutacao que o deixaria vermelho".
#
# O FORMATO. Duas secoes, e nenhuma linha de conteudo fora delas:
#   ## MEDIDO     -> toda afirmacao vem com `medido por: <comando>` e a saida colada
#   ## HIPOTESE   -> toda afirmacao vem com `derruba com: <comando>`
# Se nao da para escrever o comando que derruba, nao e hipotese: e opiniao, e nao entra.
#
# Uso:  bash scripts/mandato-preflight.sh <arquivo.md> [PR]
set -u
F="${1:-}"; PR="${2:-}"
[ -n "$F" ] && [ -f "$F" ] || { echo "uso: mandato-preflight.sh <arquivo.md> [PR]" >&2; exit 1; }
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ERROS=0
falha() { echo "REJEITADO  $1"; ERROS=$((ERROS+1)); }

# 1) as duas secoes existem
grep -qE '^## +MEDIDO' "$F"   || falha "falta a secao '## MEDIDO'"
grep -qE '^## +HIPOTESE' "$F" || falha "falta a secao '## HIPOTESE'"

# 2) nenhuma linha de conteudo fora das duas secoes
fora=$(awk '
  /^## +MEDIDO/   { s="M"; next }
  /^## +HIPOTESE/ { s="H"; next }
  /^## /          { s="X"; next }
  { if (s=="" || s=="X") { if ($0 ~ /[^[:space:]]/ && $0 !~ /^#/ && $0 !~ /^>/) print NR": "$0 } }
' "$F")
[ -n "$fora" ] && { falha "linha(s) de conteudo fora de MEDIDO/HIPOTESE:"; printf '%s\n' "$fora" | head -5 | sed 's/^/           /'; }

# 3) toda afirmacao do MEDIDO tem 'medido por:' ; toda do HIPOTESE tem 'derruba com:'
sem_m=$(awk '/^## +MEDIDO/{s=1;next} /^## /{s=0} s && /^[-*] /{ if ($0 !~ /medido por:/) print NR": "$0 }' "$F")
[ -n "$sem_m" ] && { falha "item de MEDIDO sem 'medido por: <comando>':"; printf '%s\n' "$sem_m" | head -5 | sed 's/^/           /'; }
sem_h=$(awk '/^## +HIPOTESE/{s=1;next} /^## /{s=0} s && /^[-*] /{ if ($0 !~ /derruba com:/) print NR": "$0 }' "$F")
[ -n "$sem_h" ] && { falha "item de HIPOTESE sem 'derruba com: <comando>':"; printf '%s\n' "$sem_h" | head -5 | sed 's/^/           /'; }

# 4) todo SHA citado tem de vir de mandato-refs.sh — resolver NAO basta (o a62d04e2 resolvia)
# So conta hex entre crases ou isolado por espaco. Fragmento DENTRO de caminho nao e SHA:
# o diretorio do scratchpad tem '3ad1b87d' e '1068e01c5d64' no nome, e a 1a versao os acusou.
SHAS=$(grep -oE '(`|[[:space:]])[0-9a-f]{7,40}(`|[[:space:]]|$)' "$F" | sed 's/[^0-9a-f]//g' | sort -u)
if [ -n "$SHAS" ]; then
  if [ -n "$PR" ]; then
    LEG=$(bash "$RAIZ/scripts/mandato-refs.sh" "$PR" --sha-only 2>/dev/null)
    for s in $SHAS; do
      printf '%s
' "$LEG" | grep -qi "^${s}" || falha "SHA '$s' nao esta na saida de mandato-refs.sh $PR (resolver nao basta — e pode ser SHA VELHO: o ramo anda)"
    done
  else
    falha "o mandato cita SHA mas nao recebeu o numero do PR — rode: mandato-preflight.sh $F <PR>"
  fi
fi

# 5) assercao de ausencia tem de ser insensivel a caixa (o 'Maioria de 3' passou por isso)
ins=$(grep -nE 'grep [^|]*-[a-zA-Z]*c?[^i|]*"' "$F" | grep -v -- '-i' | grep -iE 'nao (existe|ha|aparece)|zero|nenhum' || true)
[ -n "$ins" ] && { falha "assercao de ausencia com grep SEM -i:"; printf '%s\n' "$ins" | head -3 | sed 's/^/           /'; }

# 6) todo caminho do repositorio citado existe
for c in $(grep -oE '`[A-Za-z0-9_./-]+\.(ts|tsx|dart|mjs|js|md|yml|yaml|json|sql)`' "$F" | tr -d '`' | sort -u); do
  [ -e "$RAIZ/$c" ] && continue
  [ -e "$RAIZ/mobile/flutter_app/$c" ] && continue   # o app Flutter e raiz propria nos mandatos
  printf '%s' "$c" | grep -q '^[A-Z]:' && continue
  find "$RAIZ" -name "$(basename "$c")" -not -path '*/node_modules/*' -print -quit 2>/dev/null | grep -q . && continue
  falha "caminho citado nao existe em lugar nenhum do repo: $c"
done

echo
if [ "$ERROS" = "0" ]; then echo "PRE-VOO OK — $F"; exit 0; fi
echo "PRE-VOO REJEITOU $ERROS item(ns). O mandato NAO sai."; exit 1
