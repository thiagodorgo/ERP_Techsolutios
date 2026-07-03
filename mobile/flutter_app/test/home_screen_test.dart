import 'package:flutter/material.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('home shows enabled expense module with permission', (
    tester,
  ) async {
    await tester.pumpWidget(_homeWithPermissions({'expense_report:create'}));

    expect(find.text('Despesas'), findsOneWidget);
  });

  testWidgets('home shows enabled expense module with all permissions', (
    tester,
  ) async {
    await tester.pumpWidget(
      _homeWithPermissions({'expense_report:read', 'expense_report:create'}),
    );

    expect(find.text('Despesas'), findsOneWidget);
  });

  testWidgets('home hides expense module without permission', (tester) async {
    await tester.pumpWidget(_homeWithPermissions({'expense_report:read'}));

    expect(find.text('Despesas'), findsNothing);
  });
}

Widget _homeWithPermissions(Set<String> permissions) {
  final router = GoRouter(
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => HomeScreen(
          session: BootstrapSession(
            activeTenant: const TenantContext(
              tenantId: 'tenant-a',
              displayName: 'Tenant A',
            ),
            enabledModules: const [
              EnabledModule(
                id: 'expense_management',
                title: 'Gestao de Despesas',
                route: '/expenses',
                requiredPermissions: ['expense_report:create'],
              ),
            ],
            permissions: PermissionSet(permissions),
          ),
        ),
      ),
    ],
  );

  return ProviderScope(
    overrides: [
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}
