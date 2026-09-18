# C4 guardiao-fail-closed — evidencia (2a instancia) — B-SAN3-01, objeto bb540fb3

- Modelo: Opus 5 (claude-opus-5[1m]). Inicio: 2026-09-18 09:30.
- 1a instancia caiu (429) sem deixar nada no disco (00-quedas.md #2).

## 0. Terreno
- Worktree proprio: `.claude/worktrees/j-bsan301-c4`, detached em `bb540fb3139031f40eea93ec5d7a47e987167bc2`, `status --porcelain` = 0 linhas apos criar.
- `npm --prefix frontend ci` proprio → EXIT=0 (sem junction). Root `npm ci` nao foi preciso (mandato C4 e so frontend; nenhum db:seed/migrate/npm test/e2e rodado → nenhum DATABASE_URL/REDIS_URL usado, nenhum conteiner criado).
- Node v20.19.5; `core.autocrlf=true` (mutacoes restauradas por copia de backup, conferidas por `git status --porcelain` e `git diff --quiet`).

## 1. Baseline no objeto (sem mutacao)
- `cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx` → `# tests 47 / # pass 47 / # fail 0 / EXIT=0`
- `npm --prefix frontend run check` (`tsc -b --noEmit`) → EXIT=0
- `npm --prefix frontend run test:smoke` (objeto, sem mutacao) → `# tests 1173 / # pass 1173 / # fail 0 / EXIT=0` (35 s)

## 2. Ferramentas (scratchpad `c4-mut/`, nada no repositorio)
- `run-mut.mjs <spec>`: aplica UMA mutacao no worktree descartavel `j-bsan301-c4`, roda o teste do bloco (+ `tsc -b --noEmit` / `test:smoke` / sonda quando o spec pede), restaura por backup e confere `git status --porcelain` = 0 e `git diff --quiet` EXIT=0.
- `probe.mts <cenario>`: sonda de RUNTIME em modo real (`VITE_USE_MOCKS=false`, fetch stubado): service → reducer → painel SSR. Para a lista, o `degraded` da pagina e copiado verbatim de `WorkOrdersPage.tsx:228` (`status === "error" || status === "forbidden"`), e o painel segue `:314-317`.
- Controles da sonda SEM mutacao (objeto): G1a → `RECUSADO — updateWorkOrder rejeitou: invalid_work_order_response`; G1d → `RECUSADO — getDispatchFromApi(200 {data:{}}) → dispatch=null`; lista 403 → `status=forbidden`, painel `forbidden`, KPIs `[—,—,—,—]`; lista 500 → `status=error`, painel `error`, KPIs `[—,—,—,—]`; detalhe 403 → `data-state=forbidden` "Acesso não permitido"; detalhe 500 → `data-state=error`.

## 3. Mutacoes G1 do mandato (reintroduzir ?? getMock / catch → mock fora de isMockMode())
### G1a — updateWorkOrder: 2xx sem OS volta a `?? getMockWorkOrderDetail(id)` (defeito #9 do censo do plano)
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-  return requireWorkOrder(response);
+  return adaptWorkOrderResponse(response) ?? getMockWorkOrderDetail(workOrderId);
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 45
# fail 2
EXIT=1
not ok 21 - [M1] updateWorkOrder 200 sem OS → rejeita invalid_work_order_response
not ok 46 - [G1] work-orders.service e dispatches.service: todo getMock* fica atrás de isMockMode() — e o guard pega a mutação
```
```
$ (frontend) node --import tsx probe.mts G1a
ACEITO (vira DADO fabricado) — updateWorkOrder(200 {data:{}}) devolveu id=11111111-1111-4111-8111-000000000001 code=OS-000101 cliente=Atlas Refrigeracao
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### G1b — listWorkOrdersFromApi: catch de rede devolve as 6 OS de demonstracao (defeito #2)
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
+    if (!(err instanceof ApiError)) return getMockWorkOrdersData("fallback", "Sem conexão.");
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 45
# fail 2
EXIT=1
not ok 5 - [L5] lista com rede fora (fetch lança TypeError) → source 'fallback', sem throw
not ok 46 - [G1] work-orders.service e dispatches.service: todo getMock* fica atrás de isMockMode() — e o guard pega a mutação
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### G1c — createDispatch: 2xx sem despacho volta a `?? getMockDispatchDetail(...)` (defeito #17)
- mutado (copia descartavel): frontend/src/modules/operations/dispatches/dispatches.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-  return requireDispatch(response);
+  return adaptDispatchResponse(response) ?? getMockDispatchDetail("dispatch-000101");
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 45
# fail 2
EXIT=1
not ok 30 - [X4] createDispatch 200 sem despacho → rejeita invalid_dispatch_response
not ok 46 - [G1] work-orders.service e dispatches.service: todo getMock* fica atrás de isMockMode() — e o guard pega a mutação
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

**Veredito parcial G1a–G1c:** as 3 mutacoes do mandato ficam VERMELHAS no guard G1 E no teste de comportamento (M1 / L5 / X4). Na forma do mandato, fail-closed provado.

## 4. G1 provado por mutacao nas bordas (mandato item 3: 'o guard prova-se por mutacao, inclusive a regra de comentario — D-11')
### G1d — getDispatchFromApi: `?? getMockDispatchDetail(id)` no ramo REAL, escrito como `else` de `if (isMockMode()) { ... }`
- mutado (copia descartavel): frontend/src/modules/operations/dispatches/dispatches.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-  if (isMockMode()) return { dispatch: getMockDispatchDetail(dispatchId), source: "mock" };
-
-  try {
-    const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}`, context);
-    const dispatch = adaptDispatchResponse(response);
-    if (!dispatch) return { dispatch: null, source: "fallback", fallbackReason: "A resposta não trouxe um despacho válido." };
-    const [enriched] = await enrichWithWorkOrdersIfAllowed(context, [dispatch]);
-    return { dispatch: { ...dispatch, ...enriched }, source: "api" };
-  } catch (err) {
-    if (err instanceof ApiError) {
-      if (err.status === 404) return { dispatch: null, source: "api", notFound: true };
-      if (err.status === 403) return { dispatch: null, source: "fallback", forbidden: true, fallbackReason: "Sem permissão para consultar este despacho." };
+  if (isMockMode()) {
+    return { dispatch: getMockDispatchDetail(dispatchId), source: "mock" };
+  } else {
+    try {
+      const response = await apiRequest<unknown>(`/operations/dispatches/${dispatchId}`, context);
+      const dispatch = adaptDispatchResponse(response) ?? getMockDispatchDetail(dispatchId);
+      const [enriched] = await enrichWithWorkOrdersIfAllowed(context, [dispatch]);
+      return { dispatch: { ...dispatch, ...enriched }, source: "api" };
+    } catch (err) {
+      if (err instanceof ApiError) {
+        if (err.status === 404) return { dispatch: null, source: "api", notFound: true };
+        if (err.status === 403) return { dispatch: null, source: "fallback", forbidden: true, fallbackReason: "Sem permissão para consultar este despacho." };
+      }
+      return { dispatch: null, source: "fallback", fallbackReason: "A consulta ao despacho falhou. Tente novamente em instantes." };
-    return { dispatch: null, source: "fallback", fallbackReason: "A consulta ao despacho falhou. Tente novamente em instantes." };
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
```
$ (frontend) node --import tsx probe.mts G1d
ACEITO (vira DADO fabricado) — getDispatchFromApi(200 {data:{}}) → dispatch=dispatch-000101 (OS OS-000101, status assigned) source=api fallbackReason=-
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### G1e — getDispatchFromApi: 2xx sem despacho devolve o mock, com comentario no fim da linha citando isMockMode()
- mutado (copia descartavel): frontend/src/modules/operations/dispatches/dispatches.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-    if (!dispatch) return { dispatch: null, source: "fallback", fallbackReason: "A resposta não trouxe um despacho válido." };
+    if (!dispatch) return { dispatch: getMockDispatchDetail(dispatchId), source: "fallback" }; // o demo de verdade fica em isMockMode()
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
```
$ (frontend) node --import tsx probe.mts G1e
ACEITO (vira DADO fabricado) — getDispatchFromApi(200 {data:{}}) → dispatch=dispatch-000101 (OS OS-000101, status assigned) source=fallback fallbackReason=-
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### G1f — dispatches: import de `mockDispatchItems` e lista 200-vazia volta a mostrar os 4 despachos (defeito #14, pela constante)
- mutado (copia descartavel): frontend/src/modules/operations/dispatches/dispatches.service.ts
- mutado (copia descartavel): frontend/src/modules/operations/dispatches/dispatches.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-import { getMockDispatchDetail, getMockDispatchesData } from "./dispatches.mock";
+import { getMockDispatchDetail, getMockDispatchesData, mockDispatchItems } from "./dispatches.mock";
-    const items = options.enrich === false ? data.items : await enrichWithWorkOrdersIfAllowed(context, data.items);
+    const raw = data.items.length > 0 ? data.items : mockDispatchItems;
+    const items = options.enrich === false ? raw : await enrichWithWorkOrdersIfAllowed(context, raw);
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 46
# fail 1
EXIT=1
not ok 27 - [X1] despachos 200 vazio (+ OS 200 vazio no enriquecimento) → items 0, source 'api' (não fabrica 4)
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### G1g — service NOVO em modules/work-orders (proximo membro da enumeracao de services de OS) com catch -> getMockWorkOrderDetail
- criado (copia descartavel): frontend/src/modules/work-orders/work-orders-summary.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)

(+ arquivo novo nao rastreado)
```
```
$ (frontend) npx tsc -b --noEmit

EXIT=0
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
```
$ (frontend) node --import tsx probe.mts G1g
ACEITO (vira DADO fabricado) — getWorkOrderSummary(500) devolveu id=11111111-1111-4111-8111-000000000001 code=OS-000101 cliente=Atlas Refrigeracao
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

**Veredito parcial G1d–G1g:** G1d, G1e e G1g = COMPILA + SUITE VERDE (47/47 e 1173/1173) + RUNTIME ACEITA entidade fabricada (dispatch-000101 / OS-000101) em modo real → FAIL-OPEN. G1f: o guard fica verde (so ve o prefixo getMock), quem pega e o X1 (comportamento).

## 5. Mutacoes R1 do mandato ('desatualizado' apaga os dados) — reducer e fiacao
### R1a — nextListState: falha em 2o plano apaga a lista (em vez de manter + faixa)
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-    return { ...prev, error: reason, stale: true };
+    return { ...prev, data: { ...prev.data, items: [] }, error: reason, stale: true };
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 46
# fail 1
EXIT=1
not ok 36 - [R1] nextListState(prev com 3 itens, fallback, background=true) → mantém os 3, stale true, error preenchido
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### R1b — nextDetailState: falha em 2o plano apaga a OS (espelho do R1 no detalhe, R4)
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-    return { ...prev, error: reason, stale: true };
+    return { ...prev, workOrder: null, error: reason, stale: true };
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 46
# fail 1
EXIT=1
not ok 39 - [R4] nextDetailState(prev com OS, detalhe rejeitado, background=true) → mantém a OS, stale true
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### R1c — useWorkOrders (fiacao): o hook deixa de repassar `background` ao reducer
- mutado (copia descartavel): frontend/src/modules/work-orders/useWorkOrders.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-    setState((prev) => nextListState(prev, result, background));
+    setState((prev) => nextListState(prev, result, false));
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### R1d — useWorkOrderDetail (fiacao): o hook deixa de repassar `background` ao reducer
- mutado (copia descartavel): frontend/src/modules/work-orders/useWorkOrderDetail.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-    setState((prev) => nextDetailState(prev, { detail, timeline }, background));
+    setState((prev) => nextDetailState(prev, { detail, timeline }, false));
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

**Veredito parcial R1:** no REDUCER, fail-closed provado (R1a → R1 vermelho; R1b → R4 vermelho). Na FIACAO (hook → reducer), o parametro `background` pode ser descartado nos dois hooks com 47/47 e 1173/1173 verdes: a regra §4.3-3 so vale enquanto ninguem mexer na linha do hook; nenhum teste a vigia (o S1 so vigia a fiacao do create).

## 6. Mutacao do reducer de 403 (mandato) — o 403 vira lista vazia
### F403a — nextListState: 403 -> status 'empty' (em vez de 'forbidden')
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-    status: result.forbidden ? "forbidden" : "error",
+    status: result.forbidden ? "empty" : "error",
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
```
$ (frontend) node --import tsx probe.mts F403a
service: source=fallback forbidden=true items=0 | reducer: status=empty forbidden=true | pagina(l.228/314-317): degraded=false painel data-state=empty KPIs=[0,0,0,0]
ESTADO ERRADO (o caso nao previsto cai no lado benigno) — lista 403 → painel "empty", KPIs [0,0,0,0]
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### F403b — listWorkOrdersFromApi: 403 sai com source 'api' (o reducer entao o classifica como vazio)
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.service.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-      source: "fallback",
+      source: forbidden ? "api" : "fallback",
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
```
$ (frontend) node --import tsx probe.mts F403b
service: source=api forbidden=true items=0 | reducer: status=empty forbidden=false | pagina(l.228/314-317): degraded=false painel data-state=empty KPIs=[0,0,0,0]
ESTADO ERRADO (o caso nao previsto cai no lado benigno) — lista 403 → painel "empty", KPIs [0,0,0,0]
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### F403c — nextDetailState: 403 -> 'not-found' (sem permissao vira 'nao encontrada')
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-    status: notFound ? "not-found" : forbidden ? "forbidden" : "error",
+    status: notFound ? "not-found" : forbidden ? "not-found" : "error",
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

```
$ (frontend) node --import tsx probe.mts F403c-sonda   (mesma mutacao F403c, reaplicada so para a sonda)
reducer: status=not-found notFound=false forbidden=true | view: data-state=not-found titulo="Ordem de serviço não encontrada"
ESTADO ERRADO — detalhe 403 → estado "not-found" (esperado "forbidden")
```
**Veredito parcial 403:** FAIL-OPEN. As tres mutacoes compilam e deixam 47/47 e 1173/1173 verdes; em runtime a lista 403 mostra o painel VAZIO com KPIs `[0,0,0,0]` e o detalhe 403 mostra 'não encontrada'. Nenhum teste liga 403 → estado 'forbidden' no reducer (R1–R6 nao tem caso forbidden; L3/D2 afirmam so o service; P2/P4 afirmam so o painel ja recebendo o status).

## 7. Enumeracoes de estado/fonte — o proximo membro nao classificado
### NS1 — WorkOrdersListStatus ganha 'unavailable' (5xx/rede) e a pagina nao e tocada
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-export type WorkOrdersListStatus = "loading" | "ready" | "empty" | "error" | "forbidden";
+export type WorkOrdersListStatus = "loading" | "ready" | "empty" | "error" | "forbidden" | "unavailable";
-    status: result.forbidden ? "forbidden" : "error",
+    status: result.forbidden ? "forbidden" : /instantes/.test(reason) ? "unavailable" : "error",
```
```
$ (frontend) npx tsc -b --noEmit

EXIT=0
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ npm --prefix frontend run test:smoke
# tests 1173
# pass 1173
# fail 0
EXIT=0
(nenhum not ok de topo)
```
```
$ (frontend) node --import tsx probe.mts NS1
service: source=fallback forbidden=false items=0 | reducer: status=unavailable forbidden=false | pagina(l.228/314-317): degraded=false painel data-state=empty KPIs=[0,0,0,0]
ESTADO ERRADO (o caso nao previsto cai no lado benigno) — lista 500 → status "unavailable", painel "empty", KPIs [0,0,0,0]
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### NS2 — WorkOrderDetailStatus ganha 'unavailable' e a view nao e tocada (controle do lado do detalhe)
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.state.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-export type WorkOrderDetailStatus = "loading" | "ready" | "not-found" | "forbidden" | "error";
+export type WorkOrderDetailStatus = "loading" | "ready" | "not-found" | "forbidden" | "error" | "unavailable";
-    status: notFound ? "not-found" : forbidden ? "forbidden" : "error",
+    status: notFound ? "not-found" : forbidden ? "forbidden" : /instantes/.test(reason) ? "unavailable" : "error",
```
```
$ (frontend) npx tsc -b --noEmit

EXIT=0
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ (frontend) node --import tsx probe.mts NS2
reducer: status=unavailable notFound=false forbidden=false | view: data-state=error titulo="Não foi possível carregar a ordem de serviço"
ESTADO CERTO — detalhe 500 → status "unavailable", data-state "error"
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### SRC1 — WorkOrdersSource ganha 'cache' (so o tipo): o build acusa?
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.types.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-export type WorkOrdersSource = "api" | "mock" | "fallback";
+export type WorkOrdersSource = "api" | "mock" | "fallback" | "cache";
```
```
$ (frontend) npx tsc -b --noEmit
src/modules/work-orders/work-orders-kpi-detail.ts(30,3): error TS2322: Type 'WorkOrdersSource' is not assignable to type 'KpiSourceTag'.
  Type '"cache"' is not assignable to type 'KpiSourceTag'.
EXIT=1
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

### SRC2 — WorkOrdersSource E KpiSourceTag ganham 'cache' (o conserto obvio do vermelho do SRC1): o reducer classifica o membro novo como?
- mutado (copia descartavel): frontend/src/modules/work-orders/work-orders.types.ts
- mutado (copia descartavel): frontend/src/components/kpi/kpi-detail.types.ts
```
$ git -C j-bsan301-c4 diff -U0   (linhas +/-)
-export type KpiSourceTag = "api" | "mock" | "fallback";
+export type KpiSourceTag = "api" | "mock" | "fallback" | "cache";
-export type WorkOrdersSource = "api" | "mock" | "fallback";
+export type WorkOrdersSource = "api" | "mock" | "fallback" | "cache";
```
```
$ (frontend) npx tsc -b --noEmit
src/components/kpi/KpiDetailModal.tsx(12,7): error TS2741: Property 'cache' is missing in type '{ api: null; mock: string; fallback: string; }' but required in type 'Record<NonNullable<KpiSourceTag | undefined>, string | null>'.
EXIT=1
```
```
$ (frontend) node --test --import tsx tests/work-orders-honest-errors.test.tsx
# tests 47
# pass 47
# fail 0
EXIT=0
(nenhum not ok)
```
```
$ (frontend) node --import tsx probe-src2.mts SRC2
source "cache" (membro novo, nao classificado no reducer) → status=ready stale=false error=null → ACEITO como dado atual (denylist `source !== "fallback"`)
EXIT=0
```
- restaurado: git status --porcelain = 0 linhas; git diff --quiet EXIT=0

**Veredito parcial:** lista (NS1) = FAIL-OPEN: membro novo de `WorkOrdersListStatus` compila, suite verde, e o 500 aparece como VAZIO com KPIs 0 (default de `WorkOrdersLoadState` = painel vazio; `degraded` so reconhece 2 status). Detalhe (NS2) = fail-closed em runtime (cai no erro), sem acusacao de build. Fonte (SRC1/SRC2): o build fica vermelho — mas pelo `Record` exaustivo do `KpiDetailModal` (pre-existente), nao pelo reducer; feito o conserto que o erro pede, o reducer aceita o membro novo como dado atual (`source !== "fallback"`).

## 8. Censo da classe, gerado do codigo (AST do TypeScript, nao regex) — scripts `c4-mut/censo.mjs` e `censo2.mjs`
```
$ node censo.mjs <worktree>   (frontend/src/**, sem *.test.*, sem os proprios modulos de mock)
FILES=602 CATCH_CLAUSES=283 DOT_CATCH=21 NULLISH=2125 TOTAL_CATCH_DOTCATCH_NULLISH=2429
MOCK_REFS=75 GUARDED=49 UNGUARDED=26
(referencias por arquivo COM guarda then-de-if(isMockMode()) — work-orders.service.ts: 10 · dispatches.service.ts: 5 · demais: auth 2, checklist-attachments 2, checklist-runtime 9, checklist 6, context/repository 1, dashboard/repository 1, useDashboardData 1, navigation.service 1, notification.service 6, approval.service 5)
As 26 SEM guarda isMockMode(): work-orders/repository.ts x5 (morto, P-SAN3-01-OS-LEGADO-MORTO) · logistics/repository.ts x3 (rota /logistics VIVA — ver C4-07) · cloud-billing.service.ts x11 + platform.service.ts x3 (atras de shouldUseMocks(), outra autoridade — ver C4-08) · dashboard/repository.ts:29 (corpo de getMockOperationalDashboard, chamado so sob isMockMode: repository.ts:41 e useDashboardData.ts:52) · navigation/useNavigationMenu.ts:15 (catch → menu de demonstracao, :47 — ver C4-09) · services/realtime/pollingClient.ts x2 (registrado: P-WEB-EVENTBUS-MOCK)

$ node censo2.mjs <worktree>   (todo catch/.catch que devolve valor + todo ?? com lado direito suspeito)
CATCH_RETURN_ROWS=119 {"outro":82,"?suspeito-nome":37}
(nenhum catch/.catch devolve dado de demonstracao; os 37 'suspeitos' sao vazio+razao honesto, exceto profiles.service.ts:98 resolveLocalDefaults — ja e P-SAN3-01-JURISDICAO-DEFAULTS-LOCAIS)
NULLISH_SUSPEITOS=53 {"?suspeito-nome":50,"A?mock":2,"A?literal-id":1}
[A?mock] ?? src/modules/auth/auth.service.ts:39 | getStoredAuthSession() ?? mockSession
[A?literal-id] ?? src/modules/inventory/cycle-counts.adapter.ts:89 | adaptCycleCount(readRecord(data.cycleCount) ?? data) ?? ({ id: "", abcClass: null, status: "concluida", notes: null, entries: [], countedCount: 0, totalCount: 0
[A?mock] ?? src/modules/work-orders/repository.ts:11 | mockWorkOrders.find((item) => item.id === workOrderId) ?? mockWorkOrders[0]
```
- Fronteira do plano: nos dois services, 15/15 referencias a getMock* estao no then de `if (isMockMode())` (AST); nenhum catch/?? de classe A sobrou. **Fechada no codigo de hoje.**
- Fora da fronteira, membro da classe SEM pendencia nomeada: `inventory/cycle-counts.adapter.ts:88-90` (`?? ({ id: "", status: "concluida", entries: [] ... })`), origem `528e3601` 2026-07-09 (#149). Sonda:
```
$ (frontend) node --import tsx probe-cycle.mts
close 2xx corpo={"data":{}} → cycleCount id="" status=concluida entries=0 | relatorio: {"lines":[],"totalVariance":0,"adjustmentsGenerated":0}
close 2xx corpo={} → cycleCount id="" status=concluida entries=0 | relatorio: {"lines":[],"totalVariance":0,"adjustmentsGenerated":0}
close 2xx corpo=null → cycleCount id="" status=concluida entries=0 | relatorio: {"lines":[],"totalVariance":0,"adjustmentsGenerated":0}
```
  Consumidor: `CycleCountSessionDrawer.tsx:134-137` poe esse cycleCount e esse relatorio na tela. `grep` em `pendencias.md` → 0; em `docs/revisoes/SAN3/` → 2 mencoes do arquivo (`inventario-C2.md:15` P-Ω4-6-FRONT-RESOLVE-NAME e `:23` P-UI-REFRESH-ERROR-COPY), nenhuma sobre o `?? { status: "concluida" }`.
- Alcance do mock de OS 'morto': `App.tsx:792-796` monta `/logistics` (PermissionGuard `logistics:dispatch`, que `auth.adapter.ts:373` expande de `os.manage`); `logistics/repository.ts:2` importa `mocks/work-orders/workOrders`. Sonda:
```
$ (frontend) node --import tsx probe-logistics.mts
VITE_USE_MOCKS=false | fetch chamado 0x | workOrders=4: OS-10021, OS-10024, OS-10018, OS-10012 | assets=4 queues=3
```
  Contradiz o texto da `P-SAN3-01-OS-LEGADO-MORTO` (pendencias.md:9361-9365): 'Nada disso alcança um usuário'.

## 9. Autoridade unica — mapa das copias
- 'sem permissao' na LISTA: service `work-orders.service.ts:50-58` (`source` e `forbidden`) → reducer `work-orders.state.ts:41` decide sucesso por `source` e so le `forbidden` no ramo de falha (:61-63) → estado guarda `status` E `forbidden` → pagina le so `status` (`WorkOrdersPage.tsx:228`). Divergencia: F403a (status=empty, forbidden=true) e F403b (source=api, forbidden=true) → vence o caminho permissivo (painel vazio, KPIs 0). Nada falha.
- 'sem permissao' no DETALHE: `work-orders.state.ts:138-148` (`status`, `notFound`, `forbidden`) → view le so `status` (`WorkOrderDetailPage.tsx:118-138`). F403c: status=not-found com forbidden=true → vence 'não encontrada'.
- 'estamos em modo mock?': `config/env.ts:22-24` isMockMode() (padrao REAL) × `cloud-billing.service.ts:163-165` e `platform.service.ts:122-124` shouldUseMocks() (padrao MOCK). Sonda:
```
$ (frontend) node --import tsx probe-mockmode.mts <valor>
VITE_USE_MOCKS=__unset__ | isMockMode()=false | OS: source=api (fetch? true) | plataforma: NAO chamou a API, devolveu 3 organizacoes: Techsolutions Industrial, Minas Norte Service
VITE_USE_MOCKS=false | isMockMode()=false | OS: source=api (fetch? true) | plataforma: chamou a API, devolveu 0 organizacoes:
VITE_USE_MOCKS=true | isMockMode()=true | OS: source=mock (fetch? false) | plataforma: NAO chamou a API, devolveu 3 organizacoes: Techsolutions Industrial, Minas Norte Service
VITE_USE_MOCKS=0 | isMockMode()=false | OS: source=api (fetch? true) | plataforma: NAO chamou a API, devolveu 3 organizacoes: Techsolutions Industrial, Minas Norte Service
```
  Divergem para VITE_USE_MOCKS ausente ou '0'; vence a ficcao (3 organizacoes inventadas sem chamar a API). Origem `62c0edb8` 2026-06-07 / `4d6e1219` 2026-06-08.

## 10. Origem (escopo) das linhas julgadas — `git blame bb540fb3`
- `WorkOrdersPage.tsx:228` (`degraded`) e `:594-599` (ultimo ramo de `WorkOrdersLoadState` → `data-state="empty"`): `a97a1351` (commit B, 2026-09-17).
- `work-orders.state.ts:41` (`source !== "fallback"`) e `:61` (`forbidden ? "forbidden" : "error"`): `a97a1351`.
- `work-orders-honest-errors.test.tsx:646-658` (`mockLeaks`): `7b2ab102` (commit A); a l.653 (regra do comentario e de `isMockMode()`) muda em `a97a1351` (D-11).
- Fora do bloco: `cycle-counts.adapter.ts:88-90` `528e3601` (2026-07-09); `useNavigationMenu.ts` `50845286` (2026-06-09); `shouldUseMocks` `62c0edb8`/`4d6e1219` (2026-06-07/08); `logistics/repository.ts` `fb0ea65b` (2026-05-26).

## 11. O que ficou sem executar
- `npm test` da raiz: nenhum arquivo de `tests/` referencia os arquivos mutados (grep → 0), entao essa suite nao alcanca nenhuma mutacao. Sem Postgres/Redis: nenhuma `DATABASE_URL`/`REDIS_URL` usada.
- e2e: mandato da C2.
- A pagina da lista inteira em SSR depois do fetch (efeitos nao rodam em `renderToString`). A sonda usa o `degraded` da l.228 copiado verbatim e renderiza os componentes exportados que a pagina usa (`WorkOrdersLoadState`, `WorkOrdersKpiGrid`).

## 12. Limpeza
```
$ git worktree list | grep -c j-bsan301-c4
0
$ ls .claude/worktrees/
b04a b11 bsan301 bsan304a gov-descuido gov-elenco j-bsan301-c1 san2-r
$ docker ps -a --format '{{.Names}}' | grep -c j-bsan301-c4
0
$ git -C bsan301 status --porcelain | wc -l ; rev-parse --short HEAD
0
74f3f7c9
```
- Worktree removido pelo nome (`git worktree remove --force`). Cada mutacao foi restaurada por backup, e `status --porcelain` = 0 e `diff --quiet` EXIT=0 foram conferidos depois de cada uma. Nenhum conteiner criado. `j-bsan301-c1` e alheio: reportado, nao tocado. Mantido no scratchpad como evidencia: `c4-mut/`.

## 13. Veredito
**REPROVADO** — 3 bloqueia (C4-01 403→vazio verde; C4-02 guard G1 lexical: G1d/G1e/G1g compilam, verdes, e fabricam; C4-03 proximo status da lista nasce 'vazio'), 3 ajuste, 3 nota. Detalhe em `C4-guardiao-fail-closed-voto.json`. Estado deste arquivo: FINAL (2026-09-18).
