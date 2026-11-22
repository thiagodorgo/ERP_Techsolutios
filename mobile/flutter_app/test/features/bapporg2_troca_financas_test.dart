// B-APP-ORG-2 (A3, tela) — a troca "Despesas | Comissões" na tela de Despesas
// (C4-08 da junta J-APP): a troca aparece na lista de despesas, leva às
// comissões, e a troca das comissões traz de volta às despesas.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/commissions/ui/finance_section_switch.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/ui/expense_list_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'patio-financas';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Pátio Centro'),
  enabledModules: [],
  permissions: PermissionSet({
    'expense_report:read',
    'expense_report:create',
    'expense_report:submit',
  }),
);

const _comissoesKey = Key('tela-comissoes-de-teste');

Future<GoRouter> _pump(WidgetTester tester) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  final router = GoRouter(
    initialLocation: '/expenses',
    routes: [
      GoRoute(
        path: '/expenses',
        builder: (context, state) => const ExpenseListScreen(),
      ),
      GoRoute(
        path: commissionsRoutePath,
        // A tela de Comissões tem os testes dela; aqui basta o topo com a
        // troca, que é o mesmo componente da tela real.
        builder: (context, state) => const Scaffold(
          key: _comissoesKey,
          body: FinanceSectionSwitch(current: FinanceSection.commissions),
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        bootstrapSessionProvider.overrideWith((_) async => _session),
        expenseLocalStoreProvider.overrideWithValue(
          InMemoryExpenseLocalStore(),
        ),
        workOrderLocalStoreProvider.overrideWithValue(
          InMemoryWorkOrderLocalStore(),
        ),
        syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
      ],
      child: MaterialApp.router(
        theme: ErpMobileTheme.light(),
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

String _path(GoRouter router) =>
    router.routerDelegate.currentConfiguration.uri.path;

void main() {
  testWidgets('TF1 — a troca aparece em Despesas, leva às Comissões e volta às '
      'Despesas', (tester) async {
    final router = await _pump(tester);

    expect(_path(router), '/expenses');
    expect(find.byType(ExpenseListScreen), findsOneWidget);
    final troca = find.descendant(
      of: find.byType(ExpenseListScreen),
      matching: find.byType(FinanceSectionSwitch),
    );
    expect(troca, findsOneWidget, reason: 'a troca fica no topo de Despesas');
    expect(
      tester.widget<FinanceSectionSwitch>(troca).current,
      FinanceSection.expenses,
    );

    await tester.tap(
      find.descendant(of: troca, matching: find.text('Comissões')),
    );
    await tester.pumpAndSettle();

    expect(_path(router), commissionsRoutePath);
    expect(find.byKey(_comissoesKey), findsOneWidget);
    expect(find.byType(ExpenseListScreen), findsNothing);

    await tester.tap(
      find.descendant(
        of: find.byType(FinanceSectionSwitch),
        matching: find.text('Despesas'),
      ),
    );
    await tester.pumpAndSettle();

    expect(_path(router), '/expenses');
    expect(find.byType(ExpenseListScreen), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(ExpenseListScreen),
        matching: find.byType(FinanceSectionSwitch),
      ),
      findsOneWidget,
    );
  });
}
