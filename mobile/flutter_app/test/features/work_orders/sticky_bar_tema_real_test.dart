import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/location/gps_service.dart';
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
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

/// Barra fixa de ação renderizada com o **tema real do app**.
///
/// Regressão de aparelho: os temas de `FilledButton`/`OutlinedButton` usam
/// `minimumSize: Size.fromHeight(44)` — largura mínima INFINITA. Dentro de um
/// `Row`, o filho não-flexível recebe largura ilimitada, a mínima infinita vira
/// `BoxConstraints(w=Infinity)` e o layout estoura: a tela inteira do detalhe da
/// OS ficava EM BRANCO no emulador, sem nenhuma exceção visível em `logcat`.
///
/// Os testes existentes não pegaram porque montam a tela com o tema PADRÃO do
/// Material, onde a largura mínima é finita. Este monta com `ErpMobileTheme`.
const _tenant = 'tenant-sticky';
const _userId = 'user-sticky';

const _session = BootstrapSession(
  activeTenant: TenantContext(
    tenantId: _tenant,
    displayName: 'Guinchos Paraná',
  ),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: _userId,
    email: 'tecnico.demo@example.com',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _wo(WorkOrderStatus status) => WorkOrder(
  localId: 'wo-sticky-1',
  tenantId: _tenant,
  code: 'OS-000017',
  title: 'Remoção de veículo — colisão na BR-277',
  customerName: 'Seguradora Horizonte',
  serviceAddress: 'BR-277, km 82 — pista sentido litoral',
  status: status,
  priority: WorkOrderPriority.critical,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 8, 22),
  assignedUserId: _userId,
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

  final router = GoRouter(
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
        path: '/work-orders/:id/checklists',
        builder: (_, _) => const Scaffold(body: Text('Checklists')),
      ),
      GoRoute(
        path: '/field-map',
        builder: (_, _) => const Scaffold(body: Text('Mapa')),
      ),
    ],
  );

  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(store),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      workOrderRepositoryProvider.overrideWithValue(repo),
      gpsAvailableProvider.overrideWith((_) async => true),
    ],
    // O tema REAL — é ele que carrega a largura mínima infinita.
    child: MaterialApp.router(
      theme: ErpMobileTheme.light(),
      routerConfig: router,
    ),
  );
}

void main() {
  final statuses = <WorkOrderStatus>[
    WorkOrderStatus.scheduled,
    WorkOrderStatus.enRoute,
    WorkOrderStatus.arrived,
    WorkOrderStatus.inService,
    WorkOrderStatus.completed,
  ];

  for (final status in statuses) {
    testWidgets(
      'detalhe da OS em ${status.name} monta com o tema real, sem estourar layout',
      (t) async {
        await t.pumpWidget(_wrap(_wo(status)));
        await t.pumpAndSettle();

        expect(
          t.takeException(),
          isNull,
          reason: 'nenhuma exceção de layout pode escapar da barra fixa',
        );
        // A tela precisa ter DESENHADO — o sintoma do bug era tela em branco.
        expect(find.text('Detalhe da OS'), findsOneWidget);
        expect(find.byKey(const Key('work-order-map-action')), findsOneWidget);
      },
    );
  }
}
