# C4 — `auditor-do-kpi-honesto` · evidência incremental (SAN2-2, PR #363)

> Identidade NOVA. Veto. Junta de 4 por unanimidade.
> Worktree: `.claude/worktrees/san2-r` · branch `fix/san2-2-guard-espelho-ci` · head `c8dc716`.
> Regra P1/P2: escrito **após CADA item**. Nenhum número deste arquivo veio de diário de terceiro —
> todo comando abaixo foi executado por mim, e a saída está transcrita.
> `erp-postgres`/`erp-redis` **NÃO tocados**; nada commitado.

---

## ITEM 1 — O número do backend (2607/2609 · fail 0 · skipped 2) é de EXECUÇÃO REAL?

### 1.1 Os três TAPs existem, são distintos e não são cópias

```
$ md5sum <scratchpad>/san2-2-f5/npm-test.r1.tap <scratchpad>/verif-npm-test.tap <scratchpad>/adv-npm-test.tap
444d0f9a0b8dd56b3f5278a1e21f0a8c  san2-2-f5/npm-test.r1.tap   (1255259 bytes, 30/08 14:03)
ff280b2dbd8fcfb56c87b7168a6e0bed  verif-npm-test.tap          (1255166 bytes, 30/08 14:31)
f5f94e7bf437b230d1b6e2816b760375  adv-npm-test.tap            (1255261 bytes, 30/08 14:44)
```

Três md5 distintos, três tamanhos distintos, três `duration_ms` distintos (211228 / 203603 / 213812),
pids distintos (22980 / 15908 / 17460) e portas efêmeras distintas. **Não é um arquivo copiado três vezes.**

### 1.2 Recontagem DO TAP, não do resumo

Parser próprio (`<scratchpad>/c4-recount.py`): varre linha a linha, ignora blocos YAML (`---` … `...`)
e comentários (`# {json}`), casa `^\s*(not )?ok \d+`, e classifica diretiva `# SKIP` / `# TODO`.
**Não lê `# tests` / `# pass` / `# skipped` do rodapé** — reconta as linhas de resultado.

| TAP | linhas de resultado | ok | not ok | SKIP | TODO | indentação |
|---|---|---|---|---|---|---|
| `san2-2-f5/npm-test.r1.tap` | **2609** | 2609 | **0** | **2** | 0 | 2550 no topo + 59 aninhados |
| `verif-npm-test.tap` | **2609** | 2609 | **0** | **2** | 0 | 2550 + 59 |
| `adv-npm-test.tap` | **2609** | 2609 | **0** | **2** | 0 | 2550 + 59 |

`pass = 2609 − 2 skipped = 2607`. **Publicado 2607/2609 · fail 0 · skipped 2 — CONFERE nas três, pela
recontagem crua.** O `1..2550` do plano de topo e o `# tests 2609` do rodapé são consistentes entre si
(2550 top-level + 59 subtests aninhados) — não há teste escondido fora do plano.

### 1.3 Os 2 pulos, NOMEADOS (não contados)

Ambos em nível de topo, nos três TAPs, com o mesmo nome e a mesma diretiva:

- `ok 1646 - toda permissão do catálogo existe na tabela 'permissions' do banco # SKIP RBAC_DB_PARITY não é "1" …`
- `ok 1647 - os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direções) # SKIP RBAC_DB_PARITY não é "1" …`

Arquivo dono: `tests/permission-catalog-db-parity.test.ts` (existe em `tests/`).
Orçamento do runner: `scripts/run-backend-tests.mjs:82` → `const SKIP_BUDGET_DB = 2;`.
**São exatamente os 2 do orçamento. Nenhum pulo inesperado.** (Pulo inesperado seria achado — não houve.)

### 1.4 A forma (canônica 3) está gravada DENTRO de cada arquivo

Cabeçalho do r1 e do verif: `DATABASE_URL=…localhost:56432/…`, `CORE_SAAS_PERSISTENCE=[<ausente>]`,
`RBAC_DB_PARITY=[<ausente>]`, `head=2e4985b…`. O adv grava a mesma tríade de env + data, **mas não grava
o `head=`** — anotado abaixo como observação, não como achado (a identidade do head é reconstruível pelo
conteúdo: os mesmos 2609/2550/59 e os mesmos 12 casos novos).

A forma **não depende do cabeçalho** — ela se auto-evidencia na saída:
- `CORE_SAAS_PERSISTENCE` ausente → o próprio runner imprime nos três: `CORE_SAAS_PERSISTENCE=memory —
  padrão do runner (nada exportado no ambiente …)`;
- `RBAC_DB_PARITY` ausente → é literalmente a razão impressa nos 2 SKIPs;
- `DATABASE_URL` presente → se estivesse ausente a forma seria a declarada como VERMELHA (2371 · fail 1 ·
  skipped 58); os três dão 2609 · fail 0 · skipped 2.

### 1.5 A aritmética fecha — e por dedução fechada, não por fé no baseline

- `tests/agents-mirror-guard.test.ts` declara **12** `test(` de topo, zero aninhado:
  `grep -cE '^\s*(await )?test\(' → 12`.
- Os **12 nomes** aparecem como `ok N - <nome>` **nos três TAPs** (script de casamento por nome exato;
  `FALTANDO: []` nos três).
- **O único arquivo de teste novo/alterado do PR é esse**: `git diff --name-only main...HEAD -- tests/`
  devolve **só** `tests/agents-mirror-guard.test.ts`. O runner conta **248** arquivos (era 247).
- Logo `head = main + 12` por construção; medido `head = 2609/2607` ⇒ `main = 2597/2595`.
  **Baseline 2595/2597 + 12 = 2607/2609 — CONFERE.** (Não é o baseline que valida o número; é o número
  medido que valida o baseline publicado.)

### 1.6 O head medido é o head julgado

```
$ git log --oneline 2e4985b..c8dc716
c8dc716 docs(junta): briefing da junta do SAN2-2 …
12ff986 docs(registro): o registro alcanca o codigo — pendencias e KPI do SAN2-2 (Fases 4 e 5)
$ git diff --name-only 2e4985b..c8dc716 -- src/ tests/ scripts/ package.json package-lock.json prisma/ .github/
(vazio)
```

Os TAPs rodaram em `2e4985b`; de `2e4985b` a `c8dc716` **nenhum arquivo de código, teste, runner, lock,
schema ou workflow mudou**. O número medido vale para o head sob julgamento.

### 1.7 Execução MINHA, no head atual (não aceito número de terceiro sem tocar nele)

```
$ cd .claude/worktrees/san2-r   (head c8dc716, node v20.19.5)
$ node --test --import tsx tests/agents-mirror-guard.test.ts
1..12
# tests 12 · # pass 12 · # fail 0 · # skipped 0 · # todo 0
```

**12/12, zero pulo, no head julgado.** O delta que o KPI atribui a este PR existe e passa.

### VEREDITO DO ITEM 1 — **CONFERE**
Número de execução real, recontado do TAP cru em três execuções independentes; 2 pulos nomeados e iguais
ao orçamento do runner; aritmética fechada por dedução; head medido == head julgado; delta reexecutado
por mim. **Sem achado.**

---

## ITEM 2 — O backfill §C3.5 do #362 está certo?

### 2.1 Onde os dois campos foram gravados

`git diff main...HEAD -- Kpis/kpis-history.json` → **14 inserções / 2 remoções**, num único ponto:
a entrada `"pr": 362` ganhou

```
-    "merge_commit": null,
+    "merge_commit": "87f6ae6",
...
+    "approved_head": "4cd0867"
```

mais um sufixo `[BACKFILL §C3.5 em 2026-08-30 pelo bloco SAN2-2: ...]` na `description`. **É backfill
sancionado, não reescrita silenciosa** — as 2 "remoções" são exatamente a linha `merge_commit: null` e a
`description` que recebeu o sufixo; nenhuma outra das 146 entradas do history foi tocada.

No `release` do `kpis-latest.json` os três campos são **`null`** (PR corrente, §C3.5) e o `backfill_note`
declara os valores do #362 e por que não é o `headRefOid`. **Está no lugar certo dos dois lados.**

### 2.2 `87f6ae6` é mesmo o merge do #362

```
$ git log -1 --format='%H %ad %s / pai %p' --date=iso 87f6ae6
87f6ae615c07872c820b3a0dda771a6b48fb4d0d  2026-08-29 20:39:35 -0300
docs(resgate): o que as juntas verificaram entra; a etiqueta que mentia sai (SAN2-1R) (#362)   pai: a0a1075
$ git log --oneline -2 main
87f6ae6 ... (#362)
a0a1075 ... (SAN2-R) (#361)
```

Commit único (squash), **é o topo da `main`**, título carrega `(#362)`, pai é o merge do #361. **CONFERE.**

### 2.3 A prova de que `4cd0867` é o head JULGADO e não o `headRefOid`

```
$ git log --oneline 4cd0867..55aa8a3
55aa8a3 chore(kpi): numero do PR (#362) no snapshot e no history (§C3.5)
3d85618 docs(junta): ata da J-SAN2-1R — APROVADO 3x0, e o placar em prosa desta vez bateu
```

Conteúdo dos dois, por `git show --stat`:

| commit | data | o que toca |
|---|---|---|
| `3d85618` | 2026-08-29 20:29:23 | 8 arquivos, **todos de registro**: `J-SAN2-1R.md` (a ata) + os 6 arquivos de voto/evidência das 3 cadeiras + `00-quedas.md`. **474 inserções, 0 remoções.** |
| `55aa8a3` | 2026-08-29 20:30:29 | `Kpis/app.js`, `kpis-history.json`, `kpis-latest.json` — **3 linhas alteradas ao todo**: o número do PR. |

**Os dois são pós-voto e de registro puro.** A ata `J-SAN2-1R.md`, escrita em `3d85618`, declara ela mesma:
*"→ `4cd0867` (D-SAN2-OPCAO-C + parecer + quedas; head julgado pelas 3 cadeiras)"* — e a declaração da ata
**bate com o delta que eu medi**; não é ela que sustenta a conclusão, é o `git log`.

Gravar `55aa8a3` declararia que a junta do #362 aprovou **a própria ata que a registrou** e **o commit que
escreveu o número do PR** — dois commits que ela nunca viu. **O backfill está certo, e a nota que explica a
diferença é o que faz dele honesto em vez de só correto.**

### VEREDITO DO ITEM 2 — **CONFERE. Sem achado.**

---

## ITEM 3 — Honestidade do painel (§C3.0 / `D-KPI-INDEX-PAINEL`)

### 3.1 Métricas CARREGADAS com nota §C3.3 explícita — e a prova atrás da nota

| métrica | valor | marcador SAN2-2 presente? |
|---|---|---|
| `flutter_tests` | 864/864 | **SIM** — "[SAN2-2: valor CARREGADO — o PR NAO toca `mobile/` (prova: git diff ... -- mobile/ sai VAZIO); sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.]" |
| `frontend_smoke_tests` | 1126/1126 | **SIM** — idêntico, para `frontend/` |
| `backend_contract_tests_focused` | 34/34 | **SIM** — marcador §C3.3 acrescentado neste PR (bateria focada do B-O6R-ARNES, não reexecutada aqui) |

Prova reexecutada por mim, no head `c8dc716`:
```
$ git diff --name-only main...HEAD -- frontend/ mobile/
(vazio)
```
**Nenhuma métrica carregada sem nota.** E as notas não só existem: apontam o comando que as sustenta, e o
comando confere hoje. Ponto extra: a nota diz literalmente que *"a nota acima descreve execucao de bloco
anterior, NAO deste PR"* — que é exatamente a doença que o `D-KPI-INDEX-PAINEL` existe para matar.

### 3.2 `blocks_completed` e `mvp_*` intocados

Comparação `main` × `HEAD` dos dois JSON, métrica a métrica (script próprio sobre `git show <ref>:arquivo`):

```
mvp_demo          main='99%'        head='99%'        IGUAL
mvp_vendavel      main='88%'        head='88%'        IGUAL
blocks_completed  main='152'        head='152'        IGUAL
flutter_modules / mobile_backend_contracts / mobile_core_saas_contracts /
flutter_tests / frontend_smoke_tests / backend_contract_tests_focused ......... IGUAL
backend_tests     main='2595/2597'  head='2607/2609'  UNICA que se move
```

**Exatamente uma métrica se move, e é a que o PR mediu.** §C3.4 respeitado — o PR não move escopo.
`blocks_completed` fica em 152, com a nota de que sobe para 153 **só no merge**.

### 3.3 `pr` / `merge_commit` / `approved_head` na autoria

`kpis-latest.json.release` → `pr: null · merge_commit: null · approved_head: null · status:
"published_per_pr"`. Entrada nova do history (`version: SAN2-2`) → os três **`null`**. **§C3.5 cumprido**
(null na autoria não bloqueia; recebe backfill pós-merge).

### 3.4 O freeze foi rodado — o erro clássico NÃO aconteceu

Executado por mim, no head `c8dc716`:

```
$ node scripts/kpi-freeze.mjs --check
kpi-freeze: em dia (snapshot 2026-08-30).                        EXIT=0

$ node --check Kpis/app.js                                       EXIT=0

$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
1..16 · # tests 16 · # pass 16 · # fail 0 · # skipped 0          EXIT=0
```

E o diff do `app.js` é **1 hunk, `1 insertion(+) 1 deletion(-)`** — **só** a linha `var FROZEN = ...;`.
O `--check` compara **byte a byte** o `JSON.stringify(kpis-latest.json)` contra o que está no `app.js`
(scripts/kpi-freeze.mjs l.36–48): exit 0 significa que a cópia congelada foi **gerada**, não digitada.
**Nenhum número cravado no `app.js` divergindo do JSON** — o que o §C3.0 proíbe.

### 3.5 O `summary` conta o que o bloco NÃO fechou?

**Conta — e conta o caso nomeado.** O `summary` (5.637 caracteres) traz a seção declarada
*"O QUE ESTE BLOCO NAO FECHOU, dito antes que perguntem"*, com **3 itens**:

1. **A suíte de corrida do financeiro NÃO entrou na lista** — com o **porquê medido**
   (`tests/financial-entry-delete-reverse-race-db.test.ts` não existe na `main`; vive só em
   `feat/o6r-b02-financial-uow`, blob `e5295083`; a linha quebraria o `backend-postgres` no primeiro push),
   com **lugar reservado comentado no `ci.yml`**, **dono nomeado** (o PR que mergear o B-O6R-02) e a
   pendência `P-O6R-B02-SUITES-LIST-CI` declarada **ABERTA**.
2. O modo **sem `DATABASE_URL` continua VERMELHO** — publicado com **N, forma e causa**
   (`src/database/prisma.ts:12`; 2371 · fail 1 · skipped 58, idêntico em 2 execuções), classificado
   `pre-existente` com a pendência nomeada.
3. `P-SAN2-2-PORTA-55432-RESERVADA` (BAIXA), achado de terreno novo.

**Não é resumo que só narra vitória.** Ele publica um vermelho e um número pior (2371 · fail 1) ao lado do
número bom — o oposto de maquiar.

### 3.6 Dois achados MEUS neste item — ambos `nao-bloqueia`

**A-C4-1 — a contagem de arquivos do `summary` está defasada no head que vai mergear.**
O `summary` afirma: *"o PR toca **16 arquivos**: 2 de papel de agente, `ci.yml`, os 2 contratos, **9 de
`agent-orchestration/`**, `scripts/sync-agent-agents.mjs` e `tests/agents-mirror-guard.test.ts`"*.
Medido por mim:

```
$ git diff --name-only main...2e4985b | wc -l                          -> 16   (Fase 3, onde o KPI foi autorado)
$ git diff --name-only main...12ff986 | wc -l                          -> 25
$ git diff --name-only main...c8dc716 | wc -l                          -> 25   (head do PR)
$ git diff --name-only main...c8dc716 -- agent-orchestration/ | wc -l  -> 15   (nao 9)
```

A frase era **exata em `2e4985b`** e ficou falsa nos dois commits seguintes; a enumeração também **omite os
3 arquivos de `Kpis/`**. É staleness de contagem auto-referente (o KPI não consegue contar a si mesmo nem os
commits que vêm depois dele), **não fabricação**. Escopo `dentro-do-bloco` (texto escrito por este PR,
commit `12ff986` — único que toca `Kpis/` na branch); gravidade **`nao-bloqueia`**, porque a afirmação que
**sustenta o número** — `git diff ... -- frontend/ mobile/` VAZIO — eu **reexecutei no head atual e é
verdadeira**. Emenda sugerida: ancorar a contagem (*"16 arquivos medidos em `2e4985b`"*) ou remover o número
e manter só a prova do `frontend/ mobile/`.

**A-C4-2 — a pendência MÉDIA que o próprio bloco abriu não aparece na lista de não-fechados do `summary`.**
`P-SAN2-2-INDICE-DONO-SEMPRE-SIM` (**MÉDIA**, aberta — a coluna `dono` do índice diz "sim" para 91 de 108
registros cujo campo diz "a atribuir") foi criada **no mesmo commit `12ff986`** que escreveu o `summary`
(`git log -S"P-SAN2-2-INDICE-DONO-SEMPRE-SIM" main..HEAD -- .../pendencias.md` -> `12ff986`;
`pendencias.md:4345`). O `summary` lista a **BAIXA** (porta 55432) e **omite a MÉDIA**. Busca no texto:
`INDICE-DONO` -> não; `SEMPRE-SIM` -> não.

Por que **`nao-bloqueia`** e não `bloqueia`: o item **está declarado antes do voto** no §7.2 do briefing —
com severidade, dono, a razão de não ter sido consertado (fora do escopo permitido + *quem acha não
conserta*) e até a ironia registrada — **e está gravado em `pendencias.md` neste mesmo PR**. O painel está
**incompleto**, não **enganoso**: nada foi escondido da junta nem do sistema de registro, e nenhum número
publicado fica falso por causa disso. Escopo `dentro-do-bloco` (nasce em `12ff986`). Emenda sugerida:
acrescentar o 4º item à seção *"O QUE ESTE BLOCO NAO FECHOU"* — a MÉDIA merece o lugar que a BAIXA já tem.

### 3.7 Fora do meu escopo, conferido e registrado

- **§7.5 do briefing** ("Últimas demandas" 3 blocos atrás; `as_of` não renderizado): defasagem **anterior a
  este PR** e declarada antes do voto. Conferi que **este PR não a agrava**: o diff de `Kpis/app.js` é de
  1 linha e é só o `FROZEN`; nenhuma lógica de render foi tocada. Não julgo o que já estava defasado.
- **Observação (não é achado):** o `adv-npm-test.tap` grava a tríade de env e a data, mas **não grava a
  linha `head=`** que os outros dois gravam. A afirmação do KPI é sobre o **env** gravado dentro de cada
  arquivo, e o env está lá nos três; a identidade do head é reconstruível pelo conteúdo (mesmos 2609 /
  2550 / 59, mesmos 12 casos novos, mesmos 2 SKIPs nomeados). Fica anotado como assimetria de forma.
- **Terreno:** conferido por `docker ps` (leitura pura) que a `56432` é o container **`san2-2-pg`**
  (postgres:16), distinto do `erp-postgres` (5432) — a `DATABASE_URL` dos três TAPs aponta para o **par
  descartável**, como o KPI afirma. **Nada meu tocou `erp-postgres`/`erp-redis`. Nada commitado.**

### VEREDITO DO ITEM 3 — **CONFERE, com 2 achados `nao-bloqueia`** (A-C4-1 e A-C4-2), ambos
`dentro-do-bloco`, ambos com emenda de uma frase, nenhum deles falseando número publicado.

---

## ARMADILHAS DO §6 — como me defendi delas

- **§6.3 (`md5sum`/`git status` fabricam divergência sob `core.autocrlf=true`):** o único `md5sum` que usei
  foi sobre **TAPs no scratchpad** (arquivos fora do git, sem normalização de eol em jogo) e **para provar
  que os três diferem entre si**, nunca para afirmar que um conteúdo versionado mudou. Todo veredito sobre
  conteúdo versionado saiu de `git diff` / `git diff --numstat` / `git show <ref>:<arquivo>` — **eol-neutro**.
  Em nenhum momento tratei `git status` como prova de conteúdo alterado.
- **§6.5 (`grep -c $'\r'` é inútil no MSYS):** não usei. Não precisei contar CR: nada no meu mandato depende
  disso, e onde a questão era "mudou ou não", a régua foi `git diff`.
- **Números do briefing como afirmação, não fato:** recontei o TAP com parser próprio em vez de ler o
  rodapé `# pass`; reexecutei o teste novo, o freeze, o `node --check` e o guard do painel eu mesmo; e a
  declaração da ata sobre `4cd0867` só entrou depois de o `git log` a confirmar.
