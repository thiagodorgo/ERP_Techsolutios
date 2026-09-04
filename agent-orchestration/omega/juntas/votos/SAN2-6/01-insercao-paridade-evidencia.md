# C1 — auditor-da-insercao-e-da-paridade — evidência executada

- **Bloco:** SAN2-6 (PR #368)
- **Cadeira:** C1 — inserção pura, paridade §A2, greps que definem "feito"
- **Head julgado:** `d90fbbb` · **Base:** `origin/main` = `e6a6461`
- **Worktree de medição:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/san2-r` (R1 do inspetor)
- **Regra:** toda afirmação do briefing e do diário do dev é re-medida aqui. Sem veto individual; quórum = maioria de 3.

---

## C1-1 — Inserção pura onde foi prometida — **APROVADO com 1 nota**

### C1-1.a — O commit é UM só, e o escopo proibido está vazio

```
git log --oneline e6a6461..d90fbbb -- CLAUDE.md AGENTS.md .agents/agents/README.md \
    agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md
-> 53e44d3  (ÚNICO commit; nenhum outro commit do range toca os 4 arquivos)

git diff --numstat e6a6461...d90fbbb   (linhas dos 4 arquivos)
->  26  14  .agents/agents/README.md
->  61  15  AGENTS.md
->  57  11  CLAUDE.md
->  14   0  agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md
   (idênticos ao numstat do próprio 53e44d3 — o range não acumula outra edição neles)

git diff --name-only e6a6461...d90fbbb -- 'src/*' 'tests/*' 'scripts/*' 'prisma/*' \
    '.github/*' 'frontend/*' 'mobile/*' 'package-lock.json' '.claude/agents/*'
-> VAZIO
```

**Parcial: verde.** Um commit, escopo proibido intocado.

### C1-1.b — A inserção do teto é PURA (5/0) nos dois contratos — provado por hunk, não por soma

`git diff -U0 e6a6461 d90fbbb -- CLAUDE.md | grep '^@@'`:

```
@@ -391,0 +392,5 @@   <- INSERÇÃO PURA de 5 linhas após a l.391  (0 remoções)
@@ -431,11 +436,52 @@  <- substituição: -11 (orig. 431-441) / +52 (novas 436-487)
```

`git diff -U0 e6a6461 d90fbbb -- AGENTS.md | grep '^@@'`:

```
@@ -150 +150 @@       <- 1 linha trocada  (edição 3.3-1: "24 papéis" -> "23 papéis")
@@ -416,2 +416,2 @@    <- 2 linhas trocadas (edição 3.3-3: agente-fabrica, canônico do CLAUDE.md)
@@ -419,0 +420,5 @@   <- INSERÇÃO PURA de 5 linhas após a l.419  (0 remoções)
@@ -459,11 +464,52 @@  <- substituição: -11 (orig. 459-469) / +52 (novas 464-515)
@@ -586 +632 @@       <- 1 linha trocada  (edição 3.3-2; era l.586, +46 de deslocamento -> 632)
```

Fechamento aritmético, hunk a hunk:
- `CLAUDE.md` = **+5 +52 = 57** adicionadas, **−11** removidas → bate com `57 11`. **Nenhum hunk sobra.**
- `AGENTS.md` = **+1 +2 +5 +52 +1 = 61**, **−1 −2 −11 −1 = 15** → bate com `61 15`. **Nenhum hunk sobra.**

**A declaração do dev (§3.1, `CLAUDE.md 5 0` / `AGENTS.md 5 0`) é VERDADEIRA e verificável como hunk
próprio**, com zero remoções, nas âncoras declaradas (após a l.391 e a l.419). Conteúdo do hunk conferido:

```
+   - **Blocos em voo sob o teto antigo — aplicação, transcrita de `D-TETO-DOIS-CICLOS` ...
+     ... "o ciclo 5 já é a
+     última tentativa sob qualquer das duas regras. Se reprovar, **para** ..."
+     **Não há ciclo 6.** Após reprovação no teto, o único caminho é o dossiê ao dono.
```

**Parcial: verde.**

### C1-1.c — Substituições cabem nas linhas declaradas — conferidas UMA A UMA

**Contratos (item 7 do §C7):** o dev declarou `CLAUDE.md` "removidas as 11 linhas (orig. 431-441),
inseridas 52, novo item 7 = 436-487" → hunk `-431,11 +436,52` (436+52−1 = 487). **Bate exatamente.**
`AGENTS.md` "removidas as 11 (orig. 459-469), inseridas 52, novo = 464-515" → hunk `-459,11 +464,52`
(464+52−1 = 515). **Bate exatamente.** As 3 edições só-do-`AGENTS.md` batem linha a linha (150; 416-417;
586→632).

**`.agents/agents/README.md` — 11 hunks × 9 edições declaradas.** Contagem por hunk (executada):

| hunk | + | − | edição declarada pelo dev (§3.4) | confere? |
|---|---|---|---|---|
| `-5,2 +5,2` | 2 | 2 | #1 (l.5) + #2 (l.6) — "caem na mesma âncora de 2 linhas" | **sim** |
| `-12,0 +13,5` | 5 | 0 | #9b "após a l.12, +5" | **sim** |
| `-24 +29` | 1 | 1 | #4 (l.24) | **sim** |
| `-33,4 +38,5` | 5 | 4 | #7 "l.33-36, 4 linhas → 5" | **sim** |
| `-39,0 +46,5` | 5 | 0 | #8 "após a l.38, +5" | **+5 ok; âncora é após a l.39** |
| `-43 +54` | 1 | 1 | #3 (l.43) | **sim** |
| `-49 +59,0` | 0 | 1 | #5 (l.49) | **sim** |
| `-56,3 +65,0` | 0 | 3 | #5 (l.56-58) | **sim** |
| `-66 +72,0` | 0 | 1 | #5 (l.66) | **sim** |
| `-68 +74` | 1 | 1 | #6 (l.68) | **sim** |
| `-76,0 +83,6` | **6** | 0 | #9a "após a l.75, **+5**" | **NÃO — são 6, e a âncora é após a l.76** |

Soma das adições declaradas por edição = 2+5+1+5+5+1+0+1+5 = **25**; adições reais = **26**.
Remoções declaradas = 2+1+4+1+5+1 = **14**; reais = **14** (batem).
A linha a mais é o **separador em branco** ao final do bloco `### Gates fail-closed`, conferido no diff.
Base l.75 = `guardiao-fail-closed`, l.76 = **linha em branco**, l.77 = `### Segurança / banco / infra /
custo` — o dev ancorou pelo último conteúdo (l.75) e não contou o branco que apensou. Mesma classe na
edição #8 (base l.38 = fim do passo 6, l.39 = branco, l.40 = "Regra da dúvida"). **Achado C1-A1, gravidade
`nota`:** imprecisão de contabilidade no diário; o hunk continua **inserção pura (+6/−0)**, nenhuma linha
pré-existente tocada, zero efeito semântico. **Não descaracteriza a promessa de inserção pura.**

**Parcial: verde com nota.**

### C1-1.d — Não houve conversão de EOL em massa disfarçada de edição

Medido **sobre o blob** (`git show <commit>:<path>`), como o mandato exige — nunca `grep -c $'\r'` nem
`md5sum`:

| arquivo | `e6a6461` linhas/CR/bytes | `d90fbbb` linhas/CR/bytes |
|---|---|---|
| `CLAUDE.md` | 542 / **0** / 37792 | 588 / **0** / 41881 |
| `AGENTS.md` | 591 / **0** / 42140 | 637 / **0** / 46226 |
| `.agents/agents/README.md` | 97 / 0 / 7045 | 109 / 0 / 8238 |
| `PROTOCOLO-JUNTA-RESILIENTE.md` | 96 / 0 / 5595 | 110 / 0 / 6403 |

**Leitura, e ela é dupla:**

1. **Prova de ausência de conversão de EOL — total.** O blob é **LF puro dos DOIS lados** (CR = 0 em base
   e head). Não existe delta de EOL possível dentro deste commit: o que entra na `main` já era LF e
   continua LF. Um `sed -i`/conversão em massa apareceria como numstat na casa de `542 542` / `591 591`;
   o numstat real é `57 11` / `61 15`. **Risco R3 zerado por medição independente do diário.**
2. **Nota de método (C1-A2, `nota`):** a tabela do diário do dev ("100% CRLF: 542/542, 588/588") mede a
   **árvore de trabalho**, não o blob. Reproduzi: `core.autocrlf=true`, sem `.gitattributes` na raiz;
   `wc -l`/`tr -cd '\r'` na árvore de `san2-r` dá `CLAUDE.md 588/588` e `AGENTS.md 637/637` —
   **os números do dev reproduzem exatamente**, mas descrevem o *checkout local*, não o que a `main`
   recebe. As duas medições são consistentes; a do blob é a que vale para o merge.

**`sed` não foi usado:** não é provável por proveniência de ferramenta, mas a **consequência observável**
da alegação foi verificada e vale — `sed -i` teria reescrito o arquivo inteiro (numstat ~542/542) e/ou
alterado o EOL do blob. Nem uma coisa nem outra ocorreu.

**Parcial: verde.**

**VEREDITO C1-1: APROVADO** (1 nota de contabilidade no diário, `C1-A1`; 1 nota de método, `C1-A2`).

## C1-2 — Paridade §A2 entre os dois contratos — **APROVADO**

Método: os dois arquivos extraídos **do blob do head**, eol-neutro
(`git show d90fbbb:<path> | tr -d '\r'`), para o scratchpad. Nenhum `checkout` na árvore julgada
(armadilha 4), nenhum `git archive`/`tar` (armadilha 5), nenhum `md5sum` (armadilha 2).

### C1-2.a — O bloco §C7.4 → §C7.7: a afirmação do orquestrador PROVADA

Fronteiras localizadas por âncora, não por número herdado:

```
head-CLAUDE.md : l.380 = "4. **Protocolo de dificuldade — TETO DE DOIS CICLOS ..."   ... l.489 = "---"
head-AGENTS.md : l.408 = mesma linha                                                  ... l.517 = "---"
-> 110 linhas de cada lado (489-380+1 = 110 ; 517-408+1 = 110)

diff c7-claude.txt c7-agents.txt   ->  SAÍDA VAZIA, ec=0
sha256sum ->  7add01374c69240f1acd38ce42c0c3bc2ffe2ff5a791077d2b650284d15cddc5  (IDÊNTICO nos dois)
```

**A afirmação "zero linha de diff no bloco §C7.4→§C7.7, 110 linhas cada" está PROVADA por execução**, e
reforçada por identidade de hash. Confere com o número do dev (110).

### C1-2.b — O bloco do TETO isolado (as 5 linhas do §C7.4)

```
sed -n '392,396p' head-CLAUDE.md   x   sed -n '420,424p' head-AGENTS.md
diff -> SAÍDA VAZIA  ->  TETO IDÊNTICO nos dois contratos
```

Conteúdo (idêntico dos dois lados), com as duas âncoras de grep que o plano exige:
`última tentativa sob qualquer das duas regras` e `**Não há ciclo 6.**`.

### C1-2.c — Ampliei o alvo: o §C7 INTEIRO, não só o bloco alterado

O mandato manda julgar §A2. Comparar só o pedaço que o bloco tocou não responde se os dois contratos
convergiram — então diffei o **§C7 completo** dos dois no head (167 linhas cada, de `## C7.` até o `---`):

```
CLAUDE.md l.323-489  x  AGENTS.md l.351-517   (167 x 167)
diff -> UMA ÚNICA linha divergente:

56c56
< 3. **Regra da dúvida:** ... → `agente-pesquisador-web` (≥3 fontes) → registro PD em      [CLAUDE.md]
> 3. **Regra da dúvida:** ... → subagente pesquisador web (≥3 fontes) → registro PD em     [AGENTS.md]
```

**Isto é diferença estritamente de MECANISMO — o caso explicitamente permitido pelo
`D-INTEROP-CLAUDE-CODEX`** ("diferenças permitidas apenas quando forem estritamente específicas da
ferramenta … invocação de subagentes"): o canônico nomeia o subagente do Claude Code
(`agente-pesquisador-web`), o espelho Codex descreve o papel genericamente. **A REGRA é a mesma** (≥3
fontes, PD antes da decisão, dúvida sem pesquisa = veto). **Não é achado.**

**E é PRÉ-EXISTENTE, com evidência de origem:** a divergência já está no blob da base `e6a6461`
(CLAUDE l.378 × AGENTS l.406) e nasceu em `39eb46c` (**2026-07-28**, PR #303, "interoperabilidade
Claude Code ↔ Codex"). Nenhum hunk deste bloco toca essas linhas.

### C1-2.d — As 3 edições SÓ-do-`AGENTS.md`: mecanismo ou divergência de regra?

Conferidas uma a uma, base → head:

| # | linha | base → head | classe |
|---|---|---|---|
| 1 | l.150 | "os **24 papéis** que o Claude Code roda como subagentes isolados" → "**23 papéis**" | **mecanismo** — frase que só existe no adaptador Codex (descreve o espelho). `grep -cE '24 papéis\|24 agentes' CLAUDE.md` no head = **0**: não há contraparte a sincronizar. |
| 2 | l.586→632 | linha da tabela de paridade: "24 agentes em `.claude/agents/*.md`" e "**24 papéis espelhados**" → **23** / **23** | **mecanismo** — a tabela de paridade Claude↔Codex é seção exclusiva do `AGENTS.md`. `ls .claude/agents/*.md \| wc -l` = **23**: o número corrigido bate com o disco. |
| 3 | l.416-417 | "A **fábrica de agentes** continua … nunca como / forma de adiar a parada." → "A `agente-fabrica` continua … nunca como forma / de adiar a parada." | **CONVERGÊNCIA** — o novo texto do `AGENTS.md` é **byte a byte** o do `CLAUDE.md` head l.388-389 (canônico). É §A2 sendo *cumprido*, não violado; era exatamente o micro-drift que impedia o diff do §C7 de zerar. |

**Nenhuma divergência de REGRA introduzida.** Uma das três edições *elimina* divergência de regra
pré-existente; as outras duas são texto exclusivo do adaptador.

**VEREDITO C1-2: APROVADO.** Paridade §A2 provada por execução; a única divergência residual no §C7
inteiro é de mecanismo e pré-existente (2026-07-28).

## C1-3 — Os greps que definem "feito" — **APROVADO**

Todos os greps rodados **sobre o blob, eol-neutro** (`git show <c>:<f> | tr -d '\r' | grep …`),
nos DOIS commits — o "antes" contra `e6a6461` (a `main`), como o mandato exige, e não contra o `b324258`
que o dev usou.

### C1-3.a — Placar ANTES × DEPOIS (medido por mim, não copiado)

| grep | arquivo | `e6a6461` (main) | dev declarou "antes" | `d90fbbb` (head) | esperado |
|---|---|---|---|---|---|
| `\bP[1-6]\b` | `CLAUDE.md` | **0** | 0 | **15** | ≥1 ✓ |
| `\bP[1-6]\b` | `AGENTS.md` | **0** | 0 | **15** | ≥1 ✓ |
| `\*\*P[1-6] —` | `CLAUDE.md` / `AGENTS.md` | 0 / 0 | 0 / 0 | **6 / 6** | os 6 P, um a um ✓ |
| `ciclo 6` | `CLAUDE.md` / `AGENTS.md` | **0 / 0** | 0 / 0 | **1 / 1** | presente ✓ |
| `última tentativa sob qualquer das duas regras` | `CLAUDE.md` / `AGENTS.md` | 0 / 0 | 0 / 0 | **1 / 1** | ✓ |
| `ciclos 4` | `.agents/agents/README.md` | **2** | 2 | **0** | ausente ✓ |
| `omega5p` | `.agents/agents/README.md` | **6** | 6 | **0** | ✓ |
| `inspetor-de-terreno-da-junta\|porteiro-pos-merge` | `README.md` | **0** | 0 | **2** | os 2 gates ✓ |
| `24 papéis\|24 agentes` | `README.md` | **3** | 3 | **0** | ✓ |
| `P1–P6` | `README.md` | 0 | 0 | **1** | ✓ |

**O baseline declarado pelo dev reproduz número a número contra a `main`.** Nenhum "antes" inflado.

### C1-3.b — Caça a achado falso: o CONTEÚDO, não a contagem

O mandato avisa que 0→1 não prova lugar nem sentido. Amostrei os quatro pontos:

1. **`ciclo 6`** — não é menção solta: `head-CLAUDE.md:396` e `head-AGENTS.md:424`, **mesma linha**,
   `"**Não há ciclo 6.** Após reprovação no teto, o único caminho é o dossiê ao dono."` É a **proibição**,
   dentro do bullet do teto no §C7.4. ✓
2. **`P[1-6]` = 15 linhas** — não é ruído: as 6 âncoras `**P1 —` … `**P6 —`estão presentes, cada uma com
   norma **e** *Caso*, dentro do item 7 (`CLAUDE.md` l.436-487). Li o bloco inteiro: P1 evidência
   incremental · P2 voto-arquivo-primeiro (+ emenda) · P3 perda de jurado · P4 mandato ≤3 · P5 disparo
   escalonado · P6 registro de quedas, mais o "Modelo de mandato" verbatim e o parágrafo do orquestrador.
   **É o protocolo, não um resumo com os rótulos.** ✓
3. **README — o que substituiu `ciclos 4`** — o passo 5 agora diz literalmente *"teto de DOIS ciclos
   (`D-TETO-DOIS-CICLOS`; o teto de 5 está REVOGADO) … reprovou no ciclo 2 → PARA … não há ciclo 3 … Em
   voo: o `B-O6R-02` está no ciclo 5, que já era o teto dele — o ciclo 5 é a última tentativa"*. A
   contradição que o briefing nomeia (README mandando "ciclos 4–5 replanejam") **morreu, e foi substituída
   pela regra certa**, não apenas apagada. ✓
4. **Os 2 gates = 2 linhas de tabela reais**, sob a seção nova `### Gates fail-closed (não julgam mérito;
   sem o parecer deles nada começa)`, cada uma com Poder e Função e a §-referência (`§C7.1-bis`, `§C2.8`).
   Não é menção de passagem. ✓

### C1-3.c — A emenda voto-esqueleto: na FONTE (append-only) **e** inline no contrato

**Append-only provado por identidade de prefixo**, não por `numstat 14 0` (que é condição necessária, não
suficiente — um numstat `14 0` também sairia de uma reescrita que só adiciona no meio):

```
git show e6a6461:.../PROTOCOLO-JUNTA-RESILIENTE.md | tr -d '\r'            -> 96 linhas
git show d90fbbb:.../PROTOCOLO-JUNTA-RESILIENTE.md | tr -d '\r'            -> 110 linhas
diff  proto-base.txt  <(head -96 proto-head.txt)   ->  SAÍDA VAZIA
sha256:  2c01eab732af6390acae10829545f0b2dc2bc8d9fd63d6d8299903eb22940f71   (base inteiro)
         2c01eab732af6390acae10829545f0b2dc2bc8d9fd63d6d8299903eb22940f71   (head[1..96])
```

**Prefixo byte-idêntico ⇒ APPEND-ONLY.** As 14 linhas apensadas (97-110) são a `## Emenda (2026-09-01,
medida na junta J-SAN2-2) — voto-esqueleto`, com as duas escalas (voto-esqueleto · item grande se fatia) e
a regra `onde medir tem N passos, gravar tem N passos`. O hunk único `@@ -96,0 +97,14 @@` confirma.

**Inline nos dois contratos:** a chave `granularidade do registro acompanha a da medição` aparece **1 vez
em cada um dos TRÊS** arquivos (`CLAUDE.md`, `AGENTS.md`, `PROTOCOLO-JUNTA-RESILIENTE.md`) — o invariante
"contrato ⊆ fonte" sobrevive. No contrato ela está **dentro do P2**, como emenda nomeada (`J-SAN2-2`, "5
quedas no MESMO ponto"), não como parágrafo solto.

### C1-3.d — Duas armadilhas checadas de ofício (não pedidas, baratas, e ambas verdes)

- **Fence não engoliu o documento.** O item 7 novo carrega um bloco ``` interno. `grep -nE '^ *```'`:
  `CLAUDE.md` = **l.477 e l.483** (par); `AGENTS.md` = **l.505 e l.511** (par). Dois fences em cada
  arquivo, nenhum outro no documento, ambos a 3 espaços. Abre e fecha. ✓
- **Nenhum residual do teto revogado virou contradição.** `ciclos 4` no head aparece **1 vez** em cada
  contrato — `l.382`/`l.410`, e é a **enumeração do que está sendo revogado**: *"**REVOGA o teto de 5
  ciclos** que esta seção trazia (ciclos 1–2 fábrica · ciclo 3 crítico reabre premissa · ciclos 4–5 junta
  ampliada · parada só após o 5). O teto agora é **2**"*. É referência histórica explícita, não regra
  viva; e é **pré-existente** (linha fora dos dois hunks deste bloco — `+392,5` e `+436,52`). No README a
  contagem é **0**. ✓

**VEREDITO C1-3: APROVADO.** Os cinco greps do "antes" reproduzem contra a `main`; os cinco do "depois"
saem como prometido; e a amostragem de conteúdo confirma que o texto está no lugar certo e diz o que
devia.

---

## Veredito — **APROVADO** (3 itens verdes; 3 achados, nenhum `bloqueia`)

| item | veredito | o que ficou provado |
|---|---|---|
| **C1-1** inserção pura | **APROVADO** | `5 0` é hunk próprio (`@@ -391,0 +392,5` / `@@ -419,0 +420,5`), zero remoções, âncoras declaradas corretas; toda a aritmética de hunks fecha com `57 11` / `61 15` sem sobrar hunk; **nenhuma conversão de EOL** (blob LF nos dois lados; numstat 57/11, não 542/542) |
| **C1-2** paridade §A2 | **APROVADO** | §C7.4→§C7.7 **idêntico** nos dois (110 l., mesmo sha256); teto isolado idêntico; **§C7 inteiro** (167 l.) diverge em **1 linha**, estritamente de mecanismo e pré-existente; as 3 edições só-do-`AGENTS.md` são 2 de mecanismo + 1 **convergência** ao canônico |
| **C1-3** greps de "feito" | **APROVADO** | "antes" reproduz contra a `main` número a número (0/0 · 0/0 · 2 · 6 · 0); "depois" entrega ≥1 nos dois, `ciclo 6` como proibição, `ciclos 4` = 0 no README, 2 gates presentes; emenda **append-only provada por identidade de prefixo (sha256)** e inline nos dois contratos |

**Achados** (detalhe e classificação no `01-insercao-paridade-voto.json`):
`C1-A1` `nota` / `dentro-do-bloco` — contabilidade do diário 1 linha a menos na edição 9a (+5 declarado ×
+6 real) e 2 âncoras de inserção pura off-by-one; remoções batem exatamente; efeito semântico nulo.
`C1-A2` `nota` / `dentro-do-bloco` — a tabela de EOL do diário mede a **árvore**, não o blob; os números
reproduzem, mas a frase "100% CRLF preservado" descreve o checkout local, não o que entra na `main` (blob
LF dos dois lados). Sem defeito.
`C1-A3` `nota` / **`pre-existente`** (`39eb46c`, 2026-07-28, PR #303) — única divergência residual do §C7
entre os contratos, de mecanismo (nome de subagente), permitida pelo `D-INTEROP-CLAUDE-CODEX`. Registrada
para não ser redescoberta como achado numa passada futura.

**Não propus correção** (§C7.4-bis). **Não commitei** — o orquestrador commita.
**Base viva (5432/6379): não tocada, nem para leitura.** **Limpeza:** 9 arquivos temporários no scratchpad
da sessão (`head-CLAUDE.md`, `head-AGENTS.md`, `head-README.md`, `c7-*.txt`, `c7full-*.txt`, `teto-*.txt`,
`proto-*.txt`) — fora do repositório; nenhum worktree, container ou branch criado; nenhum `checkout` na
árvore julgada.
