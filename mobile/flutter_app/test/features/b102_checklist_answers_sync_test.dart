import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
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

class _FakeChecklistApi implements ChecklistSyncBatchApi {
  _FakeChecklistApi({this.results = const [], this.shouldThrow = false});

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

SyncAction _action({
  required String id,
  required String type,
  Map<String, Object?>? payload,
  int retryCount = 0,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-should-not-be-sent',
    type: type,
    payload:
        payload ??
        const {
          'local_run_id': 'clrun-local-123',
          'server_run_id': 'srv-run-123',
          'field_id': 'field-condition',
          'answered_at': '2026-06-16T12:00:00.000Z',
          'text_value': 'Veiculo sem danos.',
        },
    status: SyncStatus.pending,
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
  final request = const ChecklistSyncCodec(
    batchIdFactory: _fixedBatchId,
  ).encodeRequest([action]);
  final actions = request['actions'] as List<Object?>;
  return Map<String, Object?>.from(actions.single as Map);
}

void main() {
  group('B-102 checklist serializer', () {
    test('answerUpsert texto vira checklist.item_answer', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-text',
          type: ChecklistSyncActionTypes.answerUpsert,
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);

      expect(action['client_action_id'], 'cl-answer-text');
      expect(action['type'], 'checklist.item_answer');
      expect(action['local_created_at'], '2026-06-16T12:00:00.000Z');
      expect(payload['run_id'], 'srv-run-123');
      expect(payload['component_id'], 'field-condition');
      expect(payload['value'], 'Veiculo sem danos.');
      expect(metadata['source'], 'mobile_offline');
      expect(metadata['answered_at'], '2026-06-16T12:00:00.000Z');
      expect(metadata['local_run_id'], 'clrun-local-123');
    });

    test('answerUpsert bool vira checklist.item_answer', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-bool',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'field_id': 'field-grounding',
            'bool_value': true,
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      expect(action['type'], 'checklist.item_answer');
      expect(payload['value'], isTrue);
    });

    test('answerUpsert number vira checklist.item_answer', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-number',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'field_id': 'field-voltage',
            'number_value': 220,
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      expect(action['type'], 'checklist.item_answer');
      expect(payload['value'], 220);
    });

    test('answerUpsert choice vira checklist.item_answer', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-choice',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'field_id': 'field-condition',
            'choice_value': 'good',
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      expect(action['type'], 'checklist.item_answer');
      expect(payload['value'], 'good');
    });

    test('answerUpsert multi choice vira checklist.item_answer', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-multi',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'field_id': 'field-checks',
            'multi_choice_values': ['power', 'network'],
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      expect(action['type'], 'checklist.item_answer');
      expect(payload['value'], ['power', 'network']);
    });

    test('observation_text sem valor vira checklist.item_note', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-note',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'field_id': 'field-condition',
            'answered_at': '2026-06-16T12:00:00.000Z',
            'observation_text': 'Motorista confirmou condicao.',
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      expect(action['type'], 'checklist.item_note');
      expect(payload['note'], 'Motorista confirmou condicao.');
      expect(payload.containsKey('value'), isFalse);
    });

    test('runComplete vira checklist.complete', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-complete',
          type: ChecklistSyncActionTypes.runComplete,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'completed_at': '2026-06-16T12:10:00.000Z',
            'answer_count': 8,
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);
      expect(action['type'], 'checklist.complete');
      expect(payload['run_id'], 'srv-run-123');
      expect(payload['has_divergence'], isFalse);
      expect(metadata['completed_at'], '2026-06-16T12:10:00.000Z');
      expect(metadata['answer_count'], 8);
      expect(metadata['local_run_id'], 'clrun-local-123');
    });

    test('serializer mantem local_run_id apenas em metadata', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-server',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'field_id': 'field-condition',
            'text_value': 'OK',
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);

      expect(payload['run_id'], 'srv-run-123');
      expect(metadata['local_run_id'], 'clrun-local-123');
      expect(payload.containsKey('local_run_id'), isFalse);
    });

    test('serializer nao usa local_run_id como payload.run_id', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-local-only',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'field_id': 'field-condition',
            'text_value': 'OK',
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);

      expect(payload.containsKey('run_id'), isFalse);
      expect(metadata['local_run_id'], 'clrun-local-123');
    });

    test('payload nao contem tenant, token, path, base64 ou file_data', () {
      final request = const ChecklistSyncCodec(batchIdFactory: _fixedBatchId)
          .encodeRequest([
            _action(
              id: 'cl-safe',
              type: ChecklistSyncActionTypes.answerUpsert,
              payload: const {
                'tenantId': 'spoof',
                'tenant_id': 'spoof',
                'accessToken': 'secret',
                'token': 'secret',
                'Authorization': 'Bearer secret',
                'path': '/private/file.jpg',
                'local_path': r'C:\private\file.jpg',
                'base64': 'abc',
                'file_data': [1, 2],
                'binary': [3, 4],
                'local_run_id': 'run-123',
                'field_id': 'field-condition',
                'text_value': 'Seguro',
              },
            ),
          ]);
      final serialized = jsonEncode(request);
      for (final forbidden in [
        'tenantId',
        'tenant_id',
        'accessToken',
        'Authorization',
        'path',
        'local_path',
        'base64',
        'file_data',
        'binary',
        'Bearer',
      ]) {
        expect(serialized, isNot(contains(forbidden)), reason: forbidden);
      }
    });

    test('envelope usa client_batch_id e client_action_id', () {
      final request = const ChecklistSyncCodec(batchIdFactory: _fixedBatchId)
          .encodeRequest([
            _action(
              id: 'cl-envelope',
              type: ChecklistSyncActionTypes.answerUpsert,
            ),
          ]);
      final action = (request['actions'] as List).single as Map;

      expect(request['client_batch_id'], 'checklist-batch-fixed');
      expect(request.containsKey('clientBatchId'), isFalse);
      expect(action['client_action_id'], 'cl-envelope');
      expect(action.containsKey('clientActionId'), isFalse);
    });
  });

  group('B-102 checklist repository enqueue', () {
    test(
      'saveAnswer enfileira server_run_id quando run.serverId existe',
      () async {
        final queue = InMemorySyncQueueRepository();
        final store = InMemoryChecklistLocalStore();
        await store.saveRun(_serverRun());
        final repo = ChecklistRepository(
          session: devBootstrapSession,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: store,
          remoteApi: const PendingBackendChecklistRemoteApi(),
        );

        await repo.saveAnswer(
          runId: 'clrun-local-123',
          answer: MobileChecklistAnswer(
            fieldId: 'field-condition',
            textValue: 'OK',
            answeredAt: DateTime.utc(2026, 6, 16, 12),
          ),
        );

        final actions = await queue.actionsForTenant(
          devBootstrapSession.activeTenant.tenantId,
        );
        expect(actions.single.type, ChecklistSyncActionTypes.answerUpsert);
        expect(actions.single.payload['local_run_id'], 'clrun-local-123');
        expect(actions.single.payload['server_run_id'], 'srv-run-123');
      },
    );

    test(
      'completeRun enfileira server_run_id quando run.serverId existe',
      () async {
        final queue = InMemorySyncQueueRepository();
        final store = InMemoryChecklistLocalStore();
        await store.saveRun(_serverRun());
        final repo = ChecklistRepository(
          session: devBootstrapSession,
          syncQueue: queue,
          actionFactory: SyncActionFactory(),
          localStore: store,
          remoteApi: const PendingBackendChecklistRemoteApi(),
        );

        await repo.completeRun(
          runId: 'clrun-local-123',
          schema: const MobileChecklistSchema(
            id: 'schema-1',
            checklistId: 'checklist-1',
            version: 'v1',
            title: 'Checklist',
            fields: [],
          ),
        );

        final actions = await queue.actionsForTenant(
          devBootstrapSession.activeTenant.tenantId,
        );
        expect(actions.single.type, ChecklistSyncActionTypes.runComplete);
        expect(actions.single.payload['local_run_id'], 'clrun-local-123');
        expect(actions.single.payload['server_run_id'], 'srv-run-123');
      },
    );
  });

  group('B-102 checklist response parser', () {
    const codec = ChecklistSyncCodec();

    test('data.accepted vira processed', () {
      final results = codec.decodeResponse({
        'data': {
          'accepted': [
            {
              'client_action_id': 'accepted-1',
              'server_state': {
                'run': {'id': 'server-run-1'},
              },
            },
          ],
        },
      });
      expect(results.single.status, 'processed');
      expect(results.single.resultRef, 'server-run-1');
    });

    test('data.already_applied vira ignored', () {
      final results = codec.decodeResponse({
        'data': {
          'already_applied': [
            {'client_action_id': 'applied-1'},
          ],
        },
      });
      expect(results.single.status, 'ignored');
    });

    test('data.rejected vira failed', () {
      final results = codec.decodeResponse({
        'data': {
          'rejected': [
            {
              'client_action_id': 'rejected-1',
              'error': {'reason': 'unsupported_action_type'},
            },
          ],
        },
      });
      expect(results.single.status, 'failed');
      expect(results.single.errorCode, 'unsupported_action_type');
    });

    test('data.conflicts vira conflict', () {
      final results = codec.decodeResponse({
        'data': {
          'conflicts': [
            {
              'client_action_id': 'conflict-1',
              'conflict': {'conflict_type': 'idempotency_payload_mismatch'},
            },
          ],
        },
      });
      expect(results.single.status, 'conflict');
      expect(results.single.errorCode, 'idempotency_payload_mismatch');
    });

    test('data.results legado ainda funciona', () {
      final results = codec.decodeResponse({
        'data': {
          'results': [
            {
              'clientActionId': 'legacy-data-1',
              'status': 'processed',
              'resultRef': 'server-legacy',
            },
          ],
        },
      });
      expect(results.single.clientActionId, 'legacy-data-1');
      expect(results.single.status, 'processed');
      expect(results.single.resultRef, 'server-legacy');
    });

    test('results top-level legado ainda funciona', () {
      final results = codec.decodeResponse({
        'results': [
          {
            'clientActionId': 'legacy-top-1',
            'status': 'failed',
            'errorCode': 'VALIDATION',
          },
        ],
      });
      expect(results.single.clientActionId, 'legacy-top-1');
      expect(results.single.status, 'failed');
      expect(results.single.errorCode, 'VALIDATION');
    });

    test('item sem client_action_id e ignorado com seguranca', () {
      final results = codec.decodeResponse({
        'data': {
          'accepted': [
            {'server_state': {}},
          ],
        },
      });
      expect(results, isEmpty);
    });
  });

  group('B-102 checklist replay real', () {
    test('accepted marca action como synced', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'accepted-1', type: ChecklistSyncActionTypes.answerUpsert),
      );
      final result = await ChecklistSyncReplayService(
        queue: queue,
        api: _FakeChecklistApi(results: [_result('accepted-1')]),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.synced.single.status, SyncStatus.synced);
      expect(result.synced.single.processedAt, isNotNull);
    });

    test('already_applied marca action como synced', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'applied-1', type: ChecklistSyncActionTypes.answerUpsert),
      );
      final result = await ChecklistSyncReplayService(
        queue: queue,
        api: _FakeChecklistApi(
          results: [_result('applied-1', status: 'ignored')],
        ),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.synced.single.status, SyncStatus.synced);
    });

    test('rejected marca action como failed e incrementa retry', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'rejected-1', type: ChecklistSyncActionTypes.answerUpsert),
      );
      final result = await ChecklistSyncReplayService(
        queue: queue,
        api: _FakeChecklistApi(
          results: [
            _result('rejected-1', status: 'failed', errorCode: 'VALIDATION'),
          ],
        ),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.failed.single.status, SyncStatus.failed);
      expect(result.failed.single.retryCount, 1);
      expect(result.failed.single.lastErrorCode, 'VALIDATION');
    });

    test('conflict marca action como conflict', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'conflict-1', type: ChecklistSyncActionTypes.answerUpsert),
      );
      final result = await ChecklistSyncReplayService(
        queue: queue,
        api: _FakeChecklistApi(
          results: [_result('conflict-1', status: 'conflict')],
        ),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.conflicts.single.status, SyncStatus.conflict);
      expect(result.conflicts.single.lastSafeError, contains('Conflito'));
    });

    test('network error marca failed retryable', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'network-1', type: ChecklistSyncActionTypes.answerUpsert),
      );
      final result = await ChecklistSyncReplayService(
        queue: queue,
        api: _FakeChecklistApi(shouldThrow: true),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.failed.single.status, SyncStatus.failed);
      expect(result.failed.single.retryCount, 1);
      expect(result.failed.single.lastErrorCode, 'NETWORK_ERROR');
    });

    test('missing result vira failed com MISSING_RESULT', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'missing-1', type: ChecklistSyncActionTypes.answerUpsert),
      );
      final result = await ChecklistSyncReplayService(
        queue: queue,
        api: _FakeChecklistApi(results: [_result('other-id')]),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.failed.single.lastErrorCode, 'MISSING_RESULT');
      expect(result.failed.single.retryCount, 1);
    });

    test('maxRetry e respeitado', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'max-retry-1',
          type: ChecklistSyncActionTypes.answerUpsert,
          retryCount: 5,
        ),
      );
      final api = _FakeChecklistApi();
      final result = await ChecklistSyncReplayService(
        queue: queue,
        api: api,
        maxRetry: 5,
      ).replayTenant('tenant-should-not-be-sent');

      expect(api.captured, isNull);
      expect(result.synced, isEmpty);
      expect(result.failed, isEmpty);
      expect(result.conflicts, isEmpty);
    });

    test('B-102 envia answerUpsert com server_run_id', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'answer-ready',
          type: ChecklistSyncActionTypes.answerUpsert,
        ),
      );
      final api = _FakeChecklistApi(results: [_result('answer-ready')]);

      final result = await _b102ReplayService(
        queue,
        api,
      ).replayTenant('tenant-should-not-be-sent');

      expect(api.captured?.single.clientActionId, 'answer-ready');
      expect(result.synced.single.status, SyncStatus.synced);
    });

    test('B-102 envia runComplete com server_run_id', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'complete-ready',
          type: ChecklistSyncActionTypes.runComplete,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'server_run_id': 'srv-run-123',
            'completed_at': '2026-06-16T12:10:00.000Z',
            'answer_count': 8,
          },
        ),
      );
      final api = _FakeChecklistApi(results: [_result('complete-ready')]);

      final result = await _b102ReplayService(
        queue,
        api,
      ).replayTenant('tenant-should-not-be-sent');

      expect(api.captured?.single.clientActionId, 'complete-ready');
      expect(result.synced.single.status, SyncStatus.synced);
    });

    test('B-102 nao envia answerUpsert apenas com local_run_id', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'answer-local-only',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'field_id': 'field-condition',
            'text_value': 'OK',
          },
        ),
      );
      final api = _FakeChecklistApi();

      final result = await _b102ReplayService(
        queue,
        api,
      ).replayTenant('tenant-should-not-be-sent');
      final stored = (await queue.actionsForTenant(
        'tenant-should-not-be-sent',
      )).single;

      expect(api.captured, isNull);
      expect(result.synced, isEmpty);
      expect(result.failed, isEmpty);
      expect(stored.status, SyncStatus.pending);
    });

    test('B-102 nao envia runComplete apenas com local_run_id', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'complete-local-only',
          type: ChecklistSyncActionTypes.runComplete,
          payload: const {
            'local_run_id': 'clrun-local-123',
            'completed_at': '2026-06-16T12:10:00.000Z',
            'answer_count': 8,
          },
        ),
      );
      final api = _FakeChecklistApi();

      final result = await _b102ReplayService(
        queue,
        api,
      ).replayTenant('tenant-should-not-be-sent');
      final stored = (await queue.actionsForTenant(
        'tenant-should-not-be-sent',
      )).single;

      expect(api.captured, isNull);
      expect(result.failed, isEmpty);
      expect(stored.status, SyncStatus.pending);
    });

    test('B-102 nao envia tipos checklist fora do escopo', () async {
      final queue = InMemorySyncQueueRepository();
      final unsupportedTypes = [
        ChecklistSyncActionTypes.runCreate,
        ChecklistSyncActionTypes.markerCreate,
        ChecklistSyncActionTypes.divergenceCreate,
        ChecklistSyncActionTypes.acknowledgementCreate,
        ChecklistSyncActionTypes.attachmentAttach,
      ];
      for (final type in unsupportedTypes) {
        await queue.enqueue(
          _action(
            id: 'unsupported-$type',
            type: type,
            payload: {
              'local_run_id': 'clrun-local-123',
              'server_run_id': 'srv-run-123',
            },
          ),
        );
      }
      final api = _FakeChecklistApi();

      final result = await _b102ReplayService(
        queue,
        api,
      ).replayTenant('tenant-should-not-be-sent');
      final stored = await queue.actionsForTenant('tenant-should-not-be-sent');

      expect(api.captured, isNull);
      expect(result.synced, isEmpty);
      expect(result.failed, isEmpty);
      expect(result.conflicts, isEmpty);
      expect(
        stored.every((action) => action.status == SyncStatus.pending),
        isTrue,
      );
    });

    test('B-102 rejected com server_run_id vira failed', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'rejected-ready',
          type: ChecklistSyncActionTypes.answerUpsert,
        ),
      );
      final result = await _b102ReplayService(
        queue,
        _FakeChecklistApi(
          results: [
            _result(
              'rejected-ready',
              status: 'failed',
              errorCode: 'VALIDATION',
            ),
          ],
        ),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.failed.single.status, SyncStatus.failed);
      expect(result.failed.single.lastErrorCode, 'VALIDATION');
    });

    test('B-102 conflict com server_run_id vira conflict', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'conflict-ready',
          type: ChecklistSyncActionTypes.answerUpsert,
        ),
      );
      final result = await _b102ReplayService(
        queue,
        _FakeChecklistApi(
          results: [_result('conflict-ready', status: 'conflict')],
        ),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.conflicts.single.status, SyncStatus.conflict);
    });

    test('B-102 already_applied com server_run_id vira synced', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'applied-ready',
          type: ChecklistSyncActionTypes.answerUpsert,
        ),
      );
      final result = await _b102ReplayService(
        queue,
        _FakeChecklistApi(
          results: [_result('applied-ready', status: 'ignored')],
        ),
      ).replayTenant('tenant-should-not-be-sent');

      expect(result.synced.single.status, SyncStatus.synced);
    });
  });

  group('B-102 provider/auth', () {
    test(
      'sem access token, provider retorna PendingBackendChecklistSyncBatchApi',
      () {
        final container = ProviderContainer(
          overrides: [
            authenticatedApiConfigProvider.overrideWithValue(const ApiConfig()),
          ],
        );
        addTearDown(container.dispose);

        expect(
          container.read(checklistSyncBatchApiProvider),
          isA<PendingBackendChecklistSyncBatchApi>(),
        );
      },
    );

    test('com access token, provider usa DioChecklistSyncBatchApi', () {
      final container = ProviderContainer(
        overrides: [
          authenticatedApiConfigProvider.overrideWithValue(
            const ApiConfig(accessToken: 'access-token-test'),
          ),
        ],
      );
      addTearDown(container.dispose);

      expect(
        container.read(checklistSyncBatchApiProvider),
        isA<DioChecklistSyncBatchApi>(),
      );
    });

    test(
      'DioChecklistSyncBatchApi envia contrato real sem token no payload',
      () async {
        final adapter = _FakeHttpAdapter((options) {
          expect(options.path, ChecklistApiEndpoints.mobileChecklistSync);
          expect(options.headers['Authorization'], 'Bearer access-token-test');
          final body = Map<String, Object?>.from(options.data as Map);
          final serialized = jsonEncode(body);
          expect(serialized, contains('client_batch_id'));
          expect(serialized, contains('client_action_id'));
          expect(serialized, isNot(contains('access-token-test')));
          expect(serialized, isNot(contains('tenantId')));
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

        final results = await DioChecklistSyncBatchApi(dio).sendBatch([
          _action(id: 'dio-1', type: ChecklistSyncActionTypes.answerUpsert),
        ]);

        expect(results.single.status, 'processed');
        expect(adapter.captured, hasLength(1));
      },
    );
  });
}

MobileChecklistRun _serverRun() {
  return MobileChecklistRun(
    localId: 'clrun-local-123',
    serverId: 'srv-run-123',
    tenantId: devBootstrapSession.activeTenant.tenantId,
    checklistId: 'checklist-1',
    workOrderId: 'wo-1',
    schemaVersion: 'v1',
    status: MobileChecklistRunStatus.inProgress,
    executedByUserId: devBootstrapSession.user.userId,
    startedAt: DateTime.utc(2026, 6, 16, 11),
    syncStatus: SyncStatus.pending,
    answers: const {},
  );
}

ChecklistSyncReplayService _b102ReplayService(
  InMemorySyncQueueRepository queue,
  ChecklistSyncBatchApi api,
) {
  return ChecklistSyncReplayService(
    queue: queue,
    api: api,
    supportedActionTypes: b102BackendChecklistActionTypes,
    extraEligibility: b102ChecklistActionReadyForBackend,
  );
}

String _fixedBatchId() => 'checklist-batch-fixed';
