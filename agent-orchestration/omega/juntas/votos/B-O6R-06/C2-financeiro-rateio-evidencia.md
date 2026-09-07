# C2 · invariante financeiro / rateio — evidência executada

Cadeira **C2**, identidade nova. Nada de ata, plano, briefing ou parecer alheio entrou como fato.
Quórum: **unanimidade de 3**. Veto: sim, e **não alcança `pre-existente`**.

## §0 · Terreno (medido)

| item | valor |
|---|---|
| worktree próprio | `.claude/worktrees/o6r06-jur-c2`, **detached** em `e6b21231` |
| head de CÓDIGO | `0f0a872a` — `git diff --numstat 0f0a872a e6b21231 -- . ':!agent-orchestration' ':!.claude' ':!.agents' ':!docs'` → **vazio** |
| base | `origin/main` = `fe2748c` |
| `npm ci --no-audit --no-fund` | próprio, ec=0 |
| junction | `cmd /c dir /AL node_modules` → "Arquivo não encontrado" = **0** |
| Node / npm | v20.19.5 / 11.7.0 |
| cluster | `o6r06-jc2-pg` **:58432** · `o6r06-jc2-redis` **:58379** (portas escolhidas após `netsh …excludedportrange` e `docker ps`; C1 está em 57432; base viva 5432/6379 **não tocada**) |
| `prisma migrate deploy` | ec=0, "All migrations have been successfully applied" |
| `@prisma/client` instalado | **7.8.0** por execução: `node -e "require('@prisma/client/package.json').version"` |

---

## ITEM 1 · Séries S/B e o mapa do §3.4, pelo VALOR

### 1.0 · Suítes do bloco, no MEU cluster, sem skip

```
node --test --test-reporter=tap --import tsx tests/o6r06-cost-summary-sum-db.test.ts tests/o6r06-cost-summary-sum.test.ts
EC=0 · # tests 10 · pass 10 · fail 0 · skipped 0   (S1 S2 S3' S4 S9 S10 S5 S6 S7 S8)

node --test --test-reporter=tap --import tsx tests/o6r06-allocation-basis-rls-db.test.ts tests/o6r06-billing-census.test.ts
EC=0 · # tests 17 · pass 17 · fail 0 · skipped 0   (B1 B2' B3 B4 B5 B6'/B9 B7 B8 B10 B11 · C1..C7)

npm run check -> EC=0
```
**Zero `-db` pulado no meu cluster.** Re-execucao limpa da serie B apos eu limpar a MINHA contaminacao
(ver 1.6): `# tests 10 · pass 10 · fail 0`.

### 1.1 · O mecanismo — argumentos do agregador, por SPY meu sobre o cliente REAL

`c2-medicao-item1c.mts` (proxy meu em `client.cloudCostLineItem`, capturando `Object.keys(args)`):

| chamada | chaves do argumento | take/skip/cursor/distinct? |
|---|---|---|
| `cloudCostLineItem.aggregate` | `["where","_sum","_count"]` | **nao** |
| `cloudCostLineItem.groupBy` | `["by","where","_sum","_count"]` | **nao** |

`where` byte-identico nos dois lados (`vistos[0].where === vistos[1].where` -> `true`):
`{"billing_period_start":{"gte":"2026-08-01T00:00:00.000Z","lte":"2026-08-31T23:59:59.999Z"}}`.

`c2-medicao-item1b.mts` (proxy meu atravessando o `$transaction`, em `cloudUsageEvent`), base do rateio:

| chamada | chaves | proibida? |
|---|---|---|
| `cloudUsageEvent.aggregate` x2 | `["where","_count"]` | nao |
| `cloudUsageEvent.groupBy` x2 | `["by","where","_sum","_count"]` | nao |

`[S9-basis] alguma chave proibida? false`. **Premissa de versao pinada POR EXECUCAO** (nao por leitura do
`package.json`): `node -e "require('@prisma/client/package.json').version"` -> **7.8.0**; `npx prisma generate`
-> "Generated Prisma Client (v7.8.0)".

`normalizeSummaryFilters` e `getSummary`:
```
[C3] normalizeSummaryFilters({serviceCode}) -> "limit" in result = false
[S5] filtros recebidos pelo repositorio = {"periodStart":...,"periodEnd":...} | tem "limit"? false
```
Nenhum laco de soma no servico: `getSummary` chama `summarizeLineItems` UMA vez; `sumCosts`/`roundCost`
ficaram so em `importAwsCurCsv` (conferido por presenca no diff `fe2748c..0f0a872a`).

### 1.2 · Nulabilidade — a tabela, por execucao (`c2-medicao-item1a.mts`)

| caso (entrada do duble) | saida medida | esperado | veredito |
|---|---|---|---|
| `{count:0, total:null}` | `total=0 exact="0" count=0 services=[]` | zeros explicitos | **OK** |
| `{count:3, total:null}` | **LANCOU** `CLOUD_COST_SUMMARY_INCONSISTENT` / `summary_total_missing` | erro | **OK** |
| `{count:2, total:"7.500000"}` | `7.5` / `"7.500000"` / 1 servico | normal | **OK** |
| `{count:2, grupo.unblendedCost:null}` | **LANCOU** (mesmo codigo) | erro | **OK** (excede o exigido) |
| `{count:0, total:"0"}` | zeros | zeros | **OK** |

**S7 por HTTP** (o mandato pede HTTP; a suite do bloco faz por servico — **eu fiz por HTTP**),
`GET /api/v1/platform/cloud-costs/summary?periodStart=2030-01-01&periodEnd=2030-01-31`:
```
status=200
data = {"provider":"aws","periodStart":...,"periodEnd":...,"generatedAt":...,
        "totalUnblendedCost":0,"totalUnblendedCostExact":"0","lineItemCount":0,"currencies":[],"services":[]}
tem null? false | tem NaN? false
```

**`?? 0` / `|| 0` no caminho do total — por PRESENCA. Nenhuma ocorrencia de CODIGO.**
`grep -n` em `aws-cur.service.ts`, `aws-cur-prisma.repository.ts`, `cloud-cost-allocation-prisma.repository.ts`
-> **4 ocorrencias, TODAS em comentario** (linhas 97, 215, 262, 306). A unica ocorrencia de codigo na area e
`cloud-cost-allocation.service.ts:150` (`tenantGroups.get(id) ?? 0`) — **inicializador de acumulador de `Map`**,
nao conversao de `null` do banco, e **intocada pelo bloco** (ausente do diff `fe2748c..0f0a872a` desse arquivo).
`COALESCE` no SQL: **zero** ocorrencias de codigo nos tres modulos (1 em comentario).

### 1.3 · O teto do rateio — de mudo a alto (`c2-medicao-item1c.mts`)

```
[B5] CLOUD_COST_ALLOCATION_LINE_ITEM_CAP = 100000 (lido do EXPORT, typeof number)
[B5] default do construtor (por reflexao) = 100000 | == constante ? true
[B4] cap=10, linhas=11 -> status=failed
     errorMessage = period_exceeds_line_item_cap: {"count":11,"cap":10}
     alocacoes gravadas = 0
[B4-ctrl] cap=11, linhas=11 -> status=completed (o teto e predicado, nao acaso)
```

### 1.4 · A base do rateio, PELO VALOR — proporcao MINHA (5:2, nao a 3:1 do dev)

`c2-medicao-item1b.mts`: 2 organizacoes, runs criadas/concluidas pelo **repositorio real**
(`RlsPrismaChecklistRepository.createRun` + `completeRun(..., {meterCompletion:true})`), **sem** rodar
`aggregateDailyUsage`. Base lida **por mim, direto do banco**:

```
[BASE-CRUA] tenantA checklist_run.completed q=5.000000 n=5 | tenantB checklist_run.completed q=2.000000 n=2
[ALOC] c2-alloc-a  categoria=checklists  metrica=checklist_run.completed  base=5  ratio=0.714285714286  custo=50
[ALOC] c2-alloc-b  categoria=checklists  metrica=checklist_run.completed  base=2  ratio=0.285714285714  custo=20
```
Linha de custo `ChecklistService` = **70.00** -> **50.00 / 20.00**, proporcao **5:2 exata**. `unallocated` **nao**
contem a linha de checklists.

### 1.5 · Mutacoes (cada uma restaurada por `git checkout --`, hash == blob conferido)

| mutacao | o que faz | alvo | ec | vermelhos |
|---|---|---|---|---|
| **M-7** | devolve `limit: 10_000` a `normalizeSummaryFilters` | S/C | **1** | C3, S5. O total **nao** muda (o repositorio ignora `limit`) — e guarda de regressao, e digo isso |
| **M-8** | `summarizeLineItems` via `findMany({take:10_000})` + reduce em `Number` | S-db | **1** | **S1, S3', S4, S9, S10** |
| **`?? 0` incondicional** | `requireTotal` devolve `"0"` em vez de lancar | S-mem | **1** | **S8 VERMELHO, S7 VERDE** — o pareamento honesto que o plano declarou, confirmado por mim |
| **M-9** | base volta a `listUsageDailyAggregates` | B-db | **1** | **B1**, B2', B7, B8, B11 |
| **M-10** | remove o `count`+`throw` do teto | B-db | **1** | **B4**, e so B4, em cluster limpo |
| **M-6** | os dois ramos antigos voltam a emitir em `cloud-usage.events.ts` | C-censo | **1** | **C1** (`expected 0, actual 2`), C4, C5 |

Hashes apos restauracao, todos `git hash-object` == `git rev-parse HEAD:<path>`:
`aws-cur.service.ts 134b5e45` · `aws-cur-prisma.repository.ts 6a2e290e` ·
`cloud-cost-allocation-prisma.repository.ts 74923e98` · `cloud-cost-allocation.service.ts c4d79900` ·
`cloud-usage.events.ts 1f17e201`.

### 1.6 · ANOMALIA DE TERRENO — minha, reportada, corrigida

Minhas fixtures (2 organizacoes com 5 e 2 vistorias, `occurred_at` 2026-06-15) ficaram no cluster e
**contaminaram a primeira execucao de M-10**: B1/B2'/B7/B8 sairam vermelhos por residuo MEU (`sumUsageBasis`
varre `listTenants()`, logo os meus tenants entraram na base do teste alheio). Limpei **escopado por slug**
(`c2-alloc-%`, `c2-b10%`), reconferi (`tenants=0`, `cloud_usage_events=0`), re-rodei a serie B limpa
(**10/10**) e refiz M-10 (**so B4 vermelho**). Registro porque e a classe de erro que transforma residuo em
falso achado. Armadilha de ferramenta nomeada: **`docker exec` SEM `-i` nao liga o stdin — o heredoc SQL passa
em silencio, `ec=0`, e nada e apagado.**

### 1.7 · O mapa do §3.4 (aceite "outbox/inbox para usage") — mapeamento por propriedade

Li a `PD-O6R-B06-OUTBOX-IN-DB` antes de decidir. Termo a termo, contra o que EU medi:

| termo do aceite | mecanismo entregue | medido por mim |
|---|---|---|
| escrita do fato e da unidade **atomica** | `appendChecklistRunUsageInTx` chamado de dentro da tx do repositorio | a base 5/2 nasceu por `createRun`/`completeRun` reais |
| **idempotencia** do consumo repetido | `ON CONFLICT (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`, **com alvo** | alvo presente, `cloud-usage.capture.ts:191` |
| **relay** / segundo sistema | **NAO existe — e nao precisa existir AQUI**: o consumidor e o MESMO banco (o rateio le `cloud_usage_events` por `SUM/GROUP BY`) | `sumUsageBasis` le a propria tabela |
| projecao diaria como "inbox" | **saiu do caminho do dinheiro** | M-9 prova: voltar a ela zera a base |

**Veredito do mapeamento:** honesto **para os fatos deste desenho**. Nenhum termo virou palavra: onde o
mecanismo do outbox nao existe (relay), o bloco **diz que nao existe** e nao reivindica a chancela — e a
propriedade que o aceite quer ("nenhuma run original commitada sem unidade faturavel") e entregue por um
mecanismo mais forte para o dual write, nao por um mais fraco com o nome emprestado.

### 1.8 · Observacao (nota, nao bloqueia)

`parseLineItemFilters` (rota) monta `limit` a partir da query e o passa a `getSummary`;
`normalizeSummaryFilters` faz `{...filters, ...}`, entao um `?limit=` do cliente **sobrevive no objeto**:
`"limit" in normalizeSummaryFilters({limit:5})` -> **true**. Medi o efeito no VALOR:
`GET /summary?...&limit=5` sobre **12** linhas -> `lineItemCount=12`, `totalUnblendedCostExact=12.000000`
(identico a chamada sem `limit`). **O campo e INERTE no caminho do total** — `buildLineItemWhere` o ignora e o
agregador nunca o recebe (1.1). Registro como **nota**: a propriedade que a ata deve enunciar e "o normalizador
nao INJETA `limit`", nao "o objeto nunca tem `limit`".

**VEREDITO PARCIAL ITEM 1 — APROVADO.**

---

## ITEM 2 · O `DIN-007` fecha DOIS defeitos — o truncamento E a acumulacao em float

**Fixture: MINHA, na FAIXA REALISTA.** `c2-medicao-item2.mts`, `createMany` em **1 statement**:
10.000 linhas de `987654.321987` (`C2AmazonEC2`) + **1** de `999999.999999` (`C2AmazonUltimaLinha`,
`billing_period_start` **1 dia mais recente** — e a que o `take` com `orderBy asc` cortava). N = **10.001**.
Total esperado `9877543219.869999` = **9.877.543.219.869.999 micro-unidades**, que e **> 2^53**
(`9007199254740992`) — logo S1 e S10 sao o MESMO cenario aqui.

**Forma da minha referencia aritmetica:** `BigInt` de micro-unidades, sobre `unblended_cost::text` lido em
**21 paginas de `LIMIT 500 OFFSET n`**. Nunca `Number`, nunca `Decimal` de JS. Tolerancia **ZERO**.

```
SEED: 10001 linhas em 3345ms (createMany, 1 statement)
TIPO _sum: typeof=object ctor=Decimal2 isDecimalLike=true toString=9877543219.869999   <- POR EXECUCAO
_count._all = 10001
REFERENCIA BigInt (10001 linhas em 21 paginas de 500): 9877543219869999
PUBLICADO exato          = 9877543219.869999
PUBLICADO number         = 9877543219.869999
PUBLICADO lineItemCount  = 10001
PUBLICADO services       = [{"serviceCode":"C2AmazonEC2","unblendedCostExact":"9876543219.87",...},
                            {"serviceCode":"C2AmazonUltimaLinha","unblendedCostExact":"999999.999999",...}]
BANCO sum()::text        = 9877543219.869999 ; count = 10001

VEREDITO exato == referencia BigInt : true (delta = 0)
VEREDITO exato == sum()::text       : true (delta = 0)
VEREDITO exato == fixture           : true (delta = 0)
VEREDITO number == Number(exato)    : true
LOSSY: delta(number, exato) em micro-unidades = -1     <- o `number` PERDE, e esta documentado
```

**(1) Truncamento — morto.** `lineItemCount = 10001`; a 10.001a entra no total **e** aparece em `services[]`
com o `serviceCode` exclusivo dela. Falsificador executado: **M-8** (`findMany({take:10_000})`+reduce) deixa
**S1, S3', S4, S9, S10** vermelhos, `ec=1`.

**(2) Acumulacao em FLOAT — o defeito que o achado NAO nomeia. Medido POR MIM, na minha fixture:**
```
FLOAT (reduce em double, as mesmas 10.001 linhas) = 9877543219.871105
EXATO (SUM numeric / referencia BigInt)           = 9877543219.869999
DIVERGENCIA absoluta                              = 0.00110626220703125
DIVERGENCIA em micro-unidades                     = 1107
```
**1,106e-3** — mesma ordem do 1,1e-3 que o critico mediu, em fixture INDEPENDENTE da dele; **1106x** a
tolerancia antiga de 1e-6. O `sumCosts`/laco em `double` **saiu** do caminho do resumo (diff
`fe2748c..0f0a872a` de `aws-cur.service.ts`) e ficou so em `importAwsCurCsv`.

**(3) S10 / Risco 6, executado.** Total > 2^53 micro-unidades: `totalUnblendedCostExact` bate com
`sum()::text` (delta 0) e o `number` **nao** representa o valor — perde **1 micro-unidade**. Nao e promessa
no papel: e o numero acima.

**(4) O campo e ADITIVO.** `CloudCostSummary` ganhou `totalUnblendedCostExact: string`, `lineItemCount: number`
e `services[].unblendedCostExact`; `totalUnblendedCost: number` **permanece** e esta comentado como *lossy*
(`aws-cur.types.ts`). Nenhum campo antigo saiu (diff do tipo, so linhas `+`). Regressao de frontend e da C3.

**(5) O `Decimal` nao e somado em JS — provado por PRESENCA.** Enumerei todo ponto do caminho do resumo em que
o valor do banco e tocado: (i) `aws-cur-prisma.repository.ts:decimalToExactString(value)` -> `String(value)`,
**uma** conversao, sem aritmetica; (ii) `aws-cur.service.ts:requireTotal` -> so testa `=== null`;
(iii) `toBoundedNumber(exact)` -> `Number(exact)`, **na borda**, uma vez por campo. **Zero** `plus/minus/times`
de `Decimal`, zero `toNumber()` antes da borda, zero acumulador. O objeto que o driver devolve e um
`Decimal2` (medido) e ele **morre em string** no repositorio.

**(6) B3 nao entra como prova.** Conferi por presenca: `B3` esta no arquivo `-allocation-basis-rls-db` rotulado
"regressao (ja verde na base)" e **nao** aparece na lista `S1/S2/S3'/S7-S10`. Nao cobrei B3 como cobertura
nova. A conferencia formal da `evidencia_fechamento` do `achados.jsonl` e da C3 — eu confiro a **propriedade**
(o valor exato existe e e exato), e ela existe.

**A pergunta que fecha o item:** o DIN-007 fecha **os DOIS** defeitos. N = 10.001, faixa ~9,9e5/linha e
~9,88e9 no total com 6 casas, referencia em `BigInt` sobre paginas de 500 lidas como texto, tolerancia 0.

**VEREDITO PARCIAL ITEM 2 — APROVADO.**

---

## ITEM 3 · "Exactly-once efetivo" e a resposta do §4 — o P0 fecha, ou fecha pela metade?

### 3.1 · O NOME e o texto do contrato — medido, nao lido de segunda mao

```
grep -in "exactly.once" API_CONTRACTS.md
  227: ... e a expressao "exactly-once" NAO e usada de proposito - PD-O6R-B06-OUTBOX-IN-DB
grep -rin "exactly.once" src/
  cloud-usage.capture.ts:19: ... sem a expressao "exactly-once".
```
**Duas ocorrencias no repositorio inteiro, e as DUAS sao a negacao do termo.** O arquivo chama-se
`src/modules/cloud-usage/cloud-usage.capture.ts` (nao `...outbox.ts`), e o comentario de topo diz, literal:
*"isto NAO e um Transactional Outbox. Nao ha segundo sistema nem relay ... chama-la de outbox seria pedir
emprestada uma chancela que a literatura nao da."*

A invariante do contrato `checklist_run_billing@2026-09-06.b-o6r-06` esta enunciada como **propriedade
verificavel**, nao como slogan: chave `checklist_run:{runId}:{metricKey}`, unicidade por
`(tenant_id, idempotency_key)`, commit na mesma transacao, e as **excecoes declaradas** (reaberta sem chaves de
criacao; trilha divergencia->ciencia = 0 antes e 0 depois).

**Testei o risco INVERSO — contrato prometendo MAIS do que a arquitetura da.** A frase mais forte e
*"Falha na medicao => 5xx e NENHUMA vistoria persistida"*. Enumerei por PRESENCA todo sitio que insere em
`checklist_runs`:

| sitio | captura? | veredito |
|---|---|---|
| `checklist-prisma.repository.ts:419` (`createRun`) | **sim**, `:449` | coberto |
| `checklist-prisma.repository.ts:473` (`INSERT INTO checklist_runs`, `createRunWithClientKey`) | **sim**, `:547` | coberto |
| `checklist-prisma.repository.ts:801` (`reopenRunWithinTransaction`) | **nao** | **declarado no proprio contrato** ("vistoria reaberta e estado legitimo sem as chaves de criacao") |

3 chamadores de `repository.completeRun` no servico (`:547` `true`, `:705` `false`, `:759` `false`) — o 4o
caminho esta fechado pelo parametro obrigatorio `billing` (C6, pelo compilador). **Nao achei overclaim.**
F7 verde prova o acoplamento por execucao (`ec=0`, 6/6 em `o6r06-usage-fault-injection`), e ele esta escrito
tanto no contrato quanto em `cloud-usage.capture.ts:29-33` — **escolha de risco declarada, nao silenciosa**.

### 3.2 · Censo de produtores — O MEU NUMERO

```
grep -rhoE 'metricKey: "[^"]+"' src --include=*.ts | sort -u   ->  15 chaves distintas
```
**15 produtores** — o mesmo numero do critico, obtido por comando meu. Cruzando com `basisMetricKeys` de
`cloud-cost-allocation.rules.ts` (arquivo **intocado** pelo bloco: `git diff --numstat fe2748c 0f0a872a --
...rules.ts` -> **vazio**; origem `6f27faae`, 2026-06-08):

| categoria | chaves da base | produtor | onde |
|---|---|---|---|
| `checklists` | `checklist_run.completed`, `checklist_runs_count` | **SIM, NA TRANSACAO** | `cloud-usage.capture.ts:111,118,132` |
| `s3_requests` | 4 chaves | sim, **best-effort** | `cloud-usage.events.ts:39,47,71,79,89` |
| `storage` | `checklist_attachment.*.bytes` | sim, **best-effort** | `cloud-usage.events.ts:57,89` |
| `storage` | `storage_gb_month`, `storage_bytes_current` | **NENHUM** | — |
| `jobs` | `job.executed`, `job_executions_count` | sim, **best-effort** | `job.worker.ts:70,84` (**intocado**) |
| `api_requests` | `api_request.count`, `api_requests_count` | **NENHUM** | — |

**4 chaves sem produtor**, confirmando o E6 por medicao independente.

### 3.3 · O EFEITO NO VALOR — a pergunta central da minha cadeira

`c2-medicao-item3.mts`, mesmo conjunto de custos (`checklists` 70 · `storage` 40 · `api` 13 · `jobs` 17),
tres estados da base:

| cenario | alocado por categoria | por organizacao | `unallocated` |
|---|---|---|---|
| so `checklists` tem base (**o mundo de hoje**) | `{checklists:70}` | A 50 / B 20 | S3 **40** + API **13** + Lambda **17** = **70**, todos `missing_usage_basis` |
| storage e jobs COM base | `{checklists:70, storage:40, jobs:17}` | A 95,30 / B 31,70 | API **13** |
| storage com base **perdida pela metade em B** | `{checklists:70, storage:40, jobs:17}` | A **99,585714** / B **27,414286** | API **13** |

```
[CONTAMINACAO] checklists vale 70 / 70 / 70 nos tres cenarios
[CONTAMINACAO] o valor de 'checklists' MUDA quando storage/jobs perdem base? false
```

**Resposta:** um defeito de base numa categoria **NAO contamina o valor de outra**. O motor resolve regra e base
**linha a linha** (`cloud-cost-allocation.engine.ts:25-64`): custo sem base cai inteiro em `unallocated` com
`missing_usage_basis`, sem redistribuir para ninguem. **Logo o P0 fecha para `checklists` sem ser corroido
pelas categorias residuais** — e o `unallocated` e o lugar honesto onde o buraco aparece, com nome de motivo.

**O que a perda residual FAZ, quantificado:** ela desloca dinheiro **entre organizacoes, dentro** de
`storage`/`jobs` — com metade da base de B perdida, A vai de 95,30 para 99,585714 e B de 31,70 para 27,414286:
**4,285714 deslocados**, 7,5% dos 57,00 dessas duas categorias. E `pre-existente` (`0648a8e1`, 2026-06-08) e
**nomeado** em `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` (ALTA, dono `B-O6R-06b`/outbox generico, forma "leitura
cruzada reproduzivel", chaves e arquivos enumerados) e `P-O6R-B06-BASE-SEM-PRODUTOR` (ALTA, dono cloud
billing/produto). **O veto nao alcanca `pre-existente`** — vai como pendencia com o meu numero.

### 3.4 · O recorte, julgado com a evidencia do `local`

`docs/revisoes/O6R/achados.jsonl`, `Omega6R-DIN-005`, campo `local`, lido por mim:
`cloud-usage.events.ts:38-53` e `cloud-cost-allocation.rules.ts:61-66`. Conferi o que essas linhas **eram na
base** (`git show fe2748c:...`): `:38-53` e **exatamente** o ramo `checklist_run.created` +
`checklist_runs_count`; `rules.ts:61-66` e **exatamente** a regra `checklists`. As regras de
storage/jobs/api estao em `rules.ts:32-59` — **fora** do `local` nomeado. **Aceito a resposta do plano:** o
recorte e fiel ao achado. Fechar as demais categorias aqui seria o outbox generico da `Omega6R D-002`, rascunho
que o dono optou por nao deliberar.

### 3.5 · O `.catch(warn)` que sobra — censo C1, MEU, por execucao

`c2-medicao-item3.mts`, chamando `recordCloudUsageForDomainEvent` direto:
```
[C1-meu] apos created + completed pelo EVENTO DE DOMINIO -> 0 evento(s): []
[C1-meu] apos attachment_uploaded                        -> 3 evento(s):
         ["checklist_attachment.uploaded.count","s3_put_requests","checklist_attachment.uploaded.bytes"]
```
**A base NAO dobra.** E a segunda medida, independente, esta em 1.4: 5 e 2 vistorias pelo caminho real
produziram `n=5` e `n=2` por chave — nunca 10 e 4. Falsificador: **M-6** deixa C1 vermelho com
`expected 0, actual 2`, `ec=1`. `recordCloudUsageBestEffort` continua chamado em 8 sitios de
`cloud-usage.events.ts` + 2 de `job.worker.ts` + 2 de `notification.service.ts` — nenhum deles a vistoria.

### 3.6 · Conferencia da `evidencia_fechamento` (a propriedade, nao o registro — o registro e da C3)

`DIN-007` cita `S1 S2 S3' S4 S9 S10 S5 S6 S7 S8` e `C3`, e diz explicitamente *"B3 ... NAO entra nesta
evidencia"*. **Nao cita B3.** Nao cobrei B3 como cobertura nova.

**VEREDITO PARCIAL ITEM 3 — APROVADO.** O P0 fecha **inteiro para a categoria que o achado nomeia**, e a tese
do §4 esta corretamente estreitada por categoria, com as classes residuais nomeadas, datadas e com dono.

---

## §F · Teardown, executado e confirmado

```
git status --porcelain                       -> VAZIO
git status --porcelain --ignored | grep -v node_modules  -> VAZIO
docker rm -fv o6r06-jc2-pg o6r06-jc2-redis   -> ec=0 (com -v: nenhum volume anonimo dangling)
docker ps -a --format '{{.Names}}' | grep jc2 -> NENHUM (confirmado)
docker ps -a restantes                        -> erp-postgres, erp-redis (base VIVA, nunca tocada por mim)
git worktree remove --force .claude/worktrees/o6r06-jur-c2 ; git worktree prune -> ec=0
git worktree list                             -> demo/investidor · b06 · gov-descuido (os alheios INTACTOS)
```
Removi **só** pelo identificador do BLOCO+cadeira (`o6r06-jc2-*`, `o6r06-jur-c2`). Resíduo alheio
(`.claude/worktrees/san2-r`, diretório órfão) **reportado, não varrido**.

**Duas armadilhas de ferramenta que paguei e nomeio, para a próxima cadeira:**
1. **`docker exec` SEM `-i` não liga o stdin** — o heredoc SQL passa em silêncio, `ec=0`, e **nada é apagado**.
   Foi assim que a minha primeira limpeza de resíduo "funcionou" sem apagar uma linha.
2. **O diretório de scratchpad é COMPARTILHADO entre as cadeiras da mesma sessão** — um arquivo meu de nome
   genérico (`just.txt`) foi sobrescrito pelo de outra cadeira no meio da redação do voto. Prefixe tudo.

**VOTO: APROVADO.** Detalhe e a linha final em `C2-financeiro-rateio-voto.json`.
