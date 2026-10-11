# B-SAN3-06a-telas — relatório do DEV

## Identidade e terreno

- Identidade nova: `dev-06a-codex`.
- Papel/modelo declarado: DEV no Codex, GPT-5.6 Sol, nível menor.
- Worktree: `C:/Users/AMP/w-06a`.
- Ramo: `fix/menu-sem-tela-ficticia`.
- Head inicial esperado e medido: `b459f8c19f905e82ccc389461d736092876ad3c6`.

### Evidência incremental 01 — ref alvo

- Comando: `git -c http.lowSpeedLimit=1 -c http.lowSpeedTime=30 fetch origin`.
- Saída: código 0, sem saída.
- Estado: `git rev-parse --abbrev-ref HEAD` → `fix/menu-sem-tela-ficticia`; `git rev-parse HEAD` → `b459f8c19f905e82ccc389461d736092876ad3c6`; `git status --short --branch` sem mutações.

### Evidência incremental 02 — contratos e plano

- Comando: leitura integral de `.agents/skills/ts-frontend-full/SKILL.md`, `.agents/skills/ui-ux-pro-max/SKILL.md`, `CLAUDE.md`, `PROJECT_MEMORY.md` e `docs/revisoes/SAN3/B-SAN3-06a-plano.md` na ref-alvo.
- Saída: C1–C7 e C9 aplicáveis; decisões finais autorizam `inventory.notifications.ts` + teste e quatro arquivos de inventory; C8 e `auth.adapter.ts` saem; ordem do menu não se aplica.
- Estado: plano aceito como mandato, sem reescrita. Nenhuma alteração de produto iniciada antes dessas leituras.

### Evidência incremental 03 — controle vivo e referência visual

- Comando: busca de `B-SAN3-06a`, `D-TELAS-SAN3-06a`, `D-TELAS-SEGUEM-O-PADRAO` e pendências donas em `agent-orchestration/controle/`, `status-geral.md` e `log-execucao.md`; leitura das seções correspondentes.
- Saída: decisões vivas confirmam que Relatórios/Pedidos saem, Console Dispatcher liga a dados reais e `/logistics` fica fora; KPI permanece congelado.
- Estado: sem conflito com as decisões finais do plano. A referência `docs/claude-code-handoff/screen-refs/web/console-tempo-real.png` foi inspecionada em 924×540.

### Telas-modelo do Console

- Cabeçalho, KPIs, fila e estados: `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx`, rota `/work-orders` confirmada em `frontend/src/App.tsx`.
- Fonte/mapa e frescor dos técnicos: `frontend/src/modules/operations/map/pages/OperationsMapPage.tsx`, rota `/operations/map` confirmada em `frontend/src/App.tsx`.
- Lista compacta de técnicos ligada à mesma fonte: `frontend/src/modules/dispatch/pages/FieldOperatorsPage.tsx`, rota `/field-operators` confirmada em `frontend/src/App.tsx`.
- A implementação preservará a composição visual do Console existente e da referência PNG, reutilizando os serviços/adapters dessas telas-modelo; nenhum componente visual novo será criado.

### Evidência incremental 04 — dependências próprias

- Comando: `timeout.exe 900s npm.cmd ci` na raiz.
- Saída: código 0; 326 pacotes instalados, 327 auditados; aviso de engine de `@prisma/streams-local` e 13 vulnerabilidades já reportadas pelo npm.
- Estado: `node_modules` próprio do worktree, sem junction/symlink.
- Comando: `timeout.exe 900s npm.cmd ci` em `frontend/`.
- Saída: código 0; 103 pacotes instalados, 104 auditados; 9 vulnerabilidades reportadas pelo npm.
- Estado: dependências do frontend instaladas no próprio worktree; nenhum `package.json` ou lockfile alterado.

### Ampliação técnica necessária e autorizada pela decisão final

- O Console existente não possui hook de dados. `useDashboardData` consulta `/field-locations/latest` sem gate de permissão e `useFieldOperators` consulta a mesma fonte assim que monta; nenhum equivalente satisfaz C7 no Console composto.
- Será criado um hook específico em `frontend/src/modules/dispatch/`, apenas para compor os serviços existentes de dashboard, OS, despachos e mapa com gates por permissão. Nenhum endpoint, escrita, dependência ou componente visual novo.

## Instalação, implementação e validações

EM APURAÇÃO.

## Retomada 2026-10-11T20:03Z

- Identidade NOVA: `dev-06a-claude`. Papel DEV, Claude Opus 5.5, nível menor (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`), cobrindo o Codex, que está no limite de uso até 23:15Z (`D-CLAUDE-SO-ORQUESTRA`). Substitui o `dev-06a-codex`, que parou às 18:21Z (P3).
- Mandato: `C:/Users/AMP/erp-pausa-2026-10-03/prompts/dev-06a-claude.txt`. Plano: `docs/revisoes/SAN3/B-SAN3-06a-plano.md` (as "Decisões do orquestrador" no fim valem acima do texto do plano).

### R-01 — ref alvo (re-execução do item 01 do caído)

- Comando: `git fetch origin` · `git rev-parse HEAD` · `git branch --show-current` · `git status --short --branch`.
- Saída: fetch código 0, sem saída; HEAD `e6b8154212750b4b84055c51002a91ca53a2b297` (= o head que o mandato nomeia); ramo `fix/menu-sem-tela-ficticia`; status `## fix/menu-sem-tela-ficticia...origin/fix/menu-sem-tela-ficticia`, sem mutação.
- Comparação: o caído mediu `b459f8c1`; o head novo `e6b81542` é o commit do orquestrador que versionou o relatório parcial (`wip(registro)`), filho de `b459f8c1`. `git diff --stat origin/main...HEAD` = só `docs/revisoes/SAN3/B-SAN3-06a-{dev,plano}.md`: o caído NÃO deixou código no ramo. Estado: confere; a implementação começa do zero a partir daqui.

### R-02 — dependências próprias (re-execução do item 04 do caído)

- Comando: `timeout 900 npm ci` na raiz; `timeout 900 npm ci` em `frontend/`; `DATABASE_URL=<falso, só no env> timeout 300 npx prisma generate` (o `npm test` importa o cliente gerado; a URL não toca banco nenhum).
- Saída: raiz código 0, `added 326 packages, and audited 327 packages`, aviso EBADENGINE de `@prisma/streams-local`, 13 vulnerabilidades reportadas pelo npm; frontend código 0, `added 103 packages, and audited 104 packages`, 9 vulnerabilidades; `prisma generate` código 0.
- Comparação com o caído: mesmas contagens (326/327 e 103/104), mesmos avisos. `dir /AL` na raiz e em `frontend/` = nenhum reparse point (sem junction). `git status --short` depois = só o relatório: nenhum `package.json`/lockfile mexido.
- Estado: confere.

### R-03 — leituras (re-execução dos itens 02 e 03 do caído)

- Comando: leitura do mandato, do plano inteiro (com as "Decisões do orquestrador"), skill `ts-frontend-full` pela ferramenta Skill, `COMPONENT_LIBRARY.md`, e do código: `DispatchConsolePage.tsx`, `WorkOrdersPage.tsx`, `useWorkOrders.ts`, `work-orders.state.ts`, `work-orders.service.ts`, `operations-map.{service,adapter,types}.ts`, `useOperationsMap.ts`, `useDashboardData.ts`, `dashboard/repository.ts`, `dashboard.adapter.ts` (`parseDashboardSummary`/`summaryToKpis`), `dispatches.service.ts`, `useFieldOperators.ts`, `field-operators.adapter.ts`, `FieldOperatorsPage.tsx`, `PermissionProvider.tsx`, `context/types.ts`, `App.tsx`; e a referência `screen-refs/web/console-tempo-real.png`.
- Saída: as mesmas conclusões do caído (C1–C7 e C9; C8 e `auth.adapter.ts` fora; ampliações nominais de inventory e de `inventory.notifications.ts` + `tests/inventory-abc.test.ts`). `git grep -n -E "[/]reports|[/]purchase-orders" -- frontend/src frontend/tests tests docs/navigation-matrix.md src` = 28 linhas: App.tsx 94/95/536/544, appSidebarNav 92/94/263/265, tenantNavigation 323/344, inventory-kpi-detail 17/66, inventory.adapter 152, EstoqueDetailPage 221, EstoquePage 667, navigation-matrix 56/61, testes (kpi-cards-clickable-f2b 74/76, sidebar-nav 29/31/169/193/211, inventory-abc 145) e `inventory.notifications.ts` 18/56/60. Nota de terreno: um padrão que começa por `/` é reescrito pela conversão de caminho do MSYS (Git Bash) e perde metade das linhas; por isso o `[/]`.
- Estado: confere.

### R-04 — telas-modelo (re-execução de "Telas-modelo do Console" do caído)

- Comando: `grep -n 'path="/work-orders"\|path="/operations/map"\|path="/field-operators"\|path="/dispatch/console"' frontend/src/App.tsx`.
- Saída: `/work-orders` l.768, `/operations/map` l.717, `/field-operators` l.640, `/dispatch/console` l.648 (guard `field_dispatch:read`).
- Estado: confere — as três telas-modelo do caído têm rota. Mantidas: `WorkOrdersPage.tsx` (cabeçalho `PageHeader`, grade de KPIs `KpiStatCard`, linha `pat-os-grid`, `StatusPill`, `StatePanel`, `StaleDataBanner`), `OperationsMapPage.tsx` (fonte `/field-locations/latest`, regra de frescor de 15 min) e `FieldOperatorsPage.tsx` (lista de técnicos pela mesma fonte, helpers do mapa).

### R-05 — estratégia de implementação (o plano não é reescrito; aqui só o "como")

- **Rotas e menus (C1, C2, C3, C9):** `App.tsx` perde os dois `lazy` e os dois `Route`; `modules/purchase-orders/**` e `modules/reports/**` apagados; `appSidebarNav.ts` perde `PEDIDOS`/`RELATORIOS`, as duas entradas de `MVP_NAV_PATHS`, os itens em `G_GESTAO_FULL`, finance e inventory, e os dois ícones que só eles importavam (`BarChart3`, `ShoppingCart` — l.4 e l.37, fora da lista de linhas do plano, mesmo arquivo: declarado); `tenantNavigation.ts` perde `tenant-purchase-orders` e `tenant-reports` (l.320-350); `docs/navigation-matrix.md` perde as l.56 e 61 (e o "Relatórios" da regra transversal do finance, que ficou sem tela: declarado).
- **Links (PARE 2, ampliação nominal):** `EstoquePage.tsx` — o chip "Repor" continua como SINAL, sem `Link`; `EstoqueDetailPage.tsx` — sai o link "Ver pedidos de compra" da faixa de abaixo do mínimo; `inventory-kpi-detail.ts` — o cta do card "Precisam repor" passa ao filtro que JÁ existe na própria tela (`/inventory?needs_reorder=true`, espelho do cta de "Abaixo do mínimo") e o parâmetro `can` sai (só servia ao gate de `purchase_orders:read`); `inventory.adapter.ts` — só o comentário da l.152.
- **PARE 1, opção (b):** `inventory.notifications.ts` — `actionUrl` = `/inventory/<id do item>` (tela de detalhe que existe, rota `/inventory/:id`) e a mensagem sem o caminho; `tests/inventory-abc.test.ts:145` acompanha.
- **Console Dispatcher (C4–C7):** composição da referência PNG e do console atual (cabeçalho · 4 KPIs · faixa de alertas · fila 1fr + técnicos 340px); componentes da TELA-MODELO `WorkOrdersPage.tsx` (`PageHeader`, `KpiStatCard`, `StatusPill`, `StatePanel`/`StatePanelAction`, `StaleDataBanner`, `pat-skel`, `pat-btn`, `pat-link`) e, para os técnicos, de `FieldOperatorsPage.tsx` (`adaptFieldOperators`, `summarizeFieldOperatorStatuses`, `CH`). Nenhum componente visual novo; `app.css` intocado.
- **Fontes (todas GET que já existem; nenhuma escrita):** `GET /dashboard/summary` (`dashboard:read`) → `parseDashboardSummary`; `GET /work-orders?limit=100` (`work_orders:read`) → `hasWorkOrdersList`/`adaptWorkOrdersResponse` (o mesmo teto e a mesma forma do `operations-map.service.ts`); `GET /field-locations/latest` (`field_location:read`) → `adaptFieldLocationsResponse` + `attachWorkOrdersToFieldLocations`/`attachDispatchesToFieldLocations`; `GET /operations/dispatches` (`field_dispatch:read`) por `listDispatchesFromApi(…, { enrich:false })`, só para resolver o técnico do despacho (fonte auxiliar: real ou vazia). Cada fonte só é pedida com `can(<permissão do endpoint>)`.
- **Código novo, declarado (decisão 5 do orquestrador: hook/adapter novo só sem equivalente):** em `frontend/src/modules/dispatch/` — `dispatch-console.service.ts` (as quatro leituras com gate e com o 403 separado de erro), `dispatch-console.logic.ts` (redutor puro de estado por bloco e derivação de KPIs, alertas, fila e técnicos), `useDispatchConsole.ts` (hook). Por que não os existentes: `useDashboardData` e `useFieldOperators`/`useOperationsMap` pedem `/field-locations/latest` sem gate (quebra o C7); `getLatestFieldLocations` engole o 403 como falha genérica (o plano exige "acesso não permitido" pelo 403 da fonte) e, com dado, refaz por dentro `GET /work-orders?limit=100` e `GET /operations/dispatches` (seis pedidos por ciclo em vez de quatro); `getOperationalDashboard` também engole o 403 e entrega rótulos prontos, não as contagens.
- **Degradações honestas (precedente da tela-modelo):** o slot "SLA crítico" dos KPIs vira "Atrasadas" (`overdue` do resumo; o resumo não tem prazo de SLA — mesmo precedente do PR-A em `WorkOrdersPage.tsx:38-39`); o ALERTA "SLA crítico" vem do `slaDueAt` real da fila (vencido ou a menos de 30 min, `SLA_DUE_SOON_THRESHOLD_MS`); "Técnico parado" vem do `isStale` (15 min, `FIELD_LOCATION_STALE_THRESHOLD_MS`); "Reforço solicitado" sai (sem endpoint). Botões: "Filtrar" (×2), "Prioridade", "Atribuir OS", "Ver rota" e "Alocar reforço" saem; "Novo despacho", "Despachar" e "Atribuir agora" viram navegação para `/operations/dispatches` (com `?workOrderId=` quando há OS — o mesmo destino do "Atribuir" da tela-modelo), sob `field_dispatch:create`; "Ver mapa" e "Verificar" vão para `/operations/map`, sob `field_location:read`; linha da fila abre `/work-orders/:id`.
- **Testes (o `frontend/package.json` é proibido, então só em arquivos que já estão no `test:smoke` ou na suíte da raiz):** C1, C2, C3 e C9 numa seção nova de `frontend/tests/sidebar-nav.test.tsx`; C4–C7 numa seção nova de `frontend/tests/field-operators.smoke.test.tsx` (mesmo módulo `dispatch`); contratos atualizados: `sidebar-nav.test.tsx`, `san3-04a-sidebar-estoque-financeiro.test.tsx`, `kpi-cards-clickable-f2b.test.tsx`, `tests/san3-04a-menu-front-x-catalogo.test.ts`, `tests/inventory-abc.test.ts`.

### R-06 — rotas, menus e links (feito)

- Comando: edições com âncora única e EOL preservado (`node -e`, contagem de âncora = 1 ou aborta); `git rm` dos dois módulos seguido de `git restore --staged` (o índice fica como estava: o orquestrador versiona).
- Saída: `git diff --stat` = `App.tsx` (−2 `lazy`, −2 `Route`, +1 comentário), `appSidebarNav.ts` (−`PEDIDOS`/`RELATORIOS`, −2 de `MVP_NAV_PATHS`, −itens em `G_GESTAO_FULL`/finance/inventory, −imports `BarChart3`/`ShoppingCart`), `tenantNavigation.ts` (−l.320-329 e −l.341-350, exatamente dentro de l.320-350; l.62-72 intocadas), `PedidosPage.tsx` e `ReportsPage.tsx` apagados, os 4 de inventory, `docs/navigation-matrix.md` (−l.56, −l.61, regra do finance), `inventory.notifications.ts` (l.56 e 60 + o comentário de cabeçalho l.17-18, que dizia que o aviso leva a Pedidos — mesmo arquivo autorizado, só doc-comentário: declarado), e os testes de contrato (`sidebar-nav`, `san3-04a-sidebar-estoque-financeiro`, `kpi-cards-clickable-f2b` — inclusive `canAll`/`canNone` que ficaram sem uso —, `tests/san3-04a-menu-front-x-catalogo.test.ts`, `tests/inventory-abc.test.ts`).
- Decisão de implementação dentro da regra do orquestrador ("só para retirar os links"): o cta de "Precisam repor" SAI (não é trocado por outro destino); o chip "Repor" da tabela de itens fica como sinal, sem link; a faixa "abaixo do mínimo" do detalhe fica sem o link. Com isso o parâmetro `can` de `buildInventoryKpiDetails` ficou sem função e saiu (o chamador é `EstoquePage.tsx`, autorizado).
- `git grep -n -E "[/]reports|[/]purchase-orders" -- frontend/src` = vazio (código 1).
- `timeout 600 npm --prefix frontend run check` = código 0.
- Estado: parte de menu/rota pronta; testes novos C1/C2/C3/C9 a seguir, junto com o Console.

### R-07 — Console Dispatcher ligado (feito, antes dos testes)

- Arquivos: `frontend/src/modules/dispatch/dispatch-console.service.ts` (novo), `dispatch-console.logic.ts` (novo), `useDispatchConsole.ts` (novo), `pages/DispatchConsolePage.tsx` (reescrita; exporta `DispatchConsoleView` para o teste SSR, como `PlatformOverviewView` no 06b).
- TELA-MODELO de cada mudança (todas com rota em `App.tsx`, R-04):
  - cabeçalho (`PageHeader` kicker "OPERAÇÃO", ações `pat-btn`/`pat-btn--primary`), grade de 4 KPIs (`KpiStatCard`, esqueleto `pat-kpi`+`pat-skel`, "—" com tile neutro quando a fonte falha), tons de situação/prioridade, `StatusPill`, `StatePanel`/`StatePanelAction` embutidos, `StaleDataBanner`, linha clicável com o código como botão → `WorkOrdersPage.tsx` (`/work-orders`, l.768);
  - lista de técnicos (projeção `adaptFieldOperators`, contagem `summarizeFieldOperatorStatuses`, paleta `CH` do `TablePage`) → `FieldOperatorsPage.tsx` (`/field-operators`, l.640);
  - frescor (`isStale`, 15 min), "há X min" (`formatLastSeen`), prazo/tom da fila (`formatIncomingCallSlaProxy`, `incomingCallSlaTone`, `sortIncomingCalls`, `resolveAssignedTechnicianName`) → `OperationsMapPage.tsx` / `operations-map.adapter.ts` (`/operations/map`, l.717);
  - "Atribuir/Despachar" → o mesmo destino do "Atribuir" da tela-modelo (`/operations/dispatches?workOrderId=`), sob `field_dispatch:create`.
- Nenhum componente visual novo; `app.css` intocado; nenhum endpoint, escrita ou dependência nova.
- `timeout 600 npm --prefix frontend run check` = código 0.

### R-08 — testes novos (verdes antes das mutações)

- `frontend/tests/sidebar-nav.test.tsx` (já no `test:smoke`): seção nova `[06a·C1]`, `[06a·C2]`, `[06a·C3]`, `[06a·C9]`. C1 lê as rotas do `App.tsx` e usa o `matchRoutes` do próprio react-router: `/reports`, `/purchase-orders` e um sub-caminho de cada só casam com `path="*"`, que leva a `/login` (desvio declarado do "render em /reports": em SSR o `<Navigate>` não navega e o `AppShell` sem sessão não distingue os dois casos, então o render não seria discriminante; o `matchRoutes` é o mesmo algoritmo que o `<Routes>` usa). C9 exige, além da ausência das duas linhas, que TODA rota da matriz responda no `App.tsx`; a única exceção é pré-existente e nomeada no teste (`/operations/dispatches/:id/timeline`, painel e não rota — nota abaixo), e a exceção que passar a responder também falha.
- `frontend/tests/field-operators.smoke.test.tsx` (já no `test:smoke`, mesmo módulo `dispatch`): seção nova `[06a·C7]`, `[06a·C5]` (403/5xx/2xx sem resumo), `[06a·C4]` (API da organização A → dados de A; API vazia → nenhum literal; KPIs 7/3/4/2 conferidos no `pat-kpi__value`), `[06a·C5]` (cinco estados × 6 blocos por `data-state`; "Localização antiga" em texto), `[06a·C6]` (AST do TypeScript: todo `<button>` com `onClick`; texto e identificadores retirados ausentes, comentários não contam), `[06a·C4]` (página real com os provedores nasce "carregando", sem literal). Dublê só na borda de rede (`globalThis.fetch`); rota não prevista lança.
- Comando: `cd frontend && timeout 300 node --test --import tsx tests/sidebar-nav.test.tsx` → `# tests 18 # pass 18 # fail 0`; `timeout 300 node --test --import tsx tests/field-operators.smoke.test.tsx` → `# tests 10 # pass 10 # fail 0` (a 1ª versão do C6 falhou porque lia o texto cru e o comentário de degradação cita "Alocar reforço"; corrigido para ler só JSX/literais/identificadores pela AST — nenhum código de produto mudou por isso).

### R-09 — mutações (cada critério com a mutação que o derruba, executada)

- Comando: `timeout 1800 node <scratchpad>/06a/mutate.cjs` (executor + lista `mutations.cjs` no scratchpad da sessão). Para cada mutação: sha256 do arquivo → âncora convertida para o EOL do arquivo e contada (= 1 ou aborta) → aplica e PROVA que os bytes mudaram (`applied`) → roda o caso com `node --test --import tsx --test-name-pattern <caso>` (timeout 300 s) → restaura os bytes originais em `finally` → compara o sha256 COMPLETO com o de antes (`restored`). `git status --short` antes e depois das 14 mutações: idêntico (`diff` vazio).
- Saída (uma linha por mutação; sha256 mostrado com 16 caracteres, comparado inteiro):

| id | critério e mutação | arquivo | caso que ficou VERMELHO | sha256 antes = depois |
|---|---|---|---|---|
| M-C1 | C1 — devolver o `Route` de `/purchase-orders` | `frontend/src/App.tsx` | `[06a·C1]` | `83ccd11881f21c46` = ok |
| M-C2 | C2 — devolver PEDIDOS ao grupo do inventory | `appSidebarNav.ts` | `[06a·C2]` | `57ba9b3852bf55a4` = ok |
| M-C3 | C3 — devolver o `Link to="/purchase-orders"` da EstoquePage | `EstoquePage.tsx` | `[06a·C3]` | `7aff4b227f87a2bf` = ok |
| M-C9 | C9 — devolver a linha de Pedidos à matriz | `docs/navigation-matrix.md` | `[06a·C9]` | `b6f08a3ad12f5f21` = ok |
| M-C4a | C4 — devolver `TENANT_NAME` no subtítulo | `DispatchConsolePage.tsx` | `[06a·C4]` (×2: API A e página real) | `efe191881c92040c` = ok |
| M-C4b | C4 — devolver o KPI literal (`value: 14`) | `DispatchConsolePage.tsx` | `[06a·C4]` | `efe191881c92040c` = ok |
| M-C5a | C5 — 403 tratado como vazio | `dispatch-console.service.ts` | `[06a·C5] 403 …` | `0d7589aeb009984f` = ok |
| M-C5b | C5 — `isStale` ignorado na linha do técnico | `dispatch-console.logic.ts` | `[06a·C5] os cinco estados …` | `54128bfbb4903477` = ok |
| M-C5c | C5 — `isStale` ignorado no alerta "Técnico parado" | `dispatch-console.logic.ts` | `[06a·C4]` (o alerta da API A) | `54128bfbb4903477` = ok |
| M-C5d | C5 — falha em 2º plano apaga o dado (sem "desatualizado") | `dispatch-console.logic.ts` | `[06a·C5] os cinco estados …` | `54128bfbb4903477` = ok |
| M-C6 | C6 — devolver "Alocar reforço" sem handler | `DispatchConsolePage.tsx` | `[06a·C6]` | `efe191881c92040c` = ok |
| M-C7 | C7 — tirar o `can()` de `/field-locations/latest` | `dispatch-console.service.ts` | `[06a·C7]` | `0d7589aeb009984f` = ok |
| M-PARE1 | PARE 1 — aviso de reposição volta a `/purchase-orders` | `src/modules/inventory/inventory.notifications.ts` | `[R7.5] … idempotente` (`tests/inventory-abc.test.ts`) | `cb9738dfdd254543` = ok |
| M-INV | PARE 2 — cta "Precisam repor" volta a Pedidos | `inventory-kpi-detail.ts` | `Estoque: 'Precisam repor' sem cta …` (`kpi-cards-clickable-f2b`) | `f06841246983b6c3` = ok |

- Estado: 14/14 mutações mortas (VERMELHO), 14/14 restauradas com sha256 igual. Nenhuma sobreviveu.

### R-10 — ajuste final e reexecução das 14 mutações

- Ajuste: o hook passava `() => false` como "vazio" do resumo, enquanto o teste usava `total === 0` — duas verdades. Agora as duas pontas usam os predicados exportados `isSummaryEmpty`/`isLocationsEmpty` de `dispatch-console.logic.ts` (o hook e o teste). `field-operators.smoke.test.tsx` → `# tests 10 # pass 10 # fail 0`; `npx tsc -b --noEmit` (frontend) código 0.
- Interrupção declarada: uma 1ª rodada do `test:smoke` foi interrompida por mim (TaskStop) para fazer este ajuste antes da bateria; a árvore de processos que sobreviveu (npm 25952 → cmd 30044 → node --test 30232 → 13720/17888) foi morta por `taskkill /T` filtrando pelo caminho `w-06a`, e o temporário que ela deixou (`%TEMP%/.tmp-censo-v8ngQw`, cópia do `App.tsx` DESTE ramo — conferido com `cmp` e `grep B-SAN3-06a`) foi apagado. Nenhum outro processo ou temporário tocado (os servidores de dev do dono seguem de pé).
- Reexecução: `timeout 1800 node <scratchpad>/06a/mutate.cjs` → 14/14 VERMELHO, 14/14 restauradas, `git status --short` idêntico antes/depois. Os sha256 são os da tabela do R-09, exceto `dispatch-console.logic.ts`, que passou a `5b1198d7574484d1` (M-C5b, M-C5c, M-C5d — antes/depois iguais). Casos vermelhos idênticos aos do R-09.

### R-11 — revisão de UI (skill `ui-ux-pro-max`, carregada pela ferramenta Skill) e correção de contraste

- Checklist da skill sobre `DispatchConsolePage.tsx`: componentes e tokens do padrão (nenhum componente novo, nenhuma cor fora da paleta já usada pela tela-modelo); estados do §7 nos blocos; estado semântico com cor + rótulo (prioridade com ponto + nome, prazo em texto, "Localização antiga" em texto, selos "sem acesso"/"indisponível"/"desatualizado"/"sem registros" nos KPIs); o que o papel não pode some (não fica desabilitado de enfeite); teclado: o código da OS é `<button>` (a linha clicável não é o único caminho), "Despachar"/"Atribuir agora"/"Verificar"/"Ver mapa"/"Novo despacho" são `<button type="button">` com foco visível das classes `pat-btn`/`pat-link`; `h1` no `PageHeader`, `h2` nos cartões; nada de termo técnico na UI (§3).
- Achados e correção (contraste de texto pequeno, WCAG 4.5:1, medido pela luminância relativa): tag do alerta "SLA crítico" `#DC2626` sobre `#FEF2F2` = 4,41:1 → `#B91C1C` (5,93:1, o vermelho de texto da tela-modelo); "Sem técnico" e "Sem OS" `#94A3B8` sobre branco = 2,55:1 → `#64748B` (4,76:1). Os demais textos novos: `#B45309`/`#FFFBEB` 4,84:1; prazo `#DC2626`/`#B45309`/`#2563EB`/`#64748B` sobre branco ≥ 4,76:1. Dicas e subtítulos em `#94A3B8` seguem o token de dica do padrão (`.pat-kpi__hint`, `.pat-card__subtitle`), não foram alterados.
- Revalidação: `field-operators.smoke.test.tsx` → `# tests 10 # pass 10 # fail 0`; mutações da página reexecutadas (`mutate.cjs M-C4a M-C4b M-C6`) → 3/3 VERMELHO, sha256 da página agora `7c29cf205a0ed68b` antes = depois, `git status` idêntico.
- Desvios de fidelidade (§11) declarados: os KPIs usam o `KpiStatCard` vertical do padrão (tela-modelo), não o cartão horizontal compacto do PNG — `D-TELAS-SEGUEM-O-PADRAO` manda o componente existente; a composição (4 KPIs · alertas · fila 1fr + técnicos 340px) é a do PNG. Rótulo "SLA crítico" do KPI → "Atrasadas" (ver R-05). A faixa "Reforço solicitado" e os botões sem ação saíram.

### R-12 — escopo medido

- Comando: `git diff --name-status` + `git ls-files --others --exclude-standard` (ref: árvore do worktree sobre `e6b81542`).
- Saída: 22 caminhos — M `docs/navigation-matrix.md`, M `docs/revisoes/SAN3/B-SAN3-06a-dev.md`, M `frontend/src/App.tsx`, M `frontend/src/layouts/appSidebarNav.ts`, A `frontend/src/modules/dispatch/dispatch-console.logic.ts`, A `…/dispatch-console.service.ts`, M `…/dispatch/pages/DispatchConsolePage.tsx`, A `…/dispatch/useDispatchConsole.ts`, M `…/inventory/inventory-kpi-detail.ts`, M `…/inventory/inventory.adapter.ts`, M `…/inventory/pages/EstoqueDetailPage.tsx`, M `…/inventory/pages/EstoquePage.tsx`, D `…/purchase-orders/pages/PedidosPage.tsx`, D `…/reports/pages/ReportsPage.tsx`, M `frontend/src/navigation/tenantNavigation.ts` (só l.320-329 e l.341-350), M `frontend/tests/field-operators.smoke.test.tsx`, M `frontend/tests/kpi-cards-clickable-f2b.test.tsx`, M `frontend/tests/san3-04a-sidebar-estoque-financeiro.test.tsx`, M `frontend/tests/sidebar-nav.test.tsx`, M `src/modules/inventory/inventory.notifications.ts`, M `tests/inventory-abc.test.ts`, M `tests/san3-04a-menu-front-x-catalogo.test.ts`.
- PROIBIDO intocado: `prisma/**`, `migrations/**`, `Kpis/**`, os dois `package.json`, os lockfiles, `/logistics`, `tenantNavigation.ts` l.62-72, `auth.adapter.ts` (C8 fora). Em `src/**`, só o arquivo autorizado pela decisão 1. Nenhum endpoint, escrita ou dependência nova. Nada commitado; o índice está como recebi (as duas exclusões estão só na árvore).
- Fora do plano, mas no mesmo arquivo autorizado (declarado): imports `BarChart3`/`ShoppingCart` de `appSidebarNav.ts`; comentário de cabeçalho de `inventory.notifications.ts` (l.17-18); `canAll`/`canNone` de `kpi-cards-clickable-f2b.test.tsx`; a regra transversal do finance em `docs/navigation-matrix.md`.

### Notas para o orquestrador (pendências sugeridas; o dev não registra em `controle/`)

1. **Avisos já gravados.** O conserto do PARE 1 vale para avisos NOVOS. Avisos de "Ponto de pedido atingido" já gravados no banco seguem com `actionUrl = "/purchase-orders"` e, ao clicar, caem no catch-all. Corrigir exigiria tocar dado persistido (fora deste ramo). Sugestão: pendência com dono a decidir.
2. **Deep-link de rota retirada com sessão ativa.** Medido em `frontend/src/pages/LoginPage.tsx` (a rota `/login` do `App.tsx:177`): a página não redireciona quem já tem sessão — quem abre um link salvo de `/reports` logado cai no formulário de login. É o comportamento pré-existente de TODA rota desconhecida; o plano manda não criar 404 nem redirecionamento neste bloco. Sugestão: pendência de UX (404 dentro do AppShell ou redirecionamento por sessão).
3. **Matriz × rotas (pré-existente).** `docs/navigation-matrix.md` lista `/operations/dispatches/:id/timeline` como tela, mas não há rota no `App.tsx` (é painel). O guard C9 a nomeia como exceção, e a exceção que passar a responder também falha.
4. **Teto de 100 OS no console.** A fila lê no máximo 100 OS (o teto da API, o mesmo do Mapa) e diz isso na tela quando o servidor tem mais. Paginação própria do console não é deste bloco.
5. **Token de dica `#94A3B8`.** Usado pelo padrão inteiro em dica e subtítulo (`.pat-kpi__hint`, `.pat-card__subtitle`); sobre branco dá 2,55:1. Não é deste bloco (é do design system); fica a observação.

### R-13 — bateria (rodada 1, sem banco)

- Comando: `<scratchpad>/06a/battery.sh` em sequência, cada passo com `timeout` e log próprio, código de saída por passo (sem `set -e`).
- Saída:
  - `npm --prefix frontend run check` → código 0 (20:56:45Z–20:57:14Z).
  - `npm --prefix frontend run build` → código 0; `✓ 2180 modules transformed`, `✓ built in 14.31s`; `DispatchConsolePage-*.js 20.73 kB`; nenhum chunk de `PedidosPage`/`ReportsPage` (só o aviso de chunk > 500 kB do `maplibre-gl`, pré-existente).
  - `npm --prefix frontend run test:smoke` → código 0; `# tests 1327 # pass 1327 # fail 0 # cancelled 0 # skipped 0` (TAP, 237 s).
  - `npm test` → código 1; `301 arquivo(s) · 2862 teste(s) · pass 2782 · fail 1 · skipped 79` e o PISO DE DENOMINADOR acusando `tests/core-saas-role-authority.test.ts` sem teste registrado. Causa medida: o arquivo importa `src/database/prisma.ts`, que lança `DATABASE_URL is required` no carregamento — este worktree não tem `.env` nem banco. Prova de que é o ambiente e não o diff: o mesmo arquivo, sozinho, com `DATABASE_URL=<falso>` no env → `# tests 12 # pass 12 # fail 0`; e nenhum arquivo do diff está no fecho de import dele (só `inventory.notifications.ts` em `src/**`). Os 79 skipped são as suítes `-db` que se auto-pulam sem banco.
  - `git diff --check` → código 0, sem saída.
- Estado: a forma sem banco não é a forma do job `backend` da CI (que exporta `DATABASE_URL`/`REDIS_URL` com Postgres 16 e Redis 7 reais). Segue a rodada 2 na forma da CI, em contêineres próprios (`dev06a-`, portas altas em 127.0.0.1), sem tocar a base viva nem os contêineres `trc01-`.

### R-14 — `npm test` na forma do job `backend` da CI (rodada 2)

- Terreno: `docker run` de `dev06a-pg` (postgres:16, `127.0.0.1:47532`) e `dev06a-redis` (redis:7, `127.0.0.1:56479`), imagens já locais (sem download); `DATABASE_URL=… npx prisma migrate deploy` no banco descartável → "All migrations have been successfully applied." Base viva (`erp-postgres`/`erp-redis`, 5432/6379) e contêineres `trc01-` não tocados.
- Comando: `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:47532/erp_techsolutions?schema=public REDIS_URL=redis://127.0.0.1:56479 CORE_SAAS_PERSISTENCE=memory timeout 2400 npm test`.
- Saída: código 1; `301 arquivo(s) · 3288 teste(s) · pass 3280 · fail 6 · skipped 2` (os 2 skipped são os dois casos de `permission-catalog-db-parity` com `RBAC_DB_PARITY` desligado — o orçamento declarado no runner). O `core-saas-role-authority.test.ts` da rodada 1 passa aqui. As 6 falhas (4 casos + 2 pais) são de AMBIENTE WINDOWS, em duas suítes `-db` que este diff não toca nem alcança por import:
  - `tests/san3-05-runtime-role-guard-db.test.ts` T14a/b, T14c, T14d (+ pai): `psql: ausente — pré-requisito da suíte -db` / `scripts/db-runtime-role.sh: line 36: psql: command not found` — o host não tem `psql`; essa suíte é medida em contêiner Linux (como nas juntas do B-SAN3-05) e no runner ubuntu da CI;
  - `tests/san3-09-bootstrap-platform-admin-db.test.ts` T2.1 (+ pai): `node_modules\.bin\prisma:2 … SyntaxError: missing ) after argument list` — o teste executa o shim de shell do `prisma` com o `node` (forma que só funciona no Linux).
- Estado: nenhuma falha nos contratos de frontend da suíte da raiz nem nos testes que este diff mexe (`tests/san3-04a-menu-front-x-catalogo.test.ts`, `tests/inventory-abc.test.ts` verdes nas duas rodadas). A prova das duas suítes `-db` acima é do runner Linux da CI.

### R-15 — limpeza (§C5)

- Contêineres `dev06a-pg`/`dev06a-redis` removidos (`docker rm -f`) e os dois volumes anônimos que eles deixaram também (`docker volume rm 2c5999cb… e8a81b53…`), identificados por data de criação (21:07:49Z/21:07:50Z) e conteúdo (`PG_VERSION=16`; `dump.rdb` de 21:12Z) — os demais volumes órfãos são anteriores a esta sessão e não foram tocados. `docker ps` final: `erp-postgres erp-redis trc01-pg trc01-redis`.
- Removidos do worktree os artefatos regeneráveis desta sessão: `frontend/dist/`, `frontend/tsconfig.tsbuildinfo` e os 25 diretórios de `storage/checklist-attachments/` criados pelas duas rodadas do `npm test` (todos com mtime entre 21:01:59Z e 21:14:27Z; o `.gitkeep` rastreado fica). `node_modules` (raiz e frontend) preservados. `%TEMP%/.tmp-censo-v8ngQw` (da rodada de smoke interrompida) já removido no R-10.
- `git status --short --ignored` sem `!!` fora de `node_modules`.

## Fechamento do dev (dev-06a-claude, 2026-10-11T21:16Z)

- Head: `e6b8154212750b4b84055c51002a91ca53a2b297` (inalterado); índice vazio (`git diff --cached` = 0); 22 caminhos na árvore (R-12). Nada commitado nem empurrado — o orquestrador versiona.
- Critérios: C1, C2, C3, C9 (`frontend/tests/sidebar-nav.test.tsx`) e C4, C5, C6, C7 (`frontend/tests/field-operators.smoke.test.tsx`) verdes, cada um com mutação executada que o deixa VERMELHO e restauração conferida por sha256 (R-09, R-10, R-11: 14/14 mortas). C8 fora deste ramo (decisão 3).
- Bateria, com N e forma:
  - `npm --prefix frontend run check` → código 0;
  - `npm --prefix frontend run build` → código 0, 2180 módulos;
  - `npm --prefix frontend run test:smoke` → TAP `# tests 1327 # pass 1327 # fail 0 # skipped 0`;
  - `npm test` sem banco → `2862 · pass 2782 · fail 1 · skipped 79` (a 1 é `core-saas-role-authority` sem `DATABASE_URL`: ambiente; 12/12 com a variável); `npm test` na forma da CI (Postgres 16 + Redis 7 descartáveis) → `3288 · pass 3280 · fail 6 · skipped 2`, as 6 em duas suítes `-db` que exigem `psql`/shim de shell do Linux (ambiente Windows; fora do diff);
  - `git diff --check` → código 0.
- Pendências sugeridas ao orquestrador: as 5 notas do R-12.
