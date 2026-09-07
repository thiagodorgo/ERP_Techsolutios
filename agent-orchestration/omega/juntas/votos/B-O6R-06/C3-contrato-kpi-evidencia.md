# C3 - contrato / regressao / KPI - evidencia executada (B-O6R-06)

> Identidade **nova**. Nao votei, nao planejei, nao desenvolvi. Nada de ata, plano, briefing ou parecer
> alheio entrou como fato. Cadeira **com veto**; quorum **unanimidade de 3** (nao 5/5). O veto **nao**
> alcanca `pre-existente`. O script de reconciliacao esta **BLOQUEADO** por decisao do critico (R2-A):
> a ausencia dele no diff e **conformidade**, a serie K **nao conta no piso**, e cobra-lo seria reprovar
> por construcao.

## 0 - Terreno (medido por mim)

| Item | Comando | Resultado |
|---|---|---|
| Head de registro | `git rev-parse HEAD` (b06) | `cae4305af3f9d723aef1a7bbba0172ebb1815a59` |
| Head **moveu** durante a medicao | `git worktree list` | b06 passou a `93619d8e` (voto da C2). Delta `cae4305a..93619d8e` = so `C2-*` em `votos/`; pathspec de codigo **VAZIO** |
| Base | `git rev-parse origin/main` | `fe2748c84cc187a54ebe3fa651fcdc347c5b3494` |
| merge-base | `git merge-base origin/main HEAD` | `fe2748c8...` (= base) |
| Head de **CODIGO** | `git diff --numstat 0f0a872a cae4305a -- . ':!agent-orchestration' ':!.claude' ':!.agents' ':!docs'` | **VAZIO**, ec=0 -> julgo o codigo em **`0f0a872a`** |
| Worktree proprio | `git worktree add --detach .claude/worktrees/o6r06-jur-c3 cae4305a` | ec=0 |
| Worktree da base | `git worktree add --detach .claude/worktrees/o6r06-jur-c3-base fe2748c` | ec=0 |
| `npm ci` proprio x2 | `npm ci --no-audit --no-fund` | ec=0 (326 pacotes) nos **dois** |
| Junction | `cmd /c dir /AL <worktree>` | "Arquivo nao encontrado" = **0 junctions** |
| Cluster proprio (head) | `docker run ... -p 56701:5432` / `-p 56702:6379` | `o6r06-jc3-pg` / `o6r06-jc3-redis` |
| Cluster proprio (base) | `docker run ... -p 56703:5432` / `-p 56704:6379` | `o6r06-jc3-pg-base` / `o6r06-jc3-redis-base` |
| Portas | `netsh ... excludedportrange` + `docker ps` **antes** | 56701-56704 fora de todo range excluido; != 5432/55432; != 56446/56393 (dev); != 56501 (inspetor) |
| Base viva | - | `erp-postgres`/`erp-redis` **nunca** alvo, nem de leitura |
| Node | `node --version` | v20.19.5 |
| Migrations | `npx prisma migrate deploy` | ec=0 - **107** nos **dois** clusters -> confirmacao independente de **zero migration nova** |

---

## ITEM 1 - Escopo 5/6 como emendado pela E1.7

### 1.0 - A REGUA QUE APLIQUEI (escrita antes do veredito, para ser contestavel)

**PERMITIDO - codigo** (itens 1-11 **com** os deltas da E1.7): (1) `cloud-usage/cloud-usage.capture.ts`
**NOVO** (`appendChecklistRunUsageInTx`; **nao** `...outbox.ts`) - (2) `cloud-usage.service.ts` - (3)
`cloud-usage.events.ts` (remover os 2 ramos) - (4) `cloud-usage.repository.ts` (**opcional**) - (5)
`cloud-usage/index.ts` - (6) `checklist-prisma.repository.ts` (`createRun`/`createRunWithClientKey`/
`completeRun` + 5o parametro `billing`; **`reopenRunWithinTransaction` INTOCADO**) - (7)
`checklist.repository.ts` (**interface** + duble) - (8) `checklist.service.ts` (**3 sitios** ganham
`billing` + comentarios; **nenhuma outra logica**) - (9) `aws-cur.{repository,prisma.repository,service,
types}.ts` (`importAwsCurCsv`/`listLineItems`/`normalizeLimit` **intocados**) - (10)
`cloud-cost-allocation.*` (+`replaceTenantAllocations`/`listTenantAllocations` por `forEachTenantInOneTx`;
**`rules.ts` intocado**) - (11) `scripts/reconcile-checklist-usage.ts` - **REVOGADO pelo veredito R2-A do
critico: NAO deve existir.**

**PERMITIDO - testes:** os **7** `o6r06-*` novos - `cloud-usage-checklist-reopen` (migrar 4) -
`cloud-cost-allocation{,-routes}` - `aws-cur-cost-import` - `tests/helpers/o6r06-cost-fixtures.ts` -
`.github/workflows/ci.yml` (**append** a lista `SUITES`, nada removido).

**PERMITIDO - registro:** `API_CONTRACTS.md` - `docs/omega-pd.md` - `achados.jsonl` -
`REGISTRO_ACHADOS_O6R.md` - `Kpis/kpis-{latest,history}.json` - `Kpis/kpis-history.md` - `Kpis/app.js`
**so** a linha `var FROZEN` - `pendencias.md` (**APPEND**) - `pendencias-indice.md` (gerado) -
`status-geral.md` - `codex/log-execucao.md` - `omega/juntas/{BRIEFING,J-,votos/B-O6R-06/*}` - o plano
(emendas em APPEND) - `.claude/agents/**` **com espelho** (criacao de jurado, C7.4).

**PROIBIDO:** `prisma/**` (**zero migration**) - `mobile/**` - `frontend/**` - `src/infra/**` -
`src/modules/{impound,owner-portal,auth,core-saas,mobile,cloud-charges,field-dispatch,evidence,
attachments,damages,work-orders,financial-*}/**` - **`src/database/rls.ts`** -
**`package.json`/`package-lock.json`** - `pubspec.*` - `infra/**` - `CLAUDE.md`/`AGENTS.md` -
`RBAC_MATRIX.md`/`APPROVAL_LIMITS.md` - `PLANO_O6R.md` - `scripts/*` - `Kpis/app.js` fora de `FROZEN`.

**Base de toda medicao de escopo: `origin/main` = `fe2748c8`, tres pontos (`origin/main...0f0a872a`).**

### 1.1 - `--numstat` inteiro: **46 arquivos** (base fe2748c, tres pontos)

```
8/0    .github/workflows/ci.yml            50/0   API_CONTRACTS.md
1/1    Kpis/app.js                         17/4   Kpis/kpis-history.json
68/0   Kpis/kpis-history.md                35/28  Kpis/kpis-latest.json
54/0   agent-orchestration/codex/log-execucao.md
18/7   agent-orchestration/controle/pendencias-indice.md
309/0  agent-orchestration/controle/pendencias.md
38/0   agent-orchestration/docs/status-geral.md
629/0  .../votos/B-O6R-06/01-critico-adversarial.md
140/0  .../votos/B-O6R-07b/05-porteiro-pos-merge-fe2748c.md
1153/0 .../omega/planos/B-O6R-06-plano.md   385/0  docs/omega-pd.md
53/1   docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md   3/3 docs/revisoes/O6R/achados.jsonl
49/5   checklist-prisma.repository.ts       54/2  checklist.repository.ts
34/6   checklist.service.ts                293/47 cloud-cost-allocation-prisma.repository.ts
5/3    cloud-cost-allocation.engine.ts      48/1  cloud-cost-allocation.repository.ts
11/4   cloud-cost-allocation.service.ts     21/2  cloud-cost-allocation.types.ts
74/15  aws-cur-prisma.repository.ts         69/3  aws-cur.repository.ts
81/26  aws-cur.service.ts                   35/0  aws-cur.types.ts
209/0  cloud-usage/cloud-usage.capture.ts   12/35 cloud-usage/cloud-usage.events.ts
19/5   cloud-usage/cloud-usage.service.ts    1/0  cloud-usage/index.ts
13/0   tests/aws-cur-cost-import.test.ts
12/11  tests/checklist-run-create-concurrency-db.test.ts   <-- divergencia declarada
13/8   tests/checklist-run-lifecycle-db.test.ts            <-- divergencia declarada
9/7    tests/cloud-cost-allocation-routes.test.ts  14/12 tests/cloud-cost-allocation.test.ts
125/88 tests/cloud-usage-checklist-reopen.test.ts  146/0 tests/helpers/o6r06-cost-fixtures.ts
692/0  o6r06-allocation-basis-rls-db  376/0 o6r06-billing-census  318/0 o6r06-cost-summary-sum-db
181/0  o6r06-cost-summary-sum         744/0 o6r06-usage-atomic-db  275/0 o6r06-usage-atomic
516/0  o6r06-usage-fault-injection
```

### 1.2 - O PROIBIDO: `--numstat` **E** hash de arvore, os dois

`git diff --numstat origin/main...0f0a872a -- <path>` -> **VAZIO em 100% dos caminhos**, ec=0:

```
prisma VAZIO(base=SIM head=SIM) - mobile VAZIO - frontend VAZIO - src/infra VAZIO
src/modules/impound VAZIO - owner-portal VAZIO - auth VAZIO - core-saas VAZIO - mobile VAZIO
cloud-charges VAZIO - field-dispatch VAZIO - evidence VAZIO - attachments VAZIO - damages VAZIO
work-orders VAZIO - src/database/rls.ts VAZIO - package.json VAZIO - package-lock.json VAZIO
pubspec.yaml VAZIO(base=NAO head=NAO) - pubspec.lock VAZIO(NAO/NAO) - infra VAZIO(NAO/NAO)
CLAUDE.md VAZIO - AGENTS.md VAZIO - RBAC_MATRIX.md VAZIO - APPROVAL_LIMITS.md VAZIO
docs/revisoes/O6R/PLANO_O6R.md VAZIO - scripts VAZIO - src/modules/financial-* VAZIO
```

**Armadilha 9.1 confirmada por mim:** `pubspec.*` e `infra` **nao existem no topo** (base=NAO head=NAO);
um `rev-parse <rev>:<path>` ali falha em silencio. Por isso o instrumento foi o `--numstat` e o hash de
arvore so **confirmacao**, nos caminhos que existem nos dois revs:

```
prisma           IGUAL be98074af9123b1548406d5127ae8f0c07ebf177
mobile           IGUAL 3a2ac02813c2c079296d7bac832cc57a2ff7d8a5
frontend         IGUAL 24be761ec4b5a46269d25b44a59e6cd4522c967a
src/infra        IGUAL f2ee31ef6b955d1397d1e6a3907d9e3fe52b1127
src/modules/impound      IGUAL 12ec97afe3ad79b4941175c4ab4325be46d8116b
src/modules/owner-portal IGUAL 69304ac3689ead9168e7045348d69483a1bb42bf
src/modules/auth         IGUAL 1c2619d72c87908b2169ea0a78c2e8ad56f35166
src/modules/core-saas    IGUAL 22c71cdf3a6245d48ac085e9c53e3cf5fad0f473
src/modules/mobile       IGUAL 5686540644eb6029ad9b72877979ee2c69c2a1eb
src/database/rls.ts      IGUAL f8bd0faeef70503f4fe29c7df806727c296776ed
package.json             IGUAL e572e072283b4cfb2b5df4aa0a0980010b4a4002
package-lock.json        IGUAL 9039d1e8fc85cf17b6123a28f643a8ff9d37f7cd
CLAUDE.md                IGUAL 2b9d650a8c69afc785067999e71abd5ff9710c96
AGENTS.md                IGUAL f6b86a771908d3d8353bf87288320ad4bc1f0d71
scripts                  IGUAL 08de36f3648fc80c3f85fc5450193dfffd58961d
```

**CATEGORIA DO BLOCO - medicao especificamente minha.**
`git diff --numstat origin/main...0f0a872a -- package.json package-lock.json` -> **VAZIO**; blobs
**identicos** por hash. Nenhuma dependencia nova, nenhum passo de deploy, `prisma/**` intocado - e
**107 = 107** migrations aplicadas nos dois clusters. **A categoria NAO muda: quorum permanece
unanimidade de 3, nao 5/5.**

**O script de reconciliacao.** `git ls-tree -r --name-only 0f0a872a -- scripts/ | grep -i reconcile` ->
**ec=1 (ausente)**; o `diff` da enumeracao de `scripts/` base x head saiu **IDENTICO em nomes** e o hash
da arvore `scripts/` e igual: **zero edicao e zero adicao**. Isso e **CONFORMIDADE** com o R2-A - nao
omissao. Aplico: a **serie K nao existe** e **nao conta no piso**; **M-12/M-15 nao se aplicam**;
`P-O6R-B06-RECONCILIACAO-NA-DEMO` fica suspensa. Nao cobro script, `I2'` reescrita nem predicado do dev.

### 1.3 - O PERMITIDO, hunk a hunk, ancorado por NOME DE FUNCAO

| Verificacao | Resultado |
|---|---|
| `reopenRunWithinTransaction` INTOCADO | **ec=1** - nenhuma linha `+`/`-` de `checklist-prisma.repository.ts` toca `reopen` |
| `checklist.service.ts` = 3 sitios + comentarios | **exatamente 3** `completeRun(...)` ganham `{ meterCompletion: ... }`: `:543` **true** (conclusao), `:700` **false** (`registerDivergence`), `:754` **false** (ciencia). **Zero outra logica.** A E1 citava `:538/:685/:733` - moveram; ancorei por funcao |
| `rules.ts` intocado | numstat 0 linhas |
| `importAwsCurCsv`/`listLineItems`/`normalizeLimit` | **ec=1** - nenhuma **declaracao** alterada. As ocorrencias no diff sao comentario, salvo a remocao da **chamada** dentro de `getSummary` - que e o "getSummary sem limit" autorizado pelo item 9 |
| `cloud-cost-allocation-prisma.repository.ts` | `sumUsageBasis`, `assertRowsBelongToTenant` (canario do R2-C), cap por `count`, e o helper de **uma** transacao (`async (tx, tenantId) =>`) atravessando `replaceTenantAllocations`/`listTenantAllocations` - **exatamente** a E1.7 item 10 |
| `.github/workflows/ci.yml` | **8 linhas +, 0 -.** APPEND puro |
| `Kpis/app.js` | **1/1** - so a linha `var FROZEN` (`B-O6R-07b`->`B-O6R-06`) |
| `pendencias.md` APPEND | **309 / 0** - zero linha antiga reescrita, sem renumeracao nem EOL em massa (A2 cumprido) |
| Espelho Codex | `node scripts/sync-agent-agents.mjs --check` -> **ec=0**, "OK - 44 agentes, espelho consistente" |
| Artefato de drill commitado | **ec=1** - nenhum `.log`/`tmp`/`fixture-dir`/`node_modules`/`storage/` |
| Guard-ratchet `db-catalog-write-guard.test.ts` | numstat **0** - allowlist congelada, **nenhuma entrada acrescentada** |

**Sobre o `ci.yml`:** o 6 pedia "os **3** `-db` novos"; entraram **4** (`usage-atomic-db`,
`usage-fault-injection`, `cost-summary-sum-db`, `allocation-basis-rls-db`). E **append puro, nada
removido** - cobertura de CI **mais forte** que a desenhada. `nota`.

**Um arquivo de registro fora da lista literal do 6:**
`.../votos/B-O6R-07b/05-porteiro-pos-merge-fe2748c.md` (140/0, **novo**). O 6 autoriza
`omega/juntas/{BRIEFING...,J-...,votos/B-O6R-06/*}`; `votos/B-O6R-07b/` nao esta na lista.
`git log --diff-filter=A` data-o em **`dd16beb1` (2026-09-06 22:27:01)**, o **primeiro** elo da cadeia: e o
parecer do porteiro **que autoriza o start** (C2.8). Arquivo novo, append puro, zero produto. **`nota`**.

### 1.4 - As DUAS divergencias declaradas: a declaracao e VERDADEIRA?

Presenca em `pendencias.md@0f0a872a`: `:7386 ## P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB ... MEDIA` e
`:7421 ## P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES ... BAIXA`. Em `tests/` sao **exatamente essas duas** - os
outros 12 arquivos de teste do diff estao todos nomeados no 6. **Confirmo o inspetor: sem terceira.**

**(a1) `tests/checklist-run-lifecycle-db.test.ts` (13/8).** O diff e **exatamente** o declarado: **8**
sitios `repo.completeRun(...)` ganham o 5o argumento `{ meterCompletion: true }` (linhas 36, 52, 126, 190,
210, 247, 347, 398) **+ 1** bloco no `teardown`
(`tx.cloudUsageEvent.deleteMany({ where: { tenant_id: tenantId } })`, escopado ao tenant, dentro do proprio
contexto RLS) - porque a unidade faturavel agora **sempre** existe e a FK e `ON DELETE RESTRICT`; a
alternativa `ON DELETE CASCADE` exigiria migration, **proibida pelo 5**. **Nenhuma asercao tocada:**
`assert.equal(completed?.run.status,"completed")`, `assert.rejects(... 409 ...)` e a mensagem
"concluir de novo e mutacao de prova assinada" seguem **verbatim**.

**(a2) `tests/checklist-run-create-concurrency-db.test.ts` (12/11).** A asercao `(a.3)` ficou **MAIS
FORTE**: era **condicional** (`if (env.CORE_SAAS_PERSISTENCE !== "prisma")`) e lia o repositorio **em
memoria** apos `setTimeout(150)`; passou a **ler a tabela** sob `withTenantRls`, **sem ramo e sem espera**,
mantendo **igualdade** (`assert.equal(billed, 1)`), nao `assert.ok`. Sob a forma canonica
(`CORE_SAAS_PERSISTENCE` nao exportada) o ramo antigo podia ser **vacuamente verde**; o novo **sempre**
executa. E o oposto de afrouxar.

**Caso sumido? (`comm -13` de nomes de teste, base x head, nos 6 arquivos editados):**
`checklist-run-lifecycle-db` 7->7 - `checklist-run-create-concurrency-db` 4->4 - `cloud-cost-allocation`
7->7 - `cloud-cost-allocation-routes` 2->2 - `aws-cur-cost-import` 7->7 -> **nenhum caso sumido**.
Em `cloud-usage-checklist-reopen` 4->4, **dois nomes mudaram**; conferi 1:1:
- `[payload sem o campo e com false] ... a correcao nao zera vistoria legitima` -> `[conclusao comum] duas
  vistorias distintas cobram 1 cada - **a correcao nao zera vistoria legitima**` (propriedade de negocio
  **identica, verbatim**; o rotulo do mecanismo caiu porque o booleano deixou de viajar no payload);
- `[reentrega da fila] ... continua valendo zero` -> `[reentrega] ... continua valendo zero **e uma linha
  so**` (propriedade preservada **e acrescida**).
Forma das asercoes no arquivo: `assert.*` **21 -> 23**, igualdade **17 -> 18**, `assert.ok` **2 -> 2**
(nenhuma igualdade rebaixada para `ok`), `.skip`/`todo` **0 -> 0**. Os **4 migrados nao movem o
denominador** e **nao viraram caso novo maquiado**.

**Nota de terreno do ratchet:** `tests/db-catalog-write-guard.test.ts` (detector **lexical**) **nao foi
tocado** e **nenhuma entrada** foi acrescentada a allowlist congelada (numstat 0). Contornar o guard seria
acrescentar entrada a allowlist; a allowlist esta **intacta**. Escrever a prosa sem os literais **mantem o
sinal do detector**. Julgo: **nao contorna**. Os dois lados ficam publicados.

**(b) `P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES` (BAIXA):** a **declaracao** existe e e anterior ao voto (A2 -
nada consolidado). A **propriedade** (`rolsuper=false`, `rolbypassrls=false`, falha de criacao = vermelho) e
da **C1**; **nao a re-meco**.

### 1.5 - Higiene do diff

- `git diff --check origin/main...0f0a872a` -> **ec=2**, **1** ocorrencia:
  `docs/omega-pd.md:1191: trailing whitespace`. No head de registro `cae4305a` soma-se
  `C1-banco-rls-evidencia.md:359: new blank line at EOF` (arquivo de **outra** cadeira). **`nota`**.
- **Pendencias do bloco, contadas por MIM, tres comandos concordando: 11.**
  `grep -c '^## P-O6R-B06-'` no head = **11** - `git diff ... | grep -c '^+## P-O6R-B06-'` = **11** - na
  base = **0**. O dev declarou **10**; inspetor e orquestrador mediram **11**; **eu meco 11**. Sao as 9
  nominais + as 2 divergencias - **nenhuma faltando**. Divergencia de **narrativa**, nao de registro.
- Gerador do indice **rodado por mim**: `python .../gerar-indice-pendencias.py` -> ec=0, "288 cabecalhos /
  277 IDs". O `--porcelain` acusou ` M` em `pendencias-indice.md`, mas `git diff` saiu **vazio (0 bytes)** e
  `git hash-object` == `git rev-parse HEAD:<path>` == **`0daf5bde4b68facdeac7ae435210126f1876125b`** ->
  **byte-identico**. O ` M` era o **fantasma** de autocrlf.

### VEREDITO PARCIAL - ITEM 1: **PASSA**

Todo o PROIBIDO **vazio** pelos dois instrumentos, com a saida colada; a **categoria do bloco nao muda**
(quorum segue 3); o script bloqueado **corretamente ausente** (conformidade, nao omissao); hunks **dentro**
dos trechos autorizados, ancorados por nome de funcao; as duas divergencias declaradas **conferem
exatamente** e **nada foi afrouxado** - uma asercao ficou **mais forte** e o CI ganhou **uma suite a mais**.
Achados: **3 `nota`**, **nenhum `bloqueia`**.

---

## ITEM 3 - Registro: ordem do contrato, guard executado, pendencias bem-formadas

### 3(a) - `API_CONTRACTS.md`: a ORDEM, provada por `git log`

Os **3** contratos versionados estao no delta (extraidos das linhas `+`):
`cloud_cost_summary@2026-09-06.b-o6r-06` - `cloud_cost_allocation_run@2026-09-06.b-o6r-06` -
`checklist_run_billing@2026-09-06.b-o6r-06`. `docs/api.md` **numstat 0** (nao muda de forma). OK.

**ORDEM (o veto do "contrato a frente do drill"):**

```
git log --format='%h %ad %s' --date=... --reverse origin/main..0f0a872a -- API_CONTRACTS.md
  c5535470  2026-09-07 00:58:24  docs(o6r,kpi): fecha DIN-005 e DIN-007, paga o backfill do #380 ...
                                  ^^^^^^^^ UNICO commit que toca o contrato

git log ... -- 'tests/o6r06-*.test.ts'
  b5f2f0e9  2026-09-07 00:14:00  test(cloud-usage): baterias A/R/F  -> usage-atomic-db, usage-atomic,
                                                                       usage-fault-injection
  706dbf77  2026-09-07 00:21:25  test(cloud-costs,...): baterias S e B -> cost-summary-sum-db,
                                          cost-summary-sum, allocation-basis-rls-db, o6r06-cost-fixtures
  a618bc83  2026-09-07 00:29:41  test(billing): censo C1-C7 -> billing-census (+ as 4 suites no CI)
```

**O contrato entrou 00:58:24, o ULTIMO drill 00:29:41 - 29 minutos DEPOIS de todo drill.** Os pares que a
E1.7 fixa, conferidos arquivo a arquivo:

| Contrato | Aceites | Arquivo | Commit do drill | Commit do contrato | Ordem |
|---|---|---|---|---|---|
| 1 `cloud_cost_summary` | S1/S7/S10 | `o6r06-cost-summary-sum{,-db}` | `706dbf77` 00:21:25 | `c5535470` 00:58:24 | **contrato DEPOIS** OK |
| 2 `cloud_cost_allocation_run` | B2'/B8 | `o6r06-allocation-basis-rls-db` | `706dbf77` 00:21:25 | `c5535470` 00:58:24 | **contrato DEPOIS** OK |
| 3 `checklist_run_billing` | A1/A10/F1/F7 | `o6r06-usage-atomic-db`, `-fault-injection` | `b5f2f0e9` 00:14:00 | `c5535470` 00:58:24 | **contrato DEPOIS** OK |

**O contrato diz mais do que o codigo sustenta?** Nao - e o caso mais forte que eu poderia pedir.
`E1.4(4)` mandava "exactly-once efetivo" **sair** do texto. O termo aparece **1x** no head, e a ocorrencia
e uma **nota de precisao que o NEGA** (`API_CONTRACTS.md:226-228`): *"a garantia acima e **atomicidade
transacional + unicidade por chave natural**. Nao e um Transactional Outbox (nao ha segundo sistema nem
relay), e a expressao 'exactly-once' **nao e usada de proposito** - `PD-O6R-B06-OUTBOX-IN-DB`."* O contrato
promete **menos** que a arquitetura, e explica por que. A invariante esta em **linguagem de banco**
(`mesma transacao`, `cloud_usage_events`, chave `checklist_run:{runId}:{metricKey}`, unicidade
`(tenant_id, idempotency_key)`), **sem campo novo no DTO**. Aditivos do contrato 1 presentes
(`lineItemCount`, `totalUnblendedCostExact`), `totalUnblendedCost: number` **fica** e esta documentado como
**lossy** (`:237` - *"permanecem e sao documentadamente lossy acima de ~1e10 com 6 casas"*).
`period_exceeds_line_item_cap` no contrato 2 (`:251`). A trilha C **0 -> 0** documentada.
(O **merito** da garantia e da **C2**; julguei a **letra**.)

### 3(b) - `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md` x o guard EXECUTADO POR MIM

**Guards rodados por mim, `ec` por variavel, no MEU worktree:**

| Guard | ec | Resultado |
|---|---|---|
| `node --test --import tsx tests/kpi-achados-paridade.test.ts` | **0** | tests 6 - pass 6 - fail 0 - skipped 0 |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **0** | tests 16 - pass 16 - fail 0 - skipped 0 |
| `node --check Kpis/app.js` | **0** | sem saida |
| `node scripts/kpi-freeze.mjs --check` | **0** | "kpi-freeze: em dia (snapshot 2026-09-07)" |

**Forma do registro (32 achados no `achados.jsonl`):**

- `Ω6R-DIN-005` -> `status: "fechado"`, `fechado_por: "B-O6R-06 (PR na autoria; no e hash no backfill
  pos-merge - C3.5)"`, `fechado_em: "2026-09-07"`, `evidencia_fechamento` **com N e forma** (1851 chars,
  cita cluster proprio e 107 migrations).
- `Ω6R-DIN-007` -> idem (1581 chars).
- Espelho no `REGISTRO_ACHADOS_O6R.md`: `:120` e `:530` trazem **`- Status: **fechado** em 2026-09-07 pelo
  `B-O6R-06``**. Espelham.

**A CONFERENCIA DO `K4` - a que eu tinha de fazer, com resultado esperado conhecido.** Fiz por regex sobre
a string **inteira**, nao por leitura:

```
DIN-005.evidencia_fechamento: cita K4?      NAO
DIN-005.evidencia_fechamento: cita K1/K2/K3? NAO
DIN-007.evidencia_fechamento: cita K4?      NAO
```

**Nenhum aceite inexistente e citado.** Mais: a evidencia do DIN-005 **declara a lacuna em primeira
pessoa** - *"NAO ENTREGUE: scripts/reconcile-checklist-usage.ts (ramo `completed`), BLOQUEADO pelo achado
R2-A do critico-adversarial ate a junta decidir o predicado observavel - ver
P-O6R-B06-RECONCILE-BLOQUEADO."* E a forma honesta: o P0 **nao** fecha no papel com prova que nao existe.
Esta e a **quarta** medicao independente do alarme (orquestrador, fabrica, inspetor, eu) e a quarta
negativa. **Alarme encerrado.**

Os aceites citados na evidencia do DIN-005 somam, por arquivo: `usage-atomic-db` 15 - `fault-injection` 6 -
`usage-atomic` 6 - `billing-census` 7 - `allocation-basis-rls-db` 10; e no DIN-007: `cost-summary-sum-db` 6 -
`cost-summary-sum` 4. **15+6+6+7+10+6+4 = 54** - fecha com o delta declarado.

**`B3` no DIN-007 - o unico ponto em que eu poderia ter reprovado por leitura literal, e nao reprovo.**
A regra que recebi diz "a evidencia cita S1/S2/S3'/S7-S10 e **nao** B3 - se citar B3, e achado". Um
`grep -E "\bB3\b"` devolve **SIM**. Lida a frase, porem, a citacao **exclui** B3 explicitamente:
*"B3 (10.001 linhas no rateio) fica como REGRESSAO e **NAO entra nesta evidencia**: ja era verde na base,
porque `listCostLineItems` sempre teve `take: 100_000`."* O defeito contra o qual a regra protege e **usar
B3 como prova**; o texto faz o **oposto** - nomeia B3 para recusa-lo, e diz por que. **Nao converto em
achado**; publico os dois lados para a junta contestar minha leitura, se quiser.

`Ω6R-SEC-002` segue `parcialmente_superado` (P0) e `Ω6R-SEC-004` `parcialmente_superado` (P1) - coerentes
com `p0_fechados: 11` e com o gate da 3(d).

**O guard ficou verde com alguma inconsistencia que EU veja?** Nao encontrei nenhuma. As tres clausulas
que ancorei **por conteudo** (nao por numero de linha) batem no head: (i) so `status === "fechado"`
classifica como fechado - DIN-005/007 tem exatamente essa string; (ii) `p0_fechados` conta so **com hash de
merge** - segue **11**, e os dois novos **nao** entraram em `fechados`; (iii) `aguardando_merge` e
**exatamente** os fechados-na-autoria - medi `[{"id":"Ω6R-DIN-005"},{"id":"Ω6R-DIN-007"}]`, **exatamente
os dois, sem hash**.

---

## ITEM 2 - KPI (C3) por REEXECUCAO

### 2.1 - Os 4 arquivos + `app.js`

`Kpis/kpis-latest.json` (35/28) - `Kpis/kpis-history.json` (17/4, **append**: 156 entradas, ultima
`B-O6R-06`) - `Kpis/kpis-history.md` (68/0) - **`Kpis/app.js` (1/1, so a linha `var FROZEN`)**.

**`Kpis/index.html` NAO esta no diff - e isso e CONFORMIDADE, nao ausencia.** Medi tres coisas antes de
concluir: (i) `git diff --numstat origin/main...0f0a872a -- Kpis/index.html` -> **0 linhas**; (ii) o
`index.html` do head e um **shell de 172 linhas** cujo unico script e `./app.js` (`:170`), com
`#charts-section` `hidden` por default - e um `grep -E "2990|2992|2936|2938|1126|864|blocks_completed|
backend_tests"` sobre ele devolve **ec=1 (por variavel, nao depois de pipe): ZERO numero cravado**, logo o
painel **hidrata dos JSON** como o `D-KPI-INDEX-PAINEL` exige; (iii) o `grep "index.html"` sobre as **1153
linhas do plano** devolve **ec=1** - o **6 nao autoriza** `Kpis/index.html`, e o PR anterior **ja mergeado**
(#380, `fe2748c`) tambem **nao o tocou** (`git diff --numstat fe2748c~1 fe2748c -- Kpis/` -> `app.js`,
`kpis-history.json`, `kpis-history.md`, `kpis-latest.json`, **sem `index.html`**). Cobra-lo aqui seria
cobrar fora da lista fechada. **Nao e achado.**

**Este PR nao inaugura dimensao nova** (nenhuma metrica nova no painel), logo **nao exige grafico novo** -
e nao cobro um. A `var FROZEN` e o **fallback honesto de `file://`**, rotulado no proprio comentario
acima dela, e foi **regenerada**: `node scripts/kpi-freeze.mjs --check` -> **ec=0**, *"em dia (snapshot
2026-09-07)"*. `node --check Kpis/app.js` -> **ec=0**.

### 2.2 - `aguardando_merge`, `p0_fechados`, `blocks_completed`, `mvp_*`

| Campo | Medido por mim | Esperado | OK |
|---|---|---|---|
| `production_readiness.aguardando_merge` | `[{"id":"Ω6R-DIN-005"},{"id":"Ω6R-DIN-007"}]` | **exatamente** os 2, sem hash | **sim** |
| `production_readiness.p0_fechados` | **11** | permanece 11 | **sim** |
| `production_readiness.fechados` | 13 entradas, **nenhuma** com DIN-005/007 | so ganham apos backfill pos-merge | **sim** |
| `blocks_completed` | **162** (nota: "161 -> 162, UM incremento ... O 161 e o do B-O6R-07b, mergeado no #380 (fe2748c) - conferido por mim nesta arvore") | 161 -> 162 | **sim** |
| `mvp_demo` | **99%**, nota `[B-O6R-06: INTOCADO - o bloco nao move escopo de produto (C3.4)]` | INTOCADO | **sim** |
| `mvp_vendavel` | **88%**, nota `[B-O6R-06: INTOCADO ...]` | INTOCADO | **sim** |
| `pr` / `merge_commit` / `approved_head` da entrada `B-O6R-06` | **`null` / `null` / `null`** | `null` na autoria (C3.5) - **nao bloqueia**, e cobrar seria erro meu | **sim** |

**Trilhas nao tocadas, CARREGADAS COM NOTA (C3.3 cumprido, e exigir reexecucao delas seria erro meu):**
`flutter_tests` **864/864**, `frontend_smoke_tests` **1126/1126**, `backend_contract_tests_focused`
**34/34** - as **tres** trazem nota explicita nomeando `[B-O6R-06: valor CARREGADO - o ultimo valor
oficial, NAO reexecutado por este PR (C3.3) ...]`. **Prova da nao-alteracao das trilhas, medida por mim
nas duas pontas:** `git diff --name-only origin/main...0f0a872a -- frontend/ mobile/` -> **0 linhas**; e
`git status --porcelain -- frontend/ mobile/` no MEU worktree -> **0 linhas**. Nenhum numero inventado.

### 2.3 - O BACKFILL do #380 nos QUATRO lugares (ressalva 1 do porteiro, vinculante)

| # | Lugar | Medido por mim | OK |
|---|---|---|---|
| 1 | `Kpis/kpis-latest.json` | a string `pr 380 - merge_commit fe2748c - approved_head a2988b5` aparece **2x** (nota de `blocks_completed` **e** `summary`/release); `a2988b5` ocorre 2x | **sim** |
| 2 | `Kpis/kpis-history.json`, entrada `version: "B-O6R-07b"` | `"pr": 380` - `"merge_commit": "fe2748c"` - `"approved_head": "a2988b5"` - `backfill_note` diz **quem pagou**: *"BACKFILL C3.5 **PAGO PELO B-O6R-06** em 2026-09-07, cobrado pelo porteiro pos-merge do #380"*, e cita **`c5d63bf` e o `pr_head`** | **sim** |
| 3 | `docs/revisoes/O6R/achados.jsonl`, `Ω6R-SEC-004`, `supersedido.por` | `"B-O6R-07b (PR #380, merge fe2748c, head julgado a2988b5)"` - **so** esse campo (o diff do arquivo e 3/3 = as 3 linhas dos 3 achados) | **sim** |
| 4 | `REGISTRO_ACHADOS_O6R.md`, secao `[Ω6R-SEC-004]` | `:750` - *"Status: **parcialmente_superado** em 2026-09-06 pelo `B-O6R-07b` (**PR #380, merge `fe2748c`, head julgado `a2988b5`**)"*, e `:752-753` trazem a pre-condicao e `tree(c5d63bf) == tree(fe2748c) == 1f957536` | **sim** |

**Sobre a unica linha REMOVIDA do `REGISTRO_ACHADOS_O6R.md` (53+/1-):** e exatamente a linha de status
**antiga do SEC-004** (`- Status: **parcialmente_superado** ... (PR na autoria; no e hash no backfill
pos-merge - C3.5)`), substituida pela nova com os hashes. E o campo que o backfill **existe para
atualizar**; nao ha como "apensar" a mudanca do proprio campo sem duplica-lo. O **resto** da secao e das
outras entradas nao foi reescrito. Cumpre a A2 no espirito e na letra util.

**A PRE-CONDICAO - reexecutada por mim, porque e COMANDO, nao afirmacao:**

```
$ git diff --stat a2988b5 c5d63bf -- src tests prisma frontend mobile .github scripts
  ec=0   linhas=0   -> VAZIO

$ git rev-parse 'c5d63bf^{tree}'  -> 1f957536a37373b93748897ca24a5ac74f17eaa7
$ git rev-parse 'fe2748c^{tree}'  -> 1f957536a37373b93748897ca24a5ac74f17eaa7   IGUAIS
$ git rev-parse 'a2988b5^{tree}'  -> 60dea962099b051a7d03e7364d36a57e5c840dcf   (difere so em registro)
```

**Fecha pelos dois lados.** O prefixo `1f957536` que o dev publicou **bate com o que eu medi**. Provei a
absorcao por **`rev^{tree}`**, nao por `is-ancestor` (que mente sob squash). Logo `approved_head =
a2988b5` esta **certo** pelo precedente de `J-B-O6R-02-ciclo5.md:136`: o campo responde *"qual codigo a
junta aprovou"*, e o codigo de `a2988b5` e **identico** ao de `c5d63bf`, cuja arvore e a de `fe2748c`.
O backfill e **escrita legitima**, nao pendencia.

### 2.4 - `backend_tests` por REEXECUCAO MINHA - N, forma e uma licao de metodo

**FORMA CANONICA que usei:** `npm test` (= `node scripts/run-backend-tests.mjs`), Node **v20.19.5**,
`DATABASE_URL`/`REDIS_URL` apontando para o **meu** cluster descartavel, **`CORE_SAAS_PERSISTENCE` NAO
exportada** e **`RBAC_DB_PARITY` ausente** (o runner declara `CORE_SAAS_PERSISTENCE=memory` como padrao
dele), banco com **107 migrations** por `prisma migrate deploy`. `ec` lido **por variavel**, contagens lidas
do **TAP no arquivo**.

**Erro de metodo MEU, declarado, porque muda a leitura das duas primeiras passadas:** rodei a suite do head
e a da base **ao mesmo tempo**, em clusters distintos mas **na mesma maquina**. As duas passadas vieram com
falhas de **timeout de transacao** (`"Unable to start a transaction in the given time"`, `"expired
transaction ... 5000 ms, however 9491 ms passed"`). Uma terceira passada, do head **sozinho**, ainda deu
4 falhas - e o diagnostico ficou **inequivoco** ao ler as asercoes: `S1` esperava `10001` e recebeu
**`10002`** (exatamente **uma** linha a mais) e `S10` diferia por **exatamente `40.000000`** - **residuo da
minha propria primeira passada** no mesmo banco. Refiz em **banco novo** (`CREATE DATABASE erp_fresh` +
107 migrations). **A contencao e o residuo eram meus, nao do bloco.** Publico as quatro passadas:

| Passada | Banco | Condicao | tests | pass | fail | skip | ec |
|---|---|---|--:|--:|--:|--:|--:|
| head #1 | `erp_test` | **concorrente** com a base | 2992 | 2981 | 9 | 2 | 1 |
| base #1 | `erp_test`(base) | **concorrente** com o head | 2938 | 2929 | 7 | 2 | 1 |
| head #2 | `erp_test` | sozinha, **banco ja usado** | 2992 | 2986 | 4 | 2 | 1 |
| **head #3** | **`erp_fresh`** | **sozinha, banco PRISTINO** | **2992** | **2990** | **0** | **2** | **0** |

**O numero que vale e o da passada #3: `2990/2992`, fail 0, skipped 2, ec=0, 282 arquivos.** E
**exatamente** o que o PR publica - **reproduzido por mim**, nao copiado. Os **2 skips sao os 2 do
orcamento** do runner (`permission-catalog-db-parity`, `# SKIP RBAC_DB_PARITY nao e "1"`), lidos do TAP:
**nenhum auto-pulo silencioso**.

### 2.5 - O DELTA +54, decomposto POR ARQUIVO, cada um pelo runner canonico

Banco novo (`erp_dec`, 107 migrations), um arquivo por vez:

| Arquivo | tests | pass | fail | skip | ec | declarado |
|---|--:|--:|--:|--:|--:|--:|
| `o6r06-usage-atomic-db` | **15** | 15 | 0 | 0 | 0 | 15 |
| `o6r06-usage-atomic` | **6** | 6 | 0 | 0 | 0 | 6 |
| `o6r06-usage-fault-injection` | **6** | 6 | 0 | 0 | 0 | 6 |
| `o6r06-cost-summary-sum-db` | **6** | 6 | 0 | 0 | 0 | 6 |
| `o6r06-cost-summary-sum` | **4** | 4 | 0 | 0 | 0 | 4 |
| `o6r06-allocation-basis-rls-db` | **10** | 10 | 0 | 0 | 0 | 10 |
| `o6r06-billing-census` | **7** | 7 | 0 | 0 | 0 | 7 |
| **SOMA** | **54** | 54 | 0 | 0 | - | **54** |

**Fecha pelos DOIS lados:** a soma por arquivo = **54**, e o delta do denominador = **2992 - 2938 = 54**.
Nenhum caso antigo morreu. Os **4 casos migrados** de `cloud-usage-checklist-reopen` seguem **4 antes,
4 depois** - nao movem o denominador (item 1.4 mostra que preservaram as asercoes de negocio).

### 2.6 - O PISO: **54 >= 47**, unico - e a diferenca grep x execucao explicada

| Arquivo | por **execucao** | por **`grep -c`** | dif |
|---|--:|--:|--:|
| `o6r06-usage-atomic-db` | 15 | 16 | +1 |
| `o6r06-usage-atomic` | 6 | 6 | 0 |
| `o6r06-usage-fault-injection` | 6 | 7 | +1 |
| `o6r06-cost-summary-sum-db` | 6 | 7 | +1 |
| `o6r06-cost-summary-sum` | 4 | 4 | 0 |
| `o6r06-allocation-basis-rls-db` | 10 | 11 | +1 |
| `o6r06-billing-census` | 7 | 7 | 0 |
| **TOTAL** | **54** | **58** | **+4** |

**A diferenca de 4 e ela propria um achado, e eu a explico:** os **4** arquivos com `+1` sao exatamente os
**4 `-db`**, e o caso extra e o **guard de auto-pulo DECLARADO** - `if (!connectionString) { test("B-O6R-06
... requires DATABASE_URL and a migrated database", ...) }` (linhas 35/28/35/33). Ele so executa **sem**
`DATABASE_URL`; com o banco de pe, executam os casos reais. **E o oposto de auto-pulo silencioso: o arquivo
DECLARA por que nao rodou.** Nao ha `.skip`/`.todo` em nenhum dos 7 (a unica ocorrencia lexical de "skip" e
a variavel `skipDisconnect`).

**O piso e 54, por execucao, e >= 47.** Publicado **uma vez**. Nao aplico `>=90` como piso - a recontagem
de **desenho** da E1.7 (94 casos, 90 novos) e o **minimo que o desenho exigia**, nao um segundo piso.

**A LACUNA desenho x entregue, publicada com N e forma (observacao, nao criterio):** desenho **90** novos,
menos os **6 da serie K** legitimamente fora (script bloqueado) = **84**; entregue por execucao **54**;
lacuna aritmetica **30**. **A lacuna NAO e cobertura ausente - e unidade de contagem.** A E1.7 conta
**sub-asercoes por aceite** (textualmente: *"A1 2 - A2 2 - A3 1 - A5' 1 ..."*), enquanto a execucao conta
blocos `test()`. Verifiquei **aceite por aceite, por PRESENCA** (nunca por ausencia de grep - e a armadilha
me mordeu duas vezes: meu primeiro laco acusou `B9 AUSENTE` e depois `B6′ AUSENTE`, e os **dois** eram
falsos, porque vivem num rotulo **combinado**, `test("B6′/B9 · o GUC e SUBSTITUIDO a cada volta (A->B->A) e
o canario pega base de outro tenant")`, linha 203 - exatamente como a propria E1.7 os pareia, *"vazamento
de GUC entre iteracoes (B6′/B9)"*). Resultado da conferencia por leitura dos nomes:

- **A**: A1 A2 A3 A5′ A6 A7 A8′ A9 A10 A11 A12′ A13 A14 A15 A16 A17 - **16/16 presentes**
- **F**: F1 F2 F3 F5 F6 F7 - **presentes** - **R**: R1 R2 R3 R5 R6 **+ R4** = os 4 migrados do `reopen`
- **S**: S1..S10 - **10/10** - **C**: C1..C7 - **7/7**
- **B**: B1 B2′ B3 B4 B5 **B6′/B9** B7 B8 B10 **B11** - **todos os nomeados, mais o B11**, que o desenho
  **nao** pedia e que nasceu do `R2-C` do critico (canario tambem em `listTenantAllocations`)

**Nenhum aceite prometido pelo desenho esta ausente da suite** (a serie K nao conta: o script foi
bloqueado). Nao ha achado de cobertura.

### 3(c) - Pendencias: APPEND, com N/forma/causa/dono

**Contagem: o dev declarou 10; eu meco 11**, por tres comandos que concordam (item 1.5). As **11**, com
gravidade, todas em **APPEND** (`pendencias.md` 309/0):

| # | ID | Grav. | Presente |
|--:|---|---|---|
| 1 | `P-O6R-B06-RECONCILE-BLOQUEADO` - o script NAO foi entregue; **a junta decide o predicado** | ALTA | sim |
| 2 | `P-O6R-B06-DIVERGENCIA-MOBILE-NAO-FATURADA` - trilha do app vale 0, decisao de **produto** | MEDIA | sim |
| 3 | `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` - anexo/job seguem best-effort | ALTA | sim |
| 4 | `P-O6R-B06-BASE-SEM-PRODUTOR` - 3 categorias caem em `unallocated` em silencio | ALTA | sim |
| 5 | `P-O6R-B06-LEITURA-PLATAFORMA-SOB-FORCE-RLS` | ALTA | sim |
| 6 | `P-O6R-B06-AGGREGATE-DAILY-SEM-AGENDA` | MEDIA | sim |
| 7 | `P-O6R-B06-RATEIO-CURSOR-100K` | MEDIA | sim |
| 8 | `P-O6R-B06-SEM-PODA-POR-IDADE` | BAIXA | sim |
| 9 | `P-O6R-B06-DECIMAL-NA-BORDA` | BAIXA | sim |
| 10 | `P-O6R-B06-DIVERGENCIA-ESCOPO-TESTES-DB` | MEDIA | sim |
| 11 | `P-O6R-B06-PAPEL-DO-DRILL-VEM-DO-ARNES` | BAIXA | sim |

**Todas as 9 nominais + as 2 divergencias estao la; nenhuma faltando.** A divergencia 10 x 11 e de
**narrativa do dev**, nao de registro - e o registro e o que vale. `nota`.

**Emendas em APPEND, conferidas nas linhas `+` do diff:** `P-O6R-B08` - *"append de uma linha. O
`B-O6R-06` **NAO apoia dinheiro em `src/infra/jobs/**`**, e nao..."*; `P-O6R-SUBRECURSO-OBJECT-SCOPE` -
*"append de uma linha. O gate da trilha CHECKLIST P1 enunciado em..."*. As duas presentes, **em append**.

**A mae `P-O6R-B06` (`:2874`) segue `- status: ABERTA - 2 P0`, com `**Bloqueia:** feature em cloud
billing`.** Julgo que **nao e achado bloqueante**, e digo por que, publicando os dois lados: (i) o arquivo e
**APPEND-only** e o diff tem **0 remocoes** - fechar a mae exigiria **reescrever** a linha de status, que e
como o repo marca fechamento; (ii) o estado "aberta" e **coerente com todo o resto do registro na autoria**:
os dois P0 estao em `aguardando_merge`, **nao** em `fechados`, `p0_fechados` segue **11**, e
`merge_commit`/`approved_head` sao `null`. Os quatro lugares dizem a **mesma** coisa - *nada mergeou
ainda*. O `Bloqueia` cai **no merge**, que e o que o proprio plano preve. Registro como **`nota`**.

**Gerador rodado por mim** (para saber o que um gerador conta, roda-se o gerador):
`python agent-orchestration/controle/gerar-indice-pendencias.py` -> ec=0, *"288 cabecalhos / 277 IDs |
{'FECHADA': 69, 'ABERTA': 219}"*, e o `pendencias-indice.md` resultante e **byte-identico** ao rastreado
(`hash-object` == `rev-parse HEAD:<path>` == `0daf5bde...`).

### 3(d) - O que o bloco prometeu INFORMAR - e informou

O 12 manda que a ressalva do gate entre em `agent-orchestration/docs/status-geral.md`, para ninguem herdar
*"resta so o B06"* como fato. **Esta la**, `status-geral.md:4240-4242`, no append deste PR (38/0):

> **Gate da CHECKLIST P1:** por BLOCO, fica satisfeito com este merge. Por ACHADO, **nao**: `Ω6R-SEC-002`
> (P0) segue `parcialmente_superado`, com residual ABERTO em `P-O6R-SUBRECURSO-OBJECT-SCOPE` (dono
> `B-O6R-07c`), e a CHK P1 grava no caminho de criacao de OS. Quem abrir o gate precisa tratar esse
> residual explicitamente.

**O bloco prometeu informar e informou** (C7.2 - o humano e **informado**, nao consultado).
`agent-orchestration/codex/log-execucao.md` (54/0) esta reconciliado e traz o **vermelho-controle na base
`fe2748c`**, com os quatro aceites-cabeceira e o que a base devolveu (`A1` 0 unidades - `F1` runs=1
unidades=0 - `S1` `lineItemCount = undefined` e total `9900000000.01083` - `B1` 0 alocacoes,
`missing_usage_basis`), **4 de 4 vermelhos**, e declara que o worktree da base foi removido no fechamento.
Declara tambem, em primeira pessoa, o **nao entregue**: *"o script de reconciliacao -
`P-O6R-B06-RECONCILE-BLOQUEADO`"*.

### 2.7 - A BASELINE que o inspetor NAO reproduziu (R4) - eu reproduzi

Worktree **separado** da base `fe2748c` (`.claude/worktrees/o6r06-jur-c3-base`), **`npm ci` proprio**,
**cluster proprio** (`o6r06-jc3-pg-base` :56703 / `o6r06-jc3-redis-base` :56704), **banco PRISTINO**
(`erp_bfresh`, 107 migrations), mesma forma canonica:

```
[run-backend-tests] 275 arquivo(s) - 2938 teste(s) - pass 2936 - fail 0 - skipped 2      ec=0
```

**`2936/2938` - identico ao declarado pelo dev e ao publicado pelo #380.** A ressalva **R4 do inspetor
fecha**: a baseline agora tem **tres** medicoes independentes concordantes (dev, porteiro do #380, e eu).

**O DELTA fecha pelos dois lados, com numeros que eu mesma produzi:**
- denominador: **2992 - 2938 = 54**
- aprovados: **2990 - 2936 = 54**
- soma por arquivo: **15+6+6+6+4+10+7 = 54**
- arquivos: **282 - 275 = 7** = os 7 arquivos NOVOS

### VEREDITO PARCIAL - ITEM 2: **PASSA**

`backend_tests` **2990/2992** reproduzido por mim em banco pristino, com **N e forma** publicados; baseline
**2936/2938** reproduzida (fecha a R4); **Δ +54 decompoe por arquivo** e fecha pelos dois lados; **piso 54
>= 47**, unico, com a diferenca grep(58) x execucao(54) explicada pelos 4 guards **declarados**; skips = **2**
(orcamento), sem auto-pulo silencioso; `FROZEN` regenerada e `kpi-freeze --check` verde; `aguardando_merge`
**exatamente** os dois; `p0_fechados` **11**; `blocks_completed` **162**; `mvp_*` **intocados** com nota;
trilhas nao tocadas **carregadas COM nota** e nao-alteracao provada nas duas pontas; **backfill do #380 nos
4 lugares** com a **pre-condicao reexecutada por mim** e fechando. **Nenhum `bloqueia`.**

---

## 3(e) - Ata, insumos e bateria

**Insumos do briefing, conferidos por presenca:** parecer do `critico-adversarial` **629 linhas, 2
rodadas** (r1 "PLANO FRAGIL" com E1/E2/E3 bloqueando; r2 "ROBUSTO COM RESSALVA") - as **2 PDs** em
`docs/omega-pd.md` (`PD-O6R-B06-OUTBOX-IN-DB` `:930`, `PD-O6R-B06-SUM-NUMERIC-RLS` `:1141`) - o
**`LIBERADO` do `inspetor-de-terreno-da-junta`** existe: *"VEREDITO DA PASSADA 2: **LIBERADO COM RESSALVA**
- a junta PODE comecar."* (C7.1-bis satisfeito; sem ele a junta nao comecava).

**Papeis (C7.4-bis), para a ata:** **achador** = auditoria O6R + `critico-adversarial` (2 rodadas);
**planejador** = `planejador-mestre` (plano + `EMENDA E1`); **dev** = `general-purpose`, identidade
distinta; **jurados** = C1 `jurado-06-banco-atomicidade-rls`, C2 `jurado-06-invariante-financeiro-rateio`,
C3 (eu). **Quem achou NAO consertou**: o critico atacou o plano e nao implementou; o dev implementou e nao
julgou o achado; eu nao planejei nem desenvolvi. **O planejador usou dado podre?** Nao que eu tenha medido:
a `E1` nasceu **do** parecer do critico e as duas PDs **mudaram o desenho** (`createMany` retirado, tipos
nulaveis) **antes** da implementacao - e o dev, ao achar defeito no proprio codigo pelo canario, corrigiu e
**registrou**.

**Bateria rodada por mim, uma vez cada, `ec` por variavel, no MEU worktree:**

| Comando | ec |
|---|--:|
| `npm run check` | **0** |
| `npm run lint` | **0** |
| `npm run build` | **0** |
| `npm --prefix frontend ci` | **0** |
| `npm --prefix frontend run check` | **0** |
| `npm --prefix frontend run build` (regressao: o adapter le `totalUnblendedCost` e ignora campos novos) | **0** |
| `node --check Kpis/app.js` | **0** |
| `node scripts/kpi-freeze.mjs --check` | **0** |
| `node --test ... tests/kpi-achados-paridade.test.ts` | **0** (6/6) |
| `node --test ... tests/kpi-dashboard-charts.test.ts` | **0** (16/16) |
| `node scripts/sync-agent-agents.mjs --check` | **0** (44 agentes) |
| `git diff --check` | **2** - 1 trailing whitespace em `docs/omega-pd.md:1191` (`nota`) |

### VEREDITO PARCIAL - ITEM 3: **PASSA**

Contrato **29 min DEPOIS** do ultimo drill por `git log`, com os 3 pares da E1.7 conferidos; o contrato
promete **menos** que a arquitetura e diz por que ("exactly-once" negado de proposito, citando a PD);
guard de paridade **verde rodado por mim**, e a `evidencia_fechamento` do DIN-005 **nao cita K4** (4a
medicao independente, 4a negativa) e **declara o nao-entregue**; **11** pendencias bem-formadas em APPEND,
indice byte-identico ao do gerador; a frase do gate da CHK P1 **esta** no `status-geral.md`. Achados:
**2 `nota`** (10 x 11 na narrativa; a mae ABERTA na autoria). **Nenhum `bloqueia`.**
