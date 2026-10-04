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
#                                    [--controle] [--jobs N] [--timeout <segundos>]
#   ec=0 nenhum NAO-COBERTO alem dos equivalentes CONFERIDOS id a id · ec=1 ha NAO-COBERTO · ec=2 PARADO:
#   a medicao nao aconteceu (arnes invalido, LINHA DE BASE SUJA, FALHA DE UM CONTROLE, insumo fixo que
#   o pristino nao executa limpo, copia pristina alterada, opcao errada). MUTANTE-INVALIDO e TIMEOUT
#   sao PUBLICADOS na matriz e no resumo e NAO mudam o ec: o ec continua medindo NAO-COBERTOS.
#   --timeout  limite POR MUTANTE para o guard (default 1800 s). Estourou = TIMEOUT, a vaga e morta da
#              raiz (processos cuja linha de comando contem o diretorio do mutante) e a rodada SEGUE.
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
# UM MUTANTE SO CONTA QUANDO E UM PROGRAMA (ciclo 4, C2c-01). O ciclo 3 contou como VERMELHO 33 mutantes
# do pre-voo e 2 do refs que NAO COMPILAVAM: o `bash -n` valida o shell e nao o awk embutido, o awk
# morria com `syntax error` e o guard falhava em massa (fail 192-205) — erro de sintaxe virava
# "cobertura". Agora, ANTES de qualquer cor do guard, cada mutante passa por quatro portoes:
#   1. `diff` contra o pristino com EXATAMENTE 1 linha trocada            senao ANOMALIA-DIFF
#   2. `bash -n`                                                          senao ANOMALIA-SINTAXE
#   3. cada programa awk do mutante (o texto entre as aspas simples que seguem a palavra `awk`, ou o
#      da variavel `NOME='…'` usada como `awk "$NOME"` — o bash proibe `'` dentro de `'…'`, logo a
#      extracao e exata) e COMPILADO sem executar (`awk -o/dev/null -f`; sem `-o`, `awk -f` sob
#      timeout com entrada vazia): ec != 0 ou `syntax error`             senao MUTANTE-INVALIDO
#   4. o mutante RODA sobre os insumos fixos (positivo e negativo) sob timeout: diagnostico de
#      interpretador na saida (`syntax error`, `unexpected`, `command not found`, `unbound variable`)
#      senao MUTANTE-INVALIDO; nao terminou                               senao TIMEOUT
# MUTANTE-INVALIDO fica FORA de K, de NAO-COBERTOS e do denominador, e e LISTADO com o operador e a 1a
# linha do diagnostico: a versao VIAVEL do mesmo operador e medida por outro papel (conferente, C2).
#
# VEREDITO POR MUTANTE. VERMELHO = o guard reagiu (`# fail` acima da LINHA DE BASE), com a CAUSA
# publicada na linha: o 1o caso `not ok` do TAP e a 1a linha do stderr do mutante sobre o insumo fixo.
# VERDE = o guard nao reagiu: o ponto esta NAO-COBERTO — e a linha diz que o COMPORTAMENTO nao foi
# medido pela ferramenta (quem decide equivalencia e a amostra dos dois lados, P1b). TIMEOUT = o guard
# nao terminou em `--timeout` s: comportamento mudou e foi detectado por TEMPO, nao por asserção — fica
# fora de K e de NAO-COBERTOS. A linha de base NAO e presumida: e MEDIDA na copia pristina antes do
# primeiro mutante, e TEM de dar `fail=0`. Se nao der, a ferramenta ABORTA com ec=2 ("linha de base
# suja — corrija o guard antes de medir") e nao mede nada (plano §13.5). Tolerar um vermelho
# "conhecido" nao e neutro: com a base em fail=K, o caso que ja esta vermelho fica CEGO — um mutante
# cujo efeito so ele pegaria continua em fail=K e sai VERDE falso, e um mutante que conserta um caso e
# quebra outro tambem. A matriz do pre-voo medida com fail=1 (o [B8b] do ciclo 3) foi descartada por
# isso; a ferramenta se recusa a repetir a medicao sem significado.
#
# RESUMO. Alem de N/K/NAO-COBERTOS: INVALIDOS, TIMEOUT, o HISTOGRAMA de `fail=` dos VERMELHOS (valor com
# multiplicidade >= 10% de N sai marcado `ATENCAO modal` — INFORMACAO para a amostra P1b, nao
# desqualificacao: `fail=1` x 18 sao 18 pontos legitimamente cobertos por um caso cada), e os
# EQUIVALENTES conferidos POR ID (fronteira 28): `EQN = |ids do arquivo ∩ NAO-COBERTOS da rodada|`;
# id declarado que NAO esta entre os NAO-COBERTOS sai `ANOMALIA-EQUIV <id>` (declaracao morta ou ponto
# ja coberto) e NAO abate nada. Linha do arquivo sem fixture nomeada entre parenteses e IGNORADA (A6).
#
# CONTROLES (o que impede esta ferramenta de ser teatro). Com `--controle`, e FAIL-CLOSED (ciclo 4,
# C2c-04): controle que falha imprime `FALHA DO CONTROLE` e a ferramenta PARA com ec=2 — nada medido.
# Ate o ciclo 3 a falha era so texto e o ec saia 0.
#   (c) DIFERENCIAL (A11), ANTES da linha de base: roda o artefato pristino sobre os insumos fixos na
#       COPIA e na ARVORE REAL e exige saidas identicas (menos caminho e data). O insumo PERCORRE o que
#       o arnes pode alterar (C2c-05): o do pre-voo cita `scripts/mandato-refs.sh` e
#       `docs/revisoes/SAN3/` (checagem 6 sobre RAIZ); o do refs recebe `MANDATO_GH=/bin/false 0`, que
#       atravessa a validacao do insumo ate a leitura do PR. Ate o ciclo 3 o insumo nao lia RAIZ e o
#       controle nao podia acusar o arnes que nomeia.
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
# E em toda rodada, sempre (com ou sem `--controle`): os programas awk do PRISTINO compilam, e o
# pristino roda os insumos fixos sem diagnostico de interpretador — senao os portoes 3 e 4 acima
# acusariam o instrumento, nao o mutante, e a ferramenta PARA com ec=2.
#
# -----------------------------------------------------------------------------------------------
# O QUE MUDOU NO CICLO 4 (bloco B-GOV-MANDATO, PR #393) — plano §15.2 e §15.4
#   C2c-01  mutante so conta quando e programa (portoes 3 e 4, MUTANTE-INVALIDO); causa por ponto;
#           histograma de `fail=` com `ATENCAO modal`.
#   C2c-04  controle que falha -> PARADO, ec=2.
#   C2c-05  o insumo do diferencial percorre RAIZ (e o diferencial roda antes da linha de base).
#   fronteira 25 FECHADA: `--timeout` por mutante (default 1800 s); estourou -> TIMEOUT, a arvore da
#           vaga e morta pelo diretorio do mutante (que vai no TMPDIR de tudo que ela executa, inclusive
#           do awk que o guard deixaria orfao) e a rodada segue. Antes, um mutante que nao terminava
#           (l.161 do pre-voo, `marcaLen("")`) travava a rodada inteira.
#   fronteira 26 FECHADA: o M7 gera o mutante de `next` em QUALQUER posicao da linha, inclusive no fim
#           (`if (isento(FNR)) next`); antes o `sed` exigia um caractere depois e saia ANOMALIA-DIFF.
#   fronteira 28 FECHADA: equivalentes conferidos por id; `ANOMALIA-EQUIV <id>` nao abate.
#   fronteira 24 MANTIDA: o M1 dentro de `$( … || echo … )` corta ate o fim da linha, come o `)` de
#           fechamento e o mutante sai ANOMALIA-SINTAXE (instancia: l.164 do `mandato-refs.sh`,
#           semanticamente inerte). O ponto fica sem medicao, LISTADO; dono `B-GOV-MANDATO-2`.
set -u

ALVO="${1:-}"; shift || true
ONLY=""; EQUIV=""; CONTROLE=0; JOBS=1; TMO=1800
precisa_valor() { [ "$1" -ge 2 ] || { echo "PARADO: a opcao '$2' exige um valor" >&2; exit 2; }; }
while [ $# -gt 0 ]; do
  case "$1" in
    --only) precisa_valor $# "$1"; ONLY="$2"; shift 2 ;;
    --equivalentes) precisa_valor $# "$1"; EQUIV="$2"; shift 2 ;;
    --controle) CONTROLE=1; shift ;;
    --jobs) precisa_valor $# "$1"; JOBS="$2"; shift 2 ;;
    --timeout) precisa_valor $# "$1"; TMO="$2"; shift 2 ;;
    *) echo "PARADO: opcao desconhecida '$1'" >&2; exit 2 ;;
  esac
done
case "$JOBS" in ''|*[!0-9]*|0) echo "PARADO: --jobs exige um inteiro >= 1: '$JOBS'" >&2; exit 2 ;; esac
case "$TMO" in ''|*[!0-9]*|0) echo "PARADO: --timeout exige segundos, inteiro >= 1: '$TMO'" >&2; exit 2 ;; esac
case "$ALVO" in
  refs)      ART=scripts/mandato-refs.sh;      GUARD=tests/mandato-refs.test.ts ;;
  preflight) ART=scripts/mandato-preflight.sh; GUARD=tests/mandato-preflight.test.ts ;;
  *) echo "uso: mandato-mutantes.sh <refs|preflight> [--only l1,l2] [--equivalentes arq] [--controle] [--jobs N] [--timeout s]" >&2; exit 2 ;;
esac
# o arquivo de equivalentes e lido DEPOIS do `cd "$RAIZ"`: caminho relativo vira absoluto antes
if [ -n "$EQUIV" ]; then
  case "$EQUIV" in /*|[A-Za-z]:/*|[A-Za-z]:\\*) ;; *) EQUIV="$PWD/$EQUIV" ;; esac
  [ -f "$EQUIV" ] || { echo "PARADO: arquivo de equivalentes nao existe: $EQUIV" >&2; exit 2; }
fi

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RAIZ" || exit 2
ANTES_STATUS=$(git status --porcelain 2>/dev/null)

BASE=$(mktemp -d 2>/dev/null || printf '%s' "${TMPDIR:-/tmp}/mandato-mutantes.$$")
mkdir -p "$BASE" || exit 2
# ARMADILHA MEDIDA (A4): `mktemp -d` devolve caminho POSIX (`/tmp/...`) e o `git.exe`/`node.exe` do
# Windows RECUSAM esse formato — o `git init` falhava com "cannot change to '/tmp/...'", a copia saia
# vazia e a rodada mediria zero. Converto para o formato que os binarios aceitam antes de qualquer uso.
if command -v cygpath >/dev/null 2>&1; then BASE=$(cygpath -m "$BASE" 2>/dev/null || printf '%s' "$BASE"); fi
# MARCA: o nome aleatorio do diretorio da rodada. Todo diretorio de vaga e `<id>-$MARCA`, e todo
# processo que a vaga dispara carrega esse nome na linha de comando (caminho do artefato, do guard, ou
# do TMPDIR dela). E por ele — e SO por ele — que a ferramenta mata o que sobrou: nunca por nome de
# programa, nunca o que outra sessao estiver rodando. O padrao vai por variavel de ambiente, nunca na
# linha de comando de quem mata (que senao se mataria).
MARCA="${BASE##*/}"
PSH=""
for c in powershell.exe "${SYSTEMROOT:-C:/Windows}/System32/WindowsPowerShell/v1.0/powershell.exe"; do
  if command -v "$c" >/dev/null 2>&1 || [ -f "$c" ]; then PSH="$c"; break; fi
done
mata_marca() { # $1 = marcador -> imprime quantos processos matou ("?" se nao ha como)
  if [ -n "$PSH" ]; then
    MANDATO_MUT_MARCA="$1" "$PSH" -NoProfile -NonInteractive -Command '$m=$env:MANDATO_MUT_MARCA; $n=0; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($m) -and $_.ProcessId -ne $PID } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $n++ }; $n' 2>/dev/null | tr -d '\r'
  elif command -v pgrep >/dev/null 2>&1; then
    local p n=0
    for p in $(pgrep -f -- "$1" 2>/dev/null); do [ "$p" = "$$" ] && continue; kill -9 "$p" 2>/dev/null && n=$((n+1)); done
    echo "$n"
  else echo "?"; fi
}
encerra() { local rc=$?; mata_marca "$MARCA" >/dev/null 2>&1; rm -rf "$BASE" 2>/dev/null || true; echo "== ec=$rc"; }
trap encerra EXIT
PRIS="$BASE/p-$MARCA"

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

# --- 2) o guard, com limite de tempo e TMPDIR marcado -------------------------------------------
# O --timeout e POR MUTANTE. A linha de base e as rodadas dos controles rodam o PRISTINO (que termina):
# o limite delas e o maior entre --timeout e 3600 s — senao um --timeout curto (o drill t-timeout usa
# 120 s) mataria a propria linha de base, que leva minutos, e a rodada pararia sem medir o mutante.
TMO_LB=$TMO; [ "$TMO_LB" -lt 3600 ] && TMO_LB=3600
roda_guard() { # $1 = diretorio da copia  [$2 = limite em s] -> imprime "<fail> <tests> <ec>" LIDOS DO ARQUIVO de log
  local d=$1 lim=${2:-$TMO} log="$1/.tap" rc
  mkdir -p "$d/tmp"
  ( cd "$RAIZ" && TMPDIR="$d/tmp" timeout -k 30 "$lim" node --test --import tsx --test-reporter=tap "$d/$GUARD" > "$log" 2>&1 )
  rc=$?
  awk -v rc="$rc" '/^# fail /{f=$3} /^# tests /{t=$3} END{printf "%s %s %s\n", f+0, t+0, rc}' "$log"
}

# --- 3) os insumos fixos (controle (c) e portao 4) ------------------------------------------------
FIXPOS="$BASE/fixo-positivo.md"; FIXNEG="$BASE/fixo-negativo.md"
printf '## MEDIDO\n\n- a suite deu 3058 de 3060\n  medido por: true\n- li `scripts/mandato-refs.sh` e `docs/revisoes/SAN3/`, medido por: true\n\n## HIPOTESE\n\n- nada. derruba com: true\n' > "$FIXPOS"
printf '## MEDIDO\n\n- a suite deu 3058 de 3060\n- li `scripts/naoexiste-mutantes.sh`, medido por: grep -c x CLAUDE.md\n\n## HIPOTESE\n\n- nada aqui\n' > "$FIXNEG"
TPRE=60
roda_insumos() { # $1 = artefato  $2 = prefixo das saidas  $3 = TMPDIR -> imprime os ec dos 2 insumos
  local a=$1 o=$2 t=$3 r1 r2
  mkdir -p "$t"
  if [ "$ALVO" = preflight ]; then
    TMPDIR="$t" timeout -k 5 "$TPRE" bash "$a" "$FIXPOS" > "$o.1.out" 2> "$o.1.err"; r1=$?
    TMPDIR="$t" timeout -k 5 "$TPRE" bash "$a" "$FIXNEG" > "$o.2.out" 2> "$o.2.err"; r2=$?
  else
    # `MANDATO_GH=/bin/false` nos DOIS: um mutante que pule a validacao do insumo nunca chega ao `gh` real
    TMPDIR="$t" MANDATO_GH=/bin/false timeout -k 5 "$TPRE" bash "$a" 0 > "$o.1.out" 2> "$o.1.err"; r1=$?
    TMPDIR="$t" MANDATO_GH=/bin/false timeout -k 5 "$TPRE" bash "$a" > "$o.2.out" 2> "$o.2.err"; r2=$?
  fi
  echo "$r1 $r2"
}
DIAG='syntax error|unexpected|command not found|unbound variable'
diagnostico() { # $1 = prefixo das saidas -> imprime a 1a linha com diagnostico de interpretador (ou nada)
  cat "$1.1.err" "$1.1.out" "$1.2.err" "$1.2.out" 2>/dev/null | grep -m1 -E "$DIAG"
}

# --- 4) os programas awk: extraidos da fonte e COMPILADOS sem executar ------------------------------
read -r -d '' EXTRATOR <<'JS'
const fs = require("fs");
const path = require("path");
const [arq, dir] = process.argv.slice(1);
const src = fs.readFileSync(arq, "utf8").replace(/\r/g, "");
const linhaDe = (i) => src.slice(0, i).split("\n").length;
// programa guardado em variavel: NOME='...' (o bash proibe ' dentro de '...', logo o fim e exato)
const vars = new Map();
for (const m of src.matchAll(/(^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)='([^']*)'/g)) vars.set(m[2], m[3]);
const progs = [];
const re = /(^|[\s;&|(`])awk(?=[ \t])/g;
let m;
const token = (i) => { // le um token de shell a partir de i, respeitando aspas; devolve o fim
  while (i < src.length && !/[\s;|&)]/.test(src[i])) {
    if (src[i] === "'") { i = src.indexOf("'", i + 1) + 1; continue; }
    if (src[i] === '"') { let j = i + 1; while (j < src.length && src[j] !== '"') j += src[j] === "\\" ? 2 : 1; i = j + 1; continue; }
    i++;
  }
  return i;
};
const foraDeCodigo = (prefixo) => { // o `awk` esta em comentario de shell ou dentro de aspas nesta linha?
  let s = false, d = false;
  for (let k = 0; k < prefixo.length; k++) {
    const c = prefixo[k];
    if (c === "'" && !d) s = !s;
    else if (c === "$" && prefixo[k + 1] === "(" && !s) d = false; // `"$( … )"`: dentro da substituicao e CODIGO
    else if (c === '"' && !s) d = !d;
    else if (c === "\\" && d) k++;
    else if (c === "#" && !s && !d && (k === 0 || /\s/.test(prefixo[k - 1]))) return true;
  }
  return s || d;
};
while ((m = re.exec(src)) !== null) {
  const ini = m.index + m[1].length;
  const ls = src.lastIndexOf("\n", ini - 1) + 1;
  if (foraDeCodigo(src.slice(ls, ini))) continue;
  let i = ini + 3;
  for (;;) {
    while (src[i] === " " || src[i] === "\t") i++;
    if (src[i] === "\\" && src[i + 1] === "\n") { i += 2; continue; }
    if (src[i] === "-") {
      const ti = i; i = token(i); const tok = src.slice(ti, i);
      if (tok === "-f" || tok.startsWith("-f")) { i = -1; break; } // programa em arquivo: nao e daqui
      if (tok === "-v" || tok === "-F") { while (src[i] === " " || src[i] === "\t") i++; i = token(i); }
      continue;
    }
    if (src[i] === "'") { const j = src.indexOf("'", i + 1); progs.push({ linha: linhaDe(i), texto: src.slice(i + 1, j), via: "" }); re.lastIndex = j + 1; break; }
    const mv = /^"\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"/.exec(src.slice(i, i + 80));
    if (mv && vars.has(mv[1])) progs.push({ linha: linhaDe(i), texto: vars.get(mv[1]), via: mv[1] });
    break;
  }
}
progs.forEach((p, k) => fs.writeFileSync(path.join(dir, `prog.${k + 1}.awk`), p.texto + "\n"));
fs.writeFileSync(path.join(dir, "progs.idx"), progs.map((p, k) => `${k + 1}\t${p.linha}\t${p.via}`).join("\n") + (progs.length ? "\n" : ""));
console.log(progs.length);
JS
AWK_O=0
awk -o/dev/null 'BEGIN { x = 1 }' < /dev/null > /dev/null 2>&1 && AWK_O=1
extrai_awk() { # $1 = artefato  $2 = diretorio de saida -> imprime quantos programas extraiu
  mkdir -p "$2" && node -e "$EXTRATOR" "$1" "$2"
}
compila_awk() { # $1 = arquivo do programa -> ec 0 compila; ec 1 nao compila (diagnostico em $1.err)
  local rc
  # roda DENTRO do diretorio do programa: o diagnostico do awk sai com `prog.N.awk:<linha>`, legivel
  if [ "$AWK_O" = 1 ]; then
    ( cd "${1%/*}" && timeout -k 2 20 awk -o/dev/null -f "${1##*/}" < /dev/null > /dev/null 2> "${1##*/}.err" ); rc=$?
  else
    ( cd "${1%/*}" && timeout -k 2 20 awk -f "${1##*/}" < /dev/null > /dev/null 2> "${1##*/}.err" ); rc=$?
    { [ "$rc" = 124 ] || [ "$rc" = 137 ]; } && rc=0     # executou sem parar: compilou
  fi
  [ "$rc" = 0 ] && ! grep -q 'syntax error' "$1.err" && return 0
  return 1
}

echo "== mandato-mutantes: alvo=$ALVO artefato=$ART guard=$GUARD"
echo "== head: $(git rev-parse HEAD)  rastreados na copia: $RASTREADOS (o [B6] exige >= 20)"
echo "== timeout por mutante: ${TMO} s (guard) · ${TPRE} s por insumo fixo · awk compila sem executar: $([ "$AWK_O" = 1 ] && echo sim || echo 'nao (awk -f sob timeout)')"

# --- 5) o INSTRUMENTO no pristino: os programas awk compilam e os insumos fixos rodam limpos ---------
NPROG_PRIS=$(extrai_awk "$PRIS/$ART" "$BASE/awk-pris") || { echo "PARADO: a extracao dos programas awk falhou no pristino" >&2; exit 2; }
[ "${NPROG_PRIS:-0}" -gt 0 ] || { echo "PARADO: nenhum programa awk extraido do pristino — o extrator e que esta errado" >&2; exit 2; }
for p in "$BASE"/awk-pris/prog.*.awk; do
  compila_awk "$p" || { echo "PARADO: o programa awk ${p##*/} do PRISTINO nao compila — o portao 3 acusaria o instrumento: $(head -1 "$p.err")" >&2; exit 2; }
done
read -r PR1 PR2 <<<"$(roda_insumos "$PRIS/$ART" "$BASE/pre-pris" "$PRIS/tmp")"
echo "== instrumento no pristino: $NPROG_PRIS programa(s) awk compilam; insumos fixos ec=$PR1/$PR2"
for rc in "$PR1" "$PR2"; do
  case "$rc" in 124|137) echo "PARADO: o PRISTINO nao terminou sobre um insumo fixo em ${TPRE} s" >&2; exit 2 ;; esac
done
DPRIS=$(diagnostico "$BASE/pre-pris")
[ -z "$DPRIS" ] || { echo "PARADO: o PRISTINO sai com diagnostico de interpretador sobre o insumo fixo — o portao 4 acusaria o instrumento: $DPRIS" >&2; exit 2; }

# --- 6) controle (c) DIFERENCIAL — antes da linha de base: se o arnes e a variavel, nada se mede ----
falha_controle() { echo "   FALHA DO CONTROLE: $1"; echo "PARADO: FALHA DO CONTROLE ($1) — a medicao nao conta; nada foi medido" >&2; exit 2; }
if [ "$CONTROLE" = 1 ]; then
  echo
  echo "== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11) — o insumo percorre RAIZ"
  RAIZ_M="$RAIZ"; BASE_P="$BASE"
  if command -v cygpath >/dev/null 2>&1; then
    RAIZ_M=$(cygpath -m "$RAIZ" 2>/dev/null || printf '%s' "$RAIZ"); BASE_P=$(cygpath -u "$BASE" 2>/dev/null || printf '%s' "$BASE")
  fi
  normaliza() { sed "s#$PRIS##g; s#$BASE##g; s#$BASE_P##g; s#$RAIZ_M##g; s#$RAIZ##g; s#[0-9]\{4\}-[0-9][0-9]-[0-9][0-9]T[0-9:]*Z##g"; }
  read -r DA1 DA2 <<<"$(roda_insumos "$PRIS/$ART" "$BASE/dif-copia" "$BASE/dif-copia.tmp")"
  read -r DB1 DB2 <<<"$(roda_insumos "$RAIZ/$ART" "$BASE/dif-arvore" "$BASE/dif-arvore.tmp")"
  DIVERGE=0
  for k in 1 2; do
    SA=$(cat "$BASE/dif-copia.$k.out" "$BASE/dif-copia.$k.err" | normaliza)
    SB=$(cat "$BASE/dif-arvore.$k.out" "$BASE/dif-arvore.$k.err" | normaliza)
    eval "ca=\$DA$k; cb=\$DB$k"
    if [ "$SA" != "$SB" ] || [ "$ca" != "$cb" ]; then
      DIVERGE=1
      echo "   insumo $k: DIVERGE (ec copia=$ca arvore=$cb)"
      diff <(printf '%s\n' "$SA") <(printf '%s\n' "$SB") | head -20 | sed 's/^/     /'
    else
      echo "   insumo $k: IDENTICO (ec=$ca)"
    fi
  done
  if [ "$DIVERGE" = 0 ]; then echo "   IDENTICO (copia e arvore dao a mesma saida nos 2 insumos; o arnes nao e a variavel)"
  else falha_controle "diferencial DIVERGE — o arnes E uma variavel; a rodada NAO CONTA ate a diferenca ser nomeada"; fi
fi

T0=$SECONDS; LB=$(roda_guard "$PRIS" "$TMO_LB"); read -r LB_FAIL LB_TESTS LB_RC <<<"$LB"; LB_S=$((SECONDS-T0))
echo "== LINHA DE BASE medida na copia pristina: fail=$LB_FAIL de tests=$LB_TESTS (em ${LB_S} s)"
case "$LB_RC" in 124|137) echo "PARADO: a linha de base NAO terminou em ${TMO_LB} s (copia pristina)" >&2; exit 2 ;; esac
[ $((TMO * 2)) -ge $((LB_S * 3)) ] || echo "AVISO: --timeout ${TMO} s e menor que 1,5x a linha de base (${LB_S} s): mutante VALIDO pode sair TIMEOUT"
[ "$LB_TESTS" -gt 0 ] || { echo "PARADO: a copia pristina nao registrou teste — arnes invalido" >&2; exit 2; }
# Linha de base SUJA = medicao sem significado (ver VEREDITO no cabecalho): aborta, nomeando os casos.
if [ "$LB_FAIL" -ne 0 ]; then
  echo "PARADO: linha de base suja — corrija o guard antes de medir (copia pristina: fail=$LB_FAIL de tests=$LB_TESTS; nenhum mutante foi medido)" >&2
  grep '^not ok ' "$PRIS/.tap" | head -10 | sed 's/^/   /' >&2
  exit 2
fi

# --- 7) pontos de decisao, enumerados DA FONTE ----------------------------------------------------
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

# --- 8) o operador: aplica no arquivo $1, linha $2; imprime o id do operador, ou vazio ------------
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
  # fronteira 26 FECHADA: o `next` e trocado em QUALQUER posicao — inclusive no inicio e no FIM da linha
  # (`if (isento(FNR)) next`), que o `sed` antigo nao alcancava (exigia um caractere depois: ANOMALIA-DIFF).
  if printf '%s' "$l" | grep -qE '(^|[^[:alnum:]_])next([^[:alnum:]_]|$)'; then
    sed -i "${n}s/\\(^\\|[^[:alnum:]_]\\)next\\([^[:alnum:]_]\\|\$\\)/\\1;\\2/" "$f"; echo 'M7(next)'; return; fi
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

# --- 9) um mutante: aplica, PROVA que e programa, roda o guard, classifica com a causa ---------------
um_mutante() { # $1 = linha ; imprime a linha da matriz
  local n=$1 d="$BASE/m$1-$MARCA" op df fail tests rc r1 r2 dg p q causa e1 k
  rm -rf "$d"; cp -r "$PRIS" "$d" || { echo "$n | ANOMALIA-COPIA | - | nao conta"; return; }
  rm -f "$d/.tap"
  op=$(aplica "$d/$ART" "$n")
  if [ -z "$op" ]; then
    printf '%s | EXCLUIDO | (sem operador aplicavel) | %s\n' "$n" "$(sed -n "${n}p" "$PRIS/$ART" | sed 's/^[[:space:]]*//' | cut -c1-60)"
    rm -rf "$d"; return; fi
  # portao 1 — exatamente 1 linha trocada
  df=$(diff "$PRIS/$ART" "$d/$ART" | grep -c '^[<>]')
  if [ "$df" -ne 2 ]; then
    printf '%s | ANOMALIA-DIFF | %s | linhas-trocadas=%s nao conta\n' "$n" "$op" "$df"; rm -rf "$d"; return; fi
  # portao 2 — o shell compila
  if ! bash -n "$d/$ART" 2>/dev/null; then
    printf '%s | ANOMALIA-SINTAXE | %s | nao conta\n' "$n" "$op"; rm -rf "$d"; return; fi
  # portao 3 — todo programa awk do mutante que nao e identico a um do pristino COMPILA
  extrai_awk "$d/$ART" "$d/.awk" > /dev/null 2>&1 || { printf '%s | MUTANTE-INVALIDO | %s | extracao dos programas awk falhou\n' "$n" "$op"; rm -rf "$d"; return; }
  for p in "$d"/.awk/prog.*.awk; do
    [ -f "$p" ] || continue
    k=0
    for q in "$BASE"/awk-pris/prog.*.awk; do cmp -s "$p" "$q" && { k=1; break; }; done
    [ "$k" = 1 ] && continue
    if ! compila_awk "$p"; then
      q=$(awk -F'\t' -v k="${p##*/prog.}" 'BEGIN { sub(/[.]awk$/, "", k) } $1 == k { print $2 }' "$d/.awk/progs.idx")
      printf '%s | MUTANTE-INVALIDO | %s | awk da l.%s: %s · %s\n' "$n" "$op" "${q:-?}" \
        "$(head -1 "$p.err" | tr '|' '/' | cut -c1-90)" "$(grep -m1 -E 'syntax error|error|fatal' "$p.err" | sed 's/^.*\^ *//' | tr '|' '/' | cut -c1-60)"
      rm -rf "$d"; return
    fi
  done
  # portao 4 — o mutante roda os insumos fixos sem diagnostico de interpretador, e termina
  read -r r1 r2 <<<"$(roda_insumos "$d/$ART" "$d/.pre" "$d/tmp")"
  if [ "$r1" = 124 ] || [ "$r1" = 137 ] || [ "$r2" = 124 ] || [ "$r2" = 137 ]; then
    k=$(mata_marca "m$n-$MARCA")
    printf '%s | TIMEOUT | %s | nao terminou em %s s sobre o insumo fixo (antes do guard); vaga morta: %s processo(s)\n' "$n" "$op" "$TPRE" "$k"
    rm -rf "$d"; return; fi
  dg=$(diagnostico "$d/.pre")
  if [ -n "$dg" ]; then
    printf '%s | MUTANTE-INVALIDO | %s | %s\n' "$n" "$op" "$(printf '%s' "$dg" | tr '|' '/' | cut -c1-140)"
    rm -rf "$d"; return; fi
  e1=$(cat "$d/.pre.1.err" "$d/.pre.2.err" 2>/dev/null | grep -m1 . | tr '|' '/' | cut -c1-100)
  # o guard, com limite de tempo
  read -r fail tests rc <<<"$(roda_guard "$d")"
  if [ "$rc" = 124 ] || [ "$rc" = 137 ]; then
    k=$(mata_marca "m$n-$MARCA")
    printf '%s | TIMEOUT | %s | nao terminou em %s s (guard); vaga morta: %s processo(s)\n' "$n" "$op" "$TMO" "$k"
    rm -rf "$d"; return; fi
  # caso que estourou os 60 s do proprio guard deixa o neto (awk) orfao: a vaga e varrida pela marca
  if grep -q 'nao terminou em 60 s' "$d/.tap" 2>/dev/null; then mata_marca "m$n-$MARCA" > /dev/null; fi
  if [ "$tests" -eq 0 ]; then
    printf '%s | ANOMALIA-DENOMINADOR | %s | tests=0 nao conta\n' "$n" "$op"; rm -rf "$d"; return; fi
  if [ "$fail" -gt "$LB_FAIL" ]; then
    causa=$(awk '/^not ok /{ sub(/^not ok [0-9]+ - /, ""); gsub(/[|]/, "/"); print substr($0, 1, 100); exit }' "$d/.tap")
    printf '%s | %s | fail=%s | VERMELHO | 1o not ok: %s | stderr: %s\n' "$n" "$op" "$fail" "${causa:--}" "${e1:--}"
  else
    printf '%s | %s | fail=%s | VERDE  <- NAO-COBERTO: %s | comportamento NAO medido pela ferramenta — P1b decide\n' "$n" "$op" "$fail" "$(sed -n "${n}p" "$PRIS/$ART" | sed 's/^[[:space:]]*//' | tr '|' '/' | cut -c1-70)"
  fi
  rm -rf "$d"
}

# --- 10) controles (a) e (b) — depois da linha de base, fail-closed ------------------------------
if [ "$CONTROLE" = 1 ]; then
  echo
  echo "== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA"
  SD="$BASE/sonda-$MARCA"; rm -rf "$SD"; cp -r "$PRIS" "$SD"
  LSET=$(grep -n '^set -u' "$SD/$ART" | head -1 | cut -d: -f1)
  sed -i "${LSET}a [ -z \"\${SONDA_INEXISTENTE:-}\" ] || exit 9" "$SD/$ART"
  SLINHA=$((LSET+1))
  bash -n "$SD/$ART" 2>/dev/null || falha_controle "a sonda nao compila"
  read -r sf st src <<<"$(roda_guard "$SD" "$TMO_LB")"
  echo "   pristino-com-sonda: fail=$sf tests=$st (tem de bater a linha de base fail=$LB_FAIL)"
  op=$(aplica "$SD/$ART" "$SLINHA")
  read -r sf2 st2 src2 <<<"$(roda_guard "$SD" "$TMO_LB")"
  echo "   mutante da sonda  : operador=$op fail=$sf2 tests=$st2"
  if [ "$sf" -eq "$LB_FAIL" ] && [ "$st" -gt 0 ] && [ "$sf2" -le "$LB_FAIL" ] && [ "$st2" -gt 0 ] && [ -n "$op" ]; then
    echo "   SONDA NAO-COBERTA — a ferramenta acha buraco"
  else falha_controle "sonda pristino=$sf/$st mutante=$sf2/$st2 base=$LB_FAIL operador=$op ec=$src/$src2"; fi
  rm -rf "$SD"

  echo
  echo "== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO"
  NC=0; NV=0
  for cl in $(grep -n '^#' "$PRIS/$ART" | sed -n '3p;5p;7p;9p' | cut -d: -f1); do
    ND="$BASE/noop$cl-$MARCA"; rm -rf "$ND"; cp -r "$PRIS" "$ND"
    sed -i "${cl}s/\$/ REESCRITO-NO-OP/" "$ND/$ART"
    read -r nf nt nrc <<<"$(roda_guard "$ND" "$TMO_LB")"
    NC=$((NC+1))
    if [ "$nf" -le "$LB_FAIL" ] && [ "$nt" -gt 0 ]; then NV=$((NV+1)); echo "   l.$cl VERDE (fail=$nf de $nt)"
    else echo "   l.$cl VERMELHO (fail=$nf de $nt, ec=$nrc) <- acusa TEXTO"; fi
    rm -rf "$ND"
  done
  echo "   no-ops verdes: $NV de $NC"
  [ "$NC" -eq 4 ] && [ "$NV" -eq 4 ] || falha_controle "no-ops verdes: $NV de $NC (exige 4 de 4)"
fi

# --- 11) a matriz ---------------------------------------------------------------------------------
echo
echo "== MATRIZ  linha | operador | #fail | veredito | causa"
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

# --- 12) resumo -----------------------------------------------------------------------------------
conta() { grep -cE "$1" "$MAT" || true; }
K=$(conta '^[0-9]+ \| [^|]+ \| fail=[0-9]+ \| VERMELHO( |$)')
NAOCOB=$(conta '^[0-9]+ \| [^|]+ \| fail=[0-9]+ \| VERDE  <- NAO-COBERTO')
EXCL=$(conta '^[0-9]+ \| EXCLUIDO \|')
ANOM=$(conta '^[0-9]+ \| ANOMALIA-')
INVAL=$(conta '^[0-9]+ \| MUTANTE-INVALIDO \|')
TMOS=$(conta '^[0-9]+ \| TIMEOUT \|')
N=$((K + NAOCOB))
grep -E '^[0-9]+ \| [^|]+ \| fail=[0-9]+ \| VERDE  <- NAO-COBERTO' "$MAT" | cut -d' ' -f1 | sort -n -u > "$BASE/nc.ids"
EQDECL=0; EQN=0; EQSEMFX=0
: > "$BASE/eq.ids"; : > "$BASE/eq.conf"; : > "$BASE/eq.mortos"
if [ -n "$EQUIV" ]; then
  # `id: justificativa (fixture que tentou discriminar)` — sem fixture nomeada, a linha e IGNORADA (A6)
  grep -E '^[0-9]+:.*\(.+\)' "$EQUIV" | cut -d: -f1 | sort -n -u > "$BASE/eq.ids"
  EQSEMFX=$(grep -E '^[0-9]+:' "$EQUIV" | grep -cvE '\(.+\)' || true)
  awk 'NR==FNR{nc[$1]=1; next} ($1 in nc)' "$BASE/nc.ids" "$BASE/eq.ids" > "$BASE/eq.conf"
  awk 'NR==FNR{nc[$1]=1; next} !($1 in nc)' "$BASE/nc.ids" "$BASE/eq.ids" > "$BASE/eq.mortos"
  EQDECL=$(wc -l < "$BASE/eq.ids" | tr -d ' ')
  EQN=$(wc -l < "$BASE/eq.conf" | tr -d ' ')
fi
echo
echo "N=$N K=$K NAO-COBERTOS=$NAOCOB EXCLUIDOS=$EXCL ANOMALIAS=$ANOM INVALIDOS=$INVAL TIMEOUT=$TMOS EQUIVALENTES-DECLARADOS=$EQDECL EQUIVALENTES-CONFERIDOS=$EQN"
if [ "$NAOCOB" -gt 0 ]; then
  echo "-- nao-cobertos (linha e trecho):"
  grep 'VERDE  <- NAO-COBERTO' "$MAT" | sed 's/^/   /'
fi
echo "-- conjuntos (fronteira 28): NAO-COBERTOS = { $(paste -sd' ' "$BASE/nc.ids") } · equivalentes declarados com fixture = { $(paste -sd' ' "$BASE/eq.ids") } · conferidos = { $(paste -sd' ' "$BASE/eq.conf") }"
[ "$EQSEMFX" -gt 0 ] && echo "-- $EQSEMFX linha(s) do arquivo de equivalentes SEM fixture nomeada: IGNORADA(S) (A6)"
while read -r id; do
  [ -n "$id" ] || continue
  echo "ANOMALIA-EQUIV $id — declarado equivalente, mas NAO esta entre os NAO-COBERTOS desta rodada (declaracao morta, ponto ja coberto ou fora do --only): NAO abate"
done < "$BASE/eq.mortos"
if [ "$INVAL" -gt 0 ]; then
  echo "-- MUTANTE-INVALIDO (fora de K, de NAO-COBERTOS e do denominador; a versao VIAVEL e medida por outro papel):"
  grep -E '^[0-9]+ \| MUTANTE-INVALIDO \|' "$MAT" | sed 's/^/   /'
fi
if [ "$TMOS" -gt 0 ]; then
  echo "-- TIMEOUT (comportamento mudou e foi detectado por tempo; fora de K e de NAO-COBERTOS):"
  grep -E '^[0-9]+ \| TIMEOUT \|' "$MAT" | sed 's/^/   /'
fi
echo "-- histograma de fail= dos VERMELHOS (multiplicidade >= 10% de N = ATENCAO modal: informacao para a amostra P1b, nao desqualificacao):"
grep -E '^[0-9]+ \| [^|]+ \| fail=[0-9]+ \| VERMELHO( |$)' "$MAT" | grep -oE 'fail=[0-9]+' | sort | uniq -c | sort -rn \
  | awk -v n="$N" '{ m = (n > 0 && $1 * 10 >= n) ? "   <- ATENCAO modal" : ""; printf "   %s x%s%s\n", $2, $1, m }'
DEPOIS_STATUS=$(git status --porcelain 2>/dev/null)
if [ "$ANTES_STATUS" = "$DEPOIS_STATUS" ]; then echo "[M-4] nenhum rastreado mudou durante a execucao"
else echo "[M-4] FALHA: o git status MUDOU durante a execucao"; printf '%s\n' "$DEPOIS_STATUS" | head; fi
if [ "$(md5sum < "$PRIS/$ART" | cut -d' ' -f1)" = "$MD5_PRIS" ]; then echo "copia pristina intacta (md5 igual)"
else echo "PARADO: a copia pristina foi alterada durante a rodada" >&2; exit 2; fi
if [ $((NAOCOB - EQN)) -gt 0 ]; then exit 1; fi
exit 0
