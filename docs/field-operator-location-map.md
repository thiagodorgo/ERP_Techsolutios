# Field Operator Location Map

## Decisao desta rodada

Esta branch implementa a fundacao backend de localizacao de operadores em campo. O app mobile futuro podera enviar coordenadas ao backend e o frontend web podera consultar ultimas posicoes e historico para alimentar o Mapa Operacional quando a tela for implementada.

Fora de escopo mantido: Google Maps real no frontend, tela `/operations/map`, app Flutter, roteirizacao avancada, Work Orders completas e despacho completo.

Itens planejados:

- `operations.map` -> `/operations/map`, permissao `field_location:read`, modulo `field_operations`.
- `operations.fieldOperators` -> `/operations/field-operators`, permissao `field_operator:read`, modulo `field_operations`.
- `operations.dispatches` -> `/operations/dispatches`, permissao `field_dispatch:read`, modulo `field_operations`.
- `logistics.map` -> `/logistics/map`, permissao `field_location:read`, modulos `logistics` ou `field_operations`.

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

- definir retencao e auditoria de coordenadas;
- avaliar provider de mapas;
- modelar despachos, rotas e eventos de campo;
- garantir opt-in, privacidade e controles por tenant antes de qualquer coleta real.
