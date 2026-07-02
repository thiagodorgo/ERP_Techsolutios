import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_conflict_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

SyncAction _conflict(String id, {String type = 'work_order.status_update'}) =>
    SyncAction(
      clientActionId: id,
      tenantId: 'tenant-demo',
      type: type,
      payload: const {'local_id': 'wo-x'},
      status: SyncStatus.conflict,
      createdAt: DateTime.utc(2026, 7, 1),
      retryCount: 2,
      lastErrorCode: 'CONFLICT',
      lastSafeError: 'Conflito detectado.',
    );

Widget _wrap(InMemorySyncActionStore store) {
  final router = GoRouter(
    initialLocation: '/sync',
    routes: [GoRoute(path: '/sync', builder: (_, _) => const SyncScreen())],
  );
  return ProviderScope(
    overrides: [
      syncActionStoreProvider.overrideWithValue(store),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
      bootstrapSessionProvider.overrideWith((_) async => devBootstrapSession),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

void main() {
  // ── Group 1: resolvedor puro ─────────────────────────────────────────────
  group('B-122 resolveConflictAction', () {
    test('1. keepMine volta para pending e limpa erros/retry', () {
      final resolved = resolveConflictAction(
        _conflict('a'),
        ConflictChoice.keepMine,
      );
      expect(resolved.status, SyncStatus.pending);
      expect(resolved.retryCount, 0);
      expect(resolved.lastErrorCode, isNull);
      expect(resolved.lastSafeError, isNull);
    });

    test('2. useServer marca como synced', () {
      final resolved = resolveConflictAction(
        _conflict('a'),
        ConflictChoice.useServer,
        resolvedAt: DateTime.utc(2026, 7, 2),
      );
      expect(resolved.status, SyncStatus.synced);
      expect(resolved.processedAt, DateTime.utc(2026, 7, 2));
      expect(resolved.lastErrorCode, isNull);
    });

    test('3. acao sem conflito e retornada inalterada', () {
      final pending = _conflict('a').copyWith(status: SyncStatus.pending);
      final resolved = resolveConflictAction(pending, ConflictChoice.keepMine);
      expect(identical(resolved, pending), isTrue);
    });
  });

  // ── Group 2: card de conflito na SyncScreen ──────────────────────────────
  group('B-122 SyncScreen conflito manual', () {
    testWidgets('4. exibe card de conflito com as duas opcoes', (t) async {
      final store = InMemorySyncActionStore([_conflict('c1')]);
      await t.pumpWidget(_wrap(store));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('conflict-card-c1')), findsOneWidget);
      expect(find.text('Minha versao'), findsOneWidget);
      expect(find.text('Versao do gestor'), findsOneWidget);
    });

    testWidgets('5. "Minha versao" resolve para pending e some o card', (
      t,
    ) async {
      final store = InMemorySyncActionStore([_conflict('c1')]);
      await t.pumpWidget(_wrap(store));
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('conflict-keep-mine-c1')));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('conflict-card-c1')), findsNothing);
      final actions = await store.load();
      expect(actions.first.status, SyncStatus.pending);
    });

    testWidgets('6. "Versao do gestor" resolve para synced', (t) async {
      final store = InMemorySyncActionStore([_conflict('c1')]);
      await t.pumpWidget(_wrap(store));
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('conflict-use-server-c1')));
      await t.pumpAndSettle();

      expect(find.byKey(const Key('conflict-card-c1')), findsNothing);
      final actions = await store.load();
      expect(actions.first.status, SyncStatus.synced);
    });
  });
}
