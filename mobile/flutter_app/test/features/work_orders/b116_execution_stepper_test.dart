import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_steps.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_stepper.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-b116';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B116'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
);

WorkOrder _wo({
  WorkOrderStatus status = WorkOrderStatus.inService,
  WorkOrderServiceType? serviceType,
}) => WorkOrder(
  localId: 'wo-b116',
  tenantId: _tenant,
  code: 'OS-B116',
  title: 'OS B116',
  customerName: 'Cliente B116',
  serviceAddress: 'Rua B116, 1',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 7, 1),
  serviceType: serviceType,
);

Widget _execApp(WorkOrder wo) {
  final woRepo = WorkOrderRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([wo]),
  );
  final clRepo = ChecklistRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryChecklistLocalStore(),
    remoteApi: const PendingBackendChecklistRemoteApi(),
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => _session),
      workOrderRepositoryProvider.overrideWithValue(woRepo),
      checklistRepositoryProvider.overrideWithValue(clRepo),
    ],
    child: MaterialApp.router(
      routerConfig: GoRouter(
        initialLocation: '/work-orders/${wo.localId}/execute',
        routes: [
          GoRoute(
            path: '/work-orders/:id/execute',
            builder: (context, state) => WorkOrderExecuteScreen(
              workOrderId: state.pathParameters['id']!,
            ),
          ),
          GoRoute(
            path: '/work-orders/:id',
            builder: (context, state) =>
                const Scaffold(body: Center(child: Text('Detail'))),
          ),
        ],
      ),
    ),
  );
}

void main() {
  // ── Group 1: mapeamento de passos (unit) ─────────────────────────────────
  group('B-116 stepper mapping', () {
    test('1. Guincho tem 6 rotulos na ordem correta', () {
      final labels = workOrderStepLabels(WorkOrderServiceType.tow);
      expect(labels, [
        'Inicio',
        'Rota coleta',
        'Coleta',
        'Rota entrega',
        'Entrega',
        'Conclusao',
      ]);
    });

    test('2. Prestador tem 4 rotulos na ordem correta', () {
      final labels = workOrderStepLabels(WorkOrderServiceType.provider);
      expect(labels, ['Inicio', 'Rota', 'Atendimento', 'Conclusao']);
    });

    test('3. serviceType null usa fluxo de prestador (4 passos)', () {
      expect(workOrderStepLabels(null).length, 4);
    });

    test('4. Guincho enRoute ativa passo Rota coleta (idx 1)', () {
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.tow,
          WorkOrderStatus.enRoute,
        ),
        1,
      );
    });

    test('5. Guincho inService ativa passo Coleta (idx 2)', () {
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.tow,
          WorkOrderStatus.inService,
        ),
        2,
      );
    });

    test('6. Prestador inService ativa passo Atendimento (idx 2)', () {
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.provider,
          WorkOrderStatus.inService,
        ),
        2,
      );
    });

    test('7. Status final marca todos os passos como done', () {
      final steps = buildWorkOrderSteps(
        WorkOrderServiceType.provider,
        WorkOrderStatus.completed,
      );
      expect(steps.every((s) => s.isDone), isTrue);
    });

    test('8. Passos antes do ativo sao done, depois sao todo', () {
      final steps = buildWorkOrderSteps(
        WorkOrderServiceType.tow,
        WorkOrderStatus.inService, // idx 2 ativo
      );
      expect(steps[0].isDone, isTrue);
      expect(steps[1].isDone, isTrue);
      expect(steps[2].isActive, isTrue);
      expect(steps[3].isTodo, isTrue);
      expect(steps[5].isTodo, isTrue);
    });

    test('9. scheduled ativa passo Inicio (idx 0) em ambos os tipos', () {
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.tow,
          WorkOrderStatus.scheduled,
        ),
        0,
      );
      expect(
        workOrderActiveStepIndex(
          WorkOrderServiceType.provider,
          WorkOrderStatus.scheduled,
        ),
        0,
      );
    });
  });

  // ── Group 2: render no execute screen (widget) ───────────────────────────
  group('B-116 stepper no execute screen', () {
    testWidgets('10. Guincho renderiza 6 celulas de passo', (t) async {
      await t.pumpWidget(_execApp(_wo(serviceType: WorkOrderServiceType.tow)));
      await t.pumpAndSettle();

      for (var i = 0; i < 6; i++) {
        expect(find.byKey(Key('wo-step-$i')), findsOneWidget);
      }
      expect(find.text('Rota coleta'), findsOneWidget);
      expect(find.text('Rota entrega'), findsOneWidget);
    });

    testWidgets('11. Prestador renderiza 4 celulas de passo', (t) async {
      await t.pumpWidget(
        _execApp(_wo(serviceType: WorkOrderServiceType.provider)),
      );
      await t.pumpAndSettle();

      for (var i = 0; i < 4; i++) {
        expect(find.byKey(Key('wo-step-$i')), findsOneWidget);
      }
      expect(find.byKey(const Key('wo-step-4')), findsNothing);
      expect(find.text('Atendimento'), findsOneWidget);
    });

    testWidgets('12. Stepper widget aparece no topo da execucao', (t) async {
      await t.pumpWidget(_execApp(_wo(serviceType: WorkOrderServiceType.tow)));
      await t.pumpAndSettle();

      expect(find.byType(WorkOrderStepper), findsOneWidget);
    });
  });
}
