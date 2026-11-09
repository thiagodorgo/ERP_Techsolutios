import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_conflict_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_resolution_side_effects.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_sync_entity_updater.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RB2 · sessão e indisponibilidade sem custo', () {
    test('Pending não marca syncing nem consome tentativa', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'r1'));

      final svc = SyncReplayService(
        queue: queue,
        api: const PendingBackendExpenseSyncBatchApi(),
        supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
      );
      final result = await svc.replayTenant('tenant-demo');

      expect(result.synced, isEmpty);
      final stored = await queue.actionsForTenant('tenant-demo');
      expect(stored.single.status, SyncStatus.pending);
      expect(stored.single.retryCount, 0);
    });

    test('Sessionless (sem token) nada muda', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'r1'));

      final svc = SyncReplayService(
        queue: queue,
        api: const SessionlessExpenseSyncBatchApi(),
        supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
      );
      await svc.replayTenant('tenant-demo');

      final stored = await queue.actionsForTenant('tenant-demo');
      expect(stored.single.status, SyncStatus.pending);
      expect(stored.single.retryCount, 0);
    });

    test('ApiServerError(503) volta a pending com SYNC_BUSY', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'r1'));
      final api = CaptureBatchApi(
        (_) => throw const ApiServerError(statusCode: 503),
      );
      final svc = _service(queue, api);

      await svc.replayTenant('tenant-demo');

      final stored = await queue.actionsForTenant('tenant-demo');
      expect(stored.single.status, SyncStatus.pending);
      expect(stored.single.retryCount, 0);
      expect(stored.single.lastErrorCode, 'SYNC_BUSY');
    });

    test('ApiUnauthorizedError vira conflict SESSION_FORBIDDEN', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'r1'));
      final api = CaptureBatchApi((_) => throw const ApiUnauthorizedError());
      final svc = _service(queue, api);

      final result = await svc.replayTenant('tenant-demo');

      expect(result.conflicts, hasLength(1));
      final stored = await queue.actionsForTenant('tenant-demo');
      expect(stored.single.status, SyncStatus.conflict);
      expect(stored.single.lastErrorCode, 'SESSION_FORBIDDEN');
      expect(stored.single.lastSafeError, contains('permissão'));
    });

    test('ApiNetworkError vira failed e consome uma tentativa', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'r1', retryCount: 1));
      final api = CaptureBatchApi((_) => throw const ApiNetworkError());
      final svc = _service(queue, api);

      final result = await svc.replayTenant('tenant-demo');

      expect(result.failed, hasLength(1));
      final stored = await queue.actionsForTenant('tenant-demo');
      expect(stored.single.status, SyncStatus.failed);
      expect(stored.single.retryCount, 2);
    });
  });

  group('RB3 · payload e prontidão', () {
    test(
      'item.create sem report_id fica pending e não marca syncing',
      () async {
        final queue = InMemorySyncQueueRepository();
        final repo = _buildRepo(queue);
        await queue.enqueue(
          _action(
            id: 'i1',
            type: ExpenseSyncActionTypes.itemCreate,
            payload: {
              'report_local_id': 'PC-local-1',
              'category_key': 'fuel',
              'spent_at': '2026-06-11T00:00:00.000Z',
              'amount': 25,
            },
          ),
        );
        final api = CaptureBatchApi((_) => const []);
        final svc = _service(queue, api, repo);

        final result = await svc.replayTenant('tenant-demo');

        expect(api.captured, isNull);
        expect(result.synced, isEmpty);
        final stored = await queue.actionsForTenant('tenant-demo');
        expect(stored.single.status, SyncStatus.pending);
      },
    );

    test(
      'item.create legado sem category_key vira conflict e não vai no lote',
      () async {
        final queue = InMemorySyncQueueRepository();
        final repo = _buildRepo(queue);
        await queue.enqueue(
          _action(
            id: 'i1',
            type: ExpenseSyncActionTypes.itemCreate,
            payload: {'report_local_id': 'PC-local-1', 'amount': 25},
          ),
        );
        final api = CaptureBatchApi((_) => const []);
        final svc = _service(queue, api, repo);

        final result = await svc.replayTenant('tenant-demo');

        expect(api.captured, isNull);
        expect(result.conflicts, hasLength(1));
        final stored = await queue.actionsForTenant('tenant-demo');
        expect(stored.single.status, SyncStatus.conflict);
        expect(stored.single.lastSafeError, contains('incompleto'));
      },
    );

    test(
      'report.create processed grava serverId e a passada dupla envia item e submit',
      () async {
        final queue = InMemorySyncQueueRepository();
        final repo = _buildRepo(queue);
        final created = await repo.createReport(
          title: 'Prestação de Contas',
          advanceAmount: 0,
        );

        await queue.enqueue(
          _action(
            id: 'i1',
            type: ExpenseSyncActionTypes.itemCreate,
            payload: {
              'report_local_id': created.report.localId,
              'category_key': 'fuel',
              'spent_at': '2026-06-11T00:00:00.000Z',
              'amount': 25,
            },
          ),
        );
        await queue.enqueue(
          _action(
            id: 's1',
            type: ExpenseSyncActionTypes.reportSubmit,
            payload: {
              'report_local_id': created.report.localId,
              'policy_version': 'v1',
              'submitted_at': '2026-06-11T00:00:00.000Z',
            },
          ),
        );

        final sentBatches = <SyncAction>[];
        final api = CaptureBatchApi((batch) {
          sentBatches.addAll(batch);
          final action = batch.single;
          return [
            SyncActionResult(
              clientActionId: action.clientActionId,
              status: 'processed',
              resultRef: action.type == ExpenseSyncActionTypes.reportCreate
                  ? 'server-report-1'
                  : action.type == ExpenseSyncActionTypes.itemCreate
                  ? 'server-item-1'
                  : null,
            ),
          ];
        });
        final svc = _service(queue, api, repo);

        final result = await svc.replayTenant('tenant-demo');

        expect(
          repo.serverIdForReport(created.report.localId),
          'server-report-1',
        );
        final syncedTypes = result.synced.map((a) => a.type).toList();
        expect(
          syncedTypes,
          containsAll([
            ExpenseSyncActionTypes.reportCreate,
            ExpenseSyncActionTypes.itemCreate,
          ]),
        );
        expect(
          syncedTypes,
          isNot(contains(ExpenseSyncActionTypes.reportSubmit)),
        );

        final sentItem = sentBatches.firstWhere(
          (a) => a.type == ExpenseSyncActionTypes.itemCreate,
        );
        expect(sentItem.payload['report_id'], 'server-report-1');
        expect(sentItem.payload['category_key'], 'fuel');
        expect(sentItem.payload['spent_at'], isNotNull);
        expect(sentItem.payload['amount'], 25);

        final queued = await queue.actionsForTenant('tenant-demo');
        final submit = queued.firstWhere(
          (a) => a.type == ExpenseSyncActionTypes.reportSubmit,
        );
        expect(submit.status, SyncStatus.pending);
        expect(submit.payload['report_id'], 'server-report-1');

        final third = await svc.replayTenant('tenant-demo');
        expect(
          third.synced.map((a) => a.type),
          contains(ExpenseSyncActionTypes.reportSubmit),
        );
        final sentSubmit = sentBatches.firstWhere(
          (a) => a.type == ExpenseSyncActionTypes.reportSubmit,
        );
        expect(sentSubmit.payload['report_id'], 'server-report-1');
      },
    );

    test(
      'Versão do gestor num report.create cascateia item e submit',
      () async {
        final queue = InMemorySyncQueueRepository();
        final report = _action(
          id: 'r1',
          status: SyncStatus.conflict,
          payload: {'local_id': 'PC-local-1'},
        );
        await queue.enqueue(report);
        await queue.enqueue(
          _action(
            id: 'i1',
            type: ExpenseSyncActionTypes.itemCreate,
            payload: {
              'report_local_id': 'PC-local-1',
              'category_key': 'fuel',
              'spent_at': '2026-06-11T00:00:00.000Z',
              'amount': 25,
            },
          ),
        );
        await queue.enqueue(
          _action(
            id: 's1',
            type: ExpenseSyncActionTypes.reportSubmit,
            payload: {'report_local_id': 'PC-local-1'},
          ),
        );

        final resolved = resolveConflictAction(
          report,
          ConflictChoice.useServer,
          resolvedAt: DateTime.utc(2026, 6, 12),
        );
        await SyncResolutionSideEffects(queue).apply(report, resolved);

        final stored = await queue.actionsForTenant('tenant-demo');
        final item = stored.firstWhere(
          (a) => a.type == ExpenseSyncActionTypes.itemCreate,
        );
        final submit = stored.firstWhere(
          (a) => a.type == ExpenseSyncActionTypes.reportSubmit,
        );
        expect(item.status, SyncStatus.synced);
        expect(item.lastErrorCode, 'SUPERSEDED_BY_SERVER');
        expect(item.lastSafeError, contains('gestor'));
        expect(submit.status, SyncStatus.synced);
        expect(submit.lastErrorCode, 'SUPERSEDED_BY_SERVER');
      },
    );

    test('submit espera o item sair da fila', () async {
      final queue = InMemorySyncQueueRepository();
      final repo = _buildRepo(queue);
      await queue.enqueue(
        _action(
          id: 's1',
          type: ExpenseSyncActionTypes.reportSubmit,
          payload: {'report_local_id': 'PC-local-1'},
        ),
      );
      await queue.enqueue(
        _action(
          id: 'i1',
          type: ExpenseSyncActionTypes.itemCreate,
          payload: {
            'report_local_id': 'PC-local-1',
            'category_key': 'fuel',
            'spent_at': '2026-06-11T00:00:00.000Z',
            'amount': 25,
          },
        ),
      );

      final api = CaptureBatchApi((_) => const []);
      final svc = _service(queue, api, repo);

      final result = await svc.replayTenant('tenant-demo');

      expect(api.captured, isNull);
      expect(result.synced, isEmpty);
      final stored = await queue.actionsForTenant('tenant-demo');
      final submit = stored.firstWhere(
        (a) => a.type == ExpenseSyncActionTypes.reportSubmit,
      );
      expect(submit.status, SyncStatus.pending);
    });
  });

  group('RB5 · conflito por código e sem laço', () {
    test('códigos de conflito ganham texto PT-BR por código', () async {
      final cases = {
        'action_owned_by_other_actor': 'outro usuário',
        'payload_mismatch': 'outro conteúdo',
        'receipt_unverifiable': 'manualmente',
      };

      for (final entry in cases.entries) {
        final queue = InMemorySyncQueueRepository();
        final repo = _buildRepo(queue);
        await queue.enqueue(_action(id: 'c-', payload: {'local_id': 'c-'}));
        final api = CaptureBatchApi(
          (batch) => [
            SyncActionResult(
              clientActionId: batch.single.clientActionId,
              status: 'conflict',
              errorCode: entry.key,
            ),
          ],
        );
        final svc = _service(queue, api, repo);

        final result = await svc.replayTenant('tenant-demo');

        final action = result.conflicts.single;
        expect(action.lastErrorCode, entry.key);
        expect(action.lastSafeError, contains(entry.value));
      }
    });

    test('ação em conflict não entra na passada seguinte', () async {
      final queue = InMemorySyncQueueRepository();
      final repo = _buildRepo(queue);
      await queue.enqueue(_action(id: 'r1', payload: {'local_id': 'r1'}));
      var calls = 0;
      final api = CaptureBatchApi((batch) {
        calls += 1;
        return [
          SyncActionResult(
            clientActionId: batch.single.clientActionId,
            status: 'conflict',
            errorCode: 'payload_mismatch',
          ),
        ];
      });
      final svc = _service(queue, api, repo);

      await svc.replayTenant('tenant-demo');
      final callsAfterFirst = calls;

      await svc.replayTenant('tenant-demo');
      expect(calls, callsAfterFirst);
    });
  });
}

SyncAction _action({
  required String id,
  SyncStatus status = SyncStatus.pending,
  int retryCount = 0,
  String type = ExpenseSyncActionTypes.reportCreate,
  Map<String, Object?>? payload,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-demo',
    type: type,
    payload: payload ?? {'local_id': id},
    status: status,
    createdAt: DateTime.utc(2026, 6, 11),
    retryCount: retryCount,
  );
}

LocalExpenseRepository _buildRepo(SyncQueueRepository queue) {
  return LocalExpenseRepository(
    session: _session(),
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryExpenseLocalStore(),
  );
}

SyncReplayService _service(
  SyncQueueRepository queue,
  ExpenseSyncBatchApi api, [
  LocalExpenseRepository? repo,
]) {
  final repository = repo ?? _buildRepo(queue);
  return SyncReplayService(
    queue: queue,
    api: api,
    supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
    entityUpdater: buildExpenseSyncEntityUpdater(repository),
    serverIdForReport: repository.serverIdForReport,
  );
}

BootstrapSession _session() {
  return const BootstrapSession(
    activeTenant: TenantContext(
      tenantId: 'tenant-demo',
      displayName: 'Tenant Demo',
    ),
    user: AuthenticatedUser(
      userId: 'employee-1',
      email: 'tecnico@demo.com',
      tenantRole: 'field_technician',
      tenantRoles: ['field_technician'],
      scope: 'tenant',
    ),
    enabledModules: [],
    permissions: PermissionSet({
      'expense_report:create',
      'expense_report:read',
      'expense_report:update',
      'expense_report:submit',
    }),
    expensePolicy: ExpensePolicySnapshot(
      version: 'v1',
      categoryLimits: {'fuel': 150, 'meal': 80},
      receiptRequiredCategories: {'fuel'},
    ),
  );
}
