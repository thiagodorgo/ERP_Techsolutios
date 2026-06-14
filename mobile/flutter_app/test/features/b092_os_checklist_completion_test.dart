import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_execute_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const _tenantDemo = 'tenant-demo';
const _tenantOther = 'tenant-other';

const _session = BootstrapSession(
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

WorkOrder _makeOrder({
  String localId = 'wo-b092-01',
  String tenantId = _tenantDemo,
  WorkOrderStatus status = WorkOrderStatus.inService,
  String? checklistId,
}) {
  return WorkOrder(
    localId: localId,
    tenantId: tenantId,
    code: 'OS-B092',
    title: 'OS de teste B-092',
    customerName: 'Cliente B092',
    serviceAddress: 'Rua B092, 1',
    status: status,
    priority: WorkOrderPriority.normal,
    syncStatus: SyncStatus.synced,
    createdAt: DateTime.utc(2026, 6, 13),
    checklistId: checklistId,
  );
}

WorkOrderRepository _makeWoRepo(
  BootstrapSession session,
  List<WorkOrder> seed,
) {
  return WorkOrderRepository(
    session: session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore(seed),
  );
}

ChecklistRepository _makeClRepo({List<MobileChecklistRun> runs = const []}) {
  return ChecklistRepository(
    session: _session,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: _PreloadedChecklistLocalStore(runs),
    remoteApi: const PendingBackendChecklistRemoteApi(),
  );
}

// Simple in-memory store that serves a fixed list of runs.
class _PreloadedChecklistLocalStore extends InMemoryChecklistLocalStore {
  _PreloadedChecklistLocalStore(this._preloadedRuns);

  final List<MobileChecklistRun> _preloadedRuns;

  @override
  Future<List<MobileChecklistRun>> loadRunsForWorkOrder(
    String workOrderId,
  ) async => _preloadedRuns.where((r) => r.workOrderId == workOrderId).toList();
}

MobileChecklistRun _makeRun({
  required String workOrderId,
  MobileChecklistRunStatus status = MobileChecklistRunStatus.completed,
}) {
  return MobileChecklistRun(
    localId: 'clrun-b092',
    tenantId: _tenantDemo,
    checklistId: 'cl-seed-1',
    workOrderId: workOrderId,
    schemaVersion: '1',
    status: status,
    executedByUserId: 'u-test',
    startedAt: DateTime.utc(2026, 6, 13),
    syncStatus: SyncStatus.synced,
    answers: const {},
  );
}

// ---------------------------------------------------------------------------
// Widget helper
// ---------------------------------------------------------------------------

Widget _execApp({required WorkOrder wo, ChecklistRepository? clRepo}) {
  final woRepo = _makeWoRepo(_session, [wo]);
  final checklistRepo = clRepo ?? _makeClRepo();

  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => _session),
      workOrderRepositoryProvider.overrideWithValue(woRepo),
      checklistRepositoryProvider.overrideWithValue(checklistRepo),
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
          GoRoute(
            path: '/checklists/:clId/run',
            builder: (context, state) =>
                const Scaffold(body: Center(child: Text('Checklist'))),
          ),
        ],
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // ── Group 1: WorkOrderRepository.completeWorkOrder (unit) ────────────────
  group('WorkOrderRepository.completeWorkOrder', () {
    test(
      't01 — OS sem checklist: completeWorkOrder succeeds and status = completed',
      () async {
        final wo = _makeOrder(checklistId: null);
        final repo = _makeWoRepo(_session, [wo]);
        await repo.load();

        final result = await repo.completeWorkOrder(
          wo.localId,
          checklistComplete: false,
        );

        expect(result.workOrder.status, WorkOrderStatus.completed);
        expect(result.workOrder.syncStatus, SyncStatus.pending);
      },
    );

    test(
      't02 — OS com checklistId + checklistComplete=false: lanca StateError com mensagem de bloqueio',
      () async {
        final wo = _makeOrder(checklistId: 'cl-seed-1');
        final repo = _makeWoRepo(_session, [wo]);
        await repo.load();

        expect(
          () => repo.completeWorkOrder(wo.localId, checklistComplete: false),
          throwsA(
            isA<StateError>().having(
              (e) => e.message,
              'message',
              'Conclua o checklist obrigatorio antes de finalizar a OS.',
            ),
          ),
        );
      },
    );

    test(
      't03 — OS com checklistId + checklistComplete=true: completeWorkOrder succeeds',
      () async {
        final wo = _makeOrder(checklistId: 'cl-seed-1');
        final repo = _makeWoRepo(_session, [wo]);
        await repo.load();

        final result = await repo.completeWorkOrder(
          wo.localId,
          checklistComplete: true,
        );

        expect(result.workOrder.status, WorkOrderStatus.completed);
        expect(result.workOrder.completedAt, isNotNull);
      },
    );

    test(
      't04 — evento de timeline apos conclusao tem tipo completed',
      () async {
        final wo = _makeOrder(checklistId: null);
        final repo = _makeWoRepo(_session, [wo]);
        await repo.load();

        await repo.completeWorkOrder(wo.localId, checklistComplete: false);

        final timeline = await repo.loadTimeline(wo.localId);
        expect(timeline, isNotEmpty);
        expect(
          timeline.any(
            (e) => e.eventType == WorkOrderTimelineEventType.completed,
          ),
          isTrue,
        );
      },
    );

    test(
      't05 — payload da sync action e seguro (sem token, path ou base64)',
      () async {
        final wo = _makeOrder(checklistId: null);
        final queue = InMemorySyncQueueRepository();
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: InMemoryWorkOrderLocalStore([wo]),
        );
        await repo.load();

        await repo.completeWorkOrder(wo.localId, checklistComplete: false);

        final actions = await queue.pendingForTenant(_tenantDemo);
        expect(actions, isNotEmpty);

        final payload = actions.first.payload;
        final keys = payload.keys.toSet();

        // Keys should only be: local_id, server_id, new_status, previous_status, occurred_at
        const forbiddenKeys = {
          'access_token',
          'refresh_token',
          'password',
          'token',
          'bearer',
          'file_path',
          'base64',
        };
        expect(keys.intersection(forbiddenKeys), isEmpty);

        // Values must not contain 'Bearer' or look like tokens
        for (final v in payload.values) {
          final s = v?.toString() ?? '';
          expect(s.contains('Bearer '), isFalse);
          // base64 images start with 'data:image'
          expect(s.contains('data:image'), isFalse);
        }
      },
    );

    test(
      't06 — isolamento de tenant: WO de outro tenant lanca StateError',
      () async {
        final woOtherTenant = _makeOrder(
          tenantId: _tenantOther,
          checklistId: null,
        );
        // Session is for _tenantDemo; WO belongs to _tenantOther
        final repo = _makeWoRepo(_session, [woOtherTenant]);
        await repo.load(); // filters out WO from other tenant

        expect(
          () => repo.completeWorkOrder(
            woOtherTenant.localId,
            checklistComplete: false,
          ),
          throwsA(isA<StateError>()),
        );
      },
    );
  });

  // ── Group 2: WorkOrderExecuteScreen widget tests ──────────────────────────
  group('WorkOrderExecuteScreen', () {
    testWidgets(
      't07 — mostra mensagem de bloqueio quando checklist nao concluido',
      (tester) async {
        final wo = _makeOrder(checklistId: 'cl-seed-1');
        await tester.pumpWidget(_execApp(wo: wo));
        await tester.pumpAndSettle();
        await tester.pump();
        await tester.pumpAndSettle();

        // Scroll down to reveal the blocking card (below transitions list)
        await tester.scrollUntilVisible(
          find.textContaining(
            'Conclua o checklist obrigatorio antes de finalizar a OS.',
          ),
          200.0,
        );
        expect(
          find.textContaining(
            'Conclua o checklist obrigatorio antes de finalizar a OS.',
          ),
          findsOneWidget,
        );
      },
    );

    testWidgets(
      't08 — botao Concluir OS desabilitado quando checklist incompleto',
      (tester) async {
        final wo = _makeOrder(checklistId: 'cl-seed-1');
        await tester.pumpWidget(_execApp(wo: wo));
        await tester.pumpAndSettle();
        await tester.pump();
        await tester.pumpAndSettle();

        await tester.scrollUntilVisible(
          find.widgetWithText(FilledButton, 'Concluir OS'),
          200.0,
        );
        final button = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Concluir OS'),
        );
        expect(button.onPressed, isNull);
      },
    );

    testWidgets(
      't09 — botao Concluir OS habilitado quando nao ha checklist vinculado',
      (tester) async {
        final wo = _makeOrder(checklistId: null);
        await tester.pumpWidget(_execApp(wo: wo));
        await tester.pumpAndSettle();
        await tester.pump();
        await tester.pumpAndSettle();

        // No blocking message anywhere in the tree
        expect(
          find.textContaining('checklist obrigatorio antes de finalizar'),
          findsNothing,
        );

        await tester.scrollUntilVisible(
          find.widgetWithText(FilledButton, 'Concluir OS'),
          200.0,
        );
        final button = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Concluir OS'),
        );
        expect(button.onPressed, isNotNull);
      },
    );

    testWidgets(
      't10 — botao Concluir OS habilitado quando checklist concluido',
      (tester) async {
        final wo = _makeOrder(checklistId: 'cl-seed-1');
        final completedRun = _makeRun(
          workOrderId: wo.localId,
          status: MobileChecklistRunStatus.completed,
        );
        final clRepo = _makeClRepo(runs: [completedRun]);

        await tester.pumpWidget(_execApp(wo: wo, clRepo: clRepo));
        await tester.pumpAndSettle();
        await tester.pump();
        await tester.pumpAndSettle();

        await tester.scrollUntilVisible(
          find.widgetWithText(FilledButton, 'Concluir OS'),
          200.0,
        );

        // No blocking message (checklist complete)
        expect(
          find.textContaining('checklist obrigatorio antes de finalizar'),
          findsNothing,
        );

        final button = tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Concluir OS'),
        );
        expect(button.onPressed, isNotNull);
      },
    );
  });
}
