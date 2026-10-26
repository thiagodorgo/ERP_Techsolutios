// B-SAN3-13 — Home e lista sob a E1 do dono ("Só as abertas"), plano v3 §4.4, CA-21/CA-22.
//
// Com a OS concluída e sincronizada saindo do aparelho, o tile "Concluídas" da Home contaria sempre 0 (número que
// o código fabrica, D-007): vira "A sincronizar" (OS com envio pendente). "OS hoje" = abertas agendadas hoje. A aba
// "Concluidas" da lista mostra as terminais ainda retidas e, vazia, diz onde está o histórico. Componentes que já
// existem (MobileStatTile, EmptyState); nenhum layout novo. Espelhos: b084_home_stats_test, b083_polish_test.
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
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:erp_techsolutions_mobile/shared/ui/mobile_kit.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan313';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'expense_report:read',
  }),
);

WorkOrder _wo(
  String id, {
  WorkOrderStatus status = WorkOrderStatus.scheduled,
  SyncStatus sync = SyncStatus.synced,
  DateTime? scheduledAt,
}) => WorkOrder(
  localId: id,
  serverId: 'srv-$id',
  tenantId: _tenant,
  code: 'OS-E1-$id',
  title: 'OS $id',
  customerName: 'Cliente',
  serviceAddress: 'Rua, 1',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: sync,
  createdAt: DateTime.utc(2026, 10, 25),
  scheduledAt: scheduledAt,
);

Widget _wrap(Widget child, List<WorkOrder> seed) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [GoRoute(path: '/', builder: (_, _) => child)],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(seed),
      ),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

String _tile(WidgetTester tester, String label) => tester
    .widgetList<MobileStatTile>(find.byType(MobileStatTile))
    .firstWhere((t) => t.label == label)
    .value;

void main() {
  group('B-SAN3-13 · Home sob a E1', () {
    // F26 (CA-21)
    testWidgets(
      'F26 — sem "Concluídas"; "A sincronizar" = 0 com tudo sincronizado; "OS hoje" só abertas de hoje',
      (tester) async {
        final hoje = DateTime.now();
        await tester.pumpWidget(
          _wrap(HomeScreen(session: _session), [
            _wo('aberta-hoje', scheduledAt: hoje),
            _wo(
              'aberta-amanha',
              scheduledAt: hoje.add(const Duration(days: 1)),
            ),
            _wo(
              'concluida-hoje',
              status: WorkOrderStatus.completed,
              scheduledAt: hoje,
            ),
          ]),
        );
        await tester.pumpAndSettle();

        expect(find.text('Concluídas'), findsNothing);
        expect(_tile(tester, 'A sincronizar'), '0');
        expect(_tile(tester, 'OS hoje'), '1');
        expect(_tile(tester, 'Pendentes'), '2');
      },
    );

    testWidgets('F26b — uma OS com envio pendente → "A sincronizar" = 1', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(HomeScreen(session: _session), [
          _wo('a'),
          _wo('b', status: WorkOrderStatus.completed, sync: SyncStatus.pending),
        ]),
      );
      await tester.pumpAndSettle();
      expect(_tile(tester, 'A sincronizar'), '1');
    });
  });

  group('B-SAN3-13 · lista sob a E1', () {
    // F27 (CA-22)
    testWidgets('F27 — aba Concluidas vazia explica onde está o histórico', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(const WorkOrderListScreen(), [_wo('aberta')]),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Concluídas'));
      await tester.pump();

      expect(
        find.text(
          'As OS concluídas saem do aparelho depois de sincronizar. '
          'O histórico fica no portal.',
        ),
        findsOneWidget,
      );
    });

    testWidgets('F27b — terminal retida (envio pendente) aparece na aba', (
      tester,
    ) async {
      await tester.pumpWidget(
        _wrap(const WorkOrderListScreen(), [
          _wo('aberta'),
          _wo(
            'retida',
            status: WorkOrderStatus.completed,
            sync: SyncStatus.pending,
          ),
        ]),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Concluídas'));
      await tester.pump();

      expect(find.textContaining('OS-E1-retida'), findsOneWidget);
      expect(
        find.textContaining('As OS concluídas saem do aparelho'),
        findsNothing,
      );
    });
  });
}
