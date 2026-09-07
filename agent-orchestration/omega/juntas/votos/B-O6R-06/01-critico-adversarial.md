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

---
---

# RODADA 2 (2026-09-06) — ataque à `EMENDA E1`

**Escopo desta rodada: SÓ O DELTA.** Commit `26182d6b` sobre `be608a52`: `git diff --stat` = **1 arquivo,
380 inserções, 0 remoções**; conferi por `cmp` que as 773 linhas do corpo ficam **byte-idênticas**
(`git show be608a52:…|head -773` vs `git show 26182d6b:…|head -773` → **ec=0**). Não re-litigo nada da
rodada 1 que ficou fechado. **Rodada final (teto 2).** Terreno: worktree `b06`, **segundo cluster
descartável próprio** (`b06-critico-pg2`, porta **56607**, `postgres:16-alpine`), removido no fechamento;
base viva fora de alvo; `ec` sem pipe.

## VEREDITO DA RODADA 2: **PLANO ROBUSTO COM RESSALVA**

**E2 e E3 fecharam** — o E3 com prova por execução contra o desenho novo. **E1 fechou pela metade**: o
universo foi declarado e a reabertura deixou de ser refaturada, mas **a mesma classe reapareceu num
caminho novo que a própria emenda abriu** — o reconcile agora refatura a **trilha C** que o E1·2 acabou
de proteger. **O bloco PODE gerar a primeira linha de código** em tudo que não seja o script de
reparação (detalhe do veredito no fim).

---

## R2-1 · E1 (universo da invariante) — **FECHADO para a reabertura**; **REABERTO para a trilha C**

### O que fechou (verificado)

- **Restringir o universo aqui é conserto, não fuga do contraexemplo.** O teste é: o recorte tem
  **justificativa independente do contraexemplo**? Tem, e é anterior ao bloco — `reopened_from_run_id IS
  NULL` é a fronteira que a **junta PR-03** já havia estabelecido para não cobrar duas vezes o mesmo
  trabalho de campo (`checklist.service.ts:586-588`, `checklist-prisma.repository.ts:696-707`). O universo
  novo **coincide com a regra de negócio existente**, não com o que o teste precisava para passar. Se o
  recorte fosse "runs que não sejam as 2 que quebram", seria fuga. Não é.
- **`A8′` passou a exigir contagem POSITIVA** para as reabertas (0 linhas de criação **e** 1 `completed`
  com `quantity 0`), não só ausência — é o que impede o recorte de virar cegueira. **`M-14` guarda** os
  dois lados (A8′, A9, R6).
- **Reaberta DE reaberta (item iv do coordenador): não refatura.** Cadeia r1→r2→r3: `r2` e `r3` têm
  `reopened_from_run_id` **NOT NULL** (`checklist-prisma.repository.ts:771` grava `previous.run.id`, que na
  segunda reabertura é `r2.id`), logo **ambas caem no predicado** `reopened_from_run_id IS NULL` do
  reconcile e nenhuma ganha chave de criação; a conclusão de cada uma cai no `CASE WHEN … IS NOT NULL THEN
  0`. E a original `r1` (reopened NULL, `completed_at` NOT NULL) recebe `1`, correto. ✔

### O que **não** fechou — achado novo `R2-A` (`gravidade: bloqueia o script`, `escopo: dentro-do-bloco`)

**O reconcile do E1·1 refatura exatamente a trilha C que o E1·2 protegeu.** As duas seções da mesma emenda
se contradizem:

- **E1·2, decisão 2:** trilha C (`registerDivergence` → `acknowledgeRun`) fica **0 → 0**, garantido por
  parâmetro obrigatório `meterCompletion: false`, com dois aceites (A10, F6) e duas mutações (M-16, M-17).
- **E1·1, reconcile:** *"a chave `completed` cobre **todas as runs** com `completed_at`/`pending_ack` com
  `quantity = CASE WHEN r.reopened_from_run_id IS NOT NULL THEN 0 ELSE 1 END`"* — **sem** recorte de trilha.

**Evidência (leitura do caminho, exaustiva).** Uma run de trilha C termina com `completed_at` **preenchido**:
`checklist-prisma.repository.ts:688-690` — `completed_at: status === "pending_acknowledgement" ? null : new
Date()`; `acknowledgeRun` (`service.ts:733`) chama com `completed_with_divergence`, logo `completed_at = now`.
Essa run satisfaz o `WHERE` do reconcile e **não tem** evento `checklist_run.completed` (correto, por
`meterCompletion: false`). O `WHERE NOT EXISTS` a enxerga como "concluída sem métrica" e **insere 1 unidade
faturável** — na base de rateio `checklists` (`rules.ts:64`).

**Motivo.** (i) É **dinheiro**, e é a **mesma classe** do E1 da rodada 1 (o script trata "run sem métrica"
como defeito quando é estado legítimo), só que agora o estado legítimo foi **criado pela própria emenda**.
(ii) O `--apply` na demo é a pendência 5 do §12, **decisão do dono** — o refaturamento sairia por lá.
(iii) **Nenhum aceite pega:** K4 semeia 3 reabertas + 2 originais; **nenhuma run de trilha C**. K1′ declara as
5 como originais. Não há mutação equivalente a M-15 para este predicado.

### Achado novo `R2-B` (`gravidade: alta`, `escopo: dentro-do-bloco`) — **I2′ não é verificável por SQL**

O corpo vendia I1/I2 como *"verificáveis por SQL"*. **I1′ é** (`reopened_from_run_id IS NULL` é coluna).
**I2′ não é**: seu universo é *"`∀ r` com `completed_at IS NOT NULL ∨ status='pending_acknowledgement'` **e
que tenha passado por `service.completeRun`**"* — e "passou por `service.completeRun`" **não é observável em
nenhuma coluna** de `checklist_runs`. Medido: a distinção trilha A/B × trilha C existe **só no sítio de
chamada** (`service.ts:538` vs `:685`/`:733`); nada no schema a registra (`status` e `completed_at` são
idênticos nos dois casos para `completed_with_divergence`). Consequência dupla: (a) o aceite que "prova I2′
por SQL" não pode existir na forma que A8′ tem para I1′; (b) é **a mesma razão** pela qual o reconcile erra
(R2-A) — o script só tem SQL, e o predicado que ele precisaria não está no banco.

---

## R2-2 · E2 (intenção de faturar por assinatura) — **FECHADO**, com uma ressalva de método

**Isso troca convenção por condição verificada pelo compilador?** Sim, para o conjunto de chamadores de
`completeRun`: parâmetro **obrigatório sem default** faz `npm run check` recusar um 4º chamador que não
declare, e o precedente do idioma existe e foi medido no 07b —
`votos/B-O6R-07b/C1-secops-evidencia.md`: *"arquivo novo `src/modules/zz-c1-probe/probe.storage.ts` chamando
`provider.save({…})` sem `verification`: `npm run check` → **ec 2**, `error TS2345`"*. **C6 é construtível
pelo mesmo caminho.**

**O parâmetro pode ser passado errado sem nada morder?** Não em silêncio: `meterCompletion: true` indevido
em `registerDivergence`/`acknowledgeRun` é exatamente **M-16**/**M-17**, e **A10** (dois passos), **F6** e
**C4** (censo por chamador) ficam vermelhos. O pareamento aqui está correto.

**Existe um 4º caminho que muda `status` sem passar por `completeRun`? SIM — e ele está fechado por OUTRA
trava, que o plano não pina.** Enumerei **todos** os sítios que mutam `checklist_runs` em `src`:

```
$ rg -n 'checklistRun\.update|checklistRun\.updateMany|UPDATE checklist_runs' src
checklist-prisma.repository.ts:551   stampRunRole        (SET role — não toca status)
checklist-prisma.repository.ts:651   updateRun           <-- 4o caminho: SET status = data.status
checklist-prisma.repository.ts:679   completeRun         (o do parâmetro billing)
```

`updateRun` (`:612-665`, chamado por `service.ts:353` ← REST `controller.ts:183` e **sync mobile**
`mobile-checklist-sync.ts:443`) **muda `status`** — mas `assertChecklistRunStatusTransition`
(`checklist.run-lifecycle.ts:166-186`) **barra com 409** os três estados que interessam ao faturamento:
`completed`, `completed_with_divergence` (`:169-176`) e `pending_acknowledgement` (`:178-185`).
**Portanto o conjunto está fechado — por DUAS travas em arquivos diferentes**, e a emenda só prova uma
(o compilador, C6). Se alguém relaxar `assertChecklistRunStatusTransition` amanhã, uma run chega a
`completed` **sem métrica** — o P0 de volta — e **nenhum dos 94 aceites nota**. `run-lifecycle.ts` não está
no escopo §6, então isto é **ressalva** (`gravidade: média`, `escopo: pre-existente` — o guard é de PR-03),
não bloqueio: o que falta é um aceite que **pine** a trava, não código.

**Ressalva menor (`baixa`, `dentro-do-bloco`):** C6 exige um arquivo-sonda **dentro de `src/`** (é o que faz
o `tsc` do `npm run check` alcançá-lo — `tests/**` está fora do tsconfig, como o próprio 07b registra). O §6
emendado autoriza **um** caminho novo em `src/` (`cloud-usage.capture.ts`); a sonda de C6 não está nomeada.

---

## R2-3 · E3 (RLS de ponta a ponta) — **FECHADO, e provado por execução contra o desenho novo**

Reproduzi o meu drill da rodada 1 **contra o desenho da emenda** (helper `forEachTenantInOneTx` = **uma**
`$transaction` com `set_config` por iteração), no cluster `b06-critico-pg2`, papel
`app LOGIN NOSUPERUSER NOBYPASSRLS`, espelho de `tenant_cloud_cost_allocations` (FORCE RLS + `WITH CHECK`):

```
N1  UMA tx: set_config(A) → delete(run) → insert(A) → set_config(B) → delete(run) → insert(B) → commit
      -> ec=0 · INSERT 0 1 · INSERT 0 1        A ESCRITA PASSA (era ec=1 no desenho antigo, D3)
N2  conferência (superuser): 1 linha para A, 1 linha para B                                  ✔
N3  VAZAMENTO DE GUC no laço (esquecer o set_config da 2ª volta e inserir a linha de B):
      -> ec=1 · ERROR: new row violates row-level security policy for table "tca"   FALHA ALTO
N4  delete sob GUC de A apaga só a linha de A (a de B sobrevive)  -> DELETE 1               ✔
N5  nova transação sem set_config: GUC <VAZIO>, count = 0  (set_config(...,true) é tx-local) ✔
```

**Respostas diretas ao coordenador:** (i) **a escrita passa** — o E3 está resolvido, e o `B2′` que era
insatisfazível agora é satisfazível; (ii) **vazamento de GUC no laço, na ESCRITA, é fail-closed e ruidoso**
(N3) — não existe caminho de escrever no tenant errado em silêncio; (iii) `B2′` tratar falha de criação do
papel como **vermelho e nunca skip** é o que impede o drill de virar teatro sob superusuário (CI é
`postgres`, medido na rodada 1); (iv) `listTenants()` funciona sob o papel — **provei por presença** que
`tenants` **não tem RLS**: os **únicos** dois `ALTER TABLE "tenants"` de todo `prisma/migrations` são a
adição da coluna `modules` (`20260722000000_add_tenant_modules:14,16`).

### Achado novo `R2-C` (`gravidade: média`, `escopo: dentro-do-bloco`) — o helper é fail-closed na escrita e **fail-OPEN na leitura**

A simetria que o N3 sugere **não existe**. Medido no mesmo cluster, mesma transação:

```
begin; set_config('app.current_tenant_id', A, true);
  select … from tca;                    -> iter A                  : 1 linha do tenant A
  select … from tca;   (iteração "B" SEM re-setar o GUC)
                                        -> "iter B SEM set_config" : 1 linha do tenant A   ec=0
commit;
```

A `USING` da policy casa com o GUC **obsoleto** e devolve as linhas do tenant **anterior**, em silêncio.
Ou seja: no laço do helper, **esquecer o `set_config` numa volta de ESCRITA é impossível de não notar (N3);
numa volta de LEITURA, atribui o número de um cliente a outro sem um único erro.**
A emenda cobre **um** dos dois leitores: **B9** (canário que compara o `tenant_id` do `groupBy` com o GUC
corrente) protege `sumUsageBasis`. **`listTenantAllocations` — que o E1·3 também passa a rodar no helper, e
que alimenta o `GET /platform/cloud-cost-allocations/summary` do painel do investidor
(`cloud-cost-allocation.service.ts:135`) — não tem canário nem aceite equivalente.** Não é bloqueio (o
código correto está correto), é **cobertura ausente na exata falha que o helper introduz**.

---

## R2-4 · PDs — os 5 pontos

| # | Ponto | Fechou? | Medição minha |
|---|---|---|---|
| 1 | `createMany` retirado; só `$executeRaw` com alvo explícito | **Sim** | Decisão correta e bem fundada; ver **R2-D** para a mutação que a guarda |
| 2 | Tipos **nuláveis**, `_count._all` discriminador, `count>0 ∧ total=null` → erro, `?? 0` proibido nominalmente | **Sim** | S7 declara-se explicitamente "passa com o defeito, vermelho pelo par S8" — **honesto e corretamente pareado**; S8 e B10 são os falsificadores reais. É o padrão que faltou no 07b |
| 3 | Prisma 8 pinado por spy nos args (`take/skip/cursor/distinct`) | **Sim** | S9 é falsificável por construção (spy em argumento). Premissa de versão explicitada: `package.json` 7.8.0 |
| 4 | DIN-007 fechando **os dois** defeitos: `totalUnblendedCostExact: string`, tolerância **0** com referência em `BigInt` na fixture realista | **Sim** | É a resposta exata ao meu E8: a referência sai do `double` (que era o que divergia 1,1e-3) e vai para inteiro. S10 executa o Risco 6 em vez de prometê-lo |
| 5 | Fail-closed **mantido**, com linha 12 no §10 e teste que injeta a falha (F7/A16/A17) | **Sim** | Escolha declarada, não silenciosa; A17 prova o `WITH CHECK` de `cloud_usage_events` sob papel sem BYPASSRLS — o mesmo mecanismo que o meu D1/D5 mediu |

### Achado novo `R2-D` (`gravidade: média`, `escopo: dentro-do-bloco`) — **M-19 não tem falsificador; A12 testa o PostgreSQL, não o bloco**

**A12** promete *"`INSERT` cru com `id` já existente e chave nova → 23505"* como prova de que o alvo do
`ON CONFLICT` é `(tenant_id, idempotency_key)` **e só ele**, com **M-19** (omitir o alvo) como falsificador.
**Medido:** `RecordUsageEventInput` (`cloud-usage.types.ts:59-69`) **não tem campo `id`**, e
`cloud_usage_events.id` é `@default(dbgenerated("gen_random_uuid()"))` (`schema.prisma:452`) — a própria
emenda mede isso em E1·4(1). Logo **a colisão de PK é inalcançável pelo caminho de produção**: ou A12 faz um
`INSERT` cru **próprio** (e aí mutar o `ON CONFLICT` de `appendChecklistRunUsageInTx` não muda o resultado —
o aceite fica **verde com o defeito presente**), ou A12 chama a função de produção (e aí não consegue semear
`id` duplicado). Conferi que **nenhum outro aceite** distingue alvo-explícito de alvo-omitido: A5′ (0 linhas
afetadas), A14 (`DO NOTHING` vs `DO UPDATE`) e A15 (1 linha por chave) dão o **mesmo** resultado sob M-19,
porque a única outra unique da tabela é `@@unique([tenant_id, id])` e o `id` nunca é fornecido. **M-19 é
inobservável** — a decisão de retirar o `createMany` continua certa (defesa em profundidade), mas a emenda
promete em E1·7 que *"toda mutação aparece em ≥1 aceite que ela comprovadamente deixa vermelho **pelo
caminho que o aceite exercita**"*, e esta não aparece.

---

## R2-5 · A pergunta central: **20 mutações × 94 casos — alguma passa com o defeito presente?**

Percorri o pareamento **um a um**. **Resultado: 18 das 20 mutações têm falsificador legítimo pelo caminho
que o aceite exercita.** As exceções, e mais dois pontos de forma:

1. **M-19 → inobservável** (R2-D). É a repetição exata da classe que derrubou dois aceites no 07b — só que
   agora numa mutação, não num aceite.
2. **M-3 → re-pareamento CORRETO e conferido.** Era o meu E5. Agora M-3 ↔ **A1** (assert da forma da chave)
   e **A15** (*"duas emissões da mesma run em duas transações → 1 linha por chave"*): sob chave por emissão,
   A15 vê **2** linhas → vermelho **pelo caminho que exercita**. E **A4 foi retirado** em vez de remendado —
   correto: era o aceite sem falsificador. ✔
3. **M-18 só é vermelha sob o papel sem BYPASSRLS** — o que está certo, porque seu único alvo é B2′, que
   **cria** o papel e trata falha de criação como vermelho. Sob superusuário seria verde; a emenda fechou
   essa porta explicitamente. ✔
4. **C5 não tem mutação nomeada** — está na prosa do E1·4(5b), fora de qualquer tabela, e ainda assim conta
   1 caso na recontagem. Viola a regra (i) do próprio §7 (*"todo aceite tem N, forma e mutação nomeada"*).
   `gravidade: baixa`.
5. **B9 e "remover a asserção"; B5 e "mudar o default"** são mutações **autorreferentes** (apagar a asserção
   deixa vermelho o teste da asserção). Não provam detecção de defeito real; contam como guarda de
   regressão, não como falsificador. `gravidade: baixa` — não inflar a leitura da matriz.

### Piso e aritmética — **CONFEREM; o piso continua ÚNICO**

Recomputei cada série caso a caso, sem copiar os subtotais da emenda:

```
A = (2+2+1+1+1+2+2) + (1+2+1+1+1+1+1+1+1) = 11 + 10 = 21
F = 7 + 2 + 1 = 10          R = 12 + 1 = 13
S = (3+3+2+5+2+1) + (1+1+2+1) = 16 + 5 = 21
B = (1+3+1+1+1+1) + (1+1+1+2) =  8 + 5 = 13
C = 5 + 3 + 1 + 1 = 10      K = 2+1+1+2 = 6
TOTAL = 21+10+13+21+13+10+6 = 94 · migrados 4 · NOVOS = 90 ≥ 47
```

**94 e 90 batem.** A saída de A4 (−1) e a subida de A8→A8′ (1→2) explicam a série A permanecer em 11 antes
dos novos. **Piso: um só, `≥ 47`**, o mesmo do §2.3, com a mesma regra de recálculo publicada **uma** vez —
o defeito do 07b (três pisos para o mesmo número) **não se repete**. Nota de honestidade que a ata deve
carregar: dos 90 "novos", **B3 (1) já é verde na base** — a emenda o relabelou como regressão e o tirou da
evidência do DIN-007, o que está certo; ele apenas não deve ser lido como cobertura nova de defeito.

---

## R2-6 · Placar dos meus achados da rodada 1

| # | Achado (rodada 1) | Situação após a `EMENDA E1` |
|---|---|---|
| E1 | I1 falsa; reconcile refatura reaberta | **FECHADO para a reabertura** (I1′ com universo justificado por PR-03, A8′ com contagem positiva, M-14/M-15, K4) · **REABERTO noutro caminho**: `R2-A` (reconcile × trilha C) e `R2-B` (I2′ não é SQL) |
| E2 | 3 chamadores; trilha C de 0→1 | **FECHADO** — parâmetro obrigatório sem default, 3 chamadores declarados, tabela antes/depois, A10/A11/F6/C4/C6, M-16/M-17, e a cobrança da trilha C virou pendência de produto. Ressalva: o conjunto é fechado por **duas** travas e só uma é pinada |
| E3 | B2 insatisfazível; escrita morre sob RLS | **FECHADO e PROVADO por execução** (N1–N5). Ressalva nova `R2-C`: o helper é fail-open na **leitura**, e só `sumUsageBasis` tem canário |
| E4 | A5 não construtível | **FECHADO** — A5′ (duas chamadas na mesma tx, 0 linhas afetadas, tx viva) é construtível e falsifica M-4 |
| E5 | M-3 sem falsificador | **FECHADO** — re-pareada com A1/A15; A4 retirado |
| E6 | pendência descrevia o defeito errado | **FECHADO** — dividida em `USAGE-BEST-EFFORT-RESIDUAL` (com produtor) e `BASE-SEM-PRODUTOR` (sem produtor), com dono |
| E7 | tese do §4 mais larga que o recorte | **FECHADO** — tabela por categoria de custo; a frase passa a ser "da categoria `checklists`" |
| E8 | tolerância 1e-6 não derivada | **FECHADO** — referência em `BigInt`, tolerância 0, fixture na faixa realista, e S10 executa o Risco 6 |
| E9 | "mesmo `where`" inexato; tipo `PrismaExecutor` | **FECHADO** — período explícito nos dois lados + default documentado; asserção `"$transaction" in client` |
| E10 | B3 verde na base | **FECHADO** — relabelado, fora da evidência do DIN-007 |

**8 de 10 fechados; 2 fechados com caminho novo aberto pela própria emenda** (`R2-A`, `R2-B`, `R2-C`).

---

## VEREDITO FINAL: **PLANO ROBUSTO COM RESSALVA**

**O bloco PODE gerar a primeira linha de código** — com **um** artefato bloqueado:

- **LIBERADO para implementar já:** `cloud-usage.capture.ts` + `appendChecklistRunUsageInTx` (§3.1 emendado),
  o parâmetro obrigatório `billing` e os 3 sítios de chamada (E1·2), o helper `forEachTenantInOneTx` e os
  três métodos do rateio (E1·3 — **provado por execução**, N1–N5), `summarizeLineItems`/`buildLineItemWhere`
  e os campos exatos (E1·5), e os aceites correspondentes. Nada aqui depende de `R2-A`/`R2-B`/`R2-C`.
- **BLOQUEADO até a junta decidir:** `scripts/reconcile-checklist-usage.ts` — o ramo `completed`, que hoje
  refaturaria a trilha C (`R2-A`), e a redação de I2′, cujo universo não existe em SQL (`R2-B`). **Não
  proponho o recorte** (não é meu papel): a junta precisa decidir **qual predicado observável** delimita a
  conclusão faturável e **exigir um aceite da série K com uma run de trilha C semeada** — hoje não há
  nenhuma. Enquanto não decidir, o `--apply` na demo (pendência 5) não deve sequer ser oferecido ao dono.

**Requisitos explícitos que saem desta rodada** (o que sobreviveu, em forma de exigência): (1) o reconcile
precisa do mesmo recorte de trilha que o `meterCompletion` impõe, com aceite que semeie trilha C; (2) I2′
tem de ser reescrita num predicado observável, ou deixar de ser vendida como verificável por SQL; (3)
`listTenantAllocations` precisa do mesmo canário de contexto que `sumUsageBasis` ganhou (B9), porque a
leitura no laço é fail-open (`R2-C`); (4) M-19 precisa de aceite que a mate pelo caminho que ela muta, ou
sai do catálogo como decisão de defesa em profundidade sem falsificador; (5) C5 precisa de mutação nomeada;
(6) a sonda de compilação de C6 precisa de caminho autorizado em `src/`; (7) a trava
`assertChecklistRunStatusTransition` merece um aceite que a pine, já que metade do fechamento do conjunto
repousa nela.

**Encerramento (rodada 2).** Não implementei, não corrigi, não propus correção (§C7.4-bis). Limpeza §C5:
removido o cluster descartável `b06-critico-pg2` (porta 56607); nenhum arquivo de `src/`, `tests/`,
`prisma/` foi tocado; árvore principal e worktrees alheios intactos; base viva nunca foi alvo. Único
arquivo produzido nas duas rodadas: **este parecer**. **Eu não commito.**
