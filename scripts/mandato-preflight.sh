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
# -----------------------------------------------------------------------------------------------
# O QUE MUDOU NO CICLO 2 (bloco B-GOV-MANDATO, PR #393), E POR QUE
#
# A junta reprovou o ciclo 1 (`J-B-GOV-MANDATO.md`, 2 x 1). O bloqueante C1-01: a checagem 3 so
# inspecionava `^[-*] ` na coluna 0 e a checagem 2 admitia conteudo nao-bullet dentro das secoes;
# juntas, NADA inspecionava o resto. As MESMAS oito afirmacoes numericas, sem `medido por:`, dentro
# de `## MEDIDO`: como itens `- ` davam ec=1; COMO TABELA davam ec=0, PRE-VOO OK. Cinco de sete
# formas passavam. E a restricao a bullets NAO ESTAVA DECLARADA em lugar nenhum — nem no comando,
# nem no briefing, nem aqui — e contradizia o contrato enunciado duas vezes ("toda afirmacao").
#
# A classe e uma so, e vale para as checagens 3 a 6: GUARDA QUE RECONHECE UMA FORMA CONHECIDA EM VEZ
# DE ENUNCIAR A PROPRIEDADE. O conserto foi mover cada checagem para a propriedade:
#
#   checagem 3  a UNIDADE, nao o marcador de lista. Unidade = uma linha NAO-INDENTADA dentro da
#               secao, mais todas as linhas INDENTADAS e todo bloco cercado por ``` que a seguem;
#               linha em branco fecha. Toda unidade de MEDIDO contem `medido por:`; toda unidade de
#               HIPOTESE contem `derruba com:`. A forma da linha deixa de existir como conceito:
#               tabela, paragrafo, lista numerada, citacao e item recuado sao unidades como as
#               outras. EXCECOES ESTRUTURAIS DECLARADAS, e sao so estas quatro:
#                 (a) separador de tabela (`|---|`) e a linha de cabecalho que vem logo antes dele;
#                 (b) cabecalho `###` ou mais fundo dentro da secao (e titulo, nao afirmacao);
#                 (c) o que esta FORA das duas secoes — de que cuida a checagem 2;
#                 (d) se o CABECALHO da tabela nomeia a coluna `medido por:` (ou `derruba com:`),
#                     cada linha de dados satisfaz o requisito pela CELULA nao-vazia daquela coluna.
#                     Sem (d) o pre-voo rejeitaria `| CI 14/14 | gh pr checks |`, que TRAZ a
#                     evidencia — seria falso-positivo contra o proprio contrato. A coluna e LIDA do
#                     cabecalho da tabela, nunca presumida, e a tabela acaba na 1a linha sem `|`.
#               CUSTO ACEITO: prosa quebrada em duas linhas NAO-indentadas vira duas unidades, e a
#               segunda precisa da propria evidencia. Indente a continuacao, ou junte as linhas.
#
#   checagem 4  o TOKEN, nao a vizinhanca. Token = corrida maxima de [A-Za-z0-9_/.:-]; tira `:` e `-`
#               da frente e `.`, `:` e `-` do fim; e SHA se, e so se, o token INTEIRO for hexadecimal
#               de 7 a 40 (caixa indiferente). Virgula, ponto, parenteses, hifen colado, MAIUSCULAS,
#               `commit=`, inicio de linha e DOIS SHAs separados por UM espaco deixam de escapar —
#               a vizinhanca deixa de existir como conceito. O caminho do scratchpad, o UUID solto e
#               `deadbeef.md` continuam de fora porque o TOKEN INTEIRO nao e hexadecimal.
#               E o `ec` do mandato-refs.sh e LIDO: ferramenta morta = "nada foi verificado", nunca
#               "o mandato citou SHA velho" (era a causa ERRADA; achado C1-05).
#
#   checagem 5  o COMANDO, nao o vocabulario. Toda invocacao de `grep`/`rg` citada dentro das secoes
#               precisa de `-i` (isolado ou agrupado, `-[A-Za-z]*i`), ou a unidade declara
#               `caixa-exata:`. Acento, aspas e o token `via-interna` deixam de existir como
#               conceito. CUSTO ACEITO: um `grep -c` de contagem legitimo precisa de `-i` ou de
#               `caixa-exata:` na unidade; e a forma longa `--ignore-case` NAO e reconhecida.
#
#   checagem 6  a EXISTENCIA EXATA, nao a extensao nem o basename. Caminho citado = token com `/`
#               que (a) termina em `/`, ou (b) tem um `.` no ultimo segmento; que nao e absoluto
#               (`X:/`, `/...`), URL (`://`) nem so digitos/pontos/barras; sufixo `:NN` cai. Ele tem
#               de existir em `$RAIZ/<caminho>` ou em `$RAIZ/mobile/flutter_app/<caminho>` (o app
#               Flutter e raiz propria nos mandatos). O `find -name <basename>` SUMIU: era ele que
#               aceitava `src/diretorio/que/nao/existe/env.ts` porque existe UM `env.ts` em outro
#               lugar (pendencia P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME, fechada aqui). A
#               lista de 10 extensoes SUMIU: era ela que deixava passar `.sh`, a extensao dos dois
#               entregaveis deste bloco (achado C1-04). A linha inalcancavel do absoluto SUMIU
#               (achado C1-06): o absoluto e excluido na propria tokenizacao.
#               CUSTO ACEITO E DECLARADO: caminho SEM extensao e SEM barra final (`src/modules/x`)
#               nao e conferido — pela estrutura ele e indistinguivel de `e/ou` e de `14/14`.
#               Dono: `B-GOV-MANDATO-2`. E token na MESMA LINHA que `(novo)` e declarado a criar e
#               fica isento — isso e confianca declarada, nao verificacao.
#
#   checagem 7  NOVA. Rotular e afirmar. Se o mandato escreve `approved_head` seguido de `:` ou `=` e,
#               NA MESMA LINHA, de um SHA, o pre-voo roda o `mandato-refs.sh` em modo completo e exige
#               o estado LIDO com esse mesmo SHA. Sem ela, a checagem 4 aceitaria o objeto de uma ata
#               REPROVADA (que ESTA na proveniencia) rotulado como aprovado — a mesma classe, uma
#               camada acima. DIVERGENCIA DECLARADA do plano, que dizia "na mesma UNIDADE": o
#               dogfooding do relatorio do dev mediu FALSO-POSITIVO — uma unidade que cita
#               `approved_head` dentro de um PADRAO DE BUSCA e que tem um SHA qualquer na saida
#               colada era lida como rotulo. O gatilho por LINHA com separador de campo so APERTA.
#               Mesma classe de correcao na checagem 6: `<revisao>:<caminho>` (`git show
#               origin/main:docs/x.md`) e citacao corrente, e o que o mandato afirma ali e sobre o
#               CAMINHO — entao o que vem depois do ULTIMO `:` tambem e conferido, INTEIRO.
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
falha() { echo "REJEITADO  $1"; ERROS=$((ERROS+1)); }
aviso() { echo "AVISO      $1"; }

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

# --- uma varredura so: tokens (checagens 4 e 6) + unidades (checagens 3, 5 e 7) -----------------
REC=$(awk -v OFS="$TAB" '
function limpa(s) { sub(/^[:-]+/,"",s); sub(/[.:-]+$/,"",s); return s }
function ehex(s,   i,c) {
  if (length(s) < 7 || length(s) > 40) return 0
  for (i=1;i<=length(s);i++) { c=substr(s,i,1); if (index("0123456789abcdefABCDEF", c)==0) return 0 }
  return 1
}
function primeirosha(s,   t,u) {
  while (match(s, /[A-Za-z0-9_.\/:-]+/)) {
    t=substr(s,RSTART,RLENGTH); s=substr(s,RSTART+RLENGTH)
    u=limpa(t); if (ehex(u)) return tolower(u)
  }
  return ""
}
function coletagrep(s, num) {
  if (s ~ /(^|[^A-Za-z0-9_.\/-])(grep|rg)([[:space:]]|$)/) {
    if (s !~ /(^|[[:space:]])-[A-Za-z]*i[A-Za-z]*([[:space:]]|$)/) { ngrep++; gnum[ngrep]=num; gtxt[ngrep]=s }
  }
}
function fecha(   k) {
  if (ustart > 0) {
    if (!uok) {
      if (sec == "M" && utext !~ /medido por:/)  print "REJ3M", ustart, ufirst
      if (sec == "H" && utext !~ /derruba com:/) print "REJ3H", ustart, ufirst
    }
    if (ngrep > 0 && utext !~ /caixa-exata:/)  for (k=1;k<=ngrep;k++) print "REJ5", gnum[k], gtxt[k]
  }
  ustart=0; ufirst=""; utext=""; ngrep=0; uok=0
}
# ROTULAR e afirmar (checagem 7): "o mandato ROTULA <sha> como approved_head". O rotulo e reconhecido
# POR LINHA e exige o separador de campo — `approved_head` seguido de `:` ou `=` e, depois dele, um SHA
# NA MESMA LINHA. O plano dizia "na mesma unidade"; o dogfooding do relatorio do dev mediu que isso da
# FALSO-POSITIVO: uma unidade que cita `approved_head` DENTRO de um padrao de busca e que tem um SHA
# qualquer na saida colada seria lida como rotulo. Divergencia declarada, e ela so aperta o gatilho.
function rotulo_ah(l,   i, resto, j, c) {
  i = index(l, "approved_head")
  if (i == 0) return ""
  resto = substr(l, i + length("approved_head"))
  for (j = 1; j <= length(resto); j++) {
    c = substr(resto, j, 1)
    if (c == ":" || c == "=") return primeirosha(substr(resto, j + 1))
    if (c != "*" && c != "`" && c != ")" && c != "\"" && c != "\047" && c != " ") return ""
  }
  return ""
}
# Uma tabela pode declarar a evidencia por COLUNA: se o cabecalho nomeia `medido por:` (ou
# `derruba com:`), cada linha de dados satisfaz o requisito quando a celula DAQUELA coluna nao esta
# vazia. Sem isto o pre-voo rejeitaria `| CI 14/14 | gh pr checks |`, que TRAZ a evidencia — seria
# falso-positivo contra o proprio contrato. A coluna e lida do cabecalho, nunca presumida.
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
{
  # --- rotulo de approved_head: por LINHA, com separador de campo (checagem 7) ---
  ahl = rotulo_ah($0)
  if (ahl != "") print "AH", NR, ahl
  # --- tokens: o arquivo INTEIRO (checagens 4 e 6) ---
  novo = ($0 ~ /\(novo\)/) ? 1 : 0
  s = $0
  while (match(s, /[A-Za-z0-9_.\/:-]+/)) {
    t = substr(s, RSTART, RLENGTH); s = substr(s, RSTART+RLENGTH)
    u = limpa(t)
    if (u == "") continue
    sub(/:[0-9]+$/, "", u); u = limpa(u)   # sufixo de linha (`arquivo.md:12`, `<sha>:12`)
    if (u == "") continue
    if (ehex(u)) { print "SHA", NR, tolower(u); continue }
    if (index(u, "/") == 0) continue
    if (u ~ /^[A-Za-z]:\//) continue          # absoluto Windows
    if (u ~ /^\//) continue                   # absoluto POSIX
    if (index(u, "://") > 0) continue         # URL
    if (index(u, "<") > 0) continue           # placeholder
    if (u ~ /^[0-9.\/]+$/) continue           # razao numerica (3058/3060, 14/14, 1.5/2.0)
    if (u !~ /\/$/ && u !~ /\/[^\/]*\.[^\/]*$/) continue   # sem extensao e sem barra final
    print "PATH", NR, u, novo
  }
  L[NR]=$0
}
END {
  n=NR; sec=""; ustart=0; ufirst=""; utext=""; fence=0; ngrep=0; uok=0; tabCol=0
  for (i=1;i<=n;i++) {
    l = L[i]
    if (!fence) {
      if (l ~ /^## +MEDIDO/)   { fecha(); sec="M"; tabCol=0; continue }
      if (l ~ /^## +HIPOTESE/) { fecha(); sec="H"; tabCol=0; continue }
      if (l ~ /^## /)          { fecha(); sec="X"; tabCol=0; continue }
    }
    if (sec != "M" && sec != "H") continue
    if (l ~ /^[[:space:]]*```/) {
      if (ustart == 0) { ustart=i; ufirst=l; utext=l } else utext = utext "\n" l
      fence = 1 - fence
      continue
    }
    if (fence) { utext = utext "\n" l; coletagrep(l, i); continue }
    if (l !~ /^\|/) tabCol = 0                                                            # a tabela acabou
    if (l ~ /^[[:space:]]*$/) { fecha(); continue }
    if (l ~ /^#{3,} /) { fecha(); continue }
    if (l ~ /^\|[-: |]+\|[[:space:]]*$/ && index(l,"-") > 0) { fecha(); continue }        # separador
    if (l ~ /^\|/ && i < n && L[i+1] ~ /^\|[-: |]+\|[[:space:]]*$/ && index(L[i+1],"-") > 0) {
      fecha(); tabCol = colunaDeEvidencia(l); continue                                    # cabecalho
    }
    if (l ~ /^[[:space:]]+/ && ustart > 0) { utext = utext "\n" l; coletagrep(l, i); continue }
    fecha(); ustart=i; ufirst=l; utext=l; coletagrep(l, i)
    if (tabCol > 0 && l ~ /^\|/ && celulaCheia(l, tabCol)) uok = 1
  }
  fecha()
}
' "$F")

pega() { printf '%s\n' "$REC" | awk -F"$TAB" -v t="$1" '$1==t'; }

# 3) toda UNIDADE de MEDIDO tem 'medido por:'; toda de HIPOTESE tem 'derruba com:'
while IFS= read -r r; do
  [ -n "$r" ] || continue
  falha "unidade de MEDIDO sem 'medido por: <comando>' — l.$(printf '%s' "$r" | cut -f2): $(printf '%s' "$r" | cut -f3-)"
done <<R3M
$(pega REJ3M)
R3M
while IFS= read -r r; do
  [ -n "$r" ] || continue
  falha "unidade de HIPOTESE sem 'derruba com: <comando>' — l.$(printf '%s' "$r" | cut -f2): $(printf '%s' "$r" | cut -f3-)"
done <<R3H
$(pega REJ3H)
R3H

# 4) todo SHA citado tem de vir de mandato-refs.sh — resolver NAO basta (o a62d04e2 resolvia)
SHAS=$(pega SHA | cut -f3 | sort -u)
if [ -n "$SHAS" ]; then
  if [ -n "$PR" ]; then
    ERRF=$(mktemp 2>/dev/null || echo "${TMPDIR:-/tmp}/mandato-preflight.$$.err")
    LEG=$(bash "$REFS" "$PR" --sha-only 2>"$ERRF"); RC=$?
    DET=$(head -3 "$ERRF" 2>/dev/null | tr '\n' ' ')
    rm -f "$ERRF"
    if [ "$RC" = 1 ] || [ "$RC" = 2 ]; then
      falha "referencias indisponiveis (mandato-refs.sh ec=$RC): ${DET:-<stderr vazio>} — NADA foi verificado: a ferramenta de referencias morreu, o mandato nao chegou a ser julgado"
    else
      [ "$RC" = 3 ] && aviso "approved_head NAO DETERMINAVEL (mandato-refs.sh ec=3) — a proveniencia dos SHAs vale; rode 'bash $REFS $PR' para ver o que a ferramenta viu. ${DET}"
      for s in $SHAS; do
        printf '%s\n' "$LEG" | grep -qi "^${s}" \
          || falha "SHA '$s' nao esta na saida de mandato-refs.sh $PR (resolver nao basta — e pode ser SHA VELHO: o ramo anda)"
      done
    fi
  else
    falha "o mandato cita SHA mas nao recebeu o numero do PR — rode: mandato-preflight.sh $F <PR>"
  fi
fi

# 5) assercao de ausencia tem de ser insensivel a caixa (o 'Maioria de 3' passou por isso)
while IFS= read -r r; do
  [ -n "$r" ] || continue
  falha "invocacao de grep/rg SEM -i (e a unidade nao declara 'caixa-exata:') — l.$(printf '%s' "$r" | cut -f2): $(printf '%s' "$r" | cut -f3-)"
done <<R5
$(pega REJ5)
R5

# 6) todo caminho do repositorio citado existe NO CAMINHO CITADO
CAMS=$(pega PATH | cut -f3,4 | sort -u)
while IFS= read -r r; do
  [ -n "$r" ] || continue
  c=$(printf '%s' "$r" | cut -f1); nv=$(printf '%s' "$r" | cut -f2)
  [ "$nv" = "1" ] && continue                          # '(novo)' na mesma linha: declarado a criar
  # `<revisao>:<caminho>` é citação corrente na casa (`git show origin/main:docs/x.md`). O que o mandato
  # afirma ali é sobre o CAMINHO; a revisão não é um caminho. Confere-se também o que vem depois do
  # ÚLTIMO `:` — e isto NÃO é busca por nome: o caminho continua tendo de existir INTEIRO, com diretório.
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
      [ -n "$d" ] && [ "$d" != "$c" ] && { [ -e "$RAIZ/$d" ] || [ -e "$RAIZ/mobile/flutter_app/$d" ]; } && continue
      falha "caminho citado nao existe: $c (conferido em \$RAIZ/ e em \$RAIZ/mobile/flutter_app/ — nao ha busca por basename)" ;;
  esac
done <<R6
$CAMS
R6

# 7) rotular e afirmar: 'approved_head' + SHA no mandato exige estado LIDO com esse SHA
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
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    ln=$(printf '%s' "$r" | cut -f1); s=$(printf '%s' "$r" | cut -f2)
    if [ "$EST7" != "LIDO" ]; then
      falha "l.$ln: o mandato rotula $s como approved_head, mas a ferramenta diz $EST7"
    else
      case "$LIDOSHA" in
        "$s"*) : ;;
        *) falha "l.$ln: o mandato rotula $s como approved_head, mas a ferramenta LEU $LIDOSHA" ;;
      esac
    fi
  done <<R7
$AHS
R7
fi

echo
if [ "$ERROS" = "0" ]; then echo "PRE-VOO OK — $F"; exit 0; fi
echo "PRE-VOO REJEITOU $ERROS item(ns). O mandato NAO sai."; exit 1
