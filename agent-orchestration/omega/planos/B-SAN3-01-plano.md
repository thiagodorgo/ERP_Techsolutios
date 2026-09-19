# PLANO — B-SAN3-01 · a web deixa de fabricar OS quando o backend recusa (P-008, item 4 do gate)

> **Papel:** `planejador-mestre` · **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`) — sem fallback ·
> **Corpo aplicado:** `origin/main@02bd7dab:.claude/agents/planejador-mestre.md` (lido via `git show`, não o da árvore da sessão) ·
> **Terreno:** worktree `.claude/worktrees/bsan301`, branch `fix/web-wo-sem-fallback-fabricado`, head `fef2421b` = `origin/main@02bd7dab` + comando · árvore limpa (`git status --short` vazio) · somente leitura.
> **Data:** 2026-09-13 · **Gravação:** incremental (P2) — cada seção com comando → saída.

## 0. Estado do plano (preenchido ao longo)
- [x] §1 Objetivo/ator/fluxo
- [x] §2 Censo dos `catch` que devolvem dado (gerado por script)
- [x] §3 Fronteira: dentro × fora (pendências nomeadas)
- [x] §4 Contrato
- [x] §5 Modelagem (n/a — frontend) + arquivos tocados
- [x] §6 Testes: baseline N, meta M≥2N, vermelho-controle
- [x] §7 CE-G2 papel × passo
- [x] §8 Bateria, riscos, rollback, junta

---

## 1. Objetivo · ator · fluxo origem→destino

**Objetivo.** Fechar o item 4 do gate (`P-008`, ALTA): a web deixa de fabricar dado quando o backend recusa ou responde
vazio. Hoje, em modo real (`VITE_USE_MOCKS != "true"`): lista vazia vira 6 OS inventadas com aviso falso "Sem conexão";
create recusado vira `OS-FALLBACK` (navega para `/work-orders/fallback-created-work-order`, que cai no mock `OS-000101`) e o
que o operador digitou some da tela; detalhe 404/erro vira `OS-000101` (Atlas Refrigeracao) com timeline inventada. O
censo (§2) mostra que a mesma classe existe na **timeline vazia** (3 eventos inventados) e no serviço de **despachos**
(4 despachos inventados — consumidos também pelo Dashboard). Depois do bloco: o erro real chega à tela como estado §7
(erro · vazio · acesso não permitido · desatualizado), o que foi digitado fica onde está, e nada navega para OS inexistente.

**Fora do objetivo (medido, não suposto).** Modo mock explícito (`isMockMode()`, `VITE_USE_MOCKS=true`) **permanece** —
é o interruptor de demonstração usado pelo harness `smoke-flow.test.tsx:1307-1330` e mostra o selo "Dados
demonstrativos" (`WorkOrdersPage.tsx:310-313`); matar o modo mock é assunto dos blocos "sem ficção" (`B-SAN3-06a/06b`),
não deste. Nenhuma tela nova; nada no app.

**Ator.** Papéis com `work_orders:read` (lista/detalhe/timeline) e `work_orders:create` (nova OS) — medidos no catálogo em
§7 (CE-G2). Na web: Gestor (`manager`), Admin da organização (`tenant_admin`), Operação de Campo (`field_dispatcher`);
o `operator` **lê mas não cria** (catálogo l.786-790 — sem `work_orders:create`).

**Fluxo origem→destino (hoje → depois).**

| Via | Origem (UI) | Chamada | Hoje (head-base `fef2421b`) | Depois |
|---|---|---|---|---|
| Lista | `/work-orders` (`WorkOrdersPage` → `useWorkOrders` → `listWorkOrdersFromApi`) | `GET /api/v1/work-orders` | 200 `[]` → 6 OS mock + banner "Sem conexão"; erro → 6 OS mock | 200 `[]` → `items: []` + estado vazio; erro → `items: []`, `source: "fallback"` + estado de erro com "Tentar novamente"; 403 → `forbidden` + "acesso não permitido"; falha em refresh de fundo → mantém a lista e marca desatualizada |
| Lista (reuso) | `/operations/dispatches` (enriquecimento) · `/operations/quotes` select de OS (`useServiceQuoteReferences`) | idem | recebem as 6 OS mock (o select de orçamento oferece OS falsas — `pendencias.md:423`) | recebem `items: []` honesto; contrato não lança (compatível) |
| Criar | `/work-orders/new` (`WorkOrderCreatePage` → `createWorkOrder`) | `POST /api/v1/work-orders` | 4xx/5xx/rede → `OS-FALLBACK` e `navigate(/work-orders/fallback-created-work-order)` (digitado perdido); 2xx sem OS → idem | erro → `ApiError` propaga → mensagem por status/`reason` na própria página; **sem navegar**; `WorkOrderForm` mantém o estado (árvore estável); 2xx sem OS → `Error("invalid_work_order_response")` (espelho de `duplicateWorkOrder` l.176-178) e mensagem honesta ("pode ter sido criada — confira a lista") |
| Detalhe | `/work-orders/:id` (`WorkOrderDetailPage` → `useWorkOrderDetail` → `getWorkOrderFromApi` + `getWorkOrderTimeline`) | `GET /api/v1/work-orders/:id` · `GET …/timeline` | 404/403/5xx/2xx-inválido → `OS-000101` mock + banner "dados locais"; timeline vazia → 3 eventos mock; timeline erro → 3 eventos mock | 404 → `notFound` → "Ordem de serviço não encontrada" (copy já existente l.50-57); 403 → `forbidden` → acesso não permitido; outro erro → estado de erro + retry; timeline vazia → "Sem eventos registrados." (copy já existente `GeneralInfoTab.tsx:172`); timeline erro → `[]` + "Histórico indisponível no momento."; refresh de fundo falho → mantém a OS e marca desatualizada |
| Mutação 2xx-sem-OS | `updateWorkOrder`/`advanceWorkOrderStatus`/`assignWorkOrder`/`cancelWorkOrder`/`correctMileage` | PATCH/POST | `?? getMockWorkOrderDetail(id)` (l.83/110/121/151/211) | `throw new Error("invalid_work_order_response")` (espelho l.177); chamadores já capturam (§2.3) |
| Despachos | `/operations/dispatches`, Dashboard (`useDashboardData.ts:80`), aba Mobile da OS (`MobileTab.tsx:105`) | `GET /api/v1/operations/dispatches` | 200 `[]` → 4 despachos mock; erro → 4 mock; create/status/reassign 2xx-sem-despacho → mock | 200 `[]` → `[]`; erro → `[]` + `fallbackReason`; 2xx-sem-despacho → `throw new Error("invalid_dispatch_response")` |

---

## 2. Censo — todo `catch`/`.catch`/`?? mock` do frontend que devolve valor (gerado por script, não curado)

**Comando** (script em `scratchpad/scan-catch.mjs`; varre `frontend/src/**/*.{ts,tsx}` exceto `*.test.*`, extrai o corpo
balanceado de cada `catch {...}`, cada `.catch(...)` e cada `?? <mock|fallback|seed|demo>`, e marca os que **devolvem valor
sem relançar**):

```
node scratchpad/scan-catch.mjs <worktree>/frontend/src
FILES=595 OCCURRENCES=350 RETURN_VALUE_NO_RETHROW=127
```
(saída completa em `scratchpad/scan-catch.out.txt`). A classificação abaixo foi feita **lendo o corpo** de cada uma das 127.

### 2.1 Classes encontradas (127 ocorrências)

| Classe | O que devolve | N | Veredito |
|---|---|:-:|---|
| **A — fabrica entidade** (mock com id/código/nome) | `getMock*`, `OS-FALLBACK`, `mockDispatchItems[0]` | **19** | **é a propriedade do bloco** — 17 na fronteira, 1 na fronteira com consumidor fora, 1 morta (§2.2, §3) |
| B — `?? fallback` de parâmetro/default local | `fallbackTotal`, `fallbackTone`, `fallbackCurrency`, `fallbackFileName`, `readFrontendEnv(..., fallback)` | 22 | não é erro de backend; default de formatação/config |
| C — vazio honesto + motivo (padrão D-007) | `{ items: [], source: "fallback", fallbackReason }`, `[]`, `emptyX("fallback")` | 62 | honesto; 34 delas **não distinguem 403 de 5xx** (estado §7 "acesso não permitido" ausente) — classe diferente, fora deste bloco |
| D — vazio honesto **com** 403 distinto | `{ ...empty, forbidden: true }` / `"forbidden"` | 12 | é o **espelho** que este bloco adota (`attachments.service.ts:32`, `platform-tenant-detail.service.ts:26-38`, `sessions.service.ts:19`) |
| E — mapeia erro para estado/mensagem | `interpretSettleError`, `mapTelemetryError`, `setError(...)`, `return message` | 9 | honesto |
| F — formatação segura | `Intl.NumberFormat` em moeda desconhecida, `""` | 3 | honesto |

### 2.2 Classe A — as 19 ocorrências, uma a uma (arquivo:linha · o que devolve · tela que consome · fronteira)

| # | Arquivo:linha | Gatilho | Devolve | Tela que consome | Fronteira? |
|---|---|---|---|---|---|
| 1 | `work-orders/work-orders.service.ts:28` | 200 com lista vazia | `getMockWorkOrdersData("fallback", "A API retornou lista vazia.")` — 6 OS | `/work-orders` (lista + 4 KPIs), `/operations/dispatches` (enriquecimento), `/operations/quotes` (select de OS) | **sim** |
| 2 | `...work-orders.service.ts:30-31` | catch (4xx/5xx/rede) | idem, 6 OS + "Nao foi possivel consultar..." | idem | **sim** |
| 3 | `...work-orders.service.ts:46-47` | catch no create | `{...mock("new"), ...payload, id: "fallback-created-work-order", code: "OS-FALLBACK"}` e a página navega | `/work-orders/new` -> `/work-orders/fallback-created-work-order` (-> #5 -> `OS-000101`) | **sim** |
| 4 | `...work-orders.service.ts:50` | 2xx sem OS parseável no create | idem `OS-FALLBACK` | idem | **sim** |
| 5 | `...work-orders.service.ts:60-65` | catch no detalhe (404/403/5xx/rede) | `getMockWorkOrderDetail(id)` = `mockWorkOrderItems.find ?? [0]` = `OS-000101` com `links`/`checklists` inventados | `/work-orders/:id` (todas as abas, barra de ações) | **sim** |
| 6 | `...work-orders.service.ts:68-72` | 2xx sem OS parseável no detalhe | idem | idem | **sim** |
| 7 | `...work-orders.service.ts:238` | 200 com timeline vazia | `getMockWorkOrderTimeline(id)` — 3 eventos ("criada", "atribuída", "iniciou deslocamento") | `/work-orders/:id` aba Informações gerais, bloco "Histórico" | **sim** |
| 8 | `...work-orders.service.ts:239-240` | catch na timeline | idem | idem | **sim** |
| 9 | `...work-orders.service.ts:83` | 2xx sem OS em `updateWorkOrder` | `?? getMockWorkOrderDetail(id)` | **zero chamadores** (export morto — medido por grep: só o próprio service e o `export *` do index) | **sim** |
| 10 | `...work-orders.service.ts:110` | 2xx sem OS em `advanceWorkOrderStatus` | idem | `/work-orders` ação "Dar andamento" (`runAdvance`, retorno ignorado + refresh; try/catch l.26-33) | **sim** |
| 11 | `...work-orders.service.ts:121` | 2xx sem OS em `assignWorkOrder` | idem | **zero chamadores** (export morto) | **sim** |
| 12 | `...work-orders.service.ts:151` | 2xx sem OS em `cancelWorkOrder` | idem | `CancelWorkOrderModal` (try/catch l.92) | **sim** |
| 13 | `...work-orders.service.ts:211` | 2xx sem OS em `correctMileage` | idem | `MileageTab` (try/catch l.109) | **sim** |
| 14 | `operations/dispatches/dispatches.service.ts:35` | 200 com lista vazia | `getMockDispatchesData("fallback", ...)` — 4 despachos `dispatch-000101..104` | `/operations/dispatches`, **Dashboard** (`useDashboardData.ts:80`, painel de despachos), aba Mobile da OS (`MobileTab.tsx:105`, filtra por OS) | **sim** (arquivo nomeado no §5) |
| 15 | `...dispatches.service.ts:37-38` | catch na lista | idem | idem | **sim** |
| 16 | `...dispatches.service.ts:55-60` e `63-67` | catch / 2xx-inválido no detalhe | `getMockDispatchDetail(id)` = `mockDispatchItems.find ?? [0]` com timeline inventada | `/operations/dispatches` painel de detalhe (`OperationsDispatchesPage.tsx:63-67 loadDetail`) | **arquivo sim, consumidor não** — §3.2 |
| 17 | `...dispatches.service.ts:78` | 2xx sem despacho em `createDispatch` | `{...mock, ...payload, id: "fallback-created-dispatch"}` | `/operations/dispatches` (form), Mapa Operacional (`useAllocateDispatch.ts:43`, try/catch) | **sim** |
| 18 | `...dispatches.service.ts:89` e `:100` | 2xx sem despacho em status/reassign | `?? getMockDispatchDetail(id)` | `/operations/dispatches` (ações rápidas), `/work-orders` "Revogar envio" (`runRevokeConfirm`, try/catch) | **sim** |
| 19 | `work-orders/repository.ts:11` | qualquer id desconhecido | `mockWorkOrders.find ?? [0]` (de `frontend/src/mocks/`) | **nenhuma rota**: importado só por `frontend/src/pages/WorkOrder{sList,Form,Detail}Page.tsx`, que **não estão em `App.tsx`** (medido: `App.tsx:31-55` importa só `modules/work-orders/pages/*`) | arquivo na fronteira, **código morto** — §3.3 |

Contagem por fronteira: **17 dentro** (#1-#15, #17, #18) · **1 dentro-com-consumidor-fora** (#16) · **1 morta** (#19).
Origem (evidência de escopo): `work-orders.service.ts` inteiro nasce em `9f12ea99` (2026-06-09, "feat: add work orders
UI"); `dispatches.service.ts` em `5aa14ec8` (2026-06-10). Tudo `pre-existente` ao bloco; o bloco existe para consertar
#1-#15, #17 e #18.

### 2.3 Fora da classe A, achados na varredura e relevantes (viram pendência em §3 ou nota)

| Arquivo:linha | O que faz | Por que importa | Tratamento |
|---|---|---|---|
| `patios/profiles/profiles.service.ts:95-99` | catch em `GET /jurisdiction-defaults` devolve `resolveLocalDefaults(scope)` (baseline federal local) | pré-preenche o form de perfil NOVO com valores locais quando o backend falhou — dado no lugar do erro (mesma constante do backend segundo o comentário l.90-91, mas o usuário não fica sabendo que a consulta falhou) | pendência §3.4 (fora da fronteira; origem `11a1f533`, 2026-07-26) |
| `work-orders/components/tabs/QuoteTab.tsx:85-87` | linhas de um orçamento falham e viram `{ items: [], totalAmount: 0, currency }` | total R$ 0,00 exibido para um orçamento cujas linhas não carregaram — número no lugar do erro; arquivo travado para `B-SAN3-08` (§6 do plano) | pendência §3.4 (origem `5c5571b6`, 2026-07-15) |
| `layouts/AppShell.tsx:79,92` | catch faz `setUnread(0)` / `setPendingApprovals(0)` | badge "0" no lugar do erro (não fabrica entidade) | nota, BAIXA; fora da fronteira (origem `1a76c913`, 2026-07-02) |
| `auth/auth.service.ts:39` | `getStoredAuthSession() ?? mockSession` | só dentro de `if (isMockMode())` — não é falha de backend | nada |
| `registry/service-quotes/useServiceQuoteReferences.ts:50-61` | `Promise.all` sem catch sobre 3 services | hoje depende de os services **nunca lançarem**; com o contrato do §4 (lista não lança) continua válido; em erro os selects ficam vazios **sem mensagem** | arquivo está na fronteira; **zero diff** necessário (medido); a degradação silenciosa vira pendência para `B-SAN3-08` (§3.4) |
| `operations/dispatches/components/DispatchCreateForm.tsx:32-42` + `OperationsDispatchesPage.tsx:112-116,152-156,170-174` | `await onSubmit(...)` sem try/catch; `setSaving(false)` nunca roda no erro | **hoje** um 4xx/5xx real em `createDispatch` (que já não engole non-2xx) vira rejeição não tratada e o form fica "salvando"; o `throw` do 2xx-inválido (#17) **não cria classe nova** de falha | pendência §3.4 (origem `5aa14ec8`, 2026-06-10) |

---

## 3. Fronteira: o que este bloco conserta · o que vira pendência nomeada

### 3.1 Dentro — consertadas neste bloco (17 + 2 mortas neutralizadas)

Censo §2.2 #1-#15, #17, #18. As duas exportações mortas (#9 `updateWorkOrder`, #11 `assignWorkOrder`) recebem o mesmo
`throw` das vivas (custo zero, evita que um chamador futuro herde o mock) — **não** são removidas (remoção de export é
faxina, não este bloco).

### 3.2 Dentro do arquivo, consumidor fora — decisão pedida ao orquestrador (#16)

`getDispatchFromApi` (`dispatches.service.ts:42-68`) fabrica `dispatch-000101` no erro; o único consumidor é
`OperationsDispatchesPage.tsx:63-67` (`loadDetail`), **fora** do escopo permitido (o comando nomeia só o service). Não há
conserto honesto que caiba só no service: devolver `dispatch: null` muda o tipo e obriga a página (6-8 linhas: manter o item
da lista já selecionado e mostrar "Não foi possível carregar os detalhes deste despacho."); lançar deixa a rejeição sem
tratamento (a página chama `void loadDetail(...)`). Duas saídas, ambas honestas:

- **(a) ampliação nominal** de `frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx`
  **só** para `loadDetail` (mesmo módulo do service nomeado) — o plano recomenda esta; o diff é medido pela junta;
- **(b) negada:** `getDispatchFromApi` **não é tocado** (nada de meio-conserto silencioso) e a pendência
  `P-SAN3-01-DESPACHO-DETALHE-FABRICADO` (§3.4) fica aberta com dono.

O plano segue com (a) salvo veto do orquestrador; os testes X8/X9 (§6) só entram com (a).

### 3.3 Código morto na fronteira (#19) — neutralizado, não removido

`work-orders/repository.ts` + `frontend/src/pages/WorkOrder{sList,Form,Detail}Page.tsx` + `frontend/src/mocks/work-orders/`
não têm rota (`App.tsx` só importa `modules/work-orders/pages/*`; origem `fb0ea65b`, 2026-05-26). Os componentes
legados `WorkOrdersTable`/`WorkOrderDetailPanel`/`WorkOrderAssignForm`/`WorkOrderTimeline` só são importados por
`frontend/tests/smoke-flow.test.tsx:1322-1323` (modo mock). Nada disso alcança um usuário; remover é faxina de
`frontend/src/pages/**` (fora do permitido) → pendência §3.4 com sugestão de bloco. **Consequência medida para o e2e:** as
âncoras "Alterar status" (`WorkOrdersTable.tsx:45`), "Atribuir operador" (`WorkOrderAssignForm.tsx:40`), "Total de OS",
"Nenhuma OS encontrada", "Buscar por codigo, titulo ou cliente" e o heading sem acento "Ordens de Servico" do caso
l.196-220 **não existem em nenhuma tela roteada** — o caso já estava defasado antes deste bloco e só "passava" porque a
lista vazia do seed virava `OS-000101` (§6.4).

### 3.4 Pendências nomeadas (registrar em `agent-orchestration/controle/pendencias.md` + índice, no PR deste bloco)

| ID | Achado (prova) | Escopo | Dono proposto | Severidade |
|---|---|---|---|---|
| `P-SAN3-01-DESPACHO-DETALHE-FABRICADO` | `dispatches.service.ts:55-67` fabrica `dispatch-000101` com timeline no erro; consumidor `OperationsDispatchesPage.tsx:63-67` | `pre-existente` (`5aa14ec8`, 2026-06-10) | resolvida neste bloco se §3.2(a); senão `B-SAN3-06a` (único bloco SAN3 que toca `operations/**` da web) | ALTA |
| `P-SAN3-01-DESPACHO-FORMS-SEM-CATCH` | `DispatchCreateForm.tsx:32-42`, `OperationsDispatchesPage.tsx:112-116/152-156/170-174`: `await onSubmit` sem catch; 4xx/5xx real já vira rejeição não tratada e form preso em "salvando" | `pre-existente` (`5aa14ec8`) | `B-SAN3-06a` (ou o bloco que absorver a (a)) | MÉDIA |
| `P-SAN3-01-ORCAMENTO-LINHAS-TOTAL-ZERO` | `QuoteTab.tsx:85-87`: linhas falham → `totalAmount: 0` exibido como total | `pre-existente` (`5c5571b6`, 2026-07-15); arquivo travado `SAN3-01 → SAN3-08` (§6) | `B-SAN3-08` | MÉDIA |
| `P-SAN3-01-ORCAMENTO-SELECTS-SEM-ERRO` | `useServiceQuoteReferences.ts:50-61`: erro em qualquer dos 3 services deixa os selects vazios sem mensagem (`OrcamentosPage.tsx:65`) | `pre-existente` (`42522f95`, 2026-07-13) | `B-SAN3-08` (dono de `service-quotes/**`) | BAIXA |
| `P-SAN3-01-JURISDICAO-DEFAULTS-LOCAIS` | `patios/profiles/profiles.service.ts:95-99`: `GET /jurisdiction-defaults` falha → form de perfil novo pré-preenchido com baseline local sem avisar | `pre-existente` (`11a1f533`, 2026-07-26) | fila pós-gate (§7.3 do plano) — nenhum bloco SAN3 toca `patios/profiles` | BAIXA |
| `P-SAN3-01-OS-LEGADO-MORTO` | `frontend/src/pages/WorkOrder{sList,Form,Detail}Page.tsx`, `work-orders/repository.ts`, `mocks/work-orders/`, componentes legados (§3.3) sem rota | `pre-existente` (`fb0ea65b`, 2026-05-26) | fila pós-gate — sugestão `B-WEB-FAXINA-OS-LEGADO` (frontend, maioria) | BAIXA |
| `P-SAN3-01-SHELL-BADGES-ZERO-NO-ERRO` | `AppShell.tsx:79,92`: contadores viram 0 no erro | `pre-existente` (`1a76c913`, 2026-07-02) | fila pós-gate | BAIXA |

`P-008` → **FECHADA** pelo PR deste bloco (prova: testes §6 com vermelho-controle + e2e §6.4). A linha do item 4 em
`docs/revisoes/SAN3/PLANO_SAN3.md` §4.1 é `docs/` (fora do permitido): o fechamento vai em `status-geral.md` e no log;
o orquestrador decide se atualiza a célula do plano no mesmo PR.

### 3.5 Travas do §6 do plano SAN3 (conferidas)

- QuoteTab (`SAN3-01 → SAN3-08`): **não tocada** (a ocorrência `QuoteTab.tsx:85` é pendência de `SAN3-08`).
- Aba Financeiro e serviço de OS (`SAN3-01 → SAN3-25`): `work-orders.service.ts` **é tocado** aqui → `SAN3-25` espera este merge (como o plano prevê). `FinancialTab.tsx` não é tocada.
- `tests/e2e/**` (`SAN3-01 → SAN3-10`): `critical-flows.spec.ts` é tocado aqui → `SAN3-10` espera.

---

## 4. Contrato (rotas, envelopes, códigos) e o contrato dos services depois do bloco

### 4.1 Backend (medido — não muda neste bloco; `src/**` é proibido)

| Rota | Permissão comparada (`work-order.routes.ts`) | 2xx | Erros relevantes |
|---|---|---|---|
| `GET /api/v1/work-orders` | `work_orders:read` (l.70-72) | 200 `{ items, pagination }` via `toWorkOrderListDto` (o adapter aceita `items`, `data`, `data.items` — `work-orders.adapter.ts:92-97`) | 401/403 (gate); 5xx |
| `POST /api/v1/work-orders` | `work_orders:create` (l.111-113) | 201 `{ data: WorkOrder }` | 400 `WORK_ORDER_INVALID` (`invalid_customer_reference`, `invalid_<entity>_reference`, `invalid_date` — service l.510/633/672); **422** `destination_required` (service l.691-721: tipo do catálogo exige destino); 403; 5xx |
| `GET /api/v1/work-orders/:id` | `work_orders:read` (l.119-121) | 200 `{ data: WorkOrder }` | **404** `WORK_ORDER_NOT_FOUND`/`not_found` (service l.202 — inclusive cross-tenant, sem vazar existência); 403; 5xx |
| `GET /api/v1/work-orders/:id/timeline` | `work_orders:read` (l.203-205) | 200 `{ data: WorkOrderEvent[] }` | 404; 403; 5xx |
| `GET /api/v1/operations/dispatches` | `field_dispatch:read` | 200 `{ items, pagination }` | 403; 5xx |

O `ApiError` do cliente (`services/api/client.ts:10-38`) já carrega `status`, `code` e `reason` do envelope `{ error: { code, reason } }`
— a discriminação 404/403/422 é feita por ele; nada de ler corpo cru.

### 4.2 Services depois do bloco (modo real; modo mock inalterado)

```ts
// work-orders.service.ts
listWorkOrdersFromApi(ctx, params): Promise<WorkOrdersData>
//  200 c/ itens  -> { items, pagination, source: "api" }                       (inalterado)
//  200 vazio     -> { items: [], pagination, source: "api" }                    (NOVO; antes: 6 mock)
//  403           -> { items: [], pagination: EMPTY, source: "fallback", fallbackReason, forbidden: true }
//  4xx/5xx/rede  -> { items: [], pagination: EMPTY, source: "fallback", fallbackReason, forbidden: false }
//  NÃO lança (mantém o contrato dos 3 consumidores; espelho: customers.service.ts:24-31 + attachments.service.ts:32)

createWorkOrder(ctx, payload): Promise<WorkOrderDetail>
//  201 c/ OS     -> WorkOrderDetail                                            (inalterado)
//  non-2xx/rede  -> throw ApiError (status/code/reason)                        (NOVO; antes: OS-FALLBACK)
//  2xx sem OS    -> throw new Error("invalid_work_order_response")             (espelho duplicateWorkOrder l.176-178)

getWorkOrderFromApi(ctx, id): Promise<WorkOrderDetailResult>
//  type WorkOrderDetailResult = { workOrder: WorkOrderDetail | null; source: WorkOrdersSource;
//                                 fallbackReason?: string; notFound?: boolean; forbidden?: boolean }
//  200 c/ OS     -> { workOrder, source: "api" }
//  404           -> { workOrder: null, source: "api", notFound: true }          (espelho platform-tenant-detail l.33)
//  403           -> { workOrder: null, source: "fallback", forbidden: true, fallbackReason }
//  outro/2xx-inv -> { workOrder: null, source: "fallback", fallbackReason }
//  NÃO lança

getWorkOrderTimeline(ctx, id): Promise<WorkOrderEvent[]>
//  200           -> eventos (vazio -> [])                                       (NOVO; antes: 3 mock no vazio)
//  erro          -> throw ApiError                                               (o hook captura; §4.3)

updateWorkOrder / advanceWorkOrderStatus / assignWorkOrder / cancelWorkOrder / correctMileage
//  2xx sem OS    -> throw new Error("invalid_work_order_response")              (antes: ?? getMockWorkOrderDetail)
//  non-2xx       -> throw ApiError                                               (inalterado — já não engoliam)

// dispatches.service.ts
listDispatchesFromApi(ctx, params, opts): Promise<DispatchesData>
//  200 vazio     -> { ...data, items: [] } source "api"                          (NOVO; antes: 4 mock)
//  403           -> { items: [], pagination: EMPTY, source: "fallback", fallbackReason: "Sem permissão para consultar os despachos." }
//  outro erro    -> { items: [], pagination: EMPTY, source: "fallback", fallbackReason }
//  (sem campo novo: `dispatches.types.ts` não está no permitido; 403 se distingue pela razão)
createDispatch / updateDispatchStatus / reassignDispatch
//  2xx sem despacho -> throw new Error("invalid_dispatch_response")             (antes: ?? mock)
getDispatchFromApi — só com §3.2(a): { dispatch: DispatchDetail | null; source; fallbackReason?; notFound?; forbidden? }
```

### 4.3 Hooks e páginas — as regras de estado (§7), sem dado inventado

1. **Vazio ≠ erro ≠ sem permissão ≠ não encontrada.** Cada um tem painel próprio, marcado por `data-state="empty" | "error" | "forbidden" | "not-found"` no elemento raiz do painel (é por esse atributo que os testes SSR afirmam o estado — comportamento, não cópia).
2. **Erro nunca vira número.** Com `source === "fallback"` na lista, os 4 `KpiStatCard` recebem `value="—"` (o prop aceita `string | number`, `KpiStatCard.tsx:20`) e sem `tag`; `kpiDetails` não é oferecido (sem pop-up sobre "0"). Contagem "N ordens" da toolbar não é renderizada no erro.
3. **Falha em refresh de fundo não apaga a tela.** `useAutoRefresh` chama `refresh(true)`; se a chamada falhar e já houver dado carregado, o dado fica e `stale: true` acende uma faixa "Dados desatualizados — última atualização às HH:MM · Tentar novamente" (§7 "dados desatualizados"). Só a primeira carga / refresh explícito troca a tela pelo estado de erro. Regra implementada em reducers puros (`work-orders.state.ts`, §5) para ser testável no harness SSR.
4. **Create:** erro → `Alert` na própria página com mensagem por `reason`/status (tabela em `createErrorMessage`: `destination_required` → "Este tipo de serviço exige endereço de destino."; `invalid_*_reference` → "Um dos vínculos informados não é válido nesta organização."; 403 → "Sem permissão para criar ordens de serviço."; 409 → `safeMessage`; `invalid_work_order_response` → "O servidor não devolveu a OS criada. Confira a lista antes de tentar de novo — ela pode ter sido criada."; padrão → `ApiError.safeMessage`); **nunca navega** sem `workOrder.id`; o `WorkOrderForm` mantém o estado porque continua montado na mesma posição da árvore (`{error ? <Alert/> : null}` antes dele — `WorkOrderCreatePage.tsx:50-51`). O botão volta de "Salvando" para "Salvar OS".
5. **Detalhe:** `notFound` → painel existente "Ordem de serviço não encontrada" (copy `WorkOrderDetailPage.tsx:53-54`, agora com `data-state="not-found"`); `forbidden` → "acesso não permitido" (mesmo componente/copy que o shell de abas usa para `accessAllowed=false`, §7); erro → painel `data-state="error"` com "Tentar novamente"; o banner "Sem conexão com a API — exibindo dados locais desta OS" (l.64-66) **sai** — não há dados locais. Timeline: `[]` → "Sem eventos registrados." (`GeneralInfoTab.tsx:172`, inalterado); erro → prop nova `timelineUnavailable` → "Histórico indisponível no momento." (distinto do vazio).
6. **Lista:** banner atual "Sem conexão com a API — exibindo dados locais." (`WorkOrdersPage.tsx:302-309`) vira o painel de erro (`role="alert"`, "Não foi possível carregar as ordens de serviço." + "Tentar novamente"); o vazio real usa o painel já existente l.371-377 com `data-state="empty"`.
7. **Sem termo técnico** (§3 do contrato): nenhuma mensagem exibe `reason`, `code`, status HTTP ou "fallback"/"mock"/"API".

---

## 5. Modelagem · arquivos tocados (caminhos exatos, regra do espelho)

**Modelagem:** n/a — bloco 100% frontend + e2e + registro. Zero model, zero migration, zero mudança de contrato do backend.
Tipos novos são **aditivos** (campos opcionais; `WorkOrdersSource` = `"api" | "mock" | "fallback"` **não muda**, então
`mapWorkOrdersSource`/`KpiDetailModal` seguem intactos).

**Módulo de referência (espelho):** `frontend/src/modules/work-orders/work-orders-row.handlers.ts` + `frontend/tests/work-orders-row-actions.test.tsx`
(Ω3F-9: handler de efeito com deps injetadas, testado no harness SSR com `fetch` stubado e setters-espião — l.296-360). Para
o 404/403 do detalhe, o espelho é `frontend/src/modules/platform/platform-tenant-detail.service.ts:20-39`.

| Arquivo | Ação | O que muda |
|---|---|---|
| `frontend/src/modules/work-orders/work-orders.service.ts` | editar | #1-#13 do censo: remove os 3 `catch`-mock, o `?? mock` ×5 e o "vazio → mock" da lista e da timeline; 403/404 discriminados por `ApiError.status`; `getMockWorkOrders*` passam a ser importados **só** para os ramos `isMockMode()` (o guard G1 fiscaliza) |
| `frontend/src/modules/work-orders/work-orders.types.ts` | editar (aditivo) | `WorkOrdersData.forbidden?: boolean`; `export type WorkOrderDetailResult = {...}` (§4.2) |
| `frontend/src/modules/work-orders/work-orders.state.ts` | **novo** | reducers puros `nextListState(prev, result, background)` e `nextDetailState(prev, settled, background)` — decidem erro × vazio × forbidden × not-found × stale (regra §4.3-3) |
| `frontend/src/modules/work-orders/work-orders-create.handlers.ts` | **novo** | `runCreateWorkOrder(deps, payload)` (deps: `context`, `navigate`, `setSaving`, `setError`) + `createErrorMessage(err)` — espelho de `runAdvance` |
| `frontend/src/modules/work-orders/useWorkOrders.ts` | editar | usa `nextListState`; expõe `forbidden`, `stale`, `lastUpdatedAt` |
| `frontend/src/modules/work-orders/useWorkOrderDetail.ts` | editar | `Promise.allSettled`; usa `nextDetailState`; expõe `notFound`, `forbidden`, `error`, `stale`, `timelineUnavailable`, `lastUpdatedAt` |
| `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` | editar | estados §4.3-1/2/3/6; `data-state`; KPIs "—" no erro; sem literal "dados locais" |
| `frontend/src/modules/work-orders/pages/WorkOrderCreatePage.tsx` | editar | `submit` vira `runCreateWorkOrder({ context, navigate, setSaving, setError }, payload)`; `Alert` com a mensagem; form intacto |
| `frontend/src/modules/work-orders/pages/WorkOrderDetailPage.tsx` | editar | estados §4.3-5; remove banner l.64-66; mantém `work_orders:approve`/`canDecide` (l.35 — lidos por regex em `tests/approval-frontend-contract.test.ts:23-24`) |
| `frontend/src/modules/work-orders/components/tabs/GeneralInfoTab.tsx` | editar (aditivo) | prop `timelineUnavailable?: boolean` (default `false`); os marcadores `ApprovalPanel`/`Aprovar`/`Reprovar`/`canDecide` (contract test l.15-25) não são tocados |
| `frontend/src/modules/operations/dispatches/dispatches.service.ts` | editar | #14, #15, #17, #18 (+#16 com §3.2(a)) |
| `frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx` | **só com §3.2(a)**, `loadDetail` l.63-67 | `detail.dispatch ?? manter o item + nota de erro` |
| `frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts` | **zero diff** (medido §2.3) | — |
| `frontend/tests/work-orders-honest-errors.test.tsx` | **novo** | os testes do §6 (L/P/C/D/T/M/X/R/G/S) |
| `frontend/package.json` (script `test:smoke`) | editar, 1 linha | acrescenta o arquivo novo à lista explícita — sem isso o CI não o executa (não é lockfile; declarado aqui para o orquestrador) |
| `tests/e2e/critical-flows.spec.ts` | editar l.196-220 | caso "com fallback seguro" substituído pelos 3 casos do §6.4; helpers l.305-400 inalterados |
| `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` | editar | `P-008` FECHADA; 7 pendências do §3.4 |
| `agent-orchestration/codex/log-execucao.md` · `docs/status-geral.md` | editar | entrada do bloco |
| `agent-orchestration/omega/juntas/J-SAN3-01-web-wo-sem-fallback.md` | novo | ata da junta (§8.5) |
| `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` (+ `Kpis/index.html`/`app.js` só se o guard exigir) | editar | §8.6 |

**Não tocados (de propósito):** `work-orders.mock.ts` (modo mock explícito continua), `index.ts` (re-exporta o mock para o
harness), `WorkOrderTimeline.tsx`/`WorkOrdersTable.tsx`/`WorkOrderDetailPanel.tsx`/`WorkOrderAssignForm.tsx` (legados sem
rota), `QuoteTab.tsx`, `FinancialTab.tsx`, `frontend/src/pages/**`, `src/**`, `prisma/**`, `.github/**`, lockfiles.

---

## 6. Testes — baseline N, meta M >= 2N, vermelho-controle

### 6.1 Baseline (execução real, não copiado)

```
npm --prefix frontend run test:smoke      (worktree bsan301, head fef2421b, 2026-09-13)
# tests 1126 / # pass 1126 / # fail 0 / EXIT=0        (log: scratchpad/smoke-baseline.log)
```
Coincide com o KPI oficial (`frontend_smoke_tests = 1126/1126`, snapshot 2026-09-11). Backend oficial `2995/2997`
(reexecutado em 2026-09-11) — o dev **reexecuta** `npm test` neste PR porque `tests/approval-frontend-contract.test.ts`
lê `WorkOrderDetailPage.tsx` e `GeneralInfoTab.tsx` por texto (§C3.3).

**N = 0.** Nenhum teste do repositório exercita hoje `listWorkOrdersFromApi`, `createWorkOrder`, `getWorkOrderFromApi`,
`getWorkOrderTimeline` nem o fallback deles (medido: grep de `work-orders.service` em `frontend/tests` acha só
`work-orders-row-actions.test.tsx`, que importa `advanceWorkOrderStatus` via `runAdvance`; grep de `OS-FALLBACK` e
`getMockWorkOrder` em `frontend/tests` acha só o harness de modo mock em `smoke-flow.test.tsx:1324`). Meta M >= 2N é
trivial; a meta que vale é a de baixo: **>= 40 testes novos, 1126 -> >= 1166**, e cada teste que muda comportamento fica
**vermelho no head-base**.

### 6.2 Testes novos — `frontend/tests/work-orders-honest-errors.test.tsx` (node:test + tsx, mesmo harness)

Padrão: `globalThis.fetch` stubado por caso (como `work-orders-row-actions.test.tsx:236-263`), restaurado em `finally`;
contexto nominal `{ role: "manager", permissions: ["work_orders:read","work_orders:create"] }` (§7); `VITE_USE_MOCKS="false"`.
Asserções de **comportamento**: contagens, `source`, flags, `navigate` chamado/não chamado, `data-state`, igualdade do payload
antes/depois. Nenhuma asserção do tipo "contém OS-000101"; onde se afirma "não fabrica", afirma-se `items.length === 0`.

| ID | Caso | Afirma | Vermelho no head-base? |
|---|---|---|---|
| L1 | lista 200 `{ items: [], pagination }` | `items.length === 0`, `source === "api"`, `fallbackReason === undefined` | **sim** (hoje 6 itens, "fallback") |
| L2 | lista 500 | `items.length === 0`, `source === "fallback"`, `fallbackReason` string, `forbidden === false` | **sim** |
| L3 | lista 403 | `forbidden === true`, `items.length === 0` | **sim** |
| L4 | lista 200 com 2 itens | 2 itens, `source === "api"` | não (regressão) |
| L5 | lista: `fetch` lança `TypeError` (rede) | `source === "fallback"`, sem throw | **sim** |
| C1 | create 201 `{ data: { id, code, title, status, priority } }` via `runCreateWorkOrder` | `navigate` chamado 1x com `/work-orders/<id>`; `setError` nunca com mensagem; `setSaving` termina `false` | não (regressão) |
| C2 | create 422 `{ error: { code: "WORK_ORDER_UNPROCESSABLE", reason: "destination_required" } }` | `navigate` **não** chamado; `setError` com string não vazia; `payload` deep-equal ao original; `setSaving(false)` por último | **sim** (hoje navega para `fallback-created-work-order`) |
| C3 | create 400 `invalid_customer_reference` | idem C2; mensagem diferente da de C2 (tabela por `reason`) | **sim** |
| C4 | create 200 `{ data: {} }` (sem OS) | rejeita `invalid_work_order_response`; handler: sem `navigate`, `setError` com string | **sim** |
| C5 | create 403 | sem `navigate`, mensagem | **sim** |
| C6 | create `fetch` lança | sem `navigate`, mensagem | **sim** |
| C7 | `createErrorMessage`: para cada `reason` da tabela, mensagem sem `reason`/`code`/dígitos de status/"API"/"fallback" (regex negativa — regra §3 do contrato) | — | novo |
| D1 | detalhe 404 `{ error: { code: "WORK_ORDER_NOT_FOUND", reason: "not_found" } }` | `workOrder === null`, `notFound === true`, `forbidden !== true` | **sim** (hoje `OS-000101`) |
| D2 | detalhe 403 | `workOrder === null`, `forbidden === true` | **sim** |
| D3 | detalhe 500 | `workOrder === null`, `source === "fallback"`, `fallbackReason` | **sim** |
| D4 | detalhe 200 `{ data: {} }` | `workOrder === null`, `source === "fallback"` | **sim** |
| D5 | detalhe 200 válido | `workOrder.id` igual ao pedido, `source === "api"` | não (regressão) |
| T1 | timeline 200 `{ data: [] }` | `length === 0` | **sim** (hoje 3) |
| T2 | timeline 500 | rejeita `ApiError` status 500 | **sim** (hoje resolve com 3) |
| T3 | timeline 200 com 2 eventos fora de ordem | 2, ordenados por `createdAt` | não (regressão) |
| M1-M5 | `updateWorkOrder`/`advanceWorkOrderStatus`/`assignWorkOrder`/`cancelWorkOrder`/`correctMileage` com 200 `{ data: {} }` | rejeitam `invalid_work_order_response` | **sim** (5) |
| M6 | `runAdvance` com 200 `{ data: {} }` | `setError` por-linha, sem `refresh` (o `throw` novo é capturado onde o espelho já capturava) | **sim** |
| X1 | despachos 200 vazio | `items.length === 0`, `source === "api"` | **sim** (hoje 4) |
| X2 | despachos 500 | `items.length === 0`, `source === "fallback"` | **sim** |
| X3 | despachos 403 | `fallbackReason` diferente do de X2 | **sim** |
| X4-X6 | `createDispatch`/`updateDispatchStatus`/`reassignDispatch` com 200 `{ data: {} }` | rejeitam `invalid_dispatch_response` | **sim** (3) |
| X7 | despachos 200 com 1 item + `work-orders` 500 (enriquecimento) | 1 item sem código de OS, sem throw | não (regressão) |
| X8-X9 | **só com §3.2(a)**: `getDispatchFromApi` 404 / 500 | `dispatch === null` + `notFound` / `fallbackReason` | **sim** |
| R1 | `nextListState(prev com 3 itens, resultado fallback, background=true)` | mantém 3 itens, `stale === true`, `error` preenchido | novo |
| R2 | `nextListState(vazio, fallback, background=false)` | `items.length === 0`, estado "error" | novo |
| R3 | `nextListState(vazio, api vazio)` | estado "empty", `stale === false` | novo |
| R4 | `nextDetailState(prev com OS, detalhe rejeitado, background=true)` | mantém OS, `stale === true` | novo |
| R5 | `nextDetailState(vazio, {notFound})` | estado "not-found", `workOrder === null` | novo |
| R6 | `nextDetailState(_, detalhe ok + timeline rejeitada)` | `timeline.length === 0`, `timelineUnavailable === true` | novo |
| P1 | SSR do painel extraído `WorkOrdersLoadState` em estado erro (`renderToString`) | existe `[data-state="error"]`, não existe `[data-state="empty"]`, 0 linhas `.pat-os-row`, KPIs sem dígito | novo |
| P2 | idem forbidden | `[data-state="forbidden"]` | novo |
| P3 | idem api vazio | `[data-state="empty"]`, sem `role="alert"` | novo |
| P4 | SSR do painel do detalhe: not-found / forbidden / error / stale | 4 `data-state` distintos; no stale a OS continua no HTML | novo |
| G1 | guard estrutural: em `work-orders.service.ts` e `dispatches.service.ts`, toda linha com `getMock` está dentro de um `if (isMockMode())` de uma linha | mutação: reintroduzir `?? getMockWorkOrderDetail(id)` fica vermelho | **vermelho no head-base** (é o próprio defeito) |
| S1 | fiação: `WorkOrderCreatePage.tsx` chama `runCreateWorkOrder` e não chama `createWorkOrder` direto (lição Ω3F-9: handler testado != ligado) | — | **sim** |

Total: **48** (46 sem §3.2(a)). Vermelhos esperados no head-base: **31** (L1-L3, L5, C2-C6, D1-D4, T1-T2, M1-M6, X1-X6, X8-X9, G1, S1).

### 6.3 Protocolo do vermelho-controle (executado pelo dev, conferido pela junta)

1. Commit A na branch = **só os testes** (`frontend/tests/work-orders-honest-errors.test.tsx` + a linha do `package.json`).
   Rodar `node --test --import tsx frontend/tests/work-orders-honest-errors.test.tsx` e colar no PR a contagem
   `# fail` (esperado 31, mais os que forem "novo" e dependerem de módulo ainda inexistente), com os IDs vermelhos.
2. Commit B = o conserto (§5). Rodar de novo: `# fail 0`. Rodar a suíte inteira: `# tests >= 1166` e `# fail 0`.
3. A junta reexecuta o passo 1 em worktree próprio no commit A (não confia na colagem — §C7.1-bis).

### 6.4 `tests/e2e/critical-flows.spec.ts` — o caso l.196-220 muda assim

Estado medido do caso hoje: exige a OS inventada (`OS-000101|Nenhuma OS encontrada`, l.204) e, além do fallback, usa 6
âncoras que **não existem em nenhuma tela roteada** (§3.3) — só passava porque o seed demo **não cria nenhuma OS**
(`prisma/seed.ts` sem criação de OS; medido por grep) e a lista vazia virava mock. O e2e **não roda no CI**
(`.github/workflows/ci.yml` sem job e2e — item 42, `B-SAN3-10`), então ninguém viu. Ator: `admin.demo@example.com`, papel
`tenant_admin` (§7). O caso é substituído por três, com `page.route` para forçar recusas do servidor sem depender da
validação do backend (a propriedade em teste é a reação da web; o contrato do backend tem a própria suíte):

- **E1 — "lista honesta: o que a tela mostra é o que a API devolveu"**: `/work-orders`; captura a resposta de
  `GET **/api/v1/work-orders`; se `items.length === 0`, afirma `[data-state="empty"]` visível e `.pat-os-row` com count 0;
  senão, afirma que o conjunto de códigos renderizados nas linhas **é igual** ao conjunto de `code` da resposta. Em ambos:
  nenhum `role="alert"`.
- **E2 — "create recusado preserva o digitado e não navega; aceito navega para a OS real"**: `/work-orders/new`;
  preenche título `E2E-SAN3-01 <timestamp>` + descrição; `page.route` do `POST **/api/v1/work-orders` respondendo 422
  `{ error: { code: "WORK_ORDER_UNPROCESSABLE", reason: "destination_required", message: "" } }` (uma vez); "Salvar OS";
  afirma URL ainda `/work-orders/new`, `role="alert"` visível, o campo de título `toHaveValue` do que foi digitado,
  descrição idem, botão de salvar habilitado de novo. `unroute`; "Salvar OS" de novo; URL casa com
  `/work-orders/<uuid>` (36 caracteres hex e hífens), heading contém o título digitado, e `GET **/api/v1/work-orders/<id>`
  respondeu 200 (nada navegou para OS inexistente). Resíduo: fica uma OS com prefixo `E2E-SAN3-01` no tenant demo
  (declarado; cancelar exige decisão financeira e não é o objeto do teste).
- **E3 — "detalhe inexistente e detalhe com erro são estados, não dados"**: `/work-orders/00000000-0000-4000-8000-000000000000`;
  backend 404 real; `[data-state="not-found"]` visível, nenhum heading com "OS-" e nenhuma aba renderizada. Depois
  `page.route` de `GET **/api/v1/work-orders/<uuid real criado em E2>` respondendo 500: `[data-state="error"]` com o botão
  "Tentar novamente"; `unroute`; clique; a OS real aparece.

O que sai: as âncoras mortas (§3.3) e a busca com placeholder inexistente; a busca passa a usar
`getByRole("textbox", { name: /Buscar/ })` (aria-label real, `WorkOrdersPage.tsx:328`). Execução: `npm run test:e2e` local
(Postgres + seed), saída colada no PR; se a infra não estiver disponível ao dev, o PR diz isso **em vez de** afirmar verde.

---

## 7. CE-G2 — papel × passo (permissões medidas no catálogo × permissão que a rota compara)

Fonte: `src/modules/core-saas/permissions/catalog.ts` (atribuição por bloco de papel gerada por script sobre o arquivo —
`ROLE_PERMISSIONS` l.412-1014) e `src/modules/work-orders/work-order.routes.ts` (`WORK_ORDER_PERMISSIONS` l.30-34).

| Papel | `work_orders:read` | `work_orders:create` | Evidência |
|---|:-:|:-:|---|
| `tenant_admin` | sim | sim | `TENANT_ADMIN_PERMISSIONS = PERMISSION_CATALOG.filter(...)` (l.407; catálogo l.24-25 traz ambas) |
| `manager` | sim | sim | l.430, l.432 |
| `field_dispatcher` | sim | sim | l.655, l.657 |
| `operator` | sim | **não** | l.786-790 (read/comment/update/status/mileage_correct) |
| `technician` / `field_technician` / `viewer` / `auditor` | sim | não | l.609 / l.927 / l.722 / l.997 |
| `finance` / `inventory` / `support` | não | não | (o `work_orders:read` do `finance` é o CE-3 do `B-SAN3-04a`, fora deste bloco) |

| Passo de teste | Rota → permissão comparada | Papel que executa | Tem a permissão? |
|---|---|---|---|
| L1-L5, X7, E1 | `GET /work-orders` → `work_orders:read` (routes l.70-72) | unit: `manager` (nominal no contexto) · e2e: `tenant_admin` | sim / sim |
| C1-C6, E2 | `POST /work-orders` → `work_orders:create` (l.111-113) | unit: `manager` · e2e: `tenant_admin` | sim / sim |
| D1-D5, E3 | `GET /work-orders/:id` → `work_orders:read` (l.119-121) | idem | sim |
| T1-T3 | `GET /work-orders/:id/timeline` → `work_orders:read` (l.203-205) | idem | sim |
| M1-M6 | PATCH `/:id` (`:update`), `/:id/status` (`:status`), `/:id/assign` (`:assign`), `/:id/cancel` (`:cancel`), `/:id/mileage` (`:mileage_correct`) | unit: `manager` (tem as 5: l.430-436 + `mileage_correct` do bloco Ω3F-7a) | sim — e o teste é de **2xx malformado**, não de permissão |
| X1-X6 | `GET/POST/PATCH /operations/dispatches…` → `field_dispatch:*` | unit: `manager` | sim (`field_dispatch:*` no bloco manager) |
| L3, D2, X3 (403) | as mesmas rotas | unit: contexto **sem** a permissão (o stub devolve 403) | é o caso negativo — o papel não tem, e é isso que se afirma |

**E2e:** `admin.demo@example.com` recebe `role_id: tenantAdminRole.id` (`prisma/seed.ts:279` `roles.get("tenant_admin")`,
permissões provisionadas de `ROLE_PERMISSIONS[role]` em `seed.ts:256`). A helper `enableWorkOrdersFrontendContext`
(`critical-flows.spec.ts:368-388`) injeta `work_orders:*` **só no `localStorage` do contexto ativo** — molda a UI; a
autoridade é o JWT do backend, que para `tenant_admin` já traz `read`+`create`. Nenhum passo do e2e usa `operator` para
criar (não teria a permissão).

---

## 8. Bateria · riscos · rollback · junta · KPI

### 8.1 Bateria (a do comando, com a forma), na ordem

```bash
# no worktree do bloco
npm --prefix frontend ci
node --test --import tsx frontend/tests/work-orders-honest-errors.test.tsx   # commit A: vermelho-controle (≈31 fail); commit B: 0 fail
npm --prefix frontend run check
npm --prefix frontend run build
npm --prefix frontend run test:smoke                                          # esperado: # tests ≥ 1166 · # fail 0
node --test --import tsx tests/approval-frontend-contract.test.ts             # lê WorkOrderDetailPage/GeneralInfoTab por texto
npm test                                                                      # suíte backend inteira (§C3.3) — publica a contagem real
npm run test:e2e                                                              # local, Postgres + seed; E1-E3; saída no PR (ou a declaração de que não rodou)
node --check Kpis/app.js && node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts                   # guard do painel (roadmap/série)
git diff --check
```

### 8.2 Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Telas fora da fronteira que **consumiam** o mock passam a ver vazio/erro: painel de despachos do Dashboard (`useDashboardData.ts:80`), select de OS do orçamento, enriquecimento em Despachos | é o efeito desejado; `useDashboardData` já usa `allSettled` e trata `source`; o `cognicao-visual` confere o vazio do Dashboard e da lista de Despachos |
| R2 | Auto-refresh (`useAutoRefresh`) falhando de forma transitória apagaria a tela | regra §4.3-3 (stale) com R1/R4 — a junta muta o reducer para provar |
| R3 | Teste novo fora do script `test:smoke` = teste que não roda no CI | linha no `package.json` + a junta confere que a contagem subiu exatamente pelos casos novos |
| R4 | `tests/approval-frontend-contract.test.ts` (regex sobre `.tsx`) quebra se `work_orders:approve`/`canDecide`/`ApprovalPanel` saírem | linhas não tocadas; a bateria roda o teste focado |
| R5 | E2 deixa uma OS no tenant demo | prefixo `E2E-SAN3-01`, declarado; `B-SAN3-10` decide a limpeza do e2e |
| R6 | §3.2(a) negada → `getDispatchFromApi` fica fabricando | pendência com dono (§3.4); o PR **diz** que ficou |
| R7 | O modo mock explícito continua e alguém lê "ainda tem mock" | o plano declara o limite (§1); guard G1 prova que o mock só é alcançável por `isMockMode()` |
| R8 | Colisão em `Kpis/*` com outro PR da rodada | quem merge depois absorve a `main` e **reexecuta** (§5 do plano SAN3) |

### 8.3 Rollback

Revert do squash (1 commit): zero migration, zero dado, zero contrato de backend. As pendências registradas ficam
(são fatos medidos, não dependem do código).

### 8.4 Separação de papéis (§C7.4-bis)

planejador = este parecer (Fable) · dev = agente distinto, implementa **só** este plano · quem acha (junta) ≠ quem
conserta; num ciclo de reprovação o fluxo volta a este papel em Fable (D-PLANEJADOR-MODELO-FABLE).

### 8.5 Junta — unanimidade de 3 + `cognicao-visual` (comando §Rito 3; §C7.1-ter(b): perda de dado)

Antes: `inspetor-de-terreno-da-junta` (corpo da ref, Fable) — worktree próprio por jurado que muta, `sync-agent-agents.mjs --check`,
baseline 1126 conferido, commit A/commit B identificados. Cadeiras propostas:

- **C1 `validador-mestre`** (relator) — reexecuta a bateria §8.1 nos dois commits; confere os 31 vermelhos do commit A e o zero do B; diff × plano (arquivos do §5, nada fora).
- **C2 `master-teste-telas-rotas`** — sobe front+back locais e percorre E1-E3 e as 4 rotas (`/work-orders`, `/new`, `/:id` real, `/:id` inexistente) por papel `tenant_admin` e `operator`; prova por execução que nenhuma tela mostra `OS-000101`/`dispatch-000101` sem `VITE_USE_MOCKS=true`.
- **C3 `guardiao-fail-closed`** — o default de todo ramo de erro é estado, nunca dado: muta G1 (reintroduz `?? getMock…`), muta R1 (stale → apagar) e o reducer de 403; confere as 7 pendências do §3.4 por evidência de data.
- **`cognicao-visual`** (voto de fidelidade §7/§11) — erro ≠ vazio ≠ sem permissão ≠ não encontrada ≠ desatualizado, distintos a olho; KPIs "—" no erro; nenhuma cópia técnica; Dashboard/Despachos com vazio honesto.

Escopo por voto (§C7.1-ter(a)): achado `pre-existente` com evidência de data não reprova — vira pendência; o `critico-adversarial`
não é convocado (bloco não é de invariante financeiro). Ata em `agent-orchestration/omega/juntas/J-SAN3-01-web-wo-sem-fallback.md`
com quem ocupou cada papel. Depois: `porteiro-pos-merge` (corpo da ref).

### 8.6 KPI no próprio PR (§C3) — e as "dívidas do #386"

- `frontend_smoke_tests`: execução real (esperado ≥ 1166/1166) · `backend_tests`: **reexecutado** (`npm test`) ·
  `flutter_tests`/`mobile_*`: carregados com nota (bloco não toca `mobile/`) · `blocks_completed` 163 → 164 ·
  `mvp_demo`/`mvp_vendavel` **intocados** (não movem escopo; recalculados no `B-SAN3-10`, §5 do plano) ·
  `status: "published_per_pr"`, `pr` após `gh pr create`, `merge_commit`/`approved_head` `null` na autoria.
- **Dívidas do #386 — o que se mede, porque o texto não existe:** o comando aponta para "o comando do `B-SAN3-04a`", que
  **não existe neste head** (`ls agent-orchestration/codex/comandos | grep -i san3` → só o `B-SAN3-01`), e não há parecer
  do porteiro do #386 em `agent-orchestration/` (grep por "porteiro" × "#386" → só briefings do plano). No painel, medido:
  (i) `release` ainda é `B-O6R-06`/#385 (`kpis-latest.json` `release.pr = 385`); (ii) `roadmap.blocos` tem **12 blocos, todos
  O6R** — a rodada SAN3 não existe no painel; (iii) `recent.itens[0]` já é o #386; (iv) `kpis-history.json` tem 158 entradas,
  a última é o #385 com `merge_commit`/`approved_head` preenchidos (o backfill do #385 foi pago pelo #386). Logo este PR:
  move `release` para `B-SAN3-01`; **inaugura a trilha SAN3 no `roadmap`** (§C3.1 — dimensão nova entra com visualização:
  os blocos do §5 do plano com `estado`, este como `em_andamento`/`concluido`, `as_of` ≥ último merge) mantendo
  `tests/kpi-dashboard-charts.test.ts` verde; acrescenta o item em `recent`; história com a linha deste PR e a nota das
  métricas carregadas. Se o orquestrador tiver o texto das dívidas do #386, ele prevalece e o dev o anexa ao history.

### 8.7 Esforço e agenda

M no §5 do plano SAN3 — confirmado: 2 services + 2 hooks + 3 páginas + 1 tab + 2 arquivos novos + 1 arquivo de teste (48
casos) + 3 casos e2e + registro. Sem dependência de bloco anterior; abre as travas `SAN3-25` (service de OS) e `SAN3-10`
(`tests/e2e/**`) ao mergear.

---

## 9. Resumo em números (para a junta e o porteiro)

- Censo: 350 ocorrências de `catch`/`.catch`/`?? mock` em 595 arquivos; 127 devolvem valor; **19 fabricam entidade**
  (classe A): **17 na fronteira** (consertadas), **1 na fronteira com consumidor fora** (§3.2 — decisão pedida),
  **1 morta** (§3.3). Fora da classe A, 7 achados viram pendência nomeada com dono (§3.4); `P-008` fecha.
- Testes: baseline **1126/1126** (execução real) e **N = 0** para o comportamento em causa; **48 novos** (46 sem §3.2(a)),
  **31 vermelhos no head-base**; meta **>= 1166**. E2e: 1 caso defasado substituído por 3 (E1-E3).
- Arquivos de código: 10 editados + 2 novos + 1 teste novo + 1 linha em `package.json` + e2e; zero backend, zero migration.
- Junta: unanimidade de 3 (`validador-mestre`, `master-teste-telas-rotas`, `guardiao-fail-closed`) + `cognicao-visual`;
  inspetor antes, porteiro depois; papéis separados.
