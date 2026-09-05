# C3 — `jurado-r07a-escopo-guards` — evidência incremental

> Esqueleto gravado ANTES de medir. Cada item é preenchido AO MEDIR, item N antes do N+1.
> Regra da sessão: 6 quedas até agora; quem gravou incremental perdeu 1/3, quem mediu para gravar depois perdeu tudo.

## T0 — Terreno medido por mim

| item | valor |
|---|---|
| worktree | `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/r07a` |
| HEAD | `533cefd14dd69e0f63bdc480a0674c1aa38676b1` (`chore/o6r07a-ressalvas`) |
| `origin/main` | `3c29189351541e082d218ff510a7bc4de174776a` |
| merge-base(origin/main, HEAD) | `cae60863ba9fb8e27f23d29daf496b58f29905f1` |
| a base moveu? | SIM — merge-base `cae6086` != `origin/main` `3c29189` |

Comando:
```
git rev-parse HEAD ; git rev-parse origin/main ; git merge-base origin/main HEAD
```

(status do worktree: 4 untracked — os votos/evidências das cadeiras C1 e C2. Zero rastreado modificado.)

### T0.1 — A base moveu: altera os MEUS itens?

A base moveu **TRÊS** vezes desde o corpo do briefing, e **uma quarta vez desde a ERRATA**:

```
git log --oneline -6 origin/main
3c29189 fix(registro): duas pendencias do B-O6R-02 declaravam status em PROSA — e o placar nao as contava (#376)
1a7ad4d fix(registro): a linha de status que o gerador le dizia ABERTA — e o negrito que a escondia (#375)
066b47e fix(kpi): as 12 linhas de "fechado por undefined" que o meu proprio conserto criou (#374)
cae6086 docs(kpi): o registro do B-O6R-02 c5 que o squash do #371 deixou de fora (#372)
```

- Corpo do briefing: `origin/main = cae6086` — **morto**.
- ERRATA E-1: `origin/main = 1a7ad4d` — **também morto**. O inspetor mediu antes do #376.
- **O que EU meço: `origin/main = 3c29189`** (= o que a cadeira C2 mediu).

**Altera os meus itens? SIM, um deles — e é justamente o J3.3.** O #376 (`fix(registro): duas pendencias
do B-O6R-02 declaravam status em PROSA — e o placar não as contava`) mexe **no placar do índice**, que é
exatamente o objeto do J3.3. J1 e J2 são medidos por `merge-base...HEAD` (o conteúdo do PR), que **não**
depende de para onde a main andou — confirmado abaixo: three-dot contra `cae6086` e contra `origin/main`
dão **saída idêntica**.

---

## J1 — Escopo e número de arquivos

### J1.1 — Contagem real de arquivos no diff

```
git diff --numstat cae6086 HEAD          # merge-base...HEAD = o diff do PR
git diff --numstat origin/main...HEAD    # three-dot explicito — saida IDENTICA
```
```
5	5	Kpis/kpis-history.json
30	0	agent-orchestration/controle/pendencias.md
127	0	agent-orchestration/omega/juntas/BRIEFING-O6R-07a-ressalvas.md
63	0	agent-orchestration/omega/juntas/votos/O6R-07a-ressalvas/00a-inspetor-evidencia.md
34	0	agent-orchestration/omega/juntas/votos/O6R-07a-ressalvas/00a-inspetor-parecer.md
184	0	agent-orchestration/omega/juntas/votos/O6R-07a/00c-porteiro-pos-merge-369.md
32	32	docs/revisoes/O6R/achados.jsonl
```

**São 7 arquivos no head que eu meço — não 3 (corpo) e não 5 (errata E-4).**

Reconciliação — o crescimento é **explicado e benigno**, medido:
```
git diff --numstat cae6086 039c2dc   # o head que a ERRATA mediu -> 5 arquivos, briefing 59/0
git show --numstat --oneline 533cefd # o commit da errata
533cefd docs(junta): errata do briefing — cinco premissas minhas cairam...
68	0	agent-orchestration/omega/juntas/BRIEFING-O6R-07a-ressalvas.md
63	0	agent-orchestration/omega/juntas/votos/O6R-07a-ressalvas/00a-inspetor-evidencia.md
34	0	agent-orchestration/omega/juntas/votos/O6R-07a-ressalvas/00a-inspetor-parecer.md
```
A errata estava **certa para `039c2dc`** (5 arquivos, briefing 59/0). O próprio commit que **publica** a
errata acrescentou +68 linhas ao briefing (59→127) e **commitou os 2 arquivos do inspetor**, que o parecer
dele declarava como untracked. Nenhum dos 3 é registro: são **docs de governança da própria junta**.

**Os 3 arquivos de registro batem exatamente com o §2 do briefing:** `5/5` · `30/0` · `32/32`.
Composição do head `533cefd`: **7 = 3 de registro + 4 de governança** (briefing, parecer e evidência do
inspetor, parecer do porteiro do #369). **Nota, não achado** — o número publicado envelheceu com o
próprio ato de publicar a errata; a errata já avisava disso.

### J1.2 — Zonas proibidas

```
git diff --numstat cae6086 HEAD -- src tests prisma migrations .github frontend mobile \
    scripts CLAUDE.md AGENTS.md package-lock.json package.json .env pubspec.yaml pubspec.lock infra
ec=0 · 0 linhas de saída
```
**Zero arquivo em zona proibida.** Confirma o "zero `src/`, zero teste, zero migration" que sustenta o
quórum de **maioria de 3**. Diff vazio, porém, **não é prova** — a prova é o J1.3.

### J1.3 — Prova por MUTAÇÃO (perna real mutada → ec != 0 nomeando arquivo → restaura → ec = 0)

Worktree descartável **meu**, sob `.claude/worktrees/`, nome com `r07a`, detached, **sem junction**:
```
git -c core.longpaths=true worktree add --detach ../wt-r07a-c3-mut HEAD
# .claude/worktrees/wt-r07a-c3-mut  533cefd (detached HEAD)
```

**A MEDIDA** (a mesma dos 3 passos):
```
ESC="src tests prisma migrations .github frontend mobile scripts CLAUDE.md AGENTS.md \
     package-lock.json package.json .env pubspec.yaml pubspec.lock infra"
git diff --exit-code --numstat cae6086 HEAD -- $ESC
```

**PASSO 1 — baseline, head limpo `533cefd`:**
```
(sem saída)
ec=0
```

**PASSO 2 — 6 pernas REAIS mutadas** (append de 1 linha em cada arquivo existente; commit `93a89e1`):
```
2	0	.github/workflows/ci.yml
2	0	CLAUDE.md
2	0	prisma/schema.prisma
2	0	scripts/kpi-freeze.mjs
2	0	src/app.ts
2	0	tests/kpi-achados-paridade.test.ts
ec=1
```
**A medida vai a `ec=1` e NOMEIA os 6 arquivos.** Não é diff vazio por acaso — a pathspec tem pegada real
nas 6 zonas que importam (`src`, `tests`, `prisma`, `.github`, `scripts`, `CLAUDE.md`).

**PASSO 3 — restaurado** por `git revert --no-edit 93a89e1` (commit adiante `a9a1a39`; **sem** `reset`,
`checkout -- .` nem `--force`, conforme o terreno). Árvore conferida idêntica ao head julgado:
```
git diff --quiet 533cefd HEAD  ->  SIM (identica)
git diff --exit-code --numstat cae6086 HEAD -- $ESC
(sem saída)
ec=0
```

**Anomalia de terreno registrada (não afeta o mérito):** a primeira tentativa de revert usou `-q`, que
**não é flag de `git revert`** — o git imprimiu o *usage* e **não reverteu**, mas o `echo "ec=$?"` leu o
`$?` do **`tail` do pipe**, não o do git, e imprimiu `ec=0`. A medição seguinte (PASSO 3 na 1ª rodada)
saiu `ec=1` e me denunciou o falso "revert ec=0". **Lição: `ec=$?` depois de um pipe mede o último
comando do pipe, não o git.** As medidas dos 3 passos acima **não** usam pipe — o `ec` é do git.

**J1 — conclusão:** escopo **LIMPO**. 7 arquivos (3 registro + 4 governança), zero em zona proibida,
provado por mutação com a medida indo a `ec=1` e voltando a `ec=0`.

---

## J2 — `achados.jsonl` 32/32: reserialização ou mutação silenciosa?

### J2.1 — Contagem de registros e parse

Blobs extraídos **do objeto git** (E-3 — nunca do arquivo do worktree):
```
git show cae6086:docs/revisoes/O6R/achados.jsonl > r07a-achados-base.jsonl
git show HEAD:docs/revisoes/O6R/achados.jsonl     > r07a-achados-head.jsonl
```
```
bytes:  base 49433   head 51333
linhas: base 32      head 32
CR no BLOB (tr -cd '\r' | wc -c):  base 0   head 0
```
**0 CR nos dois blobs** — nenhuma injeção de CRLF. (Medido no blob, como manda a E-3.)

Parse (script `r07a-cmp-achados.mjs`, `node`, ec=0):
```
base registros parseados: 32
head registros parseados: 32
todas as linhas parseiam: SIM (32/32)
```
**O arquivo parseia inteiro nas duas pontas e a contagem NÃO mudou: 32 → 32.**

### J2.2 — Comparação registro a registro do objeto PARSEADO (base blob × head blob)

Método: `JSON.parse` de cada linha, comparação por **canonicalização recursiva** (chaves ordenadas em
profundidade) — insensível a ordem de chave e a espaçamento, sensível a qualquer valor, chave a mais/a
menos, ou mudança de texto.

```
== ORDEM / CONJUNTO DE IDs ==
ordem dos IDs identica: SIM
IDs so na base: (nenhum)
IDs so no head: (nenhum)

== COMPARACAO REGISTRO A REGISTRO ==
registros semanticamente IDENTICOS: 31 / 32
registros com MUDANCA DE CONTEUDO: 1
  -> Ω6R-SEC-002 (ALTERADO)
campos que mudaram: supersedido

== VEREDITO MECANICO ==
afirmacao do orquestrador ("so o SEC-002 mudou de conteudo"): CONFIRMADA
contagem preservada 32/32: SIM
```

**Caracterização dos outros 31** (script `r07a-cmp-reserial.mjs`) — para não aceitar "reserialização" na
palavra:
```
registros com CONJUNTO de chaves de topo diferente: 0
ordem de chaves de topo MUDOU em: 0 registros
ordem de chaves de topo IGUAL em: 32 registros

AMOSTRA Ω6R-DIN-001 — 1o byte divergente na posicao 6:
  base ..."{\"id\":\"Ω6R-DIN-001\",\"severidade\":\"P0\",\"categoria\":\"DIN\",\"modulo\":\""
  head ..."{\"id\": \"Ω6R-DIN-001\", \"severidade\": \"P0\", \"categoria\": \"DIN\", \"mod"

BYTES: delta total 1892 = SEC-002 (+818) + os outros 31 (+1074)
```
A diferença dos 31 é **exclusivamente separador**: `,`→`, ` e `:`→`: ` (separadores default do
`json.dumps` do Python contra os compactos anteriores). **Zero chave a mais, zero chave a menos, zero
mudança de ordem, zero mudança de valor** — os +1074 bytes são espaço em branco.

**O único registro alterado é o `Ω6R-SEC-002`, e só no campo `supersedido`**, que ganha:
(i) a **décima via** como objeto estruturado (`POST /api/v1/mobile/sync/work-order-actions`,
`forma: execucao`, `origem: eed6240 (2026-07-17, PR #197)`, `escopo: pre-existente`) dentro de
`componentes_abertos`; (ii) a `contagem_aberta` reescrita de "9 rotas" para "10 vias", com a ressalva
explícita de **não-exaustividade** e a vinculação do `07c` a censar o sync; (iii) a chave nova
`ressalva_r1` nomeando a origem do apenso. **É exatamente o objeto da ressalva R1** — cujo mérito é da
cadeira **C1**, não meu. Meu recorte fecha: **nenhum outro achado sofreu mutação silenciosa.**

**J2 — conclusão: SEM ACHADO GRAVE.** O razão de achados **não** foi mutado em silêncio: 31/32 idênticos
por valor, 1/32 alterado e **declarado**, contagem 32→32, parse íntegro, 0 CR.

**Nota (`baixa`, `dentro-do-bloco`):** a troca de separadores fez o numstat sair **`32/32`** — o diff
textual repinta **as 32 linhas** e assim **esconde visualmente** que só uma mudou. Não há perda de dado e
o conteúdo está provado preservado, mas um `32/32` num razão de achados é exatamente a forma que uma
mutação silenciosa teria; quem revisar por leitura de diff não distingue os dois casos. É por isso que
este item exigiu comparação por objeto parseado — e é o motivo de a nota ficar registrada em vez de
passar batida.

---

## J3 — Guards e as DUAS afirmações sobre o índice

### J3.1 — Guards, `ec` um a um

Forma (R6): rodados **no head `533cefd`**, no worktree `r07a`, um comando por chamada, **sem pipe** (o
`ec` é do próprio comando — ver a anomalia registrada em J1.3).

| # | guard | comando | `ec` |
|---|---|---|---|
| 1 | kpi-freeze | `node scripts/kpi-freeze.mjs --check` | **0** |
| 2 | sintaxe do painel | `node --check Kpis/app.js` | **0** |
| 3 | paridade achados | `node --test --import tsx tests/kpi-achados-paridade.test.ts` | **0** |
| 4 | painel/gráficos | `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **0** |
| 5a | whitespace | `git diff --check cae6086 HEAD` | **0** |
| 5b | whitespace (3-dot) | `git diff --check origin/main...HEAD` | **0** |

Saídas relevantes:
```
[1] kpi-freeze: em dia (snapshot 2026-09-05).                       GUARD1_EC=0
[2] (sem saída)                                                      GUARD2_EC=0
[3] 1..6  # tests 6 # pass 6 # fail 0 # skipped 0 # todo 0           GUARD3_EC=0
[4] 1..16 # tests 16 # pass 16 # fail 0 # skipped 0 # todo 0         GUARD4_EC=0
[5a] (sem saída)                                                     GUARD5a_EC=0
[5b] (sem saída)                                                     GUARD5b_EC=0
```
**5/5 verdes, com denominador declarado: paridade 6/6, painel 16/16, zero skip nos dois.**
O guard 3 é o que lê `achados.jsonl` **e** `pendencias.md` — passar com a reserialização do J2 e com o
apenso de 30 linhas do J3.2 é o que prova que os dois artefatos seguem consistentes entre si.

### J3.2 — (a) O apenso de 30 linhas é NEUTRO para o índice? (medido na ÁRVORE MESCLADA)

**Árvore mesclada construída contra a `origin/main` que EU medi** (`3c29189`), não contra a `1a7ad4d`
morta da errata:
```
git merge-tree --write-tree origin/main HEAD   -> ec=0, tree ca4bda8d88b0982767d3d74961e61b4f7de0b797
git commit-tree ca4bda8d -p origin/main -p HEAD -> ade5bd1
  pais: 3c29189 (origin/main) + 533cefd (HEAD)   [merge LIMPO, sem conflito]
git -c core.longpaths=true worktree add --detach ../wt-r07a-c3-merged ade5bd1
```
*(a tree difere da `0b711e4c` do inspetor porque a base andou de `1a7ad4d` para `3c29189` — #376)*

**ARMADILHA NEUTRALIZADA ANTES DE MEDIR (E-3).** O gerador lê o arquivo do worktree, e sob `autocrlf` ele
vem com CR:
```
pendencias.md worktree CR: 6634   |  BLOB CR: 0
indice        worktree CR:  339   |  BLOB CR: 0
```
Alimentar o gerador com o arquivo do worktree faria os regexes dele verem `\r` e **fabricaria** um
resultado. Por isso **todas** as rodadas abaixo escrevem o arquivo a partir do **blob** (`git show`),
com `input CR = 0` conferido a cada rodada. O gerador escreve com `newline=''` → saída LF (`output CR: 0`).

**Desenho experimental** (duas rodadas do MESMO gerador, mudando só o `pendencias.md` de entrada):

| rodada | entrada | saída |
|---|---|---|
| **A** | `pendencias.md` da **árvore mesclada** (= main + apenso de 30 linhas) | `r07a-idx-gen-MERGED.md` |
| **B** | `pendencias.md` de **`origin/main` sozinha** (sem o apenso) | `r07a-idx-gen-MAINONLY.md` |

**Placar das duas rodadas — idêntico:**
```
A (mesclada): indice: 263 cabecalhos / 252 IDs | {'FECHADA': 63, 'ABERTA': 200} | baldes {'-': 63, 'C': 76, 'B': 87, 'A': 37} | diferidas-materiais 1
B (main-only): indice: 263 cabecalhos / 252 IDs | {'FECHADA': 63, 'ABERTA': 200} | baldes {'-': 63, 'C': 76, 'B': 87, 'A': 37} | diferidas-materiais 1
```
**O PLACAR NÃO SE MOVE.** Zero cabeçalho `## P-` novo, zero ID novo, zero mudança de estado, de balde ou
de severidade. **A afirmação (a) do orquestrador está CONFIRMADA no que ela literalmente diz.**

**Mas o arquivo do índice NÃO é byte-neutro** — e isso o orquestrador não disse:
```
diff r07a-idx-gen-MERGED.md r07a-idx-gen-MAINONLY.md   -> ec=1, 14 linhas de diff
  5 linhas '<'  /  5 linhas '>'   (de 339 linhas do índice)

< | `P-AUTH-KDF-ROTACAO-V2`                | 6396 | ...      > | ... | 6366 | ...
< | `P-C3-DOIS-PRS-SEM-KPI`                | 6504 | ...      > | ... | 6474 | ...
< | `P-DERIVADO-ESQUECIDO`                 | 6536 | ...      > | ... | 6506 | ...
< | `P-KPI-HISTORY-MD-BACKLOG`             | 6414 | ...      > | ... | 6384 | ...
< | `P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR`| 6599 | ...      > | ... | 6569 | ...
```
**Todas as 5 diferenças são exatamente `+30`** (6396−6366 = 6504−6474 = 6536−6506 = 6414−6384 =
6599−6569 = **30**) — o deslocamento das 5 pendências que ficam **depois** do apenso no arquivo.

**Prova de que é SÓ a coluna do número de linha** (anulo a 2ª coluna nos dois e re-comparo):
```
awk -F'|' 'NF>3{$3=" X "}' ... ; diff  ->  ec=0  (saída vazia)
```
**Anulada a coluna `linha`, os dois índices são BYTE-IDÊNTICOS.**

**Conclusão (a):** o apenso é **neutro para o placar** (que é o que a afirmação do orquestrador diz) e
**não-neutro para o arquivo** (5 números de linha deslocados em +30). O critério do meu mandato —
*"se o apenso MOVER O PLACAR, ele devia ter levado o índice, e isso é achado `dentro-do-bloco`"* — **não
é acionado**: o placar não se moveu. Fica o achado menor **J3-A1** abaixo.

### J3.3 — (b) A defasagem do índice ainda existe contra a `origin/main` que EU medi?

**NÃO. A afirmação (b) do orquestrador está MORTA.**

```
diff r07a-idx-gen-MAINONLY.md r07a-idx-committed-MAIN.md
ec=0 · 0 linhas de diferença
```
O `pendencias-indice.md` **committed** na `origin/main` = `3c29189` é **exatamente**, byte a byte, o que o
gerador produz a partir do `pendencias.md` dessa mesma `main`. **Zero defasagem.**

**Trilha completa** (mesmo gerador, uma rodada por base; "committed" = o índice versionado naquela base):

| base | gerador produz | índice committed |
|---|---|---|
| `cae6086` (#372) | 261 cab. / 250 IDs · FECHADA 62, ABERTA 197, SEM-STATUS 2 | **DEFASADO (99 linhas)** |
| `066b47e` (#374) | 262 cab. / 251 IDs · FECHADA 62, ABERTA 198, SEM-STATUS 2 | **EM SINCRONIA** |
| `1a7ad4d` (#375) | 263 cab. / 252 IDs · FECHADA 63, ABERTA 198, SEM-STATUS 2 | **EM SINCRONIA** |
| `3c29189` (#376) | 263 cab. / 252 IDs · FECHADA 63, ABERTA 200, SEM-STATUS 0 | **EM SINCRONIA** |

**Julgamento sobre o orquestrador, sem deferência e nos dois sentidos:**

- **Ele estava CERTO quando mediu.** Em `cae6086` a defasagem era real (99 linhas) e o gerador produzia
  **`261 / 250 / 62`** — exatamente os números que ele publicou. A causa que ele atribuiu (PRs que
  mexeram em `pendencias.md` sem regenerar o índice) confere com a trilha.
- **E a afirmação está MORTA hoje.** O **#374** trouxe o índice de volta à sincronia, e o **#375** e o
  **#376** a mantiveram. A premissa "a defasagem pré-existe a este PR, logo não é problema meu" **não tem
  mais objeto**: não há defasagem pré-existente para este PR herdar.
- **Isso INVERTE o ônus, e é o ponto que interessa.** Com a `main` em sincronia perfeita, este PR deixa de
  ser ruído dentro de uma defasagem maior e passa a ser a **única** fonte de defasagem nova do índice
  pós-merge — as 5 linhas do J3.2. Enquanto a `main` estava 99 linhas fora, omitir o índice era
  irrelevante; agora é o que quebra a sincronia.
- **A errata E-2 do próprio orquestrador antecipou isso** ("se ela não existir mais, a minha afirmação
  está morta e é isso que se registra"). **Registrado.** A E-2 é honesta e o crédito é dele.

### J3.4 — Guards na ÁRVORE MESCLADA (o que de fato vai para a `main`)

O inspetor rodou os guards na mesclagem com `1a7ad4d`, que **já não é a base**. Re-rodei em `ade5bd1`
(= `3c29189` + `533cefd`), que é o que de fato aterrissa:

| # | guard | `ec` | denominador |
|---|---|---|---|
| 1 | `node scripts/kpi-freeze.mjs --check` | **0** | `kpi-freeze: em dia (snapshot 2026-09-05)` |
| 2 | `node --check Kpis/app.js` | **0** | — |
| 3 | `node --test --import tsx tests/kpi-achados-paridade.test.ts` | **0** | 6/6 pass, 0 fail, 0 skip |
| 4 | `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **0** | 16/16 pass, 0 fail, 0 skip |

**Integridade do merge — nenhum lado foi silenciosamente descartado:**
```
blobs do PR preservados na mesclada:
  IDENTICO  Kpis/kpis-history.json        7984dd75...
  IDENTICO  docs/revisoes/O6R/achados.jsonl  bef7a64f...
blobs da main preservados na mesclada:
  IDENTICO  agent-orchestration/controle/pendencias-indice.md  15365848...
  IDENTICO  Kpis/kpis-latest.json         eddb6ac1...
  IDENTICO  Kpis/app.js                   090736d3...
```
`pendencias.md` é o único arquivo que **os dois lados** tocaram; o merge resolveu-o corretamente:
```
main 6604 linhas -> mesclada 6634 linhas  (delta +30)
diff main vs mesclada:  linhas REMOVIDAS 0  ·  linhas ACRESCENTADAS 30
posicao: 6365a6366,6395  (apenso inserido dentro do corpo de uma pendencia existente)
```
**Zero linha da `main` perdida.** E o apenso, conferido linha a linha:
```
cabecalhos '## P-' nas 30 linhas: 0
cabecalhos '## '   nas 30 linhas: 0
```
**A afirmação literal do orquestrador ("zero cabeçalhos `## P-`, zero IDs novos") está CONFIRMADA.**

---

## Conclusão

**VEREDITO: APROVADO.**

| item | resultado |
|---|---|
| **J1** escopo | **LIMPO.** 7 arquivos (3 registro `5/5`·`30/0`·`32/32` + 4 governança), **zero** em `src/`, `tests/`, `prisma/`, `.github/`, `frontend/`, `mobile/`, `scripts/`, `CLAUDE.md`, `AGENTS.md`, lockfiles, `.env`. Provado **por mutação**: `ec` 0 → 1 (nomeando 6 arquivos) → 0. |
| **J2** `achados.jsonl` | **SEM MUTAÇÃO SILENCIOSA.** 32→32 registros, parse íntegro, 0 CR no blob, 31/32 idênticos por **valor** (diferença só de separadores), 1/32 alterado — o `Ω6R-SEC-002`, **exatamente** o declarado. |
| **J3** guards | **5/5 verdes no head e 4/4 na árvore mesclada**, com denominador (6/6 e 16/16, zero skip). |
| **J3(a)** neutralidade | **Placar NÃO se move** — afirmação confirmada. O arquivo não é byte-neutro: 5 linhas +30. |
| **J3(b)** defasagem | **MORTA.** A `main` está em sincronia perfeita; a afirmação era verdadeira em `cae6086` e não tem mais objeto. |

**Nada que eu medi reprova.** O único achado com efeito real (**J3-A1**) é `baixa` e sobre artefato
**derivado e regenerável**, e o critério de reprovação do meu mandato — *"se o apenso MOVER O PLACAR"* —
**não foi acionado**: medi o placar nas duas rodadas e ele é idêntico.

**Quórum:** maioria de 3 está correta — confirmei por medição (não por leitura do briefing) que o PR não
toca dinheiro, segurança, permissão nem perda de dado: **zero `src/`, zero teste, zero migration**.

**O que eu NÃO medi, dito às claras:** o mérito de C1 (a décima via reproduz?) e de C2 (os hashes do
backfill) — não é minha cadeira. Do `Ω6R-SEC-002` julguei **apenas** que a alteração existe e é a
declarada; **se o conteúdo dela é verdadeiro é da C1**. Não rodei a suíte plena nem CI local.

## Anomalia de terreno registrada (não afeta o mérito)

O worktree **`o6r-b02-porteiro376`** (`3c29189`, detached) **estava** na `git worktree list` na minha
primeira medição (T0) e **não estava** na última. **Não fui eu.** Minhas duas remoções nomearam
caminhos meus, explicitamente:
```
git -c core.longpaths=true worktree remove --force ../wt-r07a-c3-mut      -> ec=0
git -c core.longpaths=true worktree remove --force ../wt-r07a-c3-merged   -> ec=0
```
É a outra sessão trabalhando (ela mergeou #374/#375/#376 durante esta junta). **Reportado, não varrido** —
`P-JUNTA-RECURSO-EFEMERO-POR-BLOCO`, e a lição de 04/09 em que uma cadeira destruiu o worktree vivo de
outra sessão lendo o nome como dela. Os alheios remanescentes (`gov-descuido`, árvore principal em
`demo/investidor`) seguem **intocados**, e os 365 arquivos alheios do scratchpad compartilhado foram
**contados, não apagados** (removi só os 6 com prefixo `r07a-`).

## Limpeza (1 linha)
Criei 2 worktrees descartáveis meus (`wt-r07a-c3-mut` e `wt-r07a-c3-merged`, ambos **sob
`.claude/worktrees/`**, detached, sem junction) e arquivos de scratchpad **todos com prefixo `r07a-`**;
removidos ao final por `git worktree remove --force`. **Zero container, base viva (5432/6379) não lida,
nenhum recurso alheio tocado** — `o6r-b02-cond5`, `gov-descuido`, `san2-r` e os arquivos da árvore
principal foram **reportados, não varridos** (`P-JUNTA-RECURSO-EFEMERO-POR-BLOCO`). Ficam os objetos
soltos `93a89e1`/`a9a1a39`/`ade5bd1` (sem `gc`, como manda o terreno).

---

## ACHADOS

### J3-A1 — o índice pós-merge nasce defasado em 5 números de linha (`baixa`, `dentro-do-bloco`)

**O quê:** com a `origin/main` = `3c29189` em **sincronia perfeita** com o gerador (J3.3), o apenso de 30
linhas deste PR desloca em **+30** o número de linha de **5** pendências no índice regenerado
(`P-AUTH-KDF-ROTACAO-V2`, `P-C3-DOIS-PRS-SEM-KPI`, `P-DERIVADO-ESQUECIDO`, `P-KPI-HISTORY-MD-BACKLOG`,
`P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR`). Como o PR **não** leva o `pendencias-indice.md`, o índice na
`main` **nasce defasado** logo após o merge — a situação que a R1(e) do inspetor nomeou por antecipação.

**Por que NÃO reprova:** (i) o **placar não se move** — zero cabeçalho `## P-` novo, zero ID novo, zero
mudança de estado/balde/severidade; anulada a coluna `linha`, os índices são byte-idênticos. O critério
do meu mandato ("se MOVER O PLACAR") **não é acionado**. (ii) O artefato é **derivado e regenerável** por
um comando (`python agent-orchestration/controle/gerar-indice-pendencias.py`). (iii) O `pendencias-indice.md`
está **combinado com a outra sessão** (§4 do briefing), e o PR não o tocar é **cumprimento** da
combinação, não descuido — ainda que a combinação date de quando o #374 estava aberto.

**Nota que merece registro:** uma das 5 pendências deslocadas chama-se **`P-DERIVADO-ESQUECIDO`**
("2026-09-05 — três instâncias em três PRs consecutivos meus"), que é a pendência **desta mesma classe** —
artefato derivado que não acompanha a fonte. A quarta instância aparece deslocando a linha da própria
pendência que a nomeia.

**Escopo `dentro-do-bloco`, com evidência:** o deslocamento é causado **pelo apenso deste PR** e por mais
nada — provado por diferença controlada (rodada A × rodada B do mesmo gerador, mudando só a presença do
apenso, J3.2). Não há componente pré-existente: a `main` está em sincronia (J3.3).

### J1-N1 — o "5 arquivos" da errata envelheceu para 7 (`nota`, `dentro-do-bloco`)
Ver J1.1. O commit que **publica** a errata (`533cefd`) acrescentou +68 linhas ao briefing e commitou os
2 arquivos do inspetor. Os 3 de registro seguem exatos (`5/5`, `30/0`, `32/32`) e nada em zona proibida.
Auto-referente e benigno; registrado para a ata não herdar "5" como fato.

### J2-N1 — `32/32` no numstat esconde que só 1 registro mudou (`baixa`, `dentro-do-bloco`)
Ver J2.2. A troca de separadores do JSON repinta as 32 linhas no diff textual. Conteúdo provado
preservado (31/32 idênticos por valor), mas é a mesma assinatura visual que uma mutação silenciosa teria.

---

## Conclusão

_(a preencher)_
