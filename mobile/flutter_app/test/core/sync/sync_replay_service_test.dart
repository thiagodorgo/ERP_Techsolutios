import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:flutter_test/flutter_test.dart';

class _StaticAdapter implements HttpClientAdapter {
  _StaticAdapter(this.handler);

  final ResponseBody Function(RequestOptions) handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

SyncAction _action({
  required String id,
  SyncStatus status = SyncStatus.pending,
  int retryCount = 0,
  String type = 'expense_report.create',
  Map<String, Object?>? payload,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-test',
    type: type,
    payload: payload ?? {'local_id': id},
    status: status,
    createdAt: DateTime.utc(2026, 6, 11),
    retryCount: retryCount,
  );
}

SyncReplayService _service(
  SyncQueueRepository queue,
  ExpenseSyncBatchApi api, {
  int maxRetry = 5,
}) {
  return SyncReplayService(queue: queue, api: api, maxRetry: maxRetry);
}

void main() {
  group('SyncReplayService', () {
    test(
      '1. returns empty result when queue has no eligible actions',
      () async {
        final queue = InMemorySyncQueueRepository();
        final svc = _service(queue, MockExpenseSyncBatchApi(results: []));

        final result = await svc.replayTenant('tenant-test');

        expect(result.synced, isEmpty);
        expect(result.failed, isEmpty);
        expect(result.conflicts, isEmpty);
      },
    );

    test('2. actions are marked syncing before API call', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'a1'));

      final List<SyncAction> capturedBatch = [];
      final capApi = CaptureBatchApi((batch) {
        capturedBatch.addAll(batch);
        return [
          SyncActionResult(
            clientActionId: 'a1',
            status: 'processed',
            resultRef: 'srv-1',
          ),
        ];
      });

      await _service(queue, capApi).replayTenant('tenant-test');

      expect(
        capturedBatch.single.status,
        SyncStatus.syncing,
        reason: 'action must be syncing when the batch is sent',
      );
    });

    test('3. processed result → synced status and processedAt set', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'a1'));

      final svc = _service(
        queue,
        MockExpenseSyncBatchApi(
          results: [
            SyncActionResult(
              clientActionId: 'a1',
              status: 'processed',
              resultRef: 'srv-1',
            ),
          ],
        ),
      );

      final result = await svc.replayTenant('tenant-test');

      expect(result.synced, hasLength(1));
      expect(result.synced.single.clientActionId, 'a1');
      expect(result.synced.single.status, SyncStatus.synced);
      expect(result.synced.single.processedAt, isNotNull);
    });

    test(
      '4. conflict result → conflict status and safe error message',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(_action(id: 'a2'));

        final svc = _service(
          queue,
          MockExpenseSyncBatchApi(
            results: [
              SyncActionResult(
                clientActionId: 'a2',
                status: 'conflict',
                errorCode: 'DUPLICATE_REPORT',
              ),
            ],
          ),
        );

        final result = await svc.replayTenant('tenant-test');

        expect(result.conflicts, hasLength(1));
        expect(result.conflicts.single.status, SyncStatus.conflict);
        expect(result.conflicts.single.lastErrorCode, 'DUPLICATE_REPORT');
        expect(result.conflicts.single.lastSafeError, isNotEmpty);
      },
    );

    test(
      '5. network error → all actions failed, retryCount incremented, safe error set',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(_action(id: 'a1', retryCount: 1));
        await queue.enqueue(_action(id: 'a2', retryCount: 0));

        final svc = _service(queue, MockExpenseSyncBatchApi(shouldThrow: true));

        final result = await svc.replayTenant('tenant-test');

        expect(result.failed, hasLength(2));
        for (final f in result.failed) {
          expect(f.status, SyncStatus.failed);
          expect(f.lastSafeError, isNotEmpty);
          expect(
            f.lastSafeError!.contains('senha') ||
                f.lastSafeError!.contains('token') ||
                f.lastSafeError!.contains('path'),
            isFalse,
            reason: 'safe error must not expose sensitive data',
          );
        }
        final a1 = result.failed.firstWhere((a) => a.clientActionId == 'a1');
        final a2 = result.failed.firstWhere((a) => a.clientActionId == 'a2');
        expect(a1.retryCount, 2);
        expect(a2.retryCount, 1);
      },
    );

    test(
      '6. action with retryCount >= maxRetry is skipped and API is not called',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(_action(id: 'exhausted', retryCount: 5));

        var apiCalled = false;
        final capApi = CaptureBatchApi((_) {
          apiCalled = true;
          return [];
        });

        final result = await _service(
          queue,
          capApi,
          maxRetry: 5,
        ).replayTenant('tenant-test');

        expect(
          apiCalled,
          isFalse,
          reason: 'API must not be called when all actions exceed maxRetry',
        );
        expect(result.synced, isEmpty);
        expect(result.failed, isEmpty);
      },
    );

    test('7. resultRef preserved in payload under result_ref key', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action(id: 'a1', payload: {'local_id': 'a1'}));

      final svc = _service(
        queue,
        MockExpenseSyncBatchApi(
          results: [
            SyncActionResult(
              clientActionId: 'a1',
              status: 'processed',
              resultRef: 'server-uuid-99',
            ),
          ],
        ),
      );

      final result = await svc.replayTenant('tenant-test');

      expect(result.synced.single.payload['result_ref'], 'server-uuid-99');
      expect(result.synced.single.payload['local_id'], 'a1');
    });

    test(
      '8. receipt action batch payload has no private paths, tokens, or file content',
      () async {
        final queue = InMemorySyncQueueRepository();
        final receiptPayload = {
          'tenant_id': 'tenant-test',
          'report_local_id': 'PC-local-1',
          'report_server_id': null,
          'item_local_id': 'item-local-1',
          'receipt_local_id': 'receipt-local-1',
          'file_name': 'comprovante.jpg',
          'mime_type': 'image/jpeg',
          'size_bytes': 98304,
          'sha256_hash': 'abc123def456',
          'capture_source': 'camera',
          'created_at': '2026-06-11T00:00:00.000Z',
        };
        await queue.enqueue(
          _action(
            id: 'r1',
            type: 'expense_receipt.attach',
            payload: receiptPayload,
          ),
        );

        final List<SyncAction> capturedBatch = [];
        final capApi = CaptureBatchApi((batch) {
          capturedBatch.addAll(batch);
          return [
            SyncActionResult(
              clientActionId: 'r1',
              status: 'processed',
              resultRef: 'srv-r1',
            ),
          ];
        });

        await _service(queue, capApi).replayTenant('tenant-test');

        final sentPayload = capturedBatch.single.payload;
        final valuesAsStrings = sentPayload.values
            .whereType<String>()
            .map((v) => v.toLowerCase())
            .toList();

        // Must not include private path markers
        for (final v in valuesAsStrings) {
          expect(
            v.contains('/home/') ||
                v.contains('c:\\users') ||
                v.contains('private'),
            isFalse,
            reason: 'payload must not contain private paths',
          );
          expect(
            v.length > 500,
            isFalse,
            reason: 'payload values must not include base64 file content',
          );
        }
        expect(sentPayload.containsKey('access_token'), isFalse);
        expect(sentPayload.containsKey('token'), isFalse);
      },
    );

    test('9. Dio batch API reads results from body.data.results', () async {
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = _StaticAdapter(
        (_) => ResponseBody.fromString(
          jsonEncode({
            'data': {
              'results': [
                {
                  'clientActionId': 'a1',
                  'status': 'processed',
                  'resultRef': 'server-a1',
                },
              ],
            },
          }),
          200,
          headers: {
            Headers.contentTypeHeader: ['application/json; charset=utf-8'],
          },
        ),
      );

      final results = await DioExpenseSyncBatchApi(
        dio,
      ).sendBatch([_action(id: 'a1')]);

      expect(results, hasLength(1));
      expect(results.single.clientActionId, 'a1');
      expect(results.single.resultRef, 'server-a1');
    });
  });
}
