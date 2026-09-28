#!/usr/bin/env bash
# Cobertura por MUTACAO dos guards do mandato — medida, reproduzivel e falsificavel (B-GOV-MANDATO, E4).
#
# POR QUE EXISTE. O ciclo 2 publicou "30 mutacoes executadas" como prova de cobertura. Ninguem
# conseguia reproduzir o numero: nao havia denominador extraido da fonte, nem lista dos mutantes que
# sobreviveram. "Cobertura" virava adjetivo. Esta ferramenta troca o adjetivo por um comando: enumera
# os pontos de decisao DA FONTE, gera um mutante por ponto com o operador DECLARADO, roda o guard
# contra cada mutante em copia isolada, e publica a lista dos que ficaram VERDES — os NAO-COBERTOS.
#
# USO
#   bash scripts/mandato-mutantes.sh <refs|preflight> [--only <l1,l2,...>] [--equivalentes <arq>]
#                                    [--controle] [--jobs N]
#   ec=0 nenhum NAO-COBERTO alem dos equivalentes declarados · ec=1 ha NAO-COBERTO · ec=2 PARADO: a
#   medicao nao aconteceu (arnes invalido, LINHA DE BASE SUJA, copia pristina alterada, opcao errada)
#
# NUNCA TOCA RASTREADO. Tudo acontece numa copia em `mktemp -d`. O artefato da arvore e lido, nunca
# escrito; no fim a ferramenta confere que o `git status` do repositorio nao mudou ([M-4]).
#
# DEPENDENCIAS DAS FIXTURES — a lista e DECLARADA, porque o guard produz FALSOS VERMELHOS sem ela
# (classe A11 do plano: o [B6] faz `git ls-files` e exige >= 20 rastreados; o [B6b] precisa do
# `sync_action_store.dart`; o [B7b] de `docs/revisoes/SAN3/`; o F-6d de `HEAD:package.json`):
#   scripts/  tests/  src/config/  mobile/flutter_app/lib/core/sync/sync_action_store.dart
#   docs/revisoes/SAN3/  CLAUDE.md  package.json
#
# PONTOS DE DECISAO — a lista de construtos e DECLARADA. Linha executavel (nao vazia, nao comentario)
# que contenha ao menos um de:
#   if  elif  while  until  case  then  else   [   [[   ||   &&
#   exit  return  continue  break  next        ~   !~   ;;   grep -q
#
# OPERADORES — o PRIMEIRO aplicavel vence; 1 mutante por ponto:
#   M1  `|| (parado|falha|uso|exit|echo|{)` -> `|| true`      (o ramo de recusa deixa de recusar)
#   M3  inverte a comparacao: -eq/-ne  -gt/-le  -lt/-ge  =/!=  -n/-z  -f/-d
#   M4  `~` <-> `!~`                                          (casamento de awk invertido)
#   M5  `exit N` (N != 0) -> `exit 0`                          (a falha deixa de ser falha)
#   M7  `continue|break|next` -> no-op                         (o laco deixa de saltar)
#   M8  padrao de `case` inalcancavel
#   M9  padrao de `grep -q` inalcancavel
#   M10 awk `if (cond)` -> `if (0)`
# Ponto sem operador aplicavel e LISTADO como EXCLUIDO, com a linha — nunca somado ao denominador.
#
# VEREDITO POR MUTANTE. VERMELHO = o guard reagiu (`# fail` acima da LINHA DE BASE). VERDE = o guard
# nao reagiu: o ponto esta NAO-COBERTO. A linha de base NAO e presumida: e MEDIDA na copia pristina
# antes do primeiro mutante, e TEM de dar `fail=0`. Se nao der, a ferramenta ABORTA com ec=2 ("linha
# de base suja — corrija o guard antes de medir") e nao mede nada (plano §13.5). Tolerar um vermelho
# "conhecido" nao e neutro: com a base em fail=K, o caso que ja esta vermelho fica CEGO — um mutante
# cujo efeito so ele pegaria continua em fail=K e sai VERDE falso, e um mutante que conserta um caso e
# quebra outro tambem. A matriz do pre-voo medida com fail=1 (o [B8b] do ciclo 3) foi descartada por
# isso; a ferramenta se recusa a repetir a medicao sem significado.
#
# CONTROLES (o que impede esta ferramenta de ser teatro). Com `--controle`:
#   (a) SONDA: injeta no artefato uma clausula SEM guard e exige que ela apareca NAO-COBERTA — a
#       ferramenta sabe achar buraco. A POLARIDADE e a do §E4.6 corrigido (§13 D-S-4): `-z`, que so
#       dispara se alguem EXPORTAR a variavel — o pristino e no-op, o mutante M1 tambem, o guard
#       fica verde e a sonda sai NAO-COBERTA, que e o que o controle quer provar (a forma `-n` da v3
#       abortava o pristino sempre). A GRAFIA diverge da literal do §E4.6 em dois pontos, medidos
#       sob `set -u` (a sonda entra na linha logo abaixo dele, nos dois artefatos):
#         `"$SONDA_INEXISTENTE"` sem `:-`  -> "unbound variable", ec=1: o pristino MORRE de novo,
#                                             por outra via — por isso `"${SONDA_INEXISTENTE:-}"`;
#         `|| parado "sonda"`              -> com a variavel exportada, "parado: command not found"
#                                             e o script SEGUE (ec=0): no pre-voo `parado` nao
#                                             existe, e no refs so e definida DEPOIS (l.114) — por
#                                             isso `|| exit 9`. O M1 casa as duas grafias.
#   (b) NO-OPS: reescreve 4 comentarios e exige VERDE — a ferramenta nao acusa TEXTO.
#   (c) DIFERENCIAL (A11): roda o artefato pristino sobre um insumo fixo na COPIA e na ARVORE REAL e
#       exige saidas identicas (menos caminho e data). Se diferirem, o arnes e uma variavel e a
#       rodada NAO CONTA ate a diferenca ser nomeada.
# E em toda rodada, sempre: `bash -n` em cada mutante (mutante que nao compila e ANOMALIA-SINTAXE e
# nao conta como coberto — senao erro de sintaxe viraria "cobertura"), e o `diff` do mutante contra o
# pristino tem de ter EXATAMENTE 1 linha trocada (senao ANOMALIA-DIFF).
set -u

ALVO="${1:-}"; shift || true
ONLY=""; EQUIV=""; CONTROLE=0; JOBS=1
while [ $# -gt 0 ]; do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 ;;
    --equivalentes) EQUIV="${2:-}"; shift 2 ;;
    --controle) CONTROLE=1; shift ;;
    --jobs) JOBS="${2:-1}"; shift 2 ;;
    *) echo "PARADO: opcao desconhecida '$1'" >&2; exit 2 ;;
  esac
done
case "$ALVO" in
  refs)      ART=scripts/mandato-refs.sh;      GUARD=tests/mandato-refs.test.ts ;;
  preflight) ART=scripts/mandato-preflight.sh; GUARD=tests/mandato-preflight.test.ts ;;
  *) echo "uso: mandato-mutantes.sh <refs|preflight> [--only l1,l2] [--equivalentes arq] [--controle] [--jobs N]" >&2; exit 2 ;;
esac

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ" || exit 2
ANTES_STATUS=$(git status --porcelain 2>/dev/null)

BASE=$(mktemp -d 2>/dev/null || printf '%s' "${TMPDIR:-/tmp}/mandato-mutantes.$$")
mkdir -p "$BASE" || exit 2
# ARMADILHA MEDIDA (A4): `mktemp -d` devolve caminho POSIX (`/tmp/...`) e o `git.exe`/`node.exe` do
# Windows RECUSAM esse formato — o `git init` falhava com "cannot change to '/tmp/...'", a copia saia
# vazia e a rodada mediria zero. Converto para o formato que os binarios aceitam antes de qualquer uso.
if command -v cygpath >/dev/null 2>&1; then BASE=$(cygpath -m "$BASE" 2>/dev/null || printf '%s' "$BASE"); fi
trap 'rm -rf "$BASE" 2>/dev/null || true' EXIT
PRIS="$BASE/pristino"

# --- 1) copia pristina: as dependencias DECLARADAS, normalizadas a LF, com repositorio proprio ----
mkdir -p "$PRIS"
# o `git archive | tar` NAO pode ser um cano: o codigo de saida do cano e o do `tar`, que tem exito
# mesmo quando o `git` falha e nao entrega nada (a mesma classe de mascara que este repositorio ja
# pagou). Materializo o pacote, LEIO o codigo do git, e so entao extraio.
if ! git -c core.autocrlf=false archive -o "$BASE/pacote.tar" HEAD \
      scripts tests src/config mobile/flutter_app/lib/core/sync/sync_action_store.dart \
      docs/revisoes/SAN3 CLAUDE.md package.json; then
  echo "PARADO: o git archive do head falhou — copia pristina nao montada" >&2; exit 2; fi
# e o `tar` NAO recebe o pacote por `-f <caminho>`: com caminho do Windows ele le o `C:` como HOST
# remoto ("Cannot connect to C: resolve failed"). Entra pela entrada padrao, que nao tem essa leitura.
tar -x -C "$PRIS" -f - < "$BASE/pacote.tar" || { echo "PARADO: nao consegui extrair o pacote" >&2; exit 2; }
# o artefato e o guard medidos sao os da ARVORE (podem estar a frente do head), normalizados a LF
tr -d '\r' < "$RAIZ/$ART"   > "$PRIS/$ART"
tr -d '\r' < "$RAIZ/$GUARD" > "$PRIS/$GUARD"
( cd "$PRIS" && git init -q && git -c core.autocrlf=false add -A \
    && git -c user.name=m -c user.email=m@m -c commit.gpgsign=false commit -q -m pristino ) || {
  echo "PARADO: nao consegui versionar a copia pristina" >&2; exit 2; }
RASTREADOS=$(git -C "$PRIS" ls-files | wc -l | tr -d ' ')
MD5_PRIS=$(md5sum < "$PRIS/$ART" | cut -d' ' -f1)

roda_guard() { # $1 = diretorio da copia -> imprime "<fail> <tests>" LIDOS DO ARQUIVO de log
  local d=$1 log="$1/.tap"
  ( cd "$RAIZ" && node --test --import tsx --test-reporter=tap "$d/$GUARD" > "$log" 2>&1 )
  awk '/^# fail /{f=$3} /^# tests /{t=$3} END{printf "%s %s\n", f+0, t+0}' "$log"
}

echo "== mandato-mutantes: alvo=$ALVO artefato=$ART guard=$GUARD"
echo "== head: $(git rev-parse HEAD)  rastreados na copia: $RASTREADOS (o [B6] exige >= 20)"
LB=$(roda_guard "$PRIS"); LB_FAIL=${LB%% *}; LB_TESTS=${LB##* }
echo "== LINHA DE BASE medida na copia pristina: fail=$LB_FAIL de tests=$LB_TESTS"
[ "$LB_TESTS" -gt 0 ] || { echo "PARADO: a copia pristina nao registrou teste — arnes invalido" >&2; exit 2; }
# Linha de base SUJA = medicao sem significado (ver VEREDITO no cabecalho): aborta, nomeando os casos.
if [ "$LB_FAIL" -ne 0 ]; then
  echo "PARADO: linha de base suja — corrija o guard antes de medir (copia pristina: fail=$LB_FAIL de tests=$LB_TESTS; nenhum mutante foi medido)" >&2
  grep '^not ok ' "$PRIS/.tap" | head -10 | sed 's/^/   /' >&2
  exit 2
fi

# --- 2) pontos de decisao, enumerados DA FONTE ----------------------------------------------------
PONTOS="$BASE/pontos.txt"
awk '{
  s=$0; sub(/^[[:space:]]+/,"",s)
  if (s=="" || substr(s,1,1)=="#") next
  if (s ~ /(^|[^[:alnum:]_])(if|elif|while|until|case|then|else|exit|return|continue|break|next)([^[:alnum:]_]|$)/ \
   || s ~ /\[\[/ || s ~ /\[ / || s ~ /\|\|/ || s ~ /&&/ || s ~ /;;/ || s ~ /grep -q/ || s ~ /~/) print NR
}' "$PRIS/$ART" > "$PONTOS"
if [ -n "$ONLY" ]; then
  # a intersecao e por awk, NAO por `comm`: `comm` exige ordem lexicografica e a lista de linhas e
  # NUMERICA — com `sort -n` o `comm` reclama ("not in sorted order") e descarta linhas validas em
  # silencio, que e perder ponto de decisao sem aviso.
  printf '%s\n' "$ONLY" | tr ',' '\n' | sed '/^$/d' > "$BASE/only.txt"
  awk 'NR==FNR{q[$1]=1; next} ($1 in q)' "$BASE/only.txt" "$PONTOS" > "$BASE/p2"; mv "$BASE/p2" "$PONTOS"
  PEDIDOS=$(sed '/^$/d' "$BASE/only.txt" | wc -l | tr -d ' ')
  echo "== --only: $PEDIDOS linhas pedidas, $(wc -l < "$PONTOS" | tr -d ' ') sao pontos de decisao"
fi
echo "== pontos de decisao enumerados da fonte: $(wc -l < "$PONTOS" | tr -d ' ')"

# --- 3) o operador: aplica no arquivo $1, linha $2; imprime o id do operador, ou vazio ------------
aplica() {
  local f=$1 n=$2 l par a b CTX_TESTE
  l=$(sed -n "${n}p" "$f")
  if printf '%s' "$l" | grep -qE '\|\|[[:space:]]*(parado|falha|uso|exit|echo|\{)'; then
    # o ramo de recusa vira no-op. Em funcao de UMA linha (`ver() { ... || parado "..."; }`) engolir
    # ate o fim da linha levaria o `; }` embora e o mutante nao compilaria — viraria ANOMALIA-SINTAXE
    # e o ponto ficaria sem medicao. Entao PRESERVO o fechamento quando ele existe, e so caio no
    # corte ate o fim da linha quando nao ha o que preservar.
    #
    # MAS a preservacao so vale quando o `{` que o `}` fecha esta ANTES do `||` (corpo de funcao).
    # Quando o `{` e do PROPRIO ramo (`... || { echo uso; exit 1; }`), preservar o `}` deixa uma
    # chave sem par e o mutante nao compila. Foi assim que a l.115 do pre-voo saiu ANOMALIA-SINTAXE
    # na 1a rodada: o controle `bash -n` pegou, em vez de a ferramenta contar erro como cobertura.
    if printf '%s' "$l" | grep -qE ';[[:space:]]*\}[[:space:]]*$' \
       && printf '%s' "${l%%'||'*}" | grep -q '{'; then
      sed -i "${n}s/||[[:space:]]*\(parado\|falha\|uso\|exit\|echo\|{\).*;[[:space:]]*}[[:space:]]*\$/|| true; }/" "$f"
    else
      sed -i "${n}s/||[[:space:]]*\(parado\|falha\|uso\|exit\|echo\|{\).*\$/|| true/" "$f"
    fi
    echo M1; return; fi
  # M3. Os numericos (`-eq`…`-ge`) sao exclusivos de teste. Os de arquivo e de cadeia (`-n -z -f -d`)
  # NAO sao: `mktemp -d`, `grep -f`, `sort -n` usam as MESMAS letras como BANDEIRA de comando. Medido
  # na 1a rodada: a l.124 do pre-voo (`TMPD=$(mktemp -d …)`) virou mutante `mktemp -f` e foi publicada
  # como ponto NAO-COBERTO — ponto de decisao que nao existe. Por isso esses quatro so se aplicam
  # quando a linha tem CONTEXTO DE TESTE (`[ ` ou `[[`); sem ele o ponto cai para o proximo operador
  # e, nao havendo nenhum, e listado como EXCLUIDO — que e a resposta honesta.
  CTX_TESTE=0
  printf '%s' "$l" | grep -qE '\[\[|\[ ' && CTX_TESTE=1
  for par in '-eq:-ne' '-ne:-eq' '-gt:-le' '-le:-gt' '-lt:-ge' '-ge:-lt' '-n:-z' '-z:-n' '-f:-d' '-d:-f'; do
    a="${par%%:*}"; b="${par##*:}"
    case "$a" in -n|-z|-f|-d) [ "$CTX_TESTE" = 1 ] || continue ;; esac
    if printf '%s' "$l" | grep -qE "(^|[^[:alnum:]_-])$a[[:space:]]"; then
      sed -i "${n}s/\\([^[:alnum:]_-]\\)$a\\([[:space:]]\\)/\\1$b\\2/" "$f"; echo "M3($a>$b)"; return; fi
  done
  if printf '%s' "$l" | grep -qE '\[.*\]'; then
    if printf '%s' "$l" | grep -q ' != '; then sed -i "${n}s/ != / = /" "$f"; echo 'M3(ne>eq)'; return; fi
  fi
  if printf '%s' "$l" | grep -q '!~'; then sed -i "${n}s/!~/~/" "$f"; echo 'M4(nao>sim)'; return; fi
  if printf '%s' "$l" | grep -qE '[^!]~'; then sed -i "${n}s/\\([^!]\\)~/\\1!~/" "$f"; echo 'M4(sim>nao)'; return; fi
  if printf '%s' "$l" | grep -qE 'exit[[:space:]]+[1-9]'; then
    sed -i "${n}s/exit[[:space:]]\\+[1-9][0-9]*/exit 0/" "$f"; echo M5; return; fi
  if printf '%s' "$l" | grep -qE '(^|[^[:alnum:]_])next([^[:alnum:]_]|$)'; then
    sed -i "${n}s/\\([^[:alnum:]_]\\)next\\([^[:alnum:]_]\\)/\\1;\\2/" "$f"; echo 'M7(next)'; return; fi
  if printf '%s' "$l" | grep -qE '(^|[^[:alnum:]_])(continue|break)([^[:alnum:]_]|$)'; then
    sed -i "${n}s/\\(continue\\|break\\)/:/" "$f"; echo 'M7(salto)'; return; fi
  if printf '%s' "$l" | grep -qE 'if[[:space:]]*\([^)]+\)'; then
    sed -i "${n}s/if[[:space:]]*([^)]*)/if (0)/" "$f"; echo M10; return; fi
  if printf '%s' "$l" | grep -qE "grep -q[A-Za-z]*[[:space:]]+['\"]"; then
    sed -i "${n}s/\\(grep -q[A-Za-z]*[[:space:]]\\+\\)\\(['\"]\\)[^'\"]*\\2/\\1\\2__NUNCA_CASA__\\2/" "$f"; echo M9; return; fi
  if printf '%s' "$l" | grep -qE "^[[:space:]]*[A-Za-z0-9_*?.|\"'-]+\)"; then
    sed -i "${n}s/^\\([[:space:]]*\\)/\\1__NUNCA_CASA__/" "$f"; echo M8; return; fi
  echo ""
}

# --- 4) um mutante: aplica, PROVA, roda o guard, classifica --------------------------------------
um_mutante() { # $1 = linha ; imprime a linha da matriz
  local n=$1 d="$BASE/m$n" op df fail tests
  rm -rf "$d"; cp -r "$PRIS" "$d" || { echo "$n | ANOMALIA-COPIA | - | nao conta"; return; }
  op=$(aplica "$d/$ART" "$n")
  if [ -z "$op" ]; then
    printf '%s | EXCLUIDO | (sem operador aplicavel) | %s\n' "$n" "$(sed -n "${n}p" "$PRIS/$ART" | sed 's/^[[:space:]]*//' | cut -c1-60)"
    rm -rf "$d"; return; fi
  df=$(diff "$PRIS/$ART" "$d/$ART" | grep -c '^[<>]')
  if [ "$df" -ne 2 ]; then
    printf '%s | ANOMALIA-DIFF | %s | linhas-trocadas=%s nao conta\n' "$n" "$op" "$df"; rm -rf "$d"; return; fi
  if ! bash -n "$d/$ART" 2>/dev/null; then
    printf '%s | ANOMALIA-SINTAXE | %s | nao conta\n' "$n" "$op"; rm -rf "$d"; return; fi
  read -r fail tests <<<"$(roda_guard "$d")"
  if [ "$tests" -eq 0 ]; then
    printf '%s | ANOMALIA-DENOMINADOR | %s | tests=0 nao conta\n' "$n" "$op"; rm -rf "$d"; return; fi
  if [ "$fail" -gt "$LB_FAIL" ]; then
    printf '%s | %s | fail=%s | VERMELHO\n' "$n" "$op" "$fail"
  else
    printf '%s | %s | fail=%s | VERDE  <- NAO-COBERTO: %s\n' "$n" "$op" "$fail" "$(sed -n "${n}p" "$PRIS/$ART" | sed 's/^[[:space:]]*//' | cut -c1-70)"
  fi
  rm -rf "$d"
}

# --- 5) controles ---------------------------------------------------------------------------------
if [ "$CONTROLE" = 1 ]; then
  echo
  echo "== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11)"
  FIX="$BASE/fixo.md"
  printf '## MEDIDO\n\n- a suite deu 3058 de 3060\n  medido por: true\n\n## HIPOTESE\n\n- nada. derruba com: true\n' > "$FIX"
  if [ "$ALVO" = preflight ]; then ARGS=("$FIX"); else ARGS=(); fi
  SA=$(bash "$PRIS/$ART" "${ARGS[@]+"${ARGS[@]}"}" 2>&1 | sed "s#$BASE##g; s#$RAIZ##g; s#[0-9]\{4\}-[0-9][0-9]-[0-9][0-9]T[0-9:]*Z##g")
  SB=$(bash "$RAIZ/$ART" "${ARGS[@]+"${ARGS[@]}"}" 2>&1 | sed "s#$BASE##g; s#$RAIZ##g; s#[0-9]\{4\}-[0-9][0-9]-[0-9][0-9]T[0-9:]*Z##g")
  if [ "$SA" = "$SB" ]; then echo "   IDENTICO (copia e arvore dao a mesma saida; o arnes nao e a variavel)"
  else echo "   DIVERGE — o arnes E uma variavel; a rodada NAO CONTA ate a diferenca ser nomeada"
       diff <(printf '%s\n' "$SA") <(printf '%s\n' "$SB") | head -20; fi

  echo
  echo "== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA"
  SD="$BASE/sonda"; rm -rf "$SD"; cp -r "$PRIS" "$SD"
  LSET=$(grep -n '^set -u' "$SD/$ART" | head -1 | cut -d: -f1)
  sed -i "${LSET}a [ -z \"\${SONDA_INEXISTENTE:-}\" ] || exit 9" "$SD/$ART"
  SLINHA=$((LSET+1))
  if bash -n "$SD/$ART" 2>/dev/null; then
    read -r sf st <<<"$(roda_guard "$SD")"
    echo "   pristino-com-sonda: fail=$sf tests=$st (tem de bater a linha de base fail=$LB_FAIL)"
    op=$(aplica "$SD/$ART" "$SLINHA")
    read -r sf2 st2 <<<"$(roda_guard "$SD")"
    echo "   mutante da sonda  : operador=$op fail=$sf2 tests=$st2"
    if [ "$sf" -eq "$LB_FAIL" ] && [ "$sf2" -le "$LB_FAIL" ] && [ -n "$op" ]; then
      echo "   SONDA NAO-COBERTA — a ferramenta acha buraco"
    else echo "   FALHA DO CONTROLE: sonda pristino=$sf mutante=$sf2 base=$LB_FAIL operador=$op"; fi
  else echo "   FALHA DO CONTROLE: a sonda nao compila"; fi
  rm -rf "$SD"

  echo
  echo "== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO"
  NC=0; NV=0
  for cl in $(grep -n '^#' "$PRIS/$ART" | sed -n '3p;5p;7p;9p' | cut -d: -f1); do
    ND="$BASE/noop$cl"; rm -rf "$ND"; cp -r "$PRIS" "$ND"
    sed -i "${cl}s/\$/ REESCRITO-NO-OP/" "$ND/$ART"
    read -r nf nt <<<"$(roda_guard "$ND")"
    NC=$((NC+1))
    if [ "$nf" -le "$LB_FAIL" ]; then NV=$((NV+1)); echo "   l.$cl VERDE (fail=$nf de $nt)"
    else echo "   l.$cl VERMELHO (fail=$nf de $nt) <- acusa TEXTO"; fi
    rm -rf "$ND"
  done
  echo "   no-ops verdes: $NV de $NC"
fi

# --- 6) a matriz ----------------------------------------------------------------------------------
echo
echo "== MATRIZ  linha | operador | #fail | veredito"
MAT="$BASE/matriz.txt"
: > "$MAT"
if [ "$JOBS" -gt 1 ]; then
  while read -r n; do
    while [ "$(jobs -rp | wc -l)" -ge "$JOBS" ]; do wait -n 2>/dev/null || sleep 1; done
    um_mutante "$n" >> "$MAT" &
  done < "$PONTOS"
  wait
else
  while read -r n; do um_mutante "$n" >> "$MAT"; done < "$PONTOS"
fi
sort -n "$MAT" > "$BASE/matriz.sorted" && mv "$BASE/matriz.sorted" "$MAT"
cat "$MAT"

# --- 7) resumo ------------------------------------------------------------------------------------
K=$(grep -c '| VERMELHO$' "$MAT" || true)
NAOCOB=$(grep -c 'VERDE  <- NAO-COBERTO' "$MAT" || true)
EXCL=$(grep -c '| EXCLUIDO |' "$MAT" || true)
ANOM=$(grep -c '| ANOMALIA' "$MAT" || true)
N=$((K + NAOCOB))
EQN=0
if [ -n "$EQUIV" ] && [ -f "$EQUIV" ]; then
  # `id: justificativa (fixture que tentou discriminar)` — sem fixture nomeada, a linha e IGNORADA (A6)
  EQN=$(grep -cE '^[0-9]+:.*\(.+\)' "$EQUIV" || true)
fi
echo
echo "N=$N K=$K NAO-COBERTOS=$NAOCOB EXCLUIDOS=$EXCL ANOMALIAS=$ANOM EQUIVALENTES-DECLARADOS=$EQN"
if [ "$NAOCOB" -gt 0 ]; then
  echo "-- nao-cobertos (linha e trecho):"
  grep 'VERDE  <- NAO-COBERTO' "$MAT" | sed 's/^/   /'
fi
DEPOIS_STATUS=$(git status --porcelain 2>/dev/null)
if [ "$ANTES_STATUS" = "$DEPOIS_STATUS" ]; then echo "[M-4] nenhum rastreado mudou durante a execucao"
else echo "[M-4] FALHA: o git status MUDOU durante a execucao"; printf '%s\n' "$DEPOIS_STATUS" | head; fi
if [ "$(md5sum < "$PRIS/$ART" | cut -d' ' -f1)" = "$MD5_PRIS" ]; then echo "copia pristina intacta (md5 igual)"
else echo "PARADO: a copia pristina foi alterada durante a rodada" >&2; exit 2; fi
if [ $((NAOCOB - EQN)) -gt 0 ]; then exit 1; fi
exit 0
