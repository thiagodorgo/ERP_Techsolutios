# Work Orders

## Objetivo

`work_orders` e a entidade operacional central para conectar cliente/local, servico solicitado, operador, status operacional, checklists futuros, evidencias futuras, mapa operacional, despacho operacional e comissoes futuras.

O backend foundation cria a API tenant-scoped e a UI web entrega a primeira experiencia operacional para supervisores acompanharem lista, criacao, detalhe, timeline, status e atribuicao simples.

Fora do escopo atual: despacho avancado, roteirizacao, comissao, pagamento de prestador, app Flutter, Google Maps real, fotos/assinaturas especificas de OS, estoque/pecas ou integracao externa. A fundacao `field_dispatch` permite criar/listar/atualizar despachos vinculados a OS e operador do mesmo tenant, e a UI inicial `/operations/dispatches` consome essa API para acompanhamento operacional basico.

## UI Web

Rotas implementadas:

```txt
/work-orders
/work-orders/new
/work-orders/:workOrderId
```

Funcionalidades:

- lista de Ordens de Servico com busca por codigo, titulo ou cliente;
- filtros por status, prioridade, operador atribuido e periodo;
- KPIs de total, abertas, atribuidas, em atendimento, concluidas, canceladas e urgentes;
- formulario de nova OS com validacao de titulo, prioridade, coordenadas e agendamento;
- detalhe com cliente, telefone, endereco, coordenadas, agendamento, operador, datas e descricao;
- timeline consumindo eventos do backend;
- acao de status protegida por `work_orders:status`;
- atribuicao simples por UUID protegida por `work_orders:assign`;
- link para `/operations/map` quando a OS possui latitude/longitude;
- integracao com `/operations/map`: operadores com localizacao e OS atribuida aparecem no mapa com codigo/status da OS e link para `/work-orders/:workOrderId` quando o usuario possui `work_orders:read`;
- fallback/mock seguro com indicacao visual `Dados demonstrativos` ou `Fallback local`.

O frontend usa `frontend/src/modules/work-orders` com types, adapter, service, hooks, mocks e componentes dedicados. O adapter aceita snake_case e camelCase para manter compatibilidade com o contrato da API.

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

Mapeamento frontend:

- `/work-orders`: `work_orders:read`
- `/work-orders/new`: `work_orders:create`
- `/work-orders/:workOrderId`: `work_orders:read`
- alterar status: `work_orders:status`
- atribuir operador: `work_orders:assign`
- editar dados basicos futuro: `work_orders:update`

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
- Mapa operacional: endereco/coordenadas e operador atribuido permitem correlacao em `/operations/map`; o mapa exibe OS atual/atribuida sem criar endpoints novos e sem substituir `field_location:read`.
- Despacho operacional: `field_dispatches` vincula OS e operador, registra status/timeline e sustenta a UI inicial `/operations/dispatches`.
- Evidencias: anexos/fotos especificos de OS ficam fora desta branch.
- Comissoes/prestadores: `assigned_operator_id` e assignments preparam relacao futura sem calcular pagamentos nesta etapa.
