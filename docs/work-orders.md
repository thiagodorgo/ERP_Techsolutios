# Work Orders Foundation

## Objetivo

`work_orders` e a entidade operacional central para conectar cliente/local, servico solicitado, operador, status operacional, checklists futuros, evidencias futuras, mapa operacional, despacho futuro e comissoes futuras.

Esta branch entrega a fundacao backend. Nao implementa UI completa de Work Orders, despacho avancado, roteirizacao, comissao, pagamento de prestador, app Flutter, Google Maps real, fotos/assinaturas especificas de OS, estoque/pecas ou integracao externa.

## Tabelas

- `work_orders`: dados principais da ordem de servico, status, prioridade, local de atendimento, operador atribuido e timestamps operacionais.
- `work_order_events`: timeline tenant-scoped de eventos da OS.
- `work_order_assignments`: historico inicial de atribuicoes, preparado para evolucao de operador/prestador.

Todas usam `tenant_id`, RLS com `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY`.

## Status

- `open`: Aberta
- `assigned`: Atribuida
- `accepted`: Aceita
- `on_route`: Em deslocamento
- `on_site`: No local
- `in_progress`: Em atendimento
- `paused`: Pausada
- `completed`: Concluida
- `cancelled`: Cancelada
- `rejected`: Recusada

## Prioridades

- `low`: Baixa
- `medium`: Media
- `high`: Alta
- `urgent`: Urgente

## Endpoints

```http
GET   /api/v1/work-orders
POST  /api/v1/work-orders
GET   /api/v1/work-orders/:workOrderId
PATCH /api/v1/work-orders/:workOrderId
PATCH /api/v1/work-orders/:workOrderId/status
POST  /api/v1/work-orders/:workOrderId/assign
GET   /api/v1/work-orders/:workOrderId/timeline
```

## RBAC

- `work_orders:read`
- `work_orders:create`
- `work_orders:update`
- `work_orders:assign`
- `work_orders:status`
- `work_orders:cancel`
- `work_orders:delete`

`work_orders:delete` fica reservado para regra futura; nao ha endpoint de delete nesta branch.

## Eventos

- `work_order_created`
- `work_order_updated`
- `work_order_assigned`
- `work_order_status_changed`
- `work_order_cancelled`
- `work_order_completed`

Eventos sao retornados por timeline em ordem cronologica e evitam metadata sensivel de cliente.

## Vinculos Futuros

- Checklists: `checklist_id` prepara associacao com template/configuracao de checklist.
- Mapa operacional: endereco/coordenadas e operador atribuido permitem correlacao futura com `/operations/map`.
- Evidencias: anexos/fotos especificos de OS ficam fora desta branch.
- Comissoes/prestadores: `assigned_operator_id` e assignments preparam relacao futura sem calcular pagamentos nesta etapa.
