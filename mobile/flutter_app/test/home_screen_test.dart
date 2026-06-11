import 'package:flutter/material.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('home shows enabled expense module with permission', (
    tester,
  ) async {
    await tester.pumpWidget(_homeWithPermissions({'expense_report:create'}));

    expect(find.text('Gestao de Despesas'), findsOneWidget);
  });

  testWidgets('home hides expense module without permission', (tester) async {
    await tester.pumpWidget(_homeWithPermissions({'expense_report:read'}));

    expect(find.text('Gestao de Despesas'), findsNothing);
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

  return MaterialApp.router(routerConfig: router);
}
