import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_conclusion.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_conclusion_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b120';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B120'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
);

WorkOrder _wo({String? checklistId}) => WorkOrder(
  localId: 'wo-b120',
  tenantId: _tenant,
  code: 'OS-B120',
  title: 'Manutencao preventiva',
  customerName: 'Industria Alfa',
  serviceAddress: 'Rua B120',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 7, 1),
  serviceType: WorkOrderServiceType.provider,
  checklistId: checklistId,
);

Widget _wrap(WorkOrderRepository woRepo) {
  final prestRepo = PrestadorRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryPrestadorLocalStore(),
  );
  final router = GoRouter(
    initialLocation: '/work-orders/wo-b120/conclusion',
    routes: [
      GoRoute(
        path: '/work-orders/:id/conclusion',
        builder: (_, s) =>
            WorkOrderConclusionScreen(workOrderId: s.pathParameters['id']!),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderRepositoryProvider.overrideWithValue(woRepo),
      prestadorRepositoryProvider.overrideWithValue(prestRepo),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

WorkOrderRepository _woRepo(List<WorkOrder> seed) => WorkOrderRepository(
  session: _session,
  syncQueue: InMemorySyncQueueRepository(),
  actionFactory: SyncActionFactory(),
  localStore: InMemoryWorkOrderLocalStore(seed),
);

void main() {
  // ── Group 1: comissao / formatacao (pura) ────────────────────────────────
  group('B-120 comissao', () {
    test('1. computeCommissionCents aplica percentual', () {
      expect(
        computeCommissionCents(baseValueCents: 100000, ratePercent: 10),
        10000,
      );
    });

    test('2. base ou taxa zero/negativa retorna 0', () {
      expect(computeCommissionCents(baseValueCents: 0, ratePercent: 10), 0);
      expect(computeCommissionCents(baseValueCents: 100000, ratePercent: 0), 0);
      expect(computeCommissionCents(baseValueCents: -5, ratePercent: 10), 0);
    });

    test('3. formatBrlCents formata com milhar e centavos', () {
      expect(formatBrlCents(142000), 'R\$ 1.420,00');
      expect(formatBrlCents(50), 'R\$ 0,50');
      expect(formatBrlCents(100000), 'R\$ 1.000,00');
    });
  });

  // ── Group 2: estados de sync de evidencia (pura) ─────────────────────────
  group('B-120 EvidenceSyncState', () {
    test('4. fromCode mapeia os 8 estados', () {
      expect(EvidenceSyncState.fromCode('stored'), EvidenceSyncState.stored);
      expect(EvidenceSyncState.fromCode('rejected'), EvidenceSyncState.rejected);
      expect(
        EvidenceSyncState.fromCode('scan_failed'),
        EvidenceSyncState.scanFailed,
      );
      expect(EvidenceSyncState.fromCode('timeout'), EvidenceSyncState.timeout);
      expect(
        EvidenceSyncState.fromCode('desconhecido'),
        EvidenceSyncState.pendingLocal,
      );
    });

    test('5. tone reflete severidade', () {
      expect(EvidenceSyncState.stored.tone, 'success');
      expect(EvidenceSyncState.rejected.tone, 'danger');
      expect(EvidenceSyncState.timeout.tone, 'warning');
      expect(EvidenceSyncState.stored.isTerminalOk, isTrue);
    });
  });

  // ── Group 3: resumo do atendimento (pura) ────────────────────────────────
  group('B-120 WorkOrderConclusionSummary', () {
    test('6. resumo do prestador usa rotulo Equipamento', () {
      final s = WorkOrderConclusionSummary.fromWorkOrder(
        _wo(),
        materialsCount: 3,
        baseValueCents: 100000,
        ratePercent: 10,
      );
      expect(s.assetLabel, 'Equipamento');
      expect(s.service, 'Manutencao preventiva');
      expect(s.materialsCount, 3);
      expect(s.commissionCents, 10000);
    });

    test('7. elapsed calculado entre started e completed', () {
      final wo = WorkOrder(
        localId: 'x',
        tenantId: _tenant,
        code: 'OS-X',
        title: 'T',
        customerName: 'C',
        serviceAddress: 'A',
        status: WorkOrderStatus.completed,
        priority: WorkOrderPriority.normal,
        syncStatus: SyncStatus.synced,
        createdAt: DateTime.utc(2026, 7, 1),
        startedAt: DateTime.utc(2026, 7, 1, 9),
        completedAt: DateTime.utc(2026, 7, 1, 10, 30),
      );
      final s = WorkOrderConclusionSummary.fromWorkOrder(wo);
      expect(s.elapsed, const Duration(hours: 1, minutes: 30));
      expect(s.elapsedLabel, '1h 30min');
    });
  });

  // ── Group 4: tela de conclusao (sync silenciosa) ─────────────────────────
  group('B-120 WorkOrderConclusionScreen', () {
    testWidgets('8. exibe comissao e resumo', (t) async {
      final repo = _woRepo([_wo()]);
      await t.pumpWidget(_wrap(repo));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('commission-card')), findsOneWidget);
      expect(find.text('Manutencao preventiva'), findsOneWidget);
      expect(find.text('Industria Alfa'), findsOneWidget);
    });

    testWidgets('9. concluir sincroniza em segundo plano (enqueue)', (t) async {
      final actionStore = InMemorySyncQueueRepository();
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: actionStore,
        actionFactory: SyncActionFactory(),
        localStore: InMemoryWorkOrderLocalStore([_wo()]),
      );
      await t.pumpWidget(_wrap(repo));
      await t.pumpAndSettle();

      await t.ensureVisible(find.byKey(const Key('conclude-button')));
      await t.pumpAndSettle();
      await t.tap(find.byKey(const Key('conclude-button')));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('conclusion-synced')), findsOneWidget);
      final pending = await actionStore.pendingForTenant(_tenant);
      expect(pending, isNotEmpty);
    });
  });
}
