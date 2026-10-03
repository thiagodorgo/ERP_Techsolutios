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
# O QUE MUDOU NO CICLO 4 (mesmo bloco, PR #393), E POR QUE
#
# A junta 3 reprovou o ciclo 3 (2 x 1) com seis bloqueantes, quatro deles aqui, e a auditoria da
# maquina nomeou uma classe que tres juntas nao viram (A15). Cada conserto enuncia a PROPRIEDADE; o
# caso do guard e a instancia que a junta achou (plano §15.2 e errata §15.14):
#   C1c-01  a isencao da colagem cobre EXATAMENTE as linhas cuja igualdade foi verificada: toda linha
#           do corpo do bloco e comparada, e a unica variacao admitida e o CARIMBO de `# gerado em:`
#           (so quando tem a forma de carimbo). Ate o ciclo 3 a linha inteira saia da comparacao, e
#           uma linha `# gerado em: <SHA fabricado>` inserida no bloco LAVAVA o SHA.
#   C1c-02  a classificacao SHA/caminho e por TOKEN, e `:` nao esconde um SHA: `<sha>:CLAUDE.md` e
#           partido no 1o `:` e a esquerda hex de 7..40 e SHA; e a revisao de `<rev>:<caminho>` so
#           resolve se EXISTE como commit, nos DOIS ramos da checagem 6 (arquivo e diretorio).
#   C1c-03  a cerca e SAIDA, nunca COMANDO: `medido por:` dentro de cerca nao satisfaz a unidade.
#   C1c-04  o cabecalho de secao e EXATAMENTE `## MEDIDO`/`## HIPOTESE`; qualquer outro `## …` (e o que
#           vem embaixo dele) e conteudo fora das secoes — `## MEDIDO — <afirmacao>` deixou de ser
#           cabecalho que carregava uma afirmacao sem comando.
#   C1c-05  `grep` invocado por caminho (`/usr/bin/grep`) ou com extensao (`grep.exe`) e da familia.
#   C1c-06  `\|` numa celula de tabela e pipe literal, nao fronteira de coluna.
#   A15     fail-closed inclui a propria MORTE: todo subprocesso tem o status lido, e a morte de um
#           componente sai como UMA rejeicao que o nomeia, `exit 1`, nunca PRE-VOO OK (secao A15).
#   fr. 27  FECHADA: `RAIZ` na forma que o `git.exe` aceita mesmo com MSYS_NO_PATHCONV=1.
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
#               `<revisao>:<caminho>` so e revisao se a revisao EXISTE como commit — no ciclo 4,
#               `rev-parse --verify --quiet "<rev>^{commit}"` com o status LIDO, nos dois ramos
#               (arquivo e diretorio); o `rev-parse --verify` NU do ciclo 3 aceitava qualquer 40-hex.
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
#               bloco (trim; ignorando vazias), na ORDEM e por INTEIRO — no ciclo 4 a linha
#               `# gerado em:` tambem e comparada, e so o CARIMBO dela e normalizado (C1c-01). Igual ->
#               o bloco e SAIDA DA FERRAMENTA: as linhas do CORPO (nunca as de marcador da cerca)
#               ficam isentas das checagens 4, 5, 6 e 7, os SHAs delas (menos o carimbo) entram na
#               proveniencia da checagem 4, e sai a linha `COLAGEM`.
#               Diferente -> REJ nomeando o bloco (parcial, editado ou DESATUALIZADO: o head andou).
#               refs morto para o N daquele bloco -> REJ nomeando o #N; nada foi verificado.
#               Sem colagem nenhuma no mandato -> AVISO (fronteira 16).
#               O token e o UNICO mecanismo da checagem 7: ele SUBSTITUI o sub-teste de ROTULO do
#               ciclo 2 (`approved_head:` + SHA na mesma linha, conferido contra o estado LIDO da
#               ferramenta), que SAIU no ciclo 3 (plano §13.1). Era redundante por construcao — toda
#               linha que ele pegava o token ja tinha pego — e rejeitava a MESMA linha DUAS vezes: uma
#               maquina de forma fora do inventario I1..I20. O estado da ferramenta (LIDO, NAO
#               DETERMINAVEL, AUSENTE) nao muda o veredito: o MESMO corpo recebe UMA rejeicao, a do
#               token. O AVISO de ec=3 fica: ele e da checagem 4 (proveniencia), nao desta.
#
# CUSTOS E FRONTEIRAS (declarados; dono `B-GOV-MANDATO-2`)
#   - o conteudo da saida cercada NAO e verificado: a cerca e convencao visivel (fronteira 18).
#   - `###` dentro das secoes e isento da checagem 3 (e SO dela) — visivel por `grep -i "^###"`.
#   - sinonimo em prosa ("o head que a junta aprovou") nao e alcancado pelo token reservado
#     (fronteira 11): nao ha remedio livre de forma para isso.
#   - um segmento com 2 `grep` e 1 `caixa-exata:` isenta os 2 (fronteira 20) — o AVISO conta.
#   - caminho sem extensao e sem barra final nao e conferido (fronteira 4).
#   - fronteira 9: o CONTEUDO de `medido por:` / da celula de evidencia (`-`, `n/a`) nao e
#     verificado — verificar conteudo seria reconhecer comando.
#   - fronteira 14: a existencia e conferida no DISCO, nao no git — mandatos citam arquivos gerados.
#   - fronteira 15: homoglifos e caracteres de largura zero no token — a normalizacao e ASCII.
#   - fronteira 19 (regra da junta): a colagem e retrato, nao historico. REJ cuja UNICA causa e
#     `DESATUALIZADO` num documento escrito para um head anterior nao e defeito do documento:
#     reexecuta-se o pre-voo num worktree NO HEAD CERTO.
#   - fronteira 22: hash de blob e md5 nao tem canal de proveniencia na checagem 4 — publique o
#     VEREDITO da comparacao (`IDENTICO`/`DIVERGE`), nao o hash.
#   - fronteira 27: FECHADA no ciclo 4 (`RAIZ` por `cygpath -m` quando existe; caso [F-6j]).
#   - a esquerda de `:` que e hex de MAIS de 40 caracteres (`<80 hex>:x`) nao e cobrada: a C1c-02
#     parte so a esquerda de 7 a 40 (o plano a prescreve assim); a corrida longa INTEIRA ja e REJ.
#
# CODIGO DE SAIDA: 0 = PRE-VOO OK · 1 = rejeitou (inclusive quando um componente interno MORREU — a
# rejeicao o nomeia e nada foi julgado) · uso errado tambem sai 1, com a linha `uso:` no stderr.
#
# COSTURAS (para o guard; nenhuma muda o comportamento em producao)
#   MANDATO_REFS  caminho do `mandato-refs.sh` a usar. Default: `$RAIZ/scripts/mandato-refs.sh`.
#                 Invocado sempre como `bash "$MANDATO_REFS" ...`.
#
# Uso:  bash scripts/mandato-preflight.sh <arquivo.md> [PR]
set -u
set -o pipefail
F="${1:-}"; PR="${2:-}"
[ -n "$F" ] && [ -f "$F" ] || { echo "uso: mandato-preflight.sh <arquivo.md> [PR]" >&2; exit 1; }
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
# Fronteira 27 FECHADA (ciclo 4): o `git.exe` do Windows recusa `RAIZ` em forma POSIX (`/c/...`) quando
# o ambiente traz MSYS_NO_PATHCONV=1, e a checagem 6 rejeitava `rev:caminho` legitimo. Na forma mista
# (`C:/...`) os binarios nativos e os do MSYS a aceitam igual. Sem `cygpath` (Linux), RAIZ fica como esta.
if command -v cygpath >/dev/null 2>&1; then RAIZ=$(cygpath -m "$RAIZ" 2>/dev/null || printf '%s' "$RAIZ"); fi
REFS="${MANDATO_REFS:-$RAIZ/scripts/mandato-refs.sh}"
TAB=$'\t'
ERROS=0
falha() { printf 'REJEITADO  %s\n' "$1"; ERROS=$((ERROS+1)); }
aviso() { printf 'AVISO      %s\n' "$1"; }
paste_ok() { printf 'COLAGEM    %s\n' "$1"; }

TMPD=$(mktemp -d 2>/dev/null || printf '%s' "${TMPDIR:-/tmp}/mandato-preflight.$$")
mkdir -p "$TMPD" 2>/dev/null || true
trap 'rm -rf "$TMPD" 2>/dev/null || true' EXIT

# =================================================================================================
# A15 — FAIL-CLOSED INCLUI A PROPRIA MORTE (ciclo 4). Ate o ciclo 3 o status de cada subprocesso (awk,
# sed, tr, sort, grep, git) NAO era lido, e a saida VAZIA de um componente morto valia como "nada a
# rejeitar": com o awk da passada 2 morto o pre-voo dizia PRE-VOO OK para qualquer documento. Agora
# todo componente roda por UM de dois portoes, ambos chamados no shell PRINCIPAL (nunca dentro de
# `$( … )`, onde o `exit` mataria so o subshell):
#   corre    <componente> <saida> <comando…>   ec 0 = ok; qualquer outro = MORTE
#   veredito <componente> <saida> <comando…>   ec 0 e 1 sao a RESPOSTA (casou / nao casou, existe / nao
#                                              existe); ec >= 2 = MORTE (inclui 127 ausente, 128 git)
# A morte sai por `morreu`: UMA rejeicao que NOMEIA o componente, com a 1a linha do stderr dele, e
# `exit 1` NA HORA — o veredito nunca e positivo com um componente morto. O stderr de todo componente
# vai para arquivo: num documento valido o stderr do pre-voo fica VAZIO. O `mandato-refs.sh` tem
# contrato proprio (0 · 1 PARADO · 2 USO · 3 NAO DETERMINAVEL): 1 e 2 seguem "referencias
# indisponiveis", e qualquer codigo FORA do contrato (126, 127, 128+n) e morte nomeada `refs` — antes
# caia na comparacao e saia `NAO bate`, pela causa errada (plano §15.15(b)).
# =================================================================================================
ERRC="$TMPD/componente.err"
morreu() { # $1 componente  $2 ec  $3 arquivo com o stderr do componente
  local det=""
  [ -s "${3:-}" ] && IFS= read -r det < "$3"
  printf 'REJEITADO  componente interno morreu: %s (ec=%s)%s\n' "$1" "$2" "${det:+ — $det}"
  printf '\nPRE-VOO REJEITOU — um componente interno morreu e NADA foi julgado. O mandato NAO sai.\n'
  exit 1
}
corre() {
  local nome=$1 saida=$2 rc
  shift 2
  "$@" > "$saida" 2> "$ERRC"
  rc=$?
  [ "$rc" -eq 0 ] || { morreu "$nome" "$rc" "$ERRC"; }
}
veredito() {
  local nome=$1 saida=$2 rc
  shift 2
  "$@" > "$saida" 2> "$ERRC"
  rc=$?
  [ "$rc" -le 1 ] || { morreu "$nome" "$rc" "$ERRC"; }
  return "$rc"
}

# O CR de fim de linha e ruido de plataforma, nao conteudo: contar CR por grep e `cat -A` sao cegos
# a ele e so o `od -c` o mostra. Normalizar aqui (sem mexer na NUMERACAO das linhas) faz o veredito
# em CRLF ser identico ao de LF por CONSTRUCAO, em vez de por coincidencia.
NORM="$TMPD/mandato.norm"
corre "tr (normaliza o CR)" "$NORM" tr -d '\r' < "$F"

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
ESTRUT="$TMPD/estrutura"
corre "awk (oraculo)" "$ESTRUT" awk -v OFS="$TAB" -v ORAC="$ORACULO" '
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
      # C1c-04: o cabecalho de secao e EXATAMENTE o nome (so espaco depois). Qualquer outra linha `## `
      # — inclusive `## MEDIDO <texto>` — e CONTEUDO fora das secoes, e o que vem embaixo dela tambem.
      if (l ~ /^## +MEDIDO[[:space:]]*$/)   { vistoM=1; sec="M"; print i, 0, sec, 1 > ORAC; continue }
      if (l ~ /^## +HIPOTESE[[:space:]]*$/) { vistoH=1; sec="H"; print i, 0, sec, 1 > ORAC; continue }
      if (l ~ /^## /) {
        sec="X"; print i, 0, sec, 1 > ORAC
        print "FORA", i, l "   <- nao e cabecalho: secao e so `## MEDIDO` ou `## HIPOTESE`, o NOME sozinho na linha; texto apos o nome e conteudo"
        continue
      }
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
    if (l ~ /^## +MEDIDO[[:space:]]*$/)   print "SWALLOW", "MEDIDO", i          # ENGOLIDO pela cerca
    if (l ~ /^## +HIPOTESE[[:space:]]*$/) print "SWALLOW", "HIPOTESE", i
    if (l ~ /[^[:space:]]/) {
      if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
    }
  }
  if (fc != "") print "ABERTA", fstart, fc, fk
  if (vistoM) print "SEC", "MEDIDO",   cont["M"]+0
  if (vistoH) print "SEC", "HIPOTESE", cont["H"]+0
}
' "$NORM"

# o FILTRO da saida estruturada: as linhas de um tipo vao para "$TMPD/peg.<tipo>"; morte = morte nomeada
peg() { corre "awk (filtro peg $1)" "$TMPD/peg.$1" awk -F"$TAB" -v t="$1" '$1==t' "$ESTRUT"; }

# 1) as duas secoes existem — e se a unica ocorrencia esta DENTRO de cerca, a mensagem o diz
peg SEC
peg SWALLOW
for s in MEDIDO HIPOTESE; do
  corre "awk (secao $s)" "$TMPD/sec.$s" awk -F"$TAB" -v s="$s" '$2==s { print $3; exit }' "$TMPD/peg.SEC"
  q=""; IFS= read -r q < "$TMPD/sec.$s"
  if [ -z "$q" ]; then
    corre "awk (secao $s engolida)" "$TMPD/eng.$s" awk -F"$TAB" -v s="$s" '$2==s { print $3; exit }' "$TMPD/peg.SWALLOW"
    eng=""; IFS= read -r eng < "$TMPD/eng.$s"
    if [ -n "$eng" ]; then
      falha "falta a secao '## $s' — a unica ocorrencia esta DENTRO de cerca, l.$eng"
    else
      falha "falta a secao '## $s'"
    fi
  else
    [ "${q:-0}" = "0" ] && aviso "secao $s sem unidades"
  fi
done

# 1-bis) cerca ABERTA no fim do arquivo: estado de saida, nomeando a ABERTURA
peg ABERTA
while IFS="$TAB" read -r _t ln ch k; do
  [ -n "${ln:-}" ] || continue
  falha "cerca aberta desde l.$ln ($ch x$k) sem fechamento ate o fim do arquivo"
done < "$TMPD/peg.ABERTA"

# 2) nenhuma linha de conteudo fora das duas secoes (uma linha de cerca fora delas e conteudo)
peg FORA
corre "awk (lista o conteudo fora)" "$TMPD/fora" awk -F"$TAB" 'NR <= 5 { print "           " $2 ": " $3 }' "$TMPD/peg.FORA"
fora=""; IFS= read -r fora < "$TMPD/fora"
[ -n "$fora" ] && { falha "linha(s) de conteudo fora de MEDIDO/HIPOTESE:"; while IFS= read -r x; do printf '%s\n' "$x"; done < "$TMPD/fora"; }

# =================================================================================================
# A COLAGEM DA FERRAMENTA (checagem 7, isencao I1) — por BLOCO cercado, por IGUALDADE, por PR.
# Roda antes de tudo o que e "por linha", porque e ela que define quais linhas ficam ISENTAS das
# checagens 4, 5, 6 e 7 e quais SHAs entram na proveniencia da checagem 4.
# =================================================================================================
EXENTAS=":"
COLSHAS=()
NCOLAGENS=0
# C1c-01 — a isencao cobre EXATAMENTE as linhas cuja igualdade foi verificada. As linhas SIGNIFICATIVAS
# de um bloco (trim, vazias fora) sao TODAS comparadas, nos dois lados; a UNICA variacao admitida e o
# CARIMBO que a ferramenta grava: em `# gerado em: <carimbo> · repo: <x>`, o `<carimbo>` vira um marcador
# fixo SO quando tem a forma de carimbo (AAAA-MM-DDThh:mm[:ss]Z, com `-<pid>` opcional) e e seguido de
# espaco ou fim de linha. `# gerado em:` com qualquer outro conteudo e comparada LITERALMENTE.
SIGNIF='{ sub(/^[[:space:]]+/, ""); sub(/[[:space:]]+$/, "") }
index($0, "# gerado em: ") == 1 && match(substr($0, 14), /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9:]+Z(-[0-9]+)?/) {
  depois = substr($0, 14 + RLENGTH)
  if (depois == "" || substr(depois, 1, 1) == " ") $0 = "# gerado em: <carimbo>" depois
}
NF'
# e a proveniencia da colagem sai das linhas COMPARADAS, menos a do carimbo: corridas hex de 7 a 40
PROVSHA='index($0, "# gerado em: <carimbo>") != 1 { n = split($0, h, /[^0-9A-Fa-f]+/); for (j = 1; j <= n; j++) if (length(h[j]) >= 7 && length(h[j]) <= 40) print tolower(h[j]) }'

peg BLOCO
while IFS="$TAB" read -r _t ini fim; do
  [ -n "${ini:-}" ] && [ -n "${fim:-}" ] || continue
  [ "$fim" -gt "$((ini+1))" ] || continue                        # bloco sem corpo nao e colagem
  corre "sed (extrai o bloco l.$ini-$fim)" "$TMPD/bloco.raw" sed -n "$((ini+1)),$((fim-1))p" "$NORM"
  corre "awk (normaliza o bloco l.$ini-$fim)" "$TMPD/bloco.sig" awk "$SIGNIF" "$TMPD/bloco.raw"
  prim=""; IFS= read -r prim < "$TMPD/bloco.sig"
  case "$prim" in
    "# refs do PR #"*) ;;
    *) continue ;;                                               # sem a 1a linha real: NAO e colagem
  esac
  N="${prim#"# refs do PR #"}"; N="${N%%[!0-9]*}"
  [ -n "$N" ] || continue
  if [ ! -f "$TMPD/refs.$N.rc" ]; then
    bash "$REFS" "$N" > "$TMPD/refs.$N.out" 2>"$TMPD/refs.$N.err"; echo $? > "$TMPD/refs.$N.rc"
  fi
  RCN=""; IFS= read -r RCN < "$TMPD/refs.$N.rc"
  # o contrato do refs e 0 LIDO/AUSENTE · 1 PARADO · 2 USO · 3 NAO DETERMINAVEL. Qualquer outro codigo
  # (126 nao executavel, 127 ausente, 128+n sinal) e MORTE do componente, nunca "NAO bate" (§15.15(b)).
  case "$RCN" in
    0|3) ;;
    1|2) falha "l.$ini-$fim: referencias indisponiveis para #$N (mandato-refs.sh ec=$RCN) — nada foi verificado"; continue ;;
    *) morreu "refs (mandato-refs.sh $N, colagem l.$ini-$fim)" "$RCN" "$TMPD/refs.$N.err" ;;
  esac
  corre "awk (normaliza a saida do refs #$N)" "$TMPD/refs.$N.sig" awk "$SIGNIF" "$TMPD/refs.$N.out"
  if [ "$(< "$TMPD/bloco.sig")" != "$(< "$TMPD/refs.$N.sig")" ]; then
    falha "l.$ini-$fim: bloco '# refs do PR #$N' NAO bate com a saida atual de mandato-refs.sh $N (parcial, editado ou DESATUALIZADO: o head andou?)"
    continue
  fi
  paste_ok "l.$ini-$fim: refs do PR #$N confere com a saida atual"
  NCOLAGENS=$((NCOLAGENS+1))
  i=$((ini+1))                                                    # as linhas-marcador NUNCA sao isentas
  while [ "$i" -lt "$fim" ]; do EXENTAS="$EXENTAS$i:"; i=$((i+1)); done
  corre "awk (SHAs da colagem l.$ini-$fim)" "$TMPD/col.$ini.sha" awk "$PROVSHA" "$TMPD/bloco.sig"
  COLSHAS+=("$TMPD/col.$ini.sha")
done < "$TMPD/peg.BLOCO"
[ "$NCOLAGENS" = "0" ] && aviso "sem colagem da ferramenta (cole a saida de: bash scripts/mandato-refs.sh <PR>)"

# =================================================================================================
# PASSADA 2 — le o ORACULO e o documento. Unidades (chk 3), tokens (chk 4 e 6), segmentos (chk 5),
# token reservado (chk 7). Nenhum reconhecedor de secao ou cerca aqui: `fe` e `sec` vem do
# oraculo, e `EX` traz as linhas isentas pela colagem VERIFICADA.
# =================================================================================================
REC="$TMPD/rec"
corre "awk (passada 2)" "$REC" awk -v OFS="$TAB" -v EX="$EXENTAS" '
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
  # C1c-05: a invocacao por CAMINHO (`/usr/bin/grep`) e com EXTENSAO (`grep.exe`) e da mesma familia
  while (match(s, /(^|[^A-Za-z0-9_.\/-])([A-Za-z0-9_.-]*\/)*[A-Za-z]*(grep|rg)(\.exe)?([[:space:]]|$)/)) {
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
# C1c-06: `\|` numa celula e o pipe LITERAL do Markdown, nao fronteira de coluna — sai antes do `split`
function colunaDeEvidencia(l,   c,n,i) {
  gsub(/\\[|]/, "\001", l)
  n = split(l, c, "|")
  for (i = 2; i < n; i++) if (c[i] ~ /medido por:|derruba com:/) return i
  return 0
}
function celulaCheia(l, idx,   c,n) {
  gsub(/\\[|]/, "\001", l)
  n = split(l, c, "|")
  if (idx < 2 || idx > n) return 0
  return (c[idx] ~ /[^[:space:]]/)
}
function tokenUnidade() { return (secU=="H") ? "derruba com:" : "medido por:" }
# C1c-03: a cerca e SAIDA, nunca COMANDO. A unidade guarda dois textos: `utext` (tudo, para mensagem) e
# `uprosa` (so as linhas NAO cercadas). O token so satisfaz a unidade se estiver na PROSA.
function satisfeita() { return (uok || index(uprosa, tokenUnidade()) > 0) }
function abre(i, l, apos, cercada) { ustart=i; ufirst=l; utext=l; uprosa=(cercada ? "" : l); uok=0; uapos=apos; ucerca=0; secU=sec }
function fecha() {
  if (ustart > 0) {
    if (!satisfeita()) {
      if (secU=="H") print "REJ3H", ustart, ufirst, uapos
      else           print "REJ3M", ustart, ufirst, uapos
    }
    if (ucerca && index(uprosa, tokenUnidade()) == 0) print "REJ19", ustart, ufirst
    ultimaSat = satisfeita() ? 1 : 0
  }
  ustart=0; ufirst=""; utext=""; uprosa=""; uok=0; uapos=0; ucerca=0
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
      # C1c-02: `:` nao esconde um SHA. O token com `:` e partido no PRIMEIRO `:`; a esquerda que e hex
      # de 7 a 40 vai para a checagem 4 como SHA, e o token INTEIRO segue abaixo para a checagem 6
      # (nada muda para `HEAD:…`, `C:/…`, `https://…`, que nao tem hex a esquerda).
      kc = index(usuf, ":")
      if (kc > 1) {
        ls = limpaS(substr(usuf, 1, kc - 1))
        if (ls != "" && ehex(ls) && length(ls) >= 7 && length(ls) <= 40) print "SHA", FNR, tolower(ls)
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
}
END {
  n = FNR
  sec=""; ustart=0; ufirst=""; utext=""; uprosa=""; uok=0; uapos=0; ucerca=0; tabCol=0; ultimaSat=0; secU=""
  for (i=1;i<=n;i++) {
    l = L[i]; fe = FE[i]+0; novaSec = SC[i]
    if (novaSec != sec) { fecha(); sec = novaSec; tabCol=0; ultimaSat=0 }
    if (HD[i]+0 == 1) continue                                              # o cabecalho nao e conteudo
    if (sec != "M" && sec != "H") continue
    # --- cerca: marcador e corpo pertencem a unidade, em QUALQUER posicao (I19) ---------------
    if (fe == 1 || fe == 2) {
      if (ustart == 0) abre(i, l, ultimaSat, 1)
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
      if (ustart > 0 && index(uprosa, tokenUnidade()) == 0 && !uok) {
        utext = utext "\n" l; uprosa = uprosa "\n" l; coletaGrep(i, l); continue   # I20: antes do token
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
' "$ORACULO" "$NORM"

# o FILTRO da saida da passada 2, pelo mesmo portao: `$TMPD/pega.<tipo>`
pega() { corre "awk (filtro pega $1)" "$TMPD/pega.$1" awk -F"$TAB" -v t="$1" '$1==t' "$REC"; }
DICA_APOS=" (linha apos o comando fora de cerca: saida colada vai em cerca; continuacao de prosa vai ANTES do 'medido por:')"

# 3) toda UNIDADE de MEDIDO tem 'medido por:'; toda de HIPOTESE tem 'derruba com:'
pega REJ3M
while IFS="$TAB" read -r _t ln txt apos; do
  [ -n "${ln:-}" ] || continue
  if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; fi
  falha "unidade de MEDIDO sem 'medido por: <comando>' — l.$ln: $txt$d"
done < "$TMPD/pega.REJ3M"
pega REJ3H
while IFS="$TAB" read -r _t ln txt apos; do
  [ -n "${ln:-}" ] || continue
  if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; fi
  falha "unidade de HIPOTESE sem 'derruba com: <comando>' — l.$ln: $txt$d"
done < "$TMPD/pega.REJ3H"
# 3-bis) I19, o outro lado da convencao: cerca numa unidade SEM comando
pega REJ19
while IFS="$TAB" read -r _t ln txt; do
  [ -n "${ln:-}" ] || continue
  falha "saida colada sem comando — l.$ln: cerca numa unidade sem 'medido por:' — $txt"
done < "$TMPD/pega.REJ19"

# 4) todo SHA citado tem de vir de mandato-refs.sh — resolver NAO basta (o a62d04e2 resolvia)
pega HEXLONGO
corre "sort (corridas hex longas)" "$TMPD/hexlongo" sort -u "$TMPD/pega.HEXLONGO"
while IFS="$TAB" read -r _t ln len; do
  [ -n "${ln:-}" ] || continue
  falha "corrida hexadecimal de $len caracteres (SHAs colados?) — l.$ln"
done < "$TMPD/hexlongo"

pega SHA
corre "awk (SHAs citados)" "$TMPD/shas.raw" awk -F"$TAB" '{ print $3 }' "$TMPD/pega.SHA"
corre "sort (SHAs citados)" "$TMPD/shas" sort -u "$TMPD/shas.raw"
NSHAS=0; while IFS= read -r _s; do NSHAS=$((NSHAS+1)); done < "$TMPD/shas"
if [ "$NSHAS" -gt 0 ]; then
  if [ -n "$PR" ]; then
    bash "$REFS" "$PR" --sha-only > "$TMPD/leg" 2>"$TMPD/refs.arg.err"; RC=$?
    case "$RC" in
      0|1|2|3) ;;
      *) morreu "refs (mandato-refs.sh $PR --sha-only)" "$RC" "$TMPD/refs.arg.err" ;;
    esac
    corre "awk (detalhe do refs)" "$TMPD/det" awk 'NR <= 3 { printf "%s ", $0 }' "$TMPD/refs.arg.err"
    DET=""; IFS= read -r DET < "$TMPD/det"
    if [ "$RC" = 1 ] || [ "$RC" = 2 ]; then
      falha "referencias indisponiveis (mandato-refs.sh ec=$RC): ${DET:-<stderr vazio>} — NADA foi verificado: a ferramenta de referencias morreu, o mandato nao chegou a ser julgado"
    else
      [ "$RC" = 3 ] && aviso "approved_head NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash $REFS $PR' para ver o que a ferramenta viu. ${DET}"
      # A proveniencia e a UNIAO: a saida da ferramenta para o PR + os SHAs de TODA colagem
      # VERIFICADA do documento (citar o head de outro PR e legitimo quando o bloco dele esta colado).
      corre "awk (proveniencia)" "$TMPD/prov" awk 'NF { print tolower($0) }' "$TMPD/leg" ${COLSHAS[@]+"${COLSHAS[@]}"}
      while IFS= read -r s; do
        veredito "grep (proveniencia do SHA)" /dev/null grep -qi "^${s}" "$TMPD/prov" \
          || falha "SHA '$s' nao esta na saida de mandato-refs.sh $PR (resolver nao basta — e pode ser SHA VELHO: o ramo anda)"
      done < "$TMPD/shas"
    fi
  else
    falha "o mandato cita SHA mas nao recebeu o numero do PR — rode: mandato-preflight.sh $F <PR>"
  fi
fi

# 5) assercao de ausencia tem de ser insensivel a caixa (o 'Maioria de 3' passou por isso)
pega REJ5
while IFS="$TAB" read -r _t ln seg; do
  [ -n "${ln:-}" ] || continue
  falha "invocacao de grep/rg SEM -i (e o segmento nao declara 'caixa-exata:') — l.$ln: $seg"
done < "$TMPD/pega.REJ5"
pega AVI5
corre "sort (isencoes caixa-exata)" "$TMPD/a5" sort -u "$TMPD/pega.AVI5"
while IFS="$TAB" read -r _t ln c; do
  [ -n "${ln:-}" ] || continue
  aviso "caixa-exata: isenta $c invocacao(oes) sem -i — l.$ln"
done < "$TMPD/a5"

# 6) todo caminho do repositorio citado existe NO CAMINHO CITADO
# A revisao de `<rev>:<caminho>` so "resolve" se EXISTE como commit (C1c-02 e errata §15.14): o
# `rev-parse --verify --quiet` NU aceita qualquer 40-hex; com `^{commit}` ele parte POR ec — 1 = nao
# existe (ou nao e commit), >= 2 = o git morreu (A15: morte nomeada, nunca "nao existe"). UMA funcao,
# chamada nos DOIS ramos (arquivo e diretorio), ANTES de olhar se o caminho existe.
revExiste() { veredito "git (chk 6, revisao '$1')" /dev/null git -C "$RAIZ" rev-parse --verify --quiet "${1}^{commit}"; }
pega PATH
corre "sort (caminhos citados)" "$TMPD/r6" sort -u "$TMPD/pega.PATH"
while IFS="$TAB" read -r _t ln c nv; do
  [ -n "${c:-}" ] || continue
  [ "${nv:-0}" = "1" ] && continue                     # '(novo)': declarado a criar (I3)
  # `<revisao>:<caminho>` é citação corrente na casa (`git show origin/main:docs/x.md`). O que o
  # mandato afirma ali é sobre o CAMINHO, e a revisão só conta como revisão se ela EXISTE.
  d="$c"
  case "$c" in *:*) d="${c##*:}" ;; esac
  case "$c" in
    */)
      [ -d "$RAIZ/$c" ] && continue
      [ -d "$RAIZ/mobile/flutter_app/$c" ] && continue
      if [ -n "$d" ] && [ "$d" != "$c" ]; then
        rev="${c%:*}"
        revExiste "$rev" || { falha "diretorio citado nao existe: $c (a revisao '$rev' nao existe localmente ou nao e commit — git fetch?)"; continue; }
        { [ -d "$RAIZ/$d" ] || [ -d "$RAIZ/mobile/flutter_app/$d" ]; } && continue
      fi
      falha "diretorio citado nao existe: $c (conferido em \$RAIZ/ e em \$RAIZ/mobile/flutter_app/)" ;;
    *)
      [ -e "$RAIZ/$c" ] && continue
      [ -e "$RAIZ/mobile/flutter_app/$c" ] && continue
      if [ -n "$d" ] && [ "$d" != "$c" ]; then
        rev="${c%:*}"
        revExiste "$rev" || { falha "caminho citado nao existe: $c (a revisao '$rev' nao existe localmente ou nao e commit — git fetch?)"; continue; }
        { [ -e "$RAIZ/$d" ] || [ -e "$RAIZ/mobile/flutter_app/$d" ]; } && continue
      fi
      falha "caminho citado nao existe: $c (conferido em \$RAIZ/ e em \$RAIZ/mobile/flutter_app/ — nao ha busca por basename)" ;;
  esac
done < "$TMPD/r6"

# 7) `approved_head` e TOKEN RESERVADO: o nome do campo e da FERRAMENTA, o autor nao o escreve.
#    A unica isencao e a colagem VERIFICADA (I1), cujas linhas ja sairam em `EXENTAS`. E o UNICO
#    mecanismo desta checagem: o rotulo nao e conferido contra o estado da ferramenta (§13.1).
pega AH7
corre "sort (token reservado)" "$TMPD/r7" sort -t "$TAB" -k2,2n -u "$TMPD/pega.AH7"
while IFS="$TAB" read -r _t ln; do
  [ -n "${ln:-}" ] || continue
  falha "l.$ln: token reservado approved_head fora da colagem da ferramenta"
done < "$TMPD/r7"

echo
if [ "$ERROS" = "0" ]; then echo "PRE-VOO OK — $F"; exit 0; fi
echo "PRE-VOO REJEITOU $ERROS item(ns). O mandato NAO sai."; exit 1
