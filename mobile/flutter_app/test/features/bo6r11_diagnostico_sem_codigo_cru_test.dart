// B-O6R-11, conserto pós-junta do PR #483 (achado A-01): no Diagnóstico, o
// item Descartado não vira cartão de problema, e os códigos deste bloco
// (`SYNC_INTERRUPTED`, `DISCARDED_BY_TECHNICIAN`) nunca aparecem crus como
// título. O título cru dos demais códigos é anterior ao bloco e fica.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/diagnostics/diagnostics_screen.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_interrupted_reclaim.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

SyncAction _a(
  String id,
  String type,
  SyncStatus status, {
  int retry = 0,
  String? code,
  String? error,
}) => SyncAction(
  clientActionId: id,
  tenantId: 'tenant-demo',
  type: type,
  payload: const {'local_id': 'x'},
  status: status,
  createdAt: DateTime.utc(2026, 11, 2, 12),
  retryCount: retry,
  lastErrorCode: code,
  lastSafeError: error,
);

Future<void> _pump(WidgetTester tester, List<SyncAction> seed) async {
  tester.view.physicalSize = const Size(1080, 4000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final queue = InMemorySyncQueueRepository();
  for (final action in seed) {
    await queue.enqueue(action);
  }

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
        expenseSyncChannelOffProvider.overrideWithValue(true),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  await tester.pump();
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('d2. item Descartado não aparece como cartão de problema', (
    tester,
  ) async {
    await _pump(tester, [
      _a(
        'os-descartada',
        'work_order.status_update',
        SyncStatus.synced,
        retry: 5,
        code: syncDiscardedErrorCode,
        error: syncDiscardedSafeError,
      ),
    ]);

    expect(find.byIcon(Icons.report_problem_outlined), findsNothing);
    expect(find.text(syncDiscardedErrorCode), findsNothing);
    expect(find.textContaining(syncDiscardedErrorCode), findsNothing);
    expect(find.text(syncDiscardedSafeError), findsNothing);
  });

  testWidgets('d3. envio interrompido mostra o rótulo da ação, nunca o '
      'código cru', (tester) async {
    await _pump(tester, [
      _a(
        'os-interrompida',
        'work_order.status_update',
        SyncStatus.conflict,
        code: syncInterruptedErrorCode,
        error: syncInterruptedManualSafeError,
      ),
    ]);

    expect(find.byIcon(Icons.report_problem_outlined), findsOneWidget);
    expect(find.textContaining(syncInterruptedErrorCode), findsNothing);
    expect(find.text('Atualização de status da OS'), findsOneWidget);
    expect(find.text(syncInterruptedManualSafeError), findsOneWidget);
  });

  testWidgets('d4. código anterior ao bloco segue como título (fora do '
      'conserto)', (tester) async {
    await _pump(tester, [
      _a(
        'os-falha',
        'work_order.status_update',
        SyncStatus.failed,
        retry: 2,
        code: 'SERVER_ERROR',
        error: 'Ação sem resposta do servidor.',
      ),
    ]);

    expect(find.byIcon(Icons.report_problem_outlined), findsOneWidget);
    expect(find.text('SERVER_ERROR'), findsOneWidget);
  });
}
