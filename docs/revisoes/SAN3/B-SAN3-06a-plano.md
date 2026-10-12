# B-SAN3-06a — plano (menu sem tela fictícia), pelo agente da API (2026-10-11)

> Planejador: o agente da API (`claude-opus-5-5`), nível menor, por liberação do dono para planos abaixo do Astra em 2026-10-11. Ref `86ea8a81`. Custo US$ 1,82. Abaixo, o `parecer.md` gerado, sem edição; as decisões do orquestrador sobre as paradas estão no FIM.

# Parecer — investigar @ 86ea8a81fa6e

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-172853Z-plano-06a-b · início 2026-10-11T17:28:54Z · fim 2026-10-11T17:36:27Z
- worktree: C:\Users\AMP\w-ag-20261011-172854 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: processo
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011CfvqxnMU1fM6nvnNWm4Bw', 'req_011CfvqyQrBpRvvf6RD1PUd3', 'req_011CfvqysKPTARas73jgZdrx', 'req_011CfvqzJoKrVXCDxejRZCHP', 'req_011CfvqzZnEBLmGDHF6Fz8UC', 'req_011Cfvr12Z3FqcgCkCiiyjBE', 'req_011Cfvr1jV9wjxVvZ1Lus5Sk', 'req_011Cfvr2HxXvASuW66tc7s7S', 'req_011Cfvr2nEdz3SdpYXGDX8ja', 'req_011Cfvr3JBCmT8tWp2seb98J', 'req_011Cfvr3m2zEi6aqnyxiAQL9', 'req_011Cfvr4Ksvpum5FiiD43i9j', 'req_011Cfvr4oCjXWF8YzbrzgyyL', 'req_011Cfvr5WKWQcADGNcfunXkj', 'req_011Cfvr5o8o5mu7FrWbiBgDC', 'req_011Cfvr6PjQ1CLDxZShmV2yW', 'req_011Cfvr6qdPPSWwdBzBNYQA3', 'req_011Cfvr7Nx3pVqqmvbBcmCMH', 'req_011Cfvr83UJVYAnFHp3K5KpE', 'req_011Cfvr8t3ZE6u7LajXFiq7h', 'req_011Cfvr9dFab9XKWnEpc8rcJ', 'req_011CfvrAaNEK4akaoXHzru9F', 'req_011CfvrC4nHsRTufaYGSaZYB', 'req_011CfvrCkoLWnA5rZnivys1H', 'req_011CfvrDWPSqSw8vtboHqEPe', 'req_011CfvrEQqrT6rHkfiYMjEAt', 'req_011CfvrFdXs5jqES7cDk4KeW', 'req_011CfvrGTzRBXL1wSukyQxNM', 'req_011CfvrHFrwTrzkDdU6wbCPB', 'req_011CfvrHye9dDUceUwLxt8Kc', 'req_011CfvrJtS9ZPpZ3PAupFvRq', 'req_011CfvrKjyBoRKF95UCkS1sV', 'req_011CfvrLha6NySNyqXpgRY5G', 'req_011CfvrMQP2EWP2W1moeGqfF', 'req_011CfvrTmo3JbFkj6SYUDkNX']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T17:35:43Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '400000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T17:36:26Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T17:35:42Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2400000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T17:35:43Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 35 · chamadas de ferramenta: 70 · negadas: 1
- Tokens: entrada 74 · cache escrita 128572 · cache leitura 3025690 · saída 28454 · total 3182790
- US$ estimado: 1.817374 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -F -e D-TELAS-SAN3-06a --
#5 ler_arquivo: código 0 — (sem processo)
#6 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e /reports|/purchase-orders|/dispatch/console -- frontend/src frontend/tests tests docs/navigation-matrix.md
#8 ler_arquivo: código 0 — (sem processo)
#9 ler_arquivo: código 0 — (sem processo)
#10 ler_arquivo: código 0 — (sem processo)
#11 ler_arquivo: código 0 — (sem processo)
#13 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- frontend/src/modules/purchase-orders frontend/src/modules/reports frontend/src/modules/dispatch
#14 ler_arquivo: código 0 — (sem processo)
#15 ler_arquivo: código 0 — (sem processo)
#16 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e path=\"\*\"|Navigate to|NotFound|ForbiddenPage|DispatchConsolePage -- frontend/src/App.tsx
#18 ler_arquivo: código 0 — (sem processo)
#19 ler_arquivo: código 0 — (sem processo)
#21 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e dispatch|Console|console -- frontend/src/layouts/appSidebarNav.ts frontend/src/navigation/tenantNavigation.ts docs/navigation-matrix.md
#22 ler_arquivo: código 0 — (sem processo)
#24 ler_arquivo: código 0 — (sem processo)
#25 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e purchase-orders|purchase_orders|reports:read|\"/reports\" -- src
#26 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e PedidosPage|ReportsPage|DispatchConsolePage|purchase-orders/|reports/pages|dispatch/pages -- frontend tests e2e scripts
#28 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e appSidebarNav|App\.tsx|tenantNavigation|auth\.adapter|navigation-matrix|EstoquePage|EstoqueDetailPage|inventory-kpi-detail -- tests frontend/tests
#29 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e purchase_orders|reports:read|Pedidos|Relatórios -- frontend/src/modules/auth/auth.adapter.ts frontend/tests tests frontend/src/modules/inventory frontend/src/modules/dashboard frontend/src/providers
#31 ler_arquivo: código 0 — (sem processo)
#33 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS|P-SAN3-04A-NAVIGATION-MATRIX-DEFASADA|P-SAN3-04A-MENU-RESIDUAL|P-LOGISTICS-MOCK|P-RBAC-GATING-MOCKSHELLS|P-PURCHASE-ORDERS-BACKEND-GATE -- agent-orchestration/controle/pendencias.md
#34 ler_arquivo: código 0 — (sem processo)
#36 ler_arquivo: código 0 — (sem processo)
#37 ler_arquivo: código 0 — (sem processo)
#38 ler_arquivo: código 0 — (sem processo)
#40 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e GET /operations/dispatches|GET /dashboard/summary|GET /field-locations/latest|GET /work-orders\b|GET /field-operators -- API_CONTRACTS.md docs
#41 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e /operations/dispatches|/dashboard/summary|/field-locations/latest|/field-operators -- src/app.ts src/modules/operations src/modules/dashboard src/modules/field-locations src/modules/field-operators
#43 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e dispatches|field-locations|dashboard/summary|field_dispatch -- API_CONTRACTS.md
#44 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e \"/operations/dispatches\"|\"/field-locations/latest\"|\"/work-orders\",|\"/dashboard/summary\"|\"/field-operators\" -- src/modules
#45 ler_arquivo: código 0 — (sem processo)
#47 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e readonly [a-zA-Z]+[?]?: -- src/modules/dashboard/dashboard.types.ts
#48 ler_arquivo: código 0 — (sem processo)
#49 ler_arquivo: código 0 — (sem processo)
#51 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^  [a-z_]+: \[|\"dashboard:read\"|\"field_location:read\"|\"field_dispatch:read\"|\"work_orders:read\" -- src/modules/core-saas/permissions/catalog.ts
#53 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e field-locations/latest|/operations/dispatches\"|/dashboard/summary|STALE|staleAfter|15 \* 60 -- frontend/src
#54 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e tenantName -- frontend/src/providers frontend/src/modules/context frontend/src/layouts
#56 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- docs/claude-code-handoff/screen-refs/web
#57 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^## 11|screen-refs|8\(1\)|revisor independente -- CLAUDE.md
#58 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e \"(check|build|test:smoke)\" -- frontend/package.json
#60 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e \"test\": -- package.json
#61 ler_arquivo: código 0 — (sem processo)
#63 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e readdir|glob|\.test\.ts -- scripts/run-backend-tests.mjs
#64 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 12 --oneline --date=iso 86ea8a81fa6e833a27910297d88c93ebe0533558 -- frontend/src/layouts/appSidebarNav.ts frontend/src/App.tsx
#65 git_log: NEGADO — (sem processo)
#67 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 20 --oneline --date=iso -GSAN3-12|SAN3-24|SAN3-06a|SAN3-18|cheques|baixa-e-contas --
#68 git_log: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager log --no-color --no-ext-diff --no-textconv -n 8 --oneline --date=iso --
#69 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- frontend/src/modules/finance/cheques frontend/src/modules/finance/period-closes
#71 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e B-SAN3-12|B-SAN3-24 -- agent-orchestration/controle
#73 ler_arquivo: código 0 — (sem processo)
#74 ler_arquivo: código 0 — (sem processo)
#76 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e path=\"/login\"|path=\"/\"|ProtectedRoute|RequireAuth|<Route element= -- frontend/src/App.tsx
#78 ler_arquivo: código 0 — (sem processo)
#79 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e Navigate|navigate\(|isAuthenticated|session -- frontend/src/pages/LoginPage.tsx frontend/src/modules/auth/pages/LoginPage.tsx
#81 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e rota|Route|Navigate|login -- frontend/tests/san3-06b-navegacao-plataforma.test.ts
#83 ler_arquivo: código 0 — (sem processo)
#84 ler_arquivo: código 0 — (sem processo)
#85 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e actionUrl -- frontend/src
#86 ler_arquivo: código 0 — (sem processo)
#88 ler_arquivo: código 0 — (sem processo)
#89 ler_arquivo: código 0 — (sem processo)
#91 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e reports|purchase|Pedidos de compra|Console Dispatcher|sc_dispatchConsole -- frontend/src frontend/e2e e2e
#93 ler_arquivo: código 0 — (sem processo)
#94 ler_arquivo: código 0 — (sem processo)
#96 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e components/TablePage -- frontend/src frontend/tests
#97 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e \"/reports\"|\"/purchase-orders\"|reports|purchase -- src/modules/navigation/navigation.registry.ts
#99 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^export type (LatestFieldLocation|FieldLocation\w*|OperationsMapFieldLocation)|^\s+(operatorName|userName|teamName|team|workOrderId|currentWorkOrderId|status|capturedAt|isStale|displayName)\??: -- frontend/src/modules/operations/map/operations-map.types.ts
#101 ler_arquivo: código 0 — (sem processo)
#103 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e sla\w*\??:|dueAt\??:|deadline\w*\??:|assignedUser\w*\??:|teamId\??: -- frontend/src/modules/work-orders/work-orders.types.ts
#105 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e reforço|reinforcement|backup_request -- src
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
PLANO B-SAN3-06a na ref 86ea8a81. Base: D-TELAS-SAN3-06a (decisoes.md:3457-3465) e a linha 272 do PLANO_SAN3.md.
§0 PROPRIEDADE. (P1) Cada item que buildSidebarNav(papel) devolve, para cada RoleKind, leva a uma página em que todo número, linha ou nome vem de resposta da API do contexto ativo. Constante só é aceita em rótulo de interface. (P2) "Rota retirada não responde" significa: nenhum Route nem lazy import de /reports e /purchase-orders no App.tsx; nenhuma entrada em NAV_BY_ROLE, MVP_NAV_PATHS e tenantNavigation; nenhum link literal para esses caminhos em frontend/src; os diretórios purchase-orders/ e reports/ apagados. Link salvo e deep-link: o App.tsx não tem 404 nem catch-all dentro do AppShell; o padrão existente é `path="*"` → Navigate /login (l.819), e é para lá que os dois caminhos passam a cair. O bloco não cria 404 nem redirecionamento.
PARE 1: o backend grava notificação com actionUrl "/purchase-orders" (src/modules/inventory/inventory.notifications.ts:56,60), e a NotificationsPage navega até esse endereço (l.263-264). O conserto está em src/**, que é proibido. O dono escolhe: (a) aceitar o link morto e abrir pendência; (b) autorizar nominalmente esse arquivo e tests/inventory-abc.test.ts:145; (c) Navigate para /inventory, o que contraria "sai da rota".
PARE 2: há três links vivos para /purchase-orders fora da fronteira: EstoquePage.tsx:667, EstoqueDetailPage.tsx:221 e inventory-kpi-detail.ts:66. É preciso ampliação nominal de frontend/src/modules/inventory/{pages/EstoquePage.tsx,pages/EstoqueDetailPage.tsx,inventory-kpi-detail.ts,inventory.adapter.ts}.
CONSOLE. Medição: a tela não está no menu, só na rota (App.tsx:648-654, guard field_dispatch:read). Blocos e fontes:
- organização: activeContext.tenantName (context/types.ts:5), no lugar de TENANT_NAME (l.9);
- KPIs (contagens): GET /dashboard/summary (API_CONTRACTS:368, dashboard:read);
- "Disponíveis" e Técnicos: GET /field-locations/latest (:354, field_location:read);
- fila: GET /work-orders (slaDueAt, assignedUserId) mais GET /operations/dispatches (:348, field_dispatch:read). O GET /work-orders não consta no API_CONTRACTS.md; está em docs/api.md:994;
- alertas "SLA crítico" e "Técnico parado": derivados da fila e de isStale (limite de 15 min, operations-map.adapter.ts:22);
- "Reforço solicitado": não tem endpoint (grep em src = 0), SAI;
- os botões sem onClick (Novo despacho, Despachar, Atribuir, Alocar reforço, Ver rota, Filtrar, Prioridade) saem ou viram navegação para tela real existente. O bloco não cria escrita nem endpoint.
Estados por bloco: carregando, vazio, erro, acesso não permitido (403 da fonte; o field_technician tem field_dispatch:read e não tem field_location:read) e desatualizado (capturedAt > 15 min, mais a hora da última busca). Em modo real não há fallback para mock. Cada bloco é gateado por can() com a permissão do endpoint. Referência visual: screen-refs/web/console-tempo-real.png existe.
ESCOPO PERMITIDO: App.tsx (l.94-95, 535-550); modules/{purchase-orders,reports}/** (apagar); DispatchConsolePage.tsx (hook ou adapter novo exige ampliação, senão reusar os serviços de operations/map e work-orders); appSidebarNav.ts (l.92, 94, 152, 200, 203-213, 263, 265); tenantNavigation.ts (l.320-350); auth.adapter.ts só l.260-357; docs/navigation-matrix.md; os testes citados abaixo.
ESCOPO PROIBIDO: prisma/**, migrations/**, src/** (inclusive catalog.ts: purchase_orders e reports ficam no catálogo), Kpis/**, lockfiles, os dois package.json, dependência nova, /logistics e tenantNavigation l.62-72. Como o frontend/package.json é proibido, teste novo vai em arquivo que já está no test:smoke ou em tests/*.test.ts (o runner lê o diretório).
CRITÉRIOS, com a mutação que derruba cada um:
- C1 as rotas somem (leitura por texto do App.tsx e render em /reports → /login). Mutação: devolver o Route.
- C2 menus sem os dois caminhos, em todos os RoleKind e no tenantNavigation. Mutação: devolver PEDIDOS ao grupo inventory.
- C3 zero literal para os caminhos em frontend/src. Mutação: devolver o Link da EstoquePage.
- C4 o console com a API A mostra os dados de A e com API vazia não mostra "14", "OS-2901" nem "Techsolutions Industrial". Mutação: devolver TENANT_NAME ou os KPIS.
- C5 os cinco estados em cada bloco. Mutação: 403 tratado como vazio, ou isStale ignorado.
- C6 nenhum button sem handler (leitura por AST). Mutação: devolver "Alocar reforço".
- C7 sem field_location:read não sai requisição a /field-locations/latest. Mutação: tirar o can().
- C8 rolePermissions igual ao catálogo, papel a papel. Mutação: remover uma permissão do mapa.
- C9 navigation-matrix sem as l.56 e 61 e conferida por guard.
Testes a atualizar: sidebar-nav.test.tsx (29, 31, 193, 211), san3-04a-sidebar-estoque-financeiro.test.tsx (48, 74), kpi-cards-clickable-f2b.test.tsx (74-76), tests/san3-04a-menu-front-x-catalogo.test.ts (187).
BATERIA: npm --prefix frontend run check, build e test:smoke; npm test; git diff --check.
ORDEM, medida no main: o último commit que tocou appSidebarNav.ts e App.tsx é aadaa6d5 (B-SAN3-04a). Não há commit do SAN3-12 ou do SAN3-24, e finance/cheques e period-closes não existem. Ramos e PRs abertos não foram medidos. Logo, não há conflito com código já mergeado; reordenar é decisão do orquestrador e do dono.
GOVERNANÇA: as telas sozinhas iriam por revisor independente + CI (§C7 8(1)). O bloco não toca permissão de backend. Ele toca, porém, o mapa de permissões do front (rolePermissions) e o residual de menu: isso é permissão, então vai a junta, como a linha 272 já prevê. Sugestão: separar 06a-telas (revisor) de 06a-perm (junta).
```

### Achados


#### Achado 1 — gravidade: bloqueia · escopo: pre-existente · linha: 60 · evidência conferida na auditoria: não

- Conferência (gerado pelo script): não conferida: nenhuma chamada executada tem essa ferramenta e esses argumentos

```
arquivo: src/modules/inventory/inventory.notifications.ts
motivo: Se a rota for retirada, a notificação do backend fica apontando para uma rota morta. O conserto exige src/**, que é proibido, e por isso o plano PARA até o dono escolher (a), (b) ou (c).
comando citado: buscar {"padrao": "purchase-orders|purchase_orders|reports:read|\"/reports\"", "caminhos": ["src"]}
saída citada:
src/modules/inventory/inventory.notifications.ts:56: "Considere repor o estoque em /purchase-orders.", :60: actionUrl: "/purchase-orders"
```

#### Achado 2 — gravidade: bloqueia · escopo: pre-existente · linha: 667 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #6

```
arquivo: frontend/src/modules/inventory/pages/EstoquePage.tsx
motivo: Há três links vivos para /purchase-orders fora da fronteira da l.272. Sem ampliação nominal, eles levam a /login depois da retirada.
comando citado: buscar {"padrao": "/reports|/purchase-orders|/dispatch/console", "caminhos": ["frontend/src", "frontend/tests", "tests", "docs/navigation-matrix.md"]}
saída citada:
EstoqueDetailPage.tsx:221 <Link to="/purchase-orders"; EstoquePage.tsx:667 to="/purchase-orders"; inventory-kpi-detail.ts:66 cta to /purchase-orders
```

#### Achado 3 — gravidade: nota · escopo: pre-existente · linha: 819 · evidência conferida na auditoria: não

- Conferência (gerado pelo script): não conferida: nenhuma chamada executada tem essa ferramenta e esses argumentos

```
arquivo: frontend/src/App.tsx
motivo: Não existe 404. O padrão para rota desconhecida é ir para /login, e é assim que o deep-link de uma rota retirada se comporta.
comando citado: buscar {"padrao": "path=\"\\*\"|Navigate to|NotFound|ForbiddenPage|DispatchConsolePage", "caminhos": ["frontend/src/App.tsx"]}
saída citada:
819: <Route path="*" element={<Navigate to="/login" replace />} />
```

#### Achado 4 — gravidade: nota · escopo: pre-existente · linha: 9 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #19

```
arquivo: frontend/src/modules/dispatch/pages/DispatchConsolePage.tsx
motivo: A tela inteira é literal e as ações são fictícias. O console não está no menu: a busca por dispatch/console só achou ocorrência no App.tsx.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/dispatch/pages/DispatchConsolePage.tsx"}
saída citada:
9: const TENANT_NAME = "Techsolutions Industrial"; 37-63: KPIS/ALERTS/QUEUE/TECHS literais; botões sem onClick l.85,88,129,130,187,189
```

#### Achado 5 — gravidade: nota · escopo: pre-existente · linha: 912 · evidência conferida na auditoria: não

- Conferência (gerado pelo script): não conferida: nenhuma chamada executada tem essa ferramenta e esses argumentos

```
arquivo: src/modules/core-saas/permissions/catalog.ts
motivo: O técnico entra no console pela rota, mas leva 403 no bloco Técnicos. Por isso o estado 'acesso não permitido' tem de ser por bloco.
comando citado: buscar {"padrao": "^  [a-z_]+: \\[|\"dashboard:read\"|\"field_location:read\"|\"field_dispatch:read\"|\"work_orders:read\"", "caminhos": ["src/modules/core-saas/permissions/catalog.ts"]}
saída citada:
field_technician: [ 913 dashboard:read, 944 work_orders:read, 949 field_dispatch:read (sem field_location:read)
```

#### Achado 6 — gravidade: ajuste · escopo: pre-existente · linha: 187 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #31

```
arquivo: tests/san3-04a-menu-front-x-catalogo.test.ts
motivo: É um contrato da suíte backend que lê .tsx por texto e precisa ser atualizado. O residual de menu (manager×Sessões, field_technician×Seguros/Estoque) exige mapBackendRole ou catalog, que estão fora da fronteira.
comando citado: ler_arquivo {"caminho": "tests/san3-04a-menu-front-x-catalogo.test.ts", "linha_inicial": 20, "max_linhas": 260}
saída citada:
187: ["OPERAÇÃO/Checklists", "GESTÃO/Estoque", "GESTÃO/Pedidos", "GESTÃO/Relatórios", ...]; 157-160 ALLOWLIST_MENU (P-SAN3-04A-MENU-RESIDUAL, dono B-SAN3-06a)
```

#### Achado 7 — gravidade: nota · escopo: pre-existente · linha: — · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #64

```
arquivo: frontend/src/layouts/appSidebarNav.ts
motivo: No main, o SAN3-12 e o SAN3-24 ainda não tocaram os arquivos de menu (git_ls_files de finance/cheques e period-closes voltou vazio). PRs e ramos abertos não foram medidos.
comando citado: git_log {"rev": "86ea8a81fa6e833a27910297d88c93ebe0533558", "caminhos": ["frontend/src/layouts/appSidebarNav.ts", "frontend/src/App.tsx"], "max_entradas": 12, "formato": "oneline", "data_iso": true}
saída citada:
aadaa6d5 fix(rbac): catalogo, banco e menu convergem a matriz de papeis (B-SAN3-04a) — último toque
```

### Limitações

```
- Não houve como listar PRs nem ramos remotos: não existe ferramenta gh pr list e git_log com --all foi negado. A medição de conflito vale só para o main 86ea8a81.
- Nenhum teste foi executado, porque a execução está negada nesta rodada.
- Não conferi se a LoginPage redireciona uma sessão já ativa (hipótese).
- O comportamento real da paginação de GET /work-orders nos KPIs ficou como hipótese; por isso o plano usa /dashboard/summary para as contagens.
```

## Decisões do orquestrador sobre o plano (2026-10-11), para o dono vetar se quiser

Base: `D-TELAS-SEGUEM-O-PADRAO` e `D-TELAS-SAN3-06a`. Relatórios e Pedidos "saem do menu e da rota", e não sair inteiro deixaria link quebrado. As decisões abaixo executam essa decisão do dono; nenhuma é escopo novo de produto.

1. **PARE 1 → opção (b).** Fica autorizado, nominalmente:
   - `src/modules/inventory/inventory.notifications.ts` (l.56 e 60): o `actionUrl` passa a apontar para a tela de estoque que existe, sem `/purchase-orders`;
   - `tests/inventory-abc.test.ts:145`.
   Nada mais em `src/**`.
2. **PARE 2 → ampliação nominal.** Ficam autorizados:
   - `frontend/src/modules/inventory/pages/EstoquePage.tsx`;
   - `frontend/src/modules/inventory/pages/EstoqueDetailPage.tsx`;
   - `frontend/src/modules/inventory/inventory-kpi-detail.ts`;
   - `frontend/src/modules/inventory/inventory.adapter.ts`.
   Só para retirar os links para `/purchase-orders`.
3. **O bloco se divide em dois:**
   - **`B-SAN3-06a-telas`** (este ramo) tira as rotas, os menus e os links e liga o Console Dispatcher. Governança: revisor + CI (§C7 item 8(1)).
   - **`B-SAN3-06a-perm`** faz o `rolePermissions` de `auth.adapter.ts` igual ao catálogo e mede o C8. Vai a junta, porque é permissão, e fica para depois.
   - Neste ramo, o critério **C8 sai** e `auth.adapter.ts` **não** se toca.
4. **A ordem do arquivo de menu não se aplica agora.** O plano mediu que o SAN3-12 e o SAN3-24 não têm commit na `main`, e o orquestrador confere os ramos e PRs abertos antes do dev. Sem conflito, o 06a-telas vai agora.
5. **A tela segue o padrão do sistema (`D-TELAS-SEGUEM-O-PADRAO`).** O Console Dispatcher é LIGADO a partir do que existe:
   - os serviços de `operations/map` e de `work-orders`;
   - os componentes de `COMPONENT_LIBRARY.md`;
   - os estados do §7;
   - a referência `screen-refs/web/console-tempo-real.png` (§11).
   Hook ou adapter novo só se não houver equivalente; nesse caso, ele é declarado no relatório.
