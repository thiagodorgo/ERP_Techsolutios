# B-SAN3-23 — diário do DEV

- **Quem:** `dev-san3-23-cl`, Claude **Opus** (subagente da sessão; nível menor, declarado, §C7.6). Identidade nova: não planejei nem critiquei.
- **Por que Claude no papel do dev (exceção declarada):** o Codex 1 está sem cota semanal até 16/11 15:41 SP e o Codex 2 está ocupado. Regra do dono `D-IAS-EXTERNAS-PRIMEIRO` ("se todas ias estao ocupada e falta uma tarefa fazer num bloco, vc faz").
- **Plano:** `plano-B-SAN3-23-v2.md` (Claude Opus 5.5 pela API, topo substituto declarado). **Crítica r2:** `crit-23-r2-plano.json` (Claude Opus 5.5, subagente; APROVADO COM AJUSTES, 8 achados que viram requisito). **Decisão do dono:** `D-PORTAO-5-RECOMENDACOES-1111`, Q1 = A (a F2b entra no bloco).
- **Prevalência:** decisão do dono > ajustes C23R2-01..08 > plano v2.
- **Worktree:** `C:/Users/thiag/w-san323`, ramo `fix/os-cancelada-sem-item-financeiro`, base `origin/main@07898adf` (medida: `git diff --stat d5ec1696 07898adf -- src/modules/work-orders src/modules/work-order-financials` vazio; os 3 arquivos de `tests/helpers` que mudaram não são o `pg-barrier.ts` nem o `auth-identity-fixture.ts`).
- **Banco:** `san323-pg` (postgres:16, `127.0.0.1:55496`), `prisma migrate deploy` limpo. `npm ci` próprio, sem junction.
- **Toda hora vem de `date`** (relógio local SP, Git Bash).

## Como cada ajuste da crítica r2 é atendido (requisito, antes do código)

Os ajustes vieram como requisito do orquestrador. A crítica não propõe conserto (§C7.4-bis), então a forma do conserto é minha e vai declarada aqui, com o motivo. Onde mudar texto de mutação, é **emenda** de uma linha ao §3.3 do plano, registrada aqui (D-EMENDA-ANTES-DO-CODIGO: a decisão nasce da crítica, que já é a revisão do plano).

| Ajuste | O que faço | Mutação que prova |
|---|---|---|
| C23R2-01 (MÉDIA) — CAS do despacho compara com a situação relida sem trava | O `where` do `assignFromDispatch` Prisma leva `status: input.event.fromStatus` (a situação que o serviço validou), não `current.status`. Teste novo **A15b**: o resolvedor de perfil, entre a leitura do serviço e o repositório, roda um `cancel(keep)` real; a OS cancelada não pode ganhar técnico. | **M15b** (nova): trocar `status: input.event.fromStatus, // B-SAN3-23:cas-dispatch` por `status: current.status, // B-SAN3-23:cas-dispatch` (a forma literal do v2) → A15b vermelha |
| C23R2-02 (MÉDIA) — a M5 literal morre de `ReferenceError` e sobrevive à A4 | **Emenda E-M5:** a âncora fica (`new PrismaWorkOrderFinancialItemRepository(tx)`); a troca passa a ser `(await (await import("../work-order-financials/work-order-financial-prisma.repository.js")).createPrismaWorkOrderFinancialItemRepository())`. Mesmo efeito pretendido (zerar numa transação própria, fora da unidade), e compila (`tsc` = 0 erro, medido na F4). | M5 emendada → A4 vermelha pelo estado (`open`, 0 ativos) |
| C23R2-03 (BAIXA) — a M4 apaga a variável que a linha seguinte usa | **Forma do código:** a trava da OS é uma instrução de uma linha só, que não devolve nada usado depois (`SELECT id … FOR UPDATE; // B-SAN3-23:trava-os-cancel`); a situação é lida na instrução seguinte, já sob a trava. A M4 fica literal ("apagar a instrução `$queryRaw` inteira que termina nessa linha") e o código continua válido: a A3 fica vermelha pela falta da trava. | M4 literal → A3 vermelha pelo estado |
| C23R2-04 (BAIXA) — a MB não mata se a A1 não passar `blockedBy`, e a BAR-1 conta um literal que o auxiliar novo podia não escrever | Toda barreira com um vencedor só passa `blockedBy: <pid do vencedor>` (A1, A2, A4-A6, A8-A15); só o 2º passo da A3 conta sem `blockedBy` (o perdedor 2 espera o perdedor 1). A mensagem de timeout do auxiliar novo começa por `timeout esperando`. | MB literal → A1 vira timeout (BAR-1 vermelha) |
| C23R2-05 (BAIXA) — as previsões de hoje da A10 e da A12 estavam erradas | A tabela da F0, abaixo, registra o vermelho **medido** (A10: impasse traduzido em 503 com 0 título; A12: P2028 cru). Os critérios não mudam. | — |
| C23R2-06 (BAIXA) — `expectedStatus` opcional descarta o predicado | `expectedStatus` é **obrigatório** no tipo `ChangeWorkOrderStatusInput`; o `tsc` recusa chamador sem ele. | (a prova é o `npm run check`) |
| C23R2-07 (BAIXA) — 503 de editar/apagar sem teste-dono; relógio da A11/A12 | Testes novos **A11b** (editar) e **A11c** (apagar). O vencedor segura a trava **6,5 s contados depois da barreira** (o perdedor já está na transação: margem garantida de 1,5 s sobre os 5 s do `$transaction`). | M11 → A11, A11b e A11c vermelhas |
| C23R2-08 (BAIXA) — a P-23 dizia mais do que o desenho cobre | Texto da P-23 no comando do bloco e nos comentários: a linha da OS serializa o cancelamento com toda escrita que **cria, altera ou apaga item** da OS e com todo **faturamento** (o único que cria título com `work_order_id`). Baixa, estorno, PATCH/situação/apagar de título e cheques não passam pela trava da OS e ficam fora, declarado. | — |

## Fatias

(preenchido a cada fatia: comando → saída resumida → veredito)

### F0 — vermelho no código de hoje (02:57–03:02 SP)

- **Comando:** `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55496/erp_san323 node --test --test-reporter=tap --import tsx tests/b-san3-23-cancel-race-db.test.ts` sobre `origin/main@07898adf` com só a suíte nova e o auxiliar novo.
- **Saída:** `# tests 19 · # pass 0 · # fail 19 · # skipped 0` (02:59:15–02:59:39). **BAR-1:** `grep -c "timeout esperando" f0-tap.txt` = **0**; `grep -c "^not ok" f0-tap.txt` = **19** (≥ 7). Todo vermelho é da **asserção final**:

| Caso | Barreira (texto só como evidência) | Desfecho de hoje |
|---|---|---|
| A1 lançar | `bloqueado: INSERT INTO work_order_financial_items` (a FK espera a trava do vencedor) | perdedor `fulfilled`; OS `cancelled/keep` com **1 item ativo** |
| A5 faturar | `bloqueado: INSERT INTO financial_titles` | `fulfilled`; OS cancelada com **1 título** e 2 itens faturados |
| A6a editar / A6b apagar | `resolvido` (não espera a OS) | `fulfilled`; quantidade 3 (total 300) / item apagado |
| A8 (papel efêmero) | `bloqueado: INSERT …` | `fulfilled`; 1 item ativo em OS cancelada |
| A2 cancelar(zero) × INSERT cru | `resolvido` (o `UPDATE` da OS não conflita com a `KEY SHARE`) | `cancelled/zero` com **1 item ativo** |
| A3 item travado × zero × lançar | 1ª `bloqueado: SELECT … FOR UPDATE` dos itens; 2ª `resolvido` | lançar `fulfilled`; `cancelled/zero` com 1 ativo |
| A4 evento falha | — | recusa da falha injetada (`SAN323_INJ_EVENTO`), mas a OS ficou **`cancelled/zero` com 0 ativos** |
| A9 zero × faturamento | `bloqueado: SELECT … FOR UPDATE` dos itens | `fulfilled`; **`cancelled/zero` com 1 título e 2 faturados** (I-Z violada) |
| A10 ordem | `bloqueado: INSERT INTO financial_titles` | perdedor `503/invoice_transient_conflict` (o impasse, traduzido), 0 título — **C23R2-05 confirmado** |
| A7 N=20 | — | vermelho já na rodada 0 do par faturar: `cancelled/zero` com 2 faturados e 1 título (I-Z) |
| A11/A11b/A11c | `resolvido` (hoje a escrita não espera a OS) | `fulfilled` (item novo / quantidade 3 / item apagado) |
| A12 cancelar × trava compartilhada | `bloqueado: UPDATE work_orders SET status …` | `P2028` cru, 6602 ms — **C23R2-05 confirmado** (500, não 503) |
| A13 concluir | `bloqueado: UPDATE work_orders …` | `fulfilled`; OS **`completed/zero`** |
| A14 atribuir | `bloqueado: UPDATE work_orders …` | `fulfilled`; OS **`assigned/zero`**, 1 atribuição (hipótese do v2 confirmada) |
| A15 despachar | `bloqueado: UPDATE work_orders …` | `fulfilled`; OS `assigned/zero` com técnico, 1 atribuição (hipótese confirmada) |
| A15b despacho com cancelamento no meio | — (gancho) | cancelamento no meio `fulfilled`, despacho `fulfilled`: OS **`cancelled/keep` com técnico** e 1 atribuição (C23R2-01) |

- **Veredito:** a premissa do §1.2 vale; A1, A2, A3 e A9 vermelhos pela asserção. Sigo (o plano mandaria PARAR se não).

### MB — barreira com filtro de texto, no objeto da F0 (02:59:51–03:02:37 SP)

- **Comando:** `sed -i "s/= ANY(pg_blocking_pids(a.pid))/IS NOT NULL AND a.query ILIKE '%FOR SHARE%'/" tests/helpers/pg-barrier.ts` (âncora: `grep -c` = 1 antes) e a mesma suíte.
- **Saída:** `# fail 19`; `grep -c "timeout esperando" mb-tap.txt` = **10**; a A1 caiu em `timeout esperando bloqueio da própria suíte … lançar atrás do cancelamento (bloqueados vistos: 0 de 1; bloqueador exigido: 132)`.
- **Veredito:** MB **morta** (a BAR-1 fica vermelha). Restaurado.
- **Incidente meu, registrado:** restaurei com `git checkout -- tests/helpers/pg-barrier.ts` antes de commitar o auxiliar novo, e o restauro levou o acréscimo junto. Recoloquei o mesmo texto (`git diff --stat`: 64 inserções, igual a antes; `grep -c "= ANY(pg_blocking_pids(a.pid))"` = 1). Daqui em diante, toda mutação é aplicada **depois** do commit da fatia, e o restauro é sempre contra o commit.

### F1 — escrita de item relê a OS sob a trava compartilhada (03:04–03:07 SP)

- **Código:** `workOrderCancelledError()` em `work-order-financial.types.ts` (usada pela guarda de entrada e pelo repositório); `lockWorkOrderRowForFinancialWrite` privado em `PrismaWorkOrderFinancialItemRepository` (o único `FOR SHARE` do arquivo; a linha exata `if (row?.status === "cancelled") throw workOrderCancelledError();`), chamado em `create` e `update` (dentro do `try`, antes da escrita) e em `softDelete`, cada um com o seu marcador; `translateItemWriteFailure` + `itemWriteTransientConflictError` (503) no serviço, envolvendo `repository.create/update/softDelete`; comentário do `zeroActiveItems` (D-5).
- `npm run check` → sem erro.
- `node --test --test-reporter=tap --test-name-pattern="\[A1\]|\[A6a\]|\[A6b\]|\[A8\]|\[A11\]|\[A11b\]|\[A11c\]" … b-san3-23-cancel-race-db.test.ts` → `# pass 7 · # fail 0` (os outros 12, pulados pelo filtro). Barreira de todos: `bloqueado: SELECT status FROM work_orders … FOR SHARE`. A1/A8: `422/work_order_cancelled`, 0 ativo; A6a: quantidade 1, total 100; A6b: não apagado; A11/A11b/A11c: `503/work_order_financial_transient_conflict`, nada persistido.
- Regressão: `npm test -- tests/work-order-financials.test.ts tests/work-order-financials-routes.test.ts` → `2 arquivo(s) · 39 teste(s) · pass 39 · fail 0 · skipped 0`; `CORE_SAAS_PERSISTENCE=prisma npm test -- tests/work-order-invoicing-atomic-db.test.ts` → `17 · pass 17 · fail 0 · skipped 0`.
- **Veredito:** verde.

### F2 — o cancelamento como unidade sob a trava exclusiva da OS (03:08–03:12 SP)

- **Código:** tipos `CancelWorkOrderWithFinancialDecisionInput/Result` e as fábricas `hasInvoicedItemsError()` e `cancelTransientConflictError()` em `work-order.types.ts`; `cancelWithFinancialDecision` na interface, na InMemory (D-2: a sequência da unidade, com a porta de memória do serviço), na `PrismaWorkOrderRepository` (uma `$transaction`: a trava exclusiva numa instrução de uma linha `// B-SAN3-23:trava-os-cancel` — o **único** `FOR UPDATE` do arquivo —, a situação relida sob ela, `assertCancellable`, no `zero` `hasActiveInvoicedItem` `// B-SAN3-23:faturado-sob-trava` e `new PrismaWorkOrderFinancialItemRepository(tx)` — a **única** ocorrência do construtor —, o `UPDATE` da situação e o evento `// B-SAN3-23:evento-na-unidade`) e no invólucro RLS. No serviço, o `cancel` delega; `fromStatus` do `publishDomainEvent` é o lido sob a trava; o pré-check solto saiu do caminho Prisma (o `zeroFinancialItems` virou `memoryFinancialsPort`, que só a memória chama); `isTransientCancelFailure` (lista fechada local) `// B-SAN3-23:transitorio-cancel`; comentários `:1437-1444` e `:1520-1526` atualizados.
- `npm run check` → sem erro.
- `… --test-name-pattern="\[A2\]|\[A3\]|\[A4\]|\[A9\]|\[A12\]" …` → `# pass 5 · # fail 0`. A2: barreira `bloqueado: SELECT id FROM work_orders … FOR UPDATE`, `cancelled/zero` com 0 ativo; A3: as duas barreiras bloqueadas (o lançar espera o cancelamento); A4: recusa da falha injetada e `{open, null, 2 ativos, 0 evento}`; A9: `422/has_invoiced_items`, OS `open/null`, 1 título e 2 faturados; A12: `503/work_order_cancel_transient_conflict`, OS intacta.
- Regressão: `npm test -- tests/work-order-cancel-duplicate.test.ts tests/work-order-cancel-duplicate-routes.test.ts tests/commissions-cancellation-suppression.test.ts tests/work-orders.test.ts` → `4 arquivo(s) · 47 teste(s) · pass 47 · fail 0 · skipped 0`. `grep -rn fromStatus tests/work-order-cancel*` → só `work-order-cancel-duplicate.test.ts:178` (`"open"`, sem corrida: igual).
- **Veredito:** verde.

### F3 — o faturamento trava a OS antes dos itens (03:12–03:15 SP)

- **Código:** `await this.lockWorkOrderRowForFinancialWrite(tenantId, workOrderId); // B-SAN3-23:trava-fatura` no início de `listInvoiceableByWorkOrderForUpdate`, antes do `$queryRaw` dos itens; comentário P-23.3. Na A7, as rodadas ímpares largam o outro lado primeiro (as duas ordens de largada).
- Suíte inteira: `# tests 19 · # pass 15 · # fail 4` — os 4 vermelhos são A13, A14, A15 e A15b (a F2b, ainda não feita). A5: barreira `bloqueado: SELECT status FROM work_orders … FOR SHARE`, `422/work_order_cancelled`, 0 título; A10: vencedor `fulfilled`, perdedor `422/work_order_cancelled`, **0 impasse**, 0 título.
- A7 (N=20 × 3, duas ordens de largada): `{"lançar":{"fulfilled × rejected 422/work_order_cancelled":20},"faturar":{…:20},"editar":{…:20}}` — 0 impasse, I-Z e "cancelada/zero sem item ativo" em todas as 60 rodadas. Nota: sem barreira o cancelamento ganhou sempre a largada (tem menos idas ao banco antes da trava); a A7 é regressão, a prova é a barreira das A1-A10.
- Regressão: `CORE_SAAS_PERSISTENCE=prisma npm test -- tests/work-order-invoicing-atomic-db.test.ts` → `17 · pass 17 · fail 0 · skipped 0` (T-Z1 a T-Z3 inclusive); `npm test -- tests/work-order-invoicing.test.ts tests/financial-uow-memory.test.ts tests/financial-uow-journal-classification.test.ts` → `3 arquivo(s) · 90 teste(s) · pass 90 · fail 0 · skipped 0`.
- **Veredito:** verde.

### F2b — CAS de situação nos 3 escritores (Q1 = A do dono) (03:15–03:25 SP)

- **Código:** `expectedStatus` **obrigatório** em `ChangeWorkOrderStatusInput` (C23R2-06); `changeStatus` Prisma com `status: input.expectedStatus, // B-SAN3-23:cas-status`; `assign` Prisma com `status: input.event.fromStatus, // B-SAN3-23:cas-assign`; `assignFromDispatch` Prisma com `status: input.event.fromStatus, // B-SAN3-23:cas-dispatch` **e a situação de destino derivada da mesma situação validada** (C23R2-01: nunca da leitura sem trava). InMemory com os mesmos predicados (paridade). No serviço, `changeStatus` passa `expectedStatus: current.status`, e os três tratam `undefined` com `statusWriteMissError` (relê: a OS existe → `409 invalid_status_transition`; sumiu → 404). A trava de técnico (`assertTechnicianChangeAllowed`) não foi tocada.
- `npm run check` → sem erro (o `tsc` exigiu o `expectedStatus` também na unidade de memória do cancelamento: é a prova do C23R2-06).
- Suíte inteira: `# tests 19 · # pass 18 · # fail 1`. A13: `409/invalid_status_transition`, OS `cancelled/zero`; A14: `409`, `cancelled`, 0 atribuição; A15: `409`, `cancelled`, 0 atribuição; **A15b**: cancelamento no meio `fulfilled`, despacho `409`, `{cancelled, keep, técnico null, 0 atribuição}`.
- **O vermelho da A7 (rodada 0, par faturar): `rejected 422/nothing_to_invoice`.** Causa medida pela leitura do código: o faturamento leu a OS `open` antes do commit do cancelamento, e o pré-check SEM trava dele (`listInvoiceableByWorkOrder`, fora da unidade, de propósito — "PASSO 0" do B-SAN3-02) leu os itens já zerados. É o desfecho do caso sequencial, nada persiste, e as asserções de estado do plano (0 impasse, cancelada ⇒ nada posterior, I-Z) passaram na rodada. O conjunto de desfechos permitidos era um acréscimo meu, mais estreito que o do plano; passa a aceitar `422 nothing_to_invoice` no faturar e `404 financial_item_not_found` no editar (o mesmo pré-check sem trava, item já apagado), com o motivo no comentário. A A7 imprime a contagem dos desfechos também quando falha. **3 execuções** da A7 → `pass 1 · fail 0` nas três.
- Regressão (memória): `npm test -- tests/o6r07c-b-scope.test.ts tests/field-dispatch.test.ts tests/work-orders.test.ts tests/mobile-backend-contracts.test.ts tests/work-order-checklists-sticky.test.ts tests/work-order-map.test.ts tests/san3-13-wo-list-scope.test.ts tests/dashboard-summary.test.ts tests/o6r07b-upload-gate.test.ts tests/work-order-cancel-duplicate.test.ts tests/work-order-invoicing.test.ts` → `11 arquivo(s) · 350 teste(s) · pass 350 · fail 0 · skipped 0`.
- Regressão (Postgres): `CORE_SAAS_PERSISTENCE=prisma npm test -- tests/o6r07c-b-scope-db.test.ts tests/o6r07c-subresource-scope-db.test.ts tests/traccar-event-sample-db.test.ts tests/traccar-idempotency-db.test.ts tests/traccar-position-ingestion-db.test.ts tests/traccar-resolution-race-db.test.ts tests/traccar-quarantine-db.test.ts tests/pg-barrier-scoped-db.test.ts` → `8 arquivo(s) · 76 teste(s) · pass 76 · fail 0 · skipped 0`.
- Suítes que tocam situação, atribuição ou despacho (`grep -rlE "changeStatus|assignFromDispatch|\.assign\(" tests --include=*.ts` → 37 arquivos): as que não estão acima rodam no `npm test` da F5.
- **Veredito:** verde.

### F4 — mutações do §3.3, uma por vez (03:25–03:43 SP)

- **Âncoras antes de mutar** (`grep -cF`, no commit `787c914d`): FR `FOR SHARE` = 1, a linha de recusa = 1, `trava-create/update/delete/fatura` = 1 cada, `if (locked.length === 0) return [];` = 1; WR `FOR UPDATE` = 1, `trava-os-cancel`, `faturado-sob-trava`, `evento-na-unidade`, `new PrismaWorkOrderFinancialItemRepository(tx)`, `cas-status`, `cas-assign`, `cas-dispatch` = 1 cada; FS `transitorio-item` = 1; WS `transitorio-cancel` = 1; fixture `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES` = 1. (WR `createPrismaWorkOrderFinancialItemRepository` = 0: é o C23R2-02.)
- **Como:** `mutacoes.sh` (scratchpad) — para cada uma: aplica a troca literal (`mutar.mjs`, que recusa âncora com contagem ≠ 1) → `npx tsc --noEmit` quando o arquivo é de `src/` → `node --test --test-name-pattern=<casos que ela mata>` → `git checkout -- <arquivo>` (contra o commit) → `git diff --quiet` do arquivo. Todas restauradas; `git status` sem `src/` modificado no fim.

| M | Troca (literal) | tsc | Resultado | Vermelho pela razão certa? |
|---|---|---|---|---|
| M1 | FR `FOR SHARE` → vazio | 0 | A1, A5, A6a, A6b, A10 `not ok` | sim: sem a trava, A1 commita o item, A5 emite título, A10 vira impasse (503) |
| M2 | FR apagar `if (row?.status === "cancelled") …` | 0 | A1, A5, A6a, A6b `not ok` | sim: espera a OS e escreve mesmo cancelada |
| M1c | FR apagar `trava-create` | 0 | A1 `not ok` | sim (1 item ativo) |
| M3 | WR `FOR UPDATE` → `FOR NO KEY UPDATE` | 0 | A2 `not ok` | sim: não espera a `KEY SHARE` do INSERT cru; `cancelled/zero` com 1 ativo |
| M4 | WR apagar a instrução de uma linha `trava-os-cancel` | **0** | A3 `not ok` | **sim** (C23R2-03 resolvido): o lançar não espera (`barreira2=resolvido`) e o item sobra, sem `ReferenceError` |
| M5 literal (v2) | WR → `(await createPrismaWorkOrderFinancialItemRepository())` | **1** (TS2552) | A4 `not ok`, mas pela asserção "a recusa veio da falha injetada" (`ReferenceError`); o estado era `{open, null, 2, 0}` — o sobrevivente do C23R2-02 | não: medido só para registrar o C23R2-02 |
| **M5 (emenda E-M5)** | WR → `(await (await import("../work-order-financials/work-order-financial-prisma.repository.js")).createPrismaWorkOrderFinancialItemRepository())` | **0** | A4 `not ok` | **sim**: recusa da falha injetada e OS `open` com **0 ativo** (o zero commitou fora da unidade) |
| M5b | WR apagar `evento-na-unidade` | 0 | A4 `not ok` | sim: o cancelamento passa sem evento (`cancelled/zero`) |
| M6 | FR apagar `trava-fatura` | 0 | A5 `not ok` | sim (1 título em OS cancelada) |
| M7 / M7b | FR apagar `trava-update` / `trava-delete` | 0 | A6a / A6b `not ok` | sim (quantidade 3 / item apagado) |
| M8 | FR mover `trava-fatura` para antes de `if (locked.length === 0) return [];` | 0 | A10 `not ok` (A7 `ok`) | sim: impasse, o perdedor sai `503/invoice_transient_conflict` |
| M9 | fixture `GRANT SELECT, INSERT, DELETE ON ALL TABLES` | — | A8 `not ok` | sim: `42501 permission denied for table work_orders` na trava compartilhada |
| M10 | WR apagar `faturado-sob-trava` | 0 | A9 `not ok` | sim: `cancelled/zero` com 1 título e 2 faturados |
| M11 | FS apagar `transitorio-item` | 0 | A11, A11b, A11c `not ok` | sim: `P2028` cru nas três |
| M12 | WS apagar `transitorio-cancel` | 0 | A12 `not ok` | sim: `P2028` cru |
| M13 / M14 / M15 | WR apagar `cas-status` / `cas-assign` / `cas-dispatch` | 0 | A13 / A14 / A15 `not ok` | sim: `completed/zero`; `assigned/zero` com 1 atribuição; `assigned/zero` com técnico |
| **M15b** (nova, C23R2-01) | WR `status: input.event.fromStatus, // B-SAN3-23:cas-dispatch` → `status: current.status, …` (a forma literal do v2) | 0 | **A15 `ok`, A15b `not ok`** | sim: reproduz o achado — a A15 não pega, a A15b pega (OS cancelada vira `assigned` com técnico) |
| MB | (na F0) | — | BAR-1 vermelha | sim |

- **Veredito:** 20 mutações aplicadas, 19 com vermelho pela razão certa; a 20ª (M5 literal) só documenta o C23R2-02. Nenhuma sobrevivente.

### F5 — bateria final

- **MD1** (03:45 SP): `grep -c "^## P-COMISSAO-GATE-SEM-TRAVA" pendencias.md` = 1 → apagar o cabeçalho → **0** (DOC-1 vermelha) → `git checkout --` → 1. MD2 não se aplica (Q1 = A).
- `npm run check` e `npm run lint` → sem erro; `node scripts/migration-transaction-guard.mjs` → `migrações: 130 · … · violações: 0`; `npm run build` → sem erro; `git diff --check origin/main..HEAD` limpo; `git diff --name-only origin/main...HEAD` → só arquivos do PERMITIDO (nada em `prisma/**`, `.github/**`, `Kpis/**`).
- **1ª suíte inteira** (`npm test`, forma do job `backend`: `DATABASE_URL` do cluster descartável, persistência padrão do runner), 03:45–04:08 SP → `476 arquivo(s) · 4973 teste(s) · pass 4952 · fail 19 · skipped 2`. Dos vermelhos, **um era do bloco**:
  - **T13 do `san3-05-acessos-de-plataforma-guard`** (ratchet do inventário de acessos a tabelas FORCE sem contexto provado, B-SAN3-05): 6 chaves novas sem motivo, todas da unidade do cancelamento — o `$transaction` interno (como o do `assign`, que está congelado com motivo) e a autoconstrução `new PrismaWorkOrderRepository(tx)`. **Conserto dentro do PERMITIDO, sem tocar o congelado** (que é de `tests/san3-05-…`, fora do escopo): a unidade passa a rodar na transação do invólucro (`withTenantRls`, a mesma do `applyChecklists`), sem `$transaction` interno, o "há faturado?" vira método da classe e o evento sai por `this.createEvent`. As âncoras do §3.3 não mudam (`grep -c` = 1). `node scripts/san3-05-acessos-de-plataforma.mjs .` → as chaves de `work-order-prisma.repository.ts` voltam a ser só as 7 já congeladas (`assign` ×3, `assignFromDispatch` ×4). `npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts` → `35 · pass 35 · fail 0`. Suíte do bloco → `19 · pass 19 · fail 0 · skipped 0`. Commit `53362c10`.
  - **As mutações do repositório de OS, de novo, na forma nova** (04:11–04:15 SP): M3 → A2 `not ok`; M4 → A3 `not ok` (tsc 0); M5 literal → A4 `not ok` pela causa (`ReferenceError`), tsc 1; **M5 emendada → A4 `not ok`, OS `open` com 0 ativo** (tsc 0); M5b → A4 `not ok` (cancelado sem evento); M10 → A9 `not ok`. Todas restauradas.
  - **Os outros vermelhos da 1ª suíte inteira não são do bloco.** Medido arquivo por arquivo, isolado (`npm test -- tests/<arquivo>`, mesma forma), no head (04:16–04:20 SP): `ass-03-metering-db` 9/9, `ass-08-channel-db` 21/21, `ass-08-channel-migration-drill-db` 4/4, `cheque-title-link-migration-drill-db` 6/6, `san3-05-acessos-de-plataforma-guard` 35/35, `san3-05-leituras-de-plataforma-db` 12/12, `traccar-position-ingestion-db` 22/22, `users-acesso-seg-portao-db` 4/4 — todos verdes sozinhos (eram tetos de tempo sob a carga de 476 arquivos em paralelo nesta máquina: `statement timeout`, `2089 ms (teto 2 000)`, transação expirada aos 5,2 s, `tempo esgotado`). Os dois que falham sozinhos falham **igual na base** `07898adf` (worktree `w-san323b`, isolado): `san3-05-runtime-role-guard-db` (T14a/b, T14c, T14d: `setsid: ausente`, ambiente Windows) e `san3-09-bootstrap-platform-admin-db` (T2: o shim `node_modules/.bin/prisma` executado pelo node no Windows dá `SyntaxError`). O T15 do papel de runtime, vermelho no head isolado por `condição de boot não apareceu em 15000ms` e verde na base, rodou **3/3 verde** no head logo depois (teto de tempo de boot).

## PARADA (04:45 SP) — o plano não fecha no código: o CAS de situação recusa um despacho concorrente que a operação aceita em sequência (`D-EMENDA-ANTES-DO-CODIGO`)

- **Onde apareceu:** CI do push, run `42979498478`, job `backend` (head `5615273b`): `476 arquivo(s) · 4983 teste(s) · pass 4980 · fail 1 · skipped 2`. O vermelho: `tests/checklist-snapshot-dispatch.test.ts`, `[nao super-conta] dois despachos concorrentes da mesma OS → 1 run e 1 unidade FATURADA`, `expected: 201 · actual: 409` (`:246`). Todos os outros jobs verdes (inclusive `backend-postgres`).
- **Reprodução local** (memória, `node --test --test-name-pattern="nao super-conta" tests/checklist-snapshot-dispatch.test.ts`): **6/6 `not ok`** (`409`) no head; **6/6 `ok`** na base `07898adf` (worktree `w-san323b`). Nas duas suítes inteiras locais o caso passou: sob a carga dos 476 arquivos a intercalação muda. É determinístico isolado.
- **Causa (leitura do código, confirmada pela reprodução):** os dois despachos leem a OS `open` no serviço; o 1º grava `assigned`; o 2º chega ao repositório com `event.fromStatus = open`, o CAS da F2b (`status: input.event.fromStatus`, e a paridade da memória) casa 0 linhas, e o serviço relê e responde `409 invalid_status_transition`. **Em sequência** (o 2º depois do 1º), o mesmo despacho sobre a OS `assigned`, para o mesmo técnico, responde **201** (`assignFromDispatch` mantém a situação não terminal e só regrava a atribuição). Logo o 409 da F2b, como o plano o escreve (§2.2: "quando o repositório devolve `undefined`, o serviço relê: se a OS existe, 409"), **não** é "a mesma resposta de hoje" neste caso — e o §3.4 manda a regressão das suítes de despacho passar **sem editar asserção**. Os dois requisitos do plano se contradizem aqui. O mesmo vale, por leitura, para `assign` concorrente (`assigned → assigned`) e para `changeStatus` concorrente de transição ainda válida a partir da situação nova; só o despacho tem teste que pega.
- **O que NÃO está em questão:** o defeito do item 23 (A1-A12) e a sobrescrita do cancelamento (A13-A15b) estão fechados e provados; o CAS faz o que a decisão do dono pede quando a situação nova é `cancelled`.
- **Formas possíveis do conserto, para o planejador decidir (não escolhi nem implementei):**
  1. no CAS que casa 0 linhas, o serviço relê e **revalida a mesma operação sobre a situação nova** (transição, situação terminal e a trava de técnico); se continua válida, regrava **uma vez** com o CAS sobre a situação relida; se não, 409. É o precedente da casa: `FinancialTitleService.changeStatus` (`financial-title.service.ts:331-351`, B-SAN3-20 D8b: releitura → `assertStatusTransition` → uma retentativa → `409 title_status_conflict`). A resposta em corrida passa a ser a do caso sequencial, que é o que o próprio §2.2 promete;
  2. um predicado mais estreito que a igualdade (por exemplo, "a situação gravada ainda permite esta transição", ou "não terminal"), que fecha a sobrescrita do cancelamento sem recusar a corrida legítima;
  3. aceitar o 409 em toda corrida e mudar a asserção do `checklist-snapshot-dispatch` — o que o §3.4 proíbe e a frase "a mesma resposta de hoje" da decisão do dono não cobre.
  Qualquer uma muda o texto do §2.2/F2b e as mutações M13-M15b; pela `D-EMENDA-ANTES-DO-CODIGO`, vai como emenda escrita do plano e passa pela revisão antes do código.
- **Estado em que deixo:** ramo `fix/os-cancelada-sem-item-financeiro` empurrado, PR #536 aberto **como rascunho**, head com F0-F5 commitados; nada da forma do conserto acima foi escrito. Banco descartável e worktree da base removidos; worktree do bloco mantido.

## RETOMADA pela Emenda 1 e pela Emenda 1.1 (05:29 SP)

- **Decisão (Emenda 1, saída 1 da parada; precedente `FinancialTitleService.changeStatus`):** no CAS que casa 0, o serviço relê, revalida a MESMA operação sobre a situação relida e regrava UMA vez; se a revalidação falha, responde o erro do próprio check; a 2ª falha responde 409, sem laço. **Emenda 1.1** (crítica `crit-23-em1-cl`, `revisoes/crit-23-em1.json`): EM1-01 (uma mutação "apagar a revalidação" por escritor), EM1-02 (teste que conta as escritas), EM1-03 (tabela por escritor, com o escopo por objeto; o evento da regravação com a origem relida), EM1-04 (a mesma regra na unidade de memória; o CAS da memória sobre a OS viva, depois do `await`), EM1-05 (dois despachos concorrentes em Postgres), EM1-06 (M13-M15b mantidas).
- **Arquivo de teste novo, declarado:** `tests/b-san3-23-cas-retentativa.test.ts` (memória). O EM1-04 pede teste de memória, e ele não cabe no `-db`: aquele arquivo fixa `CORE_SAAS_PERSISTENCE=prisma` antes dos imports, e a porta de memória do cancelamento (`memoryFinancialsPort`) segue a persistência do processo. É acréscimo de teste, sem código de produto fora do PERMITIDO.

### F6a — os testes da emenda, vermelhos no head `992cfd82` (05:30–05:36 SP)

- `tests/b-san3-23-cas-retentativa.test.ts` (10 casos; gancho determinístico por Proxy sobre o repositório de memória, antes da n-ésima chamada do escritor; contador com guarda de laço em 5): `node --test --test-reporter=tap --import tsx tests/b-san3-23-cas-retentativa.test.ts` → `# tests 10 · # pass 2 · # fail 8`. Vermelhos pela asserção: EM1-02 (o 409 vinha na 1ª falha: `{changeStatus:1, …}`); escopo por objeto (`409/invalid_status_transition` onde a sequência dá `403/not_assigned_to_actor`); as duas regravações (409 em vez de regravar); as duas travas de técnico (409 `invalid_status_transition` em vez de `technician_change_requires_authorization`); EM1-04 cancelar(zero) × atribuir (`cancel=404/not_found assign=ok => assigned/null/ativos=0` na rodada 0); EM1-04 CAS vivo (`concluir/keep rodada 0: cancel=ok outro=ok => completed/null` — a sobrescrita pelo retrato velho). Os 2 verdes (concluir × cancelar; despachar × cancelar) são os casos em que o 409 de hoje coincide com o erro do check.
- `tests/b-san3-23-cancel-race-db.test.ts` + **A15c** (despacho do mesmo técnico em voo, com barreira) e **A15d** (N=10, `Promise.all`): `… --test-name-pattern="\[A15c\]|\[A15d\]"` → `# pass 0 · # fail 2`: A15c `rejected 409/invalid_status_transition` (barreira `bloqueado: UPDATE work_orders …`); A15d `fulfilled,rejected 409 => assigned/atrib=1` na rodada 0.
