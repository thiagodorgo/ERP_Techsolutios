import 'package:go_router/go_router.dart';

import '../core/bootstrap/bootstrap_session.dart';
import '../core/diagnostics/diagnostics_screen.dart';
import '../features/expenses/ui/expense_list_screen.dart';
import '../features/expenses/ui/new_expense_report_screen.dart';
import '../shared/ui/home_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => HomeScreen(session: devBootstrapSession),
    ),
    GoRoute(
      path: '/expenses',
      builder: (context, state) =>
          ExpenseListScreen(session: devBootstrapSession),
    ),
    GoRoute(
      path: '/expenses/new',
      builder: (context, state) => const NewExpenseReportScreen(),
    ),
    GoRoute(
      path: '/diagnostics',
      builder: (context, state) => const DiagnosticsScreen(),
    ),
  ],
);
