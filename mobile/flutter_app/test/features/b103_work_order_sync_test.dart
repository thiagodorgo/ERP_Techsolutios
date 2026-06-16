import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _FakeHttpAdapter implements HttpClientAdapter {
  _FakeHttpAdapter(this.handler);

  final Map<String, dynamic> Function(RequestOptions options) handler;
  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    final body = handler(options);
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _FakeWorkOrderApi implements WorkOrderSyncBatchApi {
  _FakeWorkOrderApi({this.results = const [], this.shouldThrow = false});

  final List<SyncActionResult> results;
  final bool shouldThrow;
  List<SyncAction>? captured;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    captured = actions;
    if (shouldThrow) throw const ApiNetworkError();
    return results;
  }
}

class _NullQueue implements SyncQueueRepository {
  @override
  Future<void> enqueue(SyncAction action) async {}
  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async => const [];
  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async => const [];
  @override
  Future<void> update(SyncAction action) async {}
}

class _NoopExpenseReplay extends SyncReplayService {
  _NoopExpenseReplay()
    : super(queue: _NullQueue(), api: MockExpenseSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopChecklistReplay extends ChecklistSyncReplayService {
  _NoopChecklistReplay()
    : super(queue: _NullQueue(), api: MockChecklistSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopEvidenceReplay extends EvidenceSyncReplayService {
  _NoopEvidenceReplay()
    : super(queue: _NullQueue(), api: const PendingEvidenceSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _CountingWorkOrderReplay extends WorkOrderSyncReplayService {
  _CountingWorkOrderReplay()
    : super(queue: _NullQueue(), api: MockWorkOrderSyncBatchApi());

  int callCount = 0;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    callCount++;
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

const _tenantId = 'tenant-b103';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenantId, displayName: 'Tenant B103'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:status'}),
);

SyncAction _action({
  required String id,
  String type = WorkOrderSyncActionTypes.statusUpdate,
  Map<String, Object?>? payload,
  SyncStatus status = SyncStatus.pending,
  int retryCount = 0,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: _tenantId,
    type: type,
    payload:
        payload ??
        const {
          'local_id': 'wo-local-123',
          'server_id': 'srv-wo-123',
          'new_status': 'assigned',
          'previous_status': 'scheduled',
          'occurred_at': '2026-06-16T12:00:00.000Z',
          'message': 'Mobile accepted dispatch.',
        },
    status: status,
    createdAt: DateTime.utc(2026, 6, 16, 12),
    retryCount: retryCount,
  );
}

SyncActionResult _result(
  String id, {
  String status = 'processed',
  String? errorCode,
  String? resultRef,
}) {
  return SyncActionResult(
    clientActionId: id,
    status: status,
    errorCode: errorCode,
    resultRef: resultRef,
  );
}

Map<String, Object?> _encodedSingle(SyncAction action) {
  final request = const WorkOrderSyncCodec(
    batchIdFactory: _fixedBatchId,
  ).encodeRequest([action]);
  final actions = request['actions'] as List<Object?>;
  return Map<String, Object?>.from(actions.single as Map);
}

WorkOrderSyncReplayService _b103ReplayService(
  InMemorySyncQueueRepository queue,
  WorkOrderSyncBatchApi api, {
  int maxRetry = 5,
}) {
  return WorkOrderSyncReplayService(queue: queue, api: api, maxRetry: maxRetry);
}

WorkOrder _workOrder({
  String localId = 'wo-local-repo',
  String? serverId = 'srv-wo-repo',
  WorkOrderStatus status = WorkOrderStatus.scheduled,
}) {
  return WorkOrder(
    localId: localId,
    serverId: serverId,
    tenantId: _tenantId,
    code: 'OS-B103',
    title: 'B103 test work order',
    customerName: 'Customer',
    serviceAddress: 'Address',
    status: status,
    priority: WorkOrderPriority.normal,
    syncStatus: SyncStatus.synced,
    createdAt: DateTime.utc(2026, 6, 16),
  );
}

void main() {
  group('B-103 work order sync codec', () {
    test('statusUpdate vira work_order.status_change', () {
      final encoded = _encodedSingle(_action(id: 'wo-1'));
      expect(encoded['type'], 'work_order.status_change');
    });

    test('request usa client_batch_id e campos snake_case por action', () {
      final request = const WorkOrderSyncCodec(
        batchIdFactory: _fixedBatchId,
      ).encodeRequest([_action(id: 'wo-2')]);
      final encoded = Map<String, Object?>.from(
        (request['actions'] as List).single as Map,
      );

      expect(request['client_batch_id'], 'wo-batch-fixed');
      expect(encoded['client_action_id'], 'wo-2');
      expect(encoded['local_created_at'], '2026-06-16T12:00:00.000Z');
    });

    test('server_id vira work_order_id e local_id fica apenas em metadata', () {
      final encoded = _encodedSingle(_action(id: 'wo-3'));
      final payload = Map<String, Object?>.from(encoded['payload'] as Map);
      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);

      expect(payload['work_order_id'], 'srv-wo-123');
      expect(payload['work_order_id'], isNot('wo-local-123'));
      expect(metadata['local_id'], 'wo-local-123');
      expect(metadata['source'], 'mobile_offline');
    });

    test('work_order_id local nao vira work_order_id de backend', () {
      final encoded = _encodedSingle(
        _action(
          id: 'wo-local-id',
          payload: const {
            'local_id': 'wo-local-123',
            'work_order_id': 'wo-local-123',
            'new_status': 'assigned',
          },
        ),
      );
      final payload = Map<String, Object?>.from(encoded['payload'] as Map);

      expect(payload.containsKey('work_order_id'), isFalse);
    });

    test('status assigned e serializado sem alteracao', () {
      final encoded = _encodedSingle(_action(id: 'wo-4'));
      final payload = Map<String, Object?>.from(encoded['payload'] as Map);
      expect(payload['status'], 'assigned');
      expect(payload['message'], 'Mobile accepted dispatch.');
    });

    test('status inService vira in_progress para o backend', () {
      final encoded = _encodedSingle(
        _action(
          id: 'wo-5',
          payload: const {
            'local_id': 'wo-local-123',
            'server_id': 'srv-wo-123',
            'new_status': 'inService',
            'previous_status': 'arrived',
            'occurred_at': '2026-06-16T12:10:00.000Z',
          },
        ),
      );
      final payload = Map<String, Object?>.from(encoded['payload'] as Map);
      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);

      expect(payload['status'], 'in_progress');
      expect(metadata['previous_status'], 'on_site');
    });

    test('status completed e serializado corretamente', () {
      final encoded = _encodedSingle(
        _action(
          id: 'wo-6',
          payload: const {
            'local_id': 'wo-local-123',
            'server_id': 'srv-wo-123',
            'new_status': 'completed',
            'previous_status': 'inService',
            'occurred_at': '2026-06-16T12:20:00.000Z',
            'message': 'Mobile completed work order.',
          },
        ),
      );
      final payload = Map<String, Object?>.from(encoded['payload'] as Map);
      expect(payload['status'], 'completed');
      expect(payload['message'], 'Mobile completed work order.');
    });

    test('payload nao contem tenant, token, path, base64 ou binario', () {
      final encoded = _encodedSingle(
        _action(
          id: 'wo-7',
          payload: const {
            'local_id': 'wo-local-123',
            'server_id': 'srv-wo-123',
            'new_status': 'assigned',
            'previous_status': 'scheduled',
            'occurred_at': '2026-06-16T12:00:00.000Z',
            'tenant_id': 'spoof',
            'tenantId': 'spoof',
            'token': 'secret',
            'accessToken': 'secret',
            'Authorization': 'Bearer secret',
            'path': r'C:\Users\private\photo.jpg',
            'local_path': '/private/photo.jpg',
            'base64': 'AAAA',
            'file_data': 'AAAA',
            'binary': 'AAAA',
          },
        ),
      );

      final serialized = jsonEncode(encoded['payload']).toLowerCase();
      for (final forbidden in [
        'tenant_id',
        'tenantid',
        'token',
        'authorization',
        'bearer',
        'path',
        'base64',
        'file_data',
        'binary',
      ]) {
        expect(serialized, isNot(contains(forbidden)));
      }
    });

    test('eligibility aceita server_id ou work_order_id real', () {
      expect(b103WorkOrderActionReadyForBackend(_action(id: 'server')), isTrue);
      expect(
        b103WorkOrderActionReadyForBackend(
          _action(
            id: 'real',
            payload: const {
              'local_id': 'wo-local-123',
              'work_order_id': 'srv-wo-real',
              'new_status': 'assigned',
            },
          ),
        ),
        isTrue,
      );
    });

    test('eligibility rejeita local-only e work_order_id local', () {
      expect(
        b103WorkOrderActionReadyForBackend(
          _action(
            id: 'local-only',
            payload: const {
              'local_id': 'wo-local-123',
              'new_status': 'assigned',
            },
          ),
        ),
        isFalse,
      );
      expect(
        b103WorkOrderActionReadyForBackend(
          _action(
            id: 'local-work-order-id',
            payload: const {
              'local_id': 'wo-local-123',
              'work_order_id': 'wo-local-123',
              'new_status': 'assigned',
            },
          ),
        ),
        isFalse,
      );
    });
  });

  group('B-103 work order response parser', () {
    test('data.accepted vira processed', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'data': {
          'accepted': [
            {
              'client_action_id': 'accepted-1',
              'server_state': {'id': 'srv-1'},
            },
          ],
        },
      });
      expect(results.single.status, 'processed');
      expect(results.single.resultRef, 'srv-1');
    });

    test('data.already_applied vira ignored', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'data': {
          'already_applied': [
            {'client_action_id': 'applied-1'},
          ],
        },
      });
      expect(results.single.status, 'ignored');
    });

    test('data.rejected vira failed com error.reason', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'data': {
          'rejected': [
            {
              'client_action_id': 'rejected-1',
              'error': {'reason': 'invalid_status'},
            },
          ],
        },
      });
      expect(results.single.status, 'failed');
      expect(results.single.errorCode, 'invalid_status');
    });

    test('data.conflicts vira conflict com conflict_type', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'data': {
          'conflicts': [
            {
              'client_action_id': 'conflict-1',
              'conflict': {'conflict_type': 'invalid_status_transition'},
            },
          ],
        },
      });
      expect(results.single.status, 'conflict');
      expect(results.single.errorCode, 'invalid_status_transition');
    });

    test('data.results legado funciona', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'data': {
          'results': [
            {
              'clientActionId': 'legacy-1',
              'status': 'processed',
              'resultRef': 'srv-legacy',
            },
          ],
        },
      });
      expect(results.single.clientActionId, 'legacy-1');
      expect(results.single.resultRef, 'srv-legacy');
    });

    test('body.results legado top-level funciona', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'results': [
          {
            'clientActionId': 'legacy-top-1',
            'status': 'rejected',
            'errorCode': 'VALIDATION',
          },
        ],
      });
      expect(results.single.status, 'failed');
      expect(results.single.errorCode, 'VALIDATION');
    });

    test('item sem client_action_id e ignorado', () {
      final results = const WorkOrderSyncCodec().decodeResponse({
        'data': {
          'accepted': [
            {'server_state': {}},
          ],
        },
      });
      expect(results, isEmpty);
    });
  });

  group('B-103 work order replay', () {
    test('accepted marca action como synced', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'accepted-1'));
      final result = await _b103ReplayService(
        queue,
        _FakeWorkOrderApi(results: [_result('accepted-1')]),
      ).replayTenant(_tenantId);

      expect(result.synced.single.status, SyncStatus.synced);
      expect(result.synced.single.processedAt, isNotNull);
    });

    test('already_applied marca action como synced', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'applied-1'));
      final result = await _b103ReplayService(
        queue,
        _FakeWorkOrderApi(results: [_result('applied-1', status: 'ignored')]),
      ).replayTenant(_tenantId);

      expect(result.synced.single.status, SyncStatus.synced);
    });

    test('rejected marca action como failed e incrementa retry', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'rejected-1'));
      final result = await _b103ReplayService(
        queue,
        _FakeWorkOrderApi(
          results: [
            _result('rejected-1', status: 'failed', errorCode: 'VALIDATION'),
          ],
        ),
      ).replayTenant(_tenantId);

      expect(result.failed.single.status, SyncStatus.failed);
      expect(result.failed.single.retryCount, 1);
      expect(result.failed.single.lastErrorCode, 'VALIDATION');
    });

    test('conflict marca action como conflict', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'conflict-1'));
      final result = await _b103ReplayService(
        queue,
        _FakeWorkOrderApi(results: [_result('conflict-1', status: 'conflict')]),
      ).replayTenant(_tenantId);

      expect(result.conflicts.single.status, SyncStatus.conflict);
      expect(result.conflicts.single.lastSafeError, contains('Conflito'));
    });

    test('network error marca failed retryable', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'network-1'));
      final result = await _b103ReplayService(
        queue,
        _FakeWorkOrderApi(shouldThrow: true),
      ).replayTenant(_tenantId);

      expect(result.failed.single.status, SyncStatus.failed);
      expect(result.failed.single.retryCount, 1);
      expect(result.failed.single.lastErrorCode, 'NETWORK_ERROR');
    });

    test('missing result vira failed com MISSING_RESULT', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'missing-1'));
      final result = await _b103ReplayService(
        queue,
        _FakeWorkOrderApi(results: [_result('other-id')]),
      ).replayTenant(_tenantId);

      expect(result.failed.single.lastErrorCode, 'MISSING_RESULT');
      expect(result.failed.single.retryCount, 1);
    });

    test('maxRetry e respeitado', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'max-retry', retryCount: 5));
      final api = _FakeWorkOrderApi();
      final result = await _b103ReplayService(
        queue,
        api,
        maxRetry: 5,
      ).replayTenant(_tenantId);

      expect(api.captured, isNull);
      expect(result.synced, isEmpty);
      expect(result.failed, isEmpty);
    });

    test('statusUpdate com server_id e enviada', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'ready-1'));
      final api = _FakeWorkOrderApi(results: [_result('ready-1')]);

      final result = await _b103ReplayService(
        queue,
        api,
      ).replayTenant(_tenantId);

      expect(api.captured?.single.clientActionId, 'ready-1');
      expect(result.synced.single.status, SyncStatus.synced);
    });

    test(
      'statusUpdate apenas com local_id nao e enviada e fica pending',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(
            id: 'local-only',
            payload: const {
              'local_id': 'wo-local-123',
              'new_status': 'assigned',
            },
          ),
        );
        final api = _FakeWorkOrderApi();

        final result = await _b103ReplayService(
          queue,
          api,
        ).replayTenant(_tenantId);
        final stored = (await queue.actionsForTenant(_tenantId)).single;

        expect(api.captured, isNull);
        expect(result.synced, isEmpty);
        expect(result.failed, isEmpty);
        expect(stored.status, SyncStatus.pending);
      },
    );

    test('create approval e evidence nao sao enviados no B-103', () async {
      final queue = InMemorySyncQueueRepository();
      for (final type in [
        WorkOrderSyncActionTypes.create,
        WorkOrderSyncActionTypes.approvalRequest,
        WorkOrderSyncActionTypes.evidenceAttach,
      ]) {
        await queue.enqueue(_action(id: 'unsupported-$type', type: type));
      }
      final api = _FakeWorkOrderApi();

      final result = await _b103ReplayService(
        queue,
        api,
      ).replayTenant(_tenantId);
      final stored = await queue.actionsForTenant(_tenantId);

      expect(api.captured, isNull);
      expect(result.synced, isEmpty);
      expect(
        stored.every((action) => action.status == SyncStatus.pending),
        isTrue,
      );
    });

    test('actions em conflict nao sao reenviadas', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'manual-conflict', status: SyncStatus.conflict),
      );
      final api = _FakeWorkOrderApi();

      final result = await _b103ReplayService(
        queue,
        api,
      ).replayTenant(_tenantId);

      expect(api.captured, isNull);
      expect(result.conflicts, isEmpty);
    });

    test('WorkOrder sync nao captura checklist evidence ou expense', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'expense', type: ExpenseSyncActionTypes.reportCreate),
      );
      await queue.enqueue(
        _action(id: 'checklist', type: ChecklistSyncActionTypes.answerUpsert),
      );
      await queue.enqueue(
        _action(id: 'evidence', type: EvidenceSyncActionTypes.workOrderPhoto),
      );
      final api = _FakeWorkOrderApi();

      final result = await _b103ReplayService(
        queue,
        api,
      ).replayTenant(_tenantId);

      expect(api.captured, isNull);
      expect(result.synced, isEmpty);
    });
  });

  group('B-103 provider e Dio', () {
    test('sem access token retorna PendingBackendWorkOrderSyncBatchApi', () {
      final container = ProviderContainer(
        overrides: [
          authenticatedApiConfigProvider.overrideWithValue(const ApiConfig()),
        ],
      );
      addTearDown(container.dispose);

      expect(
        container.read(workOrderSyncBatchApiProvider),
        isA<PendingBackendWorkOrderSyncBatchApi>(),
      );
    });

    test('com access token retorna DioWorkOrderSyncBatchApi', () {
      final container = ProviderContainer(
        overrides: [
          authenticatedApiConfigProvider.overrideWithValue(
            const ApiConfig(accessToken: 'access-token-test'),
          ),
        ],
      );
      addTearDown(container.dispose);

      expect(
        container.read(workOrderSyncBatchApiProvider),
        isA<DioWorkOrderSyncBatchApi>(),
      );
    });

    test('Dio envia endpoint real e token fica so no header', () async {
      final adapter = _FakeHttpAdapter((options) {
        expect(options.path, WorkOrderApiEndpoints.mobileWorkOrderSync);
        expect(options.headers['Authorization'], 'Bearer access-token-test');
        final serialized = jsonEncode(options.data).toLowerCase();
        expect(serialized, contains('client_batch_id'));
        expect(serialized, contains('client_action_id'));
        expect(serialized, isNot(contains('access-token-test')));
        expect(serialized, isNot(contains('tenantid')));
        expect(serialized, isNot(contains('tenant_id')));
        return {
          'data': {
            'accepted': [
              {'client_action_id': 'dio-1'},
            ],
          },
        };
      });
      final dio = Dio(
        BaseOptions(
          baseUrl: 'https://test.local',
          headers: {'Authorization': 'Bearer access-token-test'},
        ),
      )..httpClientAdapter = adapter;

      final results = await DioWorkOrderSyncBatchApi(
        dio,
      ).sendBatch([_action(id: 'dio-1')]);

      expect(results.single.status, 'processed');
      expect(adapter.captured, hasLength(1));
    });
  });

  group('B-103 repository', () {
    test('updateStatus enfileira server_id e mantem OS pending', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _workOrder(status: WorkOrderStatus.scheduled),
      ]);
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: store,
      );
      await repo.load(seedIfEmpty: false);

      final result = await repo.updateStatus(
        'wo-local-repo',
        WorkOrderStatus.dispatched,
      );
      final actions = await queue.pendingForTenant(_tenantId);

      expect(result.workOrder.syncStatus, SyncStatus.pending);
      expect(actions.single.payload['server_id'], 'srv-wo-repo');
      expect(actions.single.payload['message'], 'Mobile accepted dispatch.');
    });

    test(
      'completeWorkOrder enfileira server_id e mensagem de conclusao',
      () async {
        final queue = InMemorySyncQueueRepository();
        final store = InMemoryWorkOrderLocalStore([
          _workOrder(status: WorkOrderStatus.inService),
        ]);
        final repo = WorkOrderRepository(
          session: _session,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: store,
        );
        await repo.load(seedIfEmpty: false);

        await repo.completeWorkOrder('wo-local-repo', checklistComplete: true);
        final actions = await queue.pendingForTenant(_tenantId);

        expect(actions.single.payload['server_id'], 'srv-wo-repo');
        expect(actions.single.payload['new_status'], 'completed');
        expect(
          actions.single.payload['message'],
          'Mobile completed work order.',
        );
      },
    );

    test('timeline local e preservada apos updateStatus', () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _workOrder(status: WorkOrderStatus.dispatched),
      ]);
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: store,
      );
      await repo.load(seedIfEmpty: false);

      await repo.updateStatus('wo-local-repo', WorkOrderStatus.enRoute);
      final timeline = await repo.loadTimeline('wo-local-repo');

      expect(timeline, hasLength(1));
      expect(
        timeline.single.eventType,
        WorkOrderTimelineEventType.statusChanged,
      );
    });
  });

  group('B-103 cross-domain e autosync', () {
    test('Expense sync nao captura action de OS', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'wo-ready'));
      await queue.enqueue(
        SyncAction(
          clientActionId: 'expense-ready',
          tenantId: _tenantId,
          type: ExpenseSyncActionTypes.reportCreate,
          payload: const {'local_id': 'expense-local-1'},
          status: SyncStatus.pending,
          createdAt: DateTime.utc(2026, 6, 16),
        ),
      );
      final api = CaptureBatchApi((batch) {
        return [for (final action in batch) _result(action.clientActionId)];
      });

      await SyncReplayService(
        queue: queue,
        api: api,
        supportedActionTypes: ExpenseSyncActionTypes.supported,
      ).replayTenant(_tenantId);

      expect(api.captured, hasLength(1));
      expect(api.captured!.single.type, ExpenseSyncActionTypes.reportCreate);
    });

    test('AutoSyncCoordinator chama WorkOrder sync', () async {
      final counting = _CountingWorkOrderReplay();
      final container = ProviderContainer(
        overrides: [
          bootstrapSessionProvider.overrideWith((ref) async => _session),
          networkStatusProvider.overrideWith(() => NetworkStatusNotifier()),
          workOrderSyncReplayServiceProvider.overrideWithValue(counting),
          checklistSyncReplayServiceProvider.overrideWithValue(
            _NoopChecklistReplay(),
          ),
          evidenceSyncReplayServiceProvider.overrideWithValue(
            _NoopEvidenceReplay(),
          ),
          syncReplayServiceProvider.overrideWithValue(_NoopExpenseReplay()),
        ],
      );
      addTearDown(container.dispose);

      await container.read(bootstrapSessionProvider.future);
      container.read(autoSyncCoordinatorProvider);
      await container
          .read(autoSyncCoordinatorProvider.notifier)
          .triggerManual();

      expect(counting.callCount, 1);
    });
  });
}

String _fixedBatchId() => 'wo-batch-fixed';
