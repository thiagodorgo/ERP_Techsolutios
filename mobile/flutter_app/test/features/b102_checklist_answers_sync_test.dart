import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
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
          'local_run_id': 'run-123',
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
      expect(payload['run_id'], 'run-123');
      expect(payload['component_id'], 'field-condition');
      expect(payload['value'], 'Veiculo sem danos.');
      expect(metadata['source'], 'mobile_offline');
      expect(metadata['answered_at'], '2026-06-16T12:00:00.000Z');
      expect(metadata['local_run_id'], 'run-123');
    });

    test('answerUpsert bool vira checklist.item_answer', () {
      final action = _encodedSingle(
        _action(
          id: 'cl-answer-bool',
          type: ChecklistSyncActionTypes.answerUpsert,
          payload: const {
            'local_run_id': 'run-123',
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
            'local_run_id': 'run-123',
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
            'local_run_id': 'run-123',
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
            'local_run_id': 'run-123',
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
            'local_run_id': 'run-123',
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
            'local_run_id': 'run-123',
            'completed_at': '2026-06-16T12:10:00.000Z',
            'answer_count': 8,
          },
        ),
      );
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final metadata = Map<String, Object?>.from(payload['metadata'] as Map);
      expect(action['type'], 'checklist.complete');
      expect(payload['run_id'], 'run-123');
      expect(payload['has_divergence'], isFalse);
      expect(metadata['completed_at'], '2026-06-16T12:10:00.000Z');
      expect(metadata['answer_count'], 8);
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

String _fixedBatchId() => 'checklist-batch-fixed';
