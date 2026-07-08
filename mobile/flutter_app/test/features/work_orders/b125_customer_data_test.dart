import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// D2 — Dados de cliente (documento + telefone) na OS mobile.
// Snapshot B1: o pull do backend traz customer_document/customer_phone.
// O app carrega os campos ate a tela de detalhe, de forma aditiva/offline-safe.
// ---------------------------------------------------------------------------

const _tenant = 'tenant-d2';
const _userId = 'user-d2';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant D2'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: _userId,
    email: 'tech@d2.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _makeWo({
  String localId = 'wo-d2-01',
  String? customerDocument,
  String? customerPhone,
}) => WorkOrder(
  localId: localId,
  tenantId: _tenant,
  code: 'OS-D2-01',
  title: 'OS de teste D2',
  customerName: 'Cliente D2',
  customerDocument: customerDocument,
  customerPhone: customerPhone,
  serviceAddress: 'Rua Teste, 1',
  status: WorkOrderStatus.scheduled,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 7, 1),
  assignedUserId: _userId,
);

GoRouter _makeRouter(WorkOrder wo) => GoRouter(
  initialLocation: '/work-orders/${wo.localId}',
  routes: [
    GoRoute(
      path: '/work-orders',
      builder: (_, _) => const Scaffold(body: Text('Lista OS')),
    ),
    GoRoute(
      path: '/work-orders/:id',
      builder: (_, state) =>
          WorkOrderDetailScreen(workOrderId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/work-orders/:id/execute',
      builder: (_, _) => const Scaffold(body: Text('Execute')),
    ),
    GoRoute(
      path: '/work-orders/:id/approval-request',
      builder: (_, _) => const Scaffold(body: Text('Approval')),
    ),
    GoRoute(
      path: '/field-map',
      builder: (_, _) => const Scaffold(body: Text('Mapa')),
    ),
    GoRoute(
      path: '/work-orders/:id/checklists',
      builder: (_, _) => const Scaffold(body: Text('Checklists')),
    ),
  ],
);

Widget _wrap(WorkOrder wo) {
  final store = InMemoryWorkOrderLocalStore([wo]);
  final repo = WorkOrderRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: store,
    seedWorkOrders: [wo],
  );

  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWithValue(repo),
    ],
    child: MaterialApp.router(routerConfig: _makeRouter(wo)),
  );
}

void main() {
  group('D2 — dados de cliente na tela de detalhe da OS', () {
    testWidgets('1. Documento e telefone renderizam quando presentes', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap(
          _makeWo(
            customerDocument: '123.456.789-00',
            customerPhone: '(11) 98888-7777',
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Documento'), findsOneWidget);
      expect(find.text('123.456.789-00'), findsOneWidget);
      expect(find.text('Telefone'), findsOneWidget);
      expect(find.text('(11) 98888-7777'), findsOneWidget);
    });

    testWidgets('2. OS sem documento/telefone renderiza sem quebrar', (
      t,
    ) async {
      await t.pumpWidget(_wrap(_makeWo()));
      await t.pumpAndSettle();

      // Nome do cliente sempre presente; linhas opcionais omitidas.
      expect(find.text('Cliente'), findsOneWidget);
      expect(find.text('Cliente D2'), findsOneWidget);
      expect(find.text('Documento'), findsNothing);
      expect(find.text('Telefone'), findsNothing);
      expect(t.takeException(), isNull);
    });

    testWidgets('3. Somente documento presente exibe so a linha de documento', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap(_makeWo(customerDocument: '00.000.000/0001-91')),
      );
      await t.pumpAndSettle();

      expect(find.text('Documento'), findsOneWidget);
      expect(find.text('00.000.000/0001-91'), findsOneWidget);
      expect(find.text('Telefone'), findsNothing);
    });

    testWidgets('4. Strings vazias sao tratadas como ausentes (offline-safe)', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap(_makeWo(customerDocument: '   ', customerPhone: '')),
      );
      await t.pumpAndSettle();

      expect(find.text('Documento'), findsNothing);
      expect(find.text('Telefone'), findsNothing);
    });
  });

  group('D2 — round-trip SQLite (Drift) dos dados de cliente', () {
    late AppDatabase db;
    late DriftWorkOrderLocalStore store;

    setUp(() {
      db = AppDatabase.openInMemory();
      store = DriftWorkOrderLocalStore(db);
    });

    tearDown(() => db.close());

    test(
      '5. Documento e telefone persistidos e recarregados do SQLite',
      () async {
        await store.saveWorkOrder(
          _makeWo(
            customerDocument: '123.456.789-00',
            customerPhone: '(11) 98888-7777',
          ),
        );

        final loaded = await store.loadWorkOrders();
        expect(loaded, hasLength(1));
        expect(loaded.first.customerName, 'Cliente D2');
        expect(loaded.first.customerDocument, '123.456.789-00');
        expect(loaded.first.customerPhone, '(11) 98888-7777');
      },
    );

    test('6. OS sem documento/telefone round-trips como null', () async {
      await store.saveWorkOrder(_makeWo());

      final loaded = await store.loadWorkOrders();
      expect(loaded, hasLength(1));
      expect(loaded.first.customerDocument, isNull);
      expect(loaded.first.customerPhone, isNull);
    });
  });
}
