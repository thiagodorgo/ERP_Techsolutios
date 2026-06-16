import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_notifier.dart';
import '../core/bootstrap/bootstrap_repository.dart';
import '../core/config/app_config.dart';
import '../core/diagnostics/diagnostics_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/tenant_selector_screen.dart';
import '../features/expenses/ui/expense_item_receipts_screen.dart';
import '../features/expenses/ui/expense_report_detail_screen.dart';
import '../features/expenses/ui/expense_submit_screen.dart';
import '../features/expenses/ui/expense_list_screen.dart';
import '../features/expenses/ui/new_expense_item_screen.dart';
import '../features/expenses/ui/new_expense_report_screen.dart';
import '../features/checklists/ui/checklist_acknowledgement_screen.dart';
import '../features/checklists/ui/checklist_available_screen.dart';
import '../features/checklists/ui/checklist_damage_map_screen.dart';
import '../features/checklists/ui/checklist_run_screen.dart';
import '../features/inventory/ui/inventory_list_screen.dart';
import '../features/inventory/ui/stock_entry_screen.dart';
import '../features/inventory/ui/stock_exit_screen.dart';
import '../features/work_orders/ui/new_work_order_screen.dart';
import '../features/work_orders/ui/work_order_approval_request_screen.dart';
import '../features/work_orders/ui/work_order_detail_screen.dart';
import '../features/work_orders/ui/work_order_execute_screen.dart';
import '../features/work_orders/ui/work_order_list_screen.dart';
import '../shared/ui/module_placeholder_screen.dart';
import '../shared/ui/profile_screen.dart';
import '../shared/ui/home_screen.dart';
import '../shared/ui/sync_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final notifier = ref.watch(routerNotifierProvider);

  return GoRouter(
    refreshListenable: notifier,
    initialLocation: '/login',
    redirect: (context, state) {
      final authAsync = ref.read(authStateProvider);

      // While auth is resolving, don't redirect — let screens show their own loaders
      if (authAsync.isLoading) return null;

      final authState = authAsync.asData?.value;
      if (authState == null) return null;

      final loc = state.matchedLocation;
      final isLoginRoute = loc == '/login';
      final isTenantSelect = loc == '/tenant-select';

      if (!authState.isAuthenticated && !isLoginRoute) return '/login';

      if (authState.isAuthenticated && isLoginRoute) {
        // After login: check if tenant selection is pending (remote + multi-tenant)
        final notifier = ref.read(bootstrapNotifierProvider.notifier);
        if (notifier.pendingTenantSelection) return '/tenant-select';
        return '/';
      }

      // Authenticated and not on login — check ongoing tenant-select need
      if (authState.isAuthenticated && !isLoginRoute && !isTenantSelect) {
        final notifier = ref.read(bootstrapNotifierProvider.notifier);
        if (notifier.pendingTenantSelection) return '/tenant-select';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/tenant-select',
        builder: (context, state) => const TenantSelectorScreen(),
      ),
      GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/expenses',
        builder: (context, state) => const ExpenseListScreen(),
      ),
      GoRoute(
        path: '/expenses/new',
        builder: (context, state) => const NewExpenseReportScreen(),
      ),
      GoRoute(
        path: '/expenses/:reportId',
        builder: (context, state) => ExpenseReportDetailScreen(
          reportId: state.pathParameters['reportId']!,
        ),
      ),
      GoRoute(
        path: '/expenses/:reportId/items/new',
        builder: (context, state) =>
            NewExpenseItemScreen(reportId: state.pathParameters['reportId']!),
      ),
      GoRoute(
        path: '/expenses/:reportId/items/:itemId/receipts',
        builder: (context, state) => ExpenseItemReceiptsScreen(
          reportId: state.pathParameters['reportId']!,
          itemId: state.pathParameters['itemId']!,
        ),
      ),
      GoRoute(
        path: '/expenses/:reportId/submit',
        builder: (context, state) =>
            ExpenseSubmitScreen(reportId: state.pathParameters['reportId']!),
      ),
      GoRoute(
        path: '/diagnostics',
        builder: (context, state) => kIsDevMode
            ? const DiagnosticsScreen()
            : const ModulePlaceholderScreen(
                title: 'Diagnostico',
                requiredPermission: 'diagnostics:read',
                message: 'Esta area e restrita a ambientes de desenvolvimento.',
              ),
      ),
      GoRoute(path: '/sync', builder: (context, state) => const SyncScreen()),
      GoRoute(
        path: '/work-orders',
        builder: (context, state) => const WorkOrderListScreen(),
      ),
      GoRoute(
        path: '/work-orders/new',
        builder: (context, state) => const NewWorkOrderScreen(),
      ),
      GoRoute(
        path: '/work-orders/:workOrderId',
        builder: (context, state) => WorkOrderDetailScreen(
          workOrderId: state.pathParameters['workOrderId']!,
        ),
      ),
      GoRoute(
        path: '/work-orders/:workOrderId/execute',
        builder: (context, state) => WorkOrderExecuteScreen(
          workOrderId: state.pathParameters['workOrderId']!,
        ),
      ),
      GoRoute(
        path: '/work-orders/:workOrderId/approval-request',
        builder: (context, state) => WorkOrderApprovalRequestScreen(
          workOrderId: state.pathParameters['workOrderId']!,
        ),
      ),
      GoRoute(
        path: '/work-orders/:workOrderId/checklists',
        builder: (context, state) => ChecklistAvailableScreen(
          workOrderId: state.pathParameters['workOrderId']!,
        ),
      ),
      GoRoute(
        path: '/checklists/:checklistId/run',
        builder: (context, state) => ChecklistRunScreen(
          checklistId: state.pathParameters['checklistId']!,
          workOrderId: state.uri.queryParameters['workOrderId'] ?? '',
        ),
      ),
      GoRoute(
        path: '/checklists/:checklistId/run/damage-map',
        builder: (context, state) => ChecklistDamageMapScreen(
          checklistId: state.pathParameters['checklistId']!,
          runId: state.uri.queryParameters['runId'] ?? '',
          vehicleType: state.uri.queryParameters['vehicleType'] ?? 'sedan',
        ),
      ),
      GoRoute(
        path: '/checklists/:checklistId/run/acknowledgement',
        builder: (context, state) => ChecklistAcknowledgementScreen(
          checklistId: state.pathParameters['checklistId']!,
          runId: state.uri.queryParameters['runId'] ?? '',
        ),
      ),
      GoRoute(
        path: '/field-map',
        builder: (context, state) => const ModulePlaceholderScreen(
          title: 'Mapa e localizacao',
          requiredPermission: 'field_location:send',
          message:
              'Mapa real, GPS e roteirizacao permanecem fora desta rodada. A rota ja respeita permissao de localizacao.',
        ),
      ),
      GoRoute(
        path: '/inventory',
        builder: (context, state) => const InventoryListScreen(),
      ),
      GoRoute(
        path: '/inventory/entry',
        builder: (context, state) => StockEntryScreen(
          preselectedItemId: state.uri.queryParameters['itemId'],
        ),
      ),
      GoRoute(
        path: '/inventory/exit',
        builder: (context, state) => StockExitScreen(
          preselectedItemId: state.uri.queryParameters['itemId'],
        ),
      ),
      GoRoute(
        path: '/approvals',
        builder: (context, state) => const ModulePlaceholderScreen(
          title: 'Aprovacoes',
          requiredPermission: 'workflow:request',
          message:
              'Fila e decisoes de aprovacao ficam estruturadas, mas sem workflow backend novo.',
        ),
      ),
    ],
  );
});

// Used by tests that navigate directly without a ProviderScope/auth guard.
// Contains all routes but no redirect — mirrors appRouterProvider's routes.
final appRouter = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/', builder: (context, state) => const HomeScreen()),
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/expenses',
      builder: (context, state) => const ExpenseListScreen(),
    ),
    GoRoute(
      path: '/expenses/new',
      builder: (context, state) => const NewExpenseReportScreen(),
    ),
    GoRoute(
      path: '/expenses/:reportId',
      builder: (context, state) => ExpenseReportDetailScreen(
        reportId: state.pathParameters['reportId']!,
      ),
    ),
    GoRoute(
      path: '/expenses/:reportId/items/new',
      builder: (context, state) =>
          NewExpenseItemScreen(reportId: state.pathParameters['reportId']!),
    ),
    GoRoute(
      path: '/expenses/:reportId/items/:itemId/receipts',
      builder: (context, state) => ExpenseItemReceiptsScreen(
        reportId: state.pathParameters['reportId']!,
        itemId: state.pathParameters['itemId']!,
      ),
    ),
    GoRoute(
      path: '/expenses/:reportId/submit',
      builder: (context, state) =>
          ExpenseSubmitScreen(reportId: state.pathParameters['reportId']!),
    ),
    GoRoute(
      path: '/diagnostics',
      builder: (context, state) => kIsDevMode
          ? const DiagnosticsScreen()
          : const ModulePlaceholderScreen(
              title: 'Diagnostico',
              requiredPermission: 'diagnostics:read',
              message: 'Esta area e restrita a ambientes de desenvolvimento.',
            ),
    ),
    GoRoute(path: '/sync', builder: (context, state) => const SyncScreen()),
    GoRoute(
      path: '/work-orders',
      builder: (context, state) => const WorkOrderListScreen(),
    ),
    GoRoute(
      path: '/work-orders/new',
      builder: (context, state) => const NewWorkOrderScreen(),
    ),
    GoRoute(
      path: '/work-orders/:workOrderId',
      builder: (context, state) => WorkOrderDetailScreen(
        workOrderId: state.pathParameters['workOrderId']!,
      ),
    ),
    GoRoute(
      path: '/work-orders/:workOrderId/execute',
      builder: (context, state) => WorkOrderExecuteScreen(
        workOrderId: state.pathParameters['workOrderId']!,
      ),
    ),
    GoRoute(
      path: '/work-orders/:workOrderId/approval-request',
      builder: (context, state) => WorkOrderApprovalRequestScreen(
        workOrderId: state.pathParameters['workOrderId']!,
      ),
    ),
    GoRoute(
      path: '/work-orders/:workOrderId/checklists',
      builder: (context, state) => ChecklistAvailableScreen(
        workOrderId: state.pathParameters['workOrderId']!,
      ),
    ),
    GoRoute(
      path: '/checklists/:checklistId/run',
      builder: (context, state) => ChecklistRunScreen(
        checklistId: state.pathParameters['checklistId']!,
        workOrderId: state.uri.queryParameters['workOrderId'] ?? '',
      ),
    ),
    GoRoute(
      path: '/checklists/:checklistId/run/damage-map',
      builder: (context, state) => ChecklistDamageMapScreen(
        checklistId: state.pathParameters['checklistId']!,
        runId: state.uri.queryParameters['runId'] ?? '',
      ),
    ),
    GoRoute(
      path: '/checklists/:checklistId/run/acknowledgement',
      builder: (context, state) => ChecklistAcknowledgementScreen(
        checklistId: state.pathParameters['checklistId']!,
        runId: state.uri.queryParameters['runId'] ?? '',
      ),
    ),
    GoRoute(
      path: '/field-map',
      builder: (context, state) => const ModulePlaceholderScreen(
        title: 'Mapa e localizacao',
        requiredPermission: 'field_location:send',
        message:
            'Mapa real, GPS e roteirizacao permanecem fora desta rodada. A rota ja respeita permissao de localizacao.',
      ),
    ),
    GoRoute(
      path: '/inventory',
      builder: (context, state) => const InventoryListScreen(),
    ),
    GoRoute(
      path: '/inventory/entry',
      builder: (context, state) => StockEntryScreen(
        preselectedItemId: state.uri.queryParameters['itemId'],
      ),
    ),
    GoRoute(
      path: '/inventory/exit',
      builder: (context, state) => StockExitScreen(
        preselectedItemId: state.uri.queryParameters['itemId'],
      ),
    ),
    GoRoute(
      path: '/approvals',
      builder: (context, state) => const ModulePlaceholderScreen(
        title: 'Aprovacoes',
        requiredPermission: 'workflow:request',
        message:
            'Fila e decisoes de aprovacao ficam estruturadas, mas sem workflow backend novo.',
      ),
    ),
  ],
);
