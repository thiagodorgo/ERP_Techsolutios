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
# O FORMATO (v3). Duas secoes, e nenhuma linha de conteudo fora delas:
#   ## MEDIDO     -> toda afirmacao vem com `medido por: <comando>` e a saida colada EM CERCA
#   ## HIPOTESE   -> toda afirmacao vem com `derruba com: <comando>`
# Se nao da para escrever o comando que derruba, nao e hipotese: e opiniao, e nao entra.
#
# A FORMA DA UNIDADE (v3) — e o cabecalho do ciclo 2 dizia o CONTRARIO ("indente a continuacao"):
#
#     reivindicacao (uma ou VARIAS linhas)  ->  `medido por: <comando>`  ->  saida EM CERCA
#
# Prosa indentada ANTES do token agrega a unidade (I20, fronteira 17). DEPOIS do token, qualquer
# linha nao vazia e NAO CERCADA — indentada ou nao — abre unidade NOVA, que precisa do proprio
# token. Era por ai que UMA evidencia cobria CINCO afirmacoes (achado B-1 do critico).
#
# -----------------------------------------------------------------------------------------------
# O QUE MUDOU NO CICLO 3 (bloco B-GOV-MANDATO, PR #393), E POR QUE
#
# A junta reprovou o ciclo 2. As duas classes:
#   (i)  cada checagem tinha o SEU proprio reconhecedor de secao e de cerca (`grep -qE` na checagem
#        1, um awk na checagem 2, outro no resto). Uma cerca podia ENGOLIR `## HIPOTESE`: o
#        `grep -q` via a linha (existencia textual) e a maquina de estados nao (ausencia
#        estrutural), e o documento saia OK. E uma cerca ABERTA no fim do arquivo nao tinha estado
#        de saida nenhum.
#   (ii) a checagem 7 ("rotular e afirmar") reconhecia UMA GRAFIA — `approved_head` seguido de `:`
#        ou `=` e um SHA na MESMA linha. `approved-head`, `approvedHead`, `APPROVED HEAD`, o nome
#        partido em duas ou tres linhas e a celula de tabela escapavam todos.
#
#   um so ORACULO (E2.a)   UMA passada calcula, POR LINHA, o estado de cerca (CommonMark: abre com
#               >= 3 crases ou tils; fecha so com o MESMO caractere e comprimento >=) e a secao
#               (`## ` conta so FORA de cerca). As checagens 1, 2, 3, 5 e 7 leem ESTE oraculo, e
#               nenhuma tem reconhecedor proprio. `## MEDIDO`/`## HIPOTESE` dentro de cerca e
#               registrado como ENGOLIDO, e a checagem 1 nomeia a linha. Cerca aberta no fim do
#               arquivo e estado de saida: REJ nomeando a ABERTURA. Secao que existe e esta vazia e
#               estado previsto: AVISO, nunca silencio.
#
#   checagem 3  a UNIDADE, e a agregacao LIMITADA POR ESTRUTURA. Unidade = linha nao indentada
#               dentro da secao + as linhas indentadas que a seguem ATE a que contem o token,
#               inclusive + os blocos cercados em qualquer posicao (saida). Linha em branco fecha.
#               DEPOIS do token, linha nao vazia e nao cercada abre unidade NOVA. LINHA DE TABELA
#               NUNCA AGREGA — com celula cheia OU vazia: a celula da coluna de evidencia satisfaz
#               SO aquela linha, e uma indentada embaixo dela abre unidade nova. O cabecalho de
#               tabela deixou de ser isento (I6 removida): e unidade, e se NOMEIA a coluna de
#               evidencia ele se satisfaz por isso. Cerca numa unidade SEM token = saida colada sem
#               comando -> REJ (I19, o outro lado da convencao "cerca = saida").
#               CUSTO ACEITO E DECLARADO (R13): prosa depois do `medido por:` cai. O contorno esta
#               na mensagem: continuacao de prosa vai ANTES do token; saida vai EM CERCA.
#
#   checagem 4  o TOKEN, nao a vizinhanca — e agora PARTIR *e* JUNTAR. `..` PARTE o token (intervalo
#               do git: `git log <a>..<b>` cobra o `<b>`); o `.` inicial sai da ponta; e uma CORRIDA
#               HEXADECIMAL de mais de 40 caracteres e REJEITADA nomeando o comprimento — juntar
#               dois SHAs sem separador deixava de ser SHA e escapava. `_` NAO parte (fronteira 10).
#               A proveniencia e a UNIAO de `mandato-refs.sh <PR> --sha-only` com os SHAs de TODA
#               colagem VERIFICADA do documento: citar o head de outro PR e legitimo quando o bloco
#               daquele PR esta colado. E o `ec` do mandato-refs.sh e LIDO: ferramenta morta =
#               "nada foi verificado", nunca "o mandato citou SHA velho" (achado C1-05).
#
#   checagem 5  o COMANDO, por SEGMENTO. A linha e partida em segmentos por `|`, `||`, `&&`, `;`,
#               `$(` e crase. Familia = nome que TERMINA em `grep` ou `rg` (`egrep`, `fgrep`, `rg`).
#               O `-i` (isolado, agrupado ou `--ignore-case`) vale no MESMO segmento; o
#               `caixa-exata:` isenta as invocacoes DO SEGMENTO QUE O CONTEM — nunca outra linha da
#               mesma unidade — e a isencao sai VISIVEL, com a contagem, num AVISO. Toda linha das
#               secoes e varrida: as indentadas, as cercadas e os cabecalhos `###` tambem.
#
#   checagem 6  a EXISTENCIA EXATA, nao a extensao nem o basename. Caminho citado = token com `/`
#               que (a) termina em `/`, ou (b) tem um `.` no ultimo segmento; que nao e absoluto
#               (`X:/`, `/...`), URL (`://`), placeholder (`<...>`) nem so digitos/pontos/barras;
#               sufixo `:NN` cai. Ele tem de existir em `$RAIZ/<caminho>` ou em
#               `$RAIZ/mobile/flutter_app/<caminho>` (o app Flutter e raiz propria nos mandatos).
#               `(novo)` isenta o token de caminho IMEDIATAMENTE ANTERIOR — nao a linha toda.
#               `<revisao>:<caminho>` so e revisao se o prefixo RESOLVE (`git rev-parse`).
#               CUSTO ACEITO E DECLARADO: caminho SEM extensao e SEM barra final (`src/modules/x`)
#               nao e conferido — pela estrutura ele e indistinguivel de `e/ou` e de `14/14`.
#               Dono: `B-GOV-MANDATO-2`.
#
#   checagem 7  `approved_head` e TOKEN RESERVADO. O nome do campo e da FERRAMENTA; o autor nao o
#               escreve. O DOCUMENTO INTEIRO (menos as linhas isentas) e reduzido a [A-Za-z0-9]
#               minusculo e concatenado; o token e a substring `approvedhead` — qualquer grafia,
#               qualquer lugar, partido em QUALQUER numero de linhas (nao ha janela).
#               UNICA ISENCAO — estrutural, por IGUALDADE, por BLOCO: um bloco CERCADO cuja 1a
#               linha nao vazia e `# refs do PR #N — ...` (a 1a linha real da saida da ferramenta).
#               O pre-voo le o N DO BLOCO, roda `mandato-refs.sh N` e compara TODAS as linhas do
#               bloco (trim; ignorando vazias e `# gerado em:`), na ORDEM e por INTEIRO. Igual -> o
#               bloco e SAIDA DA FERRAMENTA: as suas linhas ficam isentas das checagens 4, 5, 6 e 7,
#               os SHAs dele entram na proveniencia da checagem 4, e sai a linha `COLAGEM`.
#               Diferente -> REJ nomeando o bloco (parcial, editado ou DESATUALIZADO: o head andou).
#               refs morto para o N daquele bloco -> REJ nomeando o #N; nada foi verificado.
#               Sem colagem nenhuma no mandato -> AVISO (fronteira 16).
#               O sub-teste de ROTULO do ciclo 2 (`approved_head:` + SHA na mesma linha, conferido
#               contra o estado LIDO da ferramenta) CONTINUA de pe, nas linhas nao isentas.
#
# CUSTOS E FRONTEIRAS (declarados; dono `B-GOV-MANDATO-2`)
#   - o conteudo da saida cercada NAO e verificado: a cerca e convencao visivel (fronteira 18).
#   - `###` dentro das secoes e isento da checagem 3 (e SO dela) — visivel por `grep -i "^###"`.
#   - sinonimo em prosa ("o head que a junta aprovou") nao e alcancado pelo token reservado
#     (fronteira 11): nao ha remedio livre de forma para isso.
#   - um segmento com 2 `grep` e 1 `caixa-exata:` isenta os 2 (fronteira 20) — o AVISO conta.
#   - caminho sem extensao e sem barra final nao e conferido (fronteira 4).
#
# COSTURAS (para o guard; nenhuma muda o comportamento em producao)
#   MANDATO_REFS  caminho do `mandato-refs.sh` a usar. Default: `$RAIZ/scripts/mandato-refs.sh`.
#                 Invocado sempre como `bash "$MANDATO_REFS" ...`.
#
# Uso:  bash scripts/mandato-preflight.sh <arquivo.md> [PR]
set -u
F="${1:-}"; PR="${2:-}"
[ -n "$F" ] && [ -f "$F" ] || { echo "uso: mandato-preflight.sh <arquivo.md> [PR]" >&2; exit 1; }
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
REFS="${MANDATO_REFS:-$RAIZ/scripts/mandato-refs.sh}"
TAB=$(printf '\t')
ERROS=0
falha() { printf 'REJEITADO  %s\n' "$1"; ERROS=$((ERROS+1)); }
aviso() { printf 'AVISO      %s\n' "$1"; }
paste_ok() { printf 'COLAGEM    %s\n' "$1"; }

TMPD=$(mktemp -d 2>/dev/null || printf '%s' "${TMPDIR:-/tmp}/mandato-preflight.$$")
mkdir -p "$TMPD" 2>/dev/null || true
trap 'rm -rf "$TMPD" 2>/dev/null || true' EXIT

# O CR de fim de linha e ruido de plataforma, nao conteudo: contar CR por grep e `cat -A` sao cegos
# a ele e so o `od -c` o mostra. Normalizar aqui (sem mexer na NUMERACAO das linhas) faz o veredito
# em CRLF ser identico ao de LF por CONSTRUCAO, em vez de por coincidencia.
NORM="$TMPD/mandato.norm"
tr -d '\r' < "$F" > "$NORM"

# =================================================================================================
# O ORACULO — UMA passada. Emite, por linha do documento, `<i> <fe> <sec>`:
#   fe   0 = fora de cerca · 1 = corpo de cerca · 2 = linha de MARCADOR de cerca (abre ou fecha)
#   sec  - = fora das secoes · M · H · X (outra secao `## `)
#   hd   1 = a propria linha de cabecalho `## ` (nao e conteudo de secao nenhuma)
# e, na saida padrao, os achados estruturais que as checagens 1 e 2 consomem. Nenhuma outra
# checagem reconhece secao ou cerca por conta propria: todas leem este arquivo.
# =================================================================================================
ORACULO="$TMPD/oraculo"
: > "$ORACULO"
ESTRUT=$(awk -v OFS="$TAB" -v ORAC="$ORACULO" '
function semIndent(s) { sub(/^[[:space:]]+/, "", s); return s }
function trim(s) { sub(/^[[:space:]]+/,"",s); sub(/[[:space:]]+$/,"",s); return s }
function marcaChar(l,   s,c) { s=semIndent(l); c=substr(s,1,1); if (c!="\140" && c!="~") return ""; return c }
function marcaLen(l,   s,c,k) { s=semIndent(l); c=substr(s,1,1); k=0; while (substr(s,k+1,1)==c) k++; return k }
function marcaResto(l,   s,k) { s=semIndent(l); k=marcaLen(l); return substr(s,k+1) }
{ L[NR]=$0 }
END {
  n=NR; fc=""; fk=0; fstart=0; sec="-"
  for (i=1;i<=n;i++) {
    l=L[i]
    mc = marcaChar(l); mk = (mc=="") ? 0 : marcaLen(l)
    if (fc == "") {
      if (mc != "" && mk >= 3) {                                   # abre cerca
        fc=mc; fk=mk; fstart=i
        print i, 2, sec, 0 > ORAC
        if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
        continue
      }
      if (l ~ /^## +MEDIDO/)   { vistoM=1; sec="M"; print i, 0, sec, 1 > ORAC; continue }
      if (l ~ /^## +HIPOTESE/) { vistoH=1; sec="H"; print i, 0, sec, 1 > ORAC; continue }
      if (l ~ /^## /)          { sec="X"; print i, 0, sec, 1 > ORAC; continue }
      print i, 0, sec, 0 > ORAC
      if (l ~ /[^[:space:]]/) {
        if (sec=="-" || sec=="X") { if (l !~ /^# /) print "FORA", i, l }   # I8: `# titulo` e isento
        else cont[sec]++
      }
      continue
    }
    # --- dentro de cerca -----------------------------------------------------------------------
    if (mc == fc && mk >= fk && trim(marcaResto(l)) == "") {       # fecha (CommonMark)
      print i, 2, sec, 0 > ORAC
      print "BLOCO", fstart, i
      if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
      fc=""; fk=0; fstart=0
      continue
    }
    print i, 1, sec, 0 > ORAC
    if (l ~ /^## +MEDIDO/)   print "SWALLOW", "MEDIDO", i          # ENGOLIDO pela cerca
    if (l ~ /^## +HIPOTESE/) print "SWALLOW", "HIPOTESE", i
    if (l ~ /[^[:space:]]/) {
      if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
    }
  }
  if (fc != "") print "ABERTA", fstart, fc, fk
  if (vistoM) print "SEC", "MEDIDO",   cont["M"]+0
  if (vistoH) print "SEC", "HIPOTESE", cont["H"]+0
}
' "$NORM")

peg() { printf '%s\n' "$ESTRUT" | awk -F"$TAB" -v t="$1" '$1==t'; }

# 1) as duas secoes existem — e se a unica ocorrencia esta DENTRO de cerca, a mensagem o diz
for s in MEDIDO HIPOTESE; do
  if [ -z "$(peg SEC | awk -F"$TAB" -v s="$s" '$2==s')" ]; then
    eng=$(peg SWALLOW | awk -F"$TAB" -v s="$s" '$2==s { print $3; exit }')
    if [ -n "$eng" ]; then
      falha "falta a secao '## $s' — a unica ocorrencia esta DENTRO de cerca, l.$eng"
    else
      falha "falta a secao '## $s'"
    fi
  else
    q=$(peg SEC | awk -F"$TAB" -v s="$s" '$2==s { print $3; exit }')
    [ "${q:-0}" = "0" ] && aviso "secao $s sem unidades"
  fi
done

# 1-bis) cerca ABERTA no fim do arquivo: estado de saida, nomeando a ABERTURA
peg ABERTA > "$TMPD/aberta"
while IFS="$TAB" read -r _t ln ch k; do
  [ -n "${ln:-}" ] || continue
  falha "cerca aberta desde l.$ln ($ch x$k) sem fechamento ate o fim do arquivo"
done < "$TMPD/aberta"

# 2) nenhuma linha de conteudo fora das duas secoes (uma linha de cerca fora delas e conteudo)
fora=$(peg FORA | awk -F"$TAB" '{ print $2": "$3 }')
[ -n "$fora" ] && { falha "linha(s) de conteudo fora de MEDIDO/HIPOTESE:"; printf '%s\n' "$fora" | head -5 | sed 's/^/           /'; }

# =================================================================================================
# A COLAGEM DA FERRAMENTA (checagem 7, isencao I1) — por BLOCO cercado, por IGUALDADE, por PR.
# Roda antes de tudo o que e "por linha", porque e ela que define quais linhas ficam ISENTAS das
# checagens 4, 5, 6 e 7 e quais SHAs entram na proveniencia da checagem 4.
# =================================================================================================
EXENTAS=":"
PROVCOL=""
NCOLAGENS=0
significativas() { sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -v '^$' | grep -v '^# gerado em:'; }

peg BLOCO > "$TMPD/blocos"
while IFS="$TAB" read -r _t ini fim; do
  [ -n "${ini:-}" ] && [ -n "${fim:-}" ] || continue
  [ "$fim" -gt "$((ini+1))" ] || continue                        # bloco sem corpo nao e colagem
  sed -n "$((ini+1)),$((fim-1))p" "$NORM" > "$TMPD/bloco.raw"
  prim=$(significativas < "$TMPD/bloco.raw" | head -1)
  case "$prim" in
    "# refs do PR #"*) ;;
    *) continue ;;                                               # sem a 1a linha real: NAO e colagem
  esac
  N=$(printf '%s' "$prim" | sed -n 's/^# refs do PR #\([0-9][0-9]*\).*/\1/p')
  [ -n "$N" ] || continue
  if [ ! -f "$TMPD/refs.$N.rc" ]; then
    bash "$REFS" "$N" > "$TMPD/refs.$N.out" 2>"$TMPD/refs.$N.err"; echo $? > "$TMPD/refs.$N.rc"
  fi
  RCN=$(cat "$TMPD/refs.$N.rc")
  if [ "$RCN" = "1" ] || [ "$RCN" = "2" ]; then
    falha "l.$ini-$fim: referencias indisponiveis para #$N (mandato-refs.sh ec=$RCN) — nada foi verificado"
    continue
  fi
  if [ "$(significativas < "$TMPD/bloco.raw")" = "$(significativas < "$TMPD/refs.$N.out")" ]; then
    paste_ok "l.$ini-$fim: refs do PR #$N confere com a saida atual"
    NCOLAGENS=$((NCOLAGENS+1))
    i="$ini"
    while [ "$i" -le "$fim" ]; do EXENTAS="$EXENTAS$i:"; i=$((i+1)); done
    PROVCOL="$PROVCOL
$(tr -c '0-9A-Fa-f' '\n' < "$TMPD/bloco.raw" | awk 'length($0)>=7 && length($0)<=40 { print tolower($0) }')"
  else
    falha "l.$ini-$fim: bloco '# refs do PR #$N' NAO bate com a saida atual de mandato-refs.sh $N (parcial, editado ou DESATUALIZADO: o head andou?)"
  fi
done < "$TMPD/blocos"
[ "$NCOLAGENS" = "0" ] && aviso "sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)"

# =================================================================================================
# PASSADA 2 — le o ORACULO e o documento. Unidades (chk 3), tokens (chk 4 e 6), segmentos (chk 5),
# token reservado e rotulo (chk 7). Nenhum reconhecedor de secao ou cerca aqui: `fe` e `sec` vem do
# oraculo, e `EX` traz as linhas isentas pela colagem VERIFICADA.
# =================================================================================================
REC=$(awk -v OFS="$TAB" -v EX="$EXENTAS" '
function isento(num) { return (index(EX, ":" num ":") > 0) }
function limpaP(s) { sub(/^[:-]+/,"",s); sub(/[.:-]+$/,"",s); return s }     # caminho: `.` inicial FICA
function limpaS(s) { sub(/^[.:-]+/,"",s); sub(/[.:-]+$/,"",s); return s }    # SHA: o `.` inicial SAI
function ehex(s,   i,c) {
  if (length(s) < 1) return 0
  for (i=1;i<=length(s);i++) { c=substr(s,i,1); if (index("0123456789abcdefABCDEF", c)==0) return 0 }
  return 1
}
function temI(s) {
  if (index(s, "--ignore-case") > 0) return 1
  return (s ~ /(^|[[:space:]])-[A-Za-z]*i[A-Za-z]*([[:space:]]|$)/)
}
function contaGrep(s,   c) {
  c = 0
  while (match(s, /(^|[^A-Za-z0-9_.\/-])[A-Za-z]*(grep|rg)([[:space:]]|$)/)) {
    c++; s = substr(s, RSTART + RLENGTH)
  }
  return c
}
# Checagem 5, por SEGMENTO: `|`, `||`, `&&`, `;`, `$(` e crase partem a linha. O `-i` e o
# `caixa-exata:` valem no segmento em que estao — nunca na unidade, nunca na linha inteira.
function coletaGrep(num, l,   t, nseg, seg, j, c, k5) {
  if (isento(num)) return
  t = l
  gsub(/\$\(/, "\001", t)
  gsub(/[|;&\140]/, "\001", t)
  nseg = split(t, seg, "\001")
  for (j=1;j<=nseg;j++) {
    c = contaGrep(seg[j])
    if (c == 0) continue
    if (temI(seg[j])) continue
    if (index(seg[j], "caixa-exata:") > 0) { print "AVI5", num, c; continue }
    for (k5=1;k5<=c;k5++) print "REJ5", num, seg[j]
  }
}
# `approved_head` seguido de `:` ou `=` e, depois dele, um SHA na MESMA linha: o sub-teste de ROTULO
# do ciclo 2, que continua de pe (o token reservado e uma camada ACIMA dele, nao um substituto).
function primeirosha(s,   t,u) {
  while (match(s, /[A-Za-z0-9_.\/:-]+/)) {
    t=substr(s,RSTART,RLENGTH); s=substr(s,RSTART+RLENGTH)
    u=limpaS(t); if (length(u)>=7 && length(u)<=40 && ehex(u)) return tolower(u)
  }
  return ""
}
function rotulo_ah(l,   i, resto, j, c) {
  i = index(l, "approved_head")
  if (i == 0) return ""
  resto = substr(l, i + length("approved_head"))
  for (j = 1; j <= length(resto); j++) {
    c = substr(resto, j, 1)
    if (c == ":" || c == "=") return primeirosha(substr(resto, j + 1))
    if (c != "*" && c != "\140" && c != ")" && c != "\042" && c != "\047" && c != " ") return ""
  }
  return ""
}
function colunaDeEvidencia(l,   c,n,i) {
  n = split(l, c, "|")
  for (i = 2; i < n; i++) if (c[i] ~ /medido por:|derruba com:/) return i
  return 0
}
function celulaCheia(l, idx,   c,n) {
  n = split(l, c, "|")
  if (idx < 2 || idx > n) return 0
  return (c[idx] ~ /[^[:space:]]/)
}
function tokenUnidade() { return (secU=="H") ? "derruba com:" : "medido por:" }
function satisfeita() { return (uok || index(utext, tokenUnidade()) > 0) }
function abre(i, l, apos) { ustart=i; ufirst=l; utext=l; uok=0; uapos=apos; ucerca=0; secU=sec }
function fecha() {
  if (ustart > 0) {
    if (!satisfeita()) {
      if (secU=="H") print "REJ3H", ustart, ufirst, uapos
      else           print "REJ3M", ustart, ufirst, uapos
    }
    if (ucerca && index(utext, tokenUnidade()) == 0) print "REJ19", ustart, ufirst
    ultimaSat = satisfeita() ? 1 : 0
  }
  ustart=0; ufirst=""; utext=""; uok=0; uapos=0; ucerca=0
}
# --- 1o arquivo: o ORACULO ---------------------------------------------------------------------
NR==FNR { FE[$1]=$2; SC[$1]=$3; HD[$1]=$4; next }
# --- 2o arquivo: o documento -------------------------------------------------------------------
{
  L[FNR]=$0
  if (isento(FNR)) next
  np=0; delete pt; delete pex
  s = $0
  while (match(s, /[A-Za-z0-9_.\/:-]+/)) {
    t = substr(s, RSTART, RLENGTH)
    antes = (RSTART > 1) ? substr(s, RSTART-1, 1) : ""
    depois = substr(s, RSTART+RLENGTH, 1)
    s = substr(s, RSTART+RLENGTH)
    # `(novo)`: isenta o token de caminho IMEDIATAMENTE ANTERIOR (I3), nao a linha
    if (t == "novo" && antes == "(" && depois == ")") { if (np > 0) pex[np]=1; continue }
    # `..` PARTE o token (intervalo do git). O separador vai ESCAPADO: com mais de um caractere o
    # `split` trata o terceiro argumento como REGEX, e um ".." cru casaria QUALQUER par de
    # caracteres — picava todo token e as checagens 4 e 6 saiam mudas (medido).
    nparte = split(t, parte, /\.\./)
    for (ip=1; ip<=nparte; ip++) {
      u = parte[ip]
      if (u == "") continue
      # o sufixo de linha (`arquivo.md:12`, `<sha>:12`) cai ANTES da classificacao — nas DUAS
      # pontas. Testar hexadecimal primeiro fazia `<sha>:12` deixar de ser SHA (medido: o B3
      # caia 10/11, e o escape era exatamente a 10a vizinhanca).
      usuf = u
      sub(/:[0-9]+$/, "", usuf)
      us = limpaS(usuf)
      if (us != "" && ehex(us)) {
        if (length(us) > 40) { print "HEXLONGO", FNR, length(us); continue }
        if (length(us) >= 7) { print "SHA", FNR, tolower(us); continue }
      }
      up = limpaP(u)
      if (up == "") continue
      sub(/:[0-9]+$/, "", up); up = limpaP(up)
      if (up == "") continue
      if (index(up, "/") == 0) continue                       # I13: sem `/` nao e caminho
      if (up ~ /^[A-Za-z]:\//) continue                       # I17: absoluto Windows
      if (up ~ /^\//) continue                                # I17: absoluto POSIX
      if (index(up, "://") > 0) continue                      # I18: URL
      if (index(up, "<") > 0) continue                        # I16: placeholder
      if (up ~ /^[0-9.\/]+$/) continue                        # I15: razao numerica
      if (up !~ /\/$/ && up !~ /\/[^\/]*\.[^\/]*$/) continue  # I14: sem extensao e sem barra final
      np++; pt[np]=up
    }
  }
  for (ip=1; ip<=np; ip++) print "PATH", FNR, pt[ip], (pex[ip]==1) ? 1 : 0
  ahl = rotulo_ah($0)
  if (ahl != "") print "AH", FNR, ahl
}
END {
  n = FNR
  sec=""; ustart=0; ufirst=""; utext=""; uok=0; uapos=0; ucerca=0; tabCol=0; ultimaSat=0; secU=""
  for (i=1;i<=n;i++) {
    l = L[i]; fe = FE[i]+0; novaSec = SC[i]
    if (novaSec != sec) { fecha(); sec = novaSec; tabCol=0; ultimaSat=0 }
    if (HD[i]+0 == 1) continue                                              # o cabecalho nao e conteudo
    if (sec != "M" && sec != "H") continue
    # --- cerca: marcador e corpo pertencem a unidade, em QUALQUER posicao (I19) ---------------
    if (fe == 1 || fe == 2) {
      if (ustart == 0) abre(i, l, ultimaSat)
      else utext = utext "\n" l
      ucerca = 1
      coletaGrep(i, l)
      continue
    }
    if (l !~ /[^[:space:]]/) { fecha(); ultimaSat=0; continue }              # branco fecha
    if (l ~ /^#{3,} /) { fecha(); coletaGrep(i, l); ultimaSat=0; continue }  # I7: so a chk 3 isenta
    if (l !~ /^\|/) tabCol = 0                                              # a tabela acabou
    if (l ~ /^\|[-: |]+\|[[:space:]]*$/ && index(l,"-") > 0) { fecha(); continue }   # I5: separador
    if (l ~ /^\|/ && i < n && L[i+1] ~ /^\|[-: |]+\|[[:space:]]*$/ && index(L[i+1],"-") > 0) {
      fecha(); tabCol = colunaDeEvidencia(l)                                # I6 REMOVIDA: e unidade
      abre(i, l, 0); coletaGrep(i, l); fecha(); continue
    }
    if (tabCol > 0 && l ~ /^\|/) {                                          # I12: linha de tabela
      fecha(); abre(i, l, 0); uok = celulaCheia(l, tabCol)                  # e unidade FECHADA:
      coletaGrep(i, l); fecha(); continue                                   # NUNCA agrega
    }
    if (l ~ /^[[:space:]]/) {
      if (ustart > 0 && index(utext, tokenUnidade()) == 0 && !uok) {
        utext = utext "\n" l; coletaGrep(i, l); continue                    # I20: antes do token
      }
      fecha(); abre(i, l, ultimaSat); coletaGrep(i, l); continue            # depois: unidade NOVA
    }
    fecha(); abre(i, l, ultimaSat); coletaGrep(i, l)
  }
  fecha()
  # --- checagem 7: TOKEN RESERVADO no documento INTEIRO, menos as linhas isentas -------------
  norm=""; np7=0
  for (i=1;i<=n;i++) {
    if (isento(i)) continue
    z = tolower(L[i]); gsub(/[^a-z0-9]/, "", z)
    for (j=1;j<=length(z);j++) { np7++; ORIG[np7]=i }
    norm = norm z
  }
  p = 1
  while (1) {
    k = index(substr(norm, p), "approvedhead")
    if (k == 0) break
    print "AH7", ORIG[p + k - 1]
    p = p + k - 1 + 12
  }
}
' "$ORACULO" "$NORM")

pega() { printf '%s\n' "$REC" | awk -F"$TAB" -v t="$1" '$1==t'; }
DICA_APOS=" (linha apos o comando fora de cerca: saida colada vai em cerca; continuacao de prosa vai ANTES do 'medido por:')"

# 3) toda UNIDADE de MEDIDO tem 'medido por:'; toda de HIPOTESE tem 'derruba com:'
pega REJ3M > "$TMPD/r3m"
while IFS="$TAB" read -r _t ln txt apos; do
  [ -n "${ln:-}" ] || continue
  if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; fi
  falha "unidade de MEDIDO sem 'medido por: <comando>' — l.$ln: $txt$d"
done < "$TMPD/r3m"
pega REJ3H > "$TMPD/r3h"
while IFS="$TAB" read -r _t ln txt apos; do
  [ -n "${ln:-}" ] || continue
  if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; fi
  falha "unidade de HIPOTESE sem 'derruba com: <comando>' — l.$ln: $txt$d"
done < "$TMPD/r3h"
# 3-bis) I19, o outro lado da convencao: cerca numa unidade SEM comando
pega REJ19 > "$TMPD/r19"
while IFS="$TAB" read -r _t ln txt; do
  [ -n "${ln:-}" ] || continue
  falha "saida colada sem comando — l.$ln: cerca numa unidade sem 'medido por:' — $txt"
done < "$TMPD/r19"

# 4) todo SHA citado tem de vir de mandato-refs.sh — resolver NAO basta (o a62d04e2 resolvia)
pega HEXLONGO | sort -u > "$TMPD/hexlongo"
while IFS="$TAB" read -r _t ln len; do
  [ -n "${ln:-}" ] || continue
  falha "corrida hexadecimal de $len caracteres (SHAs colados?) — l.$ln"
done < "$TMPD/hexlongo"

SHAS=$(pega SHA | cut -f3 | sort -u)
if [ -n "$SHAS" ]; then
  if [ -n "$PR" ]; then
    LEG=$(bash "$REFS" "$PR" --sha-only 2>"$TMPD/refs.arg.err"); RC=$?
    DET=$(head -3 "$TMPD/refs.arg.err" 2>/dev/null | tr '\n' ' ')
    if [ "$RC" = 1 ] || [ "$RC" = 2 ]; then
      falha "referencias indisponiveis (mandato-refs.sh ec=$RC): ${DET:-<stderr vazio>} — NADA foi verificado: a ferramenta de referencias morreu, o mandato nao chegou a ser julgado"
    else
      [ "$RC" = 3 ] && aviso "approved_head NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash $REFS $PR' para ver o que a ferramenta viu. ${DET}"
      # A proveniencia e a UNIAO: a saida da ferramenta para o PR + os SHAs de TODA colagem
      # VERIFICADA do documento (citar o head de outro PR e legitimo quando o bloco dele esta colado).
      PROV=$(printf '%s\n%s\n' "$LEG" "$PROVCOL" | tr 'A-F' 'a-f' | grep -v '^$' | sort -u)
      for s in $SHAS; do
        printf '%s\n' "$PROV" | grep -qi "^${s}" \
          || falha "SHA '$s' nao esta na saida de mandato-refs.sh $PR (resolver nao basta — e pode ser SHA VELHO: o ramo anda)"
      done
    fi
  else
    falha "o mandato cita SHA mas nao recebeu o numero do PR — rode: mandato-preflight.sh $F <PR>"
  fi
fi

# 5) assercao de ausencia tem de ser insensivel a caixa (o 'Maioria de 3' passou por isso)
pega REJ5 > "$TMPD/r5"
while IFS="$TAB" read -r _t ln seg; do
  [ -n "${ln:-}" ] || continue
  falha "invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.$ln: $seg"
done < "$TMPD/r5"
pega AVI5 | sort -u > "$TMPD/a5"
while IFS="$TAB" read -r _t ln c; do
  [ -n "${ln:-}" ] || continue
  aviso "caixa-exata: isenta $c invocacao(oes) sem -i — l.$ln"
done < "$TMPD/a5"

# 6) todo caminho do repositorio citado existe NO CAMINHO CITADO
pega PATH | cut -f2,3,4 | sort -u > "$TMPD/r6"
while IFS="$TAB" read -r ln c nv; do
  [ -n "${c:-}" ] || continue
  [ "${nv:-0}" = "1" ] && continue                     # '(novo)': declarado a criar (I3)
  # `<revisao>:<caminho>` é citação corrente na casa (`git show origin/main:docs/x.md`). O que o
  # mandato afirma ali é sobre o CAMINHO, e a revisão só conta como revisão se ela RESOLVE.
  d="$c"
  case "$c" in *:*) d="${c##*:}" ;; esac
  case "$c" in
    */)
      [ -d "$RAIZ/$c" ] && continue
      [ -d "$RAIZ/mobile/flutter_app/$c" ] && continue
      [ -n "$d" ] && [ "$d" != "$c" ] && { [ -d "$RAIZ/$d" ] || [ -d "$RAIZ/mobile/flutter_app/$d" ]; } && continue
      falha "diretorio citado nao existe: $c (conferido em \$RAIZ/ e em \$RAIZ/mobile/flutter_app/)" ;;
    *)
      [ -e "$RAIZ/$c" ] && continue
      [ -e "$RAIZ/mobile/flutter_app/$c" ] && continue
      if [ -n "$d" ] && [ "$d" != "$c" ]; then
        rev="${c%:*}"
        if git -C "$RAIZ" rev-parse --verify --quiet "$rev" >/dev/null 2>&1; then
          { [ -e "$RAIZ/$d" ] || [ -e "$RAIZ/mobile/flutter_app/$d" ]; } && continue
        fi
      fi
      falha "caminho citado nao existe: $c (conferido em \$RAIZ/ e em \$RAIZ/mobile/flutter_app/ — nao ha busca por basename)" ;;
  esac
done < "$TMPD/r6"

# 7) `approved_head` e TOKEN RESERVADO: o nome do campo e da FERRAMENTA, o autor nao o escreve.
#    A unica isencao e a colagem VERIFICADA (I1), cujas linhas ja sairam em `EXENTAS`.
pega AH7 | cut -f2 | sort -n -u > "$TMPD/r7"
while IFS= read -r ln; do
  [ -n "${ln:-}" ] || continue
  falha "l.$ln: token reservado approved_head fora da colagem da ferramenta"
done < "$TMPD/r7"

# 7-bis) o sub-teste de ROTULO do ciclo 2: `approved_head: <SHA>` conferido contra o estado LIDO
AHS=$(pega AH | cut -f2,3 | sort -u)
if [ -n "$AHS" ] && [ -n "$PR" ]; then
  OUT=$(bash "$REFS" "$PR" 2>/dev/null); RC7=$?
  case "$OUT" in
    *"LIDO DA ATA"*)       EST7=LIDO ;;
    *"NAO DETERMINAVEL"*)  EST7="NAO DETERMINAVEL" ;;
    *"AUSENTE"*)           EST7=AUSENTE ;;
    *)                     EST7="desconhecido (mandato-refs.sh ec=$RC7)" ;;
  esac
  LIDOSHA=$(printf '%s\n' "$OUT" | awk '/^approved_head:/{print tolower($2); exit}')
  printf '%s\n' "$AHS" > "$TMPD/r7b"
  while IFS="$TAB" read -r ln s; do
    [ -n "${ln:-}" ] || continue
    if [ "$EST7" != "LIDO" ]; then
      falha "l.$ln: o mandato rotula $s como approved_head, mas a ferramenta diz $EST7"
    else
      case "$LIDOSHA" in
        "$s"*) : ;;
        *) falha "l.$ln: o mandato rotula $s como approved_head, mas a ferramenta LEU $LIDOSHA" ;;
      esac
    fi
  done < "$TMPD/r7b"
fi

echo
if [ "$ERROS" = "0" ]; then echo "PRE-VOO OK — $F"; exit 0; fi
echo "PRE-VOO REJEITOU $ERROS item(ns). O mandato NAO sai."; exit 1
