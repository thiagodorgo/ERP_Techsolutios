# C1 · banco / atomicidade / RLS — evidência (identidade nova)

> Cadeira **C1** da junta `B-O6R-06`. Nada de ata, plano, briefing ou parecer alheio entrou como fato.
> Quórum: **unanimidade de 3**. O veto **não alcança `pre-existente`**.
> O ramo `completed` de `scripts/reconcile-checklist-usage.ts` está **BLOQUEADO por decisão do crítico
> (R2-A)** — a **série K não existe** na suíte e **M-12/M-15 não se aplicam**; cobrá-los seria reprovar
> por construção.

## §0 · Terreno medido por mim

| Item | Valor | Comando |
|---|---|---|
| Head de registro | `e6b2123102585f8632fb9752c8370b99b51fecd6` | `git rev-parse HEAD` no worktree `b06` |
| Head de **código** | `0f0a872a` — **provado** | `git diff --numstat 0f0a872a e6b21231 -- . ':!agent-orchestration' ':!.claude' ':!.agents' ':!docs'` → **vazio** |
| Base | `fe2748c84cc187a54ebe3fa651fcdc347c5b3494` | `git rev-parse origin/main` = `git merge-base e6b21231 origin/main` (idênticos) |
| Worktree próprio | `.claude/worktrees/o6r06-jur-c1` (detached em `e6b21231`) | `git worktree add --detach` |
| `npm ci` próprio | ec=0, 326 pacotes, 222 entradas em `node_modules` | `npm ci --no-audit --no-fund` |
| Junction | **ausente** — `dir /AL` → "Arquivo não encontrado" | `cmd /c dir /AL <worktree>` |
| Cluster próprio | `o6r06-jc1-pg`, **porta 57432** (fora dos excluded ranges; ≠5432/55432/56446/56393) | `docker run -d --name o6r06-jc1-pg -p 57432:5432 postgres:16-alpine` |
| Node / npm | `v20.19.5` / `11.7.0` | `node --version` |
| Base viva | `erp-postgres`/`erp-redis` **não tocadas, nem para leitura** | — |

---

## ITEM 1 · Atomicidade da captura

### 1(a) · O mecanismo, provado no SQL que o SERVIDOR recebeu (não por leitura)

`DEBUG="prisma:query"` **não emite nada** neste repositório (Prisma 7.8 + `@prisma/adapter-pg`); então
liguei `log_statement='all'` no **meu** cluster e li o log do **servidor** — evidência mais forte que a do
cliente. Comando:

```
docker exec o6r06-jc1-pg psql -U postgres -d erp -c "ALTER SYSTEM SET log_statement='all';" -c "SELECT pg_reload_conf();"
node --test --test-reporter=tap --import tsx --test-name-pattern="^A1 " tests/o6r06-usage-atomic-db.test.ts   # EC_A1=0, pass 1
docker logs o6r06-jc1-pg | sed -n "/MARKER_<ts>/,$p"
```

**Transação 1 — `createRun` SEM `client_run_key`** (`awk 'NR>=44 && NR<=103'`, numeração relativa):

```
  1: LOG:  statement: BEGIN
  4: LOG:  execute <unnamed>: INSERT INTO "public"."checklist_runs" ("tenant_id","template_id",...
  9:       INSERT INTO cloud_usage_events (
 31:       ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
 35:       INSERT INTO cloud_usage_events (
 57:       ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
 60: LOG:  statement: COMMIT
```

**Transação 2 — `createRunWithClientKey`** (`NR>=121 && NR<=220`):

```
  1: LOG:  statement: BEGIN
  7:       INSERT INTO checklist_runs (
 29:       ON CONFLICT (tenant_id, client_run_key) DO NOTHING
 49:       INSERT INTO cloud_usage_events (
 71:       ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
 75:       INSERT INTO cloud_usage_events (
 97:       ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
100: LOG:  statement: COMMIT
```

Conferido, ponto a ponto:

| Exigência (E1·4(1) / mandato) | Medido |
|---|---|
| INSERT por `$executeRaw` com **alvo explícito** | **SIM** — `ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`, 4× no log do servidor. O `WHERE` é a inferência do índice **parcial** da migration `20260611000000` |
| Espelho literal de `createRunWithClientKey` | **SIM** — `ON CONFLICT (tenant_id, client_run_key) DO NOTHING` na mesma transação (l.29) |
| `createMany({skipDuplicates})` **proibido** no caminho | **ausente** — enumerei por presença os 3 sítios de escrita da captura (`cloud-usage.capture.ts:168` `$executeRaw`; `checklist-prisma.repository.ts:449` e `:729` chamam só `appendChecklistRunUsageInTx`). Nenhum `createMany`/`create` de `cloudUsageEvent` no caminho Prisma |
| `create` simples proibido | **ausente** no caminho `-db` (o dublê de memória usa o serviço, e não é evidência de atomicidade — está dito no próprio arquivo) |
| Chave derivada da RUN, não de `event.id`/`randomUUID` | `buildChecklistRunUsageKey` = `` `checklist_run:${runId}:${metricKey}${reopened?":reopened":""}` `` (`cloud-usage.capture.ts:69-75`). **Nenhum `randomUUID` em `cloud-usage.capture.ts`** |
| Append **dentro** de `withTenant`→`withTenantRls`→`$transaction` | **SIM, no log**: `BEGIN` → `set_config('app.current_tenant_id',$1,true)` → INSERT da run → 2× INSERT da unidade → **um único** `COMMIT`. Nenhum `COMMIT`/`ROLLBACK` entre eles |

**Veredito parcial 1(a): PASSA.**

### 1(b) · As séries, por execução no MEU cluster — N por arquivo, `ec` por variável

`DATABASE_URL=postgresql://postgres:***@127.0.0.1:57432/erp?schema=public` (papel **`postgres`**),
`CORE_SAAS_PERSISTENCE` **não exportada** (o runner assume `memory`, como a CI), runner
`node scripts/run-backend-tests.mjs tests/<arquivo>`, `ec` lido por variável (`ec=$?`), contagens lidas do
**TAP no arquivo**:

| Arquivo | `# tests` | pass | fail | **skip** | `ec` |
|---|--:|--:|--:|--:|--:|
| `tests/o6r06-usage-atomic-db.test.ts` | **15** | 15 | 0 | **0** | 0 |
| `tests/o6r06-usage-atomic.test.ts` | **6** | 6 | 0 | **0** | 0 |
| `tests/o6r06-usage-fault-injection.test.ts` | **6** | 6 | 0 | **0** | 0 |
| `tests/o6r06-allocation-basis-rls-db.test.ts` | **10** | 10 | 0 | **0** | 0 |
| `tests/o6r06-billing-census.test.ts` | **7** | 7 | 0 | **0** | 0 |
| `tests/cloud-usage-checklist-reopen.test.ts` | **4** | 4 | 0 | **0** | 0 |

**Zero skip nas seis.** Nenhuma suíte `-db` se auto-pulou "por falta de `DATABASE_URL`" no meu cluster.

Aceites presentes, lidos dos nomes de caso no TAP (prova por **presença**): A1 · A2 · A3 · A5′ · A6 · A7 ·
A8′ · A9 · A10 · A11 · **A12′** · A13 · A14 · A15 · A17 (o `-db`); R1 · R2 · R3 · R5 · R6 · **A16** (memória);
F1 · F2 · F3 · F7 · F5 · F6; B1 · B2′ · B3 · B4 · B5 · B6′/B9 · B7 · B8 · B10 · **B11**; C1 · C2 · C3 · C4 ·
C5 · **C6** · **C7**.

Três observações minhas, com o número:

1. **`F4` (HTTP → 5xx e nada persistido) NÃO existe na suíte** — nenhuma ocorrência de `F4` nos três
   arquivos (`grep -n "F4" tests/o6r06-*.test.ts` → 0). O plano o previa (l.490, N=2, mutação **M-5**).
   Não é veto: **M-5 fica vermelha por outro caminho** (F7, A1, A17 — medido abaixo), então nenhuma
   mutação fica órfã. Fica como **observação com N e forma** (contagem é da **C3**).
2. **`A12` virou `A12′`, uma GUARDA DE TEXTO** ("o ALVO do `ON CONFLICT` é explícito no SQL"), e não o
   INSERT cru com PK colidente que a `E1·4` desenhou. É a consequência direta do **`R2-D`** do crítico
   (`RecordUsageEventInput` não tem `id`; a colisão de PK é inalcançável pelo caminho de produção).
   **Medi eu a consequência:** sob **M-19** (`ON CONFLICT DO NOTHING` sem alvo) **A5′ e A15 ficam VERDES**
   e só **A12′ fica vermelho** — isto é, o alvo do `ON CONFLICT` é hoje protegido **por texto**, não por
   comportamento. O crítico já publicou a inobservabilidade; **não converto em veto novo**.
3. **`C7` existe** e pina a **segunda trava** (`assertChecklistRunStatusTransition` barrando `updateRun`
   com 409) — a ressalva que eu levaria como pendência `pre-existente` está **coberta por aceite**.

### 1(c) · MUTAÇÕES — aplicadas por mim, 1 hunk cada, `git checkout --` + hash conferido

Método por mutação: `perl -i -ne` num **único** número de linha → `git diff -U0` (hunk colado) →
`node --test --test-reporter=tap --import tsx --test-name-pattern="<alvo>" tests/<arquivo>` → `ec=$?` →
`git checkout -- <arquivo>` → `git hash-object` == blob do head.

| M | O que mutei (1 hunk) | Aceite-alvo | `ec` | Trecho do TAP | Restaurado |
|---|---|---|--:|---|---|
| **M-1** | `checklist-prisma.repository.ts:547` — append removido de `createRunWithClientKey` | A1, A6 | **1** | `not ok 1 - A1 …` · `not ok 5 - A6 …` | `aa83158f` ✔ |
| **M-1b** | `:449` — append removido de `createRun` (sem chave) | A1, A8′ | **1** | `not ok 1 - A1 …` · `not ok 7 - A8′ …` | `aa83158f` ✔ |
| **M-2** | `:728` — append removido de `completeRun` | A2, A8′, A11 | **1** | `not ok 2 - A2 …` · `not ok 7 - A8′ …` · `not ok 10 - A11 …` | `aa83158f` ✔ |
| **M-3** | `cloud-usage.capture.ts:74` — chave por **emissão** (`:${Math.random()}`) | A1, A15 | **1** | `not ok 1 - A1 …` · `not ok 14 - A15 …` | `90906209` ✔ |
| **M-4** | `capture.ts:191` — `ON CONFLICT` **removido** (semântica do `create`) | A5′, A14, A15 | **1** | `not ok 4 - A5′ …` · `not ok 13 - A14 …` · `not ok 14 - A15 …` | `90906209` ✔ |
| **M-5** | `:449` — append **fire-and-forget** `void …​.catch(() => {})` | F7, A1, A17 | **1** | `not ok 4 - F7 …` · `not ok 1 - A1 …` · `not ok 15 - A17 …` | `aa83158f` ✔ |
| **M-6** | `cloud-usage.events.ts:33` — ramo `checklist_run.created` **de volta** | C1, R3 | **1** | `not ok 1 - C1 …` · `not ok 3 - R3 …` | `1f17e201` ✔ |
| **M-11** | `capture.ts:133` — `quantity: 1` na conclusão reaberta | A3, R2 | **1** | `not ok 3 - A3 …` · `not ok 2 - R2 …` | `90906209` ✔ |
| **M-14** | `checklist-prisma.repository.ts:816+` — grava chave de criação na **reabertura** | A8′, A9 | **1** | `not ok 7 - A8′ …` · `not ok 8 - A9 …` | `aa83158f` ✔ |
| **M-16** | `checklist.service.ts:706` — `registerDivergence` com `meterCompletion: true` | A10, C4, F6 | **1** | `not ok 9 - A10 …` · `not ok 4 - C4 …` · `not ok 6 - F6 …` | `eeabc348` ✔ |
| **M-17** | `checklist.service.ts:760` — `acknowledgeRun` com `true` | A10, C4 | **1** | `not ok 9 - A10 …` · `not ok 4 - C4 …` | `eeabc348` ✔ |
| **M-19** | `capture.ts:191` — `ON CONFLICT DO NOTHING` **sem alvo** | A12′ (só ela) | **1** | `not ok 11 - A12′ …`; **A5′/A15 verdes** | `90906209` ✔ |

**Nenhuma mutação minha ficou verde no alvo.** `M-12`/`M-15` **não se aplicam** (mutam o script bloqueado);
`M-20` **não apliquei** (drill em `src/database/rls.ts`, que o bloco não toca — hash conferido intacto:
`f8bd0fae`). **A8′ ficou vermelho sob M-14** — é a prova de que a **contagem positiva** das 2 reabertas
existe no aceite (0 chaves de criação), e não só o `NOT EXISTS` restrito.

**`C6`, executado por mim:** `npm run check` na árvore limpa → **ec=0**; o caso C6 escreve
`src/zz-o6r06-c6-probe.ts` com `repository.completeRun('t','r','u','completed')` (4 argumentos), roda `tsc`
de verdade, exige `ec≠0` casando `/completeRun|Expected 5 arguments|billing/` e **remove a sonda no
`finally`**, asserindo `existsSync === false`. Depois da suíte, `git status --porcelain --ignored` só
mostrava `node_modules/` — **a sonda não ficou no diff**.

**Veredito parcial ITEM 1: PASSA.** A propriedade está provada por execução: run e unidade faturável
nascem na MESMA transação (log do servidor), `I1′` com universo (`reopened_from_run_id IS NULL`) verde e
falsificado por M-1/M-1b/M-14, rollback real em F1/F2/F7, e o conjunto que fatura fechado por parâmetro
obrigatório (C4/C6) e pela segunda trava (C7).

---

## ITEM 2 · RLS — o drill sem BYPASSRLS, e o leitor fail-open do helper

### 2(a) · O papel, no catálogo, medido por mim

O plano nomeava `o6r06_app`; o entregue vem de `createEphemeralRole`
(`tests/helpers/auth-identity-fixture.ts:324-362`, família `o6r_b01_*`, sob `withRoleCatalogLock`) e a
divergência de NOME é matéria da C3. A **PROPRIEDADE** é minha, e eu a medi **no `pg_roles` do meu
cluster**, criando um papel meu com a mesma receita:

```
CREATE ROLE "o6r06_jc1_drill" LOGIN PASSWORD '***' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin FROM pg_roles WHERE rolname = 'o6r06_jc1_drill'
→ [{"rolname":"o6r06_jc1_drill","rolsuper":false,"rolbypassrls":false,"rolcanlogin":true}]
```

**`rolsuper=false`, `rolbypassrls=false`, `rolcanlogin=true`** — a propriedade exigida, integral.
(`CREATE ROLE` sem `BYPASSRLS` é `NOBYPASSRLS` por default no PostgreSQL; o teste **não confia no
default**: `tests/o6r06-allocation-basis-rls-db.test.ts:423-435` lê `pg_roles` e **asserre** os dois
`false`.)

**Falha na criação = VERMELHO, nunca skip:** li o caminho inteiro — `createRoleWithoutBypassRls` não tem
`try/catch`, `t.skip`, nem `mock.skip`; qualquer erro de `createEphemeralRole` propaga e derruba o caso.
O **único** `skip` do arquivo é o guard de `DATABASE_URL` ausente (l.32-36), e **no meu cluster ele não
disparou**: `# skipped 0` nas 6 suítes. Nenhum `-db` "pulou por falta de `DATABASE_URL`".

### 2(b) · O helper: fail-closed na escrita, fail-open na leitura — reproduzido por mim

Drills meus, com um `PrismaClient` por papel sobre o **mesmo** cluster, duas organizações no mesmo
período (**A = 3**, **B = 1**), chamando `repository.sumUsageBasis(P0, P1, [A, B])`:

| Estado do código | sob **`postgres`** (superusuário) | sob **`o6r06_jc1_drill`** (NOSUPERUSER NOBYPASSRLS) |
|---|---|---|
| **Entregue** (GUC + `tenant_id` explícito + canário) | `[{A,3},{B,1}]` ✔ | `[{A,3},{B,1}]` ✔ |
| **MUT-N1** — `set_config` só na 1ª volta (GUC obsoleto) | `[{A,3},{B,1}]` (RLS irrelevante) | **`[{A,3}]`** — a base de B **SOME** (0 linhas), `ec=0`, em silêncio |
| **MUT-N2** — recorte **só pela RLS** (sem `tenant_id`) + GUC obsoleto | **ERRO** `tenant_context_leak` | **ERRO** `tenant_context_leak` |
| **MUT-N3** — MUT-N2 **+ canário desligado** | 24 linhas: **todos** os tenants em **toda** volta (o "balde único") | **`[{A,3},{A,3}]`** — o número de **A atribuído a B**, `ec=0`, **sem um único erro** |

**O `R2-C` é real e eu o reproduzi** (linha MUT-N3, coluna do papel restrito): sem o canário, uma volta de
leitura com GUC obsoleto atribui o consumo de uma organização a outra **em silêncio**. Com o canário
entregue, o mesmo cenário **lança** `CLOUD_COST_ALLOCATION_CONTEXT_LEAK`.

**O canário existe nos DOIS leitores do laço, e os dois estão exercitados** (mutação minha, `tsc` ec=0
antes de rodar, para não confundir erro de sintaxe com falsificação):

| Mutação minha | Alvo | `ec` | Trecho |
|---|---|--:|---|
| **MUT-B11** — apagadas as 5 linhas do `assertRowsBelongToTenant` de **`listTenantAllocations`** (l.196-200) | B11 | **1** | `not ok 10 - B11 · o canário protege TAMBÉM listTenantAllocations …`; B6′/B9 **verde** (isola o alvo) |
| **M-18** — `setTenantRlsContext` removido do helper (l.360) | B2′ | **1** | `not ok 2 - B2′ …`; B6′/B9 e B11 **verdes sob `postgres`** |
| **MUT-N1** — `set_config` só na 1ª volta (suíte inteira, sob `postgres`) | B2′ | **1** | `# pass 9 # fail 1` → **só B2′** pega; os outros 9 casos são **cegos** a isso |

**MUT-N1 é a medição que responde à pergunta do mandato:** a falha que o helper introduz (uma volta sem
`set_config`) é detectada por **exatamente um** aceite — **B2′**, o que roda sob o papel sem BYPASSRLS.
Os outros nove, sob `postgres`, ficam verdes. **A cobertura existe, e existe no único lugar onde podia
existir.** O papel não é opcional; é o instrumento.

`B9` (canário de `sumUsageBasis`) **não é autorreferente** como a leitura da matriz sugeria: o caso injeta
o sintoma (`withLeakingGroupBy(ctx.client, "cloudUsageEvent", tenantB)`) e exige `reason ===
"tenant_context_leak"` — é falsificador de verdade. A ressalva do crítico valia para a *mutação* "apagar a
asserção", não para o caso. **Confiro e não converto em veto novo.**

### 2(c) · A série B, por execução

`tests/o6r06-allocation-basis-rls-db.test.ts` → **10/10, 0 skip, ec=0**: B1 · **B2′** · B3 · B4 · B5 ·
**B6′/B9** · B7 · B8 · B10 · **B11**. `B6′` prova a substituição do GUC com a lista `[A, B, A]` (o tenant
repetido produz **2** voltas, cada uma com **3**, e `deB = 1`). `A7` (cross-tenant sob papel sem
BYPASSRLS) está verde na suíte `-db` de atomicidade.

**Veredito parcial ITEM 2: PASSA.**

---

## ITEM 3 · O defeito que o CANÁRIO achou — medido sob os DOIS papéis, lado a lado

**A inversão, escrita antes do resultado:** este defeito **NÃO aparece** sob o papel sem BYPASSRLS — ali a
RLS faz o recorte e o teste fica **VERDE COM O DEFEITO PRESENTE**. Ele só aparece sob **`postgres`**, que
ignora RLS, e é assim que o dev e a CI (`.github/workflows/ci.yml:15,109`:
`postgresql://postgres:postgres@localhost:5432/…`) rodam. **Medir só sob o papel restrito aprovaria o
defeito.**

### 3.1–3.3 · `sumUsageBasis` — semente, resultado e o falsificador

Semente no meu cluster: **org A com `quantity 3`** e **org B com `quantity 1`**, mesma
`metric_key = checklist_runs_count`, mesmo período (2026-03-01 → 2026-03-31).

| | sob **`postgres`** | sob **`o6r06_jc1_drill`** (NOSUPERUSER NOBYPASSRLS) |
|---|---|---|
| **Código entregue** (`tenant_id` explícito + RLS) | `[{"tenant":"A","q":3},{"tenant":"B","q":1}]` | `[{"tenant":"A","q":3},{"tenant":"B","q":1}]` |
| **MUT-T3a** — `tenant_id` explícito **removido** (só RLS) | **`ERRO tenant_context_leak: cloud_usage_events returned rows for another organization under the current context.`** | **`[{"tenant":"A","q":3},{"tenant":"B","q":1}]` — VERDE COM O DEFEITO** |

Hunk único: `cloud-cost-allocation-prisma.repository.ts:277`
`const where = { tenant_id: tenantId, occurred_at: … }` → `const where = { occurred_at: … }`.

**A mutação, contra a suíte, sob `postgres`:**
```
MUT-T3a EC=1 | # tests 10 # pass 0 # fail 3
not ok 1 - B1 · o rateio aloca 3:1 lendo a base DURÁVEL …
not ok 6 - B6′/B9 · o GUC é SUBSTITUÍDO a cada volta (A→B→A) …
not ok 9 - B10 · `_sum` nulo omite o grupo; `count > 0` com groupBy vazio LANÇA …
```
**A correção TEM falsificador sob o papel em que o defeito se manifesta.** E o "balde único" que o dev
descreve é reprodutível: com `tenant_id` removido **e** o canário desligado (MUT-N3), sob `postgres` o
`groupBy` devolve **24 linhas** — **todas** as organizações em **cada** volta do laço.

### 3.4 · O `deleteMany` do replace — mesmo teste, mesma inversão

Hunk único: `:152` `where: { allocation_run_id: runId, tenant_id: tenantId }` →
`where: { allocation_run_id: runId }`.

```
MUT-T3b EC=1 | # tests 10 # pass 1 # fail 3
not ok 1 - B1 · o rateio aloca 3:1 …
not ok 7 - B7 · o replace varre TODOS os tenants: quem ficou sem alocação não deixa linha órfã
not ok 8 - B8 · atomicidade do replace: falha no 2º tenant não deixa NENHUMA linha do run gravada
   ok  2 - B2′ · sob papel SEM BYPASSRLS o rateio completa …          ← O ÚNICO VERDE
```
**A inversão está no próprio TAP:** o único caso que **sobrevive** à mutação é justamente o que roda sob o
papel **sem BYPASSRLS** — porque lá a RLS ainda recorta o `DELETE`. Sob `postgres` (dev e CI), a primeira
volta apagaria as alocações de **todas** as organizações do run.

### 3.5 · Os dois resultados lado a lado — a conclusão

A correção **não é redundante**: sob o papel restrito ela é invisível (RLS recorta), sob `postgres` ela é
**a única** coisa que separa "3 e 1" de "balde único" / "apaga tudo". E a suíte **não estava cega**: ela
enxerga porque roda sob `postgres`, exatamente onde o defeito vive.

### 3.6 · Censo dos acessos do rateio a tabela com RLS — recorte DUPLO × SIMPLES (por presença)

RLS medida no meu cluster (`pg_class.relrowsecurity/relforcerowsecurity`): `cloud_usage_events` **t/t** ·
`cloud_usage_daily_aggregates` **t/t** · `tenant_cloud_cost_allocations` **t/t** ·
`cloud_cost_line_items` **f/f** · `cloud_cost_allocation_runs` **f/f** · `tenants` **f/f**.

| Acesso (arquivo:linha) | Tabela | RLS? | GUC | Predicado `tenant_id` | Canário | Recorte |
|---|---|---|---|---|---|---|
| `sumUsageBasis` `groupBy`/`aggregate` `:277-289` | `cloud_usage_events` | sim | sim (helper) | **sim** | **sim** `:298` | **DUPLO** |
| `listTenantAllocations` `findMany` `:186-195` | `tenant_cloud_cost_allocations` | sim | sim (helper) | **sim** | **sim** `:196` | **DUPLO** |
| `replaceTenantAllocations` `deleteMany` `:152` | `tenant_cloud_cost_allocations` | sim | sim (helper) | **sim** | n/a (escrita) | **DUPLO** |
| `replaceTenantAllocations` `create` `:155-158` | `tenant_cloud_cost_allocations` | sim | sim (helper) | **sim** (`tenant_id` no `data`, `WITH CHECK`) | n/a | **DUPLO** |
| `listUsageDailyAggregates` `:237-249` | `cloud_usage_daily_aggregates` | **sim** | **NÃO** | **NÃO** | não | **NENHUM** — mas **fora do caminho do rateio**: `grep -rn "listUsageDailyAggregates" src/` acha **só** a porta e as duas implementações; **zero chamador** no motor/serviço/rota. É a leitura de plataforma, `pre-existente` (migração `20260611000000`), nomeada em `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` |
| `listCostLineItems` `:212-234` · `listTenants` `:330` · `createRun/updateRun/getRun/listRuns` | tabelas **sem RLS** | não | n/a | n/a | n/a | correto por construção |

**Nenhum leitor do rateio depende só da RLS.** O único acesso de recorte simples é
`listUsageDailyAggregates`, que **não está no caminho do rateio** e cuja classe é `pre-existente`.

**Veredito parcial ITEM 3: PASSA.**

---

## §F · Categoria do bloco (o que mudaria o quórum) e escopo proibido — medidos por mim

`git diff --numstat fe2748c e6b21231 -- <path>` (**nunca** `git rev-parse <rev>:<path>`, que falha em
silêncio):

| Caminho congelado (§5/§6 + E1·7) | arquivos |
|---|--:|
| `prisma/` · `package.json` · `package-lock.json` · `src/infra` · `src/modules/mobile` · `src/modules/impound` · `frontend` · `mobile` · `src/database/rls.ts` · `src/modules/checklists/checklist.run-lifecycle.ts` | **0 cada** |

**Nenhuma das três condições de 5/5 está presente:** sem dependência nova (lockfile e `package.json`
intocados), sem serviço externo pago, sem produção. A única mudança em `.github/workflows/ci.yml` são
**+8 linhas** que acrescentam 4 suítes `-db` à lista `SUITES` do job `backend-postgres` — **não é passo de
deploy**. **Quórum confirmado: unanimidade de 3.**

Os **2 arquivos `-db` fora do §6** que o dev declarou: conferi o diff dos dois na **minha lente** — o guard
de `checklist_runs_count` do `checklist-run-create-concurrency-db` **ficou mais forte** (deixou de contar
no repositório em memória atrás de um `if (env.CORE_SAAS_PERSISTENCE !== "prisma")` com
`setTimeout(150)`, e passou a `tx.cloudUsageEvent.count(...)` sob `withTenantRls`, sem ramo e sem espera);
o resto são o 5º argumento `billing` e um `deleteMany` de teardown escopado ao tenant do teste. **Nenhum
guard afrouxado.** A contagem/registro dessa divergência é da **C3**.

## §G · O que NÃO medi, e por quê

- **Séries S** (`o6r06-cost-summary-sum*`), tipos nuláveis, `BigInt`, `?? 0`, "exactly-once efetivo",
  `DIN-007`: são da **C2 (`jurado-06-invariante-financeiro-rateio`)**.
- **KPI, Δ +54, piso ≥47, `blocks_completed`, backfill do #380, `API_CONTRACTS.md`, `achados.jsonl`,
  contagem de pendências, nome do papel do drill**: são da **C3 (`jurado-06-contrato-regressao-kpi`)**.
- **Série K / `scripts/reconcile-checklist-usage.ts` / M-12 / M-15**: **BLOQUEADOS por decisão do crítico
  (`R2-A`)** — não existem na suíte, e cobrá-los seria reprovar por construção.
- **M-20 (`Serializable` em `src/database/rls.ts`)**: **não apliquei**. O arquivo está fora do escopo e o
  drill é dispensável — `A13` já pina `read committed` por execução. Hash intacto: `f8bd0fae`.
- **`I2′` reescrita num predicado observável (`R2-B`)**: é **decisão da junta**, não obrigação do dev.
  Julguei a **propriedade** pelos caminhos que o bloco tocou (C4/C6/C7 + A10/A11) e a levo como pendência
  nomeada.

## §H · Teardown

- **Criado por mim:** worktree `.claude/worktrees/o6r06-jur-c1` (detached em `e6b21231`, `npm ci` próprio,
  **sem junction**) · container `o6r06-jc1-pg` (porta **57432**) · papel de banco `o6r06_jc1_drill` ·
  2 organizações de semente por execução de drill · `<worktree>/.tmp-demo/drill.mts` (diretório
  **gitignored**) · logs no scratchpad da sessão, **fora** do worktree.
- **Mutações:** 17 aplicadas, **17 revertidas**. `git hash-object` == `git rev-parse e6b21231:<path>` nos
  **6** arquivos tocados (`cloud-usage.capture.ts` `90906209` · `cloud-usage.events.ts` `1f17e201` ·
  `checklist-prisma.repository.ts` `aa83158f` · `checklist.service.ts` `eeabc348` ·
  `cloud-cost-allocation-prisma.repository.ts` `74923e98` · `rls.ts` `f8bd0fae`, este **nunca tocado**).
- **Pristino DEPOIS:** `git status --porcelain` **vazio**; `git status --porcelain --ignored` → **só**
  `!! node_modules/` (nenhum `storage/checklist-attachments/<uuid>/` sobrou).
- **Confirmação de verde após tudo restaurado:** `o6r06-allocation-basis-rls-db` **10/10 ec=0** ·
  `o6r06-usage-atomic-db` **15/15 ec=0** · `o6r06-billing-census` **7/7 ec=0**.
- **Papel e dados do drill removidos:** `REASSIGN OWNED` + `DROP OWNED` + `DROP ROLE` →
  `SELECT count(*) FROM pg_roles WHERE rolname LIKE 'o6r%'` = **0**; `DELETE` escopado por
  `idempotency_key LIKE 'jc1:%'` e `slug LIKE 'jc1a-%'/'jc1b-%'` (**no MEU cluster descartável**).
- **Base viva `erp-postgres`/`erp-redis`: NUNCA tocada, nem para leitura.** Nenhum
  `session_replication_role`, nenhum `DISABLE TRIGGER`, nenhum `DELETE` por curinga fora do meu cluster.
- **Worktrees alheios intactos:** `b06` (só apensei os dois arquivos desta cadeira em
  `votos/B-O6R-06/`, como o P1/P2 mandam), `gov-descuido`, `demo/investidor`. `san2-r` **não existe** em
  `git worktree list` (só `demo/investidor`, `b06` e `gov-descuido`) — anoto como anomalia de terreno sem
  efeito no mérito; **não varri nada de ninguém**.

