# PARECER — `critico-adversarial` · ataque ao PLANO do B-O6R-06 (antes da primeira linha de código)

**Papel:** `critico-adversarial` (§C7.4-bis — quem acha NÃO conserta: abaixo há defeito + evidência
executada + motivo; **nenhuma correção proposta**). **Data:** 2026-09-06. **Rodada:** 1 de 2 (teto do
briefing). **Alvo:** `agent-orchestration/omega/planos/B-O6R-06-plano.md`, 773 linhas, commit `9f582a34`,
branch `fix/billing-durability`. **Base:** `origin/main` = `fe2748c8`.
**Bloco de invariante financeiro — tolerância zero** (`checklist_run.completed` e `checklist_runs_count` são
`basisMetricKeys` do rateio: `cloud-cost-allocation.rules.ts:64`, lido hoje).

## VEREDITO: **PLANO FRÁGIL**

Três achados **bloqueiam**, todos **`dentro-do-bloco`**: dois **mudam o número cobrado** por caminhos que o
plano declara preservar, e o terceiro torna um aceite **insatisfazível pelo desenho proposto**. Sete
ressalvas adicionais. Do outro lado: os **três achados de planejamento do §2.4** que mudaram o desenho
**sobreviveram ao ataque** — dois deles agora com prova por execução que o plano não tinha.

## Terreno e forma de medição

- Worktree próprio `.claude/worktrees/b06` (só LEITURA de `src/`; não escrevi uma linha de código).
  **Não toquei** a árvore principal (`demo/investidor`), `gov-descuido` nem `san2-r`.
- **Cluster descartável próprio**: `docker run --name b06-critico-pg -p 56606:5432 postgres:16-alpine`
  (PostgreSQL 16.15). A base viva `erp-postgres:5432`/`erp-redis:6379` **não foi alvo, nem para leitura**
  (usei `docker ps --format` só para escolher porta livre). Container **removido no fechamento**.
- `ec` sempre capturado **antes** de qualquer pipe (armadilha do `tail`, §8 do próprio plano).
- Onde a conclusão é "não existe X", a prova é **enumeração exaustiva do caminho**, nunca ausência de grep.

---

# ACHADOS QUE BLOQUEIAM

## E1 · A invariante I1 é FALSA por construção — a reabertura cria run SEM métrica, e o script de reparação REFATURA a vistoria reaberta

**`gravidade: bloqueia` · `escopo: dentro-do-bloco`** (a invariante, o aceite A8 e o script são deste plano;
o comportamento de reabertura que os torna falsos é `pre-existente` — PR-03 / `D-CHK-P1-RUN-LIFECYCLE`,
comentário datado em `checklist-prisma.repository.ts:696-707`).

**O que o plano afirma.** §3.1: *"não existe estado em que a run exista e a métrica não"*, formalizado em
**I1**: `∀ r ∈ checklist_runs ∃ e ∈ cloud_usage_events : … e.metric_key='checklist_runs_count'`. O aceite
**A8** (§7.1) manda semear *"20 runs (10 concluídas, **2 reabertas**)"* e exigir **0 linhas** no `NOT EXISTS`
*"para as três métricas"*.

**Evidência executada** — enumeração **exaustiva** dos sítios que inserem em `checklist_runs`:

```
$ rg -n 'checklistRun\.create|INSERT INTO "?checklist_runs|checklistRun\.createMany' src
checklist-prisma.repository.ts:410   createRun               (escopo §6 item 6)
checklist-prisma.repository.ts:456   createRunWithClientKey  (escopo §6 item 6)
checklist-prisma.repository.ts:763   reopenRunWithinTransaction   <-- FORA do escopo
```

O terceiro sítio cria uma **nova linha** de `checklist_runs` (`reopened_from_run_id: previous.run.id`,
`status: "in_progress"`) e **não gera métrica nenhuma** — de propósito: `checklist.service.ts:586-588` diz
*"FATURAMENTO: publica `checklist_run.reopened`, **NUNCA** `checklist_run.created` — este último alimenta a
métrica FATURADA `checklist_runs_count` … cobrar de novo pela correção … seria cobrar duas vezes"*. E o §6
item 6 do plano **proíbe tocar em reopen** (*"**Nada** em templates/answers/markers/attachments/reopen"*).

**Motivo — por que derruba o plano, não só o aceite:**

1. **A8 fica VERMELHO em código correto.** Com 2 reaberturas semeadas, o `NOT EXISTS` de
   `checklist_runs_count` devolve **2 linhas**, não 0. O dev acha o vermelho no meio do bloco e decide
   sozinho: gravar métrica na reabertura (**dobra a base**, revoga a Junta PR-03) ou estreitar a invariante
   (decisão de escopo não planejada). É a classe que a `D-JUNTA-SEPARACAO-DE-PAPEIS` manda não empurrar para
   quem executa.
2. **O argumento central do DIN-005 se apoia nela.** *"Republicar deixa de ser necessário"* é derivado de
   I1/I2 *"verificáveis por SQL"*. Invariante falsa como escrita não sustenta a conclusão.
3. **O script de reparação vira refaturador.** §3.1 especifica `INSERT … SELECT … WHERE NOT EXISTS (…
   source_type='checklist_run' AND source_id = r.id AND metric_key = …)`. **Toda run reaberta satisfaz esse
   `NOT EXISTS`** para `checklist_runs_count` e `checklist_run.created` → `--apply` insere **1 unidade
   faturável por reabertura**, exatamente o que a PR-03 fechou. **Nenhum aceite pega**: K3 só cobre a métrica
   `completed` da reaberta (`quantity 0`); K1 semeia *"5 runs sem eventos"* sem excluir reabertas. E a
   pendência 5 do §12 propõe rodar esse script **na base viva (demo)** por decisão do dono.

---

## E2 · O mecanismo do §3.1 MUDA o valor cobrado do caminho de divergência (mobile) — de 0 para 1 unidade — e o plano declara "semântica de cobrança PRESERVADA"

**`gravidade: bloqueia` · `escopo: dentro-do-bloco`** (é o mecanismo escolhido por este plano: gravar a
métrica **dentro do `completeRun` do repositório**).

**O que o plano afirma.** §3.1: *"`completeRun` (`:667-693`) após o `update`"* grava a métrica; e
*"**Semântica de cobrança PRESERVADA** … (i) `checklist_run.completed` é gravada no `completeRun` **mesmo
com `status = pending_acknowledgement`**, como hoje (`checklist.service.ts:557` publica sem olhar o status)"*.

**Evidência executada** — o `repository.completeRun` tem **três** chamadores no serviço, não um:

```
$ rg -n "completeRun\(" src | rg "service.ts"
checklist.service.ts:538   completeRun()        -> publica "checklist_run.completed"        (FATURA hoje)
checklist.service.ts:685   registerDivergence() -> publica "checklist_run.divergence_reported"  (NÃO fatura)
checklist.service.ts:733   acknowledgeRun()     -> publica "checklist_run.acknowledgement_created" (NÃO fatura)
```

Lido em `checklist.service.ts:656-711` e `:713-755`. E `registerDivergence` é o caminho do **sync do
mobile**: `src/modules/mobile/mobile-checklist-sync.ts:515` (`await service.registerDivergence(...)`), além
do REST (`checklist.controller.ts:307`).

Cruzando com a base de rateio — `cloud-cost-allocation.rules.ts:60-65`, medido:
`basisMetricKeys: ["checklist_run.completed", "checklist_runs_count"]`. E `checklist_run.divergence_reported`
**não está em nenhuma** lista de base (verificado contra a extração de todas as `basisMetricKeys` do arquivo).

**Motivo.** Trilha por trilha, unidades de `checklist_run.completed` por vistoria:

| Trilha | Hoje (`fe2748c`) | Depois do §3.1 |
|---|---|---|
| A · `completeRun(hasDivergence=false)` | 1 | 1 |
| B · `completeRun(hasDivergence=true)` → `acknowledgeRun` | 1 (o 2º chamador não publica `completed`) | 1 (`ON CONFLICT` deduplica) |
| **C · `registerDivergence` (sync mobile) → `acknowledgeRun`** | **0** | **1** |

A trilha C é a vistoria de campo que **registra divergência sem passar pelo `completeRun` do serviço** — o
caminho normal do app offline. O bloco **aumenta a base de rateio** dessa trilha em 1 unidade por vistoria.
Pode até ser o comportamento desejável (uma vistoria concluída com divergência é trabalho feito) — **mas é
decisão de produto, é dinheiro, e o plano afirma o contrário**. Nenhum aceite do §7 mede a trilha C (A2 cobre
só `completeRun` do serviço); **nenhuma das 13 mutações** M-1…M-13 fica vermelha se a trilha C mudar.

Consequência de método: o §3.1 escolhe o **repositório** como ponto de captura *porque é quem detém a `tx`* —
e com isso captura chamadores que o §2.1 (que mapeou a cadeia só pelo `publishDomainEvent`) nunca enxergou.
O diagnóstico do plano é do **publisher**; o conserto é do **repositório**. Os dois conjuntos não coincidem,
e o plano não mediu a diferença.

---

## E3 · O aceite B2 é insatisfazível com o desenho do §3.2 — sob papel sem BYPASSRLS a ESCRITA do rateio falha, não só a leitura

**`gravidade: bloqueia` · `escopo: dentro-do-bloco`** (o aceite B2 e a afirmação *"correta em qualquer papel
de banco"* são deste plano). O defeito de código subjacente é `pre-existente`: migração
`20260613000000_add_cloud_cost_allocation` (2026-06-13).

**O que o plano afirma.** §2.4-b, consequência para o desenho: *"a base do rateio é lida **por tenant, sob
`withTenantRls(tenant.id)`** — **correta em qualquer papel** (§3.2)"*. Aceite **B2**: *"**Papel sem
BYPASSRLS** … abre um `PrismaClient` com essa URL e **repete B1 → aloca igual**"*.

**Evidência executada** (cluster descartável `b06-critico-pg`, espelho fiel das duas migrações medidas;
papel `o6r06_app LOGIN NOSUPERUSER NOBYPASSRLS` com `GRANT ALL`):

```
D1 SELECT cue  (espelho cloud_usage_events, policy NULLIF) sem GUC  -> ec=0  count = 0   (com 1 linha semeada)
D2 SELECT tca  (espelho tenant_cloud_cost_allocations)     sem GUC  -> ec=0  count = 0
D3 INSERT tca                                              sem GUC  -> ec=1
     ERROR: new row violates row-level security policy for table "tca"
D4 DELETE tca                                              sem GUC  -> ec=0  DELETE 0   (silencioso)
D5 SELECT cue  COM set_config('app.current_tenant_id',…,true)       -> ec=0  count = 1
D6 INSERT tca  COM set_config(…)                                    -> ec=0  INSERT 0 1
```

O espelho é fiel ao medido no repo:
`prisma/migrations/20260613000000_add_cloud_cost_allocation/migration.sql:88-93` —
`ALTER TABLE "tenant_cloud_cost_allocations" ENABLE/FORCE ROW LEVEL SECURITY` + policy
`USING/WITH CHECK ("tenant_id"::text = current_setting('app.current_tenant_id', true))`.
E quem escreve nessa tabela é `cloud-cost-allocation-prisma.repository.ts:84-108`
(`replaceTenantAllocations`: `deleteMany` + `create` em laço) usando **`this.client` cru** — construído em
`:165-168` com o `prisma` global, **sem GUC nenhum**; o serviço a chama em
`cloud-cost-allocation.service.ts:64`, e a rota executa **inline** no request.

**Motivo.** O §3.2 conserta a **leitura** da base (`sumUsageBasis` sob `withTenantRls`) e não toca a
**escrita** do resultado. Sob o papel que o próprio plano quer provar (§8.2, B2), a run de rateio **morre no
`INSERT`** (`status: failed` pelo `catch` do `:80-87`) — ou, se a ordem for outra, apaga nada (`DELETE 0`) e
grava nada, **em silêncio**. Logo:

- **B2 não pode ficar verde** como escrito. O dev vai bater nisso depois de já ter mudado `sumUsageBasis`, e
  as saídas disponíveis são todas ruins: dar `BYPASSRLS` ao papel do teste (**esvazia o drill inteiro**),
  ampliar escopo para o caminho de escrita (não planejado, mexe em dinheiro) ou reescrever o aceite.
- A afirmação *"correta em qualquer papel de banco"* é **overclaim**: o **rateio** não é; só a **leitura da
  base** passa a ser.
- Continua **invisível na CI**: `.github/workflows/ci.yml` conecta como `postgres`
  (`DATABASE_URL: postgresql://postgres:postgres@…` nos jobs `backend` e `backend-postgres`) — superusuário,
  que ignora RLS. Confirmado por leitura; é o mesmo mecanismo do §2.4-b.

---

# RESSALVAS (não bloqueiam sozinhas; entram como emenda ou pendência nomeada)

## E4 · O aceite A5 não é construtível no caminho que ele nomeia — e é o único que sustenta a escolha do `ON CONFLICT DO NOTHING`

**`gravidade: alta` · `escopo: dentro-do-bloco`.** A5 (§7.1): *"inserir manualmente a linha com a chave
**antes** do `createRun`"*. Mas a chave é `checklist_run:{run.id}:{metricKey}` e o `run.id` **não existe
antes do INSERT**: `prisma/schema.prisma:874` — `id String @id @default(dbgenerated("gen_random_uuid()"))`,
e `createRunWithClientKey` **omite `id` de propósito** (comentário `:450-451`: *"Colunas com default no banco
(id, status, started_at…) são omitidas — o Postgres preenche"*). Não há como semear o conflito.
**Motivo:** A5 é o aceite que prova *"colisão de chave dentro da tx não aborta"* — a justificativa do plano
para proibir `create` (P2002 → 25P02). Sem ele, a decisão de desenho do §3.1 fica sem falsificador.

## E5 · A mutação M-3 — o defeito ORIGINAL do DIN-005 — não deixa vermelhos os três aceites que o plano lhe atribui

**`gravidade: alta` · `escopo: dentro-do-bloco`.** M-3 é *"chave = `${randomUUID()}:checklist_runs_count`
(chave por emissão, o defeito original)"*, nomeada como falsificadora de **A4**, **R1** e **F5**.
**Evidência (leitura exaustiva do caminho):** `checklist-prisma.repository.ts:400-408` — com
`client_run_key`, `createRun` faz `getRunByClientKey` e, achando a run, **retorna `{created:false}` na linha
404, antes de qualquer INSERT**. O append do §3.1 só roda no ramo *"quando inseriu"*. Portanto, **sob M-3 o
replay continua não criando linha nenhuma**: A4 (*"0 eventos"*) segue verde, R1 (*"ainda 2"*) segue verde,
F5 (*"sempre 1 run/2 eventos"*) segue verde. M-3 só é pega por **A1** (que asserta a **forma** da chave) e
por **A5** — que, por E4, não é construtível. **Motivo:** o §8.2 manda *"aplicar → rodar **o alvo** que TEM
de ficar vermelho"*; nos três alvos nomeados o dev vai encontrar verde e não saberá se o registro é
"mutação sobreviveu" (defeito de cobertura) ou "matriz errada". É a mesma classe de pareamento aceite×mutação
que derrubou dois aceites no 07b.

## E6 · §2.4-d e a pendência 1 do §12 descrevem errado as chaves de api/storage: elas não são "best-effort", elas **não têm produtor**

**`gravidade: média` · `escopo: dentro-do-bloco`** (a afirmação e a pendência são deste plano; o buraco de
código é `pre-existente`, origem `0648a8e1`, 2026-06-08, conforme o próprio §2.4-d).
**Evidência executada** — cruzamento exaustivo de **toda** `basisMetricKeys` de `rules.ts` contra **todo**
`metricKey: "…"` escrito em `src`:

```
$ rg -o 'metricKey: "[a-z0-9_.]+"' src -N --no-filename | sort -u    # 15 produtores
SEM produtor nenhum:  api_request.count · api_requests_count · storage_gb_month · storage_bytes_current
```

**Motivo:** o §2.4-d afirma que as chaves de storage, jobs **e api** *"passam pelo **mesmo**
`recordCloudUsageBestEffort`"*, e a pendência `P-O6R-B06-USAGE-BEST-EFFORT-RESIDUAL` prescreve como remédio
*"a mesma disciplina do §3.1 (append na tx do fato de origem)"*. Para `api_request.count`/`api_requests_count`
e para `storage_gb_month`/`storage_bytes_current` **não há fato de origem sendo gravado** — o remédio não se
aplica e o próximo bloco herda um enunciado errado. (`job.executed`/`job_executions_count` **sim** existem, em
`src/infra/jobs/job.worker.ts:66,80` — essa parte do §2.4-d está correta.)

## E7 · A tese do §4 ("nenhum real depende de consumidor nenhum") contradiz o §2.4-d do mesmo plano

**`gravidade: média` · `escopo: dentro-do-bloco`** (é a resposta à **ressalva vinculante (2) do porteiro** —
tem de ser exata).
**Evidência (leitura):** `cloud-cost-allocation.rules.ts:36-49` — as categorias `storage` e `jobs` têm base
`checklist_attachment.uploaded/downloaded.bytes` e `job.executed`/`job_executions_count`; essas linhas são
gravadas por `recordCloudUsageBestEffort` em `cloud-usage.events.ts:56-118` e `job.worker.ts:66,80` — todas
**fora da tx do fato** e sob o `.catch(warn)` de `cloud-usage.service.ts:156-176`, que o bloco **preserva**
(§3.5 item 2). São **dinheiro** (entram no rateio) e continuam dependendo de fire-and-forget.
**Motivo:** a tabela componente-a-componente do §4 **não tem linha** para "base de rateio de storage/jobs" —
o único caso em que a resposta da coluna *"Dinheiro se perde?"* seria **Sim, e em silêncio**. A frase honesta
é *"nenhum real **da categoria `checklists`** depende de consumidor"*. **O escopo do bloco está certo** — o
`local` do achado DIN-005 no `achados.jsonl` nomeia `cloud-usage.events.ts:38-53` e `rules.ts:61-66`, não
storage/jobs (ver "o que sobreviveu", abaixo) — o defeito é a **afirmação**, não o recorte.

## E8 · A tolerância de 1e-6 do aceite S3 não vem da aritmética — medida, a diferença chega a 1,1e-3

**`gravidade: média` · `escopo: dentro-do-bloco`.** S3 exige *"`services[].unblendedCost` = soma manual dos
itens lidos em páginas de 500 até esgotar (11 páginas) … diferença ≤ 1e-6"*, e S1 fixa só **uma** das 10.001
linhas (`999999.000001`); as outras 10.000 ficam a critério do dev.
**Evidência executada** (node, soma em `double` vs soma exata em micro-unidades — o que `numeric(20,6)` faz):

```
A 10001 valores pequenos (~1e-1) : delta = 0
B 10001 valores ~1e3             : delta = 0
C 10001 valores ~9,9e5           : delta = 0.0011081695556640625     <-- 1108x a tolerância
```

**Motivo:** com fixture de custo **realista** (linhas de CUR na casa de 1e5–1e6, que é o cenário que torna o
DIN-007 grave), o lado **manual** do aceite — soma em float de 11 páginas — diverge do `SUM(numeric)` por
~1e-3 e S3 fica vermelha **por aritmética, não por defeito**. No caso C o total (~9,88e9 com 6 casas) já
passa de 2^53 em micro-unidades: **nem a referência "exata" cabe num `number`** — o que confirma o Risco 6 do
plano e mostra que ele contamina também o *critério de aceite*, não só o contrato.

## E9 · "Mesmo `where` do detalhe" não é exato: o resumo injeta período default de 30 dias que o detalhe não tem

**`gravidade: baixa` · `escopo: dentro-do-bloco`.** §3.3 exige `buildLineItemWhere(filters)` **compartilhado**
e S4 asserta *"`lineItemCount` = `count` do detalhe com o mesmo filtro"*. Medido: `aws-cur.service.ts:184-191`
(`normalizeSummaryFilters`) preenche `periodEnd = now` e `periodStart = now - 30d` além do `limit: 10_000`;
`listLineItems` (`:78-82`) **não** normaliza período. `aws-cur-prisma.repository.ts:136-158` filtra o período
**só por `billing_period_start`** (`gte`/`lte`). S4 só fecha se o teste passar período explícito nos dois
lados. **Nota adjacente:** `withTenantRls(client: PrismaClient, …)` (`src/database/rls.ts:29-33`) exige
`PrismaClient`; o repositório do rateio é tipado `PrismaExecutor = PrismaClient | Prisma.TransactionClient`
(`cloud-cost-allocation-prisma.repository.ts:16-19`) — o §3.2 assume o caso feliz sem dizer.

## E10 · B3 já é verde na base — é regressão, não aceite do P0

**`gravidade: baixa` · `escopo: pre-existente`** (o `take: 100_000` é de `6f27faae`, 2026-06-08, como o §2.4-c
data). B3 (*"10.001 linhas de custo → rateio `completed`, `totalImportedCost` inclui a 10.001ª"*) passa em
`fe2748c` sem nenhuma mudança: `cloud-cost-allocation-prisma.repository.ts:135` já usa `take: 100_000`. O
próprio §8.5 não o inclui na lista de vermelho-controle (A1, F1, S1, B1). Não reprova; só não deve ser
contado como prova do DIN-007 no fechamento.

---

# O QUE ATAQUEI E **SOBREVIVEU** (com a prova que o plano não tinha)

1. **§2.4-a — "ninguém agenda `cloud-usage.aggregate-daily`": CONFIRMADO por presença.** Não me apoiei no
   `rg` do plano (prova por ausência). Enumerei **todos** os sítios de `enqueue(` em `src`: publisher
   (`domain-event.publisher.ts:71`, nome vindo de `eventJobMap` — **li o mapa inteiro, `:27-40`, e
   `cloud-usage.aggregate-daily` não está lá**), `charging.accrue-daily` (×2), `impound.reconcile-removals`
   (×2), `impound.notify-due` (×2), `notifications.scan-due` (×2) e o laço do geocoder (método interno, outra
   coisa). `job-worker.bootstrap.ts:141-147` sobe **as mesmas 4** varreduras. O handler existe
   (`job.registry.ts:50`) e **nada o dispara**. A projeção é vazia por construção. ✔
2. **§2.4-b — FORCE RLS: CONFIRMADO por EXECUÇÃO** (D1/D5 acima), não por leitura: 0 linhas com dado
   presente sob papel sem BYPASSRLS, 1 linha com o GUC. Migração `20260611000000/migration.sql:57-68`. CI é
   superusuário (`ci.yml`) → invisível. ✔ (E ainda mais forte do que o plano dizia: ver E3.)
3. **§2.4-c — `take: 100_000` no rateio: CONFIRMADO por leitura** — `cloud-cost-allocation-prisma.repository.ts:135`
   (`listCostLineItems`) e `:150` (`listUsageDailyAggregates`). ✔
4. **Escopo do `.catch(warn)` (ataque 3 do briefing): LEGÍTIMO.** O `local` do `Ω6R-DIN-005` no
   `achados.jsonl` (linha 5) nomeia exatamente `checklist.service.ts:247-269`,
   `checklist-prisma.repository.ts:394-406`, `domain-event.publisher.ts:48-60`,
   `cloud-usage.service.ts:149-168`, `cloud-usage.events.ts:38-53` e `rules.ts:61-66` — **não** storage/jobs.
   Fechar as duas chaves da vistoria e nomear a classe é recorte fiel ao achado; ampliar seria o outbox
   genérico da `Ω6R D-002`, **não deliberada**. O que não sobrevive é a **frase** do §4 (E7) e a **descrição**
   da pendência (E6). ✔
5. **Dedup da reparação "pela identidade da FONTE" (ataque 4): CORRETA para os dois `metricKey` legados.**
   Verifiquei o que o plano assumiu sem mostrar: os dois `publishDomainEvent` carregam `runId` no payload
   (`checklist.service.ts:268-272` e `:557-566`), e `cloud-usage.events.ts:10` faz
   `sourceId: readString(event.payload.runId) ?? event.id` — logo **as linhas legadas têm `source_id` = id da
   run**, e dedupar por `(source_type, source_id, metric_key)` de fato as enxerga (dedupar pela chave nova
   não enxergaria). O furo do script **não é a dedup — é o universo** (E1: reabertas).
6. **`approved_head = a2988b5` (ataque 8): pré-condição EXECUTADA e SATISFEITA.**
   `git diff --stat a2988b5 c5d63bf -- src tests prisma frontend mobile .github scripts` → **vazio, ec=0**.
   Reforcei por árvore (a armadilha do pathspec: diff vazio também sai quando o delta não toca os caminhos):
   `git rev-parse c5d63bf^{tree}` = `git rev-parse fe2748c^{tree}` = `1f957536a3…` — **iguais**. E o diff
   completo `a2988b5..c5d63bf` toca **20 arquivos, todos de registro** (`pendencias.md`, briefing, ata, votos).
   O par `merge_commit fe2748c` / `approved_head a2988b5` está correto. **Ressalva menor:** o pathspec do §9
   omite arquivos de raiz que também são código (`package.json`, `package-lock.json`, `tsconfig*`,
   `Kpis/app.js`) — aqui não muda nada porque a árvore inteira bate, mas a prova que vale é a da árvore.
7. **Piso ÚNICO e aritmética do §7 (ataque 7): CONFEREM.** Reexecutei o baseline do §2.3 com o mesmo comando
   (`grep -c "^\s*\(test\|it\)("`): 7+3+4+7+3+7+2+4+3+7 → **SOMA = 47**, idêntico. E o §7 fecha:
   A 11 (2+2+1+1+1+1+2+1) · F 7 (2+1+1+2+1) · R 12 (2+3+2+4+1) · S 15 (3+3+1+5+2+1) · B 7 (1+2+1+1+1+1) ·
   C 5 (3+1+1) · K 4 (2+1+1) = **61**; menos os 4 migrados = **57 ≥ 47**. **Um** piso, publicado uma vez
   (§8) — a falha do 07b (três pisos para o mesmo número) **não se repete**. ✔
8. **`SUM(numeric)` é exato (PD-2a): CONFIRMADO por execução** no cluster descartável —
   `select sum(v) from (values (0.1::numeric(20,6)),(0.2),(0.3))` → `0.600000`, `pg_typeof` = `numeric`.
   A dúvida do plano é legítima e a resposta que ele antecipa está certa; o risco real está na **borda**
   (E8) e não no banco.
9. **Fronteira de autoridade: RESPEITADA.** Varri o plano inteiro: a `Ω6R D-002` aparece **três vezes**
   (§0, §2.4-d, §3.5) e **sempre** como "não deliberada / não invocada", justificando o que o bloco **não**
   faz. Nenhuma linha se apoia nela. A `Ω6R D-003` idem. ✔
10. **Ausência de dispatcher (§3.4): não é o ponto fraco.** O plano indica esse como o ataque nº 1 contra si;
    não é. Com o consumidor sendo o **mesmo banco**, mover linha de tabela para tabela não adiciona garantia,
    e o `impound.outbox.repository.ts:33-46` que ele cita como espelho existe porque o alvo é **externo**
    (Sivec). O Plano B custaria migration + laço + ~15 casos **e ainda precisaria do §3.2**. Não sustento
    esse ataque; os que sustento são E1/E2/E3, e nenhum deles se resolve trocando A por B.

---

# O QUE PRECISA VIRAR REQUISITO EXPLÍCITO (o que sobreviveu ao ataque, na forma de exigência)

1. **A invariante do §3.1 tem de declarar o universo** — runs reabertas são estado legítimo **sem**
   `checklist_runs_count`/`checklist_run.created` (PR-03). A8 e o script de reparação precisam do mesmo
   recorte, e o script precisa de aceite que semeie **reabertas legadas sem métrica** e exija **zero**
   inserção de `checklist_runs_count` para elas. (E1)
2. **A trilha `registerDivergence` → `acknowledgeRun` tem de ser medida ANTES e DEPOIS**, com o número
   publicado, e a mudança de 0→1 unidade **decidida pela junta como decisão de produto** — não descoberta em
   execução. Enquanto não for decidida, a frase "semântica de cobrança PRESERVADA" não pode ficar no plano. (E2)
3. **O drill sem BYPASSRLS tem de cobrir a ESCRITA do rateio, não só a leitura** — e o resultado esperado de
   B2 tem de ser o que o schema permite, não o que o plano gostaria. (E3)
4. **Todo aceite precisa de falsificador que o plano tenha conferido no papel** — A5 construtível e M-3
   pareada com aceite que ela realmente mata. (E4, E5)
5. **Pendências têm de descrever o defeito real:** api/storage sem produtor ≠ best-effort. (E6)
6. **A tese do §4 tem de ser quantificada por categoria de custo** (`checklists` sim; `storage`/`jobs` não). (E7)
7. **A tolerância de S3 tem de ser derivada da fixture** (ou a fixture fixada em faixa onde 1e-6 seja
   defensável). (E8)

---

**Encerramento.** Não implementei, não corrigi e não propus correção (§C7.4-bis). Limpeza §C5: removido o
container `b06-critico-pg` (cluster descartável, porta 56606); nada foi escrito em `src/`, em `tests/`, na
árvore principal ou nos worktrees alheios; a base viva `erp-postgres`/`erp-redis` não foi tocada.
Único arquivo produzido: **este parecer**. **Eu não commito.**
