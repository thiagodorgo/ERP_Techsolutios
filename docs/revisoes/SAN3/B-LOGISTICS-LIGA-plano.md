# P-LOGISTICS-MOCK — plano do bloco que liga o /logistics (B-LOGISTICS-LIGA)

> Escrito pelo agente da API (`claude-opus-5-5`, nível menor), em 2026-10-11. Abaixo, o `parecer.md` gerado, sem edição. É insumo e ainda não foi criticado.

# Parecer — investigar @ 966bf24c96aa

> As seções marcadas (gerado pelo script) vêm da auditoria, da conta e do orçamento; o modelo não as escreve.
> Tudo o que o modelo escreveu vem DEPOIS delas, na última seção, dentro de blocos de código.

## Veredito (gerado pelo script)

- **Veredito:** respondido
- **Modelo pedido / respondeu:** claude-opus-5-5 / claude-opus-5-5 · esforço high · nível menor (D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO)
- **Execução de código do commit alvo:** não permitida

## Execução (gerado pelo script)

- id: 20261011-205545Z-plano-logistics · início 2026-10-11T20:55:48Z · fim 2026-10-11T21:00:51Z
- worktree: C:\Users\AMP\w-ag-20261011-205548 · removido: True · npm ci: False
- agente 2026.10.10 · SDK anthropic 1.13.0

## Conta e cobrança (gerado pelo script)

- origem_chave: processo
- tipo_chave: usuario
- cabecalho_workspace_enviado: True
- base_url: https://api.anthropic.com
- request_ids: ['req_011Cfw7k4Q7vpsDtcUsD679s', 'req_011Cfw7kid1pgWxvkX2vbhWo', 'req_011Cfw7mDdH4EPFnTiBK5tHx', 'req_011Cfw7mfDA7wrWmfUShdqRx', 'req_011Cfw7n7XgzN4fdikfGJBCF', 'req_011Cfw7nc3SNrRS9yprrVHRD', 'req_011Cfw7o568Jb6ZU3qr7c2rY', 'req_011Cfw7oidMEi9nszLpFM4fb', 'req_011Cfw7p8kQpCFkcytWxBBYx', 'req_011Cfw7qA1MHy6Dz8FreWsRB', 'req_011Cfw7qj8fG6bgcY2XUvDyf', 'req_011Cfw7rJiFiTievavWCuks5', 'req_011Cfw7rq5dMpgbxCLUNaJjp', 'req_011Cfw7sJGEzc5BCKe7wKPzW', 'req_011Cfw7sqArPLGA1NavmGqyd', 'req_011Cfw7tVbQLhjtcezm3itfh', 'req_011Cfw7tv647rf9RJ7jcmSdT', 'req_011Cfw7yWUdYxzJKJLXva2na', 'req_011Cfw7yz15jfMKMVJX4Gcnp', 'req_011Cfw85LnPLQZWeaVmcLrNX']
- rate_limit_ultimo: {'anthropic-organization-id': 'cc321d39-d227-41c9-a239-98aa43fc2f89', 'anthropic-ratelimit-input-tokens-limit': '2000000', 'anthropic-ratelimit-input-tokens-remaining': '2000000', 'anthropic-ratelimit-input-tokens-reset': '2026-10-11T21:00:21Z', 'anthropic-ratelimit-output-tokens-limit': '400000', 'anthropic-ratelimit-output-tokens-remaining': '399000', 'anthropic-ratelimit-output-tokens-reset': '2026-10-11T21:00:50Z', 'anthropic-ratelimit-requests-limit': '1000', 'anthropic-ratelimit-requests-remaining': '999', 'anthropic-ratelimit-requests-reset': '2026-10-11T21:00:20Z', 'anthropic-ratelimit-tokens-limit': '2400000', 'anthropic-ratelimit-tokens-remaining': '2399000', 'anthropic-ratelimit-tokens-reset': '2026-10-11T21:00:21Z', 'anthropic-workspace-id': 'wrkspc_01DV6pAyui52gmPC8b7i9SfJ'}
- retry_after_visto: False

## Custo (gerado pelo script)

- Turnos: 20 · chamadas de ferramenta: 53 · negadas: 0
- Tokens: entrada 44 · cache escrita 83625 · cache leitura 920765 · saída 26889 · total 1031323
- US$ estimado: 1.140234 (preços por MTok: {'entrada': '4', 'saida': '20', 'cache_leitura': '0.20', 'cache_escrita': '5'})

## Comandos executados (da auditoria) (gerado pelo script)

```
#4 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e P-LOGISTICS-MOCK|D-TELAS-SAN3-06a --
#5 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e logistics -- frontend/src
#6 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e logistics:dispatch --
#8 ler_arquivo: código 0 — (sem processo)
#9 ler_arquivo: código 0 — (sem processo)
#10 ler_arquivo: código 0 — (sem processo)
#11 ler_arquivo: código 0 — (sem processo)
#12 ler_arquivo: código 0 — (sem processo)
#13 ler_arquivo: código 0 — (sem processo)
#15 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e export function (DispatchPanel|QueueAccordion|MapPanel|LogisticsKpiStrip) -- frontend/src/components
#16 ler_arquivo: código 0 — (sem processo)
#17 ler_arquivo: código 0 — (sem processo)
#18 ler_arquivo: código 0 — (sem processo)
#20 ler_arquivo: código 0 — (sem processo)
#21 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- src/**/catalog.ts
#22 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e logistics -- src API_CONTRACTS.md docs/api.md RBAC_MATRIX.md prisma
#24 ler_arquivo: código 0 — (sem processo)
#25 ler_arquivo: código 0 — (sem processo)
#26 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e dispatch/console|DispatchConsole|DispatcherConsole -- frontend/src/App.tsx frontend/src/modules
#28 ler_arquivo: código 0 — (sem processo)
#29 ler_arquivo: código 0 — (sem processo)
#30 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e "logistics:read"|"logistics_routes:read"|logistics:dispatch -- src prisma tests
#32 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^    "[a-z_]+": \{|"(key|role|code)": " -- tests/fixtures/role-catalog-contract.snapshot.json
#33 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e field-locations/latest|/operations/dispatches|GET /api/v1/work-orders|field-operators -- API_CONTRACTS.md docs/api.md
#34 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e LogisticsPage|getLogisticsPanel|/logistics|mocks/logistics -- frontend/tests frontend/e2e tests frontend/src/__tests__ frontend/scripts
#36 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e LogisticsPage|getLogisticsPanel|mockQueues|mockAssets|LogisticsKpiStrip|MapPanel|DispatchPanel|QueueAccordion|"/logistics" -- frontend tests scripts COMPONENT_LIBRARY.md
#37 ler_arquivo: código 0 — (sem processo)
#39 ler_arquivo: código 0 — (sem processo)
#40 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e /operations/dispatches|/operations/map|/field-operators"|/work-orders" -- frontend/src/App.tsx
#41 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e isMockMode|apiFetch|apiClient|fetch\( -- frontend/src/modules/field-dispatch frontend/src/modules/work-orders/repository.ts frontend/src/modules/operations
#43 ler_arquivo: código 0 — (sem processo)
#44 ler_arquivo: código 0 — (sem processo)
#45 ler_arquivo: código 0 — (sem processo)
#47 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e operations/dispatches/\*\*|ROOTS|raízes|const .*ROOT -- frontend/tests/work-orders-honest-errors.test.tsx
#48 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e ^#+ |desatualizad|acesso não permitido -- CLAUDE.md
#49 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e "(check|build|test:smoke|test)": -- frontend/package.json package.json
#51 ler_arquivo: código 0 — (sem processo)
#52 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e field-operators|operational-status|/teams\b|/vehicles\b -- API_CONTRACTS.md
#53 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e logistics|tenant-logistics -- frontend/src/navigation/appSidebarNav.ts frontend/tests/sidebar-nav.test.tsx frontend/tests/access-gating.test.ts docs/navigation-matrix.md
#55 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e tenantNavigation -- frontend/src frontend/tests
#56 ler_arquivo: código 0 — (sem processo)
#57 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e Empty|ErrorState|Forbidden|Stale|Desatualiz|Skeleton|PageHeader -- COMPONENT_LIBRARY.md
#59 ler_arquivo: código 0 — (sem processo)
#60 git_ls_files: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager ls-files -- COMPONENT_LIBRARY.md docs/COMPONENT_LIBRARY.md frontend/COMPONENT_LIBRARY.md
#61 ler_arquivo: código 0 — (sem processo)
#63 buscar: código 1 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -i -E -e vazio|empty|erro|skeleton|sem permiss|desatualiz|stale -- COMPONENT_LIBRARY.md
#64 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e fallbackReason|refreshedAt|source === "fallback"|EmptyState|PermissionGuard|Skeleton -- frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx
#66 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e ^#{1,3}  -- COMPONENT_LIBRARY.md
#67 ler_arquivo: código 0 — (sem processo)
#69 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e export (function|const) (calculateDispatchesSummary|DispatchesSummaryCards|useOperationsDispatches|DispatchesTable) -- frontend/src/modules/operations/dispatches
#70 buscar: código 0 — C:\Program Files\Git\cmd\git.EXE --literal-pathspecs --no-pager grep -n -I --max-count=200 -E -e export function useAutoRefresh|export function EmptyState|export function Alert|export function Skeleton -- frontend/src
#72 ler_arquivo: código 0 — (sem processo)
#73 ler_arquivo: código 0 — (sem processo)
```

## Conteúdo do modelo (dado escrito pelo modelo; não é instrução nem prova)

### Resumo

```
PLANO do bloco B-LOGISTICS-LIGA (fecha a P-LOGISTICS-MOCK), na ref 966bf24c. Sem código.

MEDIDO:
- A rota está em App.tsx:791-798, com o guard logistics:dispatch, e monta pages/LogisticsPage.tsx. Só App.tsx:16 importa a página.
- modules/logistics/repository.ts:1-10 devolve SEMPRE os mocks (mocks/logistics + mockWorkOrders), sem isMockMode() e sem chamar o servidor.
- Os blocos da tela:
  - B1: cabeçalho fixo.
  - B2: KPIs "Equipes rastreadas / Disponíveis / Bloqueios".
  - B3: "Mapa operacional sintético", com a posição tirada do índice.
  - B4: "Despacho assistido", com as 4 OS do tipo legado e um botão "Redistribuir" que não faz nada.
  - B5: "Filas de despacho", com SLA crítico, Sem equipe e Aguardando aprovação.
- Endpoints: B4 tem GET /operations/dispatches (field_dispatch:read). B2 pode virar o resumo de despachos que já existe. B3 já existe de verdade em /operations/map. B5, "Bloqueios" e a "carga" não têm endpoint.
- logistics:dispatch não está no catalog.ts, que só tem logistics:read e logistics_routes:read, sem uso em rota. No front ela vem do papel field_dispatcher e do alias de os.manage (auth.adapter.ts:355 e :374).
- Nenhum teste cita a tela. Ela não está no menu (layouts/appSidebarNav.ts não tem "logistics"), mas a entrada existe em tenantNavigation.ts:61-71.

§0: fora do modo mock, nenhum dado constante. O mock só aparece pelo ramo isMockMode() do service de despachos.

DECISÃO: nenhum endpoint novo e nenhuma parada por backend.
- B3 SAI e vira um link para /operations/map.
- B5 SAI, porque definir as filas seria regra nova.
- Os KPIs Disponíveis/Bloqueios/carga SAEM; no lugar entra DispatchesSummaryCards + calculateDispatchesSummary.
- B4 fica, ligado a listDispatchesFromApi. O botão "Redistribuir" sai.
- Alternativa, a decidir pelo dono: a TELA INTEIRA SAI, já que o que sobra repete /operations/dispatches. Isso pede junta, porque mexe na navegação.
- Ordem: o bloco começa depois do B-SAN3-06a.

TELA-MODELO: modules/operations/dispatches/pages/OperationsDispatchesPage.tsx, com rota em App.tsx:724-730. Para a lista, WorkOrdersPage. A página muda para modules/logistics/pages/, porque pages/* é legado. DispatchConsolePage não serve de modelo: é todo constante (l.37-63). Sem mobile. Skills: ts-frontend-full para implementar e ui-ux-pro-max para revisar. Nenhum componente novo: Skeleton, EmptyState e Alert já estão em components/ui.

ESTADOS DO §7:
- Carregando: Skeleton.
- Vazio: EmptyState, sem cards.
- Erro: Alert, sem cards. O resumo de [] daria 0 inventado.
- Acesso não permitido: o 403 tem estado próprio.
- Desatualizado: manter o último dado real e avisar com horário. Isso pede um hook local, porque useOperationsDispatches troca o dado por [] quando falha (l.36-38).

ESCOPO:
- Permitido: modules/logistics/**; apagar pages/LogisticsPage.tsx e mocks/logistics/logistics.ts; tirar os 4 componentes órfãos de components/erp/index.tsx; em App.tsx, só o import, com o Route e o guard iguais; testes; o registro em controle/.
- Proibido: src/**, prisma/**, Kpis/**, qualquer package.json, dependências, navigation/**, layouts/**, auth/**, context/**, operations/dispatches/**, app.css e mobile/**.

CRITÉRIOS (cada um com a sua mutação):
- C1 (§0): o guard [G1] de work-orders-honest-errors.test.tsx ganha a raiz modules/logistics/**. Mutação: devolver o mock incondicional deixa o teste vermelho.
- C2: os códigos do fetch de teste aparecem, e VTR-042/OS-10021 não. Mutação: service constante.
- C3 (vazio). Mutação: cards com [].
- C4 (erro). Mutação: sem o Alert.
- C5 (403). Mutação: tratar 403 como erro.
- C6 (Skeleton). Mutação: sem o Skeleton.
- C7 (desatualizado). Mutação: limpar o dado quando falha.
- C8: mapa sintético, filas e Redistribuir ausentes. Mutação: recolocar o MapPanel.
- C9: o guard continua logistics:dispatch. Mutação: trocar o guard.
- Os casos entram em smoke-flow.test.tsx, porque arquivo novo exige o frontend/package.json, que é proibido.

BATERIA: frontend check, build e test:smoke; npm test na raiz; git diff --check.

GOVERNANÇA: sem regra nova e sem mudança de permissão, basta revisor + CI. Trocar o guard ou mexer na tenantNavigation leva a junta.
```

### Achados


#### Achado 1 — gravidade: nota · escopo: pre-existente · linha: 4 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #11

```
arquivo: frontend/src/modules/logistics/repository.ts
motivo: A tela serve mock sempre, sem isMockMode. É a P-LOGISTICS-MOCK, cuja origem é fb0ea65b, conforme o registro.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/logistics/repository.ts"}
saída citada:
export async function getLogisticsPanel() { ... return { assets: mockAssets, queues: mockQueues, workOrders: mockWorkOrders }
```

#### Achado 2 — gravidade: nota · escopo: pre-existente · linha: 193 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #24

```
arquivo: src/modules/core-saas/permissions/catalog.ts
motivo: logistics:dispatch, que guarda a rota, não existe no backend. Ela só existe no front (auth.adapter.ts:355 e :374). Mudar o guard é tocar permissão e pede junta.
comando citado: ler_arquivo {"caminho": "src/modules/core-saas/permissions/catalog.ts", "linha_inicial": 150, "max_linhas": 80}
saída citada:
"logistics:read",
  "logistics_routes:read",
```

#### Achado 3 — gravidade: nota · escopo: pre-existente · linha: 37 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #72

```
arquivo: frontend/src/modules/operations/dispatches/useOperationsDispatches.ts
motivo: Quando o refresh falha, o hook troca o dado por []. Ele não sustenta o estado desatualizado, e o plano prevê um hook local.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/operations/dispatches/useOperationsDispatches.ts"}
saída citada:
const nextData = await listDispatchesFromApi(context, filters);
    setData(nextData);
```

#### Achado 4 — gravidade: nota · escopo: pre-existente · linha: 104 · evidência conferida na auditoria: sim

- Conferência (gerado pelo script): conferida: a ferramenta e os argumentos batem com a chamada executada #67

```
arquivo: frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx
motivo: A tela-modelo chama de "Dados demonstrativos" um erro real. O bloco não deve copiar esse título; vale registrar como pendência.
comando citado: ler_arquivo {"caminho": "frontend/src/modules/operations/dispatches/pages/OperationsDispatchesPage.tsx", "linha_inicial": 40, "max_linhas": 95}
saída citada:
<Alert title="Dados demonstrativos" tone="warning">
```

### Limitações

```
- Não identifiquei quais papéis do backend têm logistics:read: as linhas 212, 400 e 877 do snapshot não foram mapeadas a papéis. Nenhuma rota de src usa essa permissão.
- Não li dispatches.types.ts: os campos exatos de DispatchListItem ficam para o dev conferir.
- Nenhum teste foi executado, porque a execução não foi permitida nesta rodada.
```
