# B-SAN3-05 — CRÍTICA ADVERSARIAL — rodada r1

> **Identidade:** `critico-b-san3-05` (nova; não planejou nem desenvolveu este bloco) · **papel:** `critico-adversarial`
> (§C7.4-bis: **quem acha** — defeito + evidência executada + motivo; sem correção, sem plano, sem código).
> **Corpo:** `.claude/agents/critico-adversarial.md` @ `origin/main` = `3b1fe0f91d5304a721aa47d6661c4eb7cba39b1c`;
> `git show origin/main:.claude/agents/critico-adversarial.md | tr -d '\r' | md5sum` → `ae0a04610a6be1c1490c0c51e0489d91` (= o declarado pelo orquestrador).
> **Modelo em que roda:** Opus 5.5 (`claude-opus-5-5`) — o modelo da sessão; o `critico-adversarial` não tem `model:` fixado no frontmatter (não é gate Fable do §C7.6/6-bis).
> **Máquina:** `Linux vm 6.18.44-fc-v50 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux` · `PATH=/opt/node20/bin:$PATH node -v` → `v20.20.2`.
> **Alvo:** `docs/revisoes/SAN3/B-SAN3-05-plano.md` no ramo `docs/plano-b-san3-05`, head `c3f57e9be6352b96a12ef1c6a292e49c1db64ad3`
> (1 commit sobre `origin/main@3b1fe0f9`). Lido inteiro (1292 linhas, com Apêndices A e B).
> **Cluster:** Postgres 16.13 descartável `127.0.0.1:54351`, banco `erp_critico` (115 tabelas, 106 FORCE — medido ao abrir). Redis `63851` (PONG; não usado).
> **Regra de leitura:** cada item = comando → saída resumida → veredito parcial. Logs longos ficam aqui, não na mensagem final.

---

## Item 1 — Lista fechada: gerador do Apêndice A, os 7 sítios do §0.4, e sítios crus que ele não vê

Scratch: `/tmp/claude-0/-home-user-ERP-Techsolutios/2284c1af-ebcb-5671-92c9-9a61ff81a2fa/scratchpad/critico-r1/` (abaixo `$S`).

**1.1 — o gerador é o declarado e reproduz a saída do plano.**
```
$ awk '/^```js$/{f=1;next} f&&/^```$/{exit} f' docs/revisoes/SAN3/B-SAN3-05-plano.md > $S/gerador.mjs ; md5sum $S/gerador.mjs
e8861755e1c960bbf41a48ce270ac445                       (= o declarado na l.733)
$ PATH=/opt/node20/bin:$PATH node $S/gerador.mjs . > $S/gerador-out.txt ; echo ec=$?        # cwd = /home/user/wt-critico (head c3f57e9)
ec=0
$ diff <(saída colada no plano, l.1020-1056) $S/gerador-out.txt && echo IDENTICA
IDENTICA        (L0 106/106/106/777 · L1 642 · L2 70/451 · L2b = 7 linhas)
```
Veredito parcial: **reproduz**.

**1.2 — os 7 sítios da tabela do §0.4, um a um (`sed -n` no head).** `cloud-usage-prisma.repository.ts:61` (`listEvents`, `this.client.cloudUsageEvent.findMany`), `:120` (`listDailyAggregates`), `:173`/`:197` (`new PrismaCloudUsageRepository(this.prismaClient)` nos ramos sem `tenantId`); `cloud-charge-prisma.repository.ts:167` (`deleteMany`), `:171` (`create`), `:202` (`listTenantCharges`), `:220` (`listAllocationTenantAllocations`, com `take: 100_000`), `:240` (fábrica crua); `cloud-cost-allocation-prisma.repository.ts:238` + `:413` (fábrica crua). Chamadores: `cloud-charge.service.ts:256-257` (`new CloudChargeService(await createPrismaCloudChargeRepository())`), `cloud-charge.routes.ts:27…118` e `cloud-charge.jobs.ts:18`. Veredito parcial: **linha, método, tabela e fronteira conferem** nos 7.

**1.3 — A12/T13/C3(1) exigem "L2b = ∅" no head da entrega; isso é IMPOSSÍVEL com o próprio escopo do plano.**
Simulei o remédio prescrito no §2.2(b) numa cópia (`$S/fixed`: `forEachTenantRls` em `rls.ts`, ramos sem tenant do uso reescritos, `RlsPrismaCloudChargeRepository` + fábrica devolvendo o envoltório) **sem tocar** `src/modules/cloud-cost-allocation/**` (PROIBIDO, §6):
```
$ PATH=/opt/node20/bin:$PATH node $S/gerador.mjs $S/fixed | awk '/^## L2b/{f=1;next} f'
src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts:238  PrismaCloudCostAllocationRepository.listUsageDailyAggregates  this.client  cloudUsageDailyAggregate.findMany  cloud_usage_daily_aggregates  via fábrica
```
O sítio 7 continua em L2b porque a fábrica `:413` continua crua — e o plano manda o sítio 7 para pendência (§13) e proíbe o arquivo (§6). O gerador verbatim não tem lista de exceção; A12 diz "falha se qualquer linha aparecer". Veredito parcial: **critério impossível de passar** → achado **F1**.

**1.4 — o critério do guard (L2b sem o sítio 7 = ∅ ∧ L1 `CRU` = 0) é cego a 16 de 17 sítios crus.**
Harness: para cada mutação, `cp -r $S/fixed mutdir`, um arquivo novo `src/modules/zz-mut/mut.ts`, e o gerador verbatim. Resultado (`$S/mut-fixed-results.txt`):

| mutação (sítio cru de verdade — lê/grava tabela FORCE sem GUC) | L1 `CRU` | L2b extra | guard A12 | aparece em alguma seção? |
|---|--:|--:|---|---|
| Ma alias `const db2 = prisma; db2.cloudUsageEvent.findMany()` | 0 | 0 | **VERDE** | L1 `OUTRO(db2)` |
| Mb desestruturação `const { cloudUsageEvent } = prisma` | 0 | 0 | **VERDE** | não |
| Mc acesso por índice `prisma["cloudUsageEvent"].findMany()` | 0 | 0 | **VERDE** | não |
| Md `prisma.$transaction(async (tx) => tx.cloudUsageEvent.findMany())` (sem setter) | 0 | 0 | **VERDE** | classificado **`SOB-CONTEXTO`** (`--all`) |
| Me client raiz dentro do callback: `withTenantRls(prisma, id, async (_tx) => prisma.cloudUsageEvent.findMany())` | 0 | 0 | **VERDE** | classificado **`SOB-CONTEXTO`** (`--all`) |
| Mf `new Svc(new PrismaCloudUsageRepository(prisma))` (injeção por construtor — a forma de `cloud-charge.service.ts:257`) | 0 | 0 | **VERDE** | L2 `CRU ?` (uso `?` ⇒ alcance vazio) |
| Mg `class Sub extends PrismaCloudChargeRepository {}` + `return new Sub(prisma)` | 0 | 0 | **VERDE** | não |
| Mh função livre `listAll(client) { client.cloudUsageEvent.findMany() }` + `listAll(prisma)` | 0 | 0 | **VERDE** | não (INJETADO sem classe ⇒ nunca entra em L2) |
| Mi `prisma.$queryRawUnsafe(SQL_TODOS)` com a tabela numa constante | 0 | 0 | **VERDE** | não |
| Mj método como campo arrow `listAll = async () => this.client…` + `new K(prisma).listAll()` | 0 | 0 | **VERDE** | L2 `CRU .listAll()` (método `null` ⇒ não casa em L2b) |
| Mk fábrica com parâmetro chamado `tx`: `const make = (tx) => new PrismaCloudUsageRepository(tx); make(prisma).listEvents()` | 0 | 0 | **VERDE** | não |
| **Ml a mutação do próprio plano** `new PrismaCloudUsageRepository(prisma).listEvents()` | 0 | **1** | **VERMELHO** | L2b `:61` |
| Mm `getPrisma().cloudUsageEvent.findMany()` | 0 | 0 | **VERDE** | L1 `OUTRO(getPrisma())` |
| Mn membro não previsto `this.conn.cloudUsageEvent.findMany()` + `new K(prisma)` | 0 | 0 | **VERDE** | L1 `OUTRO(this.conn)` |
| Mo helper com parâmetro `tx` chamado com `prisma` | 0 | 0 | **VERDE** | L1 `TX-SEM-ENVOLTORIO?` |
| Mp `{ charges: new PrismaCloudChargeRepository(prisma) }` em objeto literal | 0 | 0 | **VERDE** | L2 `CRU ?` |
| Mq classe cujo acesso FORCE é `this.client.tenantCloudCharge.updateManyAndReturn(...)` + `new Rep(prisma)` | 0 | 0 | **VERDE** | **não, nem com `--all`** |

A mutação que o plano cita em A12 é **a única** que o guard pega. "Default do membro não previsto = negar (linha nova = vermelho)" (A12) é **falso** para o gerador verbatim: Mn (membro `this.conn`) vira `OUTRO`, e nada em A12 torna `OUTRO` vermelho. Se, ao contrário, o teste ficar vermelho por **qualquer** linha das seções L1/L2, ele é vermelho **no head da entrega** (6 `TX-SEM-ENVOLTORIO?` + 4 `OUTRO()` + 5 `INJETADO` + as instanciações cruas de delegação e a fábrica `:413`). Não há leitura de A12 que seja ao mesmo tempo satisfazível e discriminante. Veredito parcial: **guard gerado não enuncia a propriedade** → achado **F2**.

**1.5 — dois defeitos do próprio gerador, medidos.**
- (a) **`classify` engole `$transaction-SEM-setter`.** L.858: `if (/^(tx|trx|transaction)$/.test(recv)) return ctx ? "SOB-CONTEXTO" : …` — `ctx = "$transaction-SEM-setter"` é *truthy* ⇒ `SOB-CONTEXTO`. Medido (Md acima). E o residual (i) do §0.4 ("hoje **zero** casos") é falso: `node $S/gerador.mjs . --all` → `src/modules/work-orders/work-order-prisma.repository.ts:541  tx  workOrderAssignment.create  $transaction-SEM-setter  SOB-CONTEXTO` (há 1 hoje; por leitura, `assign` é chamado dentro de `withTenantRls` em `:669`, então **não** é vazamento — mas o gerador o rotulou pelo motivo errado, e a categoria é invisível por construção). Também 1 instanciação `$transaction+setter-depois? → SOB-CONTEXTO` (`prisma-core-saas.store.ts:47`).
- (b) **`OPS` não tem `updateManyAndReturn`.** `git grep … | uniq -c` dos ops Prisma em `src`: `updateManyAndReturn` = **68** (5º mais usado); contador próprio (`$S/count-umr.mjs`, mesma L0) → **68 sobre tabela FORCE** (`this.client` 67, `tx` 1). Nenhum é visto: o `# L1: call-sites sobre tabelas FORCE = 642` do §0.4 é **subcontagem** de ao menos 68; Mq prova que um sítio cru por essa via some até do `--all`.
Veredito parcial: achados **F3** (a) e **F4** (b).

## Item 2 — `RUNTIME_ROLE_GUARD_SQL` sob papel real (super, super renomeado, limpo, membro de BYPASSRLS c/ NOINHERIT e 2 níveis) e a consulta ingênua

EM APURAÇÃO

## Item 3 — `scripts/db-runtime-role.sh` (SQL do §4.1) executado de verdade; `ALTER DEFAULT PRIVILEGES`; `docker-entrypoint` do `postgres:16`

EM APURAÇÃO

## Item 4 — Trava de boot × `env.ts`, pontos de entrada, H6/paridade

EM APURAÇÃO

## Item 5 — A1–A16 × T1–T14: a mutação que derruba cada critério existe?

EM APURAÇÃO

## Item 6 — Outras premissas (contagens, linhas, P-a…P-p, §6×§5, §9)

EM APURAÇÃO

---

## Tabela de achados

EM APURAÇÃO

## Veredito

EM APURAÇÃO
