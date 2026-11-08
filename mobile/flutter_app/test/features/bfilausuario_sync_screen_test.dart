import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_user_scope.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-demo';

SyncAction _action({
  required String id,
  required String type,
  required SyncStatus status,
  String? userId,
  int retryCount = 0,
  String? errorCode,
  String? safeError,
  Map<String, Object?> payload = const {'local_id': 'x'},
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: _tenant,
    userId: userId,
    type: type,
    payload: payload,
    status: status,
    createdAt: DateTime.utc(2026, 11, 8, 12),
    retryCount: retryCount,
    lastErrorCode: errorCode,
    lastSafeError: safeError,
  );
}

Widget _wrap(InMemorySyncActionStore store, {String? userId = 'u2'}) {
  final router = GoRouter(
    initialLocation: '/sync',
    routes: [GoRoute(path: '/sync', builder: (_, _) => const SyncScreen())],
  );
  return ProviderScope(
    overrides: [
      syncActionStoreProvider.overrideWithValue(store),
      currentSyncUserIdProvider.overrideWithValue(userId),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
      bootstrapSessionProvider.overrideWith((_) async => devBootstrapSession),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Future<void> _pump(
  WidgetTester tester,
  InMemorySyncActionStore store, {
  String? userId = 'u2',
}) async {
  tester.view.physicalSize = const Size(1080, 4200);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(_wrap(store, userId: userId));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'RA4(1): sob sessão u2, apenas o conflito de u2 exibe conflict-card',
    (tester) async {
      final store = InMemorySyncActionStore([
        _action(
          id: 'c-u1',
          userId: 'u1',
          type: WorkOrderSyncActionTypes.statusUpdate,
          status: SyncStatus.conflict,
          errorCode: 'CONFLICT',
          safeError: 'Conflito privado de u1.',
        ),
        _action(
          id: 'c-u2',
          userId: 'u2',
          type: WorkOrderSyncActionTypes.statusUpdate,
          status: SyncStatus.conflict,
          errorCode: 'CONFLICT',
          safeError: 'Conflito da sessão u2.',
        ),
        _action(
          id: 'p-u1',
          userId: 'u1',
          type: ChecklistSyncActionTypes.runComplete,
          status: SyncStatus.pending,
        ),
        _action(
          id: 'leg-1',
          type: WorkOrderSyncActionTypes.statusUpdate,
          status: SyncStatus.failed,
          retryCount: 2,
        ),
      ]);

      await _pump(tester, store);

      expect(find.byKey(const Key('conflict-card-c-u2')), findsOneWidget);
      expect(find.byKey(const Key('conflict-card-c-u1')), findsNothing);
    },
  );

  testWidgets(
    'RA4(2): aviso de outro usuário mostra contagem exata e oculta tipo, erro e payload de u1',
    (tester) async {
      final store = InMemorySyncActionStore([
        _action(
          id: 'c-u1',
          userId: 'u1',
          type: ChecklistSyncActionTypes.runComplete,
          status: SyncStatus.conflict,
          errorCode: 'CONFLICT_U1',
          safeError: 'ERRO_PRIVADO_U1_NAO_EXIBIR',
          payload: const {'local_run_id': 'SEGREDO_PAYLOAD_U1'},
        ),
        _action(
          id: 'c-u2',
          userId: 'u2',
          type: WorkOrderSyncActionTypes.statusUpdate,
          status: SyncStatus.conflict,
          errorCode: 'CONFLICT',
          safeError: 'Conflito da própria sessão.',
        ),
        _action(
          id: 'p-u1',
          userId: 'u1',
          type: EvidenceSyncActionTypes.workOrderPhoto,
          status: SyncStatus.pending,
          payload: const {'work_order_id': 'OS_SECRETA_U1'},
        ),
        _action(
          id: 'leg-1',
          type: WorkOrderSyncActionTypes.statusUpdate,
          status: SyncStatus.failed,
          retryCount: 1,
        ),
      ]);

      await _pump(tester, store);

      expect(find.byKey(const Key('other-users-sync-notice')), findsOneWidget);
      expect(
        find.text(
          '2 ações de outro usuário neste aparelho aguardam o login dele.',
        ),
        findsOneWidget,
      );
      expect(find.textContaining('Conclusão do checklist'), findsNothing);
      expect(find.textContaining('checklist_run.complete'), findsNothing);
      expect(find.textContaining('Foto da OS'), findsNothing);
      expect(find.textContaining('evidence.work_order_photo'), findsNothing);
      expect(find.textContaining('ERRO_PRIVADO_U1_NAO_EXIBIR'), findsNothing);
      expect(find.textContaining('SEGREDO_PAYLOAD_U1'), findsNothing);
      expect(find.textContaining('OS_SECRETA_U1'), findsNothing);
    },
  );

  testWidgets(
    'RA4(3): legado de OS traz Assumir e Descartar; legado de despesa traz só Assumir e preserva status ao assumir',
    (tester) async {
      final legOs = _action(
        id: 'leg-os',
        type: WorkOrderSyncActionTypes.statusUpdate,
        status: SyncStatus.failed,
        retryCount: 2,
      );
      final legExp = _action(
        id: 'leg-exp',
        type: ExpenseSyncActionTypes.reportCreate,
        status: SyncStatus.failed,
        retryCount: 3,
      );
      final store = InMemorySyncActionStore([legOs, legExp]);

      // Regra fail-closed pura (D-DESPESA-SEM-DESCARTAR): despesa nunca é descartada.
      expect(discardLegacyAction(legExp), legExp);

      await _pump(tester, store);

      expect(find.byKey(const Key('legacy-sync-notice')), findsOneWidget);
      expect(
        find.text(
          'Lançamentos da versão anterior do app. Toque Assumir para que sejam enviados com o seu usuário quando o envio estiver ativo.',
        ),
        findsOneWidget,
      );
      expect(find.textContaining('automaticamente'), findsNothing);

      expect(find.byKey(const Key('legacy-card-leg-os')), findsOneWidget);
      expect(find.byKey(const Key('legacy-assume-leg-os')), findsOneWidget);
      expect(find.byKey(const Key('legacy-discard-leg-os')), findsOneWidget);

      expect(find.byKey(const Key('legacy-card-leg-exp')), findsOneWidget);
      expect(find.byKey(const Key('legacy-assume-leg-exp')), findsOneWidget);
      expect(find.byKey(const Key('legacy-discard-leg-exp')), findsNothing);

      await tester.tap(find.byKey(const Key('legacy-assume-leg-os')));
      await tester.pumpAndSettle();

      final saved = {for (final a in await store.load()) a.clientActionId: a};
      expect(saved['leg-os']!.userId, 'u2');
      expect(saved['leg-os']!.status, SyncStatus.failed);
      expect(saved['leg-os']!.retryCount, 2);
      expect(find.byKey(const Key('legacy-card-leg-os')), findsNothing);
    },
  );

  testWidgets(
    'RA4(3b): despesa legada com employee_id de u1 sob sessão u2 exibe aviso sem botões de ação (S-n7)',
    (tester) async {
      final legReportU1 = _action(
        id: 'leg-rep-u1',
        type: ExpenseSyncActionTypes.reportCreate,
        status: SyncStatus.pending,
        payload: const {'local_id': 'rep-local-u1', 'employee_id': 'u1'},
      );
      final legItemU1 = _action(
        id: 'leg-item-u1',
        type: ExpenseSyncActionTypes.itemCreate,
        status: SyncStatus.pending,
        payload: const {
          'local_id': 'item-local-u1',
          'report_local_id': 'rep-local-u1',
        },
      );
      final store = InMemorySyncActionStore([legReportU1, legItemU1]);

      await _pump(tester, store, userId: 'u2');

      expect(find.byKey(const Key('legacy-card-leg-rep-u1')), findsOneWidget);
      expect(find.byKey(const Key('legacy-assume-leg-rep-u1')), findsNothing);
      expect(find.byKey(const Key('legacy-discard-leg-rep-u1')), findsNothing);

      expect(find.byKey(const Key('legacy-card-leg-item-u1')), findsOneWidget);
      expect(find.byKey(const Key('legacy-assume-leg-item-u1')), findsNothing);
      expect(find.byKey(const Key('legacy-discard-leg-item-u1')), findsNothing);

      expect(
        find.textContaining(
          'Lançamento de outro usuário: só ele pode assumir.',
        ),
        findsNWidgets(2),
      );
      expect(
        assignActionToUser(
          legItemU1,
          'u2',
          allTenantActions: [legReportU1, legItemU1],
        ),
        legItemU1,
      );
    },
  );

  testWidgets(
    'RA4(4): Descartar legado de OS exige confirmação; Cancelar preserva e confirmar marca DISCARDED_BY_TECHNICIAN',
    (tester) async {
      final legOs = _action(
        id: 'leg-os',
        type: WorkOrderSyncActionTypes.statusUpdate,
        status: SyncStatus.failed,
        retryCount: 2,
      );
      final store = InMemorySyncActionStore([legOs]);

      await _pump(tester, store);

      await tester.tap(find.byKey(const Key('legacy-discard-leg-os')));
      await tester.pumpAndSettle();

      expect(find.text('Descartar este item?'), findsOneWidget);
      await tester.tap(find.byKey(const Key('stalled-discard-cancel-leg-os')));
      await tester.pumpAndSettle();

      var saved = {for (final a in await store.load()) a.clientActionId: a};
      expect(saved['leg-os']!.status, SyncStatus.failed);
      expect(saved['leg-os']!.userId, isNull);
      expect(find.byKey(const Key('legacy-card-leg-os')), findsOneWidget);

      await tester.tap(find.byKey(const Key('legacy-discard-leg-os')));
      await tester.pumpAndSettle();

      expect(find.text('Descartar este item?'), findsOneWidget);
      await tester.tap(find.byKey(const Key('stalled-discard-confirm-leg-os')));
      await tester.pumpAndSettle();

      saved = {for (final a in await store.load()) a.clientActionId: a};
      expect(saved['leg-os']!.status, SyncStatus.synced);
      expect(saved['leg-os']!.lastErrorCode, syncDiscardedErrorCode);
      expect(saved['leg-os']!.lastSafeError, syncDiscardedSafeError);
      expect(find.byKey(const Key('legacy-card-leg-os')), findsNothing);
    },
  );
}
