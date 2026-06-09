# Field Operator Location Map

## Decisao desta rodada

O registry de navegacao preve itens para mapa operacional, operadores em campo e mapa logistico, mas esta branch nao implementa Google Maps real, localizacao Android, rastreamento de operador, despacho backend ou Work Orders backend.

Itens planejados:

- `operations.map` -> `/operations/map`, permissao `field_location:read`, modulo `field_operations`.
- `operations.fieldOperators` -> `/operations/field-operators`, permissao `field_operator:read`, modulo `field_operations`.
- `operations.dispatches` -> `/operations/dispatches`, permissao `field_dispatch:read`, modulo `field_operations`.
- `logistics.map` -> `/logistics/map`, permissao `field_location:read`, modulos `logistics` ou `field_operations`.

## Permissoes planejadas

- `field_location:read`
- `field_location:send`
- `field_location:history`
- `field_operator:read`
- `field_operator:action`
- `field_dispatch:read`
- `field_dispatch:create`
- `field_dispatch:update`

## Proximos passos

- definir contrato de envio de localizacao mobile;
- definir retencao e auditoria de coordenadas;
- avaliar provider de mapas;
- modelar despachos, rotas e eventos de campo;
- garantir opt-in, privacidade e controles por tenant antes de qualquer coleta real.
