# B-082 — Flutter: fundacao de Ordens de Servico

**Data:** 2026-06-12
**Status:** Concluido
**Bloco:** Mobile Flutter

## Objetivo

Substituir o placeholder de OS por um modulo Flutter real com lista, detalhe e execucao
de ordens de servico, preservando arquitetura local-first, permission gate e seguranca de payload.

## Arquivos criados

| Arquivo | Descricao |
|---|---|
| `lib/features/work_orders/domain/work_order_models.dart` | Modelos de dominio (WorkOrder, status, prioridade, timeline, assignment, approval) |
| `lib/features/work_orders/data/work_order_local_store.dart` | Interface + InMemoryWorkOrderLocalStore |
| `lib/features/work_orders/data/work_order_repository.dart` | WorkOrderRepository + providers Riverpod |
| `lib/features/work_orders/data/work_order_remote_api.dart` | WorkOrderRemoteApi + PendingBackend stub + DioWorkOrderRemoteApi |
| `lib/features/work_orders/ui/work_order_list_screen.dart` | Lista de OS com filtros e permission gate |
| `lib/features/work_orders/ui/work_order_detail_screen.dart` | Detalhe de OS com timeline e acoes |
| `lib/features/work_orders/ui/work_order_execute_screen.dart` | Execucao de OS com transicoes de status |
| `lib/features/work_orders/ui/work_order_approval_request_screen.dart` | Solicitacao de aprovacao |
| `test/features/work_orders/work_order_test.dart` | 20 testes (unit + widget) |

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `lib/core/network/api_contracts.dart` | `WorkOrderApiEndpoints` (9 endpoints) + `WorkOrderSyncActionTypes` (4 types) |
| `lib/core/local_db/app_database.dart` | Schema v2: tabelas `work_orders` e `work_order_timeline` |
| `lib/app/router.dart` | Rotas reais substituindo placeholder; presentes em `appRouterProvider` e `appRouter` global |

## Modelos WorkOrder

- **`WorkOrderStatus`**: `scheduled`, `dispatched`, `enRoute`, `arrived`, `inService`, `paused`, `pendingApproval`, `completed`, `approved`, `rejected`, `exception`, `cancelled`
- **`WorkOrderPriority`**: `low`, `normal`, `high`, `critical`
- **`WorkOrder`**: `localId`, `serverId?`, `tenantId`, `code`, `title`, `customerName`, `serviceAddress`, `latitude?`, `longitude?`, `status`, `priority`, `assignedUserId?`, `scheduledAt?`, `startedAt?`, `arrivedAt?`, `completedAt?`, `checklistId?`, `syncStatus`, `createdAt`, `updatedAt?`

## Repository/store

- `InMemoryWorkOrderLocalStore` — armazenamento em memoria com interface preparada para Drift
- `WorkOrderRepository` — local-first, filtra por tenant, gera sync actions seguras, registra timeline
- Seeds 3 OS de demonstracao (`wo-local-1`, `wo-local-2`, `wo-local-3`) por tenant

## HTTP boundary

- `PendingBackendWorkOrderRemoteApi` — stub que retorna `ApiNetworkError` (nunca expoe URL/body)
- `DioWorkOrderRemoteApi` — 9 endpoints REST: fetchWorkOrders, fetchWorkOrder, updateStatus, fetchTimeline, assignWorkOrder, createApprovalRequest; usa `mapDioError` sem dados sensiveis

## Sync actions de OS

| Type | Quando gerada |
|---|---|
| `work_order.status_update` | `updateStatus()` — campos: local_id, server_id, new_status, previous_status, occurred_at |
| `work_order.create` | `createWorkOrder()` — campos: local_id, title, customer_name, service_address, priority, scheduled_at, created_at |
| `work_order.approval_request` | `createApprovalRequest()` — campos: local_id, server_id, reason, impact, urgency, requested_at |

Payloads nunca contem: Bearer token, senha, base64, path privado.

## Rotas afetadas

- `/work-orders` → `WorkOrderListScreen` (era `ModulePlaceholderScreen`)
- `/work-orders/:workOrderId` → `WorkOrderDetailScreen` (nova)
- `/work-orders/:workOrderId/execute` → `WorkOrderExecuteScreen` (nova)
- `/work-orders/:workOrderId/approval-request` → `WorkOrderApprovalRequestScreen` (nova)

## Testes adicionados (20)

| # | Descricao |
|---|---|
| 1-2 | PermissionResolver: sem/com work_orders:read |
| 3-4 | Tenant isolation: filtra por tenant ativo, OS de outro tenant invisivel |
| 5-9 | Status update: clientActionId, payload seguro, transicao invalida, syncStatus, enfileiramento |
| 10-11 | Approval request: ArgumentError sem motivo, action correta com motivo |
| 12-15 | Transicoes: allowed, invalid, isFinal, allowedTransitions de inService |
| 16 | Timeline: evento registrado apos updateStatus |
| 17-20 | Widget: blocked sem permissao, lista tenant demo, OS de outro tenant nao aparece, rota navegavel |

## Validacoes

```
flutter test:    89/89 passando
flutter analyze: No issues found
dart format:     OK (8 arquivos formatados)
git diff --check: OK
```

## Sem commit, push ou PR
