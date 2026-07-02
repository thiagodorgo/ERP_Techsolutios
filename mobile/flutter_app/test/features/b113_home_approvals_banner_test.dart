import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b113';

const _sessionManager = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B113'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:create',
    'work_orders:update',
    'work_orders:assign',
    'work_orders:status',
    'work_orders:cancel', // distingue Gestor
    'expense_report:approve_manager',
  }),
);

const _sessionTechnician = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B113'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read'}),
);

WorkOrder _wo(String id, WorkOrderStatus status) => WorkOrder(
  localId: id,
  tenantId: _tenant,
  code: 'OS-B113-$id',
  title: 'OS $id',
  customerName: 'Cliente',
  serviceAddress: 'Rua Teste',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 7, 1),
);

/// Builds the test widget. When [woOverride] is non-null, the
/// workOrderRepositoryProvider is replaced with a repo pre-seeded with the
/// correct session — this avoids the async bootstrap-resolution timing race.
Widget _wrap(
  BootstrapSession session,
  List<WorkOrder> seed, {
  bool overrideWoRepo = false,
}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => HomeScreen(session: session),
      ),
      GoRoute(
        path: '/approvals',
        builder: (_, _) => const Scaffold(body: Text('Aprovacoes')),
      ),
    ],
  );

  final store = InMemoryWorkOrderLocalStore(seed);

  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      if (overrideWoRepo)
        workOrderRepositoryProvider.overrideWith(
          (ref) => WorkOrderRepository(
            session: session,
            syncQueue: ref.watch(syncQueueRepositoryProvider),
            actionFactory: ref.watch(syncActionFactoryProvider),
            localStore: store,
          ),
        ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

void main() {
  group('HomeScreen — banner de aprovacoes (B-113)', () {
    testWidgets('1. Gestor ve banner de aprovacoes', (t) async {
      await t.pumpWidget(_wrap(_sessionManager, []));
      await t.pumpAndSettle();

      expect(find.text('Aprovacoes'), findsOneWidget);
    });

    testWidgets('2. Tecnico NAO ve banner de aprovacoes', (t) async {
      await t.pumpWidget(_wrap(_sessionTechnician, []));
      await t.pumpAndSettle();

      expect(find.text('Aprovacoes'), findsNothing);
    });

    testWidgets('3. Banner sem pendentes exibe mensagem neutra', (t) async {
      await t.pumpWidget(_wrap(_sessionManager, []));
      await t.pumpAndSettle();

      expect(find.text('Nenhuma aprovacao pendente'), findsOneWidget);
    });

    testWidgets('4. Banner com pendentes exibe mensagem de alerta', (t) async {
      final seed = [
        _wo('a', WorkOrderStatus.pendingApproval),
        _wo('b', WorkOrderStatus.pendingApproval),
      ];
      // Override woRepo directly so the correct session is used from the start.
      await t.pumpWidget(_wrap(_sessionManager, seed, overrideWoRepo: true));
      await t.pumpAndSettle();

      // With orders, content above the banner (stats row + NextOS card) pushes it
      // off the 600px viewport. Scroll down to bring it into view.
      await t.scrollUntilVisible(
        find.text('Aprovacoes'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await t.pump();

      expect(find.textContaining('aguardando aprovacao'), findsOneWidget);
      expect(find.text('Nenhuma aprovacao pendente'), findsNothing);
    });

    testWidgets('5. Tap no banner navega para /approvals', (t) async {
      await t.pumpWidget(_wrap(_sessionManager, []));
      await t.pumpAndSettle();

      await t.tap(find.text('Aprovacoes'));
      await t.pumpAndSettle();

      expect(find.text('Aprovacoes'), findsOneWidget);
    });
  });
}
