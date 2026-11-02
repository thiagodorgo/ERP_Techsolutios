// B-O6R-11, emenda 4, fatia F-S1b': o Diagnóstico conta a fila pela mesma
// apresentação da tela de sincronização (`SyncPresentationCounts`).
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
  createdAt: DateTime.utc(2026, 11, 1, 12),
  retryCount: retry,
  lastErrorCode: code,
  lastSafeError: error,
);

Future<void> _pump(WidgetTester tester, {required bool channelOff}) async {
  final queue = InMemorySyncQueueRepository();
  await queue.enqueue(
    _a(
      'd-legada',
      'expense_report.create',
      SyncStatus.failed,
      retry: 5,
      code: 'NETWORK_ERROR',
      error: 'Falha de conexão. Tente novamente.',
    ),
  );
  await queue.enqueue(
    _a('d-syncing', 'expense_item.create', SyncStatus.syncing),
  );
  await queue.enqueue(
    _a(
      'os-2',
      'work_order.status_update',
      SyncStatus.failed,
      retry: 2,
      code: 'SERVER_ERROR',
      error: 'Ação sem resposta do servidor.',
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
        expenseSyncChannelOffProvider.overrideWithValue(channelOff),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  await tester.pump();
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('d1. Diagnóstico conta pela apresentação, com e sem canal', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 4000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await _pump(tester, channelOff: true);
    expect(find.textContaining('Pendentes: 2'), findsOneWidget);
    expect(find.textContaining('Erros: 1'), findsOneWidget);
    expect(find.textContaining('NETWORK_ERROR'), findsNothing);

    await tester.pumpWidget(const SizedBox());
    await _pump(tester, channelOff: false);
    expect(find.textContaining('Erros: 2'), findsOneWidget);
  });
}
