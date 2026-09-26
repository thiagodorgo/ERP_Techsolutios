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
# -----------------------------------------------------------------------------------------------
# O QUE MUDOU NO CICLO 2 (bloco B-GOV-MANDATO, PR #393), E POR QUÊ
#
# A junta reprovou o ciclo 1 (`J-B-GOV-MANDATO.md`, 2 × 1). A classe única dos achados: *guarda que
# reconhece uma FORMA CONHECIDA em vez de enunciar a PROPRIEDADE*, e *insumo não validado tratado
# com a confiança do caminho feliz*. Aqui isso virou três mudanças estruturais:
#
#  1. INSUMO VALIDADO ANTES DE QUALQUER USO (achado C2-02). Com `$RAMO` vazio, o `grep -q "$RAMO"`
#     do ciclo 1 casava TUDO: o #393, que não tinha ata, recebeu `7822deaf…` rotulado "LIDO DA ATA".
#     A ferramenta que existe para não inventar `approved_head` o inventou. Agora head, ramo e base
#     são conferidos ANTES do laço; campo vazio ou malformado = PARADO, ec=1, stdout VAZIO.
#
#  2. `approved_head` TEM TRÊS ESTADOS, NÃO DOIS: LIDO / AUSENTE / NÃO DETERMINÁVEL. No ciclo 1
#     "não achei" e "não consegui decidir" saíam iguais, e as duas afirmavam "a junta não votou".
#
#  3. OBJETO JULGADO ≠ OBJETO APROVADO. Uma ata REPROVADA declara `Objeto julgado` e não declara
#     aprovação nenhuma; imprimir esse objeto sob o rótulo `approved_head` é inventar — a mesma
#     classe. A ÚNICA leitura honesta de "a junta aprovou X" é uma linha em que a junta ESCREVE
#     `- **approved_head:**` com o SHA. Ler veredito em prosa seria reconhecer FORMA: há três
#     grafias em 10 das 107 atas, e numa delas APROVADO e REPROVADO estão na mesma linha.
#     CUSTO DECLARADO E ACEITO: 0 das 107 atas de `origin/main@fc3363e3` têm essa linha hoje, logo
#     LIDO é INALCANÇÁVEL no corpus atual, e #390/#391/#392 passam de "lidos" a NÃO DETERMINÁVEL
#     com o objeto listado — eram lidos certos por SORTE DO VEREDITO (os três foram aprovados; a
#     ferramenta não sabia). A linha nasce no ritual da junta — bloco `B-GOV-ATA-CABECALHO`.
#
# ESTADOS E CÓDIGOS DE SAÍDA
#   0  LIDO (uma ata casa, uma linha `approved_head` nela, coerente com um objeto que ela declara)
#      ou AUSENTE (nenhuma ata nomeia nem menciona o PR).
#   1  PARADO — insumo do AMBIENTE: falta `git`/`gh`, o PR não foi lido, campo vazio na resposta do
#      `gh`, `origin/$BASE` inexistente, `check-runs` não lido. Nada no stdout.
#   2  USO — como o comando foi chamado: PR ausente ou não-numérico, flag desconhecida.
#   3  NÃO DETERMINÁVEL — a ferramenta VIU coisas e diz o que viu, sem escolher em silêncio.
#
# DEFINIÇÕES ESTRUTURAIS (a propriedade; nenhuma delas enumera forma de linha)
#   ata        arquivo `agent-orchestration/omega/juntas/J-*.md` em `origin/$BASE` OU no head do PR.
#              O PR corrente traz a própria ata no RAMO; ler só a base era cegueira — a ata do #393
#              existe desde o ciclo 1 e a ferramenta antiga respondia "a junta ainda não votou".
#   "é sobre"  o TÍTULO (`# …`) ou uma linha `- **Objeto…:**` nomeia `#PR` (delimitado por
#              não-dígito) ou o RAMO (delimitado por crase, espaço, vírgula ou fim de linha).
#              Menção no corpo NÃO é "ser sobre" — mas também não é ausência: vira NÃO DETERMINÁVEL.
#   objeto     o PRIMEIRO SHA entre crases DEPOIS do rótulo `- **Objeto…:**`: é o VALOR do campo; o
#              resto da linha (ramo, base) é contexto, não é objeto. TODAS as linhas de Objeto
#              votam — o `grep -m1` do ciclo 1 escolhia a primeira em silêncio (achado C2-04, que
#              fazia o #387 devolver o objeto do ciclo que a própria ata rotula REPROVADO).
#   aprovação  o PRIMEIRO SHA entre crases numa linha `- **approved_head:**` em coluna 0.
#
# COSTURAS (para os guards; nenhuma muda o comportamento em produção)
#   MANDATO_REPO  repositório `dono/nome` (default: thiagodorgo/ERP_Techsolutios)
#   MANDATO_GH    substituto do `gh`. Se for um ARQUIVO existente, é invocado como `bash <arquivo>`
#                 — é assim que o guard shima o `gh` sem depender de bit de execução no Windows;
#                 senão é tratado como nome de comando no PATH. Default: `gh`.
#
# Uso:  bash scripts/mandato-refs.sh <PR>            # ex.: 389
#       bash scripts/mandato-refs.sh <PR> --sha-only # só os SHAs que a ferramenta LEU, um por linha
set -u

uso() {
  cat >&2 <<'U'
uso: mandato-refs.sh <PR> [--sha-only]
     <PR>         numero do pull request (so digitos)
     --sha-only   imprime so os SHAs que a ferramenta LEU, um por linha (o que o pre-voo consome)
U
  exit 2
}

PR="${1:-}"; MODO="${2:-}"
[ -n "$PR" ] || { echo "USO: falta o numero do PR" >&2; uso; }
case "$PR" in *[!0-9]*) echo "USO: PR nao-numerico: '$PR'" >&2; uso ;; esac
case "$MODO" in
  ""|--sha-only) : ;;
  *) echo "USO: flag desconhecida: '$MODO'" >&2; uso ;;
esac
[ "$#" -le 2 ] || { echo "USO: argumentos demais ($#)" >&2; uso; }

REPO="${MANDATO_REPO:-thiagodorgo/ERP_Techsolutios}"
GH_BIN="${MANDATO_GH:-gh}"

parado() { echo "PARADO: $*" >&2; exit 1; }
ver()    { command -v "$1" >/dev/null 2>&1 || parado "falta '$1' no PATH"; }
ghc()    { if [ -f "$GH_BIN" ]; then bash "$GH_BIN" "$@"; else "$GH_BIN" "$@"; fi; }

ver git
[ -f "$GH_BIN" ] || ver "$GH_BIN"

# --- o que o GitHub diz ------------------------------------------------------
# O `--jq` embutido do gh substitui o `python` do ciclo 1, que era dependência NÃO DECLARADA: na
# ausência dele a ferramenta saía ec=0 com todos os campos vazios, afirmando que a junta não votou
# (achado C2-03). Zero dependência nova.
TSV=$(ghc pr view "$PR" --repo "$REPO" \
        --json headRefOid,headRefName,baseRefName,state,isDraft,mergeable,mergeCommit \
        --jq '[.headRefOid,.headRefName,.baseRefName,.state,(.isDraft|tostring),.mergeable,(.mergeCommit.oid // "")]|@tsv' 2>/dev/null) \
  || parado "nao li o PR #$PR em $REPO (o 'gh pr view' falhou)"

# CAMPO VAZIO NÃO PODE SUMIR. `IFS=$'\t' read` NÃO serve aqui: a tabulação é IFS-whitespace, logo
# duas tabulações seguidas colapsam numa só e um campo vazio no MEIO desloca todos os seguintes —
# medido pelo caso [A4] deste bloco, em que `headRefName` nulo fazia `BASE` receber "OPEN" e a
# ferramenta parar pela causa ERRADA ("ref origin/OPEN não existe") em vez de "campo vazio".
# É a classe do bloco, de novo: responder à pergunta vizinha. Corte explícito, campo a campo:
TABC=$(printf '\t')
RESTO=$(printf '%s' "$TSV" | head -1)
prox() {
  case "$RESTO" in
    *"$TABC"*) CAMPO="${RESTO%%"$TABC"*}"; RESTO="${RESTO#*"$TABC"}" ;;
    *)         CAMPO="$RESTO"; RESTO="" ;;
  esac
}
prox; HEAD_PR="$CAMPO"
prox; RAMO="$CAMPO"
prox; BASE="$CAMPO"
prox; ESTADO="$CAMPO"
prox; RASCUNHO="$CAMPO"
prox; MERGEAVEL="$CAMPO"
prox; MERGE="$CAMPO"

# INSUMO VALIDADO ANTES DO LAÇO (achado C2-02) — campo vazio nunca vira casamento universal.
case "$HEAD_PR" in
  "")             parado "campo 'headRefOid' VAZIO na resposta do gh — nada e lido a partir dele" ;;
  *[!0-9a-fA-F]*) parado "campo 'headRefOid' nao e hexadecimal na resposta do gh: '$HEAD_PR'" ;;
esac
[ "${#HEAD_PR}" -eq 40 ] || parado "campo 'headRefOid' nao tem 40 hex na resposta do gh: '$HEAD_PR'"
[ -n "$RAMO" ] || parado "campo 'headRefName' VAZIO na resposta do gh — com ramo vazio o casamento por ramo casaria TODAS as atas (achado C2-02)"
[ -n "$BASE" ] || parado "campo 'baseRefName' VAZIO na resposta do gh"

git rev-parse --git-dir >/dev/null 2>&1 || parado "nao estou dentro de um repositorio git"
git fetch -q origin 2>/dev/null || echo "AVISO: fetch falhou (offline?) — refs locais podem estar velhas" >&2
git rev-parse --verify -q "origin/$BASE^{commit}" >/dev/null 2>&1 \
  || parado "ref 'origin/$BASE' nao existe localmente — sem ela nenhuma ata e listada"
MB=$(git merge-base "origin/$BASE" "$HEAD_PR" 2>/dev/null || echo "")

# --- check-runs ---------------------------------------------------------------
# Morte silenciosa fechada: no ciclo 1 a falha virava "0 0 0", e "ZERO check-run" é BLOQUEADO pelo
# §C7.1-bis 4.3 — pela causa ERRADA ("não consegui perguntar" não é "não há check-run").
CR=$(ghc api "repos/$REPO/commits/$HEAD_PR/check-runs" \
      --jq '"\(.total_count) \([.check_runs[]|select(.conclusion!="success")]|length) \([.check_runs[]|select(.status!="completed")]|length)"' 2>/dev/null) \
  || parado "nao li os check-runs de $HEAD_PR (o 'gh api' falhou) — 'nao consegui perguntar' NAO e 'zero check-run'"
case "$CR" in
  [0-9]*\ [0-9]*\ [0-9]*) : ;;
  *) parado "resposta de check-runs malformada: '$CR'" ;;
esac
CR_TOT=${CR%% *}; CR_RESTO=${CR#* }; CR_RUIM=${CR_RESTO%% *}; CR_PEND=${CR_RESTO#* }

# --- o que as ATAS dizem (a única fonte de approved_head) ---------------------
esc_ere() { printf '%s' "$1" | sed 's/[][\.^$*+?(){}|]/\\&/g'; }
RE_PR="(^|[^0-9])#${PR}([^0-9]|\$)"
RE_RAMO='(^|[`[:space:],])'"$(esc_ere "$RAMO")"'([`[:space:],.]|$)'

conta() { [ -n "$1" ] || { echo 0; return 0; }; printf '%s\n' "$1" | sed '/^[[:space:]]*$/d' | wc -l | tr -d ' '; }
expande() {
  local r
  r=$(git rev-parse --verify -q "${1}^{commit}" 2>/dev/null) && { printf '%s' "$r"; return 0; }
  printf '%s' "$1"; return 1
}
mesmo() {
  local a b
  a=$(printf '%s' "$1" | tr 'A-Z' 'a-z'); b=$(printf '%s' "$2" | tr 'A-Z' 'a-z')
  [ "$a" = "$b" ] && return 0
  case "$a" in "$b"*) return 0 ;; esac
  case "$b" in "$a"*) return 0 ;; esac
  return 1
}
listar() { git ls-tree -r --name-only "$1" agent-orchestration/omega/juntas/ 2>/dev/null | grep -E '/J-[^/]*\.md$' || true; }

HEAD_LOCAL=1
git cat-file -e "${HEAD_PR}^{commit}" 2>/dev/null \
  || { HEAD_LOCAL=0; echo "AVISO: o head do PR ($HEAD_PR) nao existe localmente — ata que viva SO no ramo nao sera lida" >&2; }

FILES_HEAD=""
[ "$HEAD_LOCAL" = 1 ] && FILES_HEAD=$(listar "$HEAD_PR")

# Varredura por `git grep` sobre a ÁRVORE: 4 padrões × 2 refs = 8 processos, em vez de um `git show`
# por ata (215 arquivos × 7 processos no corpus de hoje — medido em ~60 s por PR no Windows).
# Cada registro sai como  TIPO \t caminho \t linha \t rótulo \t texto.
TAB=$(printf '\t')
PS='agent-orchestration/omega/juntas/J-*.md'
gg() { # $1=ref $2=tipo $3=regex $4=rotulo
  git grep -n -I -E "$3" "$1" -- "$PS" 2>/dev/null \
    | sed -E "s|^$1:([^:]*):([0-9]+):|$2${TAB}\1${TAB}\2${TAB}$4${TAB}|"
  return 0
}
coleta() { # $1=ref $2=rotulo
  gg "$1" T '^# '                           "$2"
  gg "$1" O '^- \*\*Objeto( julgado)?:\*\*' "$2"
  gg "$1" A '^- \*\*approved_head:\*\*'     "$2"
  gg "$1" M "$RE_PR"                        "$2"
}

REGS_HEAD=""
[ "$HEAD_LOCAL" = 1 ] && REGS_HEAD=$(coleta "$HEAD_PR" "@head-do-PR")
REGS_BASE=$(coleta "origin/$BASE" "@origin/$BASE")
# mesmo caminho nas duas fontes -> vale o do head do PR (o mais novo)
[ -n "$FILES_HEAD" ] && REGS_BASE=$(printf '%s\n' "$REGS_BASE" \
  | awk -F"$TAB" -v L="$FILES_HEAD" 'BEGIN{n=split(L,a,"\n"); for(i=1;i<=n;i++) if(a[i]!="") h[a[i]]=1} NF && !($2 in h)')

REGS=$(printf '%s\n%s\n' "$REGS_HEAD" "$REGS_BASE" | sed '/^[[:space:]]*$/d')

# O awk decide QUEM casa (título ou linha de Objeto nomeando #PR ou o ramo) e devolve só as linhas
# das atas que casam; a extração do SHA fica no shell, sobre um punhado de linhas.
SAIDA=$(printf '%s\n' "$REGS" | REPR="$RE_PR" RERAMO="$RE_RAMO" awk -F"$TAB" -v OFS="$TAB" '
BEGIN { REPR=ENVIRON["REPR"]; RERAMO=ENVIRON["RERAMO"] }
function casa_linha(s) { return (s ~ REPR) || (s ~ RERAMO) }
NF >= 4 {
  tipo=$1; f=$2; ln=$3; rot=$4; txt=$0
  sub(/^[^\t]*\t[^\t]*\t[^\t]*\t[^\t]*\t/, "", txt)
  if (!(f in ordem)) { ordem[f]=++nord; lista[nord]=f; rotulo[f]=rot }
  if (tipo=="T") { if (!(f in temT)) { temT[f]=1; if (casa_linha(txt)) casa[f]=1 } }
  else if (tipo=="O") { temO[f]=1; if (casa_linha(txt)) casa[f]=1; nO[f]++; Ol[f,nO[f]]=ln; Ot[f,nO[f]]=txt }
  else if (tipo=="A") { nA[f]++; Al[f,nA[f]]=ln; At[f,nA[f]]=txt }
  else if (tipo=="M") { men[f]=1 }
}
END {
  for (i=1;i<=nord;i++) {
    f=lista[i]
    if (f in casa) {
      print "CASA", f, rotulo[f]
      if (!(f in temO)) print "SEMOBJ", f, rotulo[f]
      for (j=1;j<=nO[f];j++) print "OBJL", f, Ol[f,j], rotulo[f], Ot[f,j]
      for (j=1;j<=nA[f];j++) print "APHL", f, Al[f,j], rotulo[f], At[f,j]
    } else if (f in men) { print "MEN", f, rotulo[f] }
  }
}')

sha1() { printf '%s' "$1" | grep -oE '`[0-9a-fA-F]{7,40}`' | head -1 | tr -d '`'; }

CASAM=""; OBJS=""; APHS=""; MENCOES=""; SEMOBJ=""
while IFS= read -r r; do
  [ -n "$r" ] || continue
  t=$(printf '%s' "$r" | cut -f1); f=$(printf '%s' "$r" | cut -f2)
  case "$t" in
    CASA)   CASAM="${CASAM}${f}${TAB}$(printf '%s' "$r" | cut -f3)
" ;;
    SEMOBJ) SEMOBJ="${SEMOBJ}${f}${TAB}$(printf '%s' "$r" | cut -f3)
" ;;
    MEN)    MENCOES="${MENCOES}${f}${TAB}$(printf '%s' "$r" | cut -f3)
" ;;
    OBJL|APHL)
      n=$(printf '%s' "$r" | cut -f3); rot=$(printf '%s' "$r" | cut -f4)
      s=$(sha1 "$(printf '%s' "$r" | cut -f5-)")
      [ -n "$s" ] || continue
      if [ "$t" = OBJL ]; then
        OBJS="${OBJS}${f}${TAB}${n}${TAB}${s}${TAB}${rot}
"
      else
        APHS="${APHS}${f}${TAB}${n}${TAB}${s}${TAB}${rot}
"
      fi ;;
  esac
done <<REGEOF
$SAIDA
REGEOF

N_CASAM=$(conta "$CASAM")
ESTADO_AH=""; MOTIVO=""; AH=""; AH_ONDE=""; EC=0
if [ "$N_CASAM" -eq 1 ]; then
  LINHA1=$(printf '%s\n' "$CASAM" | sed '/^[[:space:]]*$/d' | head -1)
  ATA=$(printf '%s' "$LINHA1" | cut -f1); ROT=$(printf '%s' "$LINHA1" | cut -f2)
  A_APHS=$(printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | awk -F'\t' -v a="$ATA" '$1==a')
  A_OBJS=$(printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | awk -F'\t' -v a="$ATA" '$1==a')
  N_APH=$(conta "$A_APHS")
  if [ "$N_APH" -eq 1 ]; then
    SHA=$(printf '%s' "$A_APHS" | cut -f3); LIN=$(printf '%s' "$A_APHS" | cut -f2)
    SHAF=$(expande "$SHA")
    OK=0
    while IFS= read -r r; do
      [ -n "$r" ] || continue
      mesmo "$SHAF" "$(expande "$(printf '%s' "$r" | cut -f3)")" && OK=1
    done <<AOEOF
$A_OBJS
AOEOF
    if [ "$OK" = 1 ]; then
      ESTADO_AH=LIDO; AH="$SHAF"; AH_ONDE="$ATA:$LIN $ROT"; EC=0
    else
      ESTADO_AH=ND; EC=3
      MOTIVO="contradicao — a linha approved_head ($SHA) nao bate com nenhum objeto declarado na mesma ata"
    fi
  elif [ "$N_APH" -gt 1 ]; then
    ESTADO_AH=ND; EC=3; MOTIVO="$N_APH linhas '- **approved_head:**' na mesma ata"
  else
    ESTADO_AH=ND; EC=3
    MOTIVO="a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**'"
  fi
elif [ "$N_CASAM" -gt 1 ]; then
  ESTADO_AH=ND; EC=3; MOTIVO="$N_CASAM atas casam #$PR no cabecalho — a ferramenta nao escolhe"
else
  N_MEN=$(conta "$MENCOES")
  if [ "$N_MEN" -gt 0 ]; then
    ESTADO_AH=ND; EC=3
    MOTIVO="mencao no corpo, sem cabecalho — $N_MEN ata(s) citam #$PR mas nenhuma se declara sobre ele"
  else
    ESTADO_AH=AUSENTE; EC=0
  fi
fi

# --- saída --------------------------------------------------------------------
if [ "$MODO" = "--sha-only" ]; then
  {
    [ -n "$HEAD_PR" ] && printf '%s\n' "$HEAD_PR"
    [ -n "$MB" ]      && printf '%s\n' "$MB"
    [ -n "$MERGE" ]   && printf '%s\n' "$MERGE"
    printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | while IFS= read -r r; do expande "$(printf '%s' "$r" | cut -f3)"; printf '\n'; done
    printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | while IFS= read -r r; do expande "$(printf '%s' "$r" | cut -f3)"; printf '\n'; done
  } | awk 'NF && !seen[$0]++'
  exit "$EC"
fi

echo "# refs do PR #$PR — GERADO por scripts/mandato-refs.sh, para COLAR no mandato"
echo "# gerado em: $(date -u +%Y-%m-%dT%H:%MZ) · repo: $REPO"
echo
echo "ramo:            $RAMO"
echo "base:            origin/$BASE"
echo "estado:          $ESTADO | rascunho=$RASCUNHO | $MERGEAVEL"
echo "head do PR:      $HEAD_PR"
echo "merge-base:      ${MB:-<vazio>}"
echo "merge commit:    ${MERGE:-<ainda nao mergeado>}"
echo "check-runs:      total=$CR_TOT nao-verdes=$CR_RUIM pendentes=$CR_PEND"
case "$ESTADO_AH" in
  LIDO)
    echo "approved_head:   $AH"
    echo "                 ^ LIDO DA ATA: $AH_ONDE"
    ;;
  AUSENTE)
    echo "approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #$PR"
    echo "                 (a junta nao votou, ou a ata nao esta em origin/$BASE nem no head do PR)"
    ;;
  *)
    echo "approved_head:   NAO DETERMINAVEL ($MOTIVO)"
    printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | while IFS= read -r r; do
      echo "                 objeto declarado $(expande "$(printf '%s' "$r" | cut -f3)") ($(printf '%s' "$r" | cut -f1):$(printf '%s' "$r" | cut -f2) $(printf '%s' "$r" | cut -f4)) — aprovacao nao legivel por maquina"
    done
    printf '%s\n' "$SEMOBJ" | sed '/^[[:space:]]*$/d' | while IFS= read -r r; do
      echo "                 $(printf '%s' "$r" | cut -f1) (sem linha de Objeto) $(printf '%s' "$r" | cut -f2)"
    done
    printf '%s\n' "$MENCOES" | sed '/^[[:space:]]*$/d' | while IFS= read -r r; do
      echo "                 $(printf '%s' "$r" | cut -f1) (mencao no corpo) $(printf '%s' "$r" | cut -f2)"
    done
    printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | while IFS= read -r r; do
      echo "                 approved_head declarado $(expande "$(printf '%s' "$r" | cut -f3)") ($(printf '%s' "$r" | cut -f1):$(printf '%s' "$r" | cut -f2) $(printf '%s' "$r" | cut -f4))"
    done
    echo "                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare"
    echo "                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou."
    ;;
esac
echo
if [ "$ESTADO_AH" = LIDO ] && [ -n "$MERGE" ] && [ "$MERGE" != "$AH" ]; then
  echo "AVISO: merge commit != approved_head. Isso e NORMAL quando houve pre-merge —"
  echo "       e e exatamente o par que o orquestrador ja trocou duas vezes."
fi
[ "$CR_TOT" = "0" ]   && echo "AVISO: ZERO check-run no head. O §C7.1-bis 4.3 manda o inspetor devolver BLOQUEADO."
[ "$CR_PEND" != "0" ] && echo "AVISO: $CR_PEND check-run(s) ainda rodando."
exit "$EC"
