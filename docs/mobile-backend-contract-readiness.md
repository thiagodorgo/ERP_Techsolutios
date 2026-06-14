# Mobile Backend Contract Readiness - B-098

## Objetivo

Consolidar a prontidao do backend Node.js/TypeScript para o MVP mobile Flutter, sem alterar `mobile/flutter_app/**`, separando contratos implementados, contratos planejados e lacunas que ainda nao podem ser consumidas pelo app como producao.

## Escopo tecnico

- Backend analisado: Express/TypeScript sob `/api/v1`.
- Mobile Flutter: fora do escopo desta execucao.
- Frontend React: fora do escopo desta execucao.
- Banco/Prisma: nenhuma migration nova.
- Sync completo: fora do escopo; apenas leitura de contrato, bootstrap minimo e testes de fronteira.

## Endpoints existentes e estado

| Dominio | Endpoint | Estado | Observacao mobile |
| --- | --- | --- | --- |
| Auth | `POST /api/v1/auth/login` | implementado | caminho oficial para Bearer token; headers legados apenas dev/teste |
| Auth | `POST /api/v1/auth/refresh` | implementado | rotaciona refresh token |
| Auth | `POST /api/v1/auth/logout` | implementado | revoga sessao quando existir |
| Bootstrap | `GET /api/v1/mobile/bootstrap` | implementado em B-098 | contrato minimo com tenant, usuario, roles, permissoes, modulos, categorias de despesas e cursores nulos |
| Work Orders | `GET /api/v1/work-orders` | implementado | retorna `{ items, pagination }` na raiz; nao envelopa em `data` |
| Work Orders | `POST /api/v1/work-orders` | implementado | criacao online; nao e sync offline mobile |
| Work Orders | `GET/PATCH /api/v1/work-orders/:workOrderId` | implementado | leitura/edicao online |
| Work Orders | `PATCH /api/v1/work-orders/:workOrderId/status` | implementado | transicao online |
| Work Orders | `POST /api/v1/work-orders/:workOrderId/assign` | implementado | atribuicao online |
| Work Orders | `GET /api/v1/work-orders/:workOrderId/timeline` | implementado | timeline online |
| Checklists | `GET /api/v1/mobile/checklists/available` | implementado | lista modelos publicados disponiveis |
| Checklists | `GET /api/v1/mobile/checklists/:checklistId/render` | implementado | renderizacao do schema publicado |
| Checklists | `POST /api/v1/mobile/checklist-runs` | implementado | cria execucao online |
| Checklists | `PATCH /api/v1/mobile/checklist-runs/:runId` | implementado | atualiza execucao online |
| Checklists | `POST /api/v1/mobile/checklist-runs/:runId/attachments` | implementado | upload de anexo de checklist |
| Checklists | `GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download` | implementado | download protegido |
| Checklists | `POST /api/v1/mobile/checklist-runs/:runId/markers` | implementado | marcadores de dano/evidencia |
| Checklists | `POST /api/v1/mobile/checklist-runs/:runId/complete` | implementado | conclusao online |
| Checklists | `GET /api/v1/mobile/checklist-runs/:runId/comparison` | implementado | comparacao before/after |
| Checklists | `POST /api/v1/mobile/checklist-runs/:runId/divergence` | implementado | divergencia online |
| Checklists | `POST /api/v1/mobile/checklist-runs/:runId/acknowledgement` | implementado | ciencia online |
| Expenses | `GET /api/v1/expense-categories` | implementado | catalogo de categorias |
| Expenses | `GET /api/v1/expense-policies` | implementado | politicas de despesas |
| Expenses | `GET/POST /api/v1/expense-reports` | implementado | fluxo online de prestacao de contas |
| Expenses | `POST /api/v1/mobile/sync/expense-actions` | implementado | sync idempotente MVP para acoes de despesas |
| Inventory | nenhum endpoint mobile real | planejado | modulo aparece em docs/catalogo, mas backend mobile ainda nao existe |
| Evidence/Attachments | checklist attachments | implementado parcial | real para checklist; nao ha upload generico ou evidencia de OS |
| Sync | `POST /api/v1/mobile/sync/expense-actions` | implementado parcial | despesas apenas |
| Sync | `POST /api/v1/mobile/sync/work-order-actions` | implementado | replay offline controlado de status/atribuicao de OS |
| Sync | `POST /api/v1/mobile/sync/checklist-actions` | parcial | replay offline minimo de respostas, notas e conclusao de checklist |
| Sync | inventory sync | planejado | retorna 404 JSON estavel quando rota nao existe |
| Notifications | `GET /api/v1/notifications` | implementado | retorna `data` como array direto |
| Notifications | `GET /api/v1/notifications/unread-count` | implementado | contador de nao lidas |
| Notifications | read/read-all/archive | implementado | acoes online |
| Field Location | `POST /api/v1/mobile/field-locations` | implementado | envio de localizacao de operador |

## Endpoints faltantes ou incompletos

- `GET /api/v1/mobile/inventory/items`: faltante; inventario mobile ainda nao tem API backend.
- `POST /api/v1/mobile/sync/inventory-actions`: faltante; sem contrato de reserva/baixa offline.
- Endpoint generico de evidencia de OS: faltante; checklist possui anexos, OS ainda nao.
- Sync checklist completo: parcial; B-098C cobre respostas, notas e conclusao, mas nao cobre anexos, markers, divergencia ou acknowledgement em lote.
- Catalogos versionados completos no bootstrap: parcial; B-098A/B/C retornam contrato expandido com lacunas planejadas.
- Conflitos de sync para inventory: planejado, nao implementado.

## Contrato de erro

Erros devem seguir envelope JSON seguro:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "reason": "permission_required",
    "message": "One of these permissions is required: checklist_runs:create."
  }
}
```

Regras confirmadas em B-098:

- sem tenant autenticado em bootstrap retorna `403 tenant_required`;
- sem usuario autenticado retorna `403 user_required`;
- sem role retorna `403 role_required`;
- falta de permissao usa `permission_required`;
- rotas `/api/v1` nao mapeadas retornam `404 route_not_found` em JSON, sem stack trace;
- o backend nao deve vazar token, path privado, storage key, stack trace ou segredo em erro mobile.

## Divergencia investigada: permissao singular

O teste antigo esperava `"Permission roles.manage is required."`. A implementacao atual de `requireAnyPermission` usa mensagem unica para uma ou varias permissoes: `"One of these permissions is required: roles.manage."`.

Decisao B-098: manter a implementacao atual, pois ela cobre o caso multi-permissao e ja e usada por rotas reais. O teste foi alinhado ao contrato atual.

## Contratos de sync mobile

Estado atual:

- despesas: `POST /api/v1/mobile/sync/expense-actions` existe e retorna `data.results`;
- work orders: `POST /api/v1/mobile/sync/work-order-actions` existe e retorna `accepted`, `rejected`, `conflicts` e `already_applied`;
- checklists: `POST /api/v1/mobile/sync/checklist-actions` existe em status `partial` para `checklist.item_answer`, `checklist.item_note` e `checklist.complete`;
- inventory: sem backend mobile real;
- evidencias: checklist possui upload online protegido; OS/generico ainda faltante.

Regras para proximas fases:

- toda acao offline deve carregar `client_action_id`;
- o backend resolve `tenant_id` pelo ator autenticado, nunca pelo body;
- cada item do lote deve retornar status individual;
- conflitos devem retornar campos seguros e exigir resolucao explicita;
- uploads nao devem depender de path local, base64 em log ou token em payload.

## Seguranca

- Bearer token e o caminho principal de autenticacao.
- Headers legados ficam restritos a desenvolvimento/teste.
- RBAC backend continua sendo autoridade; UI mobile pode esconder acoes, mas nao autoriza.
- Bootstrap ignora `tenantId` em query/body e usa o tenant do ator autenticado.
- Payloads de bootstrap e erro nao incluem segredo, token, stack trace ou outro tenant.

## Plano faseado

| Fase | Demanda | Resultado esperado |
| --- | --- | --- |
| B-098A | Bootstrap expandido | catalogos versionados, policies mobile, feature flags e TTL de cache |
| B-098B | Sync de Work Orders | `POST /api/v1/mobile/sync/work-order-actions` com idempotencia e conflitos |
| B-098C | Sync de Checklists | replay offline minimo de respostas, notas e conclusao |
| B-098D | Evidencias de OS | upload/metadata seguro para OS, storage protegido e auditoria |
| B-098E | Inventario mobile | leitura de catalogo e sync de baixas/reservas tenant-scoped |
| B-098F | Observabilidade mobile | metricas de sync, auditoria mobile e diagnostico backend seguro |

## Status B-098

B-098 deixa o backend pronto para um acoplamento mobile minimo via bootstrap, confirma endpoints ja consumiveis e estabiliza 404 JSON para endpoints planejados. O backend ainda nao esta pronto para sync completo local-first de OS, checklist, inventario ou evidencia generica.
