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

## 3. `scripts/mandato-refs.sh` — rodada COMPLETA

**Head medido:** `1466c7d9` · **linha de base:** `fail=0 de tests=33` · **rastreados no arnês:** 333.

```
N=46 K=41 NAO-COBERTOS=5 EXCLUIDOS=52 ANOMALIAS=1 EQUIVALENTES-DECLARADOS=0
```

**Cobertura: 41 de 46 mutantes provados = 89 %.** Denominador extraído da fonte: **99** pontos de
decisão, dos quais 52 sem operador aplicável (listados) e 1 anomalia de sintaxe (não conta).

### 3.1 Os 5 NÃO-COBERTOS, com nome e linha

| linha | operador | o que o mutante fez sem o guard reagir |
|---|---|---|
| 115 | M1 | `ver() { command -v "$1" … \|\| parado "falta '$1' no PATH"; }` — **a recusa por binário ausente do PATH**. Nenhum caso exercita "o `gh` não está instalado". |
| 116 | M3 (`-f`→`-d`) | `ghc() { if [ -f "$GH_BIN" ]; then bash "$GH_BIN" …` — o ramo que decide **invocar o shim como arquivo** em vez de como comando. |
| 119 | M3 (`-f`→`-d`) | `[ -f "$GH_BIN" ] \|\| ver "$GH_BIN"` — mesma classe da 116: o guard shima sempre por arquivo, então os dois lados nunca se separam. |
| 160 | M1 | `git rev-parse --git-dir … \|\| parado "nao estou dentro de …"` — **a recusa por não estar dentro de um repositório**. O arnês sempre cria repositório, então a negativa nunca é exercida. |
| 379 | M3 (`-n`→`-z`) | `if [ "$ESTADO_AH" = LIDO ] && [ -n "$MERGE" ] && [ "$MERGE" != "$AH" ]` — **o aviso de divergência entre o commit de merge e o head aprovado**, que é precisamente o erro que este bloco nasceu para impedir. |

**Leitura honesta dos 5.** Quatro são a mesma família: **caminhos de recusa por ambiente** (binário
ausente, fora de repositório, shim como arquivo × como comando) que o arnês, por construir sempre um
ambiente bom, nunca alcança. O quinto (l.379) é diferente e é o mais interessante: é um **aviso de
domínio** — a divergência entre `merge` e o head aprovado —, exatamente a classe de erro que originou
o bloco (`REGISTRO-SAN3-00-APPROVED-HEAD-DUAS-VEZES`). Nenhum dos cinco é defeito de comportamento do
artefato; todos são **ausência de caso no guard**, e têm dono em `P-GOV-MANDATO-3-MUTANTES-REFS`.

### 3.2 Distribuição dos 41 VERMELHOS por operador

| operador | vermelhos |
|---|---|
| M1 (`\|\| <recusa>` → `\|\| true`) | 11 |
| M10 (awk `if (cond)` → `if (0)`) | 9 |
| M3 (`-n`→`-z`) | 7 |
| M8 (padrão de `case` inalcançável) | 5 |
| M3 (`-gt`→`-le`) | 3 |
| M5 (`exit N`→`exit 0`) | 2 |
| M3 (`-eq`→`-ne`) | 2 |
| M4 (`~`→`!~`) | 1 |
| M3 (`!=`→`=`) | 1 |

### 3.3 Matriz completa (99 pontos)

```
99 | M5 | fail=3 | VERMELHO
103 | M1 | fail=1 | VERMELHO
104 | EXCLUIDO | (sem operador aplicavel) | case "$PR" in *[!0-9]*) echo "USO: PR nao-numerico: '$PR'" >
105 | EXCLUIDO | (sem operador aplicavel) | case "$MODO" in
106 | M8 | fail=30 | VERMELHO
107 | M8 | fail=1 | VERMELHO
109 | M1 | fail=1 | VERMELHO
114 | M5 | fail=9 | VERMELHO
115 | M1 | fail=0 | VERDE  <- NAO-COBERTO: ver()    { command -v "$1" >/dev/null 2>&1 || parado "falta '$1' no PA
116 | M3(-f>-d) | fail=0 | VERDE  <- NAO-COBERTO: ghc()    { if [ -f "$GH_BIN" ]; then bash "$GH_BIN" "$@"; else "$GH_BI
119 | M3(-f>-d) | fail=0 | VERDE  <- NAO-COBERTO: [ -f "$GH_BIN" ] || ver "$GH_BIN"
128 | M1 | fail=1 | VERMELHO
138 | EXCLUIDO | (sem operador aplicavel) | case "$RESTO" in
139 | EXCLUIDO | (sem operador aplicavel) | *"$TABC"*) CAMPO="${RESTO%%"$TABC"*}"; RESTO="${RESTO#*"$TAB
140 | M8 | fail=1 | VERMELHO
152 | EXCLUIDO | (sem operador aplicavel) | case "$HEAD_PR" in
153 | M8 | fail=1 | VERMELHO
154 | EXCLUIDO | (sem operador aplicavel) | *[!0-9a-fA-F]*) parado "campo 'headRefOid' nao e hexadecimal
156 | M1 | fail=1 | VERMELHO
157 | M1 | fail=1 | VERMELHO
158 | M1 | fail=1 | VERMELHO
160 | M1 | fail=0 | VERDE  <- NAO-COBERTO: git rev-parse --git-dir >/dev/null 2>&1 || parado "nao estou dentro de
161 | M1 | fail=1 | VERMELHO
163 | M1 | fail=1 | VERMELHO
164 | ANOMALIA-SINTAXE | M1 | nao conta
171 | M1 | fail=1 | VERMELHO
172 | EXCLUIDO | (sem operador aplicavel) | case "$CR" in
173 | EXCLUIDO | (sem operador aplicavel) | [0-9]*\ [0-9]*\ [0-9]*) : ;;
174 | M8 | fail=1 | VERMELHO
183 | M1 | fail=18 | VERMELHO
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
227 | M3(-n>-z) | fail=8 | VERMELHO
228 | M10 | fail=8 | VERMELHO
230 | EXCLUIDO | (sem operador aplicavel) | REGS=$(printf '%s\n%s\n' "$REGS_HEAD" "$REGS_BASE" | sed '/^
236 | M4(sim>nao) | fail=18 | VERMELHO
240 | M10 | fail=18 | VERMELHO
241 | M10 | fail=12 | VERMELHO
242 | M10 | fail=13 | VERMELHO
243 | M10 | fail=10 | VERMELHO
244 | M10 | fail=1 | VERMELHO
249 | M10 | fail=17 | VERMELHO
251 | M10 | fail=18 | VERMELHO
254 | M10 | fail=1 | VERMELHO
261 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r r; do
262 | M3(-n>-z) | fail=18 | VERMELHO
264 | EXCLUIDO | (sem operador aplicavel) | case "$t" in
266 | EXCLUIDO | (sem operador aplicavel) | " ;;
268 | EXCLUIDO | (sem operador aplicavel) | " ;;
270 | EXCLUIDO | (sem operador aplicavel) | " ;;
274 | M3(-n>-z) | fail=16 | VERMELHO
275 | EXCLUIDO | (sem operador aplicavel) | if [ "$t" = OBJL ]; then
278 | EXCLUIDO | (sem operador aplicavel) | else
281 | EXCLUIDO | (sem operador aplicavel) | fi ;;
289 | M3(-eq>-ne) | fail=16 | VERMELHO
290 | EXCLUIDO | (sem operador aplicavel) | LINHA1=$(printf '%s\n' "$CASAM" | sed '/^[[:space:]]*$/d' |
292 | EXCLUIDO | (sem operador aplicavel) | A_APHS=$(printf '%s\n' "$APHS" | sed '/^[[:space:]]*$/d' | a
293 | EXCLUIDO | (sem operador aplicavel) | A_OBJS=$(printf '%s\n' "$OBJS" | sed '/^[[:space:]]*$/d' | a
295 | M3(-eq>-ne) | fail=18 | VERMELHO
299 | EXCLUIDO | (sem operador aplicavel) | while IFS= read -r r; do
300 | M3(-n>-z) | fail=8 | VERMELHO
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
379 | M3(-n>-z) | fail=0 | VERDE  <- NAO-COBERTO: if [ "$ESTADO_AH" = LIDO ] && [ -n "$MERGE" ] && [ "$MERGE" != "$AH" ]
383 | EXCLUIDO | (sem operador aplicavel) | [ "$CR_TOT" = "0" ]   && echo "AVISO: ZERO check-run no head
384 | M3(ne>eq) | fail=1 | VERMELHO
385 | EXCLUIDO | (sem operador aplicavel) | exit "$EC"
```

---

## 4. `scripts/mandato-preflight.sh` — rodada PARCIAL, e isto está rotulado de propósito

**Não cabe numa sessão, e o número que falta é declarado em vez de estimado como se fosse medido.**

- **Denominador medido:** **184** pontos de decisão (`== pontos de decisao enumerados da fonte: 184`).
- **Medidos até a interrupção:** **14** pontos (7,6 %) — 4 VERMELHO, 2 VERDE, 7 EXCLUÍDO, 1 ANOMALIA.
  Os dois VERDE da rodada parcial foram **reclassificados** depois dos consertos do §5: a l.124 era
  **falso** (bandeira de comando lida como comparação) e hoje sai `EXCLUIDO`; a l.160 (`if (sec=="-"
  || sec=="X") print "FORA" …`) permanece um **não-coberto real**.
- **Por que parou:** custo. Ver §6 — a rodada completa do pré-voo projeta **≈ 12,7 h serial** / **≈ 5,1 h com `--jobs 4`**
  nesta máquina (unitário medido, §6).

O parcial fica registrado para o bloco sucessor **retomar sem remedir**: a ferramenta aceita
`--only <linhas>`, e as 184 linhas do denominador estão em
`scripts/mandato-mutantes.sh preflight` (basta reexecutar a enumeração, que é determinística).

---

## 5. A rodada de mutação achou dois defeitos NA PRÓPRIA FERRAMENTA

Os controles não são decoração: na primeira rodada eles reprovaram **a E4**, não os guards.

| defeito | como apareceu | conserto | prova (antes → depois) |
|---|---|---|---|
| **M1 quebrava o mutante** quando o `{` era do **próprio** ramo (`… \|\| { echo uso; exit 1; }`): preservar o `}` deixava chave sem par | `bash -n` → `ANOMALIA-SINTAXE` | preserva o fechamento **só** quando há `{` **antes** do `\|\|` | pré-voo l.115: `ANOMALIA-SINTAXE` → `M1 \| fail=2 \| VERMELHO` (base `fail=1`) |
| **M3 tratava bandeira de comando como comparação** — `mktemp -d` virou `mktemp -f` e foi publicado como ponto NÃO-COBERTO | ponto de decisão **que não existe** | `-n -z -f -d` só com **contexto de teste** (`[ ` ou `[[`) na linha | pré-voo l.124: `M3(-d>-f) \| VERDE ← NAO-COBERTO` → `EXCLUIDO (sem operador aplicavel)` |

O segundo era o pior dos dois: **publicar buraco falso é pior do que não medir**, porque manda a
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
