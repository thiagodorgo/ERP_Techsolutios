# PLANO B-O6R-06 — `fix/billing-durability` (Ω6R-DIN-005 + Ω6R-DIN-007 · 2 P0 · checklists / cloud-usage / cloud-cost-allocation / cloud-costs)

**Papel:** `planejador-mestre` (Fable — `D-PLANEJADOR-MODELO-FABLE`). **Data:** 2026-09-06.
**Terreno medido:** worktree `.claude/worktrees/b06`, branch `fix/billing-durability`, criada de `origin/main` =
**`fe2748c`** (#380); head `dd16beb1` (só o parecer do porteiro). Todo `arquivo:linha` abaixo foi lido **neste
worktree, em `fe2748c`**; nada é herdado de ata como fato. **Quem executa: OUTRO agente** (§C7.4-bis — quem planeja
não desenvolve nem vota).
**Autorização de start:** `votos/B-O6R-07b/05-porteiro-pos-merge-fe2748c.md:140` — `LIBERADO COM RESSALVA`, com
B02 (`pendencias.md:2704`) e B05 (`:2866`) FECHADAS e **nenhuma** das 16 pendências com BLOQUEIA alcançando o B06.
As duas ressalvas do porteiro são **vinculantes** aqui: (1) backfill §C3.5 do #380 → §9; (2) durabilidade do
consumidor × `ARQ-001`/`PERF-001` abertos → §4 (escrito para ser atacado).

**Forma de medição, dita às claras:** este plano mede por **LEITURA** (Read/rg/`git log -S` sobre `fe2748c`), não
por execução — o worktree `b06` **não tem `node_modules`** (medido: `ls node_modules` vazio) e não é papel do
planejador rodar a suíte. O que exige execução (baseline por execução, vermelho-controle, papel de banco sem
`BYPASSRLS`) está marcado como obrigação do dev na **abertura** da branch (§8). Onde o enunciado do bloco afirma algo
que a leitura de hoje contradiz ou completa, está registrado como **ERRATA/ACHADO DE PLANEJAMENTO** (§2.4), não
silenciado (§A2).

---

## §0 · Fronteira de autoridade — o que este plano pode invocar e o que não pode

| Fonte | Status | Como este plano a usa |
|---|---|---|
| `docs/revisoes/O6R/PLANO_O6R.md:12` — linha 6: *"outbox/inbox para usage; SUM/GROUP BY sem truncamento; fault injection e 10.001 itens"*, dep. 2 e 5 | **Caminho aprovado** (J-6R) | É o aceite. §3.4 mapeia cada termo para o mecanismo entregue. |
| `docs/revisoes/O6R/PROMPTS_CORRECAO/BLOCO_06_billing_durability.md` (6 linhas: *"dispatcher com lease/retry e Inbox/upsert idempotente"*, *"documente contrato de exactly-once efetivo"*) | Prompt de correção, **não norma** | Orienta; onde a forma literal ("dispatcher") construiria durabilidade sobre um consumidor que a auditoria diz não ser durável, este plano diverge e **diz por quê** (§3.4, §4). |
| `Ω6R D-002 (docs/revisoes/O6R/D-002-uow-outbox.md)` — 11 linhas, `Status: proposta` | **NÃO deliberada** — `D-O6R-RASCUNHOS-DEFERIDOS-AO-HUMANO` (`controle/decisoes.md:1352-1379`); o dono foi consultado em 2026-09-06 e **optou por não deliberá-la agora** | **Não é invocada como autoridade em nenhuma linha deste plano.** Colisão de nomes: `controle/decisoes.md` tem uma `D-002` histórica do projeto sem relação — cite sempre com prefixo e caminho. |
| `Ω6R D-003 (docs/revisoes/O6R/D-003-jobs-duraveis.md)` | Idem — proposta | Não invocada. Tudo que é lease/reclaim/deadline é do **B-O6R-08** (`P-O6R-B08`, `pendencias.md:3090`). |
| `docs/revisoes/O6R/ATA_J6R.md:27-39` — "Severidades contestadas": DIN-005 P0 5×0; **DIN-007 P0 por 3×2** (A3/A4 defenderam P1) | Divergência **preservada** (§A2) | Registrada aqui; **não reaberta**. O bloco trata DIN-007 como P0. |
| `J-CHK-04C-EMENDA-deliberacao-j6r.md:89-97` — gate da CHECKLIST P1 | Deliberação | Efeito no gate após este bloco em §12 (com o residual do SEC-002 nomeado, não resolvido). |

**Precedentes MEDIDOS (úteis, não autoridade):**

- `src/modules/financial-uow/financial-uow.ts` (402 linhas) + `financial-uow-prisma.ts` (38): porta `run(tenantId, work)` que
  abre **UMA** `withTenantRls` e entrega repositórios ligados à `tx` (`financial-uow-prisma.ts:21-31`); em memória, dublê
  honesto com journal de before-images e **classificação write/read compilada** (`:178-220`). **O que reaproveito:** o
  IDIOMA — repositório recebe `PrismaExecutor = PrismaClient | Prisma.TransactionClient` e escreve na `tx` que o
  chamador abriu; e a regra de que **memória não é evidência** de atomicidade (`:31-34`). **O que NÃO reaproveito:** a
  porta em si — o B06 não tem multi-repositório financeiro; o `withTenant` do próprio `RlsPrismaChecklistRepository`
  (`checklist-prisma.repository.ts:1066`) já é a única transação de que o bloco precisa.
- `src/modules/impound/impound.outbox.repository.ts:33-46` — `appendOutboxEventTx(client, input)`: **SÓ insere**, na
  **MESMA tx** do marco de origem (*"o INSERT do outbox e o INSERT do CustodyEvent rolam JUNTOS ou NENHUM dos dois"*).
  Tabela com trigger de imutabilidade + RLS FORCE (`prisma/migrations/20260853000000_add_impound_outbox_events`). **O que
  reaproveito:** a **assinatura e a disciplina** (`appendXxxTx(client, input)`, chamado de dentro do repositório dono
  da tx) — é a regra do espelho para `src/modules/cloud-usage/cloud-usage.outbox.ts` (§3.1). **O que NÃO reaproveito:**
  a tabela nova. O outbox de impound existe porque o alvo é EXTERNO (Sivec); no B06 o consumidor é o **mesmo banco**,
  e `cloud_usage_events` já tem a chave de dedup (`@@unique([tenant_id, idempotency_key])`, `schema.prisma:465`) —
  ver §3.4 e a PD-1 do §11.
- `checklist-prisma.repository.ts:437-449` — `createRunWithClientKey`: `INSERT … ON CONFLICT DO NOTHING RETURNING`
  para **nunca abortar a transação interativa** (lição 23505→25P02). É o espelho do INSERT do §3.1.

---

## §1 · Objetivo, ator, fluxo origem→destino, fila

**Objetivo:** fechar `Ω6R-DIN-005` (`achados.jsonl` l.5, P0, `ativo`) e `Ω6R-DIN-007` (l.20, P0, `ativo`):

- **DIN-005** — *"A run é confirmada antes da métrica faturável, cuja gravação best-effort absorve falhas; replay
  idempotente retorna created:false e não republica."* Teste do achado: *"Falhar após commit da run e antes da
  medição, repetir client_run_key e exigir exatamente uma unidade faturável persistida."*
- **DIN-007** — *"Resumo soma apenas listLineItems limitado silenciosamente a 10.000 linhas."* Teste do achado:
  *"10.001ª linha de alto valor aparece no total e rateio."*

Pendência-mãe `P-O6R-B06` (`pendencias.md:2874-2916`): *"BLOQUEIA a trilha CHECKLIST P1 e o cloud billing"*, status
*"ABERTA — 2 P0"*. **Por que este bloco antes do B04 (decisão do dono, registrada no briefing):** *"a apresentação
do INVESTIDOR usa componentes reais do sistema"* — o painel de cloud billing (`frontend/src/modules/platform/cloud-billing/cloud-billing.adapter.ts:39,47`
lê `/platform/cloud-costs/summary` e `/platform/cloud-cost-allocations/summary`) é um desses componentes, e hoje os
dois números que ele mostra podem estar **subestimados por construção**.

**Atores:** despacho/operador (web e `POST /api/v1/mobile/sync/checklists` com `checklist_runs:create`) cria a
vistoria — `checklist.service.ts:238-283`; o provisionamento do despacho cria com `role` (`:234-241`); técnico
conclui (`completeRun`, `:525-575`; sync `mobile-checklist-sync.ts:611-631`); `platform_admin` lê resumo de custo e
dispara rateio (`aws-cur.routes.ts:86-94`; `cloud-cost-allocation.routes.ts:34-50`, **inline**, não por job).

**Fluxo origem→destino, ANTES (medido) e DEPOIS (proposto):**

| Passo | Hoje (`fe2748c`) | Depois do B06 |
|---|---|---|
| 1. Run nasce/conclui | `withTenant` → **tx** → `INSERT checklist_runs` → commit (`checklist-prisma.repository.ts:395-449, 667-693`) | Mesma tx: `INSERT checklist_runs` **+ `INSERT cloud_usage_events` (chave estável, ON CONFLICT DO NOTHING)** → commit |
| 2. Serviço publica | `publishDomainEvent("checklist_run.created"/"completed")` **após** o commit (`checklist.service.ts:262-280, 557-570`) | Igual — o evento continua existindo para notificação/realtime; **só a medição faturável sai dele** |
| 3. Medição | `publisher.ts:59` → `recordCloudUsageForDomainEvent` → `recordCloudUsageBestEffort` → `.catch(warn)` (`cloud-usage.service.ts:156-176`) | O ramo `checklist_run.created`/`completed` de `cloud-usage.events.ts:20-54` **deixa de existir** (já foi gravado no passo 1). Os demais ramos ficam best-effort (fora do P0 — §3.5, pendência nomeada). |
| 4. Replay `client_run_key` | `created:false` → não publica → **nunca republica** (`:257-262`) | `created:false` → não publica → **não precisa**: a métrica commitou com a run do vencedor. Invariante I1 (§7) é verificável por SQL. |
| 5. Rateio lê a base | `listUsageDailyAggregates` de **plataforma** (`cloud-cost-allocation-prisma.repository.ts:141-150`, `take: 100_000`), sobre uma projeção que **ninguém agenda** e que está sob **FORCE RLS** | `SUM … GROUP BY` **no banco**, sobre `cloud_usage_events`, **por tenant sob o próprio contexto RLS** (§3.2) — sem projeção no meio, sem `take` |
| 6. Resumo de custo | `normalizeSummaryFilters` crava `limit: 10_000` (`aws-cur.service.ts:184-192`); `sumCosts` reduz o array (`:194-196`); `take` no repositório (`aws-cur-prisma.repository.ts:156`) | `groupBy`/`aggregate` **no banco**, sem `take`; detalhe (`/line-items`) segue paginado ≤500 (`:179-182`) |

**Fila e paralelismo:** o porteiro do #380 (l.113) mediu worktrees `gov-descuido` (outra sessão) e `san2-r`
(órfão) — **não tocar**. Nenhum outro bloco de produto está em execução paralela registrada; se `B-O6R-04` abrir,
os módulos são disjuntos (estoque × billing) e só o registro compartilhado (`pendencias.md`, `Kpis/*`,
`status-geral.md`) conflita textualmente — remédio: **APPEND** e rebase antes do PR.

---

## §2 · Diagnóstico MEDIDO em `fe2748c` — a cadeia de cada P0, e o que a leitura encontrou além do enunciado

### 2.1 · DIN-005 — a cadeia, linha a linha

1. `checklist.service.ts:248-255` — `repository.createRun(...)` volta com `{ run, created }`. A tx **já commitou**
   dentro de `RlsPrismaChecklistRepository.withTenant` (`checklist-prisma.repository.ts:977-978, 1066`).
2. `:262-280` — `if (created)`: audita e chama `publishDomainEvent("checklist_run.created", …)`. Replay → `created:false`
   → **pula os dois efeitos** (comentário `D-CHK-DISPATCH-CREATE`, `:257-261`, escrito para evitar **super**-contagem;
   o efeito colateral é que a **sub**-contagem de uma falha anterior nunca se repara).
3. `domain-event.publisher.ts:59` — `recordCloudUsageForDomainEvent(event)` **síncrono e sem await**, antes até de
   saber se há job.
4. `cloud-usage.events.ts:38-53` — dois `recordCloudUsageBestEffort` (`checklist_run.created` e
   `checklist_runs_count`, ambos `quantity: 1`), com `idempotencyKey` derivada de **`event.id` = `randomUUID()`**
   (`publisher.ts:49`) — chave **nova a cada emissão**, não da run.
5. `cloud-usage.service.ts:156-176` — `createDefaultCloudUsageService().then(record).catch(warn)`: fire-and-forget; o
   comentário `:149-153` declara o desenho *"BEST-EFFORT e fire-and-forget"*. O `drainCloudUsageBestEffortForTests`
   (`:182-184`) existe **porque** a gravação aterrissa depois da resposta.
6. Conclusão: `checklist.service.ts:557-570` publica `checklist_run.completed` com `isReopenedRun`; `cloud-usage.events.ts:20-36`
   grava `quantity: isReopenedRun ? 0 : 1`. Mesma classe: pós-commit, best-effort, chave por emissão.
7. Base de rateio: `cloud-cost-allocation.rules.ts:61-66` — `basisMetricKeys: ["checklist_run.completed", "checklist_runs_count"]`.

**Origem (escopo `pre-existente` com evidência):** `git log -S "recordCloudUsageBestEffort" -- src | tail -1` →
`0648a8e1 2026-06-08 feat: add cloud usage metering foundation`; `checklist_runs_count` idem. O bloco fecha o P0
**dentro-do-bloco**; a origem só importa para os achados-irmãos do §2.4.

### 2.2 · DIN-007 — a cadeia, linha a linha

1. `aws-cur.service.ts:85-87` — `getSummary` → `normalizeSummaryFilters(filters)` → `repository.listLineItems(normalized)`.
2. `:184-192` — `normalizeSummaryFilters` **crava `limit: 10_000`** (sobrescreve qualquer `limit` do chamador).
3. `aws-cur-prisma.repository.ts:136-160` — `findMany({ …, take: filters.limit ?? 200 })`; **nenhum** `count`.
4. `:91-100` — o serviço reduz **só o array retornado**: `total += line.unblendedCost` (float, N acumulações).
5. `aws-cur.types.ts:108-118` — `CloudCostSummary` não carrega contagem nem aviso: o consumidor **não tem como saber**
   que faltou linha. O adapter do frontend lê `totalCost || totalUnblendedCost` (`cloud-billing.adapter.ts:127`).
6. `cloud_cost_line_items` **não tem RLS** (a migração `20260612000000_add_aws_cur_cost_import` não cria policy; a
   `20260613000000` só protege `tenant_cloud_cost_allocations`) — é tabela de plataforma: `groupBy` sem contexto de
   tenant é correto aqui (diferente de `cloud_usage_events`, §2.4-c).

**Origem:** `git log -S "limit: 10_000" -- src | tail -1` → `0d8194e0 2026-06-08 feat: add AWS CUR cost import
foundation`. Idem: fecha **dentro-do-bloco**.

### 2.3 · Baseline (por LEITURA — o dev re-mede por execução na abertura, §8)

Arquivos-alvo que o bloco toca ou cuja semântica preserva, com `grep -c "^\s*\(test\|it\)("`:
`cloud-usage` 7 · `cloud-usage-routes` 3 · `cloud-usage-checklist-reopen` 4 · `aws-cur-cost-import` 7 ·
`aws-cur-cost-routes` 3 · `cloud-cost-allocation` 7 · `cloud-cost-allocation-routes` 2 · `domain-events` 4 ·
`checklist-run-create-concurrency-db` 3 · `checklist-run-lifecycle-db` 7 → **N = 47**. Meta §C: **M ≥ 2N = 94** casos
nesses arquivos + os novos → **piso único: ≥ 47 casos NOVOS** (número único; ver §8 — não há segundo piso).
Denominador da suíte: **2936/2938** publicado no #380 e **reexecutado exato** pelo porteiro (parecer l.37).
**Detecção do defeito hoje = 0:** nenhum teste da suíte injeta falha entre commit e medição, nem semeia >10.000
linhas de custo (medido por ausência de qualquer fixture com `10_001`/`10001` em `tests/` — prova por presença fica
para o vermelho-controle na base, §8).

### 2.4 · ACHADOS DE PLANEJAMENTO — o que a leitura encontrou além do enunciado (registrados, não silenciados; §A2)

Os quatro abaixo **não estão nos achados** e **não ampliam o escopo** por si; entram porque decidem o DESENHO do §3
ou viram pendência nomeada no §12. Todos `pre-existente`, com origem datada.

**(a) A projeção que o rateio lê NÃO tem quem a construa.** `cloud-cost-allocation.service.ts:49-52` lê
`listUsageDailyAggregates(period)`; a projeção é escrita só por `aggregateDailyUsage` (`cloud-usage.service.ts:46-92`),
exposta pelo job `cloud-usage.aggregate-daily` (`job.registry.ts:50`, `cloud-usage.jobs.ts`) e por
`cloud-usage.aggregator.ts`. **Ninguém em `src/` enfileira esse job nem chama o aggregator**: `rg "aggregate-daily|aggregateDailyUsage" src`
devolve só `job.types.ts:6`, `job.registry.ts:50`, `cloud-usage.jobs.ts`, `cloud-usage.aggregator.ts:3-6` e a string
`generatedBy` em `cloud-usage.service.ts:83`. Nenhuma rota (`cloud-usage.routes.ts` tem 3 `GET`), nenhum
`enqueueInitial*` no bootstrap (`job-worker.bootstrap.ts:62-83` sobe 4 varreduras; nenhuma é esta). Em produção a
base de rateio de `checklist_runs_count` é **vazia por construção** → `missing_usage_basis` → custo `unallocated`.
Origem: `0648a8e1` (2026-06-08). **Consequência para o desenho:** durabilizar a métrica e continuar lendo a projeção
seria consertar o P0 no papel. O rateio passa a ler a **tabela durável** (§3.2). A projeção segue existindo para
`GET /platform/cloud-usage/tenants/:id/daily`; sua agenda vira pendência (§12).

**(b) Leitura de PLATAFORMA sobre tabela com FORCE RLS.** `prisma/migrations/20260611000000_add_cloud_usage_metering/migration.sql:57-68`:
`cloud_usage_events` e `cloud_usage_daily_aggregates` têm `ENABLE` **e `FORCE ROW LEVEL SECURITY`** com policy
`tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`. `FORCE` aplica ao **dono da tabela**;
só `superuser`/`BYPASSRLS` escapa. As leituras de plataforma (`RlsPrismaCloudUsageRepository.listEvents/listDailyAggregates`
sem `tenantId`, `cloud-usage-prisma.repository.ts:166-174, 190-198`; e `listUsageDailyAggregates` do rateio) rodam
com o `PrismaClient` cru, **sem GUC** → `NULLIF('', '')` = NULL → policy falsa → **0 linhas** para qualquer papel
que não bypasse RLS. Dev e CI usam `postgres` (superuser: `ci.yml:15,109`) — o defeito é **invisível na suíte**. O
papel de produção não é conhecido por este plano (não medido; `fly.production.toml` não o declara). **Consequência
para o desenho:** a base do rateio é lida **por tenant, sob `withTenantRls(tenant.id)`** — correta em qualquer papel
(§3.2), e a abertura inclui um drill com papel **sem BYPASSRLS** (§8) que transforma a hipótese em medida. As demais
leituras de plataforma viram pendência (§12), não escopo.

**(c) O mesmo teto, 10× maior, no rateio.** `cloud-cost-allocation-prisma.repository.ts:129-135, 142-150` —
`take: 100_000` em `listCostLineItems` e `listUsageDailyAggregates`. Origem: `6f27faae 2026-06-08 feat: add cloud
cost allocation engine`. O engine itera **linha a linha** (`engine.ts:24-62`: tag direta OU regra por linha) — não
se reduz a um `SUM`; a cura é paginação por cursor, fora deste bloco. **O que o bloco faz:** transforma o silêncio
em **falha alta** — `count` antes do `findMany`; `count > CAP` → a run termina `failed` com `errorMessage`
`period_exceeds_line_item_cap` (§3.2-c). O aceite "10.001 no rateio" fica verdadeiro **e** honesto: abaixo do teto
por prova, acima do teto por recusa explícita, nunca por truncamento mudo.

**(d) As outras chaves faturáveis continuam best-effort.** `basisMetricKeys` de storage
(`checklist_attachment.uploaded.bytes`/`downloaded.bytes`, `rules.ts:36-41`), jobs (`job.executed`/`job_executions_count`,
`:49`, gravadas em `job.worker.ts:65-94`) e api (`:57`) passam pelo **mesmo** `recordCloudUsageBestEffort`. O P0 nomeia
a vistoria (created/completed); o bloco fecha **essas duas** com o mecanismo do §3.1 e **nomeia a classe** (§12) com o
remédio (mesma disciplina: append na tx do fato de origem). Fechar tudo aqui seria o outbox genérico da `Ω6R D-002`
— que o dono optou por não deliberar.

---

## §3 · Correção proposta — o desenho (o COMO fino é do dev; aqui vai o QUÊ, o ONDE e o critério)

### 3.1 · DIN-005 — a unidade faturável nasce na MESMA transação da run, com chave estável

**Mecanismo.** A linha de `cloud_usage_events` é escrita **dentro** da transação que insere/conclui a run, pelo
**repositório** (que é quem tem a `tx`), via um port novo no módulo dono da tabela:

- **NOVO** `src/modules/cloud-usage/cloud-usage.outbox.ts` — espelho de `impound.outbox.repository.ts:33-46`:
  - `buildChecklistRunUsageEvents(kind, run): readonly RecordUsageEventInput[]` — **puro**: `kind ∈ {created, completed}`;
    `created` → 2 inputs (`checklist_run.created`, `checklist_runs_count`, `quantity 1`); `completed` → 1 input
    (`checklist_run.completed`, `quantity = run.reopenedFromRunId ? 0 : 1`, preservando a regra da junta PR-03 de
    `cloud-usage.events.ts:20-35`). **Chave estável**: `checklist_run:{run.id}:{metricKey}` (+ sufixo `:reopened` na
    conclusão reaberta, como hoje) — derivada da **run**, nunca de `event.id`. `sourceType: "checklist_run"`,
    `sourceId: run.id`, `occurredAt = run.startedAt | run.completedAt`, `metadata` **sanitizada** por
    `sanitizeCloudUsageMetadata` e validada por `validateInput` (hoje privado em `cloud-usage.service.ts:222-244` → exportar).
  - `appendCloudUsageEventsTx(client: PrismaExecutor, inputs)` — **SÓ insere**, com **`INSERT … ON CONFLICT (tenant_id,
    idempotency_key) DO NOTHING`**. Duas formas aceitáveis, o dev escolhe e **prova no log de query** qual SQL sai:
    `createMany({ data, skipDuplicates: true })` (Prisma emite `ON CONFLICT DO NOTHING` no Postgres) ou `$executeRaw`
    como `createRunWithClientKey` (`checklist-prisma.repository.ts:437-449`). O que é **proibido**: `create` (P2002
    aborta a tx interativa → 25P02 — a lição registrada ali) e `findUnique`+`create` (corrida). Nunca chama serviço,
    nunca abre tx própria.
- **Chamadores** (todos já dentro de `withTenant` → `withTenantRls` → `$transaction`, `checklist-prisma.repository.ts:1066`):
  `createRun` (`:410-434`, ramo sem chave) e `createRunWithClientKey` (`:445-`, ramo com chave, **só quando inseriu**
  — 1 linha do `RETURNING`), ambos logo após o INSERT da run; `completeRun` (`:667-693`) após o `update`. **Nada muda
  na assinatura pública** do repositório nem do serviço.
- **Dublê em memória** (`checklist.repository.ts:300, :415` — `InMemoryChecklistRepository.createRun/completeRun`):
  grava no repositório de memória do cloud-usage (`getMemoryCloudUsageRepositoryForTests`, `cloud-usage.service.ts:197`)
  **com `await`**, pelo mesmo `buildChecklistRunUsageEvents`. É dublê para as suítes em memória continuarem
  exercendo a semântica — **não é evidência** de atomicidade (regra do `financial-uow.ts:31-34`); a prova é a suíte
  `-db` (§7).

**O que acontece com o `.catch()`.** `recordCloudUsageBestEffort` (`cloud-usage.service.ts:156-176`) **continua
existindo** para os ramos que este bloco não fecha (§2.4-d) — mas **deixa de ser chamado** para `checklist_run.created`
e `checklist_run.completed`: os dois ramos saem de `cloud-usage.events.ts:20-54`. Se ficassem, cada emissão gravaria
uma **segunda** linha (chave por `event.id`) e a base dobraria — o aceite C1 (§7) mata essa regressão por execução.
O comentário `:149-153` é reescrito para dizer o que passa a ser verdade: *"best-effort SÓ para o que não é base de
faturamento da vistoria; a vistoria é medida na transação"*.

**Como o replay "volta a republicar".** Não volta — e **não precisa**: com a captura na tx, **não existe estado em
que a run exista e a métrica não** (invariante **I1**: `∀ r ∈ checklist_runs ∃ e ∈ cloud_usage_events : e.tenant_id =
r.tenant_id ∧ e.source_type='checklist_run' ∧ e.source_id = r.id ∧ e.metric_key='checklist_runs_count'`; **I2**: idem
para `checklist_run.completed` quando `r.completed_at IS NOT NULL OR r.status='pending_acknowledgement'`, com
`quantity = 0` se `r.reopened_from_run_id IS NOT NULL`). O replay de `client_run_key` encontra a run do vencedor
(`created:false` ou `already_applied` em `mobile-checklist-sync.ts:400-405`) e a métrica **já está lá**. A falha "pós-
commit e antes da medição" que o achado descreve **deixa de ter janela**: se a medição falha, a run **não commita** e
o chamador recebe erro (não confirmação) — e o **retry do cliente** (fila offline, §B6) é quem repara, criando run e
métrica juntas. Os dois ramos são aceites com fault injection (F1–F4, §7).

**Semântica de cobrança PRESERVADA (não é decisão deste bloco mudá-la):** (i) `checklist_run.completed` é gravada
no `completeRun` **mesmo com `status = pending_acknowledgement`**, como hoje (`checklist.service.ts:557` publica sem
olhar o status); (ii) reaberta → `quantity 0` (junta PR-03); (iii) adoção de run em voo (`:306-309`) **não** grava
nada, como hoje. Mudar qualquer um é decisão de produto — fora.

**Reparação do subfaturamento JÁ existente.** Há dado em produção? **Não há produção**: o porteiro mediu
`deploy-staging` **skipped** em todos os runs (parecer l.16) e `gh variable list` vazio (l.124); `docs/go-live-readiness.md`
fixa a ativação como fronteira humana. A **base viva** `erp-postgres` (demo) **não é alvo de agente nem para
leitura** — logo o *tamanho* do buraco na demo **não é medido por este bloco**, e dizer um número seria inventá-lo.
O bloco entrega o **instrumento**: `scripts/reconcile-checklist-usage.ts` (tsx, **dry-run por default**, `--apply`
para escrever), que, **por tenant sob `withTenantRls`**, insere as linhas faltantes por `INSERT … SELECT … WHERE NOT
EXISTS (… source_type='checklist_run' AND source_id = r.id AND metric_key = …) ON CONFLICT DO NOTHING`. **Dedup por
identidade da FONTE, não pela chave nova** — as linhas legadas (chave `{event.id}:…`, `source_id = runId`) existem para
toda run medida com sucesso, e dedupar pela chave estável as contaria de novo. Idempotente, aditivo, reexecutável;
imprime `inseridas/existentes` por tenant e por chave. Provado no cluster descartável (K1–K3, §7). Rodar na demo é
**decisão do dono** (§12, pendência).

### 3.2 · O rateio lê a base DURÁVEL, por tenant, no banco — sem projeção no meio

**(a) Port novo no repositório do rateio.** `CloudCostAllocationRepository` (`cloud-cost-allocation.repository.ts:25-27`)
ganha `sumUsageBasis(periodStart, periodEnd, tenantIds): Promise<readonly UsageBasisRow[]>` com
`UsageBasisRow = { tenantId, metricKey, unit, sourceType, quantity }`. **Prisma:** para cada tenant de `listTenants()`,
`withTenantRls(prisma, tenant.id, tx => tx.cloudUsageEvent.groupBy({ by: ["tenant_id","metric_key","unit","source_type"],
where: { occurred_at: { gte, lte } }, _sum: { quantity: true } }))` — `SUM … GROUP BY` **no banco**, **sem `take`**,
**sob o contexto RLS do próprio tenant** (§2.4-b: é a única forma correta em qualquer papel de banco). N consultas
para N organizações — N é pequeno e o rateio é operação de plataforma, não de request. **Memória:** reduz sobre os
eventos do repositório de memória do cloud-usage, sem limite.
**(b) `listUsageDailyAggregates` sai do caminho do rateio** (`cloud-cost-allocation.service.ts:49-52` passa a chamar
`sumUsageBasis`); `AllocationEngineInput.usageAggregates` (`types.ts:118`) vira `usageBasis: readonly UsageBasisRow[]`
— `resolveBasis` (`engine.ts:80-101`) só usa `tenantId`/`metricKey`/`quantity`, o corpo não muda. O método
`listUsageDailyAggregates` **fica** (não é apagado; deixa de ser lido pelo rateio) — a projeção diária continua servindo
`GET /platform/cloud-usage/tenants/:id/daily`.
**(c) Teto do rateio: de mudo a alto.** `listCostLineItems` (`cloud-cost-allocation-prisma.repository.ts:128-140`):
`count` com o mesmo `where` **antes** do `findMany`; `count > CLOUD_COST_ALLOCATION_LINE_ITEM_CAP` (constante exportada,
**100_000**, mesmo valor de hoje) → lança `CloudCostAllocationError("period_exceeds_line_item_cap")` com `{count, cap}`
no `errorMessage` saneado → a run termina `failed` pelo `catch` já existente (`service.ts:75-85`). O teto é
**injetável** pelo construtor (para a prova com cap pequeno, §7 B5) e a constante é asseverada à parte.

### 3.3 · DIN-007 — `SUM`/`GROUP BY` no banco; o detalhe segue paginado

- `CloudCostRepository` (`aws-cur.repository.ts:14-19`) ganha `summarizeLineItems(filters): Promise<CloudCostSummaryRows>`
  com `{ total: Decimal|string, lineItemCount: number, byServiceCurrency: [{serviceCode, currency, unblendedCost}],
  currencies: string[] }`. **Prisma:** `aggregate({ where, _sum: { unblended_cost: true }, _count: { _all: true } })` +
  `groupBy({ by: ["service_code","currency"], where, _sum })` — **mesmo `where` de `listLineItems`** (extraído para
  `buildLineItemWhere(filters)`, para os dois caminhos não divergirem), **sem `take`**. **Memória:** reduz sobre **todas**
  as linhas (o `InMemoryCloudCostRepository` hoje também aplica `limit` — conferir e remover só no caminho do resumo).
- `CloudCostService.getSummary` (`aws-cur.service.ts:85-116`): remove `limit: 10_000` de `normalizeSummaryFilters`
  (`:184-192` — o campo `limit` **deixa de existir** nesse normalizador; `listLineItems` mantém o seu, `:179-182`);
  `sumCosts`/loop de acumulação saem do caminho do resumo (ficam para `importAwsCurCsv`, `:39`, que soma o que acabou
  de criar — sem `take`, correto). **Conversão única na borda**: o `Decimal` do banco vira `number` **uma vez** por campo
  (`roundCost`), não N acumulações em float.
- **Contrato aditivo** (§5): `CloudCostSummary` ganha `lineItemCount` (linhas agregadas) — é o que permite ao
  consumidor cruzar resumo × detalhe paginado. Nenhum campo sai; `totalUnblendedCost: number` **fica** (mudar para
  string-decimal muda o contrato do painel — pendência, §12).

### 3.4 · O mapa "outbox/inbox" do aceite ↔ o que é entregue — e por que NÃO há dispatcher

| Termo do aceite (`PLANO_O6R.md:12`) | Entregue | Onde |
|---|---|---|
| **Outbox** — *"evento Outbox estável na mesma transação da checklist run"* | A **linha faturável** em `cloud_usage_events`, com **ID/chave estável derivada da run**, gravada **na mesma tx** da run. É captura transacional append-only (o módulo não tem `UPDATE`/`DELETE` dessa linha). | §3.1 |
| **Inbox / upsert idempotente** | (i) o próprio `ON CONFLICT (tenant_id, idempotency_key) DO NOTHING` — reentrega/replay não duplica; (ii) a projeção diária, que **já é** upsert idempotente (`upsertDailyAggregate` grava `quantity` = soma recomputada, `cloud-usage-prisma.repository.ts:82-117` — sobrescreve, não incrementa). | §3.1, §7 R-série |
| **Dispatcher com lease/retry** | **Não há.** O "consumidor" é o mesmo banco: quem lê a base é o rateio, **direto** da tabela durável (§3.2). Um dispatcher que movesse linhas de uma tabela para outra do **mesmo** Postgres adicionaria exatamente o componente cuja durabilidade a auditoria contesta (`ARQ-001`/`PERF-001`) **sem adicionar garantia**. | §4 |
| **Exactly-once efetivo** (prompt) | **At-least-once + idempotência por chave estável** = efetivamente uma unidade por (run, métrica). É isto que "exactly-once" significa na literatura do padrão — e é o que a PD-1 (§11) fecha com ≥3 fontes **antes** de `cloud-usage.outbox.ts` existir. Documentado em `API_CONTRACTS.md` como `checklist_run_billing@2026-09-06.b-o6r-06` (§5). | §5, §11 |

**Plano B — para a junta decidir NA REVISÃO DO PLANO, não depois.** Se o crítico/junta sustentar que a forma literal
(tabela `cloud_usage_outbox_events` + dispatcher) é exigida: (1) **migration ADITIVA** espelho de
`20260853000000_add_impound_outbox_events` (tabela nova, trigger de imutabilidade, RLS FORCE, `up`/`down` com os
`DROP … IF EXISTS` comentados como lá) — `prisma/**` entra no escopo, **não é destrutiva** (não há parada §C7.5);
(2) dispatcher **próprio** do módulo, **Postgres-nativo** (`SELECT … FOR UPDATE SKIP LOCKED` + `lease_until`, laço
sem `setInterval` sobreposto), **sem passar por `infra/jobs`** — para não herdar `LPOP` destrutivo
(`job.queue.ts:57-75`) como durável; (3) PD adicional (`SKIP LOCKED`/lease, ≥3 fontes); (4) custo: +1 tabela, +1
laço, +~15 casos, e o rateio **ainda** precisa ler a base durável por tenant (§3.2 não é opcional em nenhum dos dois
planos). Este plano recomenda o Plano A (§3.1) porque cumpre o teste do achado **com menos partes móveis** e sem
apoiar dinheiro em consumidor nenhum.

### 3.5 · O que fica DE FORA, com o porquê (para a junta não descobrir sozinha)

1. Lease/reclaim/deadline de `infra/jobs` — `B-O6R-08` (`P-O6R-B08`); este bloco **não toca `src/infra/jobs/**`**.
2. As demais chaves faturáveis best-effort (§2.4-d) — pendência nomeada com o remédio; fechar todas = outbox genérico
   da `Ω6R D-002`, não deliberada.
3. Paginação por cursor do rateio (§2.4-c) — o bloco só troca truncamento mudo por recusa alta.
4. Leituras de plataforma sob FORCE RLS fora do rateio (§2.4-b: `GET /platform/cloud-usage/summary`, `/daily` sem
   tenant) — pendência com o drill que a prova.
5. Agenda do `cloud-usage.aggregate-daily` (§2.4-a) — deixa de ser base de dinheiro; sua agenda é produto/B08.
6. `totalUnblendedCost` como string-decimal no contrato — muda o painel; pendência.
7. Frontend e mobile — **zero toque** (contrato aditivo; o adapter lê `totalUnblendedCost` e ignora campos novos).

---

## §4 · RESSALVA (2) DO PORTEIRO — como a durabilidade convive com `ARQ-001`/`PERF-001` ABERTOS (escrito para ser atacado)

**Tese, em uma linha:** depois deste bloco **nenhum real depende de consumidor nenhum** — a unidade faturável
commita com a run, e o rateio a lê direto da tabela onde ela commitou. `infra/jobs` continua exatamente tão
não-durável quanto a auditoria diz (`LPOP` destrutivo em `job.queue.ts:57`, tick sem in-flight guard em
`job.worker.ts:104-114`), e este bloco **não o herda como durável**: ele **não o usa** no caminho do dinheiro.

**Evidência, componente a componente (o que depende de `infra/jobs` DEPOIS do bloco):**

| Componente | Depende de `infra/jobs`? | Se `ARQ-001` (job perdido no crash) | Se `PERF-001` (tick sobreposto / sem deadline) | Dinheiro se perde? |
|---|---|---|---|---|
| Gravação da unidade faturável (§3.1) | **Não** — `INSERT` na tx da run, caminho síncrono do request | n/a | n/a | **Não** — ou commita com a run, ou a run não existe |
| Replay/retry do cliente (fila offline, sync) | **Não** — HTTP síncrono; `ON CONFLICT DO NOTHING` | n/a | n/a | Não |
| Base do rateio (§3.2) | **Não** — `groupBy` na tabela durável, no momento da run | n/a | n/a | Não |
| Run de rateio via `POST /platform/cloud-cost-allocations/runs` | **Não** — executa **inline** no request (`cloud-cost-allocation.routes.ts:37-49` → `allocateCostsForPeriod`) | n/a | n/a | Não |
| Run de rateio via job `cloud-cost-allocation.run` (`cloud-cost-allocation.jobs.ts`) | **Sim** (trigger alternativo) | Run fica `processing` **visível** e **reexecutável** (`executeAllocationRun(runId)`; "reexecutar run nao duplica allocations", `tests/cloud-cost-allocation.test.ts`) | Duas execuções sobrepostas → `replaceTenantAllocations` idempotente | **Não** — atrasa e fica visível; nunca subtrai |
| Projeção diária `cloud-usage.aggregate-daily` | **Sim** — e **ninguém a agenda** (§2.4-a) | Projeção fica defasada | Duas execuções → mesmo upsert (sobrescreve a soma recomputada) | **Não** — deixou de ser base de dinheiro neste bloco |
| Domain event `checklist_run.created/completed` → `notification-dispatch` (`publisher.ts:27-40`) | Sim | Notificação perdida (**não é faturamento**) | idem | Não — fora do P0 (é o `ARQ-001` do B08) |

**O que este plano NÃO afirma:** que `infra/jobs` seja durável; que o rateio disparado por job não possa ficar preso;
que a projeção diária esteja em dia. Afirma só que **nenhuma dessas três coisas altera o valor cobrado** — atrasa ou
fica visível. É a propriedade que o `financial-uow` já comprou para o ledger (B02): o que é dinheiro commita na
transação; o assíncrono é derivado e recomputável.

**Ponto de ataque previsto (e a resposta que o dev tem de PROVAR, não afirmar):** "então o `.catch(warn)` continua
engolindo falha em `recordCloudUsageBestEffort`" — sim, para as chaves do §2.4-d; **não** para as duas do P0, que
**não passam mais por ele** (aceite **C1**: por execução, um spy no repositório de memória prova que
`publishDomainEvent("checklist_run.created")` **não** cria evento de uso; e **A1** prova que a criação da run cria).

---

## §5 · Contrato (delta em `API_CONTRACTS.md`, versionado por bloco) e modelagem

**Modelagem: ZERO migration; `prisma/**` NÃO entra.** Tudo que o Plano A precisa já existe: `cloud_usage_events`
com `@@unique([tenant_id, idempotency_key])` (`schema.prisma:465`), `Decimal(20,6)` em `quantity` e
`unblended_cost` (`:457`, `:541`), `timestamptz` em `occurred_at`/`billing_period_*`, RLS FORCE por tenant, FK
`tenant` `Restrict`. Não há delete lógico a introduzir (as tabelas são append-only por uso). **Se a junta escolher o
Plano B (§3.4)**: migration **aditiva** com `up`/`down`, espelho de `20260853000000_add_impound_outbox_events`; nada
destrutivo — não há parada §C7.5 em nenhum dos dois planos. **Nenhuma dependência nova** (Prisma `groupBy`/`aggregate`/
`createMany` e `tsx` já estão em `package.json`; `package-lock.json` intocado — se o dev precisar de pacote novo, **o
quórum muda para 5/5 + PD** e o dev PARA e devolve ao planejador).

**Contratos (nomes versionados, idioma da casa — ex.: `worker_health@2026-08-15.b-o6r-05`):**

1. **`cloud_cost_summary@2026-09-06.b-o6r-06`** — `GET /api/v1/platform/cloud-costs/summary` (`API_CONTRACTS.md:204`).
   Forma **inalterada + 1 campo aditivo**: `lineItemCount: integer` (linhas agregadas no período/filtro).
   `totalUnblendedCost` e `services[].unblendedCost` passam a ser **`SUM` no banco sem teto** (antes: soma em processo
   das primeiras 10.000). Códigos: 200; 400 filtros inválidos (inalterado); 403 sem `platform:cloud-costs:read`
   (inalterado). `GET /line-items` **inalterado** (paginado, `limit` ≤ 500).
2. **`cloud_cost_allocation_run@2026-09-06.b-o6r-06`** — `POST /api/v1/platform/cloud-cost-allocations/runs`: 201 como
   hoje; a run pode terminar `status: "failed"` com `errorMessage` iniciado por `period_exceeds_line_item_cap` quando
   o período tem mais de `100_000` linhas de custo — **antes** terminava `completed` com valor truncado em silêncio.
   Base de rateio: lida da tabela de eventos por tenant (efeito observável: rateio **sem** precisar da projeção diária).
3. **`checklist_run_billing@2026-09-06.b-o6r-06`** — `POST /checklists/:id/runs` (201), `POST /checklists/runs/:id/complete`
   e `POST /api/v1/mobile/sync/checklists` (`checklist.run_create`/`checklist.complete`): **forma inalterada**;
   invariante nova documentada: *"201/`accepted`/`already_applied` implica a unidade faturável correspondente
   COMMITADA (I1/I2 do §3.1); falha na medição → 5xx e nenhuma run persistida; replay da mesma `client_run_key`/`local_run_id`
   → 1 run, 1 unidade por métrica"*. Sem campo novo no DTO (a métrica não sai para o cliente — §B2.8).
4. `docs/api.md` **não muda de forma** (só cita os endpoints; `:284` já lista `/cloud-costs/summary`).

**Ordem obrigatória (§6 do briefing):** o commit que edita `API_CONTRACTS.md` vem **DEPOIS** do commit que contém o
drill que sustenta cada contrato (S1 para 1; B5 para 2; A1/F1/R1 para 3). Prova no fechamento: `git log --format="%h %s"
-- API_CONTRACTS.md` × `git log --format="%h %s" -- tests/o6r06-*.test.ts` — o hash do contrato é posterior ao do
drill correspondente, e a ata registra os dois hashes.

**Linguagem (§B3):** nada disto aparece na UI; o painel continua dizendo "Organização"/"custo de nuvem". Sem termo
técnico novo exposto.

---

## §6 · Escopo — caminhos exatos (§C4). Arquivo fora das listas → o dev PARA e devolve ao planejador

### PERMITIDO — código (`src/`)

| # | Caminho | O que muda (e só isso) |
|---|---|---|
| 1 | `src/modules/cloud-usage/cloud-usage.outbox.ts` | **NOVO** — `buildChecklistRunUsageEvents` + `appendCloudUsageEventsTx` (§3.1). Espelho: `impound.outbox.repository.ts`. |
| 2 | `src/modules/cloud-usage/cloud-usage.service.ts` | exportar `validateInput` (`:222`) e o sanitizador; reescrever o comentário `:149-153`; **nada** no `recordCloudUsageBestEffort` além do comentário. |
| 3 | `src/modules/cloud-usage/cloud-usage.events.ts` | **remover** os ramos `checklist_run.completed` (`:20-36`) e `checklist_run.created` (`:38-54`). Os demais ramos ficam **verbatim**. |
| 4 | `src/modules/cloud-usage/cloud-usage.repository.ts` | só se o dublê de memória precisar de um `listByTenant` para o §3.2-memória; sem mudar métodos existentes. |
| 5 | `src/modules/cloud-usage/index.ts` | export do outbox. |
| 6 | `src/modules/checklists/checklist-prisma.repository.ts` | chamadas a `appendCloudUsageEventsTx` em `createRun` (`:410-434`), `createRunWithClientKey` (`:445-`, ramo "inseriu") e `completeRun` (`:667-693`). **Nada** em templates/answers/markers/attachments/reopen. |
| 7 | `src/modules/checklists/checklist.repository.ts` | dublê de memória: `createRun` (`:300`) e `completeRun` (`:415`) gravam no repositório de memória do cloud-usage. |
| 8 | `src/modules/checklists/checklist.service.ts` | **só comentários** (`:257-261` e `:550-556` passam a dizer onde a métrica é gravada). Zero lógica. |
| 9 | `src/modules/cloud-costs/aws-cur.repository.ts` · `aws-cur-prisma.repository.ts` · `aws-cur.service.ts` · `aws-cur.types.ts` | port `summarizeLineItems` + `buildLineItemWhere`; `getSummary` sem `limit`; `CloudCostSummary.lineItemCount` (§3.3). `importAwsCurCsv`, `listLineItems`, `normalizeLimit` **intocados**. |
| 10 | `src/modules/cloud-cost-allocation/cloud-cost-allocation.repository.ts` · `-prisma.repository.ts` · `.service.ts` · `.engine.ts` · `.types.ts` | port `sumUsageBasis`; `usageAggregates`→`usageBasis`; `count`+cap alto em `listCostLineItems`; `CLOUD_COST_ALLOCATION_LINE_ITEM_CAP` exportada (§3.2). `rules.ts` **intocado**. |
| 11 | `scripts/reconcile-checklist-usage.ts` | **NOVO** — reparação idempotente, dry-run por default (§3.1). Idioma: `scripts/backfill-third-party-vehicle-identity.ts`. |

### PERMITIDO — testes (`tests/`)

`tests/o6r06-usage-atomic-db.test.ts` · `tests/o6r06-usage-atomic.test.ts` · `tests/o6r06-usage-fault-injection.test.ts` ·
`tests/o6r06-cost-summary-sum-db.test.ts` · `tests/o6r06-cost-summary-sum.test.ts` · `tests/o6r06-allocation-basis-rls-db.test.ts` ·
`tests/o6r06-billing-census.test.ts` (7 **NOVOS**); `tests/cloud-usage-checklist-reopen.test.ts` (**migrar** os 4 casos
para o caminho da tx — a semântica é a mesma, o mecanismo mudou); `tests/cloud-cost-allocation.test.ts` e
`tests/cloud-cost-allocation-routes.test.ts` (adaptar fixtures `usageAggregates`→eventos de uso); `tests/aws-cur-cost-import.test.ts`
("summary agrega custos por serviceCode" ganha `lineItemCount`); `tests/helpers/` **só leitura** (`pg-barrier.ts`,
`db-permissions.ts`) — helper novo só se nomeado aqui: `tests/helpers/o6r06-cost-fixtures.ts` (semeia 10.001 linhas por
`createMany`). `.github/workflows/ci.yml`: **acrescentar** os 3 `-db` novos à lista `SUITES` do job `backend-postgres`
(`:172-214`) — linha de append, nada removido.

### PERMITIDO — registro

`API_CONTRACTS.md` (§5, após os drills) · `docs/omega-pd.md` (2 PDs, §11) · `docs/revisoes/O6R/achados.jsonl` (DIN-005,
DIN-007 → `fechado` na autoria; **backfill SEC-004**) · `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` (idem + backfill) ·
`Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` (**só** a linha `var FROZEN`,
`:1623`) · `agent-orchestration/controle/pendencias.md` (**APPEND**) · `pendencias-indice.md` (gerado por
`gerar-indice-pendencias.py`) · `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` ·
`agent-orchestration/omega/juntas/{BRIEFING-B-O6R-06.md,J-B-O6R-06.md,votos/B-O6R-06/*}` · este plano (emendas em APPEND).

### PROIBIDO

`prisma/**` (Plano A; entra **só** se a junta escolher o Plano B, e aí só uma migration aditiva nomeada) ·
`src/infra/jobs/**` (B08) · `src/infra/events/**` (o publisher não muda: a medição sai do **consumidor** dele) ·
`src/modules/impound/**` · `src/modules/financial-*/**` · `src/modules/cloud-charges/**` · `src/modules/mobile/**`
(o sync não muda: a idempotência já está no repositório) · `src/modules/field-dispatch/**` · `src/modules/evidence/**`,
`attachments/**`, `damages/**`, `work-orders/**` (07b/07c) · `src/modules/auth/**`, `core-saas/**` · `frontend/**` ·
`mobile/**` · `infra/**` · `.env*` · `package.json`/`package-lock.json` · `pubspec.*` · `CLAUDE.md`/`AGENTS.md` ·
`.claude/agents/**` (salvo criação de jurado pelo protocolo §C7.4, com espelho) · `scripts/*` além do item 11 ·
`Kpis/app.js` fora da linha `FROZEN` · a **base viva** `erp-postgres:5432`/`erp-redis:6379` (nem leitura) · os worktrees
`gov-descuido`, `san2-r` e a árvore principal (`demo/investidor`).

---

## §7 · Critério de aceite FALSIFICÁVEL — por achado, com a MUTAÇÃO que deixa cada um vermelho

Regras: (i) todo aceite tem **N** (casos), **forma** (memória / Postgres descartável / HTTP) e **mutação nomeada**
(M-x) que o põe vermelho — o dev **executa** cada mutação e registra `ec` + trecho; (ii) "ec=0" sem N e forma não é
aceite; (iii) os `-db` pulam **declarando** sem `DATABASE_URL` e **rodam** com ela (orçamento de skip do runner = 2,
`run-backend-tests.mjs`); (iv) vermelho-controle na base `fe2748c` para A1, F1, S1, B1 (§8).

**Catálogo de mutações (cada uma é 1 hunk; aplicar → rodar o alvo → `git checkout -- <arquivo>`):**
M-1 remover a chamada `appendCloudUsageEventsTx` de `createRunWithClientKey` · M-2 idem de `completeRun` ·
M-3 chave = `${randomUUID()}:checklist_runs_count` (chave por emissão, o defeito original) · M-4 trocar `ON CONFLICT
DO NOTHING` por `create` (P2002 aborta a tx) · M-5 mover o append para **depois** do `withTenant` (fora da tx, com
`.catch(warn)`) · M-6 restaurar o ramo `checklist_run.created` em `cloud-usage.events.ts` · M-7 restaurar `limit:
10_000` em `normalizeSummaryFilters` · M-8 `summarizeLineItems` via `findMany({take: 10_000})`+reduce · M-9 rateio
volta a `listUsageDailyAggregates` de plataforma · M-10 remover o `count` e o `throw` do cap · M-11 `quantity = 1` na
conclusão reaberta · M-12 script de reconciliação dedupando pela chave nova em vez de `source_id` · M-13
`upsertDailyAggregate` com `increment` em vez de sobrescrever.

### 7.1 · DIN-005 — atomicidade (`tests/o6r06-usage-atomic-db.test.ts`, Postgres descartável, harness `pg-barrier.ts`)

| ID | Aceite | N | Mutação que o deixa VERMELHO |
|---|---|---|---|
| A1 | `createRun` (com e sem `client_run_key`) → na MESMA tx, `SELECT count(*) FROM cloud_usage_events WHERE source_id = run.id` = **2** (`checklist_run.created`, `checklist_runs_count`), chave `checklist_run:{id}:{metric}`, `quantity = 1`, `occurred_at = started_at` | 2 | M-1 |
| A2 | `completeRun` (`completed` e `pending_acknowledgement`) → 1 linha `checklist_run.completed`, `quantity 1` | 2 | M-2 |
| A3 | Conclusão da run **reaberta** → `checklist_run.completed` com `quantity 0` e chave `…:reopened` (regra PR-03 preservada) | 1 | M-11 |
| A4 | Chave estável: criar → apagar o evento por SQL cru (como superuser, só no teste) → **replay** da mesma `client_run_key` NÃO recria (created:false, 0 eventos) — e o `reconcile` (K1) recria. Prova que a chave é da run, não da emissão | 1 | M-3 (replay passa a criar 2ª linha) |
| A5 | Colisão de chave **dentro da tx** não aborta: inserir manualmente a linha com a chave antes do `createRun` → `createRun` termina `created:true`, run persistida, tx **não** entra em 25P02, 1 evento | 1 | M-4 |
| A6 | 8 `createRun` concorrentes com a MESMA `client_run_key`, barreira escopada (`buildApplicationName`, `countBlockedStatements`) → **1 run, 2 eventos**, 7 × `created:false`; nenhum 23505/25P02 | 1 | M-1, M-4 |
| A7 | Cross-tenant: evento de A invisível sob GUC de B (`withTenantRls(B)` → 0); `set_config` vazio → 0 (FORCE) | 2 | — (controle; documenta §2.4-b) |
| A8 | I1/I2 por SQL: após 20 runs (10 concluídas, 2 reabertas) `SELECT … FROM checklist_runs r WHERE NOT EXISTS (…)` devolve **0 linhas** para as três métricas | 1 | M-1, M-2 |

### 7.2 · DIN-005 — fault injection (`tests/o6r06-usage-fault-injection.test.ts`; forma: **Postgres descartável**
via `PrismaChecklistRepository(txProxy)` + **HTTP** com a app em memória)

| ID | Aceite | N | Mutação |
|---|---|---|---|
| F1 | **Falha NA medição, dentro da tx** (proxy da `tx` que lança em `cloudUsageEvent.createMany`/`$executeRaw` do outbox) → `createRun` **rejeita**; `checklist_runs` = **0**, `cloud_usage_events` = **0** (rollback real); repetir sem a falha → 1 run, 2 eventos. "O retry repara" | 2 | M-5 (run persiste sem evento → vermelho) |
| F2 | Mesmo para `completeRun`: falha injetada → `status` **não** muda, 0 eventos `completed`; retry → conclui e mede | 1 | M-5 |
| F3 | **Falha PÓS-commit** (lançar depois do `withTenant` resolver, antes do `publishDomainEvent`) → run **e** evento existem; o cliente recebe erro; replay → `created:false`, contagem **inalterada** (2). É o cenário literal do achado — e não há nada a reparar | 1 | M-1 |
| F4 | HTTP: `POST /checklists/:id/runs` com o repositório de memória forçado a falhar na medição → **5xx**, `listRuns` vazio, 0 eventos; 2º POST → 201, 1 run, 2 eventos. Idem `POST …/complete` | 2 | M-5 |
| F5 | Sync mobile: lote com `checklist.run_create` + falha injetada → resultado `rejected` (não `accepted`), nada persistido; reenvio do MESMO lote → `accepted`; 3º envio → `already_applied`; sempre 1 run/2 eventos | 1 | M-5, M-3 |

### 7.3 · DIN-005 — replay/idempotência e dublê (`tests/o6r06-usage-atomic.test.ts`, memória)

| ID | Aceite | N | Mutação |
|---|---|---|---|
| R1 | `createRun` → 2 eventos no repositório de memória; `createRun` replay (mesma chave) → **ainda 2** | 2 | M-1, M-3 |
| R2 | `completeRun` → 1; conclusão reaberta → `quantity 0`; adoção em voo → **0 eventos novos** | 3 | M-2, M-11 |
| R3 | `publishDomainEvent("checklist_run.created", …)` chamado **direto** (sem run) → **0** eventos de uso (o ramo saiu); `checklist_run.attachment_uploaded` → continua gravando (best-effort preservado onde deve) | 2 | M-6 |
| R4 | Os 4 casos de `cloud-usage-checklist-reopen.test.ts` **migrados**: mesma asserção de negócio (2 conclusões na trilha, original 1, reaberta 0, agregação não move), pelo caminho da tx | 4 | M-11 |
| R5 | Projeção diária idempotente sob reentrega: `aggregateDailyUsage(d)` 2× → mesmo `quantity` (sobrescreve) | 1 | M-13 |

### 7.4 · DIN-007 — `SUM`/`GROUP BY` sem teto (`tests/o6r06-cost-summary-sum-db.test.ts`, Postgres; `-sum.test.ts`, memória)

| ID | Aceite | N | Mutação |
|---|---|---|---|
| S1 | **10.001 linhas** num import (`createMany`, 1 statement; helper `o6r06-cost-fixtures.ts`), a 10.001ª com `unblended_cost = 999999.000001` e `billing_period_start` **mais recente** (é a que o `take` de hoje corta, `orderBy asc`): `getSummary(período)` → `totalUnblendedCost` = soma das 10.001 (inclui `999999.000001`), `lineItemCount = 10001`, `services[]` inclui o `serviceCode` exclusivo da última | 3 | M-7, M-8 |
| S2 | O mesmo por HTTP: `GET /platform/cloud-costs/summary?periodStart&periodEnd` → 200, `data.lineItemCount = 10001`, total idêntico ao S1; `GET /line-items?limit=500` → **500** itens (detalhe segue paginado); `limit=10001` → 500 (clamp intacto) | 3 | M-7; remover o clamp de `normalizeLimit` |
| S3 | `GROUP BY` bate com o detalhe: para cada `(serviceCode, currency)`, `services[].unblendedCost` = soma manual dos itens lidos em páginas de 500 até esgotar (11 páginas) — arredondamento **uma vez**, diferença ≤ 1e-6 | 1 | M-8 |
| S4 | Filtros do resumo = filtros do detalhe (`serviceCode`, `usageType`, `region`, `tenantTag`, `importId`): resumo filtrado por `tenantTag=X` soma só X, e `lineItemCount` = `count` do detalhe com o mesmo filtro | 5 | divergir `buildLineItemWhere` do `where` do detalhe |
| S5 | Memória: `InMemoryCloudCostRepository` com 10.001 itens → mesmo total; `getSummary` **não** passa `limit` ao repositório (spy) | 2 | M-7 |
| S6 | Exatidão: 3 itens `0.1 + 0.2 + 0.3` (numeric) → `0.6` exato após **uma** conversão; e o `Decimal` do `_sum` não é somado em float no serviço (assert por spy: o repositório devolve o total, o serviço não reduz) | 1 | somar em float no serviço |

### 7.5 · Rateio — base durável por tenant sob RLS, e o teto alto (`tests/o6r06-allocation-basis-rls-db.test.ts`)

| ID | Aceite | N | Mutação |
|---|---|---|---|
| B1 | 2 organizações, runs criadas/concluídas pelo repositório real, **sem** rodar `aggregateDailyUsage`: `allocateCostsForPeriod` aloca custo `checklist` na proporção **3:1** de `checklist_runs_count`; `unallocated` vazio para essa linha | 1 | M-9 (base vazia → `missing_usage_basis`) |
| B2 | **Papel sem BYPASSRLS**: o teste cria `ROLE o6r06_app LOGIN NOSUPERUSER NOBYPASSRLS` + `GRANT` no schema (só no cluster descartável), abre um `PrismaClient` com essa URL e repete B1 → **aloca igual**; a leitura de plataforma `listDailyAggregates({})`/`listEvents({})` com o mesmo papel devolve **0** (controle — documenta §2.4-b) | 2 | M-9 (com o papel: base vazia → vermelho) |
| B3 | 10.001 linhas de custo no período (fixture S1) → rateio `completed`, `totalImportedCost` inclui a 10.001ª | 1 | `take: 10_000` no `listCostLineItems` |
| B4 | Cap alto: repositório construído com `cap = 10`, 11 linhas → run `failed`, `errorMessage` começa por `period_exceeds_line_item_cap`, `{count: 11, cap: 10}`; **0** `tenant_cloud_cost_allocations` gravadas | 1 | M-10 |
| B5 | Constante: `CLOUD_COST_ALLOCATION_LINE_ITEM_CAP === 100_000` e é o default do construtor (assert por leitura do export, não do texto) | 1 | mudar o default |
| B6 | Isolamento: base de A não entra no rateio de B mesmo com `set_config` residual de A na conexão (o `withTenantRls` de B **substitui** o GUC) | 1 | ler a base fora de `withTenantRls` |

### 7.6 · Censo permanente (`tests/o6r06-billing-census.test.ts`, memória — idioma dos guards da casa, por EXECUÇÃO)

| ID | Aceite | N | Mutação |
|---|---|---|---|
| C1 | Para cada nome em `["checklist_run.created","checklist_run.completed"]`: `publishDomainEvent(nome, payload mínimo, {tenantId})` → o repositório de memória do cloud-usage **não ganha** evento. Para `checklist_run.attachment_uploaded` → ganha (o censo diz o que é best-effort e o que não é) | 3 | M-6 |
| C2 | `buildChecklistRunUsageEvents` é **total** sobre `CLOUD_USAGE_METRIC_KEYS` de vistoria: as chaves que ele produz ⊆ `basisMetricKeys` da regra `checklists` (`rules.ts:65`) ∪ `{checklist_run.created}` — e vice-versa para a base: toda chave da base `checklists` é produzida na tx | 1 | acrescentar chave à base sem produtor |
| C3 | `normalizeSummaryFilters(filters)` **não tem** propriedade `limit` (assert `!("limit" in result)`) | 1 | M-7 |

### 7.7 · Reparação (`scripts/reconcile-checklist-usage.ts`, provado em `o6r06-usage-atomic-db` — K-série)

| ID | Aceite | N | Mutação |
|---|---|---|---|
| K1 | Semear 5 runs **sem** eventos (SQL cru, simulando o legado) + 3 runs com eventos **legados** (chave `{uuid}:checklist_runs_count`, `source_id = run.id`) + 2 runs novas (chave estável): `reconcile --apply` insere **exatamente 5×2 + (concluídas)** e **0** para as 5 já medidas; 2ª execução → 0 inseridas | 2 | M-12 (as 3 legadas ganham 2ª linha → vermelho) |
| K2 | Dry-run (sem `--apply`) → mesmo relatório, **0** escritas (count antes = depois) | 1 | escrever no dry-run |
| K3 | Reabertas legadas sem evento → `completed` com `quantity 0`; concluídas comuns → 1; `pending_acknowledgement` → 1 (§3.1 semântica) | 1 | M-11 |

**Contagem do §7:** A 11 · F 7 · R 12 · S 15 · B 7 · C 5 · K 4 = **61 casos novos/migrados** (dos quais 4 são migrados
do `reopen`) → **≥ 57 novos**, acima do piso único de **47** (§2.3). O dev publica o N **por arquivo, por execução**.

---

## §8 · Bateria de validação exata (§9 do CLAUDE.md) + piso ÚNICO + armadilhas

**Base da branch:** `origin/main` = `fe2748c` (`git pull --rebase origin main` antes do PR; re-medir se outro bloco
mergear). **Worktree:** o dev usa **`.claude/worktrees/b06`** (já criado, branch `fix/billing-durability`) — `npm ci`
**próprio** + `npm run db:generate`; **junction/symlink de `node_modules` PROIBIDA**; remoção só por `git worktree
remove --force` (Windows: `[System.IO.Directory]::Delete("\?\<path>", $true)`). Não tocar `gov-descuido`, `san2-r`,
árvore principal.

**Cluster descartável próprio** (`erp-postgres:5432`/`erp-redis:6379` são **intocáveis, nem leitura**): portas
escolhidas DEPOIS de `netsh interface ipv4 show excludedportrange protocol=tcp` e `docker ps`; sugerido `o6r06-pg`
:56446 (`postgres:16-alpine`, `prisma migrate deploy` → 107 migrations) e `o6r06-redis` :56393; **nunca** 5432/55432;
`docker rm -f` ao final (§C5, 1 linha no fechamento).

**Na ABERTURA (antes de qualquer linha de `src/`) — publicado na ata:**
1. **Baseline por EXECUÇÃO**: `npm test` na forma canônica (`node scripts/run-backend-tests.mjs`, `DATABASE_URL`/`REDIS_URL`
   do cluster, `CORE_SAAS_PERSISTENCE` **não** exportada, `RBAC_DB_PARITY` ausente) → esperado **2936/2938, 2 skips**
   (= porteiro l.37). Focados dos 10 arquivos do §2.3 → **N real** (substitui 47 se divergir; o piso é recalculado
   como `≥ N` e publicado UMA vez).
2. **Drill de papel sem BYPASSRLS** (§2.4-b): `CREATE ROLE … NOSUPERUSER NOBYPASSRLS` no cluster → `SELECT count(*)
   FROM cloud_usage_daily_aggregates` sem GUC → **0** com dado presente. Se der ≠ 0, a hipótese do §2.4-b cai e o
   §3.2 fica (por correção, não por necessidade) — registrar.
3. **Confirmar o que este plano mediu por leitura:** (a) `rg "aggregate-daily|aggregateDailyUsage" src` → só os 5
   sítios do §2.4-a; (b) `createMany({skipDuplicates:true})` emite `ON CONFLICT DO NOTHING` (log `DEBUG="prisma:query"`)
   — senão, `$executeRaw` (§3.1); (c) `InMemoryCloudCostRepository.listLineItems` aplica `limit` (para o S5).
4. **PDs fechadas ANTES** de `cloud-usage.outbox.ts` (PD-1) e dos `groupBy`/`sumUsageBasis` (PD-2) — §11.
5. **Vermelho-controle na base** `fe2748c`: worktree descartável PRÓPRIO da base (`.claude/worktrees/o6r06-base`, `npm
   ci` próprio, mesmo cluster), copiar `o6r06-usage-atomic-db` (A1), `-fault-injection` (F1), `-cost-summary-sum-db`
   (S1), `-allocation-basis-rls-db` (B1) → **vermelhos com `ec` e trecho** (A1: 0 eventos na tx; F1: run persiste sem
   evento; S1: total sem a 10.001ª; B1: `missing_usage_basis`). Remover o worktree ao final.

**Por PR (ordem fixa; `ec` de cada passo registrado, nunca depois de `| tail`):**
1. `npm run check` · `npm run lint` · `npm run build`
2. **Mutações M-1…M-13** (§7): aplicar → rodar o alvo que TEM de ficar vermelho → registrar `ec`+trecho →
   `git checkout -- <arquivo>` → `git status` limpo. 13 mutações, 13 registros.
3. Focados, **N=3, denominador idêntico nas 3**: `node --test --import tsx tests/o6r06-*.test.ts` (7 arquivos, com
   `DATABASE_URL`) + regressão: `cloud-usage{,-routes,-checklist-reopen}`, `aws-cur-cost-{import,routes}`,
   `cloud-cost-allocation{,-routes}`, `cloud-charge-routes`, `domain-events`, `checklist-run-{create-concurrency,lifecycle,role}-db`,
   `checklist-routes-db`, `impound-outbox`, `rls-tenant-isolation`, `mobile-backend-contracts`, `job-worker-bootstrap`
4. `npm test` completo, **1×, ec=0**, denominador publicado = 2938 + Δ **nomeado por arquivo**; skips = 2 (declarados)
5. Frontend sem tocar frontend: `npm --prefix frontend run check` + `build` (regressão; o adapter lê `totalUnblendedCost`)
6. `node --check Kpis/app.js` · `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts`
   (aceitam `fechado` na autoria **com** `aguardando_merge` exato — §9) · `node scripts/kpi-freeze.mjs --check`
7. `python agent-orchestration/controle/gerar-indice-pendencias.py` → índice byte-idêntico ao rastreado
8. `git diff --check` · `node scripts/sync-agent-agents.mjs --check` **só se** um jurado for criado (§C7.4) ·
   **ordem contrato × drill** por `git log` (§5) · limpeza §C5 em 1 linha

**PISO ÚNICO (um número, sem frase-ponte):** **≥ 47 casos novos** em `tests/` (= N do §2.3; entregues ≥ 57 pelo §7).
Se o N real da abertura divergir de 47, o piso passa a ser esse N e é publicado **uma** vez na ata — nunca dois
pisos para o mesmo número (achado do crítico no 07b, E1·8).

**Armadilhas (medidas nesta rodada e nas anteriores):** `ec` depois de `| tail` é o do `tail` · ` M` FANTASMA sob
autocrlf (`planejador-mestre.md`, `porteiro-pos-merge.md`, `sync-agent-agents.mjs`, `critico-c5-adversarial.md`,
`jurado-c5-arnes-…`) — confirmar com `git diff`/`git hash-object` · absorção por `rev^{tree}` (`is-ancestor` mente sob
squash) · `git log -S` na main não data nada de dentro de branch squashada · `pendencias.md` EOL misto → **só APPEND**
· heredoc > ~7,5 KB estoura o arnês → pedaços ≤5,5 KB (este plano foi escrito assim) · `grep -c` não conta CR · nunca
`git archive`+`tar` · prova por **presença**, nunca por ausência de grep · remoção de worktree só pelo identificador
do bloco (`b06`, nunca "dev") · tx interativa do Prisma tem timeout default 5 s — o append é 1 INSERT, mas o teste A6
com barreira precisa de `timeout` explícito no `$transaction` (como `checklist-run-create-concurrency-db`) · 10.001
linhas por `createMany` em 1 statement (não 10.001 `create`).

---

## §9 · KPI (§C3) — 4 arquivos + `app.js` no MESMO PR, contagem de execução real, e o BACKFILL do #380 (ressalva 1)

**Deste bloco (autoria):** `Kpis/kpis-latest.json` — `version: "B-O6R-06"`, `release.block/title/summary` (o que
entrou e o mecanismo, no idioma das entradas anteriores), `pr/merge_commit/approved_head: null` (§C3.5),
`metrics.backend_tests` = **execução real** (N/forma: `npm test` canônico, cluster descartável, portas, skips=2,
baseline 2936/2938 **medido**, Δ **por arquivo**), `backend_contract_tests_focused` **CARREGADO** com marcador (o bloco
não toca a bateria do ARNES), `frontend_smoke_tests`/`flutter_tests` **CARREGADOS** com marcador (prova nas duas
pontas: `git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain -- frontend/ mobile/`
vazios), `mvp_demo`/`mvp_vendavel` **intocados** (o bloco não move escopo), **`blocks_completed` 161 → 162** (um
incremento por PR mergeado, precedente SAN2-4a/4b e nota da própria série; na autoria já 162 — se o PR não mergear, a
entrada sai com a branch). `production_readiness`: `aguardando_merge: [{id:"Ω6R-DIN-005"},{id:"Ω6R-DIN-007"}]`
(exigido pelo guard `kpi-achados-paridade.test.ts:158-195` — lista **exata** dos fechados sem hash); `p0_fechados`
**permanece 11** e `fechados` **não** ganha os dois até o backfill pós-merge; `roadmap.blocos[B-O6R-06].estado:
"concluido"` (permitido pelo guard `:148-154` porque os achados estão `fechado`). `kpis-history.json`: **append** de
1 entrada. `kpis-history.md`: **só** a própria entrada (backlog em `P-KPI-HISTORY-MD-BACKLOG`). `Kpis/app.js`: **só** a
linha `var FROZEN` (`:1623`) regenerada por `node scripts/kpi-freeze.mjs`.

**BACKFILL §C3.5 do #380 — nos 4 lugares, o MESMO par, neste PR:**

| Lugar | O que gravar |
|---|---|
| `Kpis/kpis-latest.json` — bloco `release` da versão anterior **não** é editado (a latest é substituída pela deste bloco); o backfill do #380 vai na **nota** de `blocks_completed` e no `summary` (como a série faz) | `pr 380 · merge_commit fe2748c · approved_head a2988b5` |
| `Kpis/kpis-history.json` — entrada `version: "B-O6R-07b"` (a 155ª) | `"pr": 380`, `"merge_commit": "fe2748c"`, `"approved_head": "a2988b5"`, e `backfill_note` dizendo quem pagou (este PR) |
| `docs/revisoes/O6R/achados.jsonl` — linha `Ω6R-SEC-004`, `supersedido.por` | de *"B-O6R-07b (PR na autoria; nº e hash no backfill pós-merge — §C3.5)"* para *"B-O6R-07b (PR #380, merge fe2748c, head julgado a2988b5)"* — **só** esse campo |
| `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` — seção `[Ω6R-SEC-004]` | mesma frase; append da linha de backfill, sem reescrever o resto |

**Por que `approved_head = a2988b5` e não `c5d63bf`:** o campo responde *"qual código a junta aprovou?"*, não *"qual
commit a plataforma mergeou?"* (esse é `merge_commit`). Precedente **fixado** no ciclo 5 do B-O6R-02:
`J-B-O6R-02-ciclo5.md:136` — *"`approved_head` = head julgado da ata, não o headRefOid"* — e `:2386-2389` do
`kpis-history.md`. A ata do 07b nomeia **`a2988b5`** como *"Head de CÓDIGO julgado — provado por diff vazio de
src/tests/prisma/… contra os commits de registro posteriores"* (`J-B-O6R-07b.md:7`); `c5d63bf` é o head do PR com os
commits de registro, e o porteiro provou `tree(c5d63bf) == tree(fe2748c)` (parecer l.17). **Pré-condição para
escrever o valor** (o dev executa, não copia): `git diff --stat a2988b5 c5d63bf -- src tests prisma frontend mobile
.github scripts` **vazio**; se não for vazio, o head julgado não é o código mergeado e o backfill vira **pendência**,
não escrita. `c5d63bf` fica citado na `backfill_note` como `pr_head`.

**Guard que valida os números:** `tests/kpi-achados-paridade.test.ts` (6 casos, `p0_fechados` só com hash;
`aguardando_merge` exato) e `tests/kpi-dashboard-charts.test.ts` (série × JSON). Ambos na bateria (§8.6).

---

## §10 · Riscos e rollback

| # | Risco | Mitigação / prova | Rollback |
|---|---|---|---|
| 1 | `createMany({skipDuplicates})` **não** emitir `ON CONFLICT` na versão do Prisma em uso → P2002 aborta a tx interativa | Abertura §8.3-b confirma no log de query; senão `$executeRaw` (espelho `createRunWithClientKey`). Aceite A5 falha alto | — |
| 2 | Dobra de contagem se o ramo do evento **e** a tx gravarem | C1/R3 por execução; M-6 vermelho | Reverter o PR: as linhas novas (chave estável) são eventos válidos; o ramo antigo volta a gravar só para runs **futuras** |
| 3 | Migração dos 4 casos do `reopen` mudar a semântica sem ninguém ver | R4 mantém as 4 asserções de negócio **verbatim**; M-11 vermelho | — |
| 4 | Rateio por tenant: N consultas (N organizações) | N é pequeno (plataforma); B1/B2 medem tempo; se N > 50 vira pendência de lote, não de correção | — |
| 5 | Papel de produção **com** BYPASSRLS torna o §3.2 "desnecessário" | §8.2 mede; o desenho por tenant é correto nos dois casos (nunca lê fora do contexto do tenant) | — |
| 6 | `Decimal` → `number` na borda perde precisão para totais > ~1e9 com 6 casas | Conversão **única** (S6); pendência para string-decimal no contrato | — |
| 7 | Frontend quebrar com campo novo | Adapter lê `totalUnblendedCost` (`cloud-billing.adapter.ts:127`) e ignora o resto; `npm --prefix frontend run check/build` na bateria | — |
| 8 | Interactive tx timeout (5 s) em A6 com barreira | `timeout` explícito no `$transaction` do teste, como o irmão `-concurrency-db` | — |
| 9 | `ci.yml` job `backend-postgres` não rodar os `-db` novos | §6: append à lista `SUITES`; o guard de zero pulos do job os pune se pularem | — |
| 10 | Script de reconciliação rodado na base **errada** | Dry-run por default; `--apply` exige `DATABASE_URL` explícita e imprime o host antes de escrever; agente **nunca** o roda fora do cluster descartável | Aditivo/idempotente — não há o que desfazer; linha errada é apagável por SQL do dono |
| 11 | Plano B escolhido pela junta tardiamente | Decisão **na revisão do plano** (§3.4); mudar depois = ciclo novo (teto 2, `D-TETO-DOIS-CICLOS`) | Migration aditiva com `down` |

**Rollback do PR inteiro:** `git revert` do squash — sem migration, sem dependência, sem contrato removido; os dados
gravados pela via nova continuam válidos para a via antiga (mesma tabela, mesmas colunas).

---

## §11 · Junta, quórum, papéis, PDs — e o que o crítico ataca PRIMEIRO

**Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b): o bloco toca **dinheiro** — faturamento e rateio). **Não é 5/5**: não há
produção, dependência nova nem serviço pago. **Se o dev precisar de dependência nova, o quórum muda para 5/5 + PD** e
o dev PARA (§5). Teto: **2 ciclos** (`D-TETO-DOIS-CICLOS`). **Todo voto declara `escopo`** (`dentro-do-bloco` |
`pre-existente`, com evidência de data/origem — os quatro do §2.4 já vêm datados) **e `gravidade`**.

**Papéis (§C7.4-bis — quatro papéis, quatro identidades; a ata registra os nomes):**
1. **Crítico** — `critico-adversarial` ataca **ESTE plano antes da primeira linha de código** (bloco de invariante
   financeiro: obrigatório). Reporta defeito + evidência + motivo; **não** propõe correção.
2. **Planejador** — este arquivo; emendas em **APPEND** (`EMENDA E1…`), nunca reescrita.
3. **Dev** — implementa; não julga o achado.
4. **Jurados** (3, identidades novas, inelegíveis por nome os que já votaram em 07b/02-c5):
   **C1 banco/atomicidade/RLS** (perfil `jurado-c5-banco-fk-triggers`: julga A/F/B por **execução** no seu próprio
   cluster descartável; é quem roda o drill sem BYPASSRLS) · **C2 invariante financeiro/rateio** (julga S/B/K, o
   mapa do §3.4 e a resposta do §4; ataca o "exactly-once efetivo") · **C3 contrato/regressão/KPI** (julga §5 ordem
   por `git log`, §9 números por reexecução, censo C, escopo §6 por hash de árvore das pastas PROIBIDAS).
   `inspetor-de-terreno-da-junta` (Fable) **antes** do voto: worktree por jurado que muta, cluster por jurado, fatia
   S0 (`sync-agent-agents.mjs --check`) se algum agente for criado, baseline honesto, plano de perda de jurado.

**O que o crítico deve atacar primeiro (na ordem em que este plano se acha mais fraco):**
1. **§3.4 — a ausência de dispatcher.** "O aceite diz outbox/inbox; você entregou uma linha na mesma tx e chamou de
   outbox." A resposta está no §3.4 e na PD-1; se a junta discordar, o Plano B está escrito com custo e escopo.
2. **§4 — o `.catch(warn)` sobrevive** para storage/jobs/api, que **também** são base de rateio (`rules.ts:36-58`).
   O bloco fecha as duas chaves do P0 e nomeia a classe; o crítico pode sustentar que o P0 "vistoria concluída" inclui
   os **bytes** dos anexos dessa vistoria. Resposta a ser julgada: o `local` do achado (`cloud-usage.events.ts:38-53`)
   e a base `checklists` (`:61-66`) não incluem storage; ampliar = outbox genérico não deliberado.
3. **§3.2 — N consultas por tenant** e a hipótese do §2.4-b (FORCE RLS): "e se o papel de produção bypassa?" —
   §8.2 mede; o desenho é correto nos dois casos.
4. **§3.1 — semântica preservada em `pending_acknowledgement`** (grava `completed` antes da ciência). É o
   comportamento de hoje; mudar é produto. O crítico pode achar que é defeito — vira pendência, não escopo.
5. **§7 — mutações que não matam nada**: pedir a execução das 13 e o `ec` de cada.
6. **§9 — `approved_head`**: a pré-condição `git diff --stat a2988b5 c5d63bf -- src …` vazia é executável; se não
   for, o plano manda virar pendência.
7. **§2.4-c — cap alto**: "recusar o rateio acima de 100k é pior que truncar?" — não: truncar é subestimar em
   silêncio (o P0); recusar é visível e reexecutável após o bloco de cursor.

**Regra da dúvida (§C7.3) — DUAS PDs, fechadas ANTES do código que delas depende** (registro em `docs/omega-pd.md`,
idioma `PD-O6R-B07B-*`, ≥3 fontes cada, `agente-pesquisador-web`):

- **PD-O6R-B06-OUTBOX-IN-DB** — *"Quando o consumidor do fato é o MESMO banco, a captura na mesma transação com
  chave idempotente estável é a forma recomendada do Transactional Outbox? O que 'exactly-once efetivo' significa
  (at-least-once + idempotência)? Quando um dispatcher é necessário (só para sistema EXTERNO)?"* Fontes esperadas:
  microservices.io (Transactional outbox / Idempotent consumer), Debezium Outbox Event Router docs, Kleppmann
  (DDIA, exactly-once/idempotence), PostgreSQL docs (transactions/atomicity). **Bloqueia:** `cloud-usage.outbox.ts`.
- **PD-O6R-B06-SUM-NUMERIC-RLS** — *"(a) `SUM(numeric)` é exato e devolve `numeric`; `GROUP BY` sob RLS aplica a
  policy ANTES de agregar; `FORCE ROW LEVEL SECURITY` aplica ao dono, só superuser/BYPASSRLS escapa; (b) como o
  Prisma `groupBy/aggregate` devolve `_sum` de `Decimal` e o custo da conversão única na borda."* Fontes: PostgreSQL
  docs (aggregate functions, `ddl-rowsecurity`, `CREATE POLICY`, `ALTER TABLE … FORCE`), Prisma docs (groupBy,
  aggregate, Decimal), node-postgres numeric parsing. **Bloqueia:** `summarizeLineItems`, `sumUsageBasis`.
  **Ordering** (o terceiro exemplo do briefing) **não é dúvida deste desenho**: não há consumidor ordenado — a soma é
  comutativa e a chave é por (run, métrica). Registrado para o crítico não procurar PD que não existe.

---

## §12 · Pendências — o que FECHA, o que EMENDA, o que NASCE; e o efeito no gate da CHECKLIST P1

### Fecha (no PR, na autoria; hash no backfill pós-merge — §C3.5)
- **`Ω6R-DIN-005`** → `status: "fechado"`, `fechado_por: "B-O6R-06 (PR na autoria; nº e hash no backfill)"`,
  `fechado_em`, `evidencia_fechamento` (A1–A8, F1–F5, R1–R5, C1–C3, K1–K3 com N/forma/vermelho-controle); seção do
  `REGISTRO_ACHADOS_O6R.md` com `- Status: **fechado**` (guard `:107`).
- **`Ω6R-DIN-007`** → idem (S1–S6, B3–B5). A divergência 3×2 da J-6R **permanece citada** na evidência de fechamento.
- **`P-O6R-B06`** (`pendencias.md:2874`) → APPEND *"FECHADA — 2 P0 fechados na autoria (PR #n; hash no backfill)"*;
  o **Bloqueia** *"feature em cloud billing / rateio"* **cai** com o merge.

### Emenda (APPEND, nunca reescrita)
- **`P-O6R-B08`** (`:3090`): append *"o B-O6R-06 NÃO apoia dinheiro em `infra/jobs` (§4 do plano); o que resta aqui é
  latência/visibilidade — run de rateio por job presa em `processing`, projeção diária sem agenda"*.
- **`P-O6R-SUBRECURSO-OBJECT-SCOPE`** (`:6501`): append de 1 linha: *"o gate da CHK P1 por BLOCO fica satisfeito com o
  merge do B-O6R-06; este residual P0 do SEC-002 NÃO está coberto por esse enunciado — ver abaixo"*.

### Nasce (todas `pre-existente` com origem datada; dono nomeado; N/forma/causa)
1. **`P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL`** — ALTA — as chaves de base de rateio de storage
   (`checklist_attachment.uploaded/downloaded.bytes`), jobs (`job.executed`, `job_executions_count`) e api
   (`api_request.count`) seguem em `recordCloudUsageBestEffort` (`.catch(warn)`), gravadas fora da tx do fato. Forma:
   leitura (`rules.ts:36-58`, `cloud-usage.events.ts:56-118`, `job.worker.ts:65-94`). Origem `0648a8e1` (2026-06-08).
   Remédio: mesma disciplina do §3.1 (append na tx do anexo/job). Dono: **bloco novo `B-O6R-06b`** ou o bloco de outbox
   genérico após a deliberação da `Ω6R D-002` (decisão do dono).
2. **`P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS`** — ALTA — `GET /platform/cloud-usage/summary` e `/tenants/:id/daily`
   sem tenant, `listEvents({})`/`listDailyAggregates({})`: sob papel sem BYPASSRLS devolvem **0** (medido em B2/§8.2,
   N a publicar). Origem: migração `20260611000000` (2026-06-08). Dono: bloco de plataforma (a decidir).
3. **`P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA`** — MÉDIA — ninguém enfileira `cloud-usage.aggregate-daily` (§2.4-a);
   a projeção que serve `/daily` está vazia em produção. Deixou de ser base de dinheiro. Dono: `B-O6R-08` (agenda
   singleton) ou produto.
4. **`P-O6R-B06-RATEIO-CURSOR-100K`** — MÉDIA — `listCostLineItems` com teto 100.000 (agora **alto**, não mudo);
   cura = paginação por cursor no engine. Origem `6f27faae` (2026-06-08). Dono: bloco de cloud-costs.
5. **`P-O6R-B06-RECONCILIACAO-NA-DEMO`** — decisão do dono — rodar `scripts/reconcile-checklist-usage.ts --apply` na
   base viva (demo) para as vistorias já criadas sem métrica. Agente **não** mede nem executa lá. Dono: **dono**.
6. **`P-O6R-B06-DECIMAL-NA-BORDA`** — BAIXA — `totalUnblendedCost: number` no contrato; exato no banco, convertido
   uma vez. Cura: string-decimal versionada (muda o painel). Dono: bloco de contrato do cloud billing.

### Efeito no gate da trilha CHECKLIST P1 (`J-CHK-04C-EMENDA-deliberacao-j6r.md:89-97`)
Por **bloco**, o gate (*"até o merge de B-O6R-07 e B-O6R-06"*) fica **satisfeito com o merge deste PR** — 07a (#369),
07b (#380) e 06. **Mas o enunciado fala de ACHADOS** (SEC-002/003/004 e DIN-005/007), e **um deles não está fechado**:
`Ω6R-SEC-002` (P0) é `parcialmente_superado`, com residual em `P-O6R-SUBRECURSO-OBJECT-SCOPE` (**ABERTA · ALTA**,
dono `B-O6R-07c`) — 10 vias mutantes sobre OS alheia, e a CHK P1 grava no caminho de criação de OS. **Este plano
registra e NÃO resolve:** quem abrir o gate da CHK P1 depois do B06 precisa tratar esse residual **explicitamente**
(deliberação por bloco × por achado é decisão de junta/dono), em vez de herdar "resta só o B06" como fato.
`status-geral.md` recebe essa frase junto com a linha do bloco.

---

*Fim do plano. Nada de `src/` foi tocado por este arquivo. Emendas pós-crítico entram como `EMENDA E1 (data)` em
APPEND, com precedência sobre o corpo onde divergirem.*
