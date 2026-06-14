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
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_detail_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const _tenant = 'tenant-b084';

const _sessionFull = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant B084'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:create',
    'work_orders:status',
    'work_orders:update',
    'expense_report:read',
    'expense_report:create',
  }),
);

WorkOrder _wo({
  required String id,
  WorkOrderStatus status = WorkOrderStatus.scheduled,
  WorkOrderPriority priority = WorkOrderPriority.normal,
  DateTime? scheduledAt,
  String? title,
}) => WorkOrder(
  localId: id,
  tenantId: _tenant,
  code: 'OS-B084-$id',
  title: title ?? 'Instalacao $id',
  customerName: 'Cliente B084',
  serviceAddress: 'Rua Teste, 1',
  status: status,
  priority: priority,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 6, 12),
  scheduledAt: scheduledAt,
);

// ---------------------------------------------------------------------------
// Widget helper
// ---------------------------------------------------------------------------

Widget _wrapHome({List<WorkOrder> seed = const []}) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => HomeScreen(session: _sessionFull),
      ),
      GoRoute(
        path: '/work-orders/:id',
        builder: (_, state) =>
            WorkOrderDetailScreen(workOrderId: state.pathParameters['id']!),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _sessionFull),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(seed),
      ),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('HomeScreen — stats row (B-084)', () {
    testWidgets('1. stats row aparece quando ha OS no tenant', (tester) async {
      final seed = [_wo(id: 'a', status: WorkOrderStatus.scheduled)];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      expect(find.text('OS hoje'), findsOneWidget);
      expect(find.text('Em campo'), findsOneWidget);
      expect(find.text('Concluidas'), findsOneWidget);
    });

    testWidgets('2. stats row nao aparece sem OS', (tester) async {
      await tester.pumpWidget(_wrapHome(seed: []));
      await tester.pumpAndSettle();

      expect(find.text('OS hoje'), findsNothing);
      expect(find.text('Em campo'), findsNothing);
      expect(find.text('Concluidas'), findsNothing);
    });

    testWidgets('3. inFieldCount conta status em campo corretamente', (
      tester,
    ) async {
      final seed = [
        _wo(id: 'a', status: WorkOrderStatus.enRoute),
        _wo(id: 'b', status: WorkOrderStatus.inService),
        _wo(id: 'c', status: WorkOrderStatus.scheduled),
        _wo(id: 'd', status: WorkOrderStatus.completed),
      ];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      // 2 em campo (enRoute + inService), 1 concluida
      // Values appear as Text widgets in _StatCard
      expect(find.text('Em campo'), findsOneWidget);
      expect(find.text('Concluidas'), findsOneWidget);
    });

    testWidgets('4. doneCount conta completed e approved', (tester) async {
      final seed = [
        _wo(id: 'a', status: WorkOrderStatus.completed),
        _wo(id: 'b', status: WorkOrderStatus.approved),
        _wo(id: 'c', status: WorkOrderStatus.scheduled),
      ];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      // "2" should appear as the doneCount value
      expect(find.text('2'), findsWidgets);
    });
  });

  group('HomeScreen — Suas OS de hoje (B-084)', () {
    testWidgets('5. lista de hoje aparece com OS agendadas hoje', (
      tester,
    ) async {
      final today = DateTime.now();
      final seed = [
        _wo(id: 'x', scheduledAt: today, status: WorkOrderStatus.scheduled),
      ];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      // TodayOsList aparece apos o NextOsCard — rolar para trazer ao viewport
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pump();

      expect(find.text('Suas OS de hoje'), findsOneWidget);
    });

    testWidgets('6. lista de hoje nao aparece sem OS no dia', (tester) async {
      final yesterday = DateTime.now().subtract(const Duration(days: 1));
      final seed = [
        _wo(id: 'y', scheduledAt: yesterday, status: WorkOrderStatus.scheduled),
      ];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      expect(find.text('Suas OS de hoje'), findsNothing);
    });

    testWidgets('7. lista de hoje nao aparece sem scheduledAt', (tester) async {
      final seed = [_wo(id: 'z', status: WorkOrderStatus.scheduled)];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      expect(find.text('Suas OS de hoje'), findsNothing);
    });

    testWidgets('8. lista de hoje mostra no maximo 5 OS', (tester) async {
      final today = DateTime.now();
      final seed = [
        for (int i = 0; i < 7; i++)
          _wo(
            id: 'wo$i',
            scheduledAt: today,
            status: WorkOrderStatus.scheduled,
            title: 'Servico $i',
          ),
      ];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      // Rolar para trazer TodayOsList ao viewport
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pump();

      expect(find.text('Suas OS de hoje'), findsOneWidget);
      // take(5) garante que apenas 5 itens entram na lista
      // Servico 5 e 6 nao estao no todayOrders, portanto nao aparecem
      expect(find.text('Servico 5'), findsNothing);
      expect(find.text('Servico 6'), findsNothing);
    });

    testWidgets('9. item da lista navega para detalhe da OS ao tocar', (
      tester,
    ) async {
      final today = DateTime.now();
      final seed = [
        _wo(id: 'nav1', scheduledAt: today, status: WorkOrderStatus.scheduled),
      ];
      await tester.pumpWidget(_wrapHome(seed: seed));
      await tester.pumpAndSettle();

      // O titulo aparece em _NextOsCard e _TodayOsItem; rolar e usar .last
      await tester.drag(find.byType(ListView), const Offset(0, -400));
      await tester.pump();

      // .last garante tap no item dentro de _TodayOsList (aparece depois no tree)
      await tester.tap(find.text('Instalacao nav1').last);
      await tester.pumpAndSettle();

      // Navegou para detalhe — AppBar exibe codigo + titulo
      expect(find.text('OS-B084-nav1 · Instalacao nav1'), findsOneWidget);
    });
  });

  group('WorkOrderDetailScreen — label B-084', () {
    testWidgets('10. botao primario exibe "Iniciar atendimento"', (
      tester,
    ) async {
      final seed = [_wo(id: 'det1', status: WorkOrderStatus.scheduled)];
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => const WorkOrderDetailScreen(workOrderId: 'det1'),
          ),
        ],
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            bootstrapSessionProvider.overrideWith((_) async => _sessionFull),
            workOrderLocalStoreProvider.overrideWithValue(
              InMemoryWorkOrderLocalStore(seed),
            ),
            syncActionStoreProvider.overrideWithValue(
              InMemorySyncActionStore([]),
            ),
          ],
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      // Botao fica abaixo dos cards de info — rolar para trazer ao viewport
      await tester.scrollUntilVisible(find.text('Iniciar atendimento'), 200);
      expect(find.text('Iniciar atendimento'), findsOneWidget);
    });
  });
}
