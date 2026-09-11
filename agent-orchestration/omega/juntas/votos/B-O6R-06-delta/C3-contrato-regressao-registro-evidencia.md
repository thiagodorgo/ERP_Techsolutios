# C3 · contrato / regressão / registro — EVIDÊNCIA (junta do DELTA do `B-O6R-06`)

Identidade **NOVA** `jurado-06d-contrato-regressao-registro`. Nada herdado das seis identidades sepultadas
(OBITUÁRIO §3.4), do `planejador-mestre`, do `critico-adversarial`, do dev `general-purpose`, do
orquestrador-achador, do `porteiro-pos-merge`, do `inspetor-de-terreno-da-junta` nem da
`cadeira-permanente-backend-review`. **Nenhuma ata, plano, briefing ou parecer entrou como fato** — inclusive
os pareceres que eu **confiro** no item 3. **O mérito NÃO se rejulga** (aprovado 3×0; §C7.4 pune escalar sem
defeito). Cadeira **com veto**. Quórum: **unanimidade de 3** (não 5/5). O veto **não alcança** `pre-existente`.

## §0 · Terreno (medido por mim, nada herdado)

| | |
|---|---|
| **Head medido** | `gh pr view 385 --json headRefOid` -> **`e26eb9e5`** — nao `deff7bcc` (briefing) nem `764a3b04` (terreno) |
| `gh pr checks 385` (13:02Z, por mim) | **7/7 pass**, `ec=0` · `mergeable=MERGEABLE`, `mergeStateStatus=BEHIND` |
| Worktree proprio | `.claude/worktrees/o6r06d-jur-c3`, `--detach` em `e26eb9e5` |
| Node / npm / Python | **v20.19.5** / 11.7.0 / 3.13.14 |
| Cluster proprio | `o6r06d-jc3-pg` **:56701** (postgres 16.15-alpine, 107 migrations) · `o6r06d-jc3-redis` **:56702** |
| Portas | escolhidas DEPOIS de `netsh ...excludedportrange protocol=tcp` E `docker ps`; nao 5432, nao 55432, nao as do dev (56501/56502) |
| **Forma do reset** | **no BANCO**: `DROP DATABASE ... WITH (FORCE)` + `CREATE DATABASE` + `prisma migrate deploy`. `nspacl` = `{pg_database_owner=UC/pg_database_owner,=U/pg_database_owner}` nas TRES execucoes |
| `npm ci --no-audit --no-fund` | proprio, `ec=0` · `npx prisma generate` `ec=0` |
| Junction/symlink | **ausente** (node_modules real, instalado no worktree) |
| Pristino | `git status --porcelain` **VAZIO** antes e depois |
| `git clean` | **NUNCA usado**, em forma nenhuma |
| Base viva | `erp-postgres`/`erp-redis` **nao recebeu um comando**, nem de leitura |
| Fatia S0 | `node scripts/sync-agent-agents.mjs --check` -> **`ec=0`**, "OK — 35 agentes, espelho consistente" |

**Ancora divergente, medida e resolvida.** O briefing §0 do head manda **MECA VOCE MESMO** e avisa que o head
avanca a cada commit de registro. Medi `e26eb9e5`. O delta `deff7bcc..e26eb9e5` = 12 corpos de agente +
briefing + obituario: **zero `src/`, zero teste, zero `Kpis/`**.

**Reprovacao por construcao — o que eu NAO cobrei:** mudanca em `src/` (o conserto e zero-`src/` por desenho);
`prisma/**`, `mobile/**`, `.github/**`, `scripts/**` (inclusive o runner `run-backend-tests.mjs`);
`tests/o6r06-allocation-basis-rls-db.test.ts`; o ramo `completed` do `reconcile-checklist-usage.ts` (bloqueado
por `R2-A`); baixar `--test-concurrency`; o **assento permanente** (`§C7.1-quater`, norma inexistente na ref);
`P-O6R-SUITES-DB-SEM-TEARDOWN` (`pre-existente`). Tambem nao cobrei que a ata mantivesse a citacao falsa, nem
que a correcao anulasse o ato.

## §1 · ITEM 1 — Escopo §C4 por HASH DE ARVORE

### Os doze hashes — base `fe2748c8` x head `e26eb9e5`

| pasta | `fe2748c8:<pasta>` | `e26eb9e5:<pasta>` | |
|---|---|---|---|
| `src` | `7f626fbc12b4644e15fcdb2af58d7d5a450e925c` | `461cfa6be796bbb3ab1099e828804e31e38d6959` | DIFERE |
| `prisma` | `be98074af9123b1548406d5127ae8f0c07ebf177` | `be98074af9123b1548406d5127ae8f0c07ebf177` | **IGUAL** |
| `frontend` | `24be761ec4b5a46269d25b44a59e6cd4522c967a` | `24be761ec4b5a46269d25b44a59e6cd4522c967a` | **IGUAL** |
| `mobile` | `3a2ac02813c2c079296d7bac832cc57a2ff7d8a5` | `3a2ac02813c2c079296d7bac832cc57a2ff7d8a5` | **IGUAL** |
| `.github` | `638395976fc1e21006eded36197e9af4e65e4394` | `e98540f032df551def1c259b1af57994f8d8e5d9` | DIFERE |
| `scripts` | `08de36f3648fc80c3f85fc5450193dfffd58961d` | `3c690511e080ab9c39f8c60e7b00069f4ee85621` | DIFERE |

Os doze com `ec=0` — nenhuma pasta inexistente.

### Por que as tres diferencas NAO sao achado do delta — a decomposicao

`fe2748c8` e a **base comum dos DOIS lados** (confirmado: `git merge-base cc579302^1 cc579302^2` ->
`fe2748c84cc187a54ebe3fa651fcdc347c5b3494`). Esse diff soma tres parcelas: **merito aprovado 3x0** + **main
absorvida** + **delta**. Medi cada uma:

| pasta | `fe2748c8` (base) | `ab2540d0` (lado B06) | `1b8319f9` (lado MAIN) | `e26eb9e5` (head) |
|---|---|---|---|---|
| `src` | 7f626fbc | **461cfa6b** | 7f626fbc | **461cfa6b** |
| `.github` | 63839597 | **e98540f0** | 63839597 | **e98540f0** |
| `scripts` | 08de36f3 | 08de36f3 | **3c690511** | **3c690511** |

### O corte que responde a pergunta: `0f0a872a` (head julgado no merito) x `e26eb9e5` (head do delta)

| pasta | `0f0a872a:<pasta>` | `e26eb9e5:<pasta>` | |
|---|---|---|---|
| `src` | `461cfa6be796bbb3ab1099e828804e31e38d6959` | `461cfa6be796bbb3ab1099e828804e31e38d6959` | **IGUAL** |
| `prisma` | `be98074af9123b1548406d5127ae8f0c07ebf177` | `be98074af9123b1548406d5127ae8f0c07ebf177` | **IGUAL** |
| `frontend` | `24be761ec4b5a46269d25b44a59e6cd4522c967a` | `24be761ec4b5a46269d25b44a59e6cd4522c967a` | **IGUAL** |
| `mobile` | `3a2ac02813c2c079296d7bac832cc57a2ff7d8a5` | `3a2ac02813c2c079296d7bac832cc57a2ff7d8a5` | **IGUAL** |
| `.github` | `e98540f032df551def1c259b1af57994f8d8e5d9` | `e98540f032df551def1c259b1af57994f8d8e5d9` | **IGUAL** |
| `scripts` | `08de36f3648fc80c3f85fc5450193dfffd58961d` | `3c690511e080ab9c39f8c60e7b00069f4ee85621` | difere -> da main |

`scripts` difere porque a MAIN o trouxe, nao o delta — tres medicoes independentes:

- `git rev-parse 1b8319f9:scripts` = `3c690511...` = `git rev-parse e26eb9e5:scripts` -> head == main absorvida
- `git diff --numstat 1b8319f9 e26eb9e5 -- scripts/` -> **VAZIO**
- `git diff --numstat fe2748c8 1b8319f9 -- scripts/` -> `668  0  scripts/audit-agents-skills.mjs` (a main criou)
- `git diff --numstat cc579302 deff7bcc -- scripts/` -> **VAZIO** (o conserto nao tocou)

> **CONCLUSAO DO ITEM 1: o DELTA tocou ZERO das seis pastas proibidas.** `src`/`.github` diferem da base comum
> por conta do **merito ja aprovado 3x0**; `scripts`, por conta da **main absorvida**.

### Os dois alvos nominais

**`tests/o6r06-allocation-basis-rls-db.test.ts`** — proibido no delta:

- `git diff --numstat 0f0a872a e26eb9e5 -- <arq>` -> **VAZIO**
- blob **identico** em `0f0a872a` · `deff7bcc` · `764a3b04` · `e26eb9e5` = `91838f4d3ff8e906d0f689bd82713f112c9db7f8`
- em `fe2748c8` nao existe — informacao, nao erro: quem o criou foi o merito.

**`package.json` / `package-lock.json`**:

| ref | `package.json` | `package-lock.json` |
|---|---|---|
| `fe2748c8` | `e572e072283b4cfb2b5df4aa0a0980010b4a4002` | `9039d1e8fc85cf17b6123a28f643a8ff9d37f7cd` |
| `0f0a872a` | idem | idem |
| `e26eb9e5` | idem | idem |

`--numstat` **VAZIO** nos dois cortes. **ZERO dependencia nova, ZERO linha de lockfile, nenhum passo de deploy
no delta -> o quorum NAO muda: permanece unanimidade de 3.**

### A reciproca — o que o delta DE FATO escreveu, confrontado com o permitido §5

§5 lido no head (`BRIEFING-B-O6R-06-delta.md:104-108`): PERMITIDO = `tests/o6r06-cost-summary-sum-db.test.ts` ·
`tests/helpers/o6r06-cost-fixtures.ts` · `tests/o6r06-janela-reservada-guard.test.ts` · `Kpis/*` ·
`agent-orchestration/**`.

**(a) Merge `cc579302` — a resolucao dos conflitos.** `git diff-tree --cc --name-only cc579302` devolve
**exatamente 6 arquivos**, que sao exatamente os seis conflitos declarados:

    Kpis/app.js
    Kpis/kpis-history.json
    Kpis/kpis-history.md
    Kpis/kpis-latest.json
    agent-orchestration/controle/pendencias.md
    agent-orchestration/docs/status-geral.md

**Todos dentro do permitido §5.** (O `--cc` mostra so o que difere de AMBOS os pais — e a resolucao real.)

**(b) Conserto `cc579302..deff7bcc`** — 12 arquivos, `git diff --numstat`:

    177  16  tests/o6r06-cost-summary-sum-db.test.ts
     25   0  tests/helpers/o6r06-cost-fixtures.ts
    132   0  tests/o6r06-janela-reservada-guard.test.ts      (A)
      1   1  Kpis/app.js
      1   1  Kpis/kpis-history.json
      4   4  Kpis/kpis-latest.json
     30  10  agent-orchestration/controle/pendencias-indice.md
     81   2  agent-orchestration/controle/pendencias.md
     43   0  agent-orchestration/docs/status-geral.md
     23   1  agent-orchestration/omega/juntas/J-B-O6R-06.md
     61   0  .../votos/REGULARIZACAO-382-383-384/00-parecer-incremental-p2.md   (A)
    176   0  .../votos/REGULARIZACAO-382-383-384/01-parecer-porteiro.md          (A)

`git diff --numstat cc579302 deff7bcc -- src/ prisma/ frontend/ mobile/ .github/ scripts/ package.json package-lock.json`
-> **VAZIO**. **Zero linha de `src/`, confirmado por medicao.** Os tres arquivos de `tests/` sao exatamente os
tres do §5.

**(c) `deff7bcc..764a3b04..e26eb9e5`** — 12 corpos `jurado-06d-*` (`.claude/agents/especialistas/` + espelho
`.agents/agents/especialistas/`), `BRIEFING-B-O6R-06-delta.md`, `OBITUARIO-IDENTIDADES.md`. -> achado C3-A1.

### As DUAS pontas

- **Commitado:** os hashes de arvore acima.
- **Arvore de trabalho:** `git status --porcelain` no meu worktree -> **VAZIO**, antes e depois das 3 execucoes.
- **Fantasmas conferidos por BLOB** (nunca `md5` cru sob autocrlf): `planejador-mestre.md` `151bf048` ·
  `porteiro-pos-merge.md` `00d75b02` · `sync-agent-agents.mjs` `093a6b93` — `git hash-object` do disco
  **identico** ao `git rev-parse e26eb9e5:<f>`. **Nao e mutacao viva.**
- **Worktree do dev `b06`** (so leitura): `?? agent-orchestration/omega/juntas/votos/B-O6R-06-delta/` — e o
  diretorio de votos desta junta, onde C1/C2 ja escreveram. Nao e mutacao de codigo. **Worktrees alheios
  (`gov-elenco`, `gov-descuido`) intactos.**

### Absorcao provada por ARVORE, nao por `--is-ancestor`

- `git merge-base cc579302^1 cc579302^2` -> `fe2748c8...` — `fe2748c8` e a base comum real dos dois lados
- `git log -1 --format="%H %P" cc579302` -> pais `ab2540d0` + `1b8319f9`
- `git merge-base e26eb9e5 1b8319f9` -> `1b8319f9`
- **Prova por arvore (o instrumento que nao mente sob squash):** `prisma`, `frontend`, `mobile` e `scripts` no
  head sao **byte-identicos** aos de `1b8319f9`. `git diff --name-status 1b8319f9 e26eb9e5` = 86 arquivos, e os
  unicos fora de `.claude/`, `.agents/`, `agent-orchestration/`, `Kpis/`, `tests/` sao 13 de `src/` + `ci.yml` +
  `API_CONTRACTS.md` + 3 de `docs/` — **todos do merito**, ja que `src` e `.github` sao identicos a `0f0a872a`.

> **ERRO MEU, medido, corrigido e registrado.** Minha primeira varredura de absorcao comparou
> `git rev-parse <rev>:<path>` com `2>/dev/null` e produziu **30 falsos DIVERGE**: `git rev-parse` **ecoa o
> argumento literal no stdout** quando o caminho nao existe, e `1b8319f9:x` != `e26eb9e5:x` como string. E a
> armadilha n. 3 do meu proprio mandato, e eu cai nela. Refiz com `git diff --name-status` + `git ls-tree` (os
> instrumentos prescritos): os 30 arquivos estao **ausentes nos dois lados** — a main os deletou (#381, elenco
> enxuto) e o head tambem. **Nenhum achado sobreviveu a correcao.**

**VEREDITO PARCIAL ITEM 1: PASSA.**

## §2 · ITEM 2 — KPI por REEXECUCAO

### 2(a) `backend_tests` = 2995/2997

**A pergunta explicita do mandato: a forma publicada INCLUI "banco recriado antes de cada execucao"? -> SIM.**
Trecho LITERAL de `metrics.backend_tests.note` no head:

> "EXECUCAO REAL DESTE PR, N=3, TRES RESULTADOS IDENTICOS. FORMA CANONICA declarada, e a declaracao inclui o
> passo que a autoria OMITIA: `npm test` (= `node scripts/run-backend-tests.mjs`) com o **BANCO RECRIADO ANTES
> DE CADA EXECUCAO** (`DROP DATABASE ... WITH (FORCE)` + `CREATE DATABASE` + `prisma migrate deploy`),
> `DATABASE_URL`/`REDIS_URL` apontando para cluster descartavel PROPRIO [...], `CORE_SAAS_PERSISTENCE=memory`
> (a forma do job `backend` do CI, `ci.yml:16`) e `RBAC_DB_PARITY` ausente. Resultado literal nas TRES: 2997
> teste(s) - pass 2995 - fail 0 - skipped 2, `ec=0` lido do processo e nunca depois de pipe."

Conferi a forma do CI: `ci.yml` job `backend`, bloco `env:` l.14-21, **l.21 `CORE_SAAS_PERSISTENCE: memory`**
(a note cita `:16`, que e o `REDIS_URL` — divergencia de CITACAO DE LINHA, nao de forma).

**MINHA REEXECUCAO — N=3, forma declarada, `ec` lido POR VARIAVEL do processo, contagens do TAP NO ARQUIVO:**

| N | reset antes de cada uma | `nspacl` medido | `MIGRATE_EC` | `NPMTEST_EC` | TAP no arquivo | `not ok` |
|---|---|---|---|---|---|---|
| **1** | DROP DATABASE FORCE + CREATE + migrate deploy | `{pg_database_owner=UC/pg_database_owner,=U/pg_database_owner}` | 0 | **0** | `# tests 2997 · # pass 2995 · # fail 0 · # skipped 2` | **0** |
| **2** | idem | idem | 0 | **0** | `# tests 2997 · # pass 2995 · # fail 0 · # skipped 2` | **0** |
| **3** | idem | idem | 0 | **0** | `# tests 2997 · # pass 2995 · # fail 0 · # skipped 2` | **0** |

Env: `CORE_SAAS_PERSISTENCE=memory`, `RBAC_DB_PARITY` **ausente** (unset),
`DATABASE_URL=postgresql://postgres:postgres@localhost:56701/erp_jc3?schema=public`,
`REDIS_URL=redis://localhost:56702`.

> **O numero REPRODUZ no meu cluster, sob a forma declarada, em N=3 — tres resultados identicos, exatamente o
> N que a note declara.** `2995/2997` com `skipped: 2` confirmado. E o `nspacl` volta ao valor correto nas
> tres, provando que o reset foi **no BANCO** e nao no schema: nenhum `42501`, o alarme falso do §8.3 nao se
> reproduziu porque a forma esta certa.

**Os nomes dos 2 pulados, lidos do TAP no ARQUIVO** (`npmtest_1.log:11226` e `:11231`):

    ok 2026 - toda permissao do catalogo existe na tabela permissions do banco
              # SKIP RBAC_DB_PARITY nao e "1": ... so e ligada no job backend-postgres do CI.
    ok 2027 - os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direcoes)
              # SKIP RBAC_DB_PARITY nao e "1": ...

Sao **exatamente os 2 do orcamento do runner** (`permission-catalog-db-parity`). **Auto-pulo silencioso:
nenhum.** `skipped: 2` no `latest.json` confere. `not ok` = **0** nas tres execucoes.

**Classe A-2 no `backend_tests.note`:** a nota diz "EXECUCAO REAL DESTE PR" e a execucao E deste PR — nao
carrega bloco anterior em primeira pessoa. **Passa.** Para as trilhas nao tocadas, ver C3-A2.

**Trilhas NAO tocadas — prova medida nas DUAS pontas:**

- **Commitado:** `mobile` tree `3a2ac028` e `frontend` tree `24be761e` IDENTICAS entre `0f0a872a` e `e26eb9e5`.
- **Arvore:** `git status --porcelain` VAZIO.
- **§C3.3 (nota explicita no history):** a entrada 157 (`B-O6R-06`) do `kpis-history.json` carrega, literal:
  "flutter_tests e frontend_smoke_tests CARREGADOS com marcador (§C3.3): o PR nao toca `mobile/` nem
  `frontend/` — prova medida nas DUAS pontas (`git diff --name-only origin/main...HEAD` e
  `git status --porcelain`, ambos VAZIOS)". **§C3.3 satisfeito no history.**

### 2(b) `blocks_completed` = 163 e a reconciliacao da colisao

**Medido por mim, ref a ref** (`git show <ref>:Kpis/kpis-latest.json`):

| ref | papel | `blocks_completed.value` |
|---|---|---|
| `fe2748c8` | base comum dos dois lados | **161** |
| `ab2540d0` | lado `B-O6R-06` (pre-merge) | **162** |
| `1b8319f9` | lado `origin/main` (#381 `-ENXUTO`) | **162** |
| `cc579302` | o merge | **163** |
| `e26eb9e5` | head | **163** |

**A colisao e real e a reconciliacao e aritmeticamente correta**: dois blocos distintos subindo o MESMO degrau
a partir de 161; ficar com qualquer lado publicaria 162 e sumiria com um bloco entregue. A note do head
descreve exatamente isso — e **eu reproduzi cada numero**, nao adivinhei nenhum.

**A serie no `kpis-history.json` (158 entradas), na ordem DO ARQUIVO:**

| pos | `snapshot_date` | bloco | `blocks_completed` | `pr` |
|---|---|---|---|---|
| 154 | 2026-09-06 | `B-O6R-07b` | 161 | 380 |
| 155 | 2026-09-08 | `B-GOV-ELENCO` | **161** | `null` |
| 156 | 2026-09-08 | `B-GOV-ELENCO-ENXUTO` | 162 | 381 |
| 157 | 2026-09-08 | `B-O6R-06` | **163** | `null` |

**161 -> 161 -> 162 -> 163.** Varredura programatica da serie INTEIRA: **violacoes de monotonicidade = 0** ·
**datas fora de ordem = 0**. O `B-GOV-ELENCO` (SEM `-ENXUTO`) **nao move** o acumulado e fica no history como
registro, com `pr: null` — correto, ele nao mergeou.

**A redatacao e a reordenacao, medidas nas duas pontas do merge:**

| ref | posicao | data | `blocks_completed` |
|---|---|---|---|
| `ab2540d0` (antes do merge) | **155** | **2026-09-07** | 162 |
| `cc579302` / `e26eb9e5` (head) | **157** | **2026-09-08** | 163 |

**Redatada** (09-07 -> 09-08) **e reordenada** (pos 155 -> 157, agora DEPOIS das duas entradas GOV, como manda
a cronologia real de merge). **A redatacao nao inverteu a cronologia de nenhuma outra entrada**: 0 datas fora
de ordem nas 158, e as posicoes 152-154 seguem intactas.

**Backfill do #380, medido:** head pos 154 `merge_commit = fe2748c84cc187a54ebe3fa651fcdc347c5b3494` (hash
COMPLETO) — identico a entrada da main; o lado B06 trazia o curto `fe2748c`. A entrada do 07b veio da **main
verbatim**, como declarado.

**A note credita a ressalva 1 do parecer da `cadeira-permanente-backend-review`?** SIM, cita
`votos/B-O6R-06/99-cadeira-permanente.md`. **O arquivo EXISTE nos autos** (`git ls-tree`, 285 l.), com
`99-cadeira-permanente-medicoes.md` (262 l.). **Confiro que o parecer esta nos autos; NAO adoto as conclusoes
dele** — e nao cobro o assento permanente como requisito de validade desta junta.

### 2(c) A copia `var FROZEN` e os guards

| medicao | comando | `ec` | resultado |
|---|---|---|---|
| freeze | `node scripts/kpi-freeze.mjs --check` | **0** | `kpi-freeze: em dia (snapshot 2026-09-08).` |
| guard do painel | `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **0** | `# tests 16 · # pass 16 · # fail 0 · # skipped 0` |
| guard de paridade | `node --test --import tsx tests/kpi-achados-paridade.test.ts` | **0** | `# tests 6 · # pass 6 · # fail 0 · # skipped 0` |
| sintaxe | `node --check Kpis/app.js` | **0** | — |
| whitespace | `git diff --check` (arvore de trabalho, forma da bateria §9) | **0** | limpo |

**O diff de `Kpis/app.js` e SO a linha `var FROZEN`? SIM.**

- `git diff --numstat 0f0a872a e26eb9e5 -- Kpis/app.js` -> **`1  1`**
- `git diff -U0` filtrado pelos prefixos +/- (fora de `+++`/`---`) -> exatamente 2 linhas:
  `-var FROZEN = {"snapshot_date"...` / `+var FROZEN = {"snapshot_date"...`
- por trecho: `0f0a872a..cc579302` = `1 1` · `cc579302..deff7bcc` = `1 1` · `deff7bcc..764a3b04` = **vazio** ·
  `764a3b04..e26eb9e5` = **vazio**

**Nenhum outro numero cravado no `app.js` divergindo do JSON.** E o `--check` do freeze `ec=0` prova que a
copia congelada NAO diverge do JSON — o painel nao mente offline.

`git diff --check 0f0a872a e26eb9e5` (entre commits) -> `ec=2`, **1** aviso:
`agent-orchestration/omega/juntas/votos/B-O6R-06/C1-banco-rls-evidencia.md:359: new blank line at EOF`
-> achado C3-A3, `pre-existente`.

**VEREDITO PARCIAL ITEM 2: PASSA** (com C3-A2 como ajuste nao bloqueante).

## §3 · ITEM 3 — Registro (cinco sub-itens, cada um conferido nos autos)

### 3(a) Parecer de regularizacao #382/#383/#384 — ESTA NOS AUTOS

`git ls-tree -r e26eb9e5 -- agent-orchestration/omega/juntas/votos/REGULARIZACAO-382-383-384/`:

- `00-parecer-incremental-p2.md` — 61 linhas
- `01-parecer-porteiro.md` — 176 linhas

**Cobre os tres**, por contagem de ocorrencias REAIS (`grep -o | wc -l`, nao `grep -c`, que conta linhas):
`#382` = **11** · `#383` = **13** · `#384` = **13**.

**Vereditos** (l.157/159/162): **#382 — LIBERADO COM RESSALVA** · **#383 — LIBERADO COM RESSALVA** ·
**#384 — LIBERADO COM RESSALVA**. E: "**O repositorio esta DESTRAVADO para comecar bloco novo.**"

**Os tres no `status-geral.md` do head:** `#382` = 4 · `#383` = 5 · `#384` = 4 ocorrencias, com secao dedicada
em l.4288: "## 2026-09-09 — #382, #383 e #384 registrados a posteriori, e o parecer de regularizacao que os
cobriu".

**O que ele COBROU para a proxima demanda** (l.172-176) — daqui sairam literalmente os meus (b) e (c):

1. **rodar o gerador e commitar `pendencias-indice.md`;**
2. **corrigir as linhas `status:` das duas pendencias fechadas e trocar `REBAIXADA` por vocabulario legivel**,
   baixando a severidade do cabecalho do `INSPETOR-33` como o #382 prometeu;
3. registrar #382/#383/#384 no `status-geral.md` e dar ID e registro ao #384;
4. reabrir ou reescopar `P-GOV-CAMINHO-REPO-SESSAO`;
5. fechar `P-GOV-INSPETOR-33-SEM-NORMA`.

### 3(b) As DUAS linhas de `status:` — CORRIGIDAS

Comparei o head contra `1b8319f9` (a main que o parecer mediu):

| pendencia | em `1b8319f9` (o defeito medido) | no head `e26eb9e5` | |
|---|---|---|---|
| **`P-GOV-WORKTREES-NAO-IGNORADAS`** | `- **status:** ABERTA · **severidade:** MEDIA` | `- **status:** FECHADA · **severidade:** MEDIA` | **CORRIGIDA** |
| **`P-GOV-INSPETOR-33-SEM-NORMA`** | `- **status:** REBAIXADA · **severidade:** BAIXA (era ALTA)` | `- **status:** ABERTA · **severidade:** BAIXA (rebaixada de ALTA em 2026-09-08)` | **CORRIGIDA** |

- O **cabecalho** da primeira diz "FECHADA POR NAO-REPRODUCAO em 2026-09-08 — era FALSA"; a linha canonica
  agora diz **FECHADA** -> **linha e cabecalho concordam**, e a regra do gerador (a linha vence o cabecalho)
  deixa de produzir contradicao.
- **`REBAIXADA`** — palavra FORA do vocabulario (`FECHAD|RESOLVID|DESCARTAD|DECIDID|ABERT`) — **saiu**. O head
  usa **ABERTA**, dentro do vocabulario, com a severidade **BAIXA** que o #382 prometeu, e a razao da reducao
  preservada em texto livre, onde nao quebra o parser.

**Terceira, conferida por completude:** `P-GOV-CAMINHO-REPO-SESSAO` no head = `- **status:** ABERTA ·
**severidade:** ALTA`, e o cabecalho **nao** declara fechamento -> **sem contradicao**, e atende a cobranca 4
(reabrir). **Vocabulario dentro do permitido nas tres.**

### 3(c) O indice — RODEI O GERADOR (nao grepei o codigo dele)

Copiei para o **scratchpad**, com o layout relativo que o gerador espera
(`P = agent-orchestration/controle/pendencias.md`, `O = .../pendencias-indice.md`, relativos ao CWD), e
**conferi por BLOB antes de rodar** — nada de `md5` cru sob `autocrlf`:

| arquivo | `git rev-parse e26eb9e5:<p>` | `git hash-object <copia no scratch>` | |
|---|---|---|---|
| `pendencias.md` | `3d3281c7d47035944029daae0b0a370a90707dee` | `3d3281c7d47035944029daae0b0a370a90707dee` | **identico** |
| `gerar-indice-pendencias.py` | `53e94d89b255f813c736ae66c4a9dd458fea86a6` | `53e94d89b255f813c736ae66c4a9dd458fea86a6` | **identico** |
| `pendencias-indice.md` (commitado) | `671cea9f8332ce1316626f290970ab8a709b34d6` | `671cea9f8332ce1316626f290970ab8a709b34d6` | **identico** |

**Execucao:** `cd <scratch> && python agent-orchestration/controle/gerar-indice-pendencias.py` -> **`ec=0`**.

**Saida (stdout) do gerador, literal:**

    indice: 308 cabecalhos / 297 IDs | {FECHADA: 70, ABERTA: 236, SEM-STATUS: 2}
          | baldes {-: 70, C: 76, B: 97, A: 63, ?: 2} | diferidas-materiais 1

**A COMPARACAO QUE DECIDE — saida do gerador x arquivo commitado:**

    saida do gerador : 671cea9f8332ce1316626f290970ab8a709b34d6
    indice commitado : 671cea9f8332ce1316626f290970ab8a709b34d6

> **BYTE-IDENTICOS. O `pendencias-indice.md` commitado e EXATAMENTE a saida do gerador — nao esta defasado.**
> Bate com o declarado: **308 cabecalhos / 297 IDs · 236 abertas · balde A 63**.

- **Regra 4 (`CONTRADITORIA`)** — o gerador **emite** a secao (l.55: "## CONTRADITORIAS — cabecalho e linha de
  status se opoem — 0") e conta **0**. E aqui o 0 e **honesto, nao o zero invisivel** que o parecer descreveu:
  as duas linhas que produziam a oposicao foram corrigidas em 3(b), entao a contradicao **deixou de existir na
  fonte**, nao no detector.
- **Regra 6 (`DIFERIDO-LEVE` continua ABERTA)** — presente no cabecalho gerado (l.24: "**DIFERIDO-LEVE** e
  agendamento, nao status — diferida **continua ABERTA**") e **aplicada**: balde C com **76** entradas,
  contadas DENTRO das 236 ABERTAS ("— das quais diferidas (balde C) | 76"), e 160 ativas nesta rodada.
- **SEM STATUS = 2** — `P-GOV-NOTA-KPI-CONGELADA` (l.7699) e `P-GOV-BAIXA-CICLO1-FECHADOS` (l.7724).
  **Origem medida por presenca**, ref a ref -> achado C3-A4 (`pre-existente`, vieram da main).

**Teardown do gerador: a saida ficou no scratchpad. NAO regenerei o arquivo do repositorio** — seria consertar
o que estou julgando (§C7.4-bis) e sujaria a arvore que o inspetor mede.

### 3(d) O obituario §3.4 — COMPLETO

`agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` (178 l.), secao
"### 3.4 Caso B-O6R-06 — durabilidade do faturavel · junta concluida 2026-09-07 · APROVADO 3x0 · PR #385" (l.148).

- **As seis, todas `SEPULTADA`, com CLASSE:**
  - `votou` — `jurado-06-banco-atomicidade-rls` · `jurado-06-invariante-financeiro-rateio` ·
    `jurado-06-contrato-regressao-kpi`
  - `nomeada-e-preparada` — `jurado-06-suplente-banco-atomicidade-rls` ·
    `jurado-06-suplente-invariante-financeiro-rateio` · `jurado-06-suplente-contrato-regressao-kpi`
- **EVIDENCIA por identidade** (voto + evidencia + ata + briefing com linha).
- **COMMIT DE NASCIMENTO `e35492ef` (2026-09-07)** nas seis — **confirmei de forma independente**:
  `git log --diff-filter=A` -> `e35492ef ... 2026-09-07 feat(junta): as tres cadeiras do B06 + suplentes`.
- **PLACAR atualizado:** l.32 -> "| **SEPULTADAS** | **21** (6 do B-O6R-ARNES + 9 do B-O6R-02 ciclo 4 + 6 do
  B-O6R-06) |".
- **DIVIDA DECLARADA**, literal: "O §1.5 manda a linha entrar **no mesmo PR em que a junta fecha**. A junta
  fechou em `005b522c` e as seis linhas **nao** entraram — omissao do orquestrador."

**As identidades DESTA junta estao no obituario? -> NAO.** Enumerei **por presenca** as **27** identidades
nomeadas no arquivo inteiro; nenhuma e `jurado-06d-*`. Contagem nominal: as seis `jurado-06d-*` = **0
ocorrencias** cada. **Controle positivo:** as tres `jurado-06-*` titulares = 1 cada, presentes.
**A junta e validamente composta — nao e invalida antes de votar.**

### 3(e) A fundamentacao da ata — CORRIGIDA, com a distincao preservada

`agent-orchestration/omega/juntas/J-B-O6R-06.md` (258 l.), **§9** (l.150). Ocorrencias de "quater" na ata
inteira: **1**, e e a propria correcao — **nenhuma citacao falsa remanescente**.

> "**CORRECAO DE FUNDAMENTACAO (2026-09-09), feita antes do PR e nao depois de cobrada.** Esta secao citava o
> **§C7.1-quater** como base normativa. Medido depois: **essa secao nao existe em ref nenhuma** [...] Ela
> existe so em `origin/chore/gov-elenco-fatia-b` / `25c0112a`, a branch cujo desenho foi reprovado em duas
> juntas e nunca mergeou. [...] **A convocacao continua valida** — ela foi **determinacao escrita do dono** em
> 2026-09-08 [...], e decisao do dono e fonte §A1.1, acima do contrato escrito. **O que era invalido era a
> CITACAO, nao o ATO.** [...] **Nenhum merge fica condicionado a ela.**"

**O ato foi preservado; a citacao foi corrigida. E exatamente a distincao que o mandato exige, e e
suficiente.** Uma correcao que anulasse o ato seria tao errada quanto a citacao falsa; cobrar a volta da
citacao seria reprovacao por construcao. **Nao cobrei nenhuma das duas.**

### §3-bis · Os papeis do §C7.4-bis, conferidos POR PROVA, nao por declaracao

Briefing do delta **§3** (l.62-72), "registro verificavel, nao declaracao de orquestrador":

| papel | quem | prova declarada | **minha medicao** |
|---|---|---|---|
| **ACHOU** | o orquestrador | `metrics.backend_tests.note` (5 execucoes sujas, N e forma) | **CONFERE** — li a note: "medi 5 execucoes consecutivas contra o mesmo banco e tive 5 vermelhos, em QUATRO familias diferentes [...] com 1, 1, 2 e 4 falhas", com as duas hipoteses refutadas por execucao |
| **PLANEJOU** | 4 planejadores + 4 criticos | plano em scratchpad; prescricao reproduzida no §4 | §4 **esta** nos autos; o plano bruto **nao** -> C3-A5 (nota) |
| **DESENVOLVEU** | `general-purpose` que NAO achou e NAO planejou | os 3 arquivos em `deff7bcc` | **CONFERE** — `cc579302..deff7bcc` toca exatamente `tests/o6r06-cost-summary-sum-db.test.ts`, `tests/helpers/o6r06-cost-fixtures.ts`, `tests/o6r06-janela-reservada-guard.test.ts` |
| **JULGA** | as tres cadeiras NOVAS | este briefing | **CONFERE** — §1 do briefing nomeia C1/C2/C3 + suplentes, todas `jurado-06d-*`, nenhuma no obituario |

A **ata §1** registra a tabela de papeis do merito ("Cinco papeis, cinco identidades") e o **§7** responde as
tres perguntas obrigatorias do §C7.4-bis — inclusive "(b) Quem achou e quem consertou? **Nao.**"
**Ata com os papeis registrados -> §C7.4-bis satisfeito; o ciclo nao e invalido por essa via.**

**VEREDITO PARCIAL ITEM 3: PASSA.**

## §4 · Achados

| # | propriedade ausente | gravidade | escopo | evidencia de data/origem |
|---|---|---|---|---|
| **C3-A1** | 12 corpos `jurado-06d-*` em `.claude/agents/especialistas/` + espelho estao **fora da lista literal do §5** (nem permitidos, nem proibidos) | **baixa** | dentro-do-bloco | `764a3b04`, 2026-09-09. **Nao bloqueia:** sao as identidades que ESTA junta exigiu na 1a passada (B1) e sem as quais ela nao pode existir — as seis anteriores estao sepultadas; tocam **zero** pasta proibida; e o §1 do proprio briefing declara a criacao. Cobrar isso seria reprovar a junta pelo conserto que ela mesma ordenou |
| **C3-A2** | `kpis-latest.json`: **5** trilhas nao tocadas (`flutter_tests`, `frontend_smoke_tests`, `flutter_modules`, `mobile_backend_contracts`, `mobile_core_saas_contracts`) **perderam o marcador `[B-O6R-06: ...]`** na reconstrucao do merge — o ULTIMO marcador de cada uma passou a ser `B-GOV-ELENCO-ENXUTO`, o bloco anterior | **media** | dentro-do-bloco | medido nas duas pontas do merge: em `ab2540d0` o ultimo marcador ERA `B-O6R-06`; em `e26eb9e5` a string `B-O6R-06` **nao aparece** nessas notas. **Nao bloqueia:** o §C3.3 exige a nota NO HISTORY, e a entrada 157 a tem, completa e com prova nas duas pontas; os valores estao corretos (medi `mobile`/`frontend` identicos); e as notas dizem CARREGADO / "descreve execucao de bloco anterior, NAO deste PR" — **nao ha afirmacao em primeira pessoa falsa** |
| **C3-A3** | `.../votos/B-O6R-06/C1-banco-rls-evidencia.md:359` — `new blank line at EOF` no `git diff --check` entre commits | **baixa** | **pre-existente** | nasceu em `cae4305a`, **2026-09-07** (`git log --diff-filter=A`), voto da junta ORIGINAL; `--numstat` **vazio** nos tres trechos do delta. Bloco dono: `B-O6R-06` (merito). `git diff --check` da ARVORE = `ec=0` |
| **C3-A4** | 2 pendencias **SEM STATUS** (`P-GOV-NOTA-KPI-CONGELADA`, `P-GOV-BAIXA-CICLO1-FECHADOS`) — o gerador as reporta e **nao chuta** | **baixa** | **pre-existente** | presenca ref a ref: **ausentes** em `fe2748c8` e em `ab2540d0` (lado B06), **presentes** em `1b8319f9` (main absorvida) -> vieram da MAIN. Bloco dono: #382/#383 (2026-09-07/08) |
| **C3-A5** | o plano dos 4 planejadores + 4 criticos vive em **scratchpad**, nao nos autos; so a prescricao (§4) e auditavel | **baixa** | dentro-do-bloco | briefing §3 l.67. **Nao bloqueia:** o §C7.4-bis exige que a ata registre QUEM ocupou cada papel — e registra; a prescricao esta reproduzida e e conferivel |

**Nenhum achado `bloqueia`. Nenhum achado `dentro-do-bloco` de gravidade que reprove.**

## §5 · O que NAO medi, e por que (cadeiras nomeadas)

- **F1 deterministica, F2 (o par), a janela reservada nas duas direcoes, o teardown por `SELECT count(*)`, o
  vermelho-controle no head intocado** -> cadeira **C1**, `jurado-06d-banco-atomicidade-rls`.
- **`src/` intocado provado por MUTACAO, o ataque a isca, a ARITMETICA do delta (+54 autoria + 5 conserto =
  +59)** -> cadeira **C2**, `jurado-06d-invariante-financeiro-rateio`. Eu medi o delta so como REEXECUCAO: o
  absoluto 2997 reproduz; a decomposicao e dela.
- **As sete afirmacoes [A RE-VERIFICAR] do §7** (unidade faturavel na mesma transacao; trilha 0->0;
  `meterCompletion` obrigatorio e o `tsc` recusando um 4o chamador; soma no banco sem teto; 18/20 mutacoes
  vermelhas) — **nenhuma entrou como fato no meu parecer, e nenhuma reprova o delta.**
- **Nao li os votos de C1 nem de C2** — voto de outra cadeira nao e evidencia da minha.

## §6 · Ressalvas sobre mim mesmo, declaradas

1. **Cai na armadilha n. 3 do meu proprio mandato** (`git rev-parse <rev>:<caminho>` ecoando o argumento no
   stdout quando o caminho nao existe) e fabriquei **30 falsos DIVERGE** na primeira varredura de absorcao.
   Detectei ao investigar um caso concreto, refiz com o instrumento prescrito (`git diff --name-status` +
   `git ls-tree`), e **nenhum achado sobreviveu**. Registro porque conclusao sem o comando que a produziu nao
   e insumo — e porque a classe "a ferramenta que responde QUASE a pergunta" ja foi medida 5 vezes nesta casa.
2. **Tres ancoras do meu briefing estavam desatualizadas** (head `deff7bcc` no briefing; `764a3b04` no
   terreno). Medi **`e26eb9e5`** e voto sobre ele. O briefing §0 MANDA medir — nao e defeito do delta, e o §A7
   funcionando. Registro para que ninguem cite em ata um head que nao e o do PR.
3. **O `note` cita `ci.yml:16`** para `CORE_SAAS_PERSISTENCE`; a linha e a **21** (l.16 e `REDIS_URL`). A
   FORMA esta certa e e a do job `backend`; so a citacao de linha esta deslocada. Nota de precisao, nao
   achado — nao altera nenhum numero.
4. **CI reexecutado por mim** as 13:02Z: **7/7 pass**, `ec=0`. Nao herdei o 7/7 declarado. Registro que o PR
   esta **BEHIND** em relacao a `origin/main` (`a01fc014`; o head absorve ate `1b8319f9`) — e condicao de
   merge (§8.5), nao de voto; e medi que `git diff --numstat e26eb9e5...origin/main -- Kpis/` nao muda o
   quadro da colisao de `blocks_completed` para esta junta.

## §7 · Teardown

- **Criei:** worktree `.claude/worktrees/o6r06d-jur-c3` (detached em `e26eb9e5`); containers `o6r06d-jc3-pg`
  (:56701) e `o6r06d-jc3-redis` (:56702); banco `erp_jc3` (recriado 3x); `node_modules` proprio via `npm ci`;
  scratchpad com os logs das 3 execucoes, a copia isolada do gerador e a saida dele.
- **Rodei e NAO commitei:** a saida do gerador foi para o **scratchpad**; **nunca por cima do arquivo do
  repo**. `git status --porcelain` do meu worktree: **VAZIO** antes e depois.
- **Base viva `erp-postgres`/`erp-redis`: NUNCA tocada, nem para leitura.**
- **`git clean`: NUNCA usado**, em forma nenhuma.
- **Worktrees alheios intactos:** `b06` (dev), `gov-elenco`, `gov-descuido` — nao removi nenhum; escrevi
  apenas os meus dois arquivos no diretorio de votos desta junta, que e a saida da junta, nao codigo.
- **Nao commitei nada.** O orquestrador commita evidencia e voto (P2).
