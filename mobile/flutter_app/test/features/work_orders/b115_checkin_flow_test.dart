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
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const _tenant = 'tenant-b115';
const _userId = 'user-b115';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B115'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: _userId,
    email: 'tech@b115.demo',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
);

WorkOrder _makeWo({
  String localId = 'wo-b115-01',
  WorkOrderStatus status = WorkOrderStatus.scheduled,
  String code = 'OS-1042',
  WorkOrderServiceType? serviceType,
}) => WorkOrder(
  localId: localId,
  tenantId: _tenant,
  code: code,
  title: 'OS de teste B115',
  customerName: 'Cliente B115',
  serviceAddress: 'Rua Teste, 1',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 7, 1),
  assignedUserId: _userId,
  serviceType: serviceType,
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

Widget _wrap({
  required WorkOrder wo,
  bool gpsOk = true,
  WorkOrderRepository? repo,
}) {
  final store = InMemoryWorkOrderLocalStore([wo]);
  final effectiveRepo =
      repo ??
      WorkOrderRepository(
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
      workOrderRepositoryProvider.overrideWithValue(effectiveRepo),
      gpsAvailableProvider.overrideWith((_) async => gpsOk),
    ],
    child: MaterialApp.router(routerConfig: _makeRouter(wo)),
  );
}

/// Scrolls until [finder] is visible, then returns.
Future<void> _scrollUntilFound(WidgetTester t, Finder finder) async {
  await t.scrollUntilVisible(
    finder,
    300,
    scrollable: find.byType(Scrollable).first,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('B-115 Check-in flow — _CheckinActions widget', () {
    testWidgets('1. "Iniciar rota" button visible when scheduled', (t) async {
      await t.pumpWidget(_wrap(wo: _makeWo(status: WorkOrderStatus.scheduled)));
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-start-route')));

      expect(find.text('Iniciar rota'), findsOneWidget);
      expect(find.byKey(const Key('checkin-start-route')), findsOneWidget);
    });

    testWidgets('2. "Iniciar rota" calls updateStatus(enRoute)', (t) async {
      // scheduled → dispatched is required first; the button is shown for
      // dispatched status too, so use dispatched to get a valid transition.
      final wo = _makeWo(status: WorkOrderStatus.dispatched);
      final store = InMemoryWorkOrderLocalStore([wo]);
      final queue = InMemorySyncQueueRepository();
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: store,
        seedWorkOrders: [wo],
      );
      await repo.load(seedIfEmpty: false);

      await t.pumpWidget(_wrap(wo: wo, repo: repo));
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-start-route')));

      await t.tap(find.byKey(const Key('checkin-start-route')));
      await t.pumpAndSettle();

      final actions = await queue.actionsForTenant(_tenant);
      expect(actions, isNotEmpty);
      expect(actions.first.payload['new_status'], 'enRoute');
    });

    testWidgets('3. "Cheguei ao local" visible when enRoute', (t) async {
      await t.pumpWidget(_wrap(wo: _makeWo(status: WorkOrderStatus.enRoute)));
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-arrived')));

      expect(find.text('Cheguei ao local'), findsOneWidget);
      expect(find.byKey(const Key('checkin-arrived')), findsOneWidget);
    });

    testWidgets('4. Plate dialog opens when tapping "Cheguei ao local"', (
      t,
    ) async {
      await t.pumpWidget(_wrap(wo: _makeWo(status: WorkOrderStatus.enRoute)));
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-arrived')));

      await t.tap(find.byKey(const Key('checkin-arrived')));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('plate-input')), findsOneWidget);
      expect(find.byKey(const Key('plate-confirm')), findsOneWidget);
      expect(find.byKey(const Key('plate-cancel')), findsOneWidget);
    });

    testWidgets(
      '5. Plate dialog confirms when input matches last 2 chars AND gpsOk=true',
      (t) async {
        // wo.code = 'OS-1042' → last 2 chars = '42'
        final store = InMemoryWorkOrderLocalStore([
          _makeWo(status: WorkOrderStatus.enRoute, code: 'OS-1042'),
        ]);
        final queue = InMemorySyncQueueRepository();
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: store,
          seedWorkOrders: [
            _makeWo(status: WorkOrderStatus.enRoute, code: 'OS-1042'),
          ],
        );
        await repo.load(seedIfEmpty: false);

        await t.pumpWidget(
          _wrap(
            wo: _makeWo(status: WorkOrderStatus.enRoute, code: 'OS-1042'),
            gpsOk: true,
            repo: repo,
          ),
        );
        await t.pumpAndSettle();
        await _scrollUntilFound(t, find.byKey(const Key('checkin-arrived')));

        await t.tap(find.byKey(const Key('checkin-arrived')));
        await t.pumpAndSettle();

        await t.enterText(find.byKey(const Key('plate-input')), '42');
        await t.pumpAndSettle();

        // Confirm button should be enabled
        final confirmBtn = t.widget<FilledButton>(
          find.byKey(const Key('plate-confirm')),
        );
        expect(confirmBtn.onPressed, isNotNull);

        await t.tap(find.byKey(const Key('plate-confirm')));
        await t.pumpAndSettle();

        // Dialog should have closed and updateStatus(arrived) enqueued
        expect(find.byKey(const Key('plate-input')), findsNothing);
        final actions = await queue.actionsForTenant(_tenant);
        expect(
          actions.any((a) => a.payload['new_status'] == 'arrived'),
          isTrue,
        );
      },
    );

    testWidgets('6. Plate dialog shows error when input is wrong', (t) async {
      await t.pumpWidget(
        _wrap(
          wo: _makeWo(status: WorkOrderStatus.enRoute, code: 'OS-1042'),
          gpsOk: true,
        ),
      );
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-arrived')));

      await t.tap(find.byKey(const Key('checkin-arrived')));
      await t.pumpAndSettle();

      await t.enterText(find.byKey(const Key('plate-input')), 'XX');
      await t.pumpAndSettle();

      // 'XX' != '42' so confirm is disabled — tapping it should be a no-op
      // Verify confirm button is disabled
      final confirmBtn = t.widget<FilledButton>(
        find.byKey(const Key('plate-confirm')),
      );
      expect(confirmBtn.onPressed, isNull);

      // Dialog remains open
      expect(find.byKey(const Key('plate-input')), findsOneWidget);
    });

    testWidgets('7. Plate dialog "Confirmar" disabled when GPS not available', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap(
          wo: _makeWo(status: WorkOrderStatus.enRoute, code: 'OS-1042'),
          gpsOk: false,
        ),
      );
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-arrived')));

      await t.tap(find.byKey(const Key('checkin-arrived')));
      await t.pumpAndSettle();

      // Even with correct input, confirm should be disabled
      await t.enterText(find.byKey(const Key('plate-input')), '42');
      await t.pumpAndSettle();

      final confirmBtn = t.widget<FilledButton>(
        find.byKey(const Key('plate-confirm')),
      );
      expect(confirmBtn.onPressed, isNull);
    });

    testWidgets('8. "Nao foi possivel iniciar" visible when enRoute', (
      t,
    ) async {
      await t.pumpWidget(_wrap(wo: _makeWo(status: WorkOrderStatus.enRoute)));
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-block')));

      expect(find.text('Nao foi possivel iniciar'), findsOneWidget);
      expect(find.byKey(const Key('checkin-block')), findsOneWidget);
    });

    testWidgets(
      '9. Block sheet submit enabled only when reason AND note filled',
      (t) async {
        await t.pumpWidget(_wrap(wo: _makeWo(status: WorkOrderStatus.enRoute)));
        await t.pumpAndSettle();
        await _scrollUntilFound(t, find.byKey(const Key('checkin-block')));

        // Ensure the button is fully in view before tapping to avoid hit-test
        // barrier warnings from partial visibility at the edge of the viewport.
        await t.ensureVisible(find.byKey(const Key('checkin-block')));
        await t.pumpAndSettle();
        await t.tap(
          find.byKey(const Key('checkin-block')),
          warnIfMissed: false,
        );
        await t.pumpAndSettle();

        // Bottom sheet should now be open.
        // The sheet is a Flexible+SingleChildScrollView; widgets may be off-screen.
        // Scroll within the sheet to find the submit button.
        final submitFinder = find.byKey(const Key('block-submit'));
        final reasonFinder = find.byKey(
          const Key('block-reason-Cliente ausente no local'),
        );
        final noteFinder = find.byKey(const Key('block-note'));

        // Scroll the bottom sheet to show the submit button area.
        if (submitFinder.evaluate().isEmpty) {
          await t.scrollUntilVisible(
            submitFinder,
            200,
            scrollable: find.byType(Scrollable).last,
          );
        }
        await t.pumpAndSettle();

        // Initially disabled
        expect(t.widget<FilledButton>(submitFinder).onPressed, isNull);

        // Select a reason (scroll to it if needed)
        if (reasonFinder.evaluate().isEmpty) {
          await t.scrollUntilVisible(
            reasonFinder,
            -200,
            scrollable: find.byType(Scrollable).last,
          );
        }
        await t.tap(reasonFinder, warnIfMissed: false);
        await t.pumpAndSettle();

        // Still disabled — no note yet
        if (submitFinder.evaluate().isEmpty) {
          await t.scrollUntilVisible(
            submitFinder,
            200,
            scrollable: find.byType(Scrollable).last,
          );
        }
        expect(t.widget<FilledButton>(submitFinder).onPressed, isNull);

        // Fill in note
        if (noteFinder.evaluate().isEmpty) {
          await t.scrollUntilVisible(
            noteFinder,
            200,
            scrollable: find.byType(Scrollable).last,
          );
        }
        await t.enterText(noteFinder, 'Cliente nao atendeu');
        await t.pumpAndSettle();

        // Scroll to submit button and verify it's now enabled
        if (submitFinder.evaluate().isEmpty) {
          await t.scrollUntilVisible(
            submitFinder,
            200,
            scrollable: find.byType(Scrollable).last,
          );
        }
        expect(t.widget<FilledButton>(submitFinder).onPressed, isNotNull);
      },
    );

    testWidgets('10. "Iniciar atendimento" visible when arrived', (t) async {
      await t.pumpWidget(_wrap(wo: _makeWo(status: WorkOrderStatus.arrived)));
      await t.pumpAndSettle();
      await _scrollUntilFound(
        t,
        find.byKey(const Key('checkin-start-service')),
      );

      expect(find.text('Iniciar atendimento'), findsOneWidget);
      expect(find.byKey(const Key('checkin-start-service')), findsOneWidget);
    });

    testWidgets('11. "Continuar atendimento" visible when inService', (
      t,
    ) async {
      await t.pumpWidget(_wrap(wo: _makeWo(status: WorkOrderStatus.inService)));
      await t.pumpAndSettle();
      await _scrollUntilFound(t, find.byKey(const Key('checkin-continue')));

      expect(find.text('Continuar atendimento'), findsOneWidget);
      expect(find.byKey(const Key('checkin-continue')), findsOneWidget);
    });
  });
}
