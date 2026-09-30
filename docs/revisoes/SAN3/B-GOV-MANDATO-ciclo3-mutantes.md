# B-GOV-MANDATO ciclo 3 — matriz de cobertura por MUTAÇÃO (entrega E4)

> **O que este documento é.** A resposta reproduzível para *"os guards do mandato cobrem o quê?"*.
> O ciclo 2 publicou **"30 mutações executadas"** e ninguém conseguia reproduzir o número: não havia
> denominador extraído da fonte, nem lista de quais mutantes **sobreviveram**. "Cobertura" era
> adjetivo. Aqui o número é um comando, e a lista dos sobreviventes está impressa com nome e linha.
>
> **Reproduza com:**
> ```
> bash scripts/mandato-mutantes.sh refs      --controle --jobs 4
> bash scripts/mandato-mutantes.sh preflight --controle --jobs 4
> ```
> A ferramenta nunca escreve em arquivo rastreado: tudo acontece numa cópia em `mktemp -d`, e ela
> confere o `git status` antes e depois ([M-4]).

---

## 0. Identidade das matrizes publicadas — tripla + ambiente (plano §14.8 e §14.19)

A identidade de cada matriz são os **3 blobs que a ferramenta lê para aquele alvo** (artefato + guard do
alvo + `scripts/mandato-mutantes.sh`, §14.8) e, para toda rodada cujo guard alcança a l.522 do pré-voo, um
**4º elemento: o ambiente** (§14.19(1)). Os blobs vêm do cabeçalho do log de cada rodada; o ambiente, da linha
`AMBIENTE` do log (rodada B) ou da §14.19 (rodadas cujo runner exportava `MSYS_NO_PATHCONV=1`).

| matriz | rodada | worktree em | artefato | guard | ferramenta | ambiente | saída verbatim |
|---|---|---|---|---|---|---|---|
| refs | **E4-refs-3** | `396643aa` | `mandato-refs.sh` `474c7521` | `mandato-refs.test.ts` `d455ae1a` | `37549262` | runner com `MSYS_NO_PATHCONV=1` exportada — **neutra por construção**: o refs e a ferramenta não entregam caminho POSIX a binário nativo (§14.19 item 3) | `scratchpad/E4C/refs.txt` |
| pré-voo | **A** (completa) | `c32f77b5` | `mandato-preflight.sh` `faa408c8` | `mandato-preflight.test.ts` `3d875a54` | `37549262` | runner com a variável exportada — **neutra por construção**: o único ponto afetado é a l.522, e nenhum caso do guard `3d875a54` a alcança (§14.19 itens 1-2) | `scratchpad/E4/preflight.txt` |
| pré-voo | **B** (delta, `--only` os 16) | `4794169a` | `faa408c8` | `7a52d37c` (T7) | `37549262` + equivalentes `9c691363` | `MSYS_NO_PATHCONV exportadas=0 \| git version 2.53.0.windows.2 \| node v20.19.5 \| MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64` (linha AMBIENTE do log) | `scratchpad/E4E/preflight-B.txt` |

No head deste documento os 5 blobs são `mandato-refs.sh` `474c7521` · `mandato-preflight.sh` `faa408c8` ·
`mandato-mutantes.sh` `37549262` · `mandato-refs.test.ts` `d455ae1a` · `mandato-preflight.test.ts` `7a52d37c`
(e `…-ciclo3-equivalentes.txt` `9c691363`): a tripla do refs-3 e a da rodada B são as do head; a da rodada A
difere só no guard (`3d875a54`), e o lema do §4.4 é o que une as duas.

---

## 1. Como o número é formado (e o que ele NÃO é)

**Ponto de decisão** = linha executável (não vazia, não comentário) do artefato que contenha ao menos
um construto da lista **declarada no cabeçalho da ferramenta**. **Mutante** = 1 por ponto, com o
operador declarado (o primeiro aplicável vence). **VERMELHO** = o guard reagiu; **VERDE** = o guard
não reagiu, e o ponto está **NÃO-COBERTO**.

Três coisas impedem o número de mentir, e as três já pegaram defeito nesta própria entrega:

1. **A linha de base é MEDIDA, não presumida zero.** O guard do pré-voo tem hoje **1 vermelho
   legítimo** (a contradição `[B8b]` × `[F-EOL/s7-neg]`, registrada em
   `P-GOV-MANDATO-3-B8B-CONTRADICAO`). Comparar com zero marcaria **todo** mutante do pré-voo como
   coberto. Medido: `== LINHA DE BASE medida na copia pristina: fail=1 de tests=298`.
   *(Registro de 28/09. Nas três matrizes publicadas abaixo a linha de base é **`fail=0`**: o `[B8b]` foi
   corrigido (plano §13.1) e a ferramenta passou a **abortar** com linha de base suja (`ec=2`, §13.5) — foi
   essa trava que abortou a primeira delta B, §4.2.)*
2. **`bash -n` em cada mutante.** Mutante que não compila é `ANOMALIA-SINTAXE` e **não conta**. Sem
   isso, um erro de sintaxe viraria "cobertura" — e aconteceu: o operador M1 engolia o `; }` e a
   l.115 do pré-voo saía anômala. O controle recusou em vez de contar.
3. **`diff` de exatamente 1 linha por mutante**, senão `ANOMALIA-DIFF`.

**O que este número NÃO é:** não é cobertura semântica. A ferramenta mede o guard contra **mutantes
sintáticos de uma linha**; não atravessa mutações de várias linhas nem decide equivalência sozinha.
Pontos sem operador aplicável são **listados como EXCLUÍDOS**, com a linha — nunca somados ao
denominador para inflar a fração.

---

## 2. Controles ([M-3]) — a ferramenta sabe achar buraco, e não acusa texto

**Os controles das rodadas PUBLICADAS (refs-3, pré-voo A e B) estão verbatim nas saídas coladas em §3 e §4**
— os três saíram verdes nas três. O bloco abaixo é o da rodada de 28/09 (histórico).

Executados em `scripts/mandato-mutantes.sh refs --controle --jobs 4`, no head `1466c7d9`:

```
== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11)
   IDENTICO (copia e arvore dao a mesma saida; o arnes nao e a variavel)

== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA
   pristino-com-sonda: fail=0 tests=33 (tem de bater a linha de base fail=0)
   mutante da sonda  : operador=M1 fail=0 tests=33
   SONDA NAO-COBERTA — a ferramenta acha buraco

== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO
   l.3 VERDE (fail=0 de 33)
   l.5 VERDE (fail=0 de 33)
   l.7 VERDE (fail=0 de 33)
   l.9 VERDE (fail=0 de 33)
   no-ops verdes: 4 de 4
```

E no fim da mesma rodada, com a árvore limpa:

```
[M-4] nenhum rastreado mudou durante a execucao
copia pristina intacta (md5 igual)
```

### 2.1 ERRATA do §E4.6 do plano — a sonda do plano não serve; a grafia REAL é a da fonte

**A linha que a ferramenta injeta**, transcrita da fonte (`scripts/mandato-mutantes.sh`, blob `37549262`,
l.255-257 — o plano do ciclo 3 §14.10 manda citá-la daqui, não do plano):

```
LSET=$(grep -n '^set -u' "$SD/$ART" | head -1 | cut -d: -f1)
sed -i "${LSET}a [ -z \"\${SONDA_INEXISTENTE:-}\" ] || exit 9" "$SD/$ART"
SLINHA=$((LSET+1))
```

Isto é: logo abaixo do primeiro `set -u` do artefato entra **`[ -z "${SONDA_INEXISTENTE:-}" ] || exit 9`**.

**O plano escreveu duas grafias, e nenhuma serve** (errata do §E4.6 l.715 e do §13.7 D-S-4 l.1303, plano
§14.10). Medido no K1 (2026-09-29), três scripts de três linhas sob `set -u` — a sonda entra logo abaixo
dele nos dois artefatos:

| grafia | variável ausente (o pristino) | variável exportada |
|---|---|---|
| v3, §E4.6 l.715: `[ -n "$SONDA_INEXISTENTE" ] \|\| parado "sonda"` | `ec=1`, *unbound variable* — o pristino morre | `ec=0`: a sonda não dispara |
| §13.7 D-S-4 l.1303: `[ -z "$SONDA_INEXISTENTE" ] \|\| parado "sonda"` | `ec=1`, *unbound variable* — o pristino morre por outra via | `ec=0`: `parado: command not found`, e o script SEGUE |
| **fonte, l.256:** `[ -z "${SONDA_INEXISTENTE:-}" ] \|\| exit 9` | `ec=0` — no-op, pristino intacto | `ec=9` — dispara |

A **polaridade** `-z` do §13 está certa; a **grafia** não: sem `:-`, o `set -u` mata o pristino antes de o
teste ser avaliado; e `parado` não existe no pré-voo (no refs só é definida na l.114, **depois** da sonda).
Por isso a fonte usa `${…:-}` e `exit 9` — e o M1 casa a forma do `||` das duas. O controle (a) do §2 passa
porque é **esta** linha que entra no artefato (cabeçalho da ferramenta, l.50-62, documenta a divergência).

*Registro anterior desta seção (28/09), resumido e preservado:* citava só a grafia v3 (`-n`) e explicava que,
com a variável ausente, o `-n` falso fazia o `||` disparar. Sob `set -u` o pristino morre **antes**, por
*unbound variable*; o efeito que o registro anterior descrevia — pristino abortado, linha de base
destruída — é o mesmo.

---

## 3. `scripts/mandato-refs.sh` — a matriz publicada é a **E4-refs-3**

**Identidade (§0):** worktree `396643aa` · tripla `474c7521` / `d455ae1a` / `37549262` · linha de base
**`fail=0 de tests=39`**, **`skipped 0`** (o `[V18]` deixou de pular em win32 no T5, §14.16) · ambiente: runner com
a variável exportada, neutra por construção (§14.19 item 3). Resumo da ferramenta:

```
N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1 EQUIVALENTES-DECLARADOS=0
```

**NÃO-COBERTOS = 0** → `P-GOV-MANDATO-3-MUTANTES-REFS` fecha (§14.4, §14.17). A única ANOMALIA é a l.164
(`ANOMALIA-SINTAXE`, M1 dentro de `$( … || echo … )` — fronteira 24, §7 item 6), semanticamente inerte.

### 3.1 Rodadas anteriores do refs (história citada, não a matriz — ERRATA E-9(c))

| rodada | worktree em | guard | linha de base | resumo | o que mudou depois |
|---|---|---|---|---|---|
| 28/09, Dev-S | `1466c7d9` | 33 casos | `fail=0 de tests=33` | `N=46 K=41 NAO-COBERTOS=5 EXCLUIDOS=52 ANOMALIAS=1` | os 5 (l.115, 116, 119, 160, 379) ganharam caso: `[V16]`–`[V19]` (Dev-T-3, `9d3de5dd`) |
| E4 refs-1 | `c32f77b5` | `4a653b77` | `fail=0 de tests=37` | `N=46 K=44 NAO-COBERTOS=2 EXCLUIDOS=52 ANOMALIAS=1` | l.116 e l.119 (discrimináveis também em win32, §14.4): `[V18b]`/`[V18c]` (Dev-T-4, `395d07c9`) |
| E4-refs-2 | `395d07c9` | `9e680314` | `fail=0 de tests=39` (1 skip) | `N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1` | o `[V18]` deixou de pular (T5, `190e2300`) e o comentário foi corrigido (T6, `396643aa`) → guard novo, rodada nova |

### 3.2 Saída verbatim da E4-refs-3 (`scratchpad/E4C/refs.txt`, 99 pontos, controles incluídos)

```
== mandato-mutantes: alvo=refs artefato=scripts/mandato-refs.sh guard=tests/mandato-refs.test.ts
== head: 396643aa1e5de1ab144f9b691f011977acc5b4c9  rastreados na copia: 335 (o [B6] exige >= 20)
== LINHA DE BASE medida na copia pristina: fail=0 de tests=39
== pontos de decisao enumerados da fonte: 99

== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11)
   IDENTICO (copia e arvore dao a mesma saida; o arnes nao e a variavel)

== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA
   pristino-com-sonda: fail=0 tests=39 (tem de bater a linha de base fail=0)
   mutante da sonda  : operador=M1 fail=0 tests=39
   SONDA NAO-COBERTA — a ferramenta acha buraco

== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO
   l.3 VERDE (fail=0 de 39)
   l.5 VERDE (fail=0 de 39)
   l.7 VERDE (fail=0 de 39)
   l.9 VERDE (fail=0 de 39)
   no-ops verdes: 4 de 4

== MATRIZ  linha | operador | #fail | veredito
99 | M5 | fail=3 | VERMELHO
103 | M1 | fail=1 | VERMELHO
104 | EXCLUIDO | (sem operador aplicavel) | case "$PR" in *[!0-9]*) echo "USO: PR nao-numerico: '$PR'" >
105 | EXCLUIDO | (sem operador aplicavel) | case "$MODO" in
106 | M8 | fail=36 | VERMELHO
107 | M8 | fail=1 | VERMELHO
109 | M1 | fail=1 | VERMELHO
114 | M5 | fail=11 | VERMELHO
115 | M1 | fail=1 | VERMELHO
116 | M3(-f>-d) | fail=1 | VERMELHO
119 | M3(-f>-d) | fail=1 | VERMELHO
128 | M1 | fail=1 | VERMELHO
138 | EXCLUIDO | (sem operador aplicavel) | case "$RESTO" in
139 | EXCLUIDO | (sem operador aplicavel) | *"$TABC"*) CAMPO="${RESTO%%"$TABC"*}"; RESTO="${RESTO#*"$TAB
140 | M8 | fail=3 | VERMELHO
152 | EXCLUIDO | (sem operador aplicavel) | case "$HEAD_PR" in
153 | M8 | fail=1 | VERMELHO
154 | EXCLUIDO | (sem operador aplicavel) | *[!0-9a-fA-F]*) parado "campo 'headRefOid' nao e hexadecimal
156 | M1 | fail=1 | VERMELHO
157 | M1 | fail=1 | VERMELHO
158 | M1 | fail=1 | VERMELHO
160 | M1 | fail=1 | VERMELHO
161 | M1 | fail=1 | VERMELHO
163 | M1 | fail=1 | VERMELHO
164 | ANOMALIA-SINTAXE | M1 | nao conta
171 | M1 | fail=1 | VERMELHO
172 | EXCLUIDO | (sem operador aplicavel) | case "$CR" in
173 | EXCLUIDO | (sem operador aplicavel) | [0-9]*\ [0-9]*\ [0-9]*) : ;;
174 | M8 | fail=1 | VERMELHO
183 | M1 | fail=22 | VERMELHO
186 | EXCLUIDO | (sem operador aplicavel) | r=$(git rev-parse --verify -q "${1}^{commit}" 2>/dev/null) &
187 | EXCLUIDO | (sem operador aplicavel) | printf '%s' "$1"; return 1
192 | EXCLUIDO | (sem operador aplicavel) | [ "$a" = "$b" ] && return 0
193 | EXCLUIDO | (sem operador aplicavel) | case "$a" in "$b"*) return 0 ;; esac
194 | EXCLUIDO | (sem operador aplicavel) | case "$b" in "$a"*) return 0 ;; esac
195 | EXCLUIDO | (sem operador aplicavel) | return 1
197 | EXCLUIDO | (sem operador aplicavel) | listar() { git ls-tree -r --name-only "$1" agent-orchestrati
201 | M1 | fail=1 | VERMELHO
204 | EXCLUIDO | (sem operador aplicavel) | [ "$HEAD_LOCAL" = 1 ] && FILES_HEAD=$(listar "$HEAD_PR")
214 | EXCLUIDO | (sem operador aplicavel) | return 0
224 | EXCLUIDO | (sem operador aplicavel) | [ "$HEAD_LOCAL" = 1 ] && REGS_HEAD=$(coleta "$HEAD_PR" "@hea
227 | M3(-n>-z) | fail=12 | VERMELHO
228 | M10 | fail=12 | VERMELHO
230 | EXCLUIDO | (sem operador aplicavel) | REGS=$(printf '%s\n%s\n' "$REGS_HEAD" "$REGS_BASE" | sed '/^
236 | M4(sim>nao) | fail=22 | VERMELHO
240 | M10 | fail=22 | VERMELHO
241 | M10 | fail=16 | VERMELHO
242 | M10 | fail=17 | VERMELHO
243 | M10 | fail=14 | VERMELHO
244 | M10 | fail=1 | VERMELHO
249 | M10 | fail=21 | VERMELHO
251 | M10 | fail=22 | VERMELHO
254 | M10 | fail=1 | VERMELHO
261 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r r; do
262 | M3(-n>-z) | fail=22 | VERMELHO
264 | EXCLUIDO | (sem operador aplicavel) | case "$t" in
266 | EXCLUIDO | (sem operador aplicavel) | " ;;
268 | EXCLUIDO | (sem operador aplicavel) | " ;;
270 | EXCLUIDO | (sem operador aplicavel) | " ;;
274 | M3(-n>-z) | fail=20 | VERMELHO
275 | EXCLUIDO | (sem operador aplicavel) | if [ "$t" = OBJL ]; then
278 | EXCLUIDO | (sem operador aplicavel) | else
281 | EXCLUIDO | (sem operador aplicavel) | fi ;;
289 | M3(-eq>-ne) | fail=20 | VERMELHO
290 | EXCLUIDO | (sem operador aplicavel) | LINHA1=$(printf '%s\n' "$CASAM" | sed '/^[[:space:]]*$/d' |
292 | EXCLUIDO | (sem operador aplicavel) | A_APHS=$(printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | a
293 | EXCLUIDO | (sem operador aplicavel) | A_OBJS=$(printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | a
295 | M3(-eq>-ne) | fail=22 | VERMELHO
299 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r r; do
300 | M3(-n>-z) | fail=12 | VERMELHO
301 | EXCLUIDO | (sem operador aplicavel) | mesmo "$SHAF" "$(expande "$(printf '%s' "$r" | cut -f3)")" &
305 | EXCLUIDO | (sem operador aplicavel) | if [ "$OK" = 1 ]; then
307 | EXCLUIDO | (sem operador aplicavel) | else
311 | M3(-gt>-le) | fail=1 | VERMELHO
313 | EXCLUIDO | (sem operador aplicavel) | else
317 | M3(-gt>-le) | fail=1 | VERMELHO
319 | EXCLUIDO | (sem operador aplicavel) | else
321 | M3(-gt>-le) | fail=2 | VERMELHO
324 | EXCLUIDO | (sem operador aplicavel) | else
330 | EXCLUIDO | (sem operador aplicavel) | if [ "$MODO" = "--sha-only" ]; then
332 | M3(-n>-z) | fail=1 | VERMELHO
333 | M3(-n>-z) | fail=1 | VERMELHO
334 | M3(-n>-z) | fail=1 | VERMELHO
335 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | while IFS=
336 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | while IFS=
337 | EXCLUIDO | (sem operador aplicavel) | } | awk 'NF && !seen[$0]++'
338 | EXCLUIDO | (sem operador aplicavel) | exit "$EC"
351 | EXCLUIDO | (sem operador aplicavel) | case "$ESTADO_AH" in
355 | EXCLUIDO | (sem operador aplicavel) | ;;
359 | EXCLUIDO | (sem operador aplicavel) | ;;
362 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | while IFS=
365 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$SEMOBJ" | sed '/^[[:space:]]*$/d' | while IF
368 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$MENCOES" | sed '/^[[:space:]]*$/d' | while I
371 | EXCLUIDO | (sem operador aplicavel) | printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | while IFS=
376 | EXCLUIDO | (sem operador aplicavel) | ;;
379 | M3(-n>-z) | fail=1 | VERMELHO
383 | EXCLUIDO | (sem operador aplicavel) | [ "$CR_TOT" = "0" ]   && echo "AVISO: ZERO check-run no head
384 | M3(ne>eq) | fail=1 | VERMELHO
385 | EXCLUIDO | (sem operador aplicavel) | exit "$EC"

N=46 K=46 NAO-COBERTOS=0 EXCLUIDOS=52 ANOMALIAS=1 EQUIVALENTES-DECLARADOS=0
[M-4] nenhum rastreado mudou durante a execucao
copia pristina intacta (md5 igual)
```

---

## 4. `scripts/mandato-preflight.sh` — matriz COMPOSTA de duas rodadas (A + delta B), unidas por um lema

**Resumo recomposto, DERIVADO por script (§4.5) — não digitado:**

```
N=103 K=100 NAO-COBERTOS=3 (equivalentes declarados e conferidos por id: 3) EXCLUIDOS=57 ANOMALIAS=2
[M-1] = NAO-COBERTOS - equivalentes conferidos = 0
```

**[M-1] = 0** (critério do plano, l.720) → `P-GOV-MANDATO-3-MUTANTES-PREFLIGHT` fecha. À parte de K e de
NÃO-COBERTOS: **1 TIMEOUT** (l.161, §14.15, fronteira 25) e **1 ANOMALIA-DIFF** da ferramenta (l.340, §14.18(2),
fronteira 26).

### 4.1 Rodada A — completa, a medição que ACHOU os 16 (`scratchpad/E4/preflight.txt`, verbatim)

Tripla A = `faa408c8` / `3d875a54` / `37549262`; worktree `c32f77b5`; 162 pontos; linha de base `fail=0 de
tests=299`; controles verdes; `[M-4]` ok. Correu com `MSYS_NO_PATHCONV=1` exportada pelo runner — **válida por
construção** (§14.19 itens 1-2: a variável só desliga a l.522 do pré-voo, e nenhum caso do guard `3d875a54` cita
`rev:caminho/…`; a única citação rev dele é `HEAD:package.json`, sem `/`, filtrada pela I13). O mutante da
l.161 **não terminou** e a vaga foi morta pelo orquestrador em 2026-09-29 20:36:07 (`scratchpad/E4/log.txt`,
§14.15) — a linha bruta dele abaixo é `ANOMALIA-DENOMINADOR`.

```
== mandato-mutantes: alvo=preflight artefato=scripts/mandato-preflight.sh guard=tests/mandato-preflight.test.ts
== head: c32f77b5b36f49b3cf9951a481caaab0efa35a4f  rastreados na copia: 334 (o [B6] exige >= 20)
== LINHA DE BASE medida na copia pristina: fail=0 de tests=299
== pontos de decisao enumerados da fonte: 162

== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11)
   IDENTICO (copia e arvore dao a mesma saida; o arnes nao e a variavel)

== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA
   pristino-com-sonda: fail=0 tests=299 (tem de bater a linha de base fail=0)
   mutante da sonda  : operador=M1 fail=0 tests=299
   SONDA NAO-COBERTA — a ferramenta acha buraco

== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO
   l.3 VERDE (fail=0 de 299)
   l.5 VERDE (fail=0 de 299)
   l.7 VERDE (fail=0 de 299)
   l.9 VERDE (fail=0 de 299)
   no-ops verdes: 4 de 4

== MATRIZ  linha | operador | #fail | veredito
120 | M1 | fail=1 | VERMELHO
121 | EXCLUIDO | (sem operador aplicavel) | RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
129 | EXCLUIDO | (sem operador aplicavel) | TMPD=$(mktemp -d 2>/dev/null || printf '%s' "${TMPDIR:-/tmp}
130 | EXCLUIDO | (sem operador aplicavel) | mkdir -p "$TMPD" 2>/dev/null || true
131 | EXCLUIDO | (sem operador aplicavel) | trap 'rm -rf "$TMPD" 2>/dev/null || true' EXIT
150 | EXCLUIDO | (sem operador aplicavel) | function semIndent(s) { sub(/^[[:space:]]+/, "", s); return
151 | EXCLUIDO | (sem operador aplicavel) | function trim(s) { sub(/^[[:space:]]+/,"",s); sub(/[[:space:
152 | M4(sim>nao) | fail=2 | VERMELHO
153 | EXCLUIDO | (sem operador aplicavel) | function marcaLen(l,   s,c,k) { s=semIndent(l); c=substr(s,1
154 | EXCLUIDO | (sem operador aplicavel) | function marcaResto(l,   s,k) { s=semIndent(l); k=marcaLen(l
161 | ANOMALIA-DENOMINADOR | M10 | tests=0 nao conta
162 | M10 | fail=33 | VERMELHO
165 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
166 | M7(salto) | fail=192 | VERMELHO
168 | M4(sim>nao) | fail=128 | VERMELHO
169 | M4(sim>nao) | fail=109 | VERMELHO
170 | M4(sim>nao) | fail=108 | VERMELHO
172 | M4(sim>nao) | fail=7 | VERMELHO
173 | M4(nao>sim) | fail=8 | VERMELHO
174 | EXCLUIDO | (sem operador aplicavel) | else cont[sec]++
176 | M7(salto) | fail=192 | VERMELHO
179 | M10 | fail=192 | VERMELHO
182 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
184 | M7(salto) | fail=192 | VERMELHO
187 | M4(sim>nao) | fail=0 | VERDE  <- NAO-COBERTO: if (l ~ /^## +MEDIDO/)   print "SWALLOW", "MEDIDO", i          # ENGOL
188 | M4(sim>nao) | fail=0 | VERDE  <- NAO-COBERTO: if (l ~ /^## +HIPOTESE/) print "SWALLOW", "HIPOTESE", i
189 | M4(sim>nao) | fail=0 | VERDE  <- NAO-COBERTO: if (l ~ /[^[:space:]]/) {
190 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
193 | M10 | fail=6 | VERMELHO
194 | M10 | fail=129 | VERMELHO
195 | M10 | fail=129 | VERMELHO
203 | M3(-z>-n) | fail=132 | VERMELHO
204 | EXCLUIDO | (sem operador aplicavel) | eng=$(peg SWALLOW | awk -F"$TAB" -v s="$s" '$2==s { print $3
205 | M3(-n>-z) | fail=1 | VERMELHO
207 | EXCLUIDO | (sem operador aplicavel) | else
210 | EXCLUIDO | (sem operador aplicavel) | else
211 | EXCLUIDO | (sem operador aplicavel) | q=$(peg SEC | awk -F"$TAB" -v s="$s" '$2==s { print $3; exit
212 | EXCLUIDO | (sem operador aplicavel) | [ "${q:-0}" = "0" ] && aviso "secao $s sem unidades"
218 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln ch k; do
219 | M3(-n>-z) | fail=6 | VERMELHO
225 | M3(-n>-z) | fail=131 | VERMELHO
235 | EXCLUIDO | (sem operador aplicavel) | significativas() { sed 's/^[[:space:]]*//; s/[[:space:]]*$//
238 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ini fim; do
239 | M3(-n>-z) | fail=9 | VERMELHO
240 | M3(-gt>-le) | fail=9 | VERMELHO
243 | EXCLUIDO | (sem operador aplicavel) | case "$prim" in
244 | EXCLUIDO | (sem operador aplicavel) | "# refs do PR #"*) ;;
245 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: *) continue ;;                                               # sem a 1
248 | M3(-n>-z) | fail=9 | VERMELHO
249 | M3(-f>-d) | fail=0 | VERDE  <- NAO-COBERTO: if [ ! -f "$TMPD/refs.$N.rc" ]; then
253 | EXCLUIDO | (sem operador aplicavel) | if [ "$RCN" = "1" ] || [ "$RCN" = "2" ]; then
255 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: continue
257 | EXCLUIDO | (sem operador aplicavel) | if [ "$(significativas < "$TMPD/bloco.raw")" = "$(significat
261 | M3(-le>-gt) | fail=5 | VERMELHO
263 | EXCLUIDO | (sem operador aplicavel) | $(tr -c '0-9A-Fa-f' '\n' < "$TMPD/bloco.raw" | awk 'length($
264 | EXCLUIDO | (sem operador aplicavel) | else
268 | EXCLUIDO | (sem operador aplicavel) | [ "$NCOLAGENS" = "0" ] && aviso "sem colagem da ferramenta (
276 | EXCLUIDO | (sem operador aplicavel) | function isento(num) { return (index(EX, ":" num ":") > 0) }
277 | EXCLUIDO | (sem operador aplicavel) | function limpaP(s) { sub(/^[:-]+/,"",s); sub(/[.:-]+$/,"",s)
278 | EXCLUIDO | (sem operador aplicavel) | function limpaS(s) { sub(/^[.:-]+/,"",s); sub(/[.:-]+$/,"",s
280 | M10 | fail=196 | VERMELHO
281 | M10 | fail=196 | VERMELHO
282 | EXCLUIDO | (sem operador aplicavel) | return 1
285 | M10 | fail=196 | VERMELHO
286 | M4(sim>nao) | fail=42 | VERMELHO
290 | EXCLUIDO | (sem operador aplicavel) | while (match(s, /(^|[^A-Za-z0-9_.\/-])[A-Za-z]*(grep|rg)([[:
293 | EXCLUIDO | (sem operador aplicavel) | return c
298 | M10 | fail=196 | VERMELHO
305 | M7(salto) | fail=196 | VERMELHO
306 | M7(salto) | fail=196 | VERMELHO
307 | M7(salto) | fail=196 | VERMELHO
313 | M4(sim>nao) | fail=8 | VERMELHO
314 | EXCLUIDO | (sem operador aplicavel) | return 0
318 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (idx < 2 || idx > n) return 0
319 | M4(sim>nao) | fail=14 | VERMELHO
321 | EXCLUIDO | (sem operador aplicavel) | function tokenUnidade() { return (secU=="H") ? "derruba com:
322 | EXCLUIDO | (sem operador aplicavel) | function satisfeita() { return (uok || index(utext, tokenUni
325 | M10 | fail=63 | VERMELHO
326 | M10 | fail=196 | VERMELHO
327 | M10 | fail=1 | VERMELHO
328 | EXCLUIDO | (sem operador aplicavel) | else           print "REJ3M", ustart, ufirst, uapos
330 | M10 | fail=196 | VERMELHO
336 | M7(next) | fail=0 | VERDE  <- NAO-COBERTO: NR==FNR { FE[$1]=$2; SC[$1]=$3; HD[$1]=$4; next }
340 | ANOMALIA-DIFF | M7(next) | linhas-trocadas=0 nao conta
343 | EXCLUIDO | (sem operador aplicavel) | while (match(s, /[A-Za-z0-9_.\/:-]+/)) {
349 | M7(salto) | fail=196 | VERMELHO
356 | M7(salto) | fail=196 | VERMELHO
363 | M10 | fail=196 | VERMELHO
364 | M7(salto) | fail=196 | VERMELHO
365 | M7(salto) | fail=196 | VERMELHO
368 | M7(salto) | fail=196 | VERMELHO
370 | M7(salto) | fail=196 | VERMELHO
371 | M7(salto) | fail=196 | VERMELHO
372 | M4(sim>nao) | fail=24 | VERMELHO
373 | M4(sim>nao) | fail=23 | VERMELHO
374 | M7(salto) | fail=196 | VERMELHO
375 | M7(salto) | fail=196 | VERMELHO
376 | M4(sim>nao) | fail=23 | VERMELHO
377 | M4(nao>sim) | fail=2 | VERMELHO
388 | M10 | fail=95 | VERMELHO
389 | M7(salto) | fail=196 | VERMELHO
390 | M7(salto) | fail=196 | VERMELHO
392 | M10 | fail=21 | VERMELHO
393 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (ustart == 0) abre(i, l, ultimaSat)
394 | EXCLUIDO | (sem operador aplicavel) | else utext = utext "\n" l
397 | M7(salto) | fail=196 | VERMELHO
399 | M4(nao>sim) | fail=135 | VERMELHO
400 | M4(sim>nao) | fail=78 | VERMELHO
401 | M4(nao>sim) | fail=9 | VERMELHO
402 | M4(sim>nao) | fail=75 | VERMELHO
403 | M4(sim>nao) | fail=9 | VERMELHO
405 | M7(salto) | fail=196 | VERMELHO
407 | M4(sim>nao) | fail=9 | VERMELHO
409 | M7(salto) | fail=196 | VERMELHO
411 | M4(sim>nao) | fail=10 | VERMELHO
412 | M10 | fail=196 | VERMELHO
413 | M7(salto) | fail=196 | VERMELHO
415 | M7(salto) | fail=196 | VERMELHO
423 | M7(salto) | fail=196 | VERMELHO
429 | EXCLUIDO | (sem operador aplicavel) | while (1) {
431 | M7(salto) | fail=196 | VERMELHO
443 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt apos; do
444 | M3(-n>-z) | fail=61 | VERMELHO
445 | EXCLUIDO | (sem operador aplicavel) | if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; f
449 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt apos; do
450 | M3(-n>-z) | fail=1 | VERMELHO
451 | EXCLUIDO | (sem operador aplicavel) | if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; f
456 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt; do
457 | M3(-n>-z) | fail=1 | VERMELHO
463 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln len; do
464 | M3(-n>-z) | fail=1 | VERMELHO
469 | M3(-n>-z) | fail=125 | VERMELHO
470 | M3(-n>-z) | fail=28 | VERMELHO
473 | EXCLUIDO | (sem operador aplicavel) | if [ "$RC" = 1 ] || [ "$RC" = 2 ]; then
475 | EXCLUIDO | (sem operador aplicavel) | else
476 | EXCLUIDO | (sem operador aplicavel) | [ "$RC" = 3 ] && aviso "approved_head NAO DETERMINAVEL (mand
481 | M9 | fail=23 | VERMELHO
482 | M1 | fail=21 | VERMELHO
485 | EXCLUIDO | (sem operador aplicavel) | else
492 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln seg; do
493 | M3(-n>-z) | fail=28 | VERMELHO
497 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln c; do
498 | M3(-n>-z) | fail=1 | VERMELHO
504 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r ln c nv; do
505 | M3(-n>-z) | fail=23 | VERMELHO
506 | M7(salto) | fail=2 | VERMELHO
510 | EXCLUIDO | (sem operador aplicavel) | case "$c" in *:*) d="${c##*:}" ;; esac
511 | EXCLUIDO | (sem operador aplicavel) | case "$c" in
513 | M3(-d>-f) | fail=1 | VERMELHO
514 | M3(-d>-f) | fail=0 | VERDE  <- NAO-COBERTO: [ -d "$RAIZ/mobile/flutter_app/$c" ] && continue
515 | M3(-n>-z) | fail=0 | VERDE  <- NAO-COBERTO: [ -n "$d" ] && [ "$d" != "$c" ] && { [ -d "$RAIZ/$d" ] || [ -d "$RAIZ/
516 | EXCLUIDO | (sem operador aplicavel) | falha "diretorio citado nao existe: $c (conferido em \$RAIZ/
518 | M7(salto) | fail=20 | VERMELHO
519 | M7(salto) | fail=1 | VERMELHO
520 | M3(-n>-z) | fail=0 | VERDE  <- NAO-COBERTO: if [ -n "$d" ] && [ "$d" != "$c" ]; then
522 | EXCLUIDO | (sem operador aplicavel) | if git -C "$RAIZ" rev-parse --verify --quiet "$rev" >/dev/nu
523 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: { [ -e "$RAIZ/$d" ] || [ -e "$RAIZ/mobile/flutter_app/$d" ]; } && cont
526 | EXCLUIDO | (sem operador aplicavel) | falha "caminho citado nao existe: $c (conferido em \$RAIZ/ e
534 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r ln; do
535 | M3(-n>-z) | fail=46 | VERMELHO
540 | EXCLUIDO | (sem operador aplicavel) | if [ "$ERROS" = "0" ]; then echo "PRE-VOO OK — $F"; exit 0
541 | M5 | fail=210 | VERMELHO

N=103 K=87 NAO-COBERTOS=16 EXCLUIDOS=57 ANOMALIAS=2 EQUIVALENTES-DECLARADOS=0
-- nao-cobertos (linha e trecho):
   165 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
   182 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
   187 | M4(sim>nao) | fail=0 | VERDE  <- NAO-COBERTO: if (l ~ /^## +MEDIDO/)   print "SWALLOW", "MEDIDO", i          # ENGOL
   188 | M4(sim>nao) | fail=0 | VERDE  <- NAO-COBERTO: if (l ~ /^## +HIPOTESE/) print "SWALLOW", "HIPOTESE", i
   189 | M4(sim>nao) | fail=0 | VERDE  <- NAO-COBERTO: if (l ~ /[^[:space:]]/) {
   190 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (sec=="-" || sec=="X") print "FORA", i, l; else cont[sec]++
   245 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: *) continue ;;                                               # sem a 1
   249 | M3(-f>-d) | fail=0 | VERDE  <- NAO-COBERTO: if [ ! -f "$TMPD/refs.$N.rc" ]; then
   255 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: continue
   318 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (idx < 2 || idx > n) return 0
   336 | M7(next) | fail=0 | VERDE  <- NAO-COBERTO: NR==FNR { FE[$1]=$2; SC[$1]=$3; HD[$1]=$4; next }
   393 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (ustart == 0) abre(i, l, ultimaSat)
   514 | M3(-d>-f) | fail=0 | VERDE  <- NAO-COBERTO: [ -d "$RAIZ/mobile/flutter_app/$c" ] && continue
   515 | M3(-n>-z) | fail=0 | VERDE  <- NAO-COBERTO: [ -n "$d" ] && [ "$d" != "$c" ] && { [ -d "$RAIZ/$d" ] || [ -d "$RAIZ/
   520 | M3(-n>-z) | fail=0 | VERDE  <- NAO-COBERTO: if [ -n "$d" ] && [ "$d" != "$c" ]; then
   523 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: { [ -e "$RAIZ/$d" ] || [ -e "$RAIZ/mobile/flutter_app/$d" ]; } && cont
[M-4] nenhum rastreado mudou durante a execucao
copia pristina intacta (md5 igual)
```

### 4.2 A primeira delta B — ABORTADA pela trava do §13.5, com o ambiente errado (`scratchpad/E4D/preflight-B.txt`)

Worktree `371961ac`, tripla `faa408c8` / `7a52d37c` / `37549262`, `ec=2`. **Não é defeito do artefato nem do
guard no ambiente de uso: é a trava do §13.5 pegando ambiente errado.** O runner exportava `MSYS_NO_PATHCONV=1`;
com ela, o pré-voo entrega `RAIZ` em POSIX ao `git.exe` (l.121 → l.522), a rev nunca resolve, e os dois casos
novos que citam `HEAD:<caminho/com/barra>` (`[F-6i/520]`, `[F-6i/523]`, do T7) ficam vermelhos **no pristino**.
A ferramenta recusou medir — `PARADO: linha de base suja` — que é o comportamento desenhado (fail-closed).

```
== mandato-mutantes: alvo=preflight artefato=scripts/mandato-preflight.sh guard=tests/mandato-preflight.test.ts
== head: 371961ac716d1a34c2b07306906f3052b69ef3d6  rastreados na copia: 336 (o [B6] exige >= 20)
== LINHA DE BASE medida na copia pristina: fail=2 de tests=312
PARADO: linha de base suja — corrija o guard antes de medir (copia pristina: fail=2 de tests=312; nenhum mutante foi medido)
   not ok 311 - [F-6i/520] `HEAD:<caminho/com/barra>` existente: OK, e a MESMA citacao com rev que nao resolve cai — ⇄ M3 na l.520 do artefato
   not ok 312 - [F-6i/523] sob rev que resolve, a EXISTENCIA decide — na raiz e sob mobile/flutter_app/: OK; inexistente cai — ⇄ M7 na l.523 do artefato
```

Causa isolada pelo controle do orquestrador (`scratchpad/DIAGF6I/`, mesmo guard, só os dois casos `[F-6i]`):
`dgc-sem-var.tap` → `# tests 312 · # pass 2 · # fail 0 · # skipped 310`; `dgc-com-var.tap` → `# tests 312 · # pass 0 · # fail 2 · # skipped 310`. A fragilidade do artefato sob
a variável é a **fronteira 27** (§7 item 9), `ajuste` fail-closed, dono `B-GOV-MANDATO-2`.

### 4.3 Rodada delta B — refeita no ambiente declarado (`scratchpad/E4E/preflight-B.txt`, verbatim)

Tripla B = `faa408c8` / `7a52d37c` / `37549262`, + `--equivalentes docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt`
(`9c691363`); worktree `4794169a`; ambiente `MSYS_NO_PATHCONV exportadas=0 | git version 2.53.0.windows.2 |
node v20.19.5 | MINGW64_NT-10.0-22631 3.6.6-1cdd4371.x86_64 x86_64`; `--only` os 16 NÃO-COBERTOS de A (161 fora:
TIMEOUT). 13 VERMELHOS (os casos do T7) e 3 VERDES = os 3 equivalentes declarados; `ec=0`.

```
== mandato-mutantes: alvo=preflight artefato=scripts/mandato-preflight.sh guard=tests/mandato-preflight.test.ts
== head: 4794169a34a18fc539c7f76fc3c2dafbeb808e63  rastreados na copia: 336 (o [B6] exige >= 20)
== LINHA DE BASE medida na copia pristina: fail=0 de tests=312
== --only: 16 linhas pedidas, 16 sao pontos de decisao
== pontos de decisao enumerados da fonte: 16

== CONTROLE (c) DIFERENCIAL arnes x arvore real (A11)
   IDENTICO (copia e arvore dao a mesma saida; o arnes nao e a variavel)

== CONTROLE (a) SONDA sem guard: tem de sair NAO-COBERTA
   pristino-com-sonda: fail=0 tests=312 (tem de bater a linha de base fail=0)
   mutante da sonda  : operador=M1 fail=0 tests=312
   SONDA NAO-COBERTA — a ferramenta acha buraco

== CONTROLE (b) 4 NO-OPS (comentarios reescritos): tem de sair VERDE — nao se acusa TEXTO
   l.3 VERDE (fail=0 de 312)
   l.5 VERDE (fail=0 de 312)
   l.7 VERDE (fail=0 de 312)
   l.9 VERDE (fail=0 de 312)
   no-ops verdes: 4 de 4

== MATRIZ  linha | operador | #fail | veredito
165 | M10 | fail=1 | VERMELHO
182 | M10 | fail=1 | VERMELHO
187 | M4(sim>nao) | fail=1 | VERMELHO
188 | M4(sim>nao) | fail=1 | VERMELHO
189 | M4(sim>nao) | fail=2 | VERMELHO
190 | M10 | fail=2 | VERMELHO
245 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: *) continue ;;                                               # sem a 1
249 | M3(-f>-d) | fail=1 | VERMELHO
255 | M7(salto) | fail=1 | VERMELHO
318 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (idx < 2 || idx > n) return 0
336 | M7(next) | fail=0 | VERDE  <- NAO-COBERTO: NR==FNR { FE[$1]=$2; SC[$1]=$3; HD[$1]=$4; next }
393 | M10 | fail=1 | VERMELHO
514 | M3(-d>-f) | fail=1 | VERMELHO
515 | M3(-n>-z) | fail=1 | VERMELHO
520 | M3(-n>-z) | fail=2 | VERMELHO
523 | M7(salto) | fail=2 | VERMELHO

N=16 K=13 NAO-COBERTOS=3 EXCLUIDOS=0 ANOMALIAS=0 EQUIVALENTES-DECLARADOS=3
-- nao-cobertos (linha e trecho):
   245 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: *) continue ;;                                               # sem a 1
   318 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (idx < 2 || idx > n) return 0
   336 | M7(next) | fail=0 | VERDE  <- NAO-COBERTO: NR==FNR { FE[$1]=$2; SC[$1]=$3; HD[$1]=$4; next }
[M-4] nenhum rastreado mudou durante a execucao
copia pristina intacta (md5 igual)
```

### 4.4 O lema que une A e B (plano §14.18(3)), com a premissa (g) do §14.19

**Lema:** para todo ponto `p` fora de `L` (os 16 NÃO-COBERTOS de A), `veredito_B(p) = veredito_A(p)`. A
enumeração depende só do artefato (blob igual → os mesmos 162); EXCLUÍDO/ANOMALIA dependem só de artefato e
ferramenta (iguais); um VERMELHO de A é produzido por casos que em B existem inalterados e recebem o mesmo
insumo → VERMELHO em B.

| premissa | enunciado | medida (e por quem) |
|---|---|---|
| (a) | blobs do artefato e da ferramenta iguais em A e B | `faa408c8` e `37549262` nos cabeçalhos dos logs de A e B — Dev-S-2 (K2b), lido dos logs |
| (b) | o guard de B só ACRESCENTA a A | `git diff --numstat 3d875a54 7a52d37c` = **`245 0`** — planejador (§14.19 item 4) e Dev-S-2 (K2b, re-medido) |
| (c) | nenhuma declaração de topo duplicada | `grep -oE '^(function\|const\|let\|var) …' \| sort \| uniq -d` em `7a52d37c` = **0** — planejador e Dev-S-2 |
| (d) | toda linha `+` de topo é `test(`, `function` nova ou `const` nova | linhas `+` de topo: **13** `test(`, **3** `function` (`cercaForaDasSecoes`, `foraListadas`, `tipoNaRaiz` — nenhuma existia em `3d875a54`), fechamentos e comentários; **0** `const`/`let`/`var` — Dev-S-2 (K2b) |
| (e) | base `fail=0` com o guard inteiro em B | `LINHA DE BASE medida na copia pristina: fail=0 de tests=312` (§4.3) |
| (f) | a amostra de ≥ 20% dos VERMELHOS de A roda em B | da C2‴ (ERRATA E-10 v2), sem a variável exportada |
| (g) | B corre no ambiente declarado, e A é neutra a ele | linha AMBIENTE do log de B (`MSYS_NO_PATHCONV exportadas=0`); neutralidade de A por construção (§14.19 itens 1-2) |

### 4.5 A matriz composta — 162 linhas, cada uma com a rodada (tripla) que a produziu

Derivada por `devs2k2b/deriva.py` (scratchpad do Dev-S-2), que lê as saídas verbatim de A e B e o arquivo de
equivalentes do repositório (blob `9c691363`); ele **prova** que os pontos de B são exatamente os NÃO-COBERTOS de A
e que **os ids do arquivo de equivalentes são exatamente os NÃO-COBERTOS de B** — a ferramenta não confere isso
(§7, fato medido no K2b). Saída da derivação:

```
A: linhas 162 | NAO-COBERTOS de A 16 [165, 182, 187, 188, 189, 190, 245, 249, 255, 318, 336, 393, 514, 515, 520, 523]
B: linhas 16 | pontos de B [165, 182, 187, 188, 189, 190, 245, 249, 255, 318, 336, 393, 514, 515, 520, 523]
pontos de B == NAO-COBERTOS de A (o L do lema): True
ids do arquivo de equivalentes: [245, 318, 336]
NAO-COBERTOS da rodada B       : [245, 318, 336]
ids == NAO-COBERTOS de B       : True
composta: linhas 162 | de A 146 | de B 16
categorias: {'ANOMALIA-DENOMINADOR': 1, 'ANOMALIA-DIFF': 1, 'EXCLUIDO': 57, 'VERDE': 3, 'VERMELHO': 100}
RESUMO RECOMPOSTO: N=103 K=100 NAO-COBERTOS=3 (equivalentes declarados e conferidos por id: 3) EXCLUIDOS=57 ANOMALIAS=2
[M-1] = NAO-COBERTOS - equivalentes conferidos = 0
ferramenta, rodada A: N=103 K=87 NAO-COBERTOS=16 EXCLUIDOS=57 ANOMALIAS=2 EQUIVALENTES-DECLARADOS=0
ferramenta, rodada B: N=16 K=13 NAO-COBERTOS=3 EXCLUIDOS=0 ANOMALIAS=0 EQUIVALENTES-DECLARADOS=3
matriz composta escrita: matriz-composta.txt
```

Matriz (`A |` = tripla A, `B |` = tripla B; a linha bruta da ferramenta segue verbatim, e a reclassificação vem
ao lado):

```
A | 120 | M1 | fail=1 | VERMELHO
A | 121 | EXCLUIDO | (sem operador aplicavel) | RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
A | 129 | EXCLUIDO | (sem operador aplicavel) | TMPD=$(mktemp -d 2>/dev/null || printf '%s' "${TMPDIR:-/tmp}
A | 130 | EXCLUIDO | (sem operador aplicavel) | mkdir -p "$TMPD" 2>/dev/null || true
A | 131 | EXCLUIDO | (sem operador aplicavel) | trap 'rm -rf "$TMPD" 2>/dev/null || true' EXIT
A | 150 | EXCLUIDO | (sem operador aplicavel) | function semIndent(s) { sub(/^[[:space:]]+/, "", s); return
A | 151 | EXCLUIDO | (sem operador aplicavel) | function trim(s) { sub(/^[[:space:]]+/,"",s); sub(/[[:space:
A | 152 | M4(sim>nao) | fail=2 | VERMELHO
A | 153 | EXCLUIDO | (sem operador aplicavel) | function marcaLen(l,   s,c,k) { s=semIndent(l); c=substr(s,1
A | 154 | EXCLUIDO | (sem operador aplicavel) | function marcaResto(l,   s,k) { s=semIndent(l); k=marcaLen(l
A | 161 | ANOMALIA-DENOMINADOR | M10 | tests=0 nao conta   <- reclassificado TIMEOUT (plano §14.15): o mutante nao termina — laco em marcaLen("") sem a guarda mc==""; vaga morta pelo orquestrador em 29/09 20:36:07; fora de K, de NAO-COBERTOS e do [M-1]; fronteira 25
A | 162 | M10 | fail=33 | VERMELHO
B | 165 | M10 | fail=1 | VERMELHO
A | 166 | M7(salto) | fail=192 | VERMELHO
A | 168 | M4(sim>nao) | fail=128 | VERMELHO
A | 169 | M4(sim>nao) | fail=109 | VERMELHO
A | 170 | M4(sim>nao) | fail=108 | VERMELHO
A | 172 | M4(sim>nao) | fail=7 | VERMELHO
A | 173 | M4(nao>sim) | fail=8 | VERMELHO
A | 174 | EXCLUIDO | (sem operador aplicavel) | else cont[sec]++
A | 176 | M7(salto) | fail=192 | VERMELHO
A | 179 | M10 | fail=192 | VERMELHO
B | 182 | M10 | fail=1 | VERMELHO
A | 184 | M7(salto) | fail=192 | VERMELHO
B | 187 | M4(sim>nao) | fail=1 | VERMELHO
B | 188 | M4(sim>nao) | fail=1 | VERMELHO
B | 189 | M4(sim>nao) | fail=2 | VERMELHO
B | 190 | M10 | fail=2 | VERMELHO
A | 193 | M10 | fail=6 | VERMELHO
A | 194 | M10 | fail=129 | VERMELHO
A | 195 | M10 | fail=129 | VERMELHO
A | 203 | M3(-z>-n) | fail=132 | VERMELHO
A | 204 | EXCLUIDO | (sem operador aplicavel) | eng=$(peg SWALLOW | awk -F"$TAB" -v s="$s" '$2==s { print $3
A | 205 | M3(-n>-z) | fail=1 | VERMELHO
A | 207 | EXCLUIDO | (sem operador aplicavel) | else
A | 210 | EXCLUIDO | (sem operador aplicavel) | else
A | 211 | EXCLUIDO | (sem operador aplicavel) | q=$(peg SEC | awk -F"$TAB" -v s="$s" '$2==s { print $3; exit
A | 212 | EXCLUIDO | (sem operador aplicavel) | [ "${q:-0}" = "0" ] && aviso "secao $s sem unidades"
A | 218 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln ch k; do
A | 219 | M3(-n>-z) | fail=6 | VERMELHO
A | 225 | M3(-n>-z) | fail=131 | VERMELHO
A | 235 | EXCLUIDO | (sem operador aplicavel) | significativas() { sed 's/^[[:space:]]*//; s/[[:space:]]*$//
A | 238 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ini fim; do
A | 239 | M3(-n>-z) | fail=9 | VERMELHO
A | 240 | M3(-gt>-le) | fail=9 | VERMELHO
A | 243 | EXCLUIDO | (sem operador aplicavel) | case "$prim" in
A | 244 | EXCLUIDO | (sem operador aplicavel) | "# refs do PR #"*) ;;
B | 245 | M7(salto) | fail=0 | VERDE  <- NAO-COBERTO: *) continue ;;                                               # sem a 1   <- EQUIVALENTE declarado em docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt
A | 248 | M3(-n>-z) | fail=9 | VERMELHO
B | 249 | M3(-f>-d) | fail=1 | VERMELHO
A | 253 | EXCLUIDO | (sem operador aplicavel) | if [ "$RCN" = "1" ] || [ "$RCN" = "2" ]; then
B | 255 | M7(salto) | fail=1 | VERMELHO
A | 257 | EXCLUIDO | (sem operador aplicavel) | if [ "$(significativas < "$TMPD/bloco.raw")" = "$(significat
A | 261 | M3(-le>-gt) | fail=5 | VERMELHO
A | 263 | EXCLUIDO | (sem operador aplicavel) | $(tr -c '0-9A-Fa-f' '\n' < "$TMPD/bloco.raw" | awk 'length($
A | 264 | EXCLUIDO | (sem operador aplicavel) | else
A | 268 | EXCLUIDO | (sem operador aplicavel) | [ "$NCOLAGENS" = "0" ] && aviso "sem colagem da ferramenta (
A | 276 | EXCLUIDO | (sem operador aplicavel) | function isento(num) { return (index(EX, ":" num ":") > 0) }
A | 277 | EXCLUIDO | (sem operador aplicavel) | function limpaP(s) { sub(/^[:-]+/,"",s); sub(/[.:-]+$/,"",s)
A | 278 | EXCLUIDO | (sem operador aplicavel) | function limpaS(s) { sub(/^[.:-]+/,"",s); sub(/[.:-]+$/,"",s
A | 280 | M10 | fail=196 | VERMELHO
A | 281 | M10 | fail=196 | VERMELHO
A | 282 | EXCLUIDO | (sem operador aplicavel) | return 1
A | 285 | M10 | fail=196 | VERMELHO
A | 286 | M4(sim>nao) | fail=42 | VERMELHO
A | 290 | EXCLUIDO | (sem operador aplicavel) | while (match(s, /(^|[^A-Za-z0-9_.\/-])[A-Za-z]*(grep|rg)([[:
A | 293 | EXCLUIDO | (sem operador aplicavel) | return c
A | 298 | M10 | fail=196 | VERMELHO
A | 305 | M7(salto) | fail=196 | VERMELHO
A | 306 | M7(salto) | fail=196 | VERMELHO
A | 307 | M7(salto) | fail=196 | VERMELHO
A | 313 | M4(sim>nao) | fail=8 | VERMELHO
A | 314 | EXCLUIDO | (sem operador aplicavel) | return 0
B | 318 | M10 | fail=0 | VERDE  <- NAO-COBERTO: if (idx < 2 || idx > n) return 0   <- EQUIVALENTE declarado em docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt
A | 319 | M4(sim>nao) | fail=14 | VERMELHO
A | 321 | EXCLUIDO | (sem operador aplicavel) | function tokenUnidade() { return (secU=="H") ? "derruba com:
A | 322 | EXCLUIDO | (sem operador aplicavel) | function satisfeita() { return (uok || index(utext, tokenUni
A | 325 | M10 | fail=63 | VERMELHO
A | 326 | M10 | fail=196 | VERMELHO
A | 327 | M10 | fail=1 | VERMELHO
A | 328 | EXCLUIDO | (sem operador aplicavel) | else           print "REJ3M", ustart, ufirst, uapos
A | 330 | M10 | fail=196 | VERMELHO
B | 336 | M7(next) | fail=0 | VERDE  <- NAO-COBERTO: NR==FNR { FE[$1]=$2; SC[$1]=$3; HD[$1]=$4; next }   <- EQUIVALENTE declarado em docs/revisoes/SAN3/B-GOV-MANDATO-ciclo3-equivalentes.txt
A | 340 | ANOMALIA-DIFF | M7(next) | linhas-trocadas=0 nao conta   <- fronteira 26 da ferramenta (plano §14.18(2)): M7 casa `next` em fim de linha no grep e o sed exige um caractere depois; ponto coberto a mao (F-7c), [M-EXT] da C2
A | 343 | EXCLUIDO | (sem operador aplicavel) | while (match(s, /[A-Za-z0-9_.\/:-]+/)) {
A | 349 | M7(salto) | fail=196 | VERMELHO
A | 356 | M7(salto) | fail=196 | VERMELHO
A | 363 | M10 | fail=196 | VERMELHO
A | 364 | M7(salto) | fail=196 | VERMELHO
A | 365 | M7(salto) | fail=196 | VERMELHO
A | 368 | M7(salto) | fail=196 | VERMELHO
A | 370 | M7(salto) | fail=196 | VERMELHO
A | 371 | M7(salto) | fail=196 | VERMELHO
A | 372 | M4(sim>nao) | fail=24 | VERMELHO
A | 373 | M4(sim>nao) | fail=23 | VERMELHO
A | 374 | M7(salto) | fail=196 | VERMELHO
A | 375 | M7(salto) | fail=196 | VERMELHO
A | 376 | M4(sim>nao) | fail=23 | VERMELHO
A | 377 | M4(nao>sim) | fail=2 | VERMELHO
A | 388 | M10 | fail=95 | VERMELHO
A | 389 | M7(salto) | fail=196 | VERMELHO
A | 390 | M7(salto) | fail=196 | VERMELHO
A | 392 | M10 | fail=21 | VERMELHO
B | 393 | M10 | fail=1 | VERMELHO
A | 394 | EXCLUIDO | (sem operador aplicavel) | else utext = utext "\n" l
A | 397 | M7(salto) | fail=196 | VERMELHO
A | 399 | M4(nao>sim) | fail=135 | VERMELHO
A | 400 | M4(sim>nao) | fail=78 | VERMELHO
A | 401 | M4(nao>sim) | fail=9 | VERMELHO
A | 402 | M4(sim>nao) | fail=75 | VERMELHO
A | 403 | M4(sim>nao) | fail=9 | VERMELHO
A | 405 | M7(salto) | fail=196 | VERMELHO
A | 407 | M4(sim>nao) | fail=9 | VERMELHO
A | 409 | M7(salto) | fail=196 | VERMELHO
A | 411 | M4(sim>nao) | fail=10 | VERMELHO
A | 412 | M10 | fail=196 | VERMELHO
A | 413 | M7(salto) | fail=196 | VERMELHO
A | 415 | M7(salto) | fail=196 | VERMELHO
A | 423 | M7(salto) | fail=196 | VERMELHO
A | 429 | EXCLUIDO | (sem operador aplicavel) | while (1) {
A | 431 | M7(salto) | fail=196 | VERMELHO
A | 443 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt apos; do
A | 444 | M3(-n>-z) | fail=61 | VERMELHO
A | 445 | EXCLUIDO | (sem operador aplicavel) | if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; f
A | 449 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt apos; do
A | 450 | M3(-n>-z) | fail=1 | VERMELHO
A | 451 | EXCLUIDO | (sem operador aplicavel) | if [ "${apos:-0}" = "1" ]; then d="$DICA_APOS"; else d=""; f
A | 456 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln txt; do
A | 457 | M3(-n>-z) | fail=1 | VERMELHO
A | 463 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln len; do
A | 464 | M3(-n>-z) | fail=1 | VERMELHO
A | 469 | M3(-n>-z) | fail=125 | VERMELHO
A | 470 | M3(-n>-z) | fail=28 | VERMELHO
A | 473 | EXCLUIDO | (sem operador aplicavel) | if [ "$RC" = 1 ] || [ "$RC" = 2 ]; then
A | 475 | EXCLUIDO | (sem operador aplicavel) | else
A | 476 | EXCLUIDO | (sem operador aplicavel) | [ "$RC" = 3 ] && aviso "approved_head NAO DETERMINAVEL (mand
A | 481 | M9 | fail=23 | VERMELHO
A | 482 | M1 | fail=21 | VERMELHO
A | 485 | EXCLUIDO | (sem operador aplicavel) | else
A | 492 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln seg; do
A | 493 | M3(-n>-z) | fail=28 | VERMELHO
A | 497 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r _t ln c; do
A | 498 | M3(-n>-z) | fail=1 | VERMELHO
A | 504 | EXCLUIDO | (sem operador aplicavel) | while IFS="$TAB" read -r ln c nv; do
A | 505 | M3(-n>-z) | fail=23 | VERMELHO
A | 506 | M7(salto) | fail=2 | VERMELHO
A | 510 | EXCLUIDO | (sem operador aplicavel) | case "$c" in *:*) d="${c##*:}" ;; esac
A | 511 | EXCLUIDO | (sem operador aplicavel) | case "$c" in
A | 513 | M3(-d>-f) | fail=1 | VERMELHO
B | 514 | M3(-d>-f) | fail=1 | VERMELHO
B | 515 | M3(-n>-z) | fail=1 | VERMELHO
A | 516 | EXCLUIDO | (sem operador aplicavel) | falha "diretorio citado nao existe: $c (conferido em \$RAIZ/
A | 518 | M7(salto) | fail=20 | VERMELHO
A | 519 | M7(salto) | fail=1 | VERMELHO
B | 520 | M3(-n>-z) | fail=2 | VERMELHO
A | 522 | EXCLUIDO | (sem operador aplicavel) | if git -C "$RAIZ" rev-parse --verify --quiet "$rev" >/dev/nu
B | 523 | M7(salto) | fail=2 | VERMELHO
A | 526 | EXCLUIDO | (sem operador aplicavel) | falha "caminho citado nao existe: $c (conferido em \$RAIZ/ e
A | 534 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r ln; do
A | 535 | M3(-n>-z) | fail=46 | VERMELHO
A | 540 | EXCLUIDO | (sem operador aplicavel) | if [ "$ERROS" = "0" ]; then echo "PRE-VOO OK — $F"; exit 0
A | 541 | M5 | fail=210 | VERMELHO
```

*Registro anterior desta seção (28/09), resumido e preservado:* a rodada parcial do Dev-S mediu 14 de 184 pontos
do blob anterior do pré-voo (`3ff7d78c`) com linha de base `fail=1` — descartada pelo §13.5 e refeita do zero
(rodada A).

---

## 5. A rodada de mutação achou defeitos NA PRÓPRIA FERRAMENTA (dois em 28/09, mais dois na rodada A)

Os controles não são decoração: na primeira rodada eles reprovaram **a E4**, não os guards.

| defeito | como apareceu | conserto | prova (antes → depois) |
|---|---|---|---|
| **M1 quebrava o mutante** quando o `{` era do **próprio** ramo (`… \|\| { echo uso; exit 1; }`): preservar o `}` deixava chave sem par | `bash -n` → `ANOMALIA-SINTAXE` | preserva o fechamento **só** quando há `{` **antes** do `\|\|` | pré-voo l.115: `ANOMALIA-SINTAXE` → `M1 \| fail=2 \| VERMELHO` (base `fail=1`) |
| **M3 tratava bandeira de comando como comparação** — `mktemp -d` virou `mktemp -f` e foi publicado como ponto NÃO-COBERTO | ponto de decisão **que não existe** | `-n -z -f -d` só com **contexto de teste** (`[ ` ou `[[`) na linha | pré-voo l.124: `M3(-d>-f) \| VERDE ← NAO-COBERTO` → `EXCLUIDO (sem operador aplicavel)` |
| **Sem timeout: um mutante que não termina bloqueia a rodada** — medido em 29/09, l.161 do pré-voo (M10 `if (fc == "")` → `if (0)`: laço em `marcaLen("")` sem a guarda `mc==""`) | a vaga m161 ficou parada de 28/09 17:32:49 até ser morta pelo orquestrador em 29/09 20:36:07 (§14.15) | **não consertado** (blobs congelados, §14.2.1) — fronteira 25, dono `B-GOV-MANDATO-2`: `--timeout <s>` por mutante + categoria `TIMEOUT` | linha bruta `161 \| ANOMALIA-DENOMINADOR \| M10 \| tests=0 nao conta`, reclassificada `TIMEOUT` na matriz (§4.5) |
| **M7 não gera mutante de `next` em fim de linha** — o `grep` da l.202 aceita `next$`, o `sed` da l.203 exige um caractere depois | a l.340 do pré-voo (`if (isento(FNR)) next`) saiu `ANOMALIA-DIFF M7(next) linhas-trocadas=0` na rodada A | **não consertado** — fronteira 26, dono `B-GOV-MANDATO-2`: `\(…\|$\)` na âncora do `sed` | a ferramenta **acertou** ao não contar; o ponto, medido à mão pelo planejador (§14.18), é discriminável e coberto (F-7c) — [M-EXT] da C2‴ |

Dos dois de 28/09, o segundo era o pior: **publicar buraco falso é pior do que não medir**, porque manda a
próxima cadeira caçar fantasma.

---

## 6. Custo MEDIDO, com a fórmula (não estimativa republicada como medição)

Unitário do guard, medido nesta máquina com a máquina **livre**, lendo o relógio a cada execução:

| guard | casos | N execuções | unitário medido |
|---|---|---|---|
| `mandato-refs` | 33 | 3 | **98 s** (98, 98, 99 — σ ≈ 0,5 s) |
| `mandato-preflight` | 298 | 2 | **531 s** (514 e 548 — ~8,9 min; **1,78 s por caso**) |

**Fórmula:** `custo = unitário × mutantes-que-rodam-guard`.

- **refs:** 46 mutantes + 1 base + 7 dos controles = **54 execuções × 98 s ≈ 88 min serial**; com
  `--jobs 4`, a rodada real levou **≈ 35 min** (inclui a cópia do arnês por mutante).
- **pré-voo (projeção declarada como projeção):** 184 pontos, com a mesma proporção de exclusão do
  refs (46 de 99) → **≈ 86 mutantes** que rodam guard. Ao unitário **medido** de 531 s:
  **≈ 12,7 h serial**; aplicando o ganho de **2,5×** que a rodada do refs mostrou de fato (88 min
  serial → 35 min com `--jobs 4`), **≈ 5,1 h com `--jobs 4`**. **Isto ESTOURA a faixa do plano
  (4,2–5,0 h / 1,0–1,3 h) por ~2,5×**, e a causa é medível: o plano usou 0,52–0,64 s por caso,
  medidos num guard pequeno; a 298 casos o custo por caso é **1,78 s**. Publico o medido.

**Por que o unitário é tão alto para um guard de 33 casos:** cada caso faz `spawnSync("bash", …)` do
`.sh` de verdade — é essa a escolha que torna o guard honesto (com o script apagado passa **zero**),
e ela custa um processo por caso, no sistema operacional em que processo é caro.

---

## 7. Fronteiras DECLARADAS desta ferramenta

1. **Mutantes de uma linha só.** Mutação semântica de várias linhas não é atravessada.
2. **Equivalência não é automática.** `--equivalentes <arquivo>` aceita `id: justificativa (fixture
   que tentou discriminar)`; **linha sem fixture nomeada é ignorada** — declarar equivalência sem ter
   tentado discriminar não conta.
3. **O operador é o primeiro aplicável**, então um ponto com dois construtos é medido por um só.
4. **52 de 99 pontos do refs ficaram EXCLUÍDOS** por não ter operador aplicável (sobretudo padrões de
   `case`, `;;` e linhas cuja decisão está em expansão de parâmetro). Isso é **teto de alcance**, não
   cobertura: a fração publicada tem esses pontos **fora** do denominador, e eles estão listados.
5. **A ferramenta mede o guard, não o produto.** Um mutante VERMELHO diz que *algum* caso reagiu —
   não diz que o caso testa a coisa certa.
6. **M1 dentro de substituição de comando produz mutante inválido (fronteira 24, plano §14.4).** Em
   `$( … || echo … )` o M1 corta até o fim da linha e come o `)` de fechamento: o mutante não compila, o
   `bash -n` pega, e o ponto sai `ANOMALIA-SINTAXE` — **sem medição**, fora de K e fora de NÃO-COBERTOS.
   Instância de hoje: a l.164 do `mandato-refs.sh` (`MB=$(git merge-base … 2>/dev/null || echo "")`),
   semanticamente inerte (`$(x || echo "")` ≡ `$(x || true)`: `MB` vazio nos dois). Re-derivado no K1 com o
   `aplica()` real da ferramenta sobre cópia: mutante `… 2>/dev/null || true` sem o `)`, `bash -n` `ec=2`
   (*unexpected EOF while looking for matching `)'*); pristino `ec=0`. Declarada também em
   `P-GOV-MANDATO-3-FRONTEIRAS` (dono `B-GOV-MANDATO-2`).
7. **Sem timeout por mutante (ferramenta) nem por caso (guard) — fronteira 25, plano §14.15.** `roda_guard`
   (l.123-127) e o `wait` (l.295) da ferramenta esperam para sempre, e o `spawnSync` de `roda()` no guard do
   pré-voo (l.104) não tem `timeout:`: um mutante que não termina trava a rodada e o caso. `TIMEOUT` é
   classificação **manual**, pelo protocolo do §14.15(3), e fica fora de K, de NÃO-COBERTOS e do [M-1] (hoje: a
   l.161). Conserto, dono `B-GOV-MANDATO-2`: `--timeout <s>` por mutante com morte da árvore de processos e
   categoria `TIMEOUT` impressa; no guard, `timeout: 60_000` e `r.signal === null`.
8. **M7 não gera o mutante de `next` em fim de linha — fronteira 26, plano §14.18(2).** O `grep` da l.202 casa
   `next` seguido de fim de linha, o `sed` da l.203 exige um caractere depois: 0 linhas trocadas → `ANOMALIA-DIFF`
   (a ferramenta acertou ao não contar). Hoje: a l.340 do pré-voo, coberta à mão (F-7c). Conserto, dono
   `B-GOV-MANDATO-2`: `\(…\|$\)` na âncora do `sed`.
9. **O ambiente é parte da medição — fronteira 27, plano §14.19.** O pré-voo calcula `RAIZ` em POSIX (l.121) e o
   entrega ao `git.exe` (l.522): sob `MSYS_NO_PATHCONV=1` a rev nunca resolve e `rev:caminho/…` é rejeitado
   (falso REJ, nunca falso OK — fail-closed). Fora do ambiente de uso (Git Bash padrão; CI ubuntu). Conserto, dono
   `B-GOV-MANDATO-2`: `RAIZ` em forma que o `git.exe` aceite (`pwd -W`/`cygpath -m`, como a ferramenta faz com
   `BASE`) + caso `[F-6j]`. Até lá: rodada cujo guard alcança a l.522 declara o ambiente (§0) e roda **sem** a
   variável (ERRATA E-11).

10. **O equivalente é contado, não conferido — fronteira 28, plano §14.20(1).** O arquivo `--equivalentes` é contado por linhas com fixture (l.311) e subtraído dos NÃO-COBERTOS (l.324) sem conferência de id: uma linha com id inexistente, ou de ponto já coberto, abate um não-coberto real e o `ec=0` sai falso.
    Gravidade `ajuste`, escopo `dentro-do-bloco` (a ferramenta nasceu em `616fd4fa`, E4 deste ciclo): a direção é
    fail-open para o verde falso. Fato medido no K2b (2026-09-30), arquivos FORA do repo, `MSYS_NO_PATHCONV exportadas=0`, head `4b164396`: `--only 245` com um arquivo só `999: … (fixture: nenhuma, …)` → `N=1 K=0 NAO-COBERTOS=1 … EQUIVALENTES-DECLARADOS=1`, **`ec=0`**; controle, o mesmo id sem parênteses → `EQUIVALENTES-DECLARADOS=0`, `ec=1`; base `fail=0 de tests=312` e `[M-4]` ok nas duas. Na matriz publicada o efeito é nulo: os ids do arquivo (245, 318, 336) são exatamente os NÃO-COBERTOS da rodada B, provado por script (§4.5) — e o [M-1] = 0 publicado é DERIVADO da matriz e dessa prova de conjuntos, nunca do `ec` da ferramenta (ERRATA E-12). Não se conserta agora (o blob
    `37549262` está em todas as triplas). Conserto, dono `B-GOV-MANDATO-2`: `EQN = |ids do arquivo ∩ NÃO-COBERTOS da rodada|`; id declarado que **não** está entre os não-cobertos → linha `ANOMALIA-EQUIV <id>` (declaração morta ou ponto já coberto) e **não abate**; o resumo imprime os dois conjuntos e `EQUIVALENTES-CONFERIDOS`. Teste de
    encerramento: o `t-inventado` do K2b: `--only 245` com `999: … (f)` → `NAO-COBERTOS=1 EQUIVALENTES-CONFERIDOS=0`, **`ec=1`** (hoje `ec=0`), e o controle sem parênteses inalterado. *(Registrado no K2b como fato sem número; numerado no K2c, 2026-09-30, pelo §14.20.)*
