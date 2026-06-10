# Field Operator Location Map

## Decisao desta rodada

Esta branch integra a UI inicial do Mapa Operacional em `/operations/map` com `work_orders` e `field_dispatch` sobre a fundacao backend de localizacao de operadores em campo. O app mobile futuro podera enviar coordenadas ao backend; o frontend web consulta ultimas posicoes e, quando o usuario possui as permissoes correspondentes, correlaciona operadores com OS atribuidas, despachos operacionais e acoes diretas de despacho.

Fora de escopo mantido para o mapa: Google Maps real no frontend, app Flutter, roteirizacao avancada, despacho completo, novos endpoints backend, migrations e WebSocket/tempo real.

Itens registrados:

- `operations.map` -> `/operations/map`, permissao `field_location:read`, modulo `field_operations`, UI inicial implementada com OS vinculada quando `work_orders:read` esta disponivel e despacho vinculado quando `field_dispatch:read` esta disponivel.
- `operations.fieldOperators` -> `/operations/field-operators`, permissao `field_operator:read`, modulo `field_operations`.
- `operations.dispatches` -> `/operations/dispatches`, permissao `field_dispatch:read`, modulo `field_operations`, status `implemented`.
- `logistics.map` -> `/logistics/map`, permissao `field_location:read`, modulos `logistics` ou `field_operations`.

## UI web

Rota implementada:

- `/operations/map`

Componentes da tela:

- cabecalho com fonte de dados e acao de refresh;
- KPIs de operadores localizados, disponiveis, em deslocamento, em atendimento, localizacoes antigas e offline/bloqueados;
- filtros por busca, status, equipe e localizacao antiga;
- mapa operacional em projecao proporcional por latitude/longitude, sem Google Maps real nesta etapa;
- marcadores selecionaveis, lista de operadores e painel de detalhe com coordenadas, precisao, bateria e timestamps;
- codigo/status da OS atual/atribuida no marcador, lista e painel de detalhe quando houver permissao `work_orders:read`;
- status do despacho no marcador, lista e painel de detalhe quando houver permissao `field_dispatch:read`;
- acao contextual para acompanhar despacho existente ou abrir `/operations/dispatches` com `workOrderId` e `operatorUserId` para criacao quando houver `field_dispatch:create`;
- acoes diretas no painel de detalhe quando houver despacho vinculado: alterar status com `field_dispatch:update`, cancelar com `field_dispatch:cancel` e motivo obrigatorio, e reatribuir com `field_dispatch:reassign`;
- link para `/work-orders/:workOrderId` a partir da lista ou detalhe do operador;
- estados de loading, erro, vazio e fallback/mock local.

Fallback:

- `VITE_USE_MOCKS=true` usa dados locais;
- falha da API ou resposta vazia ativa fallback seguro com dados mockados;
- registros com `capturedAt` acima de 15 minutos sao marcados como localizacao antiga;
- coordenadas nao sao registradas em `console.log` pelo frontend.

## Persistencia

Tabela criada:

- `field_operator_locations`

Campos principais:

- `tenant_id`
- `operator_user_id`
- `latitude`
- `longitude`
- `accuracy_meters`
- `heading_degrees`
- `speed_meters_per_second`
- `battery_level`
- `source`
- `recorded_at`
- `received_at`
- `metadata`

Regras:

- `tenant_id` vem do contexto autenticado, nunca do body.
- Mobile envia localizacao do proprio actor autenticado.
- Coordenadas, bateria, velocidade, heading e datas sao validados no backend.
- Metadata sensivel e sanitizada antes de persistir.
- API publica nao retorna metadata bruta.
- RLS aplicada com `app.current_tenant_id`.

## Endpoints implementados

```http
POST /api/v1/mobile/field-locations
GET  /api/v1/field-locations/latest
GET  /api/v1/field-locations/history
```

Endpoints de OS consumidos opcionalmente pela UI:

```http
GET /api/v1/work-orders
GET /api/v1/work-orders/:workOrderId
GET /api/v1/work-orders/:workOrderId/timeline
```

Endpoints de despacho consumidos opcionalmente pela UI `/operations/map` e diretamente pela UI `/operations/dispatches`:

```http
GET   /api/v1/operations/dispatches
POST  /api/v1/operations/dispatches
GET   /api/v1/operations/dispatches/:dispatchId
PATCH /api/v1/operations/dispatches/:dispatchId/status
PATCH /api/v1/operations/dispatches/:dispatchId/reassign
```

Permissoes:

- `field_location:read`
- `field_location:send`
- `field_location:history`
- `field_operator:read`
- `field_operator:action`
- `field_dispatch:read`
- `field_dispatch:create`
- `field_dispatch:update`
- `field_dispatch:cancel`
- `field_dispatch:reassign`
- `work_orders:read` para mostrar OS atual/atribuida e abrir o detalhe da OS.
- `field_dispatch:read` para mostrar despacho vinculado e acompanhar em `/operations/dispatches`.
- `field_dispatch:create` para exibir acao contextual de criacao em `/operations/dispatches?workOrderId=...&operatorUserId=...`.
- `field_dispatch:update` para alterar status do despacho vinculado a partir do detalhe do operador.
- `field_dispatch:cancel` para cancelar despacho vinculado a partir do detalhe do operador, com motivo obrigatorio.
- `field_dispatch:reassign` para reatribuir despacho vinculado a partir do detalhe do operador.

Matriz aplicada:

- `POST /api/v1/mobile/field-locations`: `field_location:send`
- `GET /api/v1/field-locations/latest`: `field_location:read`
- `GET /api/v1/field-locations/history`: `field_location:history`
- `GET /api/v1/operations/dispatches`: `field_dispatch:read`
- `POST /api/v1/operations/dispatches`: `field_dispatch:create`
- `GET /api/v1/operations/dispatches/:dispatchId`: `field_dispatch:read`
- `PATCH /api/v1/operations/dispatches/:dispatchId/status`: `field_dispatch:update` ou `field_dispatch:cancel` para cancelamento
- `PATCH /api/v1/operations/dispatches/:dispatchId/reassign`: `field_dispatch:reassign`

## Auditoria

- envio mobile registra `field_location.recorded` em modo Prisma;
- consulta de historico registra `field_location.history_viewed` em modo Prisma;
- negacoes de permissao seguem o evento central `permission.denied`.

## Proximos passos

- filtro do mapa por OS especifica quando a rota receber contexto de origem;
- definir retencao e auditoria de coordenadas;
- avaliar provider de mapas e integracao Google Maps real com `VITE_GOOGLE_MAPS_API_KEY`;
- evoluir UX de acoes em lote ou despacho avancado, se aprovado;
- evoluir rotas e eventos de campo para roteirizacao assistida;
- garantir opt-in, privacidade e controles por tenant antes de qualquer coleta real.
