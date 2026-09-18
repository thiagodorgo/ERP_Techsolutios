# PLANO v3 — B-O6R-04a · consistência do estoque sob concorrência (replanejamento após a rodada 2 — última — do crítico)

> **Papel:** `planejador-mestre` · **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`, o fixado no frontmatter; sem fallback) · **Corpo aplicado:**
> `origin/main:.claude/agents/planejador-mestre.md`, lido por `MSYS_NO_PATHCONV=1 git -C <worktree b04a> show origin/main:.claude/agents/planejador-mestre.md`
> `[00]` — frontmatter `model: fable`; parágrafos `D-FALLBACK-MODELO-FABLE-OPUS` e `D-PLANEJADOR-MODELO-FABLE`.
> **Insumos:** comando com as emendas 1 (a–f), 2 (g–m) e **3 (n–s)**; plano v2 (`fb9ee5a6`, lido @ `cc696f93`) e suas medições `plan3-*`; parecer do
> crítico r2 (`00-critico-r2.md`: 2 `bloqueia` · 10 ajuste · 4 nota) e as sondas `crit3-*`; parecer r1; `PLANO_SAN3.md §5.6` `[03]`. Sondas do crítico e do
> v2 foram lidas como **roteiro**; **todo número deste plano é de execução minha** (§14). Nada das atas anteriores foi herdado como fato.
> **Terreno:** worktree `.claude/worktrees/b04a`, branch `fix/inventory-consistency`, HEAD `cc696f93` = commits só de `agent-orchestration/` sobre
> `merge-base origin/main = 02bd7dab` → **`src/` no HEAD é o head-base** `[01]`. Somente leitura (`git status --short` = 0 antes e depois de cada
> execução); sondas e este plano vivem no scratchpad (`plan4-*`). **Cluster:** `plan-b04a-pg` (`postgres:16`, porta **58544**, bases `erp_plan_b04a` e
> `erp_plan_mig`), 107 migrações, removido pelo nome ao fim `[02]`. Nenhum comando em `erp-postgres`, `erp-redis`, `erp-postgres-alt`, `pastrack-*`, `bsan301-*`, `dev-*`, `crit-*`, `j-*`.
> **Data:** 2026-09-18 · **Status:** COMPLETO — cada achado da r2 é requisito com desenho, teste com vermelho-controle (o cenário do crítico) e medição
> minha (§0); os 4 `bloqueia` da r1 (A-01, A-02, A-03, A-06) foram **re-medidos contra o desenho v3** sem regressão (§0.2); as decisões (n)–(s) estão
> carregadas dentro do plano (§0.3). O crítico não tem rodada 3: o que sobreviveu está aqui como requisito, e a junta confere cada linha por execução.
> Toda afirmação numerada `[NN]` remete ao §14 (comando → saída).

## 0. Tabela da emenda 3 — achado da r2 → requisito → desenho que o cumpre → teste com vermelho-controle (cenário do crítico) → medição minha

Coluna "teste": nome do caso no §6 e o **cenário do crítico reproduzido** como controle vermelho. Coluna "medição": chave da sonda `plan4-probe-b04a.mts` (§14 `[04]`, `[07]`, `[09]`) ou do apoio (`[05]` guards, `[06]` KPI, `[08]` migração).

| achado (r2) | gravidade | requisito (emenda 3) | desenho que o cumpre (§) | teste + vermelho-controle | medição minha → veredito |
|---|---|---|---|---|---|
| **S-01** `fechando` sem saída por 409 determinístico de uso comum | bloqueia | **(n)** nenhum estado sem saída; unidade falha sem ajuste aplicado → estado que aceita recontagem e cancelamento; com unidades aplicadas → saída com dono DENTRO do bloco | §3.3 **`abortClose`**: toda falha de unidade (409/400/503) chama, sob `FOR UPDATE` da sessão, `fechando + 0 carimbos → CAS aberta` (`reverted`); com carimbos → fica `fechando` (`kept`) e as saídas são **(i) recontar a entry não carimbada** (§3.4: `recordEntry` aceito em `fechando` com predicado `adjustment_movement_id IS NULL` no próprio UPDATE, sob `FOR SHARE` da sessão) **e (ii) retomar `close`**; `cancel` em `fechando` só com 0 carimbos (§3.4). A "saída de abandono a designar" **não existe mais**: as saídas são estas, implementadas neste bloco | **B13** (`STUCK`: BASE 4 + viatura 6, `open` real → 10, contado 2 → 409) + **B11** (parcial: X aplicado, Y 409) + **B16/B17**. Vermelho-controle = a emulação v2 embutida no teste (fica `fechando`, recontagem/cancel 422) e o head-base (limpo, `aberta`) | `[04]` STUCK: head-base `aberta`/recontagem ok/cancel ok; **v2 presa** (`fechando`, `not_open` ×2, 2º close 409); **v3 `abort: reverted` → `aberta`, recontagem ok, cancel ok**; v3 recontagem 8 → `concluida`, −2, saldo BASE 2. **STUCK_partial_v3**: `kept, stamped 1`; recontar Y ok / X `entry_adjusted` / cancel `close_in_progress` / retomada `concluida` 2 ajustes → **fechado** |
| **S-02** `totalVarianceValue` errado na retomada e na concorrência | bloqueia | **(o)** total da sessão INTEIRA no 200 e na auditoria `cycle_count.closed`, na retomada e sob concorrência, com `avg_cost ≠ 0` | §3.3 **`finishClose` calcula o total**: `SUM(e.variance × i.avg_cost)` sobre as entries **carimbadas** da sessão, na MESMA tx do CAS `fechando→concluida`, sob o `FOR UPDATE` da sessão (uma SQL; em memória, resolvedor de `avgCost` injetado); o serviço deixa de acumular por chamada; a unidade deixa de ler `findItemById` | **B14** (`TVV_resume`: 5 itens avg 2, 3º com BASE 1 → 409, entrada +9, 2º close → **−30**) e **B15** (`TVV_concorrente`: 10 itens avg 2, 2 closes intercalados × RACE_N → **−60** no único 200). Vermelho-controle = emulação v2 embutida (−18; −48/−30) | `[04]` TVV_resume: head-base −30, **v2 −18**, **v3 −30**; TVV_concorrente: **v2 −48/−30/−30 (3/3 errados)**, **v3 −60 em 5/5**, ledger 10/0 dup em 5/5 → **fechado** |
| **T-01** B3 vermelho no head-base por timeout de barreira | ajuste | **(r)** T-01 vermelho pelo motivo certo | §6 B3: barreira `waitForOwnBlockedStatement(fragment: "tenant_id")` — casa no head-base (`UPDATE "public"."cycle_count_entries" … "tenant_id" = $3`) e no v3 (`SELECT status FROM cycle_counts WHERE tenant_id=… FOR SHARE`); **1ª asserção = a invariante** (entry final `contado 7` e B → 422); a asserção `texto bloqueado ∋ "cycle_counts"` vem **depois** e só no desenho | **B3** (arranjo especificado: carimbo ANTES do B). Vermelho-controle = head-base | `[04]` B3_headbase: `tenant_id` **casou**, `cycle_counts` falhou (0 no cluster); B gravou `contado=5`; `invarianteContado7: false` → **vermelho pela invariante**. B3_v3: as duas casaram; B `not_open`; `contado 7` → **fechado** |
| **T-02** C7/C8 sem vermelho-controle e sem exercitar o mapeamento | ajuste | **(r)** T-02 exercitando o código real | §3.8: o `23505`/P2002 do índice novo é **inalcançável** por escritor que respeita a FK (KEY SHARE × `FOR UPDATE`); C7/C8 usam o único escritor que o alcança — SQL cru **sem o lock do item** (compensação de `m` com `item_id` de outra linha, não commitada); B (`reverseMovement`/`removeExitForSource` reais pelo papel) bloqueia no `INSERT` (tupla concorrente no índice), o cru commita, B recebe P2002 → wrapper → 409 / `undefined` **fora da tx** | **C7/C8** (T-C). Vermelho-controle = head-base sem índice: B não bloqueia → **2 compensações** | `[07]` C7_v3/C8_v3: B bloqueia em `INSERT INTO "public"."stock_movements"`, `P2002 fora da tx` → `already_reversed` / `undefined`, **1 compensação**; C7_headbase/C8_headbase: **2 compensações** → **fechado** |
| **T-03** B8(ii) vácuo com gancho pós-commit | ajuste | **(r)** T-03 exercitando o código real | §3.3: o gancho de teste é **`beforeUnitCommit(unit)`, chamado DENTRO de `uow.run`** (a tx segura sessão `FOR UPDATE` + item `FOR UPDATE` enquanto o gancho dorme); `onUnitApplied` pós-commit **sai**; B2/B8/B11/A12 usam o gancho dentro da tx | **B8(ii)** com o gancho dentro da tx × `open()`/`recalculateAbc()` reais; **B8(i)** = controle v1 embutido (`40P01`) | `[07]` LO_open_v3/LO_abc_v3: B **bloqueia** (`INSERT … cycle_count_entries` / `UPDATE … abc_class`), **0 × `40P01`**; LO_*_v1ctrl → **`40P01`** → **fechado** |
| **T-04** drill de DDL derruba suítes irmãs (`P2028`) | ajuste (classe P4 pré-existente) | **(r)** drill de DDL isolado das suítes irmãs | §4.4/§6 T-C′: C4/C5 saem para `tests/inventory-migration-drill-db.test.ts`, que **cria uma base própria** (`CREATE DATABASE` + `prisma migrate deploy` por `execFileSync`, ~16 s), roda o drill lá e a derruba no teardown; T-C (C1–C3, C6–C8) fica na base compartilhada e **não faz DDL** | **C4/C5** na base própria; DDLISO prova a isolação | `[02]` `migrate deploy` em base nova: 16 162 ms. `[09]` DDLISO: H segura `stock_movements` 3,4 s na base das suítes; `CREATE/DROP INDEX` na base própria → 151 ms; V `createMovement` na base das suítes → **95 ms, não bloqueou** → **fechado** |
| **D-01** D1 deixa passar 4 grafias | ajuste | **(r)** guard pela propriedade (as 4 grafias) | §6 D1 v3: ORM = **todo membro `stockMovement.<m>(` cuja `m` não está na allowlist de LEITURA** (`findMany|findFirst|findUnique|…|count|aggregate|groupBy`) é escritor; SQL cru `/i` com `insert into|update|delete from|truncate|copy|merge into` + qualquer grafia de `"public"."stock_movements"` | **D1** + as mutações; vermelho = as 4 grafias do crítico | `[05]` NEGA 15/15 escritores (as 4 do crítico + `novoMetodoQualquer(` + `COPY` + `delete from "public".…`), PASSA 6/6 leituras → **fechado** |
| **D-02** D2 reprova o V5 do plano | ajuste | **(r)** guard e desenho coerentes | §6 D2 v3: leituras de **identificação** (`findMovementById`, `findExitBySource`) permitidas antes do lock; **decisão** (`saldoOf*|hasReversalOf*|isExitReversed*|movementsInGroup*|aggregate|wouldOverdraw|computeMovingAverage|avg_cost`) só depois; exatamente 1 lock; lock antes de laço; as versões SEM lock **não existem mais** no arquivo (§3.1) | **D2** sobre o fonte; 5 mutações | `[05]` V5 e V3 nas formas do §3.1 → `ok:true`; 5 mutações → `ok:false` → **fechado** |
| **K-01** KPI deixa `kpi-achados-paridade` vermelho | ajuste | **(r)** `aguardando_merge` e `findings.itens[].status` como no #385 | §9: `production_readiness.aguardando_merge = [DAT-002, DAT-003]` + `nota_aguardando`; `findings.itens[DAT-002/003].status = "fechado"`; `p0_fechados` 13; `fechados` inalterado | passo 7 da bateria (`kpi-achados-paridade`); vermelho = as edições do v2 (`[k3]` do crítico) | `[06]` espelho: controle 6/6; **edições v3 6/6**; edições sem `aguardando_merge` → `# fail 1` ("achado fechado SEM merge…") → **fechado** |
| **M-01** mensagem subconta (teto 20) | ajuste | **(r)** contagem real na mensagem | §4.1: `count(*)` sobre a CTE completa; amostra `LIMIT 20` em subconsulta separada; texto "Amostra (ate 20 de N)" | **C5** (T-C′) com 21 grupos; vermelho = a migração v2 ("20") | `[08]` 21 grupos → `P0001` "**21 grupo(s)** … Amostra (ate 20 de 21)" → **fechado** |
| **M-02** falha trava todo deploy até `migrate resolve` | ajuste | **(r)** roteiro com `prisma migrate resolve --rolled-back` e o aviso do gatilho do staging | §4.3 roteiro: censo → sanear → **`migrate resolve --rolled-back 20260873…`** → deploy; aviso: a falha marca a migração e `P3009` trava a fila de `prisma/` (`03a → SAN3-02 → …`); `deploy-staging.yml` dispara em `push: main` assim que `STAGING_DEPLOY_ENABLED=true` | drill do passo 8 (bateria) reproduz a sequência | `[08]` deploy #1 `P3018/P0001`; #2 `P3009`; limpeza; #3 **`P3009` de novo**; `resolve --rolled-back` → #4 aplicado; `pg_indexes` 2 → **fechado** |
| **A-DAT** DAT-003 fechado contra critério que o desenho não cumpre | ajuste | **(q)** critério superado pela emenda 2-h, com registro (§A2) | §9: o DAT-003 fecha contra **vencedor único · nenhuma unidade aplicada duas vezes · retomada que conclui · total correto (o)**; a divergência entra em `achados.jsonl` como campo novo `nota_criterio` e no `REGISTRO` como linha "Nota de critério", **sem reescrever `correcao`/`teste`** | passo 7 da bateria (o guard aceita o campo extra) | `[06]` espelho com `nota_criterio` → 6/6 → **fechado** |
| **N-C6** regex do T-C6 reprova o próprio censo | nota | **(s)** corrigir o texto | §4.2: a linha 1 do script diz "contém apenas consultas (SELECT); nada é gravado"; §6 C6 aplica a regex **depois de remover comentários** (`--…`, `/*…*/`) | **C6** | `[05]` texto cru 3 casamentos → sem comentários **0**; `[09]` censo por stdin contra 21 grupos → 22 linhas, contagem antes = depois (59) → **fechado** |
| **N-OVL** duas sessões sobre o mesmo item aplicam a variância duas vezes | nota (pré-existente, `528e3601`) | **(p)** entra no bloco: fechar a propriedade; B9 deixa de assentar o saldo errado | §3.5 **V9 `open`**: dentro da tx de `createSession`, `SELECT id FROM tenants WHERE id=$1 FOR NO KEY UPDATE` (serializa os `open` do tenant; **não** conflita com o KEY SHARE dos INSERTs) + consulta de sobreposição (`item_id` já em sessão `aberta|fechando`) → **409 `CYCLE_COUNT_CONFLICT/items_in_open_session`**; invariante **I9**: um item está em no máximo UMA sessão não terminal | **B9** (2 `open` concorrentes × RACE_N → 1 sessão; fechar → saldo = físico) — vermelho = head-base (2 sessões, saldo 98); **B9b** (I7 com sessões cruzadas semeadas por SQL cru, **sem asserção de saldo**) | `[07]` OVL_headbase saldo **98**; OVL_v3: 2º open **409**; corrida 5/5 → **1 sessão**; saldo **99**; open após `concluida` ok. `[04]` PRE: `NO KEY UPDATE` no tenant × `createMovement` → 70 ms sem bloquear → **fechado** |
| **N-I7** enunciado da I7 falso | nota | **(s)** corrigir o enunciado | §1 I7 v3: "toda tx que toma `FOR UPDATE` de `inventory_items` toma **exatamente um**, e a sessão antes; `open` (KEY SHARE em N) e `recalculateAbc` (NO KEY UPDATE em N) **não tomam `FOR UPDATE`** e nunca esperam por sessão nem por tenant" | B8/A12 | `[07]` LO: `open` bloqueia no INSERT de entries (KEY SHARE), abc no UPDATE (NO KEY UPDATE), 0 × `40P01` → **fechado** |
| **N-E5** emulação do sizing não literal | nota | **(s)** corrigir o nome; ata do sizing sai do código real | §0.2/§10 passo 10: os números do plano são da **emulação literal do v3** (unidade = sessão FU + `findEntry` + `listMovements` + `createMovement` com lock + carimbo; total no `finishClose`); a ata do sizing é do **código real** pelo dev; o head-base é medido pelo mesmo arnês | B10 (N=250 na CI) + passo 10 | `[10]` SIZE (v3 literal × head-base) — ver §0.2 → **fechado** |

### 0.2 Sem regressão — os 4 `bloqueia` da r1 re-medidos contra o desenho v3 (a resposta da v2 não regrediu)

| r1 | o que o v3 mudou perto dele | medição v3 (minha) → veredito |
|---|---|---|
| **A-01** TOCTOU de `recordEntryCount` | `recordEntry` agora é aceito em `fechando` para entry **não** carimbada (S-01) — o risco seria reabrir o TOCTOU | `[04]` B3_v3: B bloqueia no `FOR SHARE`, relê `concluida` → 422, `contado 7`. `[07]` E34_recordEntry_carimbada: B bloqueia, `entry_adjusted`, entry intacta; E34_recordEntry_naoCarimbada: B bloqueia, `ok`, e a unidade seguinte aplica o contado FINAL (variance −5 = 5 − 10, `coerente: true`) → **segue fechado** |
| **A-02** `cancelSession` por cima de fechamento | `cancel` agora é aceito em `fechando` com 0 carimbos (S-01) — o risco seria cancelar com ajuste aplicado | `[07]` E34_cancel: B bloqueia no `FOR UPDATE` da sessão; ao liberar, relê `fechando` + `stamped 1` → **`close_in_progress`**; sessão `concluida`, `is_active=true`, ajuste no ledger → **segue fechado** |
| **A-03** ciclos `40P01` | `open` ganhou um lock (linha do tenant, `NO KEY UPDATE`) e o gancho de teste entrou na tx | `[07]` LO_open_v3/LO_abc_v3: 0 × `40P01` (controle v1 `40P01`); `[04]` PRE: o lock do tenant não conflita com KEY SHARE (70 ms); ninguém que segure lock de item espera pela linha do tenant (só `open` a toma, e `open` não segura `FOR UPDATE` de item) → **segue fechado** |
| **A-06** V6 > ~650 itens | `finishClose` ganhou uma SQL de soma; a unidade perdeu o `findItemById` | `[10]` SIZE v3 literal: N=250/500/1000 concluem com unidade média/p95/máx ≪ 5 000 ms; N=10 000 conclui (números no §14 `[10]`) → **segue fechado** |

### 0.3 Decisões da emenda 3 (n–s), carregadas dentro do plano — e as das emendas 1–2, que seguem valendo

- **(n)** S-01 requisito → §3.3 `abortClose`, §3.4 recontagem em `fechando` + `cancel` com 0 carimbos, §5, B11/B13/B16/B17, §13 (a pendência de abandono **não nasce**).
- **(o)** S-02 requisito → §3.3 total no `finishClose`, §5 (semântica do `totalVarianceValue`), B14/B15; a auditoria `cycle_count.closed` recebe o mesmo valor (controller inalterado, `cycle-count.controller.ts:92-102`).
- **(p)** N-OVL no bloco → §3.5 V9, I9, B9 (o B9 antigo vira B9b sem asserção de saldo), D8.
- **(q)** A-DAT → §9 (`nota_criterio` + linha no REGISTRO; texto original preservado).
- **(r)** T-01…M-02 requisitos → linhas acima; cada um com teste (B3, C7/C8, B8, C4/C5 em base própria, D1, D2, passo 7, C5, passo 8).
- **(s)** N-C6, N-I7, N-E5 → §4.2/§6 C6, §1 I7, §0.2/§10 passo 10.
- **Emenda 2 (g–m) e emenda 1 (a–f):** inalteradas — censo = ato do dono (g, §4.3); timeout global intacto e V6 em unidades medidas (h, `[10]`); mecanismo que dispensa ordem (i, I7); TOCTOU dentro (j, B3); `cancel` no mapa (k, V8); escopo com `ci.yml`/achados/censo (l, §8); T-D pela propriedade + status HTTP dos perdedores (m, D1/§3.7); 2º índice (a, §4.1); DAT-002/003 na autoria (b, §9); `SUITES` neste bloco (c, §8); journal fora (e); dívidas do #386 (f, §9).
## 1. Objetivo · ator · fluxo origem→destino

**Objetivo — invariantes (os dois do comando + os que a medição mostrou serem a mesma propriedade; I9–I11 nascem da r2):**
- **I1** saldo por item **e custódia** nunca negativo sob concorrência, em **toda** via que debita (V1–V5) — head-base: 20/20 saídas aceitas sobre saldo 10, saldo **−10** (v2 `[10-P1]`; o desenho de V1–V5 não mudou na v3).
- **I2** fechamento de contagem aplicado **exatamente uma vez**: um vencedor, um ajuste por (sessão, item), falha no meio deixa estado **retomável** — head-base: 2 vencedores, 2 ajustes.
- **I3** no máximo **uma compensação por movimento original**, na aplicação **e no banco** — `[07]` C7/C8: head-base 2 compensações; v3 1.
- **I4** custo médio da `entrada` sobre saldo serializado (v2 `[10-P7]`). **I5** corrida da MESMA fonte em `createExitForSource` nunca vaza `25P02` (v2 `[10-P9]`).
- **I6 (v3)** durante um fechamento: escrita **por cima de unidade aplicada** é recusada (422) — `recordEntry` de entry carimbada, `cancel` com carimbos; escrita que **não colide** com unidade aplicada é aceita e serializada pela linha da sessão — `recordEntry` de entry não carimbada (`FOR SHARE`), `cancel` com 0 carimbos (`FOR UPDATE`). `[04]` B3, `[07]` E34.
- **I7 (v3 — enunciado corrigido, N-I7)** toda transação que toma **`FOR UPDATE` de `inventory_items`** toma **exatamente um** e, se toma lock de sessão, toma-o **antes**; `open` (KEY SHARE em N itens pela FK) e `recalculateAbc` (NO KEY UPDATE em N itens) **não tomam `FOR UPDATE`** de item e **nunca esperam** por lock de sessão nem de tenant; só `open` toma a linha do tenant (`NO KEY UPDATE`) e não segura item algum ao pedi-la. Consequência: nenhum ciclo — `[07]` LO 0 × `40P01`, controle v1 `40P01`.
- **I8** o fechamento cabe no timeout de 5 s para **qualquer** N até `SNAPSHOT_LIMIT`: a unidade de tx é o item (`[10]`).
- **I9 (N-OVL)** um item está em **no máximo uma** sessão não terminal (`aberta|fechando`) por tenant — `open` recusa sobreposição (409) sob o lock da linha do tenant. `[07]` OVL: head-base saldo 98 com físico 99; v3 saldo 99, 1 sessão em 5/5 corridas.
- **I10 (S-02)** o `totalVarianceValue` do único 200 (e da auditoria) é o total da **sessão inteira**: Σ `variance` carimbada × `avg_cost` vigente, calculado sob o lock da sessão na tx do CAS final — `[04]` −30 na retomada, −60 em 5/5 concorrentes.
- **I11 (S-01)** **nenhum estado sem saída** por uso comum: falha de unidade sem ajuste aplicado devolve a sessão a `aberta`; com ajustes aplicados, a sessão fica `fechando` e sai por **recontagem das entries não carimbadas + retomada** (ou, sem carimbos, por `cancel`). `[04]` STUCK_v3 e STUCK_partial_v3.

**Atores (permissão exata que a rota compara — CE-G2, §7):** `POST /api/v1/stock-movements` e `POST …/:movementId/reverse` comparam `stock_movements:create`
(`inventory.routes.ts:119,129`); **`POST /api/v1/cycle-counts` (open, `cycle-count.routes.ts:49`)**, `PATCH …/entries/:entryId` (`:65`), `POST …/close` (`:73`) e `POST …/cancel` (`:81`)
comparam `cycle_counts:create`. Concedidas a `manager`, `operator` e `inventory` (`catalog.ts:534/537, 775/778, 882/885`); `viewer`/`finance` só `:read`; `auditor` nenhuma
(v2 `[04]`, código inalterado). Consumidores service→service sem permissão própria: `fuel-log.service.ts:564,575` e `maintenance-order.service.ts:709,720`. Sistema:
`CycleCountService.close` gera `ajuste` com `cycleCountId` (não forjável pela API pública — `inventory.types.ts:230-235`).

**Fluxo origem→destino hoje e depois (V1):** rota → `requirePermission` → `InventoryController` → `InventoryService.createMovement:298` → `RlsPrismaInventoryRepository.createMovement:692`
→ `withTenantRls` (`$transaction` + `set_config`, `read committed` `[04]`) → `PrismaInventoryRepository.createMovement:206` → `findItemById:207` → `saldoOfCustody:214` → `wouldOverdraw:216`
→ [`saldoOf:221` → `inventoryItem.updateMany:224`] → `insertMovement:236` → `stockMovement.create:436`. **Depois:** `findItemById` vira `lockItemForUpdate` e toda leitura que decide roda
sob o lock (§3.1). **V6 hoje:** `close:137` = `findSessionWithEntries` → `listMovements` → N × `createMovement` (N tx) → `applyClose:207` (`status='concluida'` sem condição,
`cycle-count-prisma.repository.ts:114`). **Depois:** `beginClose` (sessão `FOR UPDATE` + CAS `aberta→fechando`) → uma unidade **por item** (porta `InventoryUnitOfWork`: sessão
`FOR UPDATE` + item `FOR UPDATE` + ajuste + carimbo) → em falha, `abortClose` (S-01) → `finishClose` (sessão `FOR UPDATE` + total da sessão + CAS `fechando→concluida`).
**`open` hoje:** `open:52` = `listItems` (tx própria) → `createSession:24` (tx própria: `cycleCount.create` + `cycleCountEntry.createMany`). **Depois:** `createSession` toma a linha do
tenant (`NO KEY UPDATE`), consulta sobreposição e só então insere (§3.5). Nada muda acima do serviço; nenhuma rota, payload ou permissão nova; um status novo (`fechando`) e três
códigos novos (§5).
## 2. Mapa das vias — gerado do código (v2 `[05]`, re-conferido em `[03]`), agora com `open` e a saída de falha dentro

### 2.1 Geradores (a junta reexecuta — os do v2, mais o (e) para a linha do tenant)
```bash
cd .claude/worktrees/b04a
# (a) TODO escritor de stock_movements pela PROPRIEDADE (D1 v3): membro fora da allowlist de leitura + SQL cru /i em qualquer grafia
grep -rn -o -E "stockMovement\.[A-Za-z]+\(" src prisma scripts --include=*.ts --include=*.mts --include=*.mjs | grep -v -E "\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|count|aggregate|groupBy)\("
grep -rn -i -E "\b(insert\s+into|update|delete\s+from|truncate|copy|merge\s+into)\s+(\"?public\"?\s*\.\s*)?\"?stock_movements\"?" src prisma/seed*.ts scripts tests/helpers --include=*.ts --include=*.mts --include=*.mjs --include=*.sql
# (b) TODO escritor de cycle_counts / cycle_count_entries
grep -rn -E "cycleCount(Entry)?\.(create|createMany|upsert|update|updateMany|updateManyAndReturn|delete|deleteMany)\(" src prisma scripts --include=*.ts
# (c) quem chega a insertMovement / avg_cost; quem chama as vias de fora do módulo
grep -n "insertMovement(\|inventoryItem.updateMany" src/modules/inventory/inventory-prisma.repository.ts
grep -rn -E "createExitForSource|removeExitForSource|createMovement\(|createTransfer\(|reverseMovement\(" src --include=*.ts | grep -v "^src/modules/inventory/"
# (e) quem toma lock na linha do tenant (depois do bloco: SÓ createSession)
grep -rn -E "FROM \"?tenants\"?.*FOR (NO KEY )?UPDATE" src --include=*.ts
```
Resultado (`[03]`, idêntico ao v2 `[05]` — `src/` no HEAD é o head-base): um único `stockMovement.create` em runtime (`inventory-prisma.repository.ts:436`, `insertMovement`);
semente `prisma/seed-fleet.ts:171-173`; zero SQL cru fora de `prisma/migrations`; `hasReversalOf:469` filtra por `tenant_id` + `reverses_movement_id` (**sem item** — relevante para
T-02); escritores de `cycle_counts`/`cycle_count_entries`: `cycle-count-prisma.repository.ts:25,37,86,105,114,123`; (e) → **vazio** hoje.

### 2.2 Tabela por via — LÊ · DECIDE · ESCREVE · lock hoje · vermelho medido (head-base) · verde medido (desenho v3 emulado)

| via | LÊ / DECIDE / ESCREVE (arquivo:linha, hoje) | lock hoje | vermelho medido (head-base) | verde medido (v3) |
|---|---|---|---|---|
| **V1** `createMovement:206` | `findItemById:207` · `saldoOfCustody:214` · `wouldOverdraw:216` · [`saldoOf:221` · `updateMany:224`] · `insertMovement:236` | nenhum | v2 `[10-P1]` 20/20 ok, saldo −10; `[10-P11]` B commita saldo −1 | v2 `[10-V1]` 10 ok / 10 × 409, saldo 0; `[10-P11-new]` B bloqueia no `FOR UPDATE` → 409 (desenho **inalterado** na v3) |
| **V2** `createTransfer:239` | `findItemById:240` · `saldoOfCustody:247` · `wouldOverdraw:248` · `insertMovement:253,:263` | nenhum | mesma classe de P1 | mesma mudança de V1 |
| **V3** `reverseMovement:277` | `findMovementById:278` (identificação) · `movementsInGroup:282` · `hasReversalOf:286` · `saldoOfCustody:303` · `insertMovement:309` | nenhum; sem unicidade | v2 `[10-P3]` 2 compensações; `[07]` C7_headbase 2 com escritor cru | v2 `[10-V3]` 1; `[07]` C7_v3: P2002 → 409 fora da tx, 1 compensação |
| **V4** `createExitForSource:364` | `findItemById:365` · `findExitBySource:370` · `isExitReversed:372` · `saldoOfCustody:380` · `insertMovement:386` · `catch` P2002 **dentro** da tx `:398-404` | nenhum | v2 `[10-P9]` `25P02` 10/10 | v2 `[10-V4]` mesmo `id`, 0 × `25P02` |
| **V5** `removeExitForSource:410` | `findExitBySource:411` (identificação) · `isExitReversed:413` · `insertMovement:416` | nenhum | v2 `[10-P5]` 2; `[07]` C8_headbase 2 | v2 `[10-V5]` 1; `[07]` C8_v3 `undefined` via P2002 fora da tx, 1 |
| **V6** `close:137` | `findSessionWithEntries:138` · `status:146` · `listMovements:157` · N × `createMovement:182` · `findItemById:203` (avg) · `applyClose:207` | nenhum; N+3 tx | v2 `[10-P6]` 2 vencedores; `[04]` TVV head-base −30 (certo); STUCK head-base `aberta` (limpo) | `[04]` TVV v3 −30 / −60 em 5/5; STUCK v3 `reverted`; `[10]` SIZE |
| **V7** `recordEntry:99` | `findSession:105` · `status:110` · `recordEntryCount:86` (sem condição) | nenhum | `[04]` B3_headbase grava por cima do carimbo | `[04]` B3_v3 422; `[07]` E34: carimbada `entry_adjusted`, não carimbada `ok` coerente |
| **V8** `cancel:222` | `findSession:223` · `status:228` · `cancelSession:123` (sem condição) | nenhum | v2 `[10-E4-hb]` `cancelada` com ajuste no ledger | `[07]` E34_cancel `close_in_progress`; `[04]` STUCK v3 cancel ok em `aberta` |
| **V9 `open:52`** (novo no mapa — N-OVL) | `listItems:56` (tx própria) · `createSession:24` (`cycleCount.create:25` + `createMany:37`, tx própria) — **não decide** hoje | KEY SHARE em N itens (FK) | `[07]` OVL_headbase: 2 sessões sobre o item, saldo 98 (físico 99) | `[07]` OVL_v3: lock do tenant + sobreposição → 409; 1 sessão em 5/5 corridas; saldo 99 |
| **abortClose** (novo — S-01) | sessão `FOR UPDATE` · `count(carimbos)` · CAS `fechando→aberta` se 0 | — | v2 emulado: presa em `fechando` `[04]` STUCK_v2 | `[04]` STUCK_v3 `reverted`; STUCK_partial `kept` |
| `recalculateAbc` (`applyAbcClasses:561`) | não lê saldo; NO KEY UPDATE em N itens | — | v2 `[10-LO-old]` `40P01` com desenho v1 | `[07]` LO_abc_v3 0 × `40P01` |

**Propriedade a fechar (não a instância):** (i) toda via que chega a `insertMovement`/`avg_cost` toma o lock do item **antes** da primeira leitura que decide (as leituras SEM lock
que decidem deixam de existir — §3.1); (ii) toda transição de `cycle_counts.status` é **CAS** e toda escrita em `cycle_count_entries` roda sob lock da sessão (`FOR UPDATE` na unidade,
`FOR SHARE` na recontagem) com predicado de carimbo na própria linha; (iii) I7; (iv) `createSession` toma a linha do tenant e recusa sobreposição (I9); (v) toda falha de unidade
passa por `abortClose` (I11); (vi) o total do 200 sai do banco sob o lock (I10). O T-D (§6) enumera (i)–(vi) **pelo fonte** e reprova via nova sem classificação.
## 3. Desenho

### 3.1 V1–V5: row lock `FOR UPDATE` na linha `inventory_items(tenant_id, id)` ANTES da primeira leitura que decide — como TIPO (inalterado da v2; D-02 fecha o guard)

Sobreviveu às duas rodadas (r1 §3.2-3; r2 §5.1) e foi provado pelo v2 (`[10-V1]`, `[10-P11-new]`, `[10-V7]`, `[10-V3/V4/V5]`); a v3 não muda o mecanismo. `FOR UPDATE` (não `NO KEY
UPDATE`) porque só ele conflita com o `KEY SHARE` que todo `INSERT` em `stock_movements` toma na linha do item pela FK — é o que serializa até um escritor que esqueça o lock.

```ts
// src/modules/inventory/inventory-prisma.repository.ts
declare const ItemWriteLockBrand: unique symbol;
export type ItemWriteLock = { readonly [ItemWriteLockBrand]: true; readonly item: InventoryItem };   // SÓ lockItemForUpdate produz
private async lockItemForUpdate(tenantId: string, itemId: string): Promise<ItemWriteLock | undefined> {
  const rows = await this.client.$queryRaw<ItemRecord[]>`SELECT * FROM "inventory_items" WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid FOR UPDATE`;
  return rows[0] ? ({ item: mapItemRecord(rows[0]) } as ItemWriteLock) : undefined;   // undefined = inexistente/outro tenant → 400/404 como hoje
}
private saldoOfCustodyLocked(lock, custody) · saldoOfLocked(lock) · hasReversalOfLocked(lock, ids) · movementsInGroupLocked(lock, groupId) · isExitReversedLocked(lock, id)
private insertMovement(input, lock: ItemWriteLock)
```
**(D-02) As versões SEM lock que DECIDEM — `saldoOf`, `saldoOfCustody`, `hasReversalOf`, `isExitReversed`, `movementsInGroup` — deixam de existir** no arquivo (o guard D2 reprova a
mera presença). Ficam, sem lock e ANTES do lock, apenas as leituras de **identificação**, que só dizem QUAL item travar: `findMovementById` (V3) e `findExitBySource` (V4/V5); o que
elas devolvem é relido sob o lock antes de qualquer decisão (`hasReversalOfLocked` em V3/V5; `findExitBySourceLocked` em V4 — hoje `:370`). `$queryRaw` tagged (nunca `Unsafe` com string
montada). Via nova que chame `insertMovement` ou uma leitura `*Locked` sem o token é `TS2554`/`TS2345` no `npm run check` (CE-G1). A interface pública `InventoryRepository` não muda.

| via | mudança exata | prova |
|---|---|---|
| **V1** | `findItemById:207` → `lockItemForUpdate`; `saldoOfCustodyLocked` → `wouldOverdraw` → [`saldoOfLocked` + `avg_cost`] → `insertMovement(…, lock)` | v2 `[10-V1]`, `[10-V7]`, `[10-P11-new]` |
| **V2** | `findItemById:240` → `lockItemForUpdate`; as duas pernas sob o mesmo lock (mesmo `itemId`) | mesma mudança |
| **V3** | `findMovementById:278` (identificação) → `lockItemForUpdate(original.itemId)` → `movementsInGroupLocked` + `hasReversalOfLocked` sob o lock → pernas sob o lock; perna com `itemId ≠ original.itemId` = dado corrompido → 409 `transfer_group_inconsistent`, **nunca 2º lock** (I7) | v2 `[10-V3]`; `[07]` C7_v3 |
| **V4** | `lockItemForUpdate` ANTES de `findExitBySourceLocked`/`isExitReversedLocked`/saldo; o `catch` de P2002 (`:398-404`) **sai da tx** para o wrapper `Rls*` (§3.8) | v2 `[10-V4]` |
| **V5** | `findExitBySource:411` (identificação, sem lock) → `lockItemForUpdate(exit.itemId)` → `isExitReversedLocked` → insert sob o lock; P2002 do índice novo → `undefined` no wrapper, fora da tx | v2 `[10-V5]`; `[07]` C8_v3 |

### 3.2 I7 — o mecanismo que DISPENSA ordem global de locks (emenda 2-i; enunciado corrigido — N-I7)

Regra (I7 v3, §1): **toda tx que toma `FOR UPDATE` de item toma exatamente um, e a sessão antes; quem segura locks fracos em N itens (`open` KEY SHARE, `recalculateAbc` NO KEY
UPDATE) não toma `FOR UPDATE` e nunca espera por sessão nem por tenant.** Por que não há ciclo: um ciclo exige dois participantes que seguram algo e esperam algo. Quem segura
`FOR UPDATE` de um item (V1–V5, a unidade do V6) só esperou **antes** de tê-lo (pelo próprio item, ou pela sessão) e não pede mais nada depois; `open` segura KEY SHARE de Y e
espera KEY SHARE de X (bloqueado pelo `FOR UPDATE` da unidade), mas a unidade não pede Y; `recalculateAbc` idem com NO KEY UPDATE; `recordEntry`/`cancel`/`abortClose`/`finishClose`
seguram só a linha da sessão e não pedem item; `open` segura a linha do tenant (`NO KEY UPDATE`) e pede KEY SHARE de itens — ninguém que segure item pede a linha do tenant.
Medido `[07]` LO: unidade v3 segurando sessão + X **dentro da tx** × `open()` real / × `recalculateAbc()` real → B bloqueia e conclui, **0 × `40P01`**; controle v1 → `40P01`. `[04]` PRE:
`NO KEY UPDATE` na linha do tenant × INSERT de movimento (KEY SHARE pela FK `tenant_id`) → não conflita (70 ms). O guard D2 reprova método com >1 `lockItemForUpdate(` ou lock após laço;
o D8 reprova `createSession` sem o lock do tenant; B8 mantém o controle vermelho embutido (`40P01` na emulação v1) e o verde no código real com o gancho **dentro** da tx.
### 3.3 V6 em UNIDADES — máquina de estados `aberta → fechando → concluida`, com saída em toda falha (S-01) e total da sessão inteira (S-02)

**Por que unidades por item e não uma transação (emenda 2-h, inalterado):** a tx única é O(N) sob timeout fixo de 5 s (`withTenantRls` sem opções) — teto ≈ 650 itens (r1 A-06); a unidade
por item segura **um** item por ≈ 15–30 ms `[10]`, cabe para qualquer N, e o estado intermediário é persistido e retomável. Lotes reintroduziriam k locks e a ordem (I7) — rejeitado.

**Estados:** `aberta` → `fechando` → `concluida`; `aberta → cancelada` e **`fechando (0 carimbos) → cancelada`** por CAS; **`fechando (0 carimbos) → aberta`** por `abortClose` (S-01).
`CYCLE_COUNT_STATUSES` ganha `"fechando"` (`cycle-count.types.ts:5`); a listagem o aceita. **O que `fechando` significa agora:** "há um fechamento em curso ou interrompido"; nele,
`close` retoma; `recordEntry` é aceito para entry **não carimbada** e recusado para carimbada; `cancel` é aceito só com **0 carimbos**.

**API do repositório (`CycleCountRepository`, in-memory e Prisma) — cada método é UMA transação:**
```ts
type BeginCloseOutcome = { status: "started" | "resumed"; session; entries } | { status: "not_found" } | { status: "not_open"; current: CycleCountStatus };
beginClose(tenantId, id): Promise<BeginCloseOutcome>;                 // sessão FOR UPDATE; aberta → CAS fechando ("started"); fechando → "resumed"; senão not_open
lockSessionForUpdate(tenantId, id): Promise<CycleCount | undefined>;   // dentro da unidade (via porta), ANTES do item
findEntry(tenantId, id, entryId): Promise<CycleCountEntry | undefined>;// releitura sob o lock da sessão
stampEntry({ tenantId, cycleCountId, entryId, variance, adjustmentMovementId }): Promise<void>;
abortClose(tenantId, id): Promise<{ status: "reverted" } | { status: "kept"; stamped: number } | { status: "not_closing"; current? }>;
  // sessão FOR UPDATE; exige fechando; count(adjustment_movement_id) = 0 → CAS fechando→aberta ("reverted"); > 0 → "kept" (S-01)
finishClose(tenantId, id, updatedBy?): Promise<{ status: "ok"; session: CycleCountWithEntries; totalVarianceValue: number } | { status: "not_open"; current } | { status: "pending"; remaining: number }>;
  // sessão FOR UPDATE; exige fechando; pendentes = 0 → total = SUM(variance × avg_cost) das carimbadas (mesma tx) → CAS fechando→concluida (S-02)
recordEntryCount(input): Promise<{ status: "ok"; entry } | { status: "not_found" } | { status: "not_open"; current } | { status: "entry_adjusted" }>;
cancelSession(tenantId, id, updatedBy?): Promise<{ status: "ok"; session } | { status: "not_found" } | { status: "not_open"; current } | { status: "close_in_progress"; stamped: number }>;
createSession(input): Promise<CycleCountWithEntries>;                 // lança itemsInOpenSessionError(n) — §3.5
```
`applyClose` **sai** da interface (D4 reprova qualquer uso). Prisma: `beginClose`/`finishClose`/`abortClose`/`cancelSession` = `$queryRaw … FOR UPDATE` tagged + `updateMany({ where: { tenant_id,
id, status: <esperado> } })` com `count === 1` (senão relê e devolve `not_open`). O total (S-02) é UMA SQL sob o lock:
`SELECT COALESCE(SUM(e.variance * i.avg_cost),0) FROM cycle_count_entries e JOIN inventory_items i ON i.tenant_id=e.tenant_id AND i.id=e.item_id WHERE e.tenant_id=$1 AND e.cycle_count_id=$2 AND e.adjustment_movement_id IS NOT NULL`
(`[04]` TVV: −30/−60). In-memory: `InMemoryCycleCountRepository` recebe um resolvedor opcional `avgCostOf(tenantId, itemId)` (a fábrica de memória em `cycle-count.service.ts:245` passa
`getMemoryInventoryRepositoryForTests().findItemById`) — mesma fórmula, sem lock (mono-thread).

**`CycleCountService.close(actor, id, hooks?)`:**
1. `begin = repository.beginClose(...)` → `not_found` → 404 · `not_open` → 422 `cycleCountNotOpen(current)`.
2. `pending = entries.filter(counted !== undefined && counted !== system && !adjustmentMovementId)`, ordenadas por `itemId` (só determinismo).
3. Para cada `entry`, **uma** `uow.run(tenantId, async ctx => { s = ctx.cycleCounts.lockSessionForUpdate(…); if (s?.status !== "fechando") throw cycleCountNotOpen(…); e = ctx.cycleCounts.findEntry(…);
   if (e.adjustmentMovementId) return "skip"; variance = round(e.counted − e.system); if (variance === 0) return "skip" /* recontada para o sistema em fechando */;
   prior = ctx.inventory.listMovements({ cycleCountId, itemId, limit 1 }).items[0] /* P-021 */; movement = prior ?? ctx.inventory.createMovement({ type: "ajuste", cycleCountId, … }) /* V1 real: lock do item DENTRO desta tx */;
   if (!movement) throw invalid_item_reference(400); ctx.cycleCounts.stampEntry({…}); await hooks?.beforeUnitCommit?.({ index, itemId }) /* T-03: DENTRO da tx, segurando sessão + item */; })`.
   **Sem** `findItemById` nem acúmulo por chamada (S-02): o total vem do passo 5.
4. **Em qualquer erro do laço** (409/400/503/`not_open`): `abort = repository.abortClose(...)` em tx própria; se `reverted` → a sessão está `aberta` de novo (estado do head-base, limpo);
   se `kept` → fica `fechando` com as unidades aplicadas; em ambos, **o erro original propaga** (mesmo status de hoje); a falha do próprio `abortClose` não engole o erro (log + propaga —
   a sessão fica `fechando` com 0 carimbos, de onde `cancel`, `recordEntry` e `close` continuam possíveis: I11 vale mesmo assim).
5. `fin = repository.finishClose(...)` → `not_open` → 422 · `pending` → 409 `close_incomplete` (defesa; sessão segue `fechando`) · `ok` → `{ cycleCount: fin.session, totalVarianceValue: fin.totalVarianceValue }`.
Provado `[04]`: STUCK_v3 (`reverted`), STUCK_partial_v3 (`kept`, retomada `resumed`), TVV_resume_v3 (−30), TVV_concorrente_v3 (−60 em 5/5, vencedor ora `started` ora `resumed`), v2 `[10-CRASH]`/`[10-LEGACY]` (retomada e P-021 — o mecanismo de unidade não mudou).

**Concorrência de dois `close`:** ambos passam por `beginClose` (o 2º lê `fechando` → `resumed`) e alternam unidades sob o `FOR UPDATE` da sessão; cada unidade relê o carimbo; `finishClose` tem
CAS → **exatamente um 200**, com o total da sessão inteira (`[04]` TVV_concorrente_v3: 5/5); o outro 422. Backstop de banco: índice único `(tenant_id, cycle_count_id, item_id)` (§4).
**Gancho de teste:** `hooks?: { beforeUnitCommit?(unit: { index: number; itemId: string }): Promise<void> }` — só o teste o passa (a rota não); B2 lança na unidade 8 (→ 7 aplicadas), B8/A12
dormem 1,5 s segurando sessão + item (`[07]` LO). O gancho pós-commit `onUnitApplied` do v2 **não existe** (T-03).
### 3.4 `recordEntry` (V7) e `cancel` (V8) — as saídas do `fechando` (S-01) sem reabrir A-01/A-02

- **`recordEntryCount` (Prisma), na mesma tx:** `SELECT status FROM cycle_counts WHERE tenant_id AND id FOR SHARE` → ausente → `not_found`; `concluida|cancelada` → `not_open`;
  **`aberta`** → `updateManyAndReturn({ where: { tenant_id, id: entryId, cycle_count_id } })` (como hoje); **`fechando`** → o mesmo UPDATE **com `adjustment_movement_id: null` no `where`**
  (predicado na própria linha, avaliado sob o `FOR SHARE` da sessão — a unidade que carimba segura `FOR UPDATE`, logo as duas serializam e o predicado é relido na versão nova); 0 linhas →
  relê a entry → existe → `entry_adjusted` (422 `CYCLE_COUNT_INVALID/entry_already_adjusted`), não existe → `not_found`. Provado `[04]` B3_v3 (bloqueia no `FOR SHARE`, relê `concluida`,
  entry intacta), `[07]` E34_recordEntry_carimbada (`entry_adjusted`), E34_recordEntry_naoCarimbada (`ok`; a unidade seguinte aplica o contado final; `coerente: true`). Por que é a saída
  certa para o STUCK: o operador corrige a contagem do item que falhou (ou a iguala ao sistema → variância 0 → a unidade pula) e chama `close` de novo — nenhum movimento fictício.
- **`cancelSession` (Prisma), na mesma tx:** `SELECT status … FOR UPDATE` (bloqueia atrás de qualquer unidade em curso) → `aberta` → CAS `updateManyAndReturn({ where: { …, status: "aberta" } })`;
  **`fechando`** → `count(adjustment_movement_id)` sob o lock → **0** → CAS com `status: "fechando"` (a sessão nunca chegou a aplicar nada — crash antes da 1ª unidade ou `abortClose` que
  falhou) · **> 0** → `close_in_progress` (422 `CYCLE_COUNT_INVALID/close_in_progress`, mensagem: "há N ajuste(s) aplicado(s); reconte as entradas pendentes e conclua o fechamento").
  Nunca subconsulta no `WHERE` do UPDATE (o `EvalPlanQual` reavaliaria a subconsulta com o snapshot antigo — seria o A-02 de volta); a contagem é statement próprio **depois** de
  adquirido o lock. Provado `[07]` E34_cancel (`close_in_progress, stamped 1`; sessão `concluida`, `is_active=true`), `[04]` STUCK_v3 (cancel ok em `aberta` após `reverted`).
- In-memory: mesma máquina de estados, sem lock; os 6 casos HTTP de `inventory-cycle-counts-routes.test.ts` seguem verdes (o 422 continua `CYCLE_COUNT_INVALID`).

### 3.5 V9 `open` — um item em no máximo uma sessão não terminal (N-OVL, I9)

`PrismaCycleCountRepository.createSession`, na tx do wrapper: (1) `SELECT id FROM tenants WHERE id = $1 FOR NO KEY UPDATE` (tagged) — serializa os `open` do tenant; `NO KEY UPDATE` porque
**não conflita com o KEY SHARE** que todo INSERT com FK `tenant_id` toma (medido `[04]` PRE: 70 ms sem bloqueio) e conflita entre `open`s; `tenants` não tem RLS (`relrowsecurity=false`) e o
papel tem `UPDATE` — a linha é sempre a do ator (`input.tenantId`), não uma escolha do cliente; (2) `SELECT DISTINCT e.item_id FROM cycle_count_entries e JOIN cycle_counts c ON c.tenant_id=e.tenant_id
AND c.id=e.cycle_count_id WHERE e.tenant_id=$1 AND c.status IN ('aberta','fechando') AND e.item_id = ANY($2::uuid[])` → linhas > 0 → **lança `itemsInOpenSessionError(n)`** (409
`CYCLE_COUNT_CONFLICT/items_in_open_session`, mensagem com N e sem ids de tenant); (3) `cycleCount.create` + `cycleCountEntry.createMany` como hoje. O serviço (`open:52`) não muda: a
decisão vive no repositório, dentro da tx. In-memory: mesma verificação sobre as sessões em memória. Provado `[07]` OVL_v3: 2º `open` → 409; corrida de 2 `open` × 5 → **1 sessão** (o perdedor
bloqueou no `FOR NO KEY UPDATE` e viu as entries commitadas); `open` após `concluida` → ok. **Não** há verificação no `close`: a propriedade nasce no `open` e as entries nunca são
acrescentadas depois; sessão semeada por SQL cru por cima de outra (B9b) é estado fora do módulo — o teste I7 não assere saldo. Sessões sobrepostas **pré-existentes** ao deploy: o
`open` novo recusa novas; as antigas fecham como hoje (nota na ata, §13).

### 3.6 Porta `InventoryUnitOfWork` — espelho de `src/modules/financial-uow/` (inalterado da v2)
`src/modules/inventory/inventory-uow.ts` (`run<T>(tenantId, work: (ctx: { inventory: InventoryRepository; cycleCounts: CycleCountRepository }) => Promise<T>)`; memória = mutex por
tenant, **sem journal** — emenda 1-e) e `inventory-uow-prisma.ts` (`withTenantRls(prisma, tenantId, tx => work({ inventory: new PrismaInventoryRepository(tx), cycleCounts: new
PrismaCycleCountRepository(tx) }))`). `CycleCountService` recebe a porta como 3º parâmetro; as fábricas (`cycle-count.service.ts:245-281`) a injetam. Uma `run` por **unidade**.

### 3.7 Perdedores por tempo e por deadlock (N-03, emenda 2-m) — inalterado da v2
`P2028`, `40P01` (ORM `DriverAdapterError.cause.code`; raw `P2010.meta.code`), `40001`, `55P03`, `P2034`, `P2024` → `mapTransientDbFailure` nos wrappers `Rls*` e na porta Prisma → 503
`STOCK_UNAVAILABLE/stock_busy` / `CYCLE_COUNT_UNAVAILABLE/cycle_count_busy` (precedente `checklist-prisma.repository.ts:1152-1195`); nada gravado; hoje é 400 cru (v2 `[10-TOK]`).

### 3.8 P2002 nos wrappers — cinto para escritor que não segura o lock (T-02)
`RlsPrismaInventoryRepository.reverseMovement`/`removeExitForSource`/`createExitForSource` envolvem o `withTenantRls` em `try/catch` e mapeiam `isUniqueViolation` → 409
`movement_already_reversed` / `undefined` / releitura da fonte, **fora da tx** (nunca `25P02`). Medido `[07]`: com escritor ORM que respeita a FK, o `23505` é inalcançável sob o lock (o
INSERT alheio toma KEY SHARE e espera o `FOR UPDATE`); com escritor **sem o lock** (SQL cru; linha com `item_id` de outra linha), B bloqueia no INSERT na tupla concorrente do índice e recebe
P2002 → o wrapper responde 409/`undefined`, 1 compensação; head-base: 2. C7/C8 exercitam **esse** escritor (é o único que chega lá).
## 4. Modelagem — UMA migração aditiva fail-closed (M-01), censo somente leitura (N-C6), roteiro com a trava (M-02), drill em base própria (T-04)

### 4.1 `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql` (NOVO) — texto EXATO provado em `[08]`/`[09]`
Timestamp: última é `20260872000000_add_reversal_pair_fk`; `gh pr list --state open` → `[]` no v2 `[08]` — **re-conferir no dia do PR**. Molde: `20260832` + `20260872`.
```sql
-- B-O6R-04a (Ω6R-DAT-002 / DAT-003) — DOIS backstops de banco, para QUALQUER escritor:
--   (1) no máximo UMA compensação por movimento original;  (2) no máximo UM ajuste por (sessão de contagem, item).
-- Aditiva pura: 2 índices parciais únicos; nenhuma coluna, nenhum DROP, nenhum UPDATE/DELETE de dado.
-- FAIL-CLOSED: o censo abaixo ABORTA (zero mutação) se houver duplicata de legado e NUNCA deduplica. A mensagem traz a
-- CONTAGEM REAL de grupos (M-01) e uma amostra de até 20, por id de MOVIMENTO / CONTAGEM / ITEM (nunca tenant_id — §B2.8).
-- Se abortar: a migração fica marcada como falhada em _prisma_migrations e TODO deploy seguinte responde P3009 até
-- `prisma migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops` (M-02; roteiro no plano §4.3).
DO $censo$
DECLARE grupos bigint; amostra text;
BEGIN
  WITH g AS (
    SELECT 'estorno duplicado: original=' || reverses_movement_id::text || ' x' || count(*) AS chave
      FROM stock_movements WHERE reverses_movement_id IS NOT NULL GROUP BY tenant_id, reverses_movement_id HAVING count(*) > 1
    UNION ALL
    SELECT 'ajuste duplicado: contagem=' || cycle_count_id::text || ' item=' || item_id::text || ' x' || count(*)
      FROM stock_movements WHERE cycle_count_id IS NOT NULL GROUP BY tenant_id, cycle_count_id, item_id HAVING count(*) > 1)
  SELECT count(*), (SELECT string_agg(chave, '; ') FROM (SELECT chave FROM g ORDER BY 1 LIMIT 20) s) INTO grupos, amostra FROM g;
  IF grupos > 0 THEN
    RAISE EXCEPTION 'stock_movements: % grupo(s) DUPLICADO(S) de legado (Ω6R-DAT-002/003). Os indices unicos nao podem nascer sobre dado inconsistente; NADA foi mutado; NADA foi deduplicado (qual compensacao vale e decisao humana). Rode scripts/inventory-duplicates-census.sql, consulte P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD e, depois de sanear, `prisma migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops`. Amostra (ate 20 de %): %', grupos, grupos, amostra
      USING ERRCODE = 'raise_exception';
  END IF;
END $censo$;

CREATE UNIQUE INDEX "stock_movements_reversal_active_key"
  ON "stock_movements" ("tenant_id", "reverses_movement_id") WHERE "reverses_movement_id" IS NOT NULL;
CREATE UNIQUE INDEX "stock_movements_cycle_count_item_key"
  ON "stock_movements" ("tenant_id", "cycle_count_id", "item_id") WHERE "cycle_count_id" IS NOT NULL;

-- down (provado em T-C4: up -> down -> re-up em banco descartável, pg_indexes 2 -> 0 -> 2):
--   DROP INDEX IF EXISTS "stock_movements_cycle_count_item_key";
--   DROP INDEX IF EXISTS "stock_movements_reversal_active_key";
```
**Provado `[08]`/`[09]`:** 21 grupos reais (13 + 8) → `P3018`/`P0001` "**21 grupo(s)** … Amostra (ate 20 de 21)"; `pg_indexes` 0; `_prisma_migrations` com a linha `20260873…` e `finished_at NULL`;
limpeza escopada → o bloco `DO` extraído do `.sql` roda **mudo**; re-up em 286 ms; `indexdef` com `WHERE (… IS NOT NULL)`; 2ª compensação por SQL cru → `23505`; drill 2→0→2.
`prisma/schema.prisma:1508`: **manter** o `@@index`; acrescentar só o comentário (índice parcial não é modelável — precedente `stock_movements_source_active_key`, `:1483-1487`).
Nada de Decimal/dinheiro novo; `created_at`/`updated_at` já são `timestamptz`; ledger imutável; `cycle_counts.status` é `TEXT` sem CHECK — `fechando` não exige migração; não se acrescenta CHECK.

### 4.2 `scripts/inventory-duplicates-census.sql` (NOVO, autorizado nominalmente — emenda 2-g) — somente leitura (N-C6)
Mesmas duas consultas do v2 (grupo por `tenant_id` + chave, `array_agg(id ORDER BY created_at)`, e o resumo), com a **linha 1 reescrita**: `-- … SOMENTE LEITURA: o arquivo contém apenas
consultas (SELECT); nada é gravado.` O T-C6 remove comentários (`--…`, `/*…*/`) **antes** de aplicar a regex `\b(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|CREATE|COPY|MERGE)\b` (`[05]`: texto
cru 3 casamentos → sem comentários 0) e executa o arquivo por stdin contra a base com 1 grupo semeado: linhas com `tipo`, `chave_1`, `chave_2`, `linhas`, `movimentos`; contagem antes = depois
(`[09]`: 22 linhas para 21 grupos; 59 = 59).

### 4.3 Roteiro do censo e do deploy — ato do dono (`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD`, §13-1) — com a trava do M-02
1. **Antes do próximo deploy** de staging (`STAGING_DATABASE_URL` — `deploy-staging.yml:44` migra) e de produção (`PROD_DATABASE_URL` — `deploy-production.yml:136`): `psql "$URL" -f
   scripts/inventory-duplicates-census.sql`; guardar a saída fora do repositório. **Aviso do gatilho:** `deploy-staging.yml` dispara em `push: main` com `if: vars.STAGING_DEPLOY_ENABLED == 'true'`
   (hoje `skipped`, `gh variable list` vazio — crítico `[k2]`); no dia em que a variável for ligada, **o merge deste bloco na `main` já é o deploy** — o censo tem de vir antes.
2. N = 0 nas duas → o deploy passa. N > 0 → decisão humana por grupo (qual compensação/ajuste vale; o outro é estornado por movimento compensatório, nunca apagado — ledger imutável).
3. **Se a migração abortar num ambiente** (censo não rodado ou dado novo): `_prisma_migrations` fica com `20260873…` e `finished_at NULL`, e **todo `migrate deploy` seguinte falha com `P3009`
   mesmo depois de sanear o dado** (`[08]`: 3º deploy com dado limpo → `P3009`). Saída, nesta ordem: sanear → `npx prisma migrate resolve --rolled-back
   20260873000000_add_stock_movements_unique_backstops` (contra a mesma `DATABASE_URL`) → `migrate deploy` (`[08]`: 4º deploy aplicado). Enquanto isso, **a fila de `prisma/`** (`03a → SAN3-02 → SAN3-20
   → B-O6R-12 → B-O6R-09`, §6 do SAN3) fica presa nesse ambiente — por isso o censo é a 1ª pendência da ata e o texto da exceção já nomeia o comando.
4. O merge do bloco **não** depende do censo; o deploy, sim. O ato entra na recontagem do `B-SAN3-10` (§4.2 do plano SAN3).

### 4.4 Drill de DDL em base PRÓPRIA (T-04) — `tests/inventory-migration-drill-db.test.ts`
C4 (up→down→re-up) e C5 (censo fail-closed com duplicatas semeadas) fazem `DROP INDEX`/`CREATE UNIQUE INDEX` em `stock_movements`; o DDL pega ACCESS EXCLUSIVE e, na fila atrás de uma tx que
segure a tabela (A2/A14/B3 seguram 1,5–5,5 s), **bloqueia toda leitura e escrita da tabela** — na CI o job roda os arquivos em processos paralelos (`ci.yml:244-246`) → `P2028` nas irmãs (crítico
`[f6]`). Isolação: a suíte deriva o nome `erp_<db>_drill_<random>` da `DATABASE_URL`, faz `CREATE DATABASE` pelo cliente admin, roda `npx prisma migrate deploy` por `execFileSync` com
`DATABASE_URL` apontando para ela (16 s `[02]`; sem `db:seed`), executa C4/C5 lá com um `PrismaClient` próprio e faz `DROP DATABASE … WITH (FORCE)` no teardown. Sem permissão de `CREATE DATABASE`
→ **vermelho, nunca skip** (na CI o usuário é `postgres`; localmente é o dono do cluster). `[09]` DDLISO: DDL na base própria (151 ms) com H segurando `stock_movements` na base das suítes 3,4 s
→ V `createMovement` na base das suítes em **95 ms, sem bloquear**. As demais suítes `-db` do bloco **não fazem DDL** (D9 no T-D reprova `DROP|CREATE INDEX` fora do drill).
## 5. Contrato (rotas, payloads e códigos — forma inalterada; um status novo e três códigos novos; semântica do total explicitada)

| rota / seam | permissão exata | sucesso | recusas |
|---|---|---|---|
| `POST /api/v1/stock-movements` | `stock_movements:create` (`inventory.routes.ts:119`) | 201 | 409 `STOCK_INVALID/insufficient_balance` **decidido sob o lock**; 400 `invalid_item_reference`; 422 `invalid_custody`; 400 `invalid_custody_reference`; **503 `STOCK_UNAVAILABLE/stock_busy`** (contenção > 5 s / deadlock; nada gravado) |
| `POST /api/v1/stock-movements/:movementId/reverse` | `stock_movements:create` (`:129`) | 200 (1 compensação por perna) | 404 cross-tenant; 409 `STOCK_MOVEMENT_CONFLICT/movement_already_reversed` (sob o lock; ou `23505` → 409 pelo wrapper, fora da tx); 409 `transfer_group_inconsistent`; 503 `stock_busy` |
| **`POST /api/v1/cycle-counts`** (open) | `cycle_counts:create` (`cycle-count.routes.ts:49`) | 201 (sessão + entries) | **409 `CYCLE_COUNT_CONFLICT/items_in_open_session`** (N item(ns) já em sessão `aberta|fechando` — I9; mensagem com N, sem ids de tenant); 400 `invalid_abc_class`/notes como hoje; 503 `cycle_count_busy` |
| `POST /api/v1/cycle-counts/:id/close` | `cycle_counts:create` (`:73`) | 200 **exatamente uma vez** por sessão; `totalVarianceValue` = **Σ variance carimbada × avg_cost vigente da sessão inteira** (I10), igual na 1ª chamada, na retomada e no vencedor concorrente; a auditoria `cycle_count.closed` grava o mesmo valor | 422 `invalid_status_transition` (`concluida`/`cancelada`, perdedor concorrente); 404; **erro numa unidade (409/400/503) propaga com o status de hoje e: 0 unidades aplicadas → sessão volta a `aberta`; ≥ 1 aplicada → sessão fica `fechando` (retomável; recontagem das pendentes aceita)**; 409 `close_incomplete` (defesa); 503 `cycle_count_busy` |
| `PATCH /api/v1/cycle-counts/:id/entries/:entryId` | `cycle_counts:create` (`:65`) | 200 em `aberta`; **200 em `fechando` para entry não carimbada** (decidido sob `FOR SHARE` da sessão + predicado na linha) | **422 `CYCLE_COUNT_INVALID/entry_already_adjusted`** (entry carimbada — fechamento em curso/aplicado); 422 `invalid_status_transition` (`concluida`/`cancelada`); 404 |
| `POST /api/v1/cycle-counts/:id/cancel` | `cycle_counts:create` (`:81`) | 200 de `aberta`; **200 de `fechando` com 0 ajustes aplicados** (CAS sob `FOR UPDATE`) | **422 `CYCLE_COUNT_INVALID/close_in_progress`** (`fechando` com ≥ 1 ajuste aplicado — a saída é recontar + `close`); 422 `invalid_status_transition` (`concluida`/`cancelada`); 404 |
| `GET /api/v1/cycle-counts?status=` | `cycle_counts:read` | aceita `aberta`/`fechando`/`concluida`/`cancelada` | 400 `invalid_status` para outro valor |
| seam `createExitForSource` / `removeExitForSource` | nenhuma própria | como no v2 (vencedor sem `25P02`; `undefined` idempotente, inclusive sob `23505`) | 409/422/503 como no v2 |

**Mudanças de contrato (explícitas):** (a) valor novo `fechando`; (b) 503 `stock_busy`/`cycle_count_busy`; (c) `close` retomável, e **falha sem ajuste aplicado devolve `aberta`** (S-01); (d)
`PATCH entry` aceito em `fechando` para entry não carimbada e **422 `entry_already_adjusted`** para carimbada (S-01); (e) `cancel` **422 `close_in_progress`** com ajustes aplicados, aceito em
`fechando` sem ajustes (S-01); (f) **`POST /cycle-counts` 409 `items_in_open_session`** (N-OVL); (g) `totalVarianceValue` = total da sessão inteira (S-02 — hoje a semântica é a mesma, o v2 é
que a quebrava); (h) `transfer_group_inconsistent`. Nenhuma rota, payload ou permissão nova. `API_CONTRACTS.md` (fora do escopo) **não muda**; o registro dos códigos novos vai na ata e na
pendência de UI (§13-3), para o bloco de frontend levar ao contrato. Sem termo técnico em mensagem: "há N ajuste(s) aplicado(s); reconte as entradas pendentes e conclua o fechamento" /
"N item(ns) já estão em uma contagem aberta" / "esta entrada já teve o ajuste aplicado".
## 6. Testes de encerramento — cada caso com vermelho-controle no head-base ou controle embutido (o cenário do crítico, reproduzido)

**Arnês comum das suítes `-db`** (inalterado do v2 §6; padrão `o6r06-usage-atomic-db.test.ts:30-37` + `financial-entry-delete-reverse-race-db.test.ts:1-60`): DB-gated **só** por
`DATABASE_URL` ausente (um `test(nome, { skip })` por arquivo — conta no piso do runner; com `DATABASE_URL` presente nenhuma delas pula, o orçamento `SKIP_BUDGET_DB = 2` é só dos 2 casos RBAC
`[03]`); `CORE_SAAS_PERSISTENCE = "prisma"` antes de qualquer import; admin com `withApplicationName` + `assertApplicationNamePropagated`; **dois papéis efêmeros** (`createEphemeralRole`,
`NOSUPERUSER … NOINHERIT` + `GRANT SELECT, INSERT, UPDATE, DELETE`) com postura asserida por `pg_roles` — falha ao criar = vermelho, nunca skip; os serviços sob teste rodam nos clientes dos papéis;
o admin só semeia, observa `pg_stat_activity` e faz teardown escopado por `tenant_id` em ordem de FK — nunca wildcard. Barreira = `waitForOwnBlockedStatement` por `application_name`
(`pg-barrier.ts:91-113`). `40P01` nunca aceitável. `RACE_N = 10`. "Head-base" = `[04]`/`[07]`/`[09]`/`[10]` (minha execução); o dev reexecuta contra `02bd7dab` (§10 passo 9).
**Emulações embutidas como controle vermelho** (v2 e v1) vivem no arquivo de teste, em SQL cru, e ficam marcadas `// CONTROLE VERMELHO — não é o código do bloco`.

### T-A `tests/inventory-balance-lock-race-db.test.ts` — V1–V5 + I7 + transitório (fecha `Ω6R-DAT-002` + `P-020`) — inalterado do v2, com o gancho de A12 dentro da tx

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| A0 | postura dos 2 papéis; tag; `read committed` | `false/false` ×2; tag; `read committed` | n/a (`[04]` PRE) |
| **A1 [encerramento]** | item BASE=10; 20 saídas de 1 (10 por A + 10 por B, largada comum) × RACE_N | saldo ≥ 0; **exatamente 10** ok + 10 × 409; 0 × `40P01`; 0 × `P2028` | v2 `[10-P1]`: 20 ok, saldo −10 |
| **A2 [barreira]** | admin: tx crua `FOR UPDATE` do item + INSERT −10 sem commit; B `createMovement(−1)`; barreira `fragment: "tenant_id"`; admin commita | 1ª asserção: B → 409 e saldo 0; 2ª: texto bloqueado ∋ `inventory_items` | v2 `[10-P11-hb]`: B commita, saldo −1 (vermelho pela invariante) |
| A3–A6 | `link` ×20; `ajuste −1` ×20; saída de custódia viatura ×20; `createExitForSource` ×20 fontes | saldo ≥ 0; 10/10 | mesma classe de P1 |
| **A7 / A7b** | `reverseMovement` ×2 do mesmo movimento × RACE_N; estorno ×2 de um `link` | **1** compensação (2 para o par), perdedor 409 | v2 `[10-P3]`: 2 |
| **A8** | `removeExitForSource` ×2 da mesma fonte × RACE_N | 1; perdedor `undefined` | v2 `[10-P5]`: 2 |
| **A9** | entrada 10@3 ×2 sobre 10@1 | `avg_cost = 2.333333` | v2 `[10-P7]`: 2,0 |
| **A10** | `createExitForSource` ×2 MESMA fonte × RACE_N | mesmo `id`; 0 × `25P02` | v2 `[10-P9]`: `25P02` 10/10 |
| A11 | saída no item de T2 sob contexto de T1 | `undefined` (→ 400); 0 linhas em T2 | n/a |
| **A12 [I7 × open/abc]** | `close` v3 com `beforeUnitCommit` segurando sessão + X 1,5 s **dentro da tx**; B: `open()` real e, noutra rodada, `recalculateAbc()` real | B **bloqueia** (texto ∋ `cycle_count_entries` / `abc_class`) e conclui; 0 × `40P01` | controle vermelho em B8(i) |
| A13 | forma (saída simples; acima do saldo) | movimento; 409 com saldo | regressão |
| **A14 [transitório → 503]** | admin segura `FOR UPDATE` 5,5 s; B `createMovement`; + `mapTransientDbFailure` com os 3 formatos | 503 `stock_busy`, nada gravado | v2 `[10-TOK]`: `P2028` cru (400) |

### T-B `tests/inventory-cycle-count-close-units-db.test.ts` — V6/V7/V8/V9 (fecha `Ω6R-DAT-003`; S-01, S-02, T-01, T-03, N-OVL)

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| B0 | postura + `read committed` + tag | como A0 | n/a |
| **B1 [encerramento]** | sessão 1 item (10 → 7); `close` ×2 (A e B) × RACE_N | 1 × 200 + 1 × 422; **1** ajuste; saldo 7; 0 dup | v2 `[10-P6]`: 2 × 200, 2 ajustes |
| **B2 [retomável]** | 20 itens; `close` com `beforeUnitCommit` lançando na unidade 8 (→ 7 aplicadas) | `fechando`, 7 ajustes, 7 carimbos; `cancel` → 422 `close_in_progress`; `recordEntry` de carimbada → 422; `close` por B → `concluida`, 20 ajustes, 0 dup, **total = Σ 20** | classe P-021 (head-base: `aberta` + `cancel` liberado) |
| **B3 [recordEntry × fechamento] (T-01)** | admin: tx crua `FOR UPDATE` sessão + CAS `fechando` + ajuste + carimbo + `concluida`, sem commit; B: `recordEntry` real (contado 5); barreira **`fragment: "tenant_id"`**; admin commita | **1ª asserção:** entry final `contado 7 / variance −3` e B → 422; **2ª (só desenho):** texto bloqueado ∋ `cycle_counts` | `[04]` B3_headbase: barreira casou; B gravou `contado 5` → vermelho **pela invariante** |
| **B4 [cancel × fechamento aplicado]** | idem com B = `cancel` real | B → 422 `close_in_progress`; sessão `concluida`, `is_active=true` | v2 `[10-E4-hb]`: `cancelada` + ajuste no ledger |
| B5 [estado `fechando`] | sessão em `fechando` com carimbos (B2); `recordEntry` carimbada, `cancel`, `close` da instância antiga | 422 / 422 / `close` retoma | regressão |
| B6 [cross-tenant] | `close`/`cancel`/`recordEntry`/`open` sob T1 contra T2 | 404; 0 linhas em T2 | n/a |
| B7 [legado P-021] | `aberta` com 1 ajuste pré-gravado por SQL cru; `close` | reaproveita; 1 ajuste; 200; **total inclui o reaproveitado** | v2 `[10-LEGACY]` |
| **B8 [I7 — controle embutido] (T-03)** | (i) **controle**: emulação v1 em SQL cru (sessão + X + Y `FOR UPDATE`, hold 1,5 s) × `open()` real e × `recalculateAbc()` real → `40P01`; (ii) **código real** com `beforeUnitCommit` segurando sessão + X 1,5 s **dentro da tx** × os dois | (i) `40P01` observado; (ii) **B bloqueia** (`waitForOwnBlockedStatement` casa `cycle_count_entries` / `inventory_items`), 0 × `40P01`, ambos concluem | `[07]` LO_*_v1ctrl = (i); LO_*_v3 = (ii) |
| **B9 [N-OVL — um item, uma sessão]** | item 100; `open()` real ×2 concorrentes (largada comum) × RACE_N | **exatamente 1** sessão + 1 × 409 `items_in_open_session`; contar 99 e fechar → saldo **99** | `[07]` OVL_headbase: 2 sessões, saldo **98** |
| B9b [I7 — sessões cruzadas] | `[X,Y]` e `[Y,X]` **semeadas por SQL cru** (o `open` recusa; estado só alcançável fora do módulo), fechadas em paralelo, hold 300 ms por item | as duas `concluida`, 0 × `40P01`, 0 dup por sessão — **sem asserção de saldo** (o valor 98 não é resultado esperado de negócio) | v2 `[10-V6V6]` (só concorrência) |
| B10 [tamanho] | N=250; `close` | `concluida`, 250 ajustes/carimbos, 0 dup; **total = −3 × avg × 250**; duração e p95 logados | `[10]` (v3 literal conclui em todo N) |
| **B11 [S-01 parcial]** | X (10→7) aplicado; Y com BASE 4 + viatura 6, contado 2 → 409 | 409; `fechando`, 1 carimbo; **recontar Y (não carimbada) → 200; recontar X → 422 `entry_already_adjusted`; `cancel` → 422 `close_in_progress`; `close` → `concluida`, 2 ajustes, total −5** | `[04]` STUCK_partial_v3; emulação v2 embutida: 422 na recontagem |
| B12 [listagem] | `GET ?status=fechando` (memória e Prisma) | 200 | head-base: 400 `invalid_status` |
| **B13 [S-01 — cenário STUCK do crítico]** | BASE 4 + viatura 6; `open()` real (system 10); contado 2; `close` → 409 | **sessão `aberta`**, 0 ajustes; `recordEntry` → 200; `cancel` → 200; e (2ª sessão) recontar 8 → `close` → `concluida`, −2, saldo BASE 2 | `[04]` STUCK_v2 embutida: `fechando`, `not_open` ×2, presa |
| **B14 [S-02 — TVV_resume]** | 5 itens **avg 2**, 3º com BASE 1 → 409; entrada +9; `close` de novo | 200 com **`totalVarianceValue = −30`**; auditoria (`recordRequestAuditBestEffort` observada via o repositório de auditoria em memória do arnês, ou pela rota em B12′) com −30 | `[04]` v2 embutida: −18 |
| **B15 [S-02 — TVV_concorrente]** | 10 itens avg 2; `close` ×2 intercalados (`beforeUnitCommit` dormindo 25 ms) × RACE_N | o único 200 traz **−60** em RACE_N/RACE_N; ledger 10 ajustes, 0 dup | `[04]` v2 embutida: −48/−30 |
| **B16 [recontagem em `fechando` × unidade]** | A = `close` segurando X; B = `recordEntry` de Y (não carimbada) | B bloqueia no `FOR SHARE`, depois 200; a unidade de Y aplica o contado final; `variance = contado − sistema` em toda entry | `[07]` E34_recordEntry_naoCarimbada |
| **B17 [cancel em `fechando` sem carimbos]** | sessão levada a `fechando` por SQL cru (crash antes da 1ª unidade); `cancel` | 200, `cancelada`; e com 1 carimbo semeado → 422 `close_in_progress` | regressão de estado |

### T-C `tests/inventory-unique-backstops-db.test.ts` — backstops de banco + censo + mapeamento P2002 (base compartilhada; **sem DDL**)

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| C1 | SQL cru: 2 INSERTs com o mesmo `reverses_movement_id` | 2º → `23505` nomeando `stock_movements_reversal_active_key` | v2 `[10-P3]`: coexistem |
| C2 | SQL cru: 2 INSERTs com o mesmo `(cycle_count_id, item_id)` | 2º → `23505` nomeando `stock_movements_cycle_count_item_key` | v2 `[10-P6]`: coexistem |
| C3 | N INSERTs com `reverses_movement_id`/`cycle_count_id` NULL | todos aceitos | regressão |
| C6 [script do censo] (N-C6) | ler `scripts/inventory-duplicates-census.sql`; **remover comentários**; regex fail-closed; executar por stdin/`$queryRawUnsafe` contra a base com 1 grupo semeado | 0 casamentos; linhas com `tipo`, `chave_1`, `chave_2`, `linhas`, `movimentos`; contagem antes = depois | `[05]`/`[09]`; texto cru com comentário → 3 (o que o T-C6 do v2 fazia) |
| **C7 [mapeamento V3] (T-02)** | admin: INSERT cru da compensação de `m` com `item_id` de OUTRO item (escritor sem o lock), **não commitado**; B: `reverseMovement(m)` real pelo papel; barreira (B bloqueado em `INSERT … stock_movements`); admin commita | B → 409 `movement_already_reversed`, sem `25P02`, tx de B desfeita; **1** compensação | `[07]` C7_headbase: B não bloqueia; **2** compensações |
| **C8 [mapeamento V5] (T-02)** | idem para a saída de uma fonte; B: `removeExitForSource` real | `undefined`, sem `25P02`; 1 compensação | `[07]` C8_headbase: 2 |

### T-C′ `tests/inventory-migration-drill-db.test.ts` — drill de DDL em base PRÓPRIA (T-04, M-01); serial; um `test()` por caso

| caso | forma | verde | vermelho-controle |
|---|---|---|---|
| C4′ [base própria + up→down→re-up] | `CREATE DATABASE` + `prisma migrate deploy` (child process, `DATABASE_URL` da base nova); `DROP INDEX` ×2 **extraídos por regex do rodapé do `.sql`** → C1/C2 viram aceitos → `CREATE UNIQUE INDEX` ×2 extraídos → `23505`; `pg_indexes` 2→0→2; `DROP DATABASE … WITH (FORCE)` no teardown | as três medições; sem `CREATE DATABASE` → **vermelho** | `[09]` drill 2→0→2 (re-up 286 ms) |
| **C5′ [censo fail-closed com contagem real] (M-01)** | índices derrubados; semear **21 grupos** (13 estornos + 8 ajustes, 2 tenants) por SQL cru; executar o bloco `DO $censo$` extraído do `.sql` | `P0001` com "**21 grupo(s)**", "Amostra (ate 20 de 21)", cita `P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` e `migrate resolve --rolled-back`, **sem `tenant_id`** no texto; limpar por `tenant_id` → `DO` mudo; re-up | `[08]`/`[09]`: 21; migração v2 dizia "20" |

### T-D `tests/inventory-write-paths-guard.test.ts` — memória; CE-G1 (enumeração fail-closed gerada do fonte; default negar)

| caso | forma (enumeração gerada do código real) | verde | mutação que o deixa vermelho |
|---|---|---|---|
| **D1 (D-01)** | varre `src/**/*.ts`, `prisma/**/*.ts`, `scripts/**/*.{ts,mts,mjs,cjs,sql}`: **todo `stockMovement.<m>(` cuja `m` ∉ {`findMany`,`findFirst`,`findUnique`,`findFirstOrThrow`,`findUniqueOrThrow`,`count`,`aggregate`,`groupBy`} é escritor**; SQL cru `/i`: `(insert\s+into|update|delete\s+from|truncate|copy|merge\s+into)\s+("?public"?\s*\.\s*)?"?stock_movements"?`; allowlist literal `{ inventory-prisma.repository.ts: { method: "insertMovement", count: 1 }, prisma/seed-fleet.ts: "semente" }`; publica o universo | universo = allowlist | qualquer uma das 4 grafias do crítico em arquivo novo → vermelho (`[05]`) |
| **D2 (D-02)** | isola `PrismaInventoryRepository`; para cada método cujo corpo contém `this.insertMovement(` ou `avg_cost:`: exatamente 1 `this.lockItemForUpdate(`; **antes** da 1ª ocorrência de padrão de DECISÃO (`saldoOf\w*|hasReversalOf\w*|isExitReversed\w*|movementsInGroup\w*|aggregate\(|wouldOverdraw\(|computeMovingAverage\(|avg_cost`); antes de qualquer `for (`/`while (`/`.map(`/`.forEach(`; leituras de **identificação** (`findMovementById(`, `findExitBySource(`) permitidas antes; **e o arquivo não declara** `saldoOf(`/`saldoOfCustody(`/`hasReversalOf(`/`isExitReversed(`/`movementsInGroup(` sem sufixo `Locked` | universo ⊇ {V1..V5}, todos conformes | 5 mutações do `[05]` (lock no laço; `aggregate` antes; 2 locks; sem lock; versão sem lock) |
| D3 [token] | assinaturas de `insertMovement` e das leituras `*Locked` contêm `ItemWriteLock` | sim | remover o parâmetro |
| **D4 [V6 só por unidades]** | em `close`: `.createMovement(`/`.stampEntry(` só dentro de `uow.run(`; `beginClose(`/`finishClose(`/`abortClose(` fora; `applyClose` não existe; **`findItemById(` não aparece em `close`** (S-02: o total vem do `finishClose`); o `catch` do laço chama `abortClose(` (S-01) | sim | laço num `uow.run` único; `applyClose`; acumular `avgCost` no laço; remover o `abortClose` |
| **D5 [toda transição de status é CAS]** | em `cycle-count-prisma.repository.ts`, todo `cycleCount.update*(`/`UPDATE cycle_counts` tem `status:` no `where` | universo = {`beginClose`, `finishClose`, `abortClose`, `cancelSession`} (4) | `updateMany` de status sem `status` no `where` |
| D6 [P2002 fora da tx] | nenhum método de `PrismaInventoryRepository` que chame `insertMovement` contém `isUniqueViolation(`; os wrappers `Rls*` de V3/V4/V5 contêm | sim | `catch` de volta na tx |
| D7 [503 em todo wrapper] | métodos públicos de `RlsPrisma*Repository` e `PrismaInventoryUnitOfWork.run` passam por `mapTransientDbFailure(` | contagem = contagem | wrapper novo sem o mapeamento |
| **D8 [open serializado] (N-OVL)** | o único `cycleCount.create(` (D5 universo) está em `createSession`, cujo corpo contém `FROM "tenants"` + `FOR NO KEY UPDATE` **antes** do `create(` e a consulta de sobreposição (`status IN` + `item_id = ANY`) | sim | remover o lock; trocar por `FOR UPDATE` (conflitaria com KEY SHARE — R16); `create(` antes da consulta |
| D9 [sem DDL fora do drill] | `tests/inventory-*-db.test.ts` exceto `inventory-migration-drill-db` não contêm `DROP INDEX`/`CREATE (UNIQUE )?INDEX`/`ALTER TABLE` | sim | mover C4′ para T-C |

**Contagem prevista:** T-A 16 (A0–A14 + A7b) · T-B 20 (B0–B17 + B9b + B12) · T-C 6 (C1–C3, C6–C8) · T-C′ 2 · T-D 9 = **53 casos novos**, todos com execução real; os 67 de memória
(v2 `[03]`) permanecem 67. **Cada mutação de T-D é executada UMA vez pelo dev** (ata: caso → mutação → linha vermelha → revert). Gancho de teste: `hooks?: { beforeUnitCommit?(unit) }` em
`CycleCountService.close` — dentro da tx; só o teste o passa.
## 7. CE-G1 e CE-G2 (§5.6 do `docs/revisoes/SAN3/PLANO_SAN3.md` `[03]`)

**CE-G1 — enumeração fail-closed.** Guards citados no teste de encerramento: T-D (D1, D2, D4, D5, D7, D8, D9) e o censo da migração (§4.1). (a) **Fonte da enumeração, gerada por script
do código real:** D1 varre `src/**`, `prisma/**`, `scripts/**` pelo padrão de escrita em `stock_movements` — **pela propriedade** (membro fora da allowlist de leitura; SQL cru em qualquer
grafia, `/i`), nunca lista curada; universo medido hoje `{ inventory-prisma.repository.ts:436 (insertMovement), prisma/seed-fleet.ts:171-173 }` `[03]`, publicado na mensagem de sucesso;
D2 enumera os métodos do repositório pelo corpo (quem chega a `insertMovement`/`avg_cost`) e classifica cada leitura como identificação ou decisão; D5 enumera as transições de
`cycle_counts.status` pelo fonte (4); D7 os wrappers por assinatura; D8 o único `cycleCount.create(`; D9 as suítes `-db` do bloco; o censo enumera os grupos duplicados pelo dado real
com a contagem completa. (b) **Default do membro não previsto: negar** — membro novo de `stockMovement.` não listado como leitura é escritor e reprova D1; método novo que chegue a
`insertMovement` sem `lockItemForUpdate` (ou com dois, ou com decisão antes) reprova D2 e o compilador nega antes (`ItemWriteLock`); transição sem precondição reprova D5; wrapper sem
mapeamento reprova D7; `createSession` sem o lock do tenant ou sem a consulta de sobreposição reprova D8; DDL em suíte irmã reprova D9; duplicata de legado aborta a migração com a
contagem real (nunca deduplica). (c) **Mutação que deixa o guard vermelho** (uma por guard, executada e registrada na ata): as 4 grafias do crítico (D1 — `[05]`); as 5 mutações de D2
(`[05]`); remover o token (D3); laço num `uow.run` único / `applyClose` / acumular `avgCost` no laço / remover `abortClose` (D4); `updateMany` de status sem `status` no `where` (D5);
`catch` de P2002 dentro da tx (D6); wrapper novo sem `mapTransientDbFailure` (D7); `createSession` sem `FOR NO KEY UPDATE` ou com `create(` antes da consulta (D8); `DROP INDEX` em T-C (D9);
no censo, o bloco `DO` extraído do `.sql` mudo sem duplicata e `P0001` com "21 grupo(s)" com 21 (C5′ — `[08]`/`[09]`).

**CE-G2 — papel × passo.** Nenhum caso `-db` atravessa uma rota: lock e CAS vivem abaixo da permissão e o ator passado ao serviço é `{ tenantId, userId, roles: [], permissions: [] }`
(o `CycleCountService` não importa `requirePermission`; a comparação é só nas rotas — v2 `[04]`, código inalterado). B12 (listagem `?status=fechando`) e as regressões em memória
(`inventory-cycle-counts-routes.test.ts:194-231`) atravessam rotas com papéis de APLICAÇÃO: `manager` tem `stock_movements:create` (`catalog.ts:534`) e `cycle_counts:create` (`:537`);
`operator` (`:775/:778`) e `inventory` (`:882/:885`) idem; `cycle_counts:read` para o GET; a rota compara **exatamente** `stock_movements:create` (`inventory.routes.ts:119,129`) e
`cycle_counts:create`/`:read` (`cycle-count.routes.ts:41,49,57,65,73,81`). Papel de **BANCO** nos drills: efêmero `NOSUPERUSER`, `rolbypassrls=false` (asserido por `pg_roles` `[04]`), com
`GRANT SELECT, INSERT, UPDATE, DELETE` — `FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` exigem `UPDATE`/`SELECT` e os têm; **`tenants` não tem RLS** (`relrowsecurity=false` `[04]`): o lock
da linha do tenant devolve 1 linha em qualquer contexto, e por isso a linha travada é sempre a do ator (`input.tenantId`), nunca um parâmetro do cliente; as policies das outras 4
tabelas valem para ALL — provado por execução (v2 `[10-PRE]`: 1/0/0 com contexto / sem / outro tenant). O drill de DDL (T-C′) roda como o dono do cluster (`CREATE DATABASE`), declarado.
## 8. Escopo permitido e proibido — arquivo a arquivo (carrega as emendas 1-a/b/c, 2-g/l e 3 dentro de si)

**PERMITIDO (e só isto):**
- `src/modules/inventory/inventory-prisma.repository.ts` — `lockItemForUpdate`, `ItemWriteLock`, leituras `*Locked` (**e a remoção das versões sem lock que decidem** — D-02), V1–V5,
  `mapTransientDbFailure` (+ uso em todo wrapper `Rls*`), mapeamento de P2002 nos wrappers de V3/V4/V5 (fora da tx).
- `src/modules/inventory/inventory.types.ts` — **só** `transferGroupInconsistentError()` (409) e `stockBusyError()` (503).
- `src/modules/inventory/cycle-count.types.ts` — `CYCLE_COUNT_STATUSES` += `"fechando"`; tipos `BeginCloseOutcome`, `RecordEntryOutcome`, `CancelOutcome`, `FinishCloseOutcome`,
  `AbortCloseOutcome`, `StampEntryInput`; `cycleCountBusyError()` (503); `closeIncompleteError()` (409); **`entryAlreadyAdjustedError()` (422), `closeInProgressError(n)` (422),
  `itemsInOpenSessionError(n)` (409)** — mensagens em PT-BR de negócio (§5).
- `src/modules/inventory/cycle-count.repository.ts` — interface (`beginClose`, `lockSessionForUpdate`, `findEntry`, `stampEntry`, **`abortClose`**, `finishClose` com `totalVarianceValue`,
  `recordEntryCount`/`cancelSession` com outcome; `createSession` recusando sobreposição; **sem** `applyClose`) + in-memory com a mesma máquina de estados e o resolvedor `avgCostOf`.
- `src/modules/inventory/cycle-count-prisma.repository.ts` — os métodos acima (`FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` tagged; CAS por `status` no `where`; SQL do total; consulta de
  sobreposição); wrapper `Rls*` com `mapTransientDbFailure`.
- `src/modules/inventory/cycle-count.service.ts` — `close` por unidades (porta + `hooks.beforeUnitCommit` + `abortClose` no `catch`), `recordEntry`/`cancel` mapeando outcomes; construtor com a
  porta; fábricas (`:245-281`, a de memória injeta `avgCostOf`).
- `src/modules/inventory/cycle-count.validators.ts` — tocar **só** se o dev medir que `parseOptionalStatus` não lê `CYCLE_COUNT_STATUSES` (`:59-64` lê).
- `src/modules/inventory/inventory-uow.ts` (NOVO) · `src/modules/inventory/inventory-uow-prisma.ts` (NOVO) · `src/modules/inventory/index.ts` (export, se preciso).
- `prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql` (NOVO; texto do §4.1) · `prisma/schema.prisma` (**só comentário** junto da l.1508).
- `scripts/inventory-duplicates-census.sql` (NOVO; somente leitura; linha 1 do §4.2).
- `tests/inventory-balance-lock-race-db.test.ts` · `tests/inventory-cycle-count-close-units-db.test.ts` · `tests/inventory-unique-backstops-db.test.ts` ·
  **`tests/inventory-migration-drill-db.test.ts`** · `tests/inventory-write-paths-guard.test.ts` (NOVOS).
- `.github/workflows/ci.yml` — **só** as **4** linhas `SUITES="$SUITES tests/<suíte -db>.test.ts"` + 1 bloco de comentário no formato das vizinhas, **depois da l.249**
  (`tests/financial-entry-delete-reverse-race-db.test.ts`) e **antes da l.250** (`node --test --import tsx $SUITES`) `[03]`; a `P-O6R-B04-SUITES-LIST-CI` **não nasce** (emenda 1-c).
- `docs/revisoes/O6R/achados.jsonl` — **só** as 2 linhas `Ω6R-DAT-002` e `Ω6R-DAT-003`: `"status": "fechado"`, `"fechado_por": "B-O6R-04a (PR na autoria; nº e hash no backfill pós-merge — §C3.5)"`,
  `"fechado_em"`, `"evidencia_fechamento"` (forma do #385 `[06]`), e **no DAT-003 o campo novo `"nota_criterio"`** (A-DAT; texto do `[06]`) — `correcao`/`teste` originais intactos.
- `docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md` — **só** as 2 seções `### [Ω6R-DAT-002]`/`### [Ω6R-DAT-003]`: linha `- Status: **fechado** em <data> pelo \`B-O6R-04a\` (PR na autoria; …)` +
  parágrafo do conserto; no DAT-003, a linha `- Nota de critério (§A2): …` (`[06]`).
- `agent-orchestration/**` · `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` (só o fallback via `kpi-freeze.mjs`), `Kpis/index.html` se a hidratação
  exigir. Em `kpis-latest.json` (K-01): `production_readiness.p0_fechados` **fica 13**, `fechados` **inalterado**, **`aguardando_merge = [{id: Ω6R-DAT-002}, {id: Ω6R-DAT-003}]`** e
  `nota_aguardando` no texto do `[06]`; **`findings.itens[DAT-002/003].status = "fechado"`**; `roadmap.blocos[B-O6R-04].estado = "parcial"` (QUA-002 segue `ativo`).

**PROIBIDO (o dev reporta, não decide — rito 3):** `src/modules/inventory/inventory.service.ts`, `inventory.repository.ts` (in-memory de estoque — o resolvedor `avgCostOf` consome
`findItemById` existente), `inventory.routes.ts`, `inventory.controller.ts`, `cycle-count.routes.ts`, `cycle-count.controller.ts` (a auditoria já grava `report.totalVarianceValue`),
`inventory.calculations.ts`, `inventory.abc.ts`; `src/modules/mobile/**` (04b), `src/modules/fuel-logs/**`, `src/modules/maintenance-orders/**`, `src/modules/checklists/**`,
`src/database/**` (o `withTenantRls` NÃO ganha opções; timeout NÃO sobe — emenda 2-h), `src/modules/core-saas/**` (`sendRouteError` não muda), `tests/helpers/**` (só consumo), `frontend/**`,
`mobile/**`, `API_CONTRACTS.md`, `RBAC_MATRIX.md`, `.env`, lockfiles, qualquer outra migração, qualquer outra linha de `.github/workflows/**` e de `docs/**`. Migração destrutiva = parada
irredutível (§C7.5). **Nenhuma coluna nova** (o total é derivado; o "item em sessão aberta" é consulta, não coluna).
## 9. Baseline N · meta M ≥ 2N · KPI no PR (K-01, A-DAT)

**N medido (v2 `[03]`, código inalterado no HEAD):** as 7 suítes de estoque em memória = **67/67** (0 fail, 0 skip); suítes `-db` que exercem o ledger de estoque = **0**. Valor oficial de
`backend_tests` = **2995/2997** (`Kpis/kpis-latest.json`, release `pr 385`; os 2 skips são os do orçamento `SKIP_BUDGET_DB = 2` `[03]`); `blocks_completed` = 163; history com 158 entradas.

**Meta M:** N sob Postgres é 0 → a meta vira piso absoluto: **≥ 50 casos `-db`/guard novos** (§6 prevê 53), **≥ 2 casos por via** das 9 do mapa (V1: A1,A2,A4,A5,A9,A13,A14 · V2: A3,A7b · V3:
A7,A7b,C7 · V4: A6,A10 · V5: A8,C8 · V6: B1,B2,B8,B10,B11,B13–B15 · V7: B3,B5,B16 · V8: B4,B5,B17 · **V9: B9,B6**), **67 → 67** em memória sem morte, e `backend_tests` **≥ 3048/3050** na forma
canônica 3 (`DATABASE_URL` presente: 2997 + 53; os 2 skips permanecem). Sem `DATABASE_URL` (forma 1): +9 pass (T-D) e +4 skips declarados (um por arquivo `-db`).

**KPI no PR (§C3):** `backend_tests` com N e forma do §10 passo 3 (nota com o passo 4 e a tripla execução); `blocks_completed` 163 → 164; `status: published_per_pr`; `pr` após `gh pr create`;
`merge_commit`/`approved_head` `null` na autoria. **`production_readiness` (K-01, forma exata do #385 `[06]`):** `p0_fechados` **13** (só na main conta), `fechados` **inalterado**,
`deploy_bloqueado: true`, **`aguardando_merge: [{ "id": "Ω6R-DAT-002" }, { "id": "Ω6R-DAT-003" }]`**, `nota_aguardando`: "Ω6R-DAT-002 e Ω6R-DAT-003 estao `fechado` no registro NA AUTORIA do
B-O6R-04a (§C3.5: numero de PR e hash so existem pos-merge). Eles NAO entram em `p0_fechados` nem na lista `fechados` — o painel conta so o que esta na `main`, e e por isso que
`p0_fechados` permanece 13. Texto anterior, preservado: <texto de hoje>"; **`findings.itens[].status = "fechado"`** para os dois; `roadmap.blocos[B-O6R-04].estado = "parcial"`.
**Medido `[06]`:** espelho com exatamente essas edições → `kpi-achados-paridade` **6/6**; sem `aguardando_merge` → `# fail 1` (a classe do K-01).
**A-DAT (emenda 3-q):** o DAT-003 fecha contra **vencedor único (B1) · nenhuma unidade aplicada duas vezes (B1, B2, B15, C2) · retomada que conclui (B2, B11, B14) · total correto da sessão
inteira (B14, B15)**; o campo `nota_criterio` (JSONL) e a linha "Nota de critério (§A2)" (REGISTRO) registram que o `teste` original ("rollback integral") pressupunha transação única,
substituída pela emenda 2-h — o texto original **não é reescrito**; o guard aceita o campo extra (`[06]`).
**Se este for o primeiro PR de execução a mergear depois do #386**, carrega as dívidas do #386 (emenda 1-f: hoje no `B-SAN3-04a`; o orquestrador as acrescenta — o dev não decide). A visão
gráfica hidrata dos JSON — nada cravado em `app.js` (`kpi-freeze.mjs --check` verde).
## 10. Bateria de validação (forma exata, N esperado, `ec` lido do processo)

1. `DATABASE_URL=postgresql://x npm run db:generate && npm run check` → ec 0 (token `ItemWriteLock`, outcomes, `fechando`, ausência das leituras sem lock).
2. `npm run lint` → ec 0.
3. `npm test` (`CORE_SAAS_PERSISTENCE` não exportado; `DATABASE_URL` do cluster descartável exportado = forma canônica 3) → **≥ 3048 pass · 0 fail · 2 skipped**; a linha "modo resolvido" do runner colada na ata.
4. `DATABASE_URL=<descartável> CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/inventory-balance-lock-race-db.test.ts tests/inventory-cycle-count-close-units-db.test.ts
   tests/inventory-unique-backstops-db.test.ts tests/inventory-migration-drill-db.test.ts` → **44 pass · 0 fail · 0 skip**, **3 execuções idênticas com o banco RECRIADO antes de cada**
   (`DROP DATABASE … WITH (FORCE)` + `CREATE DATABASE` + `prisma migrate deploy`); a 3ª execução **com as 4 suítes em paralelo** (`node --test` default) — é a forma da CI e o que T-04 protege.
5. `node --test --import tsx tests/inventory-write-paths-guard.test.ts` → 9/9; depois **cada mutação de T-D (D1–D9) executada e revertida** (saída vermelha na ata; `git diff --stat` vazio ao fim).
6. Regressão focada: as 7 suítes de estoque → 67/67; `tests/financial-*-db.test.ts`, `tests/o6r06-*-db.test.ts`, `tests/pg-barrier-scoped-db.test.ts`, `tests/checklist-run-*-db.test.ts`
   contra o mesmo cluster → inalteradas.
7. `npm run build` → ec 0 · `node --check Kpis/app.js` · `node scripts/kpi-freeze.mjs --check` · `node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts`
   → verdes (**6/6** no de paridade, com `aguardando_merge` preenchido — K-01) · `git diff --check`.
8. Migração: `prisma migrate deploy` no descartável → `pg_indexes` = 2 linhas com os `WHERE (... IS NOT NULL)`; **drill do M-02 no descartável** (semear 21 grupos por SQL cru → `migrate deploy`
   → `P3018/P0001` com "21 grupo(s)" → 2º deploy `P3009` → limpar → 3º deploy `P3009` → `migrate resolve --rolled-back 20260873…` → 4º deploy aplicado), colado na ata; `psql -f
   scripts/inventory-duplicates-census.sql` → 0 linhas (N publicado **com a ressalva** de que o N que importa é o de staging/produção — ato do dono, §13-1).
9. **Vermelho-controle no head-base, executado:** worktree descartável em `02bd7dab` (`git worktree add`, **`npm ci` próprio** — junction proibida), copiar só as 5 suítes novas, cluster
   recriado, passos 4–5 → esperado vermelho em A1, A2, A7, A8, A9, A10, A12, A14, B1, B2, B3 (**pela invariante: entry final `contado 5`**), B4, B9 (2 sessões), B11, B12, B13 (v2 embutida
   é o controle; head-base fica `aberta` — o caso assere também "recontagem aceita e cancel aceito", que o head-base cumpre: B13 é verde no head-base **de propósito**, e vermelho na emulação
   v2 embutida), B14 (v2 embutida −18), B15 (v2 embutida), B16, B17, C1, C2, C4′, C5′, C7, C8 e no guard D1–D9; colar `# pass/# fail` na ata; `git worktree remove --force`.
10. Sizing (emenda 2-h, N-E5), registrado na ata pelo dev **com o código REAL**: `close` de N = 250 / 500 / 1000 / 10 000 itens divergentes no descartável, com duração total, média, p95 e
    máx por unidade, `totalVarianceValue` = −3 × avg × N, e o head-base como controle nos mesmos N (script no scratchpad da ata; **não** vira teste de CI acima de 250). A máquina deve estar
    **sem outros clusters ativos** (os meus números `[10]` saíram com um cluster de jurado alheio de pé e são ruidosos).
11. CI: os 4 arquivos `-db` na lista `SUITES` do job `backend-postgres` e o guard "Fail on skipped tests" verde (0 pulos).
12. Limpeza §C5: `docker rm -f <cluster do bloco>`, worktree descartável removido, `dist/`, `coverage/`, `*.tsbuildinfo` — em 1 linha.
## 11. Riscos · rollback

| # | risco | mitigação / prova |
|---|---|---|
| R1 | o lock do item serializa todas as custódias do mesmo item | tx curtas; v2 `[10-V1]` 20 saídas em 127–152 ms; A1 publica o tempo |
| R2 | perdedor esperando o lock estoura o timeout (`P2028`) | timeout global intacto (emenda 2-h); unidades ≈ 20–30 ms em N=10 000 `[10]`; A1/B1 asserem 0 × `P2028`; quando ocorrer, **503** com nada gravado (A14) |
| R3 | o censo da migração ABORTA o deploy e **trava a fila até `migrate resolve`** (M-02) | fail-closed por desenho; a exceção nomeia o comando; roteiro §4.3 com a sequência provada `[08]`; ato do dono antes do deploy; aviso do gatilho do staging |
| R4 | `FOR UPDATE` bloqueia `updateItem`/`applyAbcClasses`/`open` do mesmo item por instantes | aceito; `[07]` LO: B bloqueia e conclui após o commit |
| R5 | deadlock V6 × V1–V5 / open / abc / V6 × V6 / open × open | I7 v3 (§3.2); `[07]` LO 0 × `40P01`, controle `40P01`; `[04]` PRE: lock do tenant × KEY SHARE não conflita; B8/B9/B9b/A12 |
| R6 | fechamento grande demora e o cliente HTTP desiste | `fechando` retomável (v2 `[10-CRASH]`); `close` de novo continua; o total do 200 é sempre da sessão inteira (S-02) |
| **R7 (v3)** | sessão em `fechando` por 409 recorrente | **não existe mais o beco**: 0 carimbos → `aberta` (`abortClose`); com carimbos → recontar as pendentes (aceito em `fechando`) e retomar; `cancel` recusado só quando há ajuste aplicado, com mensagem que nomeia a saída — `[04]` STUCK_v3, STUCK_partial_v3 |
| R8 | `fechando`/códigos novos chegam ao frontend | adapter mapeia desconhecido → "Aberta" e trata 422 genericamente (v2 `[15]`); 409 `items_in_open_session` no `open` cai no tratamento de erro da tela; pendência §13-3 |
| R9 | o dublê em memória da porta não prova atomicidade | declarado; a prova é T-B; memória só garante contrato (67 → 67) |
| R10 | sessões `aberta` com ajustes parciais gravados ANTES do bloco (P-021) | reaproveitamento sob o lock (v2 `[10-LEGACY]`); B7; **o total inclui o reaproveitado** (S-02) |
| R11 | `25P02` reaparece noutra via | D6 + A10 + C7/C8 (agora com o escritor que alcança o `23505`) |
| R12 | `FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` exigem `UPDATE` para papel de menor privilégio futuro | `B-O6R-12` (nota §13-5) |
| R13 | colisão de timestamp de migração | conferir `gh pr list` no dia do PR; renomear é aditivo |
| R14 | `assertApplicationNamePropagated` falhar para o cliente do papel | `[04]` PRE: tag `plan4-A`/`plan4-B` em `pg_stat_activity` |
| R15 | `mapTransientDbFailure` engolir erro determinístico | detecta só por código (lista fechada); A14 cobre os 3 formatos |
| **R16 (v3)** | o lock `NO KEY UPDATE` na linha do tenant serializa `open`s e conflita com `UPDATE tenants` (NO KEY UPDATE) | `open` é raro e curto (uma tx de ~100 ms); `UPDATE tenants` (configurações) é raro; **nunca `FOR UPDATE`** na linha do tenant (conflitaria com todo INSERT do tenant via KEY SHARE — D8 reprova) — `[04]` PRE 70 ms |
| **R17 (v3)** | recontagem em `fechando` muda a variância de uma entry que a unidade concorrente está aplicando | serializado pela linha da sessão (`FOR SHARE` × `FOR UPDATE`) e pelo predicado `adjustment_movement_id IS NULL` na própria linha; `[07]` E34: `coerente: true` |
| **R18 (v3)** | `abortClose` falha (banco caiu) depois de a unidade falhar | o erro original propaga; a sessão fica `fechando` com 0 carimbos, de onde `cancel` (0 carimbos), `recordEntry` e `close` continuam possíveis (I11 sem exceção); B17 |
| **R19 (v3)** | sessões sobrepostas que JÁ existam no deploy (defeito pré-existente `528e3601`) | o `open` novo recusa novas; as antigas fecham como hoje (cada uma aplica a própria variância); a ata registra a consulta de sobreposição para o dono rodar junto com o censo (§13-1) |
| R20 | duração do `CREATE DATABASE` + `migrate deploy` no drill (T-C′) | ~16 s `[02]`; uma vez por execução da suíte; na CI o usuário é `postgres` |

**Rollback:** código = revert do squash (nenhuma outra árvore toca esses arquivos até `03a`); migração = os dois `DROP INDEX IF EXISTS` do rodapé (não destrutivo, `[09]` 2→0→2); nenhuma
coluna/dado alterado; sessões em `fechando` no momento do revert: o código antigo as trata como "não aberta" (422 em tudo — v2 `[10-CRASH]`, `[f7]` do crítico); condição de rollback: concluir
os `fechando` pendentes ANTES (1 `close` por sessão) ou aceitar 422 até o re-deploy — anotado na ata.
## 12. Composição proposta da junta — **unanimidade de 3** (dado/dinheiro; §C7.1-ter(b)); o crítico não tem rodada 3 — a junta confere o §0 linha a linha por execução

| cadeira | papel | o que julga por execução |
|---|---|---|
| 1 — banco e concorrência | `jurado-06-banco-atomicidade-rls` (suplente `jurado-06-suplente-banco-atomicidade-rls`) ou `jurado-c5-banco-fk-triggers` | `FOR UPDATE` × KEY SHARE (A2); I7 com o gancho **dentro da tx** (B8/A12); barreira B3 com `fragment: "tenant_id"` e a 1ª asserção pela invariante; `abortClose` (B13/B11); `finishClose` com o total sob o lock (B14/B15); `open` com lock do tenant (B9, e que `NO KEY UPDATE` não trava INSERTs); C7/C8 com o escritor sem lock; drill em base própria (C4′/C5′, 4 suítes em paralelo no passo 4); RLS sob papel efêmero; sizing (passo 10) reexecutado sem cluster alheio |
| 2 — diff × plano e invariante | `jurado-c5-validador-diff-plano` (suplente `jurado-c5-suplente-validador-diff-plano`) | cada linha do §0 tem o desenho no diff; leituras sem lock que decidem **não existem** no repositório; um lock por tx; D1–D9 enumeram pelo fonte e as 9 mutações foram executadas; `close` sem `findItemById`; `abortClose` no `catch`; `createSession` com lock + sobreposição; escopo §8 respeitado; nada em `inventory.service.ts`/`src/database/**`/controllers; `applyClose` e `onUnitApplied` não existem |
| 3 — contrato, regressão e KPI | `jurado-06-contrato-regressao-kpi` (suplente `jurado-06-suplente-contrato-regressao-kpi`) | 67 → 67; consumidores fuel/maintenance intactos; `fechando` na listagem; os 3 códigos novos com mensagem de negócio; `totalVarianceValue` = sessão inteira também na auditoria `cycle_count.closed`; achados na autoria sem hash, `aguardando_merge` preenchido, `nota_criterio` no DAT-003, `p0_fechados` 13, `kpi-achados-paridade` 6/6; `backend_tests` reexecutado com N e forma; tripla execução; 4 linhas de `ci.yml`; dívidas do #386 conforme a emenda 1-f |

**Aviso (v2 `[14]`, inalterado):** os seis jurados existem só na árvore da sessão (`.claude/agents/especialistas/`), não em `origin/main` (2 arquivos `jurado-san3c2-*`). O
`inspetor-de-terreno-da-junta` confere por nome; ausentes na ref, a `agente-fabrica` os cria (ciclo 1–2, §C7.4) ou a cadeira é ocupada por papel permanente com declaração na ata. Rito:
inspetor libera antes (worktree + `npm ci` + cluster `postgres:16` por jurado, porta fora das faixas excluídas `[02]`; base viva intocada; S0 do espelho Codex; **máquina sem cluster de
jurado alheio durante o sizing**); quem acha ≠ quem planeja ≠ quem conserta (§C7.4-bis); o dev é distinto deste planejador; toda reprovação volta a este papel em **Fable**.
## 13. Pendências que NASCEM neste bloco (com dono) — e as que NÃO nascem

1. **`P-O6R-B04-CENSO-DUPLICATAS-STAGING-PROD` — dono: ato do dono (emenda 2-g).** Rodar `scripts/inventory-duplicates-census.sql` em staging (`STAGING_DATABASE_URL`) e produção
   (`PROD_DATABASE_URL`) **antes do próximo deploy** de cada uma; N = 0 → deploy livre; N > 0 → decisão humana por grupo (o outro estornado por compensação, nunca apagado) e só então o deploy.
   **Se a migração abortar, `prisma migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops` depois de sanear** (M-02, `[08]`). **Aviso:** `deploy-staging.yml` dispara
   em `push: main` quando `STAGING_DEPLOY_ENABLED=true` — o merge vira deploy nesse dia. **Anexo (R19):** a consulta de sessões `aberta` sobrepostas no mesmo item (mesma forma do `OVERLAP` do §3.5,
   sem `ANY`) para o dono rodar junto e decidir qual fecha primeiro. Entra na recontagem do `B-SAN3-10`. Registro em `agent-orchestration/controle/pendencias.md`.
2. **`P-O6R-B04-CONSUMIDORES-503` — dono: `B-O6R-04b`/frontend de estoque (a designar pelo orquestrador).** 503 `stock_busy`/`cycle_count_busy` é novo; o frontend e o app tratam 503
   genericamente hoje (hipótese, não medida); registrar em `API_CONTRACTS.md` (fora deste escopo).
3. **`P-O6R-B04-UI-STATUS-FECHANDO` — dono: bloco de frontend de estoque (a designar; sugestão: o próximo `B-SAN3-*` que tocar `frontend/src/modules/inventory/**`).** `CycleCountStatus`
   do frontend não conhece `fechando`; o adapter mapeia para "Aberta" e trata 422 com "Recarregue a lista"; **e os três códigos novos** — 422 `entry_already_adjusted`, 422 `close_in_progress`
   (a tela deve levar o usuário a recontar as pendentes), 409 `items_in_open_session` no `open` — precisam de texto próprio; levar tudo a `API_CONTRACTS.md` no mesmo bloco.
4. **Nota para `B-O6R-12` (papel de menor privilégio):** `FOR UPDATE`/`FOR SHARE`/`FOR NO KEY UPDATE` exigem `UPDATE`/`SELECT` em `inventory_items`, `cycle_counts`, `cycle_count_entries`
   **e `tenants`** para o papel da aplicação.
5. **Nota para o orquestrador (classe, fora deste bloco — inalterada do v2):** `sendRouteError` (`http.ts:51-59`) responde 400 com `error.message` cru a qualquer `Error` sem `statusCode`
   (v2 `[10-TOK]`); este bloco fecha a instância no módulo (503 de domínio); a classe é candidata a pendência transversal — decisão do orquestrador.
6. **Nota para a ata (classe P4, T-04):** o drill de DDL em base própria fecha a **instância** deste bloco; a classe "DDL de esquema compartilhado" (`pendencias.md:3868,6122`, dono "a atribuir")
   segue aberta e este bloco **não a reabre nem a fecha** — só declara que nenhuma suíte sua faz DDL na base compartilhada (D9).

**Não nascem:** `P-O6R-B04-ABANDONO-DE-FECHAMENTO` (a saída do `fechando` está DENTRO do bloco — S-01/emenda 3-n: `abortClose`, recontagem em `fechando`, `cancel` sem carimbos);
`P-O6R-B04-SUITES-LIST-CI` (emenda 1-c); journal em memória da porta (emenda 1-e); `P-O6R-B04-AJUSTE-SEM-BACKSTOP-DE-BANCO`; pendência de sessões sobrepostas (N-OVL fechado como propriedade
no bloco — emenda 3-p; o legado vai no anexo da 1). **Fecham na autoria:** `Ω6R-DAT-002`, `Ω6R-DAT-003` (emenda 1-b, com a nota de critério — 3-q); `P-020` (absorvida por `P-O6R-B04`) e
`P-021` ganham a linha "fechada na autoria pelo B-O6R-04a; backfill pós-merge". `P-O6R-B04` fica **parcial** (QUA-002 é do 04b).
## 14. Registro de medições (comando → saída), cronológico
- **[00]** corpo do papel lido de `origin/main` (frontmatter `model: fable`; parágrafos `D-FALLBACK-MODELO-FABLE-OPUS` e `D-PLANEJADOR-MODELO-FABLE`).
- **[01]** `git -C <b04a> rev-parse HEAD` → `cc696f93…` (`docs(b-o6r-04a): parecer do critico (rodada 2, NAO) e a emenda 3`); `git log --oneline -3` = `cc696f93` · `fb9ee5a6` (plano v2) · `63dd45bb`; `git status --short | wc -l` → **0** antes e depois de cada execução (worktree somente leitura). Commits do bloco só em `agent-orchestration/` → `src/` no HEAD = head-base `02bd7dab`.
- **[02]** `docker ps -a` → `bsan301-pg`/`bsan301-redis`/`pastrack-*` Up; `erp-postgres`, `erp-redis`, `erp-postgres-alt`, `pastrack-teste-*` Exited — nenhum recebeu comando. `netsh int ipv4 show excludedportrange protocol=tcp` → faixas 49680–51918, 56500–57306, 60966–61165 excluídas; **58544 livre**. `docker run -d --name plan-b04a-pg -e POSTGRES_USER=plan … -p 127.0.0.1:58544:5432 postgres:16` → ready em 4 s; `npx prisma migrate deploy` → "All migrations have been successfully applied"; `_prisma_migrations` = **107** · `read committed` · `deadlock_timeout 1s` · `stock_movements` = 0. `CREATE DATABASE erp_plan_mig` + `migrate deploy` → 107 migrações em **16 162 ms** (custo de uma base privada por suíte — T-04). Node v20.19.5 · `@prisma/client` 7.8.0.
- **[03]** Insumos lidos pela ref: comando com emendas 1–3, plano v2 @ `cc696f93` (770 linhas), `00-critico-r2.md` (160 linhas; 2 bloqueia · 10 ajuste · 4 nota), `00-critico-r1.md`, `crit3-*` (sonda, fase1..6, size, guards, kpi-apply, census, seed-dups), `PLANO_SAN3.md §5.6`; código real: `cycle-count.service.ts`, `cycle-count-prisma.repository.ts`, `cycle-count.types.ts`, `cycle-count.controller.ts:92-102`, `inventory-prisma.repository.ts:190-700` (`hasReversalOf:469` filtra só por `tenant_id` + `reverses_movement_id` — sem item), `tests/kpi-achados-paridade.test.ts` (inteiro), `scripts/run-backend-tests.mjs:60-120` (`SKIP_BUDGET_DB = 2` só com `DATABASE_URL` presente), `.github/workflows/ci.yml:100-130,236-262`, `tests/helpers/auth-identity-fixture.ts:324-364` (`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES`), `prisma.config.ts`. `grep -rn -i "POLICY.*ON \"\?tenants" prisma/migrations` → **vazio** (a tabela `tenants` não tem RLS — confirmado por `pg_class.relrowsecurity=false` em `[04]`).
- **[04]** **SONDA `plan4-probe-b04a.mts`** (497 linhas, escrita por mim em 11 pedaços; importa produção do worktree por URL; emulação LITERAL do v2 e do v3; 2 papéis efêmeros `plan4-A`/`plan4-B`). Fase A: `PROBE_ONLY=PRE,STUCK,TVV,B3` → **ec=0, 13,6 s**, `plan4-faseA.json`; papéis dropados, `pg_roles` sem `o6r_b01_%` ao fim.
  - **PRE**: `rolsuper=false`, `rolbypassrls=false` ×2; `application_name` propagado; `read committed`. `SELECT id FROM tenants WHERE id=$1 FOR NO KEY UPDATE` sob o papel → 1 linha com contexto / 1 sem / 1 com contexto de outro tenant (`tenants`: `relrowsecurity=false, relforcerowsecurity=false` — o tenant vem do ator, não da RLS). A segurando `NO KEY UPDATE` na linha do tenant → B `createMovement` real (KEY SHARE pela FK `tenant_id`) conclui em **70 ms, sem bloquear**.
  - **STUCK** (cenário do crítico: BASE 4 + viatura 6, `open` real → `system 10`, contado 2): head-base → 409, `aberta`, 0 ajustes, recontagem ok, cancel ok. **v2 → 409, `fechando`, recontagem `not_open`, cancel `not_open`, 2º close 409, final `fechando`** (o beco, reproduzido). **v3 → 409 com `abort: reverted` → `aberta`, 0 ajustes; recontagem ok; cancel ok** (= head-base). **v3_recount_close**: recontagem 8 → `close` → `concluida`, 1 ajuste −2, `totalVarianceValue −2`, saldo BASE 2. **STUCK_partial_v3** (X 10→7 aplicado; Y = BASE 4 + viatura 6, contado 2 → 409): `abort: kept, stamped 1` → `fechando`, 1 carimbo; recontagem de Y (não carimbada) → `ok, phase fechando`; recontagem de X (carimbada) → `entry_adjusted`; cancel → `close_in_progress, stamped 1`; recontagem Y=8 → `close` → `concluida` (`resumed`), 2 ajustes (−3, −2), `totalVarianceValue −5`, 0 dup; entries `{X: contado 7, variance −3}`, `{Y: contado 8, variance −2}`.
  - **TVV_resume** (5 itens avg 2, esperado −30; 3º item BASE 1 → 409; entrada +9; 2º close): head-base **−30**; **v2 −18** (vermelho); **v3 −30** (`abort: kept, stamped 2` → `fechando`; retomada `resumed`, applied 3). **TVV_concorrente** (10 itens avg 2, esperado −60; 2 closes, 25 ms entre unidades): **v2 → −48 / −30 / −30 em 3/3 (vermelho)**; **v3 → −60 em 5/5**, vencedor ora `started` ora `resumed`, ledger 10 ajustes / 0 dup em 5/5.
  - **B3** (arranjo especificado: carimbo ANTES do B; barreira `waitForOwnBlockedStatement`): head-base — B bloqueia em `UPDATE "public"."cycle_count_entries" SET "counted_quantity"…`; **`fragment: "tenant_id"` casou; `"cycle_counts"` FALHOU (0 no cluster)**; B gravou `contado=5`; final `contado 5 / variance −3 / concluida` → `invarianteContado7: false` (**vermelho pela invariante**). v3 — B bloqueia em `SELECT status FROM cycle_counts … FOR SHARE`; `tenant_id` e `cycle_counts` casaram; B → `not_open: concluida`; final `contado 7 / variance −3` → `invarianteContado7: true`.
- **[05]** `node plan4-guards.mjs crit3-census.sql` → ec=0, "TODOS OS CASOS COMO ESPERADO". **D1 v3** (membro de `stockMovement.` fora da allowlist de leitura = escritor; SQL cru `i` com qualquer grafia): **NEGA** as 15 amostras — inclusive as 4 que vazavam no v2 (`createManyAndReturn(`, `updateManyAndReturn(`, `INSERT INTO "public"."stock_movements"`, `insert into stock_movements`) e `novoMetodoQualquer(`, `COPY`, `delete from "public"."stock_movements"`; **PASSA** as 6 leituras (`findMany|count|aggregate|groupBy`, `SELECT`). **D2 v3**: V5 na forma do plano → `ok:true` (o `findExitBySource(` antes do lock é leitura de identificação, permitida); V3 → `ok:true`; 5 mutações (`lock dentro do for`, `aggregate antes do lock`, `2 locks`, `sem lock`, `hasReversalOf sem lock`) → `ok:false`. **C6**: regex sobre o texto cru do censo → **3** casamentos (o comentário); sobre o texto sem comentários (`--…`, `/*…*/` removidos) → **0**.
- **[06]** Espelho de KPI `plan4-kpi/` (test + `achados.jsonl` + `REGISTRO` + `kpis-latest.json` copiados do worktree): controle sem edição → `# pass 6 # fail 0`; **edições v3** (`plan4-kpi-apply.cjs v3`: DAT-002/003 `fechado` sem hash + `fechado_em` + `evidencia_fechamento` + `nota_criterio` no DAT-003; `REGISTRO` com `- Status: **fechado**` e a nota de critério; `findings.itens[].status = fechado`; `roadmap B-O6R-04 = parcial`; **`production_readiness.aguardando_merge = [DAT-002, DAT-003]` + `nota_aguardando`**) → **`# pass 6 # fail 0`**, `p0_fechados` 13. **Controle negativo** (mesmas edições SEM `aguardando_merge` — a classe do K-01) → `# pass 5 # fail 1`: `not ok 6 - auditoria: achado fechado SEM merge não conta como corrigido no painel`.
- **[07]** Sonda fase B: `PROBE_ONLY=C78,LO,OVL,E34` → **ec=0, 22,2 s**, `plan4-faseB.json`; papéis dropados, 0 órfãos.
  - **C7/C8** (T-02): escritor que NÃO segura o lock do item X — SQL cru grava a compensação de `m` com `item_id = Z` (linha corrupta possível só fora do módulo), **não commitada**; B = via real. **v3** (índice `(tenant_id, reverses_movement_id)` criado no cluster para a fase; `reverseV3`/`removeExitV3` = lock de X → `hasReversalOf` sob o lock (não vê a linha não commitada) → `insertMovement`): **B bloqueia em `INSERT INTO "public"."stock_movements"…`** (tupla concorrente no índice único), o cru commita, B recebe **`P2002` e o wrapper devolve `already_reversed` (C7) / `undefined` (C8) FORA da tx** em 451/351 ms; **1 compensação**. **Head-base** (sem índice): B não bloqueia, insere em 22/13 ms → **2 compensações** (vermelho). Nota de desenho medida: com escritor ORM que respeita a FK (KEY SHARE no item), o `23505` é **inalcançável** sob o lock (`[04]` do v2, P11) — o mapeamento é cinto para escritor que não toma o lock; C7/C8 exercitam-no com esse escritor.
  - **LO** (T-03/A-03): unidade v3 segurando sessão + X **dentro da tx** (gancho `beforeUnitCommit` 1,5 s) × `open()` real → B bloqueia em `INSERT INTO "public"."cycle_count_entries"`, **0 × `40P01`**, A `concluida` 2 ajustes/0 dup, B `entries=2`; × `recalculateAbc()` real (consumo Y 50 > X 1) → B bloqueia em `UPDATE "public"."inventory_items" SET "abc_class"`, **0 × `40P01`**, `{A:1,B:0,C:1}`. **Controle v1** (sessão + X + Y numa tx) → **`P2010/40P01 deadlock detected`** nas duas (A vítima).
  - **OVL** (N-OVL): head-base — 2 `open` reais sobre o item 100, ambas contam 99, fecham → **saldo 98** (físico 99). **v3** — `openV3` (lock `NO KEY UPDATE` na linha do tenant + exclusão de item já em sessão `aberta|fechando`): 2º open → **409 `CYCLE_COUNT_CONFLICT/items_in_open_session`**; **corrida** de 2 opens concorrentes (hold 400 ms) × 5 → **exatamente 1 sessão criada em 5/5** (o perdedor bloqueou em `SELECT id FROM tenants … FOR NO KEY UPDATE` em 3/5 e chegou depois em 2/5); fecha a única → **saldo 99 = físico**; `open` do mesmo item **depois de `concluida` → ok**.
  - **E34** (A-01/A-02 re-medidos contra o v3): A = unidade v3 segurando 1,5 s; B 300 ms depois. `recordEntry` de entry **carimbada** → bloqueia no `FOR SHARE`, depois `entry_adjusted`; entry final `contado 7 / variance −3`. `cancel` → bloqueia no `FOR UPDATE`, depois **`close_in_progress, stamped 1`**; sessão termina `concluida`, `is_active=true`, 1 ajuste. `recordEntry` de entry **não carimbada** (Y, 2 itens) → bloqueia no `FOR SHARE`, depois `ok, phase fechando`; a unidade de Y aplica o contado FINAL → `{Y: contado 5, variance −5}`; `coerente: true` (variance = contado − sistema em toda entry).
- **[08]** **Drill de migração** (`plan4-mig/` = cópia de `prisma/migrations` + a migração v3 + `prisma.config.ts` apontando para a cópia; base `erp_plan_mig`): `plan4-seed-dups.sql` (semente do crítico, slugs `plan4-mig-%`) → censo **13 estornos + 8 ajustes = 21 grupos**. `npx prisma migrate deploy --config …` → **ec=1, `P3018`, `P0001` "stock_movements: 21 grupo(s) DUPLICADO(S)… Amostra (ate 20 de 21)"** (M-01: contagem real; o v2 dizia 20); `pg_indexes` → 0; `_prisma_migrations` com `20260873…`, `finished_at NULL`. 2º deploy (dado sujo) → **`P3009`**. Limpeza **escopada** (`DELETE … WHERE tenant_id IN (SELECT id FROM tenants WHERE slug LIKE 'plan4-mig-%')`: 57/8/2/2). 3º deploy (dado LIMPO) → **`P3009` de novo** (M-02: a trava). `npx prisma migrate resolve --rolled-back 20260873000000_add_stock_movements_unique_backstops` → "marked as rolled back". 4º deploy → **"successfully applied"**; `pg_indexes` → 2 com `WHERE (reverses_movement_id IS NOT NULL)` / `WHERE (cycle_count_id IS NOT NULL)`. 2ª compensação por SQL cru → **`23505`**.
- **[09]** Refeito por stdin (o `docker exec psql -f` lê o caminho DENTRO do container — erro meu na 1ª passada, sem efeito no resultado): down por `DROP INDEX IF EXISTS` ×2 extraídos do rodapé → `pg_indexes` **0**; semente 21 grupos com os índices derrubados → 13 + 8; **censo v3 por stdin → 22 linhas** (21 grupos + resumo `27|16`); contagem de `stock_movements` antes = depois = **59** (sem mutação); bloco `DO $censo$` extraído do `.sql` contra 21 grupos → `ERROR: stock_movements: 21 grupo(s)… Amostra (ate 20 de 21)`; limpeza escopada (57/8/2/2) → `DO` **mudo**; re-up pelos `CREATE UNIQUE INDEX` extraídos → `pg_indexes` **2** em **286 ms**. Sonda fase D (`PROBE_ONLY=DDLISO`) → ec=0: H (admin) segura INSERT em `stock_movements` na base das suítes 3,4 s; `CREATE UNIQUE INDEX … WHERE false; DROP INDEX` na base própria `erp_plan_mig` via `docker exec psql` → **151 ms**; V `createMovement` head-base (outro tenant) na base das suítes → **95 ms, `<timeout: nao bloqueou>`** (T-04).
- **[10]** **SIZE** (`PROBE_ONLY=SIZE`, emulação LITERAL do v3 × `CycleCountService.close` real; itens com `avg_cost 2`, 10 → 7 → esperado −6·N): fase 1 `SIZE_N=250,500,1000` → ec=0, 202 s; fase 2 `SIZE_N=10000 SIZE_HB=0` → ec=0, 221 s. **Ressalva de terreno:** durante a fase 1 havia um cluster de jurado alheio de pé (`j-bsan301-c1-pg`, `docker stats`) e as durações saíram **ruidosas** — não sustentam comparação v3 × head-base; o que sustentam é a propriedade (conclui; unidade ≪ 5 s; total exato).
  | N | v3 total | unid. média / p95 / máx (ms) | v3 `totalVarianceValue` (esperado) | v3 final | head-base |
  |---|---|---|---|---|---|
  | 250 | 29 676 ms (ruído) | 116 / 482 / 834 | −1 500 (−1 500) | `concluida` 250/250, 0 dup | 4 199 ms, `concluida`, −1 500 |
  | 500 | 9 777 ms | 19,4 / 29 / 70 | −3 000 (−3 000) | `concluida` 500/500, 0 dup | **61 332 ms → `P2028` em `cycleCountEntry.updateMany()` (`applyClose`), sessão `aberta`, 500 ajustes gravados, 0 carimbados** (sob carga; o v2 mediu 7,7 s em máquina livre — o `applyClose` é a tx que cresce com N e é a que estoura) |
  | 1000 | 66 365 ms (ruído) | 66 / 259 / 559 | −6 000 (−6 000) | `concluida` 1000/1000, 0 dup | 26 389 ms, `concluida`, −6 000 |
  | 10 000 | **217 618 ms** | **21,6 / 30 / 595** | **−60 000 (−60 000)** | **`concluida`, 10 000 ajustes, 10 000 carimbos, 0 dup** | não re-medido por mim (v2 `[16-E5]`: 332 s → `P2028` em `applyClose`, `aberta`) |
  Leitura: toda unidade do v3 ficou abaixo de 5 000 ms (máx 834 ms com ruído; 595 ms em N=10 000); o v3 conclui `SNAPSHOT_LIMIT` com o total exato; o head-base estourou em N=500 sob carga — o mesmo modo de falha que o v2 mediu em N=10 000. A ata do sizing sai do código real, em máquina sem cluster alheio (§10 passo 10).
- **[11]** Limpeza: `docker rm -f plan-b04a-pg` (inclui `erp_plan_b04a` e `erp_plan_mig`); papéis efêmeros dropados em toda fase (`papeisOrfaos: 0` em todos os JSON); `git status --short | wc -l` do worktree `b04a` → **0** ao fim; base viva intocada; nenhum comando em `erp-postgres`, `erp-redis`, `erp-postgres-alt`, `pastrack-*`, `bsan301-*`, `dev-*`, `crit-*`, `j-*`. Artefatos desta instância só no scratchpad: `plan4-probe-b04a.mts` (+ `plan4-c*.mts`), `plan4-fase{A,B,D}.json/.log`, `plan4-size.json/.log`, `plan4-size10k.json/.log`, `plan4-guards.mjs`, `plan4-kpi-apply.cjs`, `plan4-kpi/`, `plan4-mig/` (cópia das migrações + a nova), `plan4-seed-dups.sql`, `plan4-census.sql`, `plan4-census-out.txt`, `plan4-do.sql`, `plan4-down.sql`, `plan4-reup.sql`, `plan4-s*.md` (pedaços) e este plano.

FIM DO PLANO
