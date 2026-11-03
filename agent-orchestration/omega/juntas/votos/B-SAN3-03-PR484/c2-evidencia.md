# C2 — evidência (jurado-j484-c2-opus, Claude Opus, nível menor, DECLARADO)

- Objeto: `5b628b886520bcbece0228eec9d47c965a32b577` · base do conserto: `49ddd0f8b9efa8724923ec99fa546cce907288cc`
- Competência: cálculo de dinheiro no resumo (período e contrato da rota `/summary`): A1, E2-A2, E2B-A2.
- Terreno: worktree `C:/Users/thiag/w-j484-c2`, Postgres `j484-c2-pg` 127.0.0.1:55482.
- Identidade nova: não achou, não planejou, não criticou, não desenvolveu neste bloco.

## Item 0 — terreno
- `git worktree add --detach C:/Users/thiag/w-j484-c2 5b628b88` → `HEAD is now at 5b628b88`; `git rev-parse HEAD` = `5b628b886520bcbece0228eec9d47c965a32b577`; `npm ci` próprio → ec 0 (`c2-npmci.log`); `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate`.
- Memória de commit livre antes do Docker: `Win32_OperatingSystem.FreeVirtualMemory` ≈ 46,5 GB (≥ 4 GB). Nenhum outro container j484 vivo (`docker ps` só `erp-postgres`, `erp-redis`, intocados).
- `docker run -d --name j484-c2-pg … -p 127.0.0.1:55482:5432 postgres:16` → `accepting connections`; `npx prisma migrate deploy` → `All migrations have been successfully applied.`
- Bateria do bloco no objeto: `node --test --import tsx tests/cloud-cost-allocation-routes.test.ts tests/san3-03-summary.test.ts` → **10/10**, 0 fail, 0 skip.

## Item 1 — `/summary` pela rota HTTP real
**Sonda própria** (fora do worktree): `c2-probe-routes.test.mts` (app real `createApp` + `fetch` na porta efêmera, repositório em memória, run de junho total 15 criada pelo `POST /runs`) e `c2-probe-routes-db.test.mts` (mesma rota com `CORE_SAAS_PERSISTENCE=prisma` no `j484-c2-pg`, run de julho/2031 total 77; a sonda confere `repository.constructor.name === "PrismaCloudCostAllocationRepository"`).

### 1.a Contrato do mandato — memória
- Comando: `cd C:/Users/thiag/w-j484-c2 && node --test --import tsx C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j484/c2-probe-routes.test.mts` → ec 0, log `c2-probe-objeto.log`.
- Saída resumida: sem query → 200, 15; `periodStart=2026-06-01&periodEnd=2026-06-30` → 200, 15; só `periodStart` e só `periodEnd` → 400 `CLOUD_COST_ALLOCATION_INVALID_PERIOD`/`summary_period_incomplete`; para CADA ponta (start e end): vazio, `nao-e-data`, `2026-02-31`, `2026-13-01`, `2026-00-10`, repetida (array) e a chave sozinha vazia → 400 `summary_period_invalid` (16 casos, todos asseridos); `2028-02-29` nas duas pontas → 200 (`no_run`).
- Veredito parcial: contrato do mandato CUMPRIDO na rota real.

### 1.b Contrato do mandato — Postgres descartável (o caminho Prisma)
- Comando: `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55482/erp_j484c2 node --test --import tsx …/c2-probe-routes-db.test.mts` → ec 0, log `c2-probe-db-objeto.log`.
- Saída resumida: repo = `PrismaCloudCostAllocationRepository`; duas pontas → 200, 77, a run da sonda; sem query → 200; só uma ponta → 400 `summary_period_incomplete` (2); vazio, texto, array, 31/02, 13/01, 00/10 → 400 `summary_period_invalid` (6); `2028-02-29` → 200. Run da sonda apagada no `finally`.
- Veredito parcial: CUMPRIDO também no Postgres.

### 1.c Vermelho-controle na base `49ddd0f8`
- Comando: `git checkout 49ddd0f8 -- src/modules/cloud-cost-allocation/` → sonda → `node --test --import tsx tests/cloud-cost-allocation-routes.test.ts tests/san3-03-summary.test.ts` → `git checkout 5b628b88 -- src/modules/cloud-cost-allocation/`; `git status --porcelain` depois = vazio.
- Saída: sonda ec 1 — na base, `periodStart=2026-06-01` sozinho → **200 com 15** (AssertionError); testes do objeto: **T-SUM-8 not ok, T-SUM-7 not ok**, 8 ok (logs `c2-probe-base.log`, `c2-vc-base.log`).
- Veredito parcial: os testes e a sonda distinguem a base do objeto.

### 1.d Formas NOVAS (só medição, objeto)
| forma | query | resposta |
|---|---|---|
| sem zero | `2026-6-1`/`2026-6-30` | 400 invalid |
| espaço antes / depois | `%202026-06-01` / `2026-06-01%20` | 400 invalid |
| `+` cru (vira espaço) | `2026-06-01T00:00:00+05:00` | 400 invalid |
| época ms | `1780272000000` | 400 invalid |
| ano estendido | `%2B002026-06-01` | 400 invalid |
| hora 25 / `T` vazio | `…T25:00:00Z` / `2026-06-01T` | 400 invalid |
| vazio + válido repetido | `periodStart=&periodStart=2026-06-01` | 400 invalid |
| ISO Z completo | `…T00:00:00.000Z` / `…T23:59:59.999Z` | 200, 15 (legítimo) |
| fuso que cruza o dia (só início) | `2026-06-01T00:30:00%2B05:00` | 200 **no_run**, total 0, `periodStart` 2026-05-31T19:30Z |
| **fuso +0500 nas duas** | `2026-06-02T00:00:00.000%2B0500` / `2026-07-01T00:00:00.000%2B0500` | **200, 15**, run 06-01..06-30 |
| **fuso +23:59** | `2026-06-02T00:00:00%2B23:59` / `2026-07-01T00:00:00%2B23:59` | **200, 15**, run 06-01..06-30 |
| fuso −23:59 | `2026-05-31T00:00:00-23:59` / `2026-06-29T…-23:59` | 200 no_run |
| **hora 24:00** | `2026-05-31T24:00:00Z` / `2026-06-29T24:00:00Z` | **200, 15**, run 06-01..06-30 |
| **hora local sem fuso** | `2026-05-31T22:00` / `2026-06-29T22:00` | **200, 15** com TZ do processo `America/Sao_Paulo`; **200 no_run, 0** com `TZ=UTC` (`c2-probe-objeto-tzutc.log`) |
| chave desconhecida | `PeriodStart=2026-10-01` | 200, 15 (resumo sem filtro) |
| chave com colchetes | `periodStart[]=2026-10-01&periodEnd[]=2026-10-31` | 200, 15 (Express 5, parser simples: a chave é outra) |
| uma com colchetes | `periodStart[]=…&periodEnd=2026-06-30` | 400 incomplete |

No Postgres (log `c2-probe-db-objeto.log`): `2031-07-02T00:00:00%2B23:59`/`2031-08-01T00:00:00%2B23:59` → 200, 77, run 07-01..07-31; `2031-06-30T24:00:00Z`/`2031-07-30T24:00:00Z` → 200, 77; `2031-06-30T22:00`/`2031-07-30T22:00` → 200, 77 (TZ São Paulo).

**Mecanismo (leitura do objeto, `cloud-cost-allocation.routes.ts`, `readSummaryDate`):** a ida e volta valida só o prefixo `AAAA-MM-DD` do texto (`strictDate`), mas a função devolve `new Date(raw)` (`parsed`), e o serviço casa a run por `sameUtcDay` do instante (`service.ts:440`). Com fuso, `T24:00` ou hora sem fuso, o dia validado ≠ o dia UTC usado. Ex.: texto `2026-06-02…+23:59` é validado como 02/06 e casa a run que começa em 01/06.

- Veredito parcial: **nenhuma forma reabre A1/E2-A2/E2B-A2 como "dinheiro sem período" ou "data impossível normalizada"**. Mas há uma classe nova, medida: **o dia de calendário que o parser valida não é o dia que o serviço usa** quando o valor é ISO com fuso, `24:00` ou hora sem fuso; e, sem fuso, **o mesmo pedido dá dinheiro ou zero conforme o TZ do processo**. Em todo caso a resposta devolve o `periodStart`/`periodEnd` da run (autodescritiva) e o instante pedido cai no dia UTC da run casada. → achado **C2-N1 (não grave)**; chave desconhecida ignorada → nota **C2-N2 (não grave, pré-existente)**. Juízo de gravidade no voto.
## Item 2 — listagem de runs, consumidores e `API_CONTRACTS.md`
### 2.a `parseRunFilters` e `readDate` não mudaram
- Comando: para `r` em `49ddd0f8` e `7c89c73b` (merge-base com `origin/main`) e o objeto: `git show $r:src/modules/cloud-cost-allocation/cloud-cost-allocation.routes.ts | awk '/^function parseRunFilters/,/^}/' | md5sum` (idem `readDate`); `grep -n 'parseRunFilters(request.query)\|parseSummaryFilters(request.query)'`.
- Saída: `parseRunFilters` = `7ef9bd4e…` nos três; `readDate` = `f48508a9…` nos três. No objeto, `/runs` (l.25) segue com `parseRunFilters`; só `/summary` (l.78) passou a `parseSummaryFilters`. `git diff 49ddd0f8 5b628b88 -- service.ts` só acrescenta a recusa de uma ponta em `getAllocationSummary`; `listAllocationRuns` intocado.
- T-RUN-1 no objeto: `GET /runs?periodStart=2026-06-01` → 200 (dentro do T-SUM-8, ok 3 no item 0).
- Veredito parcial: a listagem de runs não mudou.

### 2.b Consumidores reais
- Comando: `git grep -n "getAllocationSummary\|listAllocationRuns" 5b628b88 -- src`; `git grep -n "cloud-cost-allocations" 5b628b88 -- frontend`; `git grep -n "cloud-cost-allocations/summary\|…/runs?\|getAllocationSummary(" 5b628b88 -- tests`.
- Saída: em `src/`, só as duas rotas chamam o serviço. Frontend: `cloud-billing.adapter.ts:51` usa `withPeriod` (l.17–19: `URLSearchParams({periodStart: period.start, periodEnd: period.end})`), e `cloud-billing.service.ts:28` monta `AAAA-MM-01`/`AAAA-MM-DD` — sempre duas pontas em `AAAA-MM-DD`; `smoke-flow.test.tsx:863` espera `…summary?periodStart=2026-06-01&periodEnd=2026-06-30`. Testes do backend: todas as chamadas ao serviço passam duas pontas ou nenhuma, exceto T-SUM-7 (que espera a recusa); `san3-05-leituras-de-plataforma-db.test.ts:351` passa `iso()` = `toISOString()` (forma `…Z`, aceita: caso `iso-Z-completo` do item 1).
- Comando extra: `DATABASE_URL=…55482… node --test --import tsx tests/san3-05-leituras-de-plataforma-db.test.ts` → **13/13**, 0 fail, 0 skip (`c2-leituras-db.log`).
- Veredito parcial: nenhum consumidor real quebra.

### 2.c `API_CONTRACTS.md` × código
- Comando: `git diff 49ddd0f8 5b628b88 -- API_CONTRACTS.md`; leitura de `engine.ts:43–70` e `routes.ts:78,171–198` no objeto.
- Saída: o contrato diz (i) uma ponta → 400 `CLOUD_COST_ALLOCATION_INVALID_PERIOD`/`summary_period_incomplete` = código (`service.ts:173–180`) e medido; (ii) chave presente vazia, inválida, repetida ou data impossível → 400 `summary_period_invalid` = código e medido; (iii) "sem as duas chaves, mantém o resumo mais recente" = medido (inclusive chave com outra grafia, que conta como ausente); (iv) `ambiguous_tenant_tag` antes da plataforma e nas duas estratégias = `engine.ts:53–57` (sem condição de estratégia, antes do ramo da plataforma l.68); `unknown_tenant_tag` só em `direct_tag_then_usage_weighted_v1` = `engine.ts:59–63`.
- Lacuna medida: "com as duas válidas, exige o período exato" não diz que o pedido aceita ISO completo nem que o casamento é pelo **dia UTC do instante** (`sameUtcDay`), o que é o comportamento real das formas do item 1.d. Faz parte do C2-N1.
- Veredito parcial: o contrato diz o que o código faz nos 400 e nos dois motivos; omite a semântica de instante/dia UTC (não grave).
## Item 3 — mutações M47, M47-b, M47-c, M54, M54-b, M54-c, M56 + própria
### 3.a As sete da emenda, executadas por mim
- Driver: `c2-mutations.mjs` = cópia de `revisoes/dev-san303-e2-c1-mutations.mjs` (os textos das mutações não foram mudados) com `root` = meu worktree e `git status --porcelain` publicado após cada restauração. Comando: `cd C:/Users/thiag/w-j484-c2 && node C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j484/c2-mutations.mjs` → ec 0, log `c2-mutations.log`.
- Saída: âncora = 1 em todas; `exit=1` com AssertionError em todas; `restored=true` e `status=[]` depois de cada uma; `status-final:[]`.
  - M47 (apaga a recusa do serviço) → T-SUM-8 e T-SUM-7 not ok.
  - M47-b (recusa só quando falta o `periodEnd`) → T-SUM-7 not ok.
  - M47-c (recusa movida para `parseRunFilters`) → T-SUM-8 not ok.
  - M54 (`/summary` volta a `parseRunFilters`) → T-SUM-8 not ok.
  - M54-b (`""` vira ausente) → T-SUM-8 not ok.
  - M54-c (array pelo 1º elemento) → T-SUM-8 not ok.
  - M56 (sem a ida e volta: `false ||`) → T-SUM-8 not ok.
- Veredito parcial: as sete mordem.

### 3.b Qual asserção a M47-c derruba
- Comando: `node C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j484/c2-m47c-detalhe.mjs` (log `c2-m47c-detalhe.log`).
- Saída: a M47-c literal do dev cai em `expected: 400 / actual: 200`, que é a asserção do resumo com uma ponta (o guard do serviço sumiu, e o `/summary` não passa mais por `parseRunFilters`), **não** no T-RUN-1. Com a variante própria **M47-c′** (a mesma recusa acrescentada em `parseRunFilters`, serviço intacto), o T-SUM-8 cai na mensagem `T-RUN-1 · listagem continua aceitando somente uma ponta`, `expected: 200 / actual: 400`. `status=[]` depois das duas.
- Veredito parcial: o T-RUN-1 morde (provado pela M47-c′). A M47-c literal fica vermelha por outra asserção, então não prova o T-RUN-1 sozinha. É precisão de prova, sem efeito em dinheiro (nota em C2-N3).

### 3.c Mutação própria nova no parser: M-C2-a
- Mutante: em `readSummaryDate`, `/^(\d{4}-\d{2}-\d{2})(?:$|T)/` → `/^(\d{4}-\d{2}-\d{2})/` (o prefixo deixa de ter de terminar o valor ou vir seguido de `T`). Âncora = 1 (`c2-mc2a-apply.cjs`).
- Comando 1 (no driver, modo medir): `M-C2-a|exit=0||# pass 10 # fail 0`, `restored=true|status=[]`.
- Comando 2: `node c2-mc2a-apply.cjs apply` → sonda `c2-probe-routes.test.mts` → `git checkout 5b628b88 -- routes.ts`; log `c2-mc2a-probe.log`. Sob o mutante, `periodStart=2026-06-01%20&periodEnd=2026-06-30` → **200, 15** (no objeto: 400). `status:[]` e âncora original de volta.
- Veredito parcial: **a M-C2-a sobrevive à bateria do bloco** (10/10 verdes). O objeto rejeita certo, mas nenhum teste do bloco prende o terminador do prefixo: um valor como `2026-06-01 GMT+1400` (V8 → 2026-05-31T10:00Z) ou `2026-06-01 ` passaria sem teste vermelho. → **C2-N3 (não grave)**: lacuna de teste, sem defeito no código do objeto.

### 3.d Vermelho-controle na base
- O item 1.c: com o `src/modules/cloud-cost-allocation/` de `49ddd0f8`, T-SUM-7 e T-SUM-8 ficam not ok (8 ok), e a sonda fica vermelha (`periodStart` sozinho → 200 com 15). Restaurado com `status` vazio.
- Veredito parcial: os testes que as mutações derrubam são vermelhos na base.

## Voto
- `c2-voto.json`: **APROVADO**, 0 grave, 3 não graves (C2-N1, C2-N2, C2-N3), com `arquivos_medidos`.

## Limpeza
- Comando: `git status --porcelain` no worktree (vazio) → `docker rm -f j484-c2-pg` → `git worktree remove --force C:/Users/thiag/w-j484-c2`.
- Saída: container ausente (`docker ps -a | grep -c j484-c2-pg` = 0); caminho ausente; `git worktree list | grep -c j484-c2` = 0. Continuam vivos só `erp-postgres` e `erp-redis`, que não foram tocados. Nada de `prune` nem `down -v`, e as portas 3000/5173 e a árvore principal ficaram de fora.
- Sondas e drivers ficam em `revisoes/j484/` (`c2-probe-routes*.test.mts`, `c2-mutations.mjs`, `c2-m47c-detalhe.mjs`, `c2-mc2a-apply.cjs`, logs `c2-*.log`).
