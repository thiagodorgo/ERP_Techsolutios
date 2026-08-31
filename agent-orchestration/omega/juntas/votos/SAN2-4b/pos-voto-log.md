# Diário pós-voto — SAN2-4b (PR #366, APROVADO 3×0)

**Papel:** agente de correção pós-voto. **Não fui quem achou** (§C7.4-bis: quem acha não conserta).
**Worktree:** `.claude/worktrees/san2-r` · **branch:** `fix/san2-4b-corrigir-arnes` · **head na entrada:** `2d2d16d`.
**Mandato:** tratar os 5 achados da junta — 2 CORREÇÕES (C3-A1, C3-A2) e 3 REGISTROS de pendência (C3-A3, C1-A1, C2-A1).
**Não commito.** Não toco `src/`, `tests/`, `scripts/`, `.github/`, contratos, `Kpis/app.js`, nem os arquivos de voto/evidência das cadeiras.

---

## Passo 0 — leitura dos votos (feita antes de qualquer ação)

Li os três votos com a evidência exata:

| Achado | Fonte | Gravidade / escopo declarados pelo jurado | Disposição do meu mandato |
|---|---|---|---|
| **C3-A1** | `03-escopo-registro-kpi-voto.json` → `achados[0]` (A-1) | `observa` · `dentro-do-bloco` | **CORRIGIR** |
| **C3-A2** | `03-escopo-registro-kpi-voto.json` → `achados[1]` (A-2) | `observa` · `dentro-do-bloco` | **CORRIGIR** a origem declarada |
| **C3-A3** | `03-escopo-registro-kpi-voto.json` → `achados[2]` (A-3) | `observa` · `pre-existente` | **REGISTRAR** (não consertar) |
| **C1-A1** | `01-produto-voto.json` → `itens[C1-I3].achados[0]` (C1-I3-A1) | `baixa` · `pre-existente` | **REGISTRAR** (não consertar) |
| **C2-A1** | `02-arnes-suite-voto.json` → `achados[0]` (A-C2-1) | `media` · `pre-existente` | **REGISTRAR** (não consertar) |

Nenhum dos três jurados propôs correção (§C7.4-bis cumprido pelos achadores). As correções abaixo são
minhas, escritas a partir do relatório deles.

### Estado da árvore na entrada

`git status --short` mostra ` M agent-orchestration/controle/pendencias-indice.md`. **Não é defasagem:**
é `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` + fantasma de CRLF sob `core.autocrlf=true` — as três cadeiras da
junta mediram isso independentemente (C1-I3-N2, C3 `estado_da_arvore_medido_por_mim`).
Confirmado por mim, eol-neutro, antes de tocar em nada:

```
git diff --exit-code                                            -> ec 0
git diff --exit-code -- agent-orchestration/controle/pendencias-indice.md -> ec 0
git diff --stat                                                 -> vazio
```

Ou seja: o ` M` é **stat-cache/CRLF**, não conteúdo. Medição eol-neutra, como manda a armadilha do
mandato (`md5sum`/`git status` mentem sob `core.autocrlf=true`). Nada a reverter antes de começar.

---

## Passo 1 — C3-A1 **CORRIGIDO**: a linha em branco que fechava o apenso do plano do ciclo 5

**Arquivo:** `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`.

**O defeito, como a C3 o descreveu:** o apenso do `SAN2-4b` (§3-C5.7) termina na l.199 (`> ha
consolidado em 'omega/medicoes/'.`) e a l.200 — **`**Re-execuções obrigatórias** …`, linha
**normativa preexistente** deste plano, l.166 em `main` — vinha **colada**, sem linha em branco.
Por continuação-lazy do GFM, ela passava a **renderizar dentro do blockquote** do apenso: uma norma
do ciclo 5 se apresentando como citação de outro bloco.

**Por que era o mais urgente:** este arquivo é o plano do **ciclo 5** do `B-O6R-02` — o próximo bloco
da fila e o **teto do §C7.4**. Quem for executá-lo lê a lista de re-execuções obrigatórias como se
fosse texto do `SAN2-4b`, não dele.

### 1.1 Reprodução por mim, antes de tocar (não herdei a conclusão da C3)

Mesmo método da C3: renderizador **GFM do próprio GitHub** (`gh api -X POST markdown -f mode=gfm`),
sobre a fatia l.165–201 do arquivo no head, e sobre a fatia equivalente do blob de `main`
(`git show main:<path>`, l.160–167) como referência do estado anterior ao apenso.

Predicado medido: a string `Re-execu` aparece **dentro** de `<blockquote>…</blockquote>`? e **fora**?

### 1.2 A correção

Uma **única linha em branco** inserida entre o fim do apenso e a linha normativa. `numstat = 1/0`
(adição pura). **Nenhum byte de linha existente alterado** — o §5.2 do plano do `SAN2-4b` ("nenhuma
linha existente de planos alheios é apagada ou ALTERADA") continua cumprido, agora também pela
**forma**, que era exatamente o que o achado apontava. O texto do apenso e o texto do plano ficam
intocados; só a fronteira entre eles passa a existir.

```
198:[> ata `J-SAN2-4a.md`. Esses diarios de `votos/SAN2-4a/` sao o **registro canonico** …]
199:[> ha consolidado em `omega/medicoes/`.]
200:[]                          <- INSERIDA
201:[**Re-execuções obrigatórias** (só arquivos tocados mudam; `src/` intocado — …)]
```

### 1.3 Confirmação pelo mesmo método — vermelho-controle nos dois sentidos

| Render | blockquotes | linha normativa **DENTRO** | linha normativa **FORA** |
|---|---|---|---|
| `main` (antes do apenso — referência) | 0 | `False` | `True` |
| head `2d2d16d` (defeituoso) | 1 | **`True`** | `False` |
| **corrigido** | 1 | **`False`** | **`True`** |

Leitura: o corrigido **volta ao comportamento de `main`** para a linha alheia (fora do blockquote) e
**preserva o apenso como blockquote próprio** (segue 1, não 0) — a emenda continua visualmente
demarcada como emenda. Não é "sumiu o blockquote"; é "o blockquote parou onde devia".

`git diff --check` = **ec 0**. `git diff --numstat` = `1  0`.

**Status: FECHADO.**

---

## Passo 2 — C3-A2 **CORRIGIDO**: a origem declarada da pendência do ratchet

**Arquivo:** `agent-orchestration/controle/pendencias.md`, entrada
`P-ARNES-RATCHET-POR-CONTAGEM-CEGO-A-PROSA` (l.4817).

**O defeito:** a entrada dizia, **sob um rótulo que promete "evidência de origem"**, que
"o ratchet por contagem nasceu no bloco `B-O6R-ARNES` (2026-08-28)". Falso.

### 2.1 Re-medido por mim (não copiei o voto da C3)

```
git log --diff-filter=A -- tests/db-catalog-write-guard.test.ts
  -> 0a39824  2026-08-19  fix(auth): identidade global + allowlist fail-closed … (B-O6R-01) (#357)

git log -S 'FROZEN_ALLOWLIST' -- tests/db-catalog-write-guard.test.ts
  -> só 0a39824

git log -- tests/db-catalog-write-guard.test.ts
  -> 0a39824 (19/08, B-O6R-01 #357) · f081b5d (28/08, B-O6R-ARNES #359) · ecfdb24 (31/08, SAN2-4b)
```

`git show 0a39824:<arquivo>` traz o mecanismo **inteiro** já no dia do nascimento:
`CATALOG_WRITE_PATTERNS` (l.48) · `FROZEN_ALLOWLIST` com `count` (l.60) · `countCatalogWrites` sobre o
**texto cru** de `readFileSync` (l.144/166) · o comparador `count !== frozen.count` (l.185) — e a
**própria** entrada `rls-tenant-isolation.test.ts` já com `count: 8` e a **mesma** `reason` (l.71-74).

**Prova adicional que eu acrescentei** (a C3 não a tinha executado): o `f081b5d` **não toca o
mecanismo**. `git diff f081b5d~1 f081b5d -- <arquivo>` filtrado por
`countCatalogWrites|CATALOG_WRITE_PATTERNS|count !== |readFileSync` = **saída vazia**; das +341 linhas
dele, as que importam para a acusação são 4 linhas `count:`. Ele **atualizou uma allowlist herdada**.
Zero divergência com a C3 — e a base fica mais larga que a dela.

### 2.2 O que mudou no texto

A classificação **`pre-existente` fica de pé e mais forte**: **12 dias** antes do início desta branch,
não 3. Nenhum número, código ou veredito muda. O que muda é para onde a pendência manda o seu futuro
dono olhar: antes, para o **#359**, onde o desenho **não está**; agora, para o **#357**, onde ele nasceu.

Escrito como **correção datada e nomeada** (`CORRIGIDA em 2026-08-31 (achado C3-A2 da junta J-SAN2-4b)`),
com a medição embutida — não reescrito em silêncio (§A2).

**Status: FECHADO.**

---

## Passo 3 — placar do índice ANTES dos registros (baseline)

```
python agent-orchestration/controle/gerar-indice-pendencias.py
indice: 237 cabecalhos / 228 IDs | {'FECHADA': 50, 'ABERTA': 187} | baldes {'-': 50, 'C': 77, 'B': 79, 'A': 31} | diferidas-materiais 2
```

**Placar idêntico ao que a C3 mediu no head** (`{FECHADA 50, ABERTA 187} / 237`, zero `CONTRADITORIA`,
zero `SEM-STATUS`). É o baseline contra o qual medirei o depois.

### Nota honesta sobre o `git diff` do índice — e por que ele NÃO é a armadilha

Esta regeneração rodou **depois** do Passo 2, e o índice ficou `ec 1`, com **exatamente uma linha**
mudada:

```
git diff --numstat -- agent-orchestration/controle/pendencias-indice.md   ->  1  1
- | `P-REG-BATERIA-NAO-TYPECHECA-TESTS` | 4862 | … |
+ | `P-REG-BATERIA-NAO-TYPECHECA-TESTS` | 4888 | … |
```

**Causa nomeada:** a emenda do Passo 2 trocou 3 linhas por 29 (**+26**) dentro da pendência do ratchet,
e `4862 + 26 = 4888`. É o **deslocamento de linha causado por mim**, não defasagem herdada — o índice
commitado estava correto para o head, como o `ec 0` da entrada já dizia. Nenhuma contagem se moveu:
`FECHADA`, `ABERTA`, baldes e diferidas-materiais são os mesmos números.

Registro isto em vez de anotar "ec 0" como eu tinha escrito de primeira: a medição saiu depois da minha
própria escrita, e chamar de baseline puro o que já continha o meu efeito seria o mesmo defeito de
método que a junta vem pegando. Medido eol-neutro (`git diff`, não `md5sum`/`git status`).

---

## Passo 4 — C3-A3 **REGISTRADA**: `P-KPI-RECENT-CONGELADO` (não consertei)

**Mandato explícito:** registrar, **não** consertar — o `app.js` e a seção estão fora de escopo e a junta
já votou. Cumprido: `git status --porcelain Kpis/` = **0 arquivos**. Não abri `Kpis/app.js` para editar,
só para **medir** os consumidores.

### Re-medição própria (não herdei a conclusão da C3)

| árvore | `recent.as_of` | itens | PR-topo | `recent` idêntico ao de `main`? |
|---|---|---|---|---|
| `main` | `2026-08-28` | 8 | **359** | — |
| head `2d2d16d` | `2026-08-28` | 8 | **359** | **sim** |
| árvore de trabalho | `2026-08-28` | 8 | **359** | **sim** |

PRs listados nos três: `359 · (sem pr) · 355 · 354 · 353 · 352 · 347 · 351`. **Omite #364 e #365.**

Consumo confirmado — a seção **é renderizada**, não é dado morto:
`app.js` l.1195 (`var rec = latest.recent`), l.1233 (`setHTML("recent-list", …)`), l.1234
(`reveal("recent-section")`), l.1558 (`addSource(latest.recent.source)`); `index.html` l.106 (a `<section>`),
l.114 (o `<ol>`) e l.23 (o item de navegação "Últimas demandas").

**Contraprova que acrescentei:** `Kpis/kpis-history.json` tem **149** entradas, com as três últimas
mergeadas em `pr 363 · 364 · 365` mais a de autoria deste bloco (`pr: null`, §C3.5). O histórico **sabe** de
#364 e #365; a seção que o dono abre, **não**.

### Severidade e dono

**MÉDIA**, pelo mesmo critério que este arquivo já aplicou à irmã `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`:
não toca produto, dado, dinheiro nem permissão, nenhum valor de `metrics` depende dela, e os guards de KPI
seguem verdes porque **não é divergência de série** — mas corrompe o alcance do artefato principal. A C3
declarou `observa`/`bloqueia: false`, que é a escala da **junta**; MÉDIA é a tradução para a escala **deste
arquivo**, feita por mim, com a medição inteira publicada para quem quiser reclassificar.

**Dono: `SAN2-5`, "ferramentas de registro honestas", parte 2** — dono **real**, não "a atribuir": é o
mesmo bloco que já detém `Kpis/app.js` e `Kpis/index.html` pela irmã (parte 1). O conserto mora nos mesmos
dois arquivos; dar dono diferente criaria dois donos para o mesmo par.

**A ligação com a irmã está escrita na entrada**, porque é o que dá sentido às duas: são as duas metades
do mesmo furo na `D-KPI-INDEX-PAINEL`. A irmã falha **por omissão** (o `release.summary` não tem seção);
esta falha **por afirmação desatualizada** (a seção existe, tem navegação, hidrata — e diz que a última
entrega é o #359). E as duas têm a mesma causa de desenho: **o que o painel mostra não deriva da fonte que
os blocos são obrigados a atualizar** — deriva de um campo paralelo, mantido por lembrança.

---

## Passo 5 — C1-A1 **REGISTRADA**: `P-AUTHORITY-N-NAO-CANONICO-NO-STORED` (não consertei)

`src/` intocado: `git diff --name-only -- src/` = vazio.

**Re-medido por mim, e a lista saiu MAIOR que a da C1** (ela nomeou espaço, `0x400` e `1e3`):

```
 " 1024"  "1024 "  "\t1024\n"  "0x400"  "+1024"   ->  todos Number() == 1024, isInteger == true
 "1e3"                                            ->  1000: parseia, mas com OUTRO custo
```

Cinco grafias distintas do mesmo `stored` verificam `true` contra o mesmo hash. Causa lida no código:
`authority-password.ts:74-76` usa `Number(parts[n])` para `N`/`r`/`p`; o guard de canonicidade que a C1
introduziu (`isCanonicalBase64`, l.66) cobre `parts[4]`/`parts[5]` — **não alcança `parts[1..3]`**.

**Escopo `pre-existente` confirmado por mim:** `git log -S 'Number(parts[1])' -- src/` → **`5a6a91b`,
2026-07-28, Ω5P PR-18a (#306)** — 34 dias antes da branch; e
`git diff 45c3b97 2d2d16d | grep 'Number(parts'` = **vazio** (`ec 1`), linha **intocada**.

**BAIXA**, como a C1 classificou, e a entrada escreve por que: **não é bypass** — senha correta segue
exigida, 32 bytes comparados inteiros, mudar o valor de `N` quebra a verificação, e só é alcançável por
quem já tem escrita no banco.

**Dono: "a atribuir", com candidato natural nomeado** (o próximo bloco autorizado a tocar
`authority-password.ts`). A C1 fechou com `destino: bloco dono a definir`; inventar dono aqui seria
fabricar compromisso alheio. **Atenção ao ler o índice:** a coluna "dono" vai dizer **`sim`** para esta
entrada mesmo assim — é o defeito conhecido `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` (o segundo ramo do regex do
classificador casa `**dono:**` com `re.I`, ignorando o `(?!a atribuir)` do primeiro). **Não** é dono real,
e não fui eu que introduzi isso.

---

## Passo 6 — C2-A1 **REGISTRADA**: `P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR` (não consertei)

**Zero comandos à base viva, nem de leitura.** `erp-postgres`/`erp-redis` intocados — a medição inteira
saiu de **arquivo**:

```
grep -o "@[^/]*" .env  (raiz)                    -> @localhost:5432   (só host:porta; nenhuma credencial impressa)
ls .claude/worktrees/san2-r/.env                 -> não existe
head -1 tests/rls-tenant-isolation.test.ts       -> import "dotenv/config";
auth-identity-fixture.ts l.117-124               -> SWEPT_ROLE_FAMILIES inclui "rls_test"
```

**Blame, linha a linha** (evidência de data do escopo `pre-existente`):

| linha | commit | data | bloco |
|---|---|---|---|
| l.117-122 — as **cinco** famílias irmãs | `f081b5d` | 2026-08-28 | `B-O6R-ARNES` (#359) |
| l.123 — `"rls_test"`, a **sexta** | `ecfdb24` | 2026-08-31 | **este** bloco |
| mecanismo + corte de idade (`ORPHAN_ROLE_MAX_AGE_MS`) | `0a39824` | 2026-08-19 | `B-O6R-01` (#357) |

Desde **28/08** um `npm test` da raiz já dropava roles velhas de cinco famílias na base viva. O `SAN2-4b`
estendeu a uma sexta o que já valia para cinco — o que o plano lhe mandou fazer.

**MÉDIA**, como a C2 classificou. **Dono: a junta de `P-ARNES-RLS-TEST-FORA-DO-SWEEP`** (l.3473), que já
detém a recontagem supervisionada das 68 — atribuição **declarada pela própria C2** no campo `disposicao`,
não inventada por mim.

O ponto que a entrada preserva: a frase é **verdadeira como executado** e **não garantida por construção**.
Enquanto for assim, ela não serve de insumo para a recontagem — quem for recontar precisa saber que
qualquer `npm test` da raiz no intervalo pode ter movido o denominador.

---

## Passo 7 — Provas finais

### 7.1 Placar do índice — antes × depois

```
python agent-orchestration/controle/gerar-indice-pendencias.py
ANTES:  indice: 237 cabecalhos / 228 IDs | {'FECHADA': 50, 'ABERTA': 187} | baldes {'-': 50, 'C': 77, 'B': 79, 'A': 31} | diferidas-materiais 2
DEPOIS: indice: 240 cabecalhos / 231 IDs | {'FECHADA': 50, 'ABERTA': 190} | baldes {'-': 50, 'C': 77, 'B': 80, 'A': 33} | diferidas-materiais 2
```

| dimensão | antes | depois | Δ | confere com |
|---|---|---|---|---|
| cabeçalhos `## P-` | 237 | **240** | **+3** | as 3 pendências novas |
| IDs distintos | 228 | **231** | **+3** | nenhuma reusa ID |
| `FECHADA` | 50 | **50** | 0 | não fechei nada |
| `ABERTA` | 187 | **190** | **+3** | as 3 nascem ABERTAS |
| balde **A** (material) | 31 | **33** | **+2** | as 2 MÉDIA (`P-KPI-RECENT-CONGELADO`, `P-ARNES-SWEEP-…`) |
| balde **B** (processo) | 79 | **80** | **+1** | a 1 BAIXA (`P-AUTHORITY-N-…`) |
| balde C / diferidas | 77 / 2 | 77 / 2 | 0 | não diferi nada |

**Zero `CONTRADITORIA` e zero `SEM-STATUS`** nos dois lados — o classificador só emitiu as chaves
`FECHADA` e `ABERTA`, e `50 + 190 = 240` fecha com o número de cabeçalhos. As três entradas têm **linha de
status canônica** (`- **status:** ABERTA · **severidade:** … · **dono:** …`), que é o campo que vence o
cabeçalho.

Diff do índice, íntegro — **nenhuma linha inesperada**: os 4 contadores do topo (237→240, 228→231,
187→190, ativas 110→113), a frase que explica cabeçalhos × IDs, os 2 títulos de balde (A 31→33, B 79→80),
as **3 linhas novas**, e **1** linha de deslocamento (`P-REG-BATERIA-NAO-TYPECHECA-TESTS` 4862→4888, o
+26 da emenda do Passo 2). `numstat 11/8`.

### 7.2 `git diff --check`

```
git diff --check   ->  ec 0   (sem whitespace error, sem conflito de marcador)
```

### 7.3 KPI — **não toquei**, e provo em vez de afirmar

O mandato condiciona a bateria de KPI a *"se tocar `Kpis/*`"*. **Não toquei**, logo **não rodei o
`kpi-freeze` em modo escrita** — ele faria `writeFileSync` em `Kpis/app.js` (l.53), que está na minha lista
de proibidos. Rodei só o que é **somente leitura**, como evidência de que deixei intacto:

```
git status --porcelain Kpis/            ->  0 arquivos
node scripts/kpi-freeze.mjs --check     ->  ec 0  "kpi-freeze: em dia (snapshot 2026-08-31)"
node --check Kpis/app.js                ->  ec 0
```

(`--check` sai na l.40, antes do `writeFileSync` da l.53 — conferido no script antes de executar.)
`kpi-dashboard-charts` não foi re-executado: ele guarda a paridade painel × JSON, e **nenhum dos dois
mudou** — a C3 já o reexecutou verde no head (16/16) e nada no meu diff o alcança.

### 7.4 Escopo — o que encostei e o que não

```
git diff --numstat
  11    8   agent-orchestration/controle/pendencias-indice.md          (via script, não à mão)
 231    4   agent-orchestration/controle/pendencias.md
   1    0   agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md  (a linha em branco, e só)
untracked: agent-orchestration/omega/juntas/votos/SAN2-4b/pos-voto-log.md   (este diário)

git diff --name-only -- Kpis/ src/ tests/ scripts/ .github/ prisma/ frontend/ mobile/ \
                        CLAUDE.md AGENTS.md API_CONTRACTS.md   ->  0 linhas
```

Nota sobre as **4 remoções** em `pendencias.md`: **3** são as linhas do parágrafo de origem substituído no
Passo 2; a **4ª** é o último byte do arquivo — ele não terminava em nova linha, e passou a terminar. É
adição de caractere final, não perda de conteúdo — e é a mesma higiene que o Passo 1 corrigiu no plano do
ciclo 5.

**Não commitei.** Nenhum comando enviado a `erp-postgres`/`erp-redis`. Nenhum arquivo de voto ou de
evidência das cadeiras foi tocado.

### 7.5 Método — a armadilha do mandato, respeitada

Toda comparação de conteúdo saiu de `git diff` / `git diff --exit-code` / `git hash-object` — **nunca** de
`md5sum` ou da coluna do `git status`, que mentem sob `core.autocrlf=true`. Os dois arquivos que editei são
**CRLF** na árvore; conferi a integridade após cada escrita (`pendencias.md`: 5001 CRLF para 5001 LF, **zero
LF solto**). O ` M pendencias-indice.md` da entrada foi medido como **stat-cache**, não defasagem
(`git diff --exit-code` = ec 0) — e o `ec 1` que apareceu depois teve **causa nomeada e aritmética**
(o +26 do Passo 2), em vez de virar achado fabricado.

---

## Fechamento

| # | achado | disposição do mandato | estado |
|---|---|---|---|
| 1 | **C3-A1** — apenso sem linha em branco no plano do **ciclo 5** | CORRIGIR | **FECHADO** — 1 linha; render confirmado pelo método da C3, vermelho-controle nos dois sentidos |
| 2 | **C3-A2** — origem errada na pendência do ratchet | CORRIGIR | **FECHADO** — `B-O6R-01` `0a39824` 19/08 (#357); `pre-existente` fica **mais forte** (12 dias, não 3) |
| 3 | **C3-A3** — `recent` do painel congelado em 28/08 | REGISTRAR | **FECHADO** — `P-KPI-RECENT-CONGELADO`, ABERTA · MÉDIA · dono `SAN2-5` |
| 4 | **C1-A1** — vetor W08 sobrevive aos guards | REGISTRAR | **FECHADO** — `P-AUTHORITY-N-NAO-CANONICO-NO-STORED`, ABERTA · BAIXA |
| 5 | **C2-A1** — "68 órfãs intocadas" é disciplina, não construção | REGISTRAR | **FECHADO** — `P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR`, ABERTA · MÉDIA · dono = junta de `P-ARNES-RLS-TEST-FORA-DO-SWEEP` |

**Consertei 2, registrei 3, não consertei nenhum dos 3 que o mandato mandou só registrar.**

### O que fica para quem vier

- O **plano do ciclo 5** (`B-O6R-02-ciclo5-plano.md`) volta a se ler como o que é: a linha
  **"Re-execuções obrigatórias"** é norma **dele**, não citação do `SAN2-4b`. Era o mais urgente porque
  esse plano é o próximo da fila e o **teto do §C7.4**.
- As duas pendências de KPI (`P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` e `P-KPI-RECENT-CONGELADO`) agora
  **apontam uma para a outra** e têm o **mesmo dono** — quem pegar o `SAN2-5` pega o par, não meia
  história.
- A coluna **"dono"** do índice diz `sim` para `P-AUTHORITY-N-NAO-CANONICO-NO-STORED`, que **não tem dono**.
  É `P-SAN2-2-INDICE-DONO-SEMPRE-SIM`, defeito conhecido do classificador — não leia essa célula como
  compromisso.

### Limpeza (§C5)

Removidos os 10 temporários do scratchpad da sessão (as fatias de markdown e os 4 renders GFM usados como
vermelho-controle do Passo 1, mais o blob de `main` do plano). **Zero** containers, portas, worktrees,
builds ou commits criados; nenhum arquivo rastreado removido; nenhum untracked permitido tocado.
