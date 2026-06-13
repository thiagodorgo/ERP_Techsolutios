import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_report_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('expenses list renders seeded Prestações de Contas', (
    tester,
  ) async {
    await tester.pumpWidget(const _TestApp(initialLocation: '/expenses'));
    await tester.pumpAndSettle();

    expect(find.text('Gestao de Despesas'), findsOneWidget);
    expect(
      find.text('Prestação de Contas atendimento OS-1042'),
      findsOneWidget,
    );
    expect(find.textContaining('Violacao de politica'), findsWidgets);
  });

  testWidgets('expense detail renders totals and add item action', (
    tester,
  ) async {
    await tester.pumpWidget(
      const _TestApp(initialLocation: '/expenses/PC-local-1'),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Prestação de Contas atendimento OS-1042'),
      findsOneWidget,
    );
    expect(find.textContaining('A receber'), findsWidgets);
    await tester.drag(find.byType(ListView), const Offset(0, -500));
    await tester.pumpAndSettle();
    expect(find.text('Adicionar item'), findsOneWidget);
  });

  testWidgets('new item screen renders receipt placeholder control', (
    tester,
  ) async {
    await tester.pumpWidget(
      const _TestApp(initialLocation: '/expenses/PC-local-1/items/new'),
    );
    await tester.pumpAndSettle();

    expect(find.text('Novo item'), findsOneWidget);
    expect(find.text('Recibo anexado estruturalmente'), findsOneWidget);
    expect(find.text('Salvar item e enfileirar sync'), findsOneWidget);
  });

  testWidgets('submit screen blocks report with policy violations', (
    tester,
  ) async {
    await tester.pumpWidget(
      const _TestApp(initialLocation: '/expenses/PC-local-1/submit'),
    );
    await tester.pumpAndSettle();

    final submitButton = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Submeter localmente'),
    );

    expect(submitButton.onPressed, isNull);
  });

  testWidgets('expense detail loads persisted local report', (tester) async {
    final store = InMemoryExpenseLocalStore([
      ExpenseReport(
        localId: 'PC-persisted',
        title: 'Prestação de Contas persistida tela',
        tenantId: 'tenant-demo',
        employeeId: 'employee-1',
        policyVersion: '2026-06-11',
        status: ExpenseReportStatus.syncPending,
        advance: const ExpenseAdvance(tenantId: 'tenant-demo', amount: 10),
        items: [
          ExpenseItem(
            localId: 'item-persisted',
            tenantId: 'tenant-demo',
            categoryId: 'meal',
            amount: 42,
            date: DateTime.utc(2026, 6, 11),
            vendorName: 'Persistido',
          ),
        ],
      ),
    ]);

    final router = GoRouter(
      initialLocation: '/expenses/PC-persisted',
      routes: [
        GoRoute(
          path: '/expenses/:reportId',
          builder: (context, state) => ExpenseReportDetailScreen(
            reportId: state.pathParameters['reportId']!,
          ),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          expenseLocalStoreProvider.overrideWithValue(store),
          syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Prestação de Contas persistida tela'), findsOneWidget);
    expect(find.textContaining('R\$ 42,00'), findsWidgets);
  });
}

class _TestApp extends StatelessWidget {
  const _TestApp({required this.initialLocation});

  final String initialLocation;

  @override
  Widget build(BuildContext context) {
    appRouter.go(initialLocation);
    return ProviderScope(
      overrides: [
        expenseLocalStoreProvider.overrideWithValue(
          InMemoryExpenseLocalStore(),
        ),
        syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
      ],
      child: MaterialApp.router(routerConfig: appRouter),
    );
  }
}
