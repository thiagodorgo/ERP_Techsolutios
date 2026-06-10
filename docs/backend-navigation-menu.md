# Backend Navigation Menu Registry

## Objetivo

`backend-navigation-menu` cria uma fonte oficial no backend para o frontend renderizar menus sem duplicar estrutura sensivel em hardcode. A primeira versao usa catalogo versionado em codigo, nao tabela de banco.

Endpoint oficial:

```http
GET /api/v1/navigation/menu
```

Regras:

- exige autenticacao;
- usa usuario, tenant, roles e permissoes do contexto autenticado;
- separa boundary Platform e Tenant;
- filtra por permissoes RBAC;
- filtra por modulos habilitados do tenant quando aplicavel;
- preserva ordem estavel;
- retorna itens com `status`, `icon`, `group`, `requiredPermissions`, `requiredModules` e `relatedEndpoints`;
- remove metadata sensivel antes da resposta;
- retorna `[]` quando nenhum item e permitido.

O menu e apenas UX. A autorizacao real permanece nos endpoints backend por RBAC, tenant context, RLS quando aplicavel e validacao de recurso por `tenant_id`.

Consumidor frontend atual:

- `frontend/src/modules/navigation/navigation.service.ts` chama este endpoint;
- `frontend/src/modules/navigation/navigation.adapter.ts` normaliza a resposta para o formato visual;
- `frontend/src/modules/navigation/useNavigationMenu.ts` mantém loading/error/data/refetch/isFallback;
- `PlatformLayout` usa `scope=platform`;
- `AppShell` usa o menu autenticado sem scope para renderizar grupos tenant/operations/logistics/finance;
- fallback local permanece para `VITE_USE_MOCKS=true`, indisponibilidade temporaria da API e resposta vazia enquanto a persistencia de modulos do tenant nao estiver completa em todos os ambientes.

## Scopes

- `platform`
- `tenant`
- `operations`
- `logistics`
- `finance`

Query opcional:

```http
GET /api/v1/navigation/menu?scope=platform
GET /api/v1/navigation/menu?scope=tenant
GET /api/v1/navigation/menu?scope=operations
```

## Status de tela

- `implemented`
- `partial`
- `mock`
- `planned`
- `backend-ready`
- `frontend-ready`
- `future`

Itens `planned` ou `future` podem existir no registry para rastreabilidade, mas so aparecem ao usuario quando permissao, boundary e modulo permitirem.

## Grupos iniciais

Platform:

- `platform.dashboard` -> `/platform/dashboard`, `LayoutDashboard`, `platform:dashboard:read`
- `platform.tenants` -> `/platform/tenants`, `Building2`, `platform:tenants:read`
- `platform.cloudBilling` -> `/platform/cloud-billing`, `Receipt`, `platform:cloud-charges:read`
- `platform.audit` -> `/platform/audit`, `ShieldCheck`, `platform:audit:read`

Tenant:

- `tenant.dashboard` -> `/dashboard`, `LayoutDashboard`, `dashboard:read`
- `tenant.checklists` -> `/administrator/checklists`, `ClipboardCheck`, `tenant_checklists:read`
- `tenant.settings` -> `/administrator/settings`, `Settings`, `tenant_settings:read`
- `tenant.users` -> `/administrator/users`, `UsersRound`, `users:read`
- `tenant.audit` -> `/administrator/audit`, `ScrollText`, `audit:read`
- `tenant.notifications` -> `/notifications`, `Bell`, `notifications:read`

Operacao:

- `operations.checklists` -> `/operations/checklists`, `ClipboardList`, `checklist_runs:read`
- `operations.checklistRun` -> `/operations/checklists/:checklistId/run`, `PlayCircle`, `checklist_runs:create`
- `operations.workOrders` -> `/work-orders`, `Wrench`, `work_orders:read`, status `implemented`
- `operations.map` -> `/operations/map`, `Map`, `field_location:read`, status `implemented`
- `operations.fieldOperators` -> `/operations/field-operators`, `MapPin`, `field_operator:read`
- `operations.dispatches` -> `/operations/dispatches`, `Route`, `field_dispatch:read`, status `implemented`

Logistica:

- `logistics.dashboard` -> `/logistics`, `Truck`, `logistics:read`
- `logistics.routes` -> `/logistics/routes`, `Route`, `logistics_routes:read`
- `logistics.map` -> `/logistics/map`, `MapPinned`, `field_location:read`

Financeiro:

- `finance.dashboard` -> `/finance`, `ChartNoAxesCombined`, `finance:read`
- `finance.charges` -> `/finance/charges`, `ReceiptText`, `billing:read`
- `finance.invoices` -> `/finance/invoices`, `FileText`, `invoices:read`
- `finance.payments` -> `/finance/payments`, `CreditCard`, `payments:read`

## Modulos de tenant

Itens tenant-scoped podem declarar `requiredModules`. Exemplos:

- `tenant.checklists`: `tenant_checklist` ou `checklists`
- `operations.workOrders`: `work_orders` ou `work-orders`
- `operations.map`: `field_operations`
- `logistics.dashboard`: `logistics`
- `finance.dashboard`: `finance`

Platform items nao dependem de modulo de tenant.

## Fora do escopo desta versao

- CRUD persistido de menu.
- Google Maps real.
- Roteirizacao, Google Maps real e despacho avancado.

## Status frontend relacionado

- `/operations/map` agora possui UI inicial no frontend web, protegida por `field_location:read` e dependente do modulo `field_operations`.
- A UI consome `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`, com mapa placeholder, KPIs, filtros, lista, detalhe e fallback/mock seguro.
- Quando `work_orders:read` esta presente, a UI tambem usa `GET /api/v1/work-orders` para mostrar OS atual/atribuida e linkar para `/work-orders/:workOrderId`; sem essa permissao, o mapa segue sem link ou detalhe de OS.
- `/operations/dispatches` possui UI web inicial protegida por `field_dispatch:read`, com acoes por `field_dispatch:create`, `field_dispatch:update`, `field_dispatch:cancel` e `field_dispatch:reassign`.
- A UI consome `/api/v1/operations/dispatches` para criacao, listagem, detalhe, status e reatribuicao; quando `work_orders:read` esta presente, tambem usa `/api/v1/work-orders` para exibir codigo/titulo/prioridade da OS.
- Google Maps real, WebSocket/tempo real, despacho avancado e roteirizacao permanecem fora desta rodada.
- Work Orders UI implementada em `/work-orders`, `/work-orders/new` e `/work-orders/:workOrderId`, consumindo endpoints reais e fallback/mock seguro.
- Backend de logistica.
- Billing, fatura, pagamento ou fiscal tenant-scoped.
- Remocao dos menus frontend existentes.
