# Field Operator Location Map

## Decisao desta rodada

Esta branch implementa a UI inicial do Mapa Operacional em `/operations/map` sobre a fundacao backend de localizacao de operadores em campo. O app mobile futuro podera enviar coordenadas ao backend; o frontend web agora consulta ultimas posicoes e historico pelos endpoints ja existentes para exibir operadores em campo.

Fora de escopo mantido: Google Maps real no frontend, app Flutter, roteirizacao avancada, Work Orders completas, despacho completo, WebSocket/tempo real e novos endpoints.

Itens registrados:

- `operations.map` -> `/operations/map`, permissao `field_location:read`, modulo `field_operations`, UI inicial implementada.
- `operations.fieldOperators` -> `/operations/field-operators`, permissao `field_operator:read`, modulo `field_operations`.
- `operations.dispatches` -> `/operations/dispatches`, permissao `field_dispatch:read`, modulo `field_operations`.
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

Permissoes:

- `field_location:read`
- `field_location:send`
- `field_location:history`
- `field_operator:read`
- `field_operator:action`
- `field_dispatch:read`
- `field_dispatch:create`
- `field_dispatch:update`

Matriz aplicada:

- `POST /api/v1/mobile/field-locations`: `field_location:send`
- `GET /api/v1/field-locations/latest`: `field_location:read`
- `GET /api/v1/field-locations/history`: `field_location:history`

## Auditoria

- envio mobile registra `field_location.recorded` em modo Prisma;
- consulta de historico registra `field_location.history_viewed` em modo Prisma;
- negacoes de permissao seguem o evento central `permission.denied`.

## Proximos passos

- correlacionar operadores localizados com `work_orders` quando a UI evoluir para mostrar OS atual no Mapa Operacional;
- definir retencao e auditoria de coordenadas;
- avaliar provider de mapas e integracao Google Maps real com `VITE_GOOGLE_MAPS_API_KEY`;
- modelar despachos, rotas e eventos de campo;
- garantir opt-in, privacidade e controles por tenant antes de qualquer coleta real.
