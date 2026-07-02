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
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_list_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b114';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B114'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:create'}),
);

WorkOrder _wo(
  String id, {
  SyncStatus syncStatus = SyncStatus.synced,
  WorkOrderServiceType? serviceType,
}) => WorkOrder(
  localId: id,
  tenantId: _tenant,
  code: 'OS-B114-$id',
  title: 'OS $id',
  customerName: 'Cliente',
  serviceAddress: 'Rua Teste',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: syncStatus,
  createdAt: DateTime.utc(2026, 7, 1),
  serviceType: serviceType,
);

Widget _wrap(List<WorkOrder> seed) {
  final store = InMemoryWorkOrderLocalStore(seed);
  final router = GoRouter(
    initialLocation: '/work-orders',
    routes: [
      GoRoute(
        path: '/work-orders',
        builder: (_, _) => const WorkOrderListScreen(),
      ),
      GoRoute(
        path: '/work-orders/new',
        builder: (_, _) => const Scaffold(body: Text('Nova OS')),
      ),
      GoRoute(
        path: '/work-orders/:id',
        builder: (_, _) => const Scaffold(body: Text('Detalhe')),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWith(
        (ref) => WorkOrderRepository(
          session: _session,
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
  group('WorkOrderListScreen — badges tipo/sync (B-114)', () {
    testWidgets('1. Card sem badges nao exibe Guincho nem icone de sync', (
      t,
    ) async {
      await t.pumpWidget(_wrap([_wo('a')]));
      await t.pumpAndSettle();

      expect(find.text('Guincho'), findsNothing);
      expect(find.text('Prestador'), findsNothing);
      expect(find.text('Sincronizando'), findsNothing);
      expect(find.text('Falha sync'), findsNothing);
      expect(find.text('Conflito'), findsNothing);
    });

    testWidgets('2. Card com serviceType=tow exibe badge Guincho', (t) async {
      await t.pumpWidget(
        _wrap([_wo('a', serviceType: WorkOrderServiceType.tow)]),
      );
      await t.pumpAndSettle();

      expect(find.text('Guincho'), findsOneWidget);
      expect(find.text('Prestador'), findsNothing);
    });

    testWidgets('3. Card com serviceType=provider exibe badge Prestador', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap([_wo('a', serviceType: WorkOrderServiceType.provider)]),
      );
      await t.pumpAndSettle();

      expect(find.text('Prestador'), findsOneWidget);
      expect(find.text('Guincho'), findsNothing);
    });

    testWidgets('4. Card com syncStatus=pending exibe label Sincronizando', (
      t,
    ) async {
      await t.pumpWidget(_wrap([_wo('a', syncStatus: SyncStatus.pending)]));
      await t.pumpAndSettle();

      expect(find.text('Sincronizando'), findsOneWidget);
    });

    testWidgets('5. Card com syncStatus=failed exibe label Falha sync', (
      t,
    ) async {
      await t.pumpWidget(_wrap([_wo('a', syncStatus: SyncStatus.failed)]));
      await t.pumpAndSettle();

      expect(find.text('Falha sync'), findsOneWidget);
    });

    testWidgets('6. Card com syncStatus=conflict exibe label Conflito', (
      t,
    ) async {
      await t.pumpWidget(_wrap([_wo('a', syncStatus: SyncStatus.conflict)]));
      await t.pumpAndSettle();

      expect(find.text('Conflito'), findsOneWidget);
    });

    testWidgets('7. Card com syncStatus=synced nao exibe badge de sync', (
      t,
    ) async {
      await t.pumpWidget(_wrap([_wo('a', syncStatus: SyncStatus.synced)]));
      await t.pumpAndSettle();

      expect(find.text('Sincronizando'), findsNothing);
      expect(find.text('Falha sync'), findsNothing);
      expect(find.text('Conflito'), findsNothing);
    });

    testWidgets('8. Card com tipo e sync exibe ambos os badges', (t) async {
      await t.pumpWidget(
        _wrap([
          _wo(
            'a',
            serviceType: WorkOrderServiceType.tow,
            syncStatus: SyncStatus.pending,
          ),
        ]),
      );
      await t.pumpAndSettle();

      expect(find.text('Guincho'), findsOneWidget);
      expect(find.text('Sincronizando'), findsOneWidget);
    });

    testWidgets(
      '9. Lista com multiplos cards exibe badges corretos em cada um',
      (t) async {
        await t.pumpWidget(
          _wrap([
            _wo('a', serviceType: WorkOrderServiceType.tow),
            _wo(
              'b',
              serviceType: WorkOrderServiceType.provider,
              syncStatus: SyncStatus.failed,
            ),
            _wo('c'),
          ]),
        );
        await t.pumpAndSettle();

        expect(find.text('Guincho'), findsOneWidget);
        expect(find.text('Prestador'), findsOneWidget);
        expect(find.text('Falha sync'), findsOneWidget);
        expect(find.text('Sincronizando'), findsNothing);
      },
    );
  });
}
