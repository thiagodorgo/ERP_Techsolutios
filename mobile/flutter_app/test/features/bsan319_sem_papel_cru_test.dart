// B-SAN3-19 — nenhum papel técnico cru na home nem na TenantContextBar (item 48, plano §4).
//
// A sessão padrão do BootstrapSession é a de um `field_technician`. A home (cabeçalho e cartão do usuário) e a
// TenantContextBar mostram "Técnico de Campo"; `field_technician` não aparece em lugar nenhum.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_components.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _session = BootstrapSession(
  activeTenant: TenantContext(
    tenantId: 'tenant-bsan319',
    displayName: 'Guinchos Brasil',
  ),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'expense_report:read'}),
);

const _sessaoGestor = BootstrapSession(
  activeTenant: TenantContext(
    tenantId: 'tenant-bsan319',
    displayName: 'Guinchos Brasil',
  ),
  enabledModules: [],
  permissions: PermissionSet({}),
  user: AuthenticatedUser(
    userId: 'u-gestor',
    email: 'gestor@guinchos.example',
    tenantRole: 'manager',
    tenantRoles: ['manager'],
    scope: 'tenant',
  ),
);

Widget _home() {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (_, _) => const HomeScreen(session: _session),
      ),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((_) async => _session),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(const []),
      ),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore([])),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Widget _barra(BootstrapSession session) => MaterialApp(
  home: Scaffold(body: TenantContextBar(session: session)),
);

void main() {
  group('B-SAN3-19 · sem papel cru', () {
    testWidgets('home — cabeçalho e cartão dizem "Técnico de Campo"', (
      tester,
    ) async {
      await tester.pumpWidget(_home());
      await tester.pumpAndSettle();

      expect(find.text('Técnico de Campo · Guinchos Brasil'), findsNWidgets(2));
      expect(find.textContaining('field_technician'), findsNothing);
    });

    testWidgets('TenantContextBar — "Técnico de Campo · e-mail"', (
      tester,
    ) async {
      await tester.pumpWidget(_barra(_session));
      await tester.pumpAndSettle();

      expect(
        find.text('Técnico de Campo · tecnico@tenant.demo'),
        findsOneWidget,
      );
      expect(find.textContaining('field_technician'), findsNothing);
    });

    testWidgets('TenantContextBar — outro papel também sai rotulado', (
      tester,
    ) async {
      await tester.pumpWidget(_barra(_sessaoGestor));
      await tester.pumpAndSettle();

      expect(
        find.text('Gestor Operacional · gestor@guinchos.example'),
        findsOneWidget,
      );
      expect(find.textContaining('manager'), findsNothing);
    });
  });
}
