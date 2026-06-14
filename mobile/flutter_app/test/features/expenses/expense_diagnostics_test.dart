import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/diagnostics/diagnostics_screen.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  testWidgets('diagnostics do not render sensitive sync payload', (
    tester,
  ) async {
    // Seed the queue directly — avoids FutureBuilder double-future from
    // syncing with a Drift store that pumpAndSettle can miss.
    final queue = InMemorySyncQueueRepository();
    await queue.enqueue(
      SyncAction(
        clientActionId: 'client-action-1',
        tenantId: 'tenant-demo',
        type: 'expense_report.create',
        payload: const {
          'token': 'secret-token',
          'receipt_path': 'C:/private/receipt.jpg',
        },
        status: SyncStatus.failed,
        createdAt: DateTime.utc(2026, 6, 11),
        lastErrorCode: 'safe_error',
        lastSafeError: 'Falha segura ao sincronizar. Tente novamente.',
      ),
    );

    final router = GoRouter(
      initialLocation: '/diagnostics',
      routes: [
        GoRoute(
          path: '/diagnostics',
          builder: (context, state) => const DiagnosticsScreen(),
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          syncQueueRepositoryProvider.overrideWithValue(queue),
          bootstrapSessionProvider.overrideWith(
            (ref) async => devBootstrapSession,
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();
    await tester.pump();
    await tester.pumpAndSettle();

    // Sensitive data must never appear anywhere in the widget tree
    expect(find.textContaining('secret-token'), findsNothing);
    expect(find.textContaining('private/receipt'), findsNothing);

    // Scroll until the error card is built (ListView is lazy)
    await tester.scrollUntilVisible(
      find.text('Falha segura ao sincronizar. Tente novamente.'),
      200.0,
    );
    await tester.pumpAndSettle();

    expect(
      find.text('Falha segura ao sincronizar. Tente novamente.'),
      findsOneWidget,
    );
  });
}
