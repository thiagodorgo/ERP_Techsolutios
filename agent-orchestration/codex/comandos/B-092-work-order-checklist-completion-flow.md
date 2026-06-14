# B-092 — OS + Checklist + Conclusao Ponta a Ponta

**Data:** 2026-06-13
**Status:** Concluido
**Testes:** 10/10 novos (268/268 total)

## Objetivo

Fechar o fluxo operacional completo:
OS → abrir → iniciar → abrir checklist → preencher → completar → retornar → concluir OS → sync action → timeline → feedback visual.

Nao implementado: mapa real, camera real, upload real, estoque, push notification, backend, React.

## Mudancas por arquivo

### `work_order_repository.dart`

**Novo metodo `completeWorkOrder`:**
```dart
Future<WorkOrderMutationResult> completeWorkOrder(
  String localId, {
  required bool checklistComplete,
}) async { ... }
```

- Valida `canTransitionTo(WorkOrderStatus.completed)`
- Se `wo.checklistId != null && !checklistComplete` → lanca `StateError('Conclua o checklist obrigatorio antes de finalizar a OS.')`
- Gera `work_order.status_update` sync action com payload: `{local_id, server_id, new_status, previous_status, occurred_at}` — sem token, path ou base64
- Gera `WorkOrderTimelineEventType.completed` timeline event
- Atualiza `wo.completedAt` e `syncStatus = pending`

**Seed atualizado:** OS-1042 recebe `checklistId: 'cl-seed-1'`.

### `work_order_execute_screen.dart`

Redesenhado completamente:

**`_ExecData`**: container com `wo + runs`, getters `isChecklistComplete`, `isChecklistStarted`, `canConclude`.

**`_ensureFuture(woRepo, clRepo)`**: cacheia `Future<_ExecData>` por identidade dos repos. Invalidado ao navegar para checklist via `setState(() => _dataFuture = null)`.

**UI por secoes (quando status permite transicoes):**
1. Secao "Checklist" (se `wo.checklistId != null`): `_ChecklistStatusCard` com status chip + botao contextual
2. Secao "Proxima acao": botoes de transicao normais (excluindo `completed`)
3. Secao "Concluir OS" (se `completed` em `allowedTransitions`): card de bloqueio + `FilledButton 'Concluir OS'` desabilitado quando `!data.canConclude`

**Mensagem de bloqueio (verbatim):**
```
Conclua o checklist obrigatorio antes de finalizar a OS.
```

### `work_order_detail_screen.dart`

`_ChecklistCard` migrado para `ConsumerWidget`:
- Chama `ref.watch(checklistRepositoryProvider).getRunsForWorkOrder(wo.localId)` em cada build (sem cache — retorna dado fresco ao retornar do checklist)
- Status chip: "Nao iniciado" / "Em andamento" / "Concluido"
- Botao contextual: "Abrir checklist" / "Continuar checklist" / "Ver checklist" → navega para `/checklists/${checklistId}/run?workOrderId=${localId}`

## Testes

### Helpers

| Classe | Proposito |
|---|---|
| `_PreloadedChecklistLocalStore` | Store com lista de runs pre-carregada (sem chamar `saveRun` async) |
| `_makeWoRepo` | Cria repo com seed e session de teste |
| `_makeClRepo` | Cria repo com `_PreloadedChecklistLocalStore` e api pendente |
| `_makeRun` | Cria `MobileChecklistRun` com status configuravel |
| `_execApp` | Widget de teste com GoRouter + overrides de provider |

### Grupo 1: `WorkOrderRepository.completeWorkOrder` (unit)

| # | Teste |
|---|---|
| t01 | OS sem checklist → `completeWorkOrder(checklistComplete: false)` → status = completed |
| t02 | OS com checklistId + `checklistComplete=false` → StateError com mensagem exata |
| t03 | OS com checklistId + `checklistComplete=true` → sucesso + completedAt preenchido |
| t04 | Apos conclusao, timeline contem evento `WorkOrderTimelineEventType.completed` |
| t05 | Payload da sync action nao contem access_token/refresh_token/password/bearer/base64 |
| t06 | WO de outro tenant → StateError (isolamento de tenant) |

### Grupo 2: `WorkOrderExecuteScreen` (widget)

| # | Teste |
|---|---|
| t07 | Checklist nao concluido → mensagem de bloqueio visivel (via `scrollUntilVisible`) |
| t08 | Checklist nao concluido → botao "Concluir OS" desabilitado (`onPressed = null`) |
| t09 | Sem checklistId → sem mensagem de bloqueio + botao habilitado |
| t10 | Checklist concluido → sem mensagem de bloqueio + botao habilitado |

## Decisoes tecnicas

**`_ensureFuture` com identityHashCode**: evita recriar o Future a cada `build()` mantendo referencia estavel enquanto os repos nao mudam. Ao navegar para o checklist, `setState(() => _dataFuture = null)` forca recarregamento ao retornar.

**`_PreloadedChecklistLocalStore`**: subclasse de `InMemoryChecklistLocalStore` que sobrescreve `loadRunsForWorkOrder` com lista pre-carregada. Necessaria porque `InMemoryChecklistLocalStore` nao aceita runs no construtor.

**`scrollUntilVisible` em tests**: items abaixo do fold em `ListView` com `SliverChildListDelegate` sao construidos apenas dentro do cache extent. Em viewport de teste (800x600), o card de bloqueio (abaixo das 3 transicoes + secao checklist) fica fora da area visivel inicial, exigindo scroll antes da assertiva.

**`_ChecklistCard` sem cache em detail screen**: `ConsumerWidget` chama `getRunsForWorkOrder` a cada `build()`. Como e operacao in-memory, e rapido e garante dado fresco ao retornar do `ChecklistRunScreen` via `context.pop()`.

## Constraints mantidos

- sem commit, sem push, sem PR
- sem alteracoes em backend, frontend React, migrations, pagamentos, fiscal, comissoes
- `experiments/` nao tocado
- payload de sync sem token/path/base64
