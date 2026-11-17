// B-SAN3-16 (P7, Pergunta 3 = A) — na tela de atendimento, "Solicitar aprovação" abre o pedido de aprovação que o
// servidor recebe; "Ag. aprovação" e "Exceção" saem dos botões de status (o servidor não tem esses status: E18 do
// plano, `invalid_status`). Ação de status antiga já na fila com `pendingApproval`, `approved` ou `exception` vira
// não enviável (P5), com Descartar.
//
// O botão "Solicitar aprovação" só aparece para quem pode pedir (`work_orders:update`, a mesma permissão da tela de
// pedido e do lote no servidor): a Operação de Campo tem `:status` e não tem `:update` (CRIT5-04). O botão é
// ESCONDIDO, nunca trocado por um 2º "Ação não permitida" (o T9 do `bsan319b` exige 1 por arquivo).
//
// Lei: `plano-B-SAN3-16.md` + Emendas 1, 1.1 e 1.1.1 da abertura (fora do repositório). Arnês: o do
// `b116_execution_stepper_test.dart`, com tela alta (a lista é preguiçosa).
//
// VERMELHO-CONTROLE (F1b, em `eeac48a3`): o arquivo não compila (`sync_action_routing.dart` não existe); a tela de
// hoje mostra "Ag. aprovação" e "Exceção" como botões de status, e o toque enfileira `pendingApproval` (F-A11).
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_routing.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan316-atendimento';

BootstrapSession _sessao(Set<String> permissoes) => BootstrapSession(
  activeTenant: const TenantContext(
    tenantId: _tenant,
    displayName: 'Tenant B-SAN3-16',
  ),
  enabledModules: const [],
  permissions: PermissionSet(permissoes),
);

const _comUpdate = {
  'work_orders:read',
  'work_orders:status',
  'work_orders:update',
};
// A Operação de Campo (`field_dispatcher`, `catalog.ts`): tem `:status`, não tem `:update`.
const _semUpdate = {'work_orders:read', 'work_orders:status'};

final _os = WorkOrder(
  localId: 'wo-bsan316',
  serverId: '7d1a3f40-0000-4000-8000-000000000316',
  tenantId: _tenant,
  code: 'OS-316',
  title: 'OS em atendimento',
  customerName: 'Cliente',
  serviceAddress: 'Rua 5, 16',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 14),
);

Widget _app(BootstrapSession sessao, InMemorySyncQueueRepository fila) {
  final woRepo = WorkOrderRepository(
    session: sessao,
    syncQueue: fila,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([_os]),
  );
  final clRepo = ChecklistRepository(
    session: sessao,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryChecklistLocalStore(),
    remoteApi: const PendingBackendChecklistRemoteApi(),
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => sessao),
      workOrderRepositoryProvider.overrideWithValue(woRepo),
      checklistRepositoryProvider.overrideWithValue(clRepo),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/work-orders/${_os.localId}/execute',
        routes: [
          GoRoute(
            path: '/work-orders/:id/execute',
            builder: (context, state) => WorkOrderExecuteScreen(
              workOrderId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/work-orders/:id/approval-request',
            builder: (context, state) => Scaffold(
              body: Center(
                child: Text(
                  'Pedido de aprovação ${state.pathParameters['id']}',
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/work-orders/:id',
            builder: (context, state) =>
                const Scaffold(body: Center(child: Text('Detalhe da OS'))),
          ),
        ],
      ),
    ),
  );
}

Future<void> _abrir(
  WidgetTester t,
  BootstrapSession sessao,
  InMemorySyncQueueRepository fila,
) async {
  t.view.physicalSize = const Size(1080, 6000);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  await t.pumpWidget(_app(sessao, fila));
  await t.pumpAndSettle();
}

void main() {
  testWidgets('E1. Solicitar aprovação, na tela de atendimento, abre o pedido '
      'e não enfileira mudança de status', (t) async {
    final fila = InMemorySyncQueueRepository();
    await _abrir(t, _sessao(_comUpdate), fila);

    final botao = find.text('Solicitar aprovação');
    expect(botao, findsOneWidget);
    await t.tap(botao);
    await t.pumpAndSettle();

    expect(find.text('Pedido de aprovação ${_os.localId}'), findsOneWidget);
    final acoes = await t.runAsync(() => fila.actionsForTenant(_tenant));
    expect(
      acoes!.where((a) => a.type == WorkOrderSyncActionTypes.statusUpdate),
      isEmpty,
      reason: 'pedir aprovação não é mudança de status',
    );
  });

  testWidgets('E1b. sem work_orders:update o botão não aparece, nem "Ação não '
      'permitida", e os botões de status continuam; com :update, aparece', (
    t,
  ) async {
    await _abrir(t, _sessao(_semUpdate), InMemorySyncQueueRepository());
    expect(find.text('Solicitar aprovação'), findsNothing);
    expect(find.text('Ação não permitida'), findsNothing);
    expect(find.text('Próxima ação'), findsOneWidget);
    expect(find.text(WorkOrderStatus.paused.label), findsOneWidget);

    await t.pumpWidget(const SizedBox.shrink());
    await _abrir(t, _sessao(_comUpdate), InMemorySyncQueueRepository());
    expect(find.text('Solicitar aprovação'), findsOneWidget);
  });

  testWidgets('E2. Ag. aprovação e Exceção não aparecem entre os botões de '
      'status', (t) async {
    await _abrir(t, _sessao(_comUpdate), InMemorySyncQueueRepository());

    expect(find.text(WorkOrderStatus.paused.label), findsOneWidget);
    expect(find.text(WorkOrderStatus.pendingApproval.label), findsNothing);
    expect(find.text(WorkOrderStatus.exception.label), findsNothing);
    expect(find.text(WorkOrderStatus.approved.label), findsNothing);
  });

  test('E3. ação de status pendingApproval, approved ou exception já na fila '
      'vira não enviável, com a mensagem do status', () async {
    final fila = InMemorySyncQueueRepository();
    for (final status in [
      WorkOrderStatus.pendingApproval,
      WorkOrderStatus.approved,
      WorkOrderStatus.exception,
    ]) {
      await fila.enqueue(
        SyncAction(
          clientActionId: 'e3-${status.name}',
          tenantId: _tenant,
          type: WorkOrderSyncActionTypes.statusUpdate,
          payload: {
            'local_id': _os.localId,
            'server_id': _os.serverId,
            'new_status': status.name,
            'previous_status': WorkOrderStatus.inService.name,
          },
          status: SyncStatus.pending,
          createdAt: DateTime.utc(2026, 11, 14, 15),
        ),
      );
    }
    await fila.enqueue(
      SyncAction(
        clientActionId: 'e3-pausa',
        tenantId: _tenant,
        type: WorkOrderSyncActionTypes.statusUpdate,
        payload: {
          'local_id': _os.localId,
          'server_id': _os.serverId,
          'new_status': WorkOrderStatus.paused.name,
        },
        status: SyncStatus.pending,
        createdAt: DateTime.utc(2026, 11, 14, 15),
      ),
    );

    await SyncActionRoutingSweep(queue: fila).sweepTenant(_tenant);

    final guardadas = {
      for (final a in await fila.actionsForTenant(_tenant)) a.clientActionId: a,
    };
    for (final status in ['pendingApproval', 'approved', 'exception']) {
      final a = guardadas['e3-$status']!;
      expect(a.status, SyncStatus.failed, reason: status);
      expect(a.retryCount, kSyncMaxRetry, reason: status);
      expect(a.lastErrorCode, syncUnroutableErrorCode, reason: status);
      expect(
        a.lastSafeError,
        'Esta mudança de status não é enviada ao servidor. Descarte o '
        'registro. Para pedir aprovação, use "Solicitar aprovação" na OS.',
        reason: status,
      );
    }
    expect(guardadas['e3-pausa']!.status, SyncStatus.pending);
    expect(guardadas['e3-pausa']!.lastErrorCode, isNull);
  });
}
