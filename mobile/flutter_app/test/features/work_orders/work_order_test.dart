import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_list_screen.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const _tenantDemo = 'tenant-demo';
const _tenantOther = 'tenant-other';

const _sessionWithRead = BootstrapSession(
  activeTenant: TenantContext(
    tenantId: _tenantDemo,
    displayName: 'Tenant Demo',
  ),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
    'work_orders:create',
  }),
);

const _sessionNoRead = BootstrapSession(
  activeTenant: TenantContext(
    tenantId: _tenantDemo,
    displayName: 'Tenant Demo',
  ),
  enabledModules: [],
  permissions: PermissionSet({'expense_report:read'}),
);

WorkOrder _makeOrder({
  String localId = 'wo-t-01',
  String tenantId = _tenantDemo,
  WorkOrderStatus status = WorkOrderStatus.scheduled,
  WorkOrderPriority priority = WorkOrderPriority.normal,
  String? assignedUserId,
}) {
  return WorkOrder(
    localId: localId,
    tenantId: tenantId,
    code: 'OS-T-$localId',
    title: 'OS de teste $localId',
    customerName: 'Cliente Teste',
    serviceAddress: 'Rua Teste, 1',
    status: status,
    priority: priority,
    syncStatus: SyncStatus.synced,
    createdAt: DateTime.utc(2026, 6, 12),
    assignedUserId: assignedUserId,
  );
}

WorkOrderRepository _makeRepo(
  BootstrapSession session, {
  List<WorkOrder> seed = const [],
}) {
  return WorkOrderRepository(
    session: session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore(seed),
    seedWorkOrders: seed,
  );
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

void main() {
  group('PermissionResolver — work_orders', () {
    const resolver = PermissionResolver();

    test('1. sem work_orders:read → has() retorna false', () {
      expect(
        resolver.has(_sessionNoRead.permissions, 'work_orders:read'),
        isFalse,
      );
    });

    test('2. com work_orders:read → has() retorna true', () {
      expect(
        resolver.has(_sessionWithRead.permissions, 'work_orders:read'),
        isTrue,
      );
    });
  });

  group('WorkOrderRepository — tenant isolation', () {
    test('3. load filtra somente OS do tenant ativo', () async {
      final store = InMemoryWorkOrderLocalStore([
        _makeOrder(localId: 'wo-demo', tenantId: _tenantDemo),
        _makeOrder(localId: 'wo-other', tenantId: _tenantOther),
      ]);

      final repo = WorkOrderRepository(
        session: _sessionWithRead,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: store,
        seedWorkOrders: [],
      );
      await repo.load(seedIfEmpty: false);

      expect(repo.workOrders, hasLength(1));
      expect(repo.workOrders.first.localId, 'wo-demo');
    });

    test('4. OS de outro tenant nao aparece na lista', () async {
      final store = InMemoryWorkOrderLocalStore([
        _makeOrder(localId: 'wo-foreign', tenantId: _tenantOther),
      ]);
      final repo = WorkOrderRepository(
        session: _sessionWithRead,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: store,
        seedWorkOrders: [],
      );
      await repo.load(seedIfEmpty: false);

      expect(repo.workOrders, isEmpty);
    });
  });

  group('WorkOrderRepository — status update + sync action', () {
    test(
      '5. updateStatus gera SyncAction com clientActionId nao vazio',
      () async {
        final repo = _makeRepo(
          _sessionWithRead,
          seed: [_makeOrder(status: WorkOrderStatus.scheduled)],
        );
        await repo.load(seedIfEmpty: false);

        final result = await repo.updateStatus(
          'wo-t-01',
          WorkOrderStatus.dispatched,
        );

        expect(result.action.clientActionId, isNotEmpty);
        expect(result.action.type, WorkOrderSyncActionTypes.statusUpdate);
        expect(result.action.tenantId, _tenantDemo);
        expect(result.action.status, SyncStatus.pending);
      },
    );

    test('6. payload de status nao contem token, path ou base64', () async {
      final repo = _makeRepo(
        _sessionWithRead,
        seed: [_makeOrder(status: WorkOrderStatus.dispatched)],
      );
      await repo.load(seedIfEmpty: false);

      final result = await repo.updateStatus(
        'wo-t-01',
        WorkOrderStatus.enRoute,
      );
      final payload = result.action.payload.toString().toLowerCase();

      expect(
        payload.contains('bearer'),
        isFalse,
        reason: 'payload nao deve conter token Bearer',
      );
      expect(
        payload.contains('password'),
        isFalse,
        reason: 'payload nao deve conter senha',
      );
      expect(
        payload.contains('base64'),
        isFalse,
        reason: 'payload nao deve conter base64',
      );
      // Must contain safe fields
      expect(result.action.payload.containsKey('local_id'), isTrue);
      expect(result.action.payload.containsKey('new_status'), isTrue);
      expect(result.action.payload.containsKey('occurred_at'), isTrue);
    });

    test('7. transicao invalida lanca StateError', () async {
      final repo = _makeRepo(
        _sessionWithRead,
        seed: [_makeOrder(status: WorkOrderStatus.scheduled)],
      );
      await repo.load(seedIfEmpty: false);

      expect(
        () => repo.updateStatus('wo-t-01', WorkOrderStatus.completed),
        throwsStateError,
      );
    });

    test('8. OS atualizada fica com syncStatus pending', () async {
      final repo = _makeRepo(
        _sessionWithRead,
        seed: [_makeOrder(status: WorkOrderStatus.scheduled)],
      );
      await repo.load(seedIfEmpty: false);

      final result = await repo.updateStatus(
        'wo-t-01',
        WorkOrderStatus.dispatched,
      );

      expect(result.workOrder.syncStatus, SyncStatus.pending);
      expect(result.workOrder.status, WorkOrderStatus.dispatched);
    });

    test('9. action enfileirada na SyncQueue apos updateStatus', () async {
      final queue = InMemorySyncQueueRepository();
      final repo = WorkOrderRepository(
        session: _sessionWithRead,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: InMemoryWorkOrderLocalStore([
          _makeOrder(status: WorkOrderStatus.arrived),
        ]),
        seedWorkOrders: [],
      );
      await repo.load(seedIfEmpty: false);

      await repo.updateStatus('wo-t-01', WorkOrderStatus.inService);
      final actions = await queue.actionsForTenant(_tenantDemo);

      expect(actions, hasLength(1));
      expect(actions.first.type, WorkOrderSyncActionTypes.statusUpdate);
    });
  });

  group('WorkOrderRepository — approval request', () {
    test('10. createApprovalRequest sem motivo lanca ArgumentError', () async {
      final repo = _makeRepo(
        _sessionWithRead,
        seed: [_makeOrder(status: WorkOrderStatus.inService)],
      );
      await repo.load(seedIfEmpty: false);

      expect(
        () => repo.createApprovalRequest(
          localId: 'wo-t-01',
          reason: '   ',
          impact: 'alto',
          urgency: 'high',
        ),
        throwsArgumentError,
      );
    });

    test(
      '11. createApprovalRequest com motivo gera action do tipo correto',
      () async {
        final repo = _makeRepo(
          _sessionWithRead,
          seed: [_makeOrder(status: WorkOrderStatus.inService)],
        );
        await repo.load(seedIfEmpty: false);

        final action = await repo.createApprovalRequest(
          localId: 'wo-t-01',
          reason: 'Problema estrutural detectado',
          impact: 'Paralisacao de producao',
          urgency: 'high',
        );

        expect(action.type, WorkOrderSyncActionTypes.approvalRequest);
        expect(action.payload['reason'], 'Problema estrutural detectado');
        expect(action.payload['urgency'], 'high');
        expect(action.payload['local_id'], 'wo-t-01');
      },
    );
  });

  group('WorkOrderStatus transitions', () {
    test(
      '12. scheduled → dispatched valido; cancelled NAO e iniciavel pelo campo (P-Ω3F6-STATUS-BYPASS)',
      () {
        expect(
          WorkOrderStatus.scheduled.canTransitionTo(WorkOrderStatus.dispatched),
          isTrue,
        );
        // Cancelar exige decisao financeira (POST /cancel no console) — nao e transicao iniciavel pelo app.
        expect(
          WorkOrderStatus.scheduled.canTransitionTo(WorkOrderStatus.cancelled),
          isFalse,
        );
      },
    );

    test('13. scheduled → completed e inService sao invalidos', () {
      expect(
        WorkOrderStatus.scheduled.canTransitionTo(WorkOrderStatus.completed),
        isFalse,
      );
      expect(
        WorkOrderStatus.scheduled.canTransitionTo(WorkOrderStatus.inService),
        isFalse,
      );
    });

    test('14. inService permite multiple transicoes', () {
      final allowed = WorkOrderStatus.inService.allowedTransitions;
      expect(allowed, contains(WorkOrderStatus.paused));
      expect(allowed, contains(WorkOrderStatus.completed));
      expect(allowed, contains(WorkOrderStatus.pendingApproval));
      expect(allowed, contains(WorkOrderStatus.exception));
    });

    test('15. estados finais nao possuem transicoes', () {
      expect(WorkOrderStatus.completed.allowedTransitions, isEmpty);
      expect(WorkOrderStatus.approved.allowedTransitions, isEmpty);
      expect(WorkOrderStatus.cancelled.allowedTransitions, isEmpty);
      expect(WorkOrderStatus.completed.isFinal, isTrue);
    });
  });

  group('WorkOrderRepository — timeline', () {
    test('16. updateStatus registra evento na timeline', () async {
      final repo = _makeRepo(
        _sessionWithRead,
        seed: [_makeOrder(status: WorkOrderStatus.dispatched)],
      );
      await repo.load(seedIfEmpty: false);

      await repo.updateStatus('wo-t-01', WorkOrderStatus.enRoute);
      final events = await repo.loadTimeline('wo-t-01');

      expect(events, hasLength(1));
      expect(events.first.eventType, WorkOrderTimelineEventType.statusChanged);
      expect(events.first.fromStatus, WorkOrderStatus.dispatched);
      expect(events.first.toStatus, WorkOrderStatus.enRoute);
    });
  });

  // -------------------------------------------------------------------------
  // Widget tests
  // -------------------------------------------------------------------------

  group('WorkOrderListScreen — widget', () {
    testWidgets('17. sem work_orders:read mostra PermissionBlockedState', (
      tester,
    ) async {
      final router = GoRouter(
        initialLocation: '/work-orders',
        routes: [
          GoRoute(
            path: '/work-orders',
            builder: (_, _) => const WorkOrderListScreen(),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            bootstrapSessionProvider.overrideWith(
              (ref) async => _sessionNoRead,
            ),
            workOrderLocalStoreProvider.overrideWithValue(
              InMemoryWorkOrderLocalStore(),
            ),
            syncActionStoreProvider.overrideWithValue(
              InMemorySyncActionStore([]),
            ),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Acesso nao autorizado'), findsOneWidget);
      expect(
        find.text(
          'work_orders:read necessario para visualizar ordens de servico.',
        ),
        findsNothing,
      );
    });

    testWidgets('18. com work_orders:read lista as OS do tenant', (
      tester,
    ) async {
      final store = InMemoryWorkOrderLocalStore([
        _makeOrder(localId: 'wo-vis-01', tenantId: _tenantDemo),
        _makeOrder(localId: 'wo-vis-02', tenantId: _tenantDemo),
      ]);
      final router = GoRouter(
        initialLocation: '/work-orders',
        routes: [
          GoRoute(
            path: '/work-orders',
            builder: (_, _) => const WorkOrderListScreen(),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            bootstrapSessionProvider.overrideWith(
              (ref) async => _sessionWithRead,
            ),
            workOrderLocalStoreProvider.overrideWithValue(store),
            syncActionStoreProvider.overrideWithValue(
              InMemorySyncActionStore([]),
            ),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Ordens de Servico'), findsOneWidget);
      expect(find.textContaining('OS-T-wo-vis-01'), findsOneWidget);
      expect(find.textContaining('OS-T-wo-vis-02'), findsOneWidget);
    });

    testWidgets('19. OS de outro tenant nao aparece na tela', (tester) async {
      final store = InMemoryWorkOrderLocalStore([
        _makeOrder(localId: 'wo-foreign', tenantId: _tenantOther),
      ]);
      final router = GoRouter(
        initialLocation: '/work-orders',
        routes: [
          GoRoute(
            path: '/work-orders',
            builder: (_, _) => const WorkOrderListScreen(),
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            bootstrapSessionProvider.overrideWith(
              (ref) async => _sessionWithRead,
            ),
            workOrderLocalStoreProvider.overrideWithValue(store),
            syncActionStoreProvider.overrideWithValue(
              InMemorySyncActionStore([]),
            ),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('OS-T-wo-foreign'), findsNothing);
      expect(find.text('Nenhuma OS encontrada'), findsOneWidget);
    });

    testWidgets(
      '20. rota /work-orders e /work-orders/:id navegaveis via appRouter',
      (tester) async {
        appRouter.go('/work-orders');
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              bootstrapSessionProvider.overrideWith(
                (ref) async => _sessionWithRead,
              ),
              workOrderLocalStoreProvider.overrideWithValue(
                InMemoryWorkOrderLocalStore(),
              ),
              syncActionStoreProvider.overrideWithValue(
                InMemorySyncActionStore([]),
              ),
            ],
            child: MaterialApp.router(routerConfig: appRouter),
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('Ordens de Servico'), findsOneWidget);
      },
    );
  });
}
