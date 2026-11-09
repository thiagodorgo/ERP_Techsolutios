import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:flutter_test/flutter_test.dart';

late Map<String, dynamic> _envelopes;

Map<String, dynamic> _envelope(String key) =>
    (_envelopes[key] as Map).cast<String, dynamic>();

int _envelopeStatus(String key) => _envelope(key)['status'] as int;

Map<String, dynamic> _envelopeBody(String key) =>
    (_envelope(key)['body'] as Map).cast<String, dynamic>();

typedef _Responder =
    ResponseBody Function(int call, List<Map<String, Object?>> actions);

class _FakeAdapter implements HttpClientAdapter {
  _FakeAdapter(this.respond);

  final _Responder respond;
  int calls = 0;
  final List<String> sentTypes = <String>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    calls += 1;
    final data = options.data;
    final actions = <Map<String, Object?>>[];
    if (data is Map) {
      final raw = data['actions'];
      if (raw is List) {
        for (final action in raw) {
          if (action is Map) {
            final typed = Map<String, Object?>.from(action);
            actions.add(typed);
            final type = typed['type'];
            if (type is String) sentTypes.add(type);
          }
        }
      }
    }
    return respond(calls, actions);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonBody(Map<String, dynamic> body, int status) =>
    ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );

ResponseBody _html503() => ResponseBody.fromString(
  '<html>503 Service Unavailable</html>',
  503,
  headers: {
    Headers.contentTypeHeader: ['text/html'],
  },
);

ResponseBody _processed(List<Map<String, Object?>> actions) => _jsonBody({
  'data': {
    'results': [
      for (final action in actions)
        {
          'clientActionId': action['clientActionId'],
          'status': 'processed',
          'resultRef': 'srv-${action['clientActionId']}',
        },
    ],
  },
}, 200);

SyncReplayService _service(SyncQueueRepository queue, _FakeAdapter adapter) {
  final dio = createAuthenticatedHttpClient(
    const ApiConfig(baseUrl: 'https://test.local', accessToken: 'tok-teste'),
    onRefresh: () async => null,
    onClearSession: () async {},
  );
  dio.httpClientAdapter = adapter;
  return SyncReplayService(
    queue: queue,
    api: DioExpenseSyncBatchApi(dio),
    supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
  );
}

SyncAction _action({
  required String id,
  required String type,
  required Map<String, Object?> payload,
  int retryCount = 0,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 't1',
    type: type,
    payload: payload,
    status: SyncStatus.pending,
    createdAt: DateTime.utc(2026, 11, 9),
    retryCount: retryCount,
  );
}

void main() {
  setUpAll(() {
    final raw = File(
      'test/core/sync/bo6r03b_expense_error_envelopes.json',
    ).readAsStringSync();
    _envelopes = (jsonDecode(raw) as Map).cast<String, dynamic>();
  });

  group('RB2-HTTP · erros reais do backend pelo DioExpenseSyncBatchApi', () {
    test(
      'E1 · 503 sync_busy real volta a pending sem gastar tentativa',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(
            id: 'r1',
            type: ExpenseSyncActionTypes.reportCreate,
            payload: {'local_id': 'pc-local-1'},
            retryCount: 2,
          ),
        );
        final backend = _FakeAdapter(
          (_, _) => _jsonBody(
            _envelopeBody('503_sync_busy'),
            _envelopeStatus('503_sync_busy'),
          ),
        );
        final result = await _service(queue, backend).replayTenant('t1');

        final stored = (await queue.actionsForTenant('t1')).single;
        expect(stored.status, SyncStatus.pending);
        expect(stored.retryCount, 2);
        expect(stored.lastErrorCode, 'SYNC_BUSY');
        expect(stored.lastSafeError, 'Servidor ocupado; o envio será refeito.');
        expect(result.conflicts, isEmpty);
        expect(result.failed, isEmpty);
        expect(backend.calls, 1);
      },
    );

    test('E2 · o reenvio chega: 503 no relatório não perde o item', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'rc1',
          type: ExpenseSyncActionTypes.reportCreate,
          payload: {'local_id': 'pc-local-1'},
        ),
      );
      await queue.enqueue(
        _action(
          id: 'it1',
          type: ExpenseSyncActionTypes.itemCreate,
          payload: {
            'report_local_id': 'pc-local-1',
            'category_key': 'fuel',
            'spent_at': '2026-11-09T00:00:00.000Z',
            'amount': 1234,
          },
        ),
      );
      final backend = _FakeAdapter(
        (call, actions) => call == 1
            ? _jsonBody(
                _envelopeBody('503_sync_busy'),
                _envelopeStatus('503_sync_busy'),
              )
            : _processed(actions),
      );
      final service = _service(queue, backend);
      await service.replayTenant('t1');
      await service.replayTenant('t1');

      final stored = await queue.actionsForTenant('t1');
      final report = stored.firstWhere(
        (a) => a.type == ExpenseSyncActionTypes.reportCreate,
      );
      final item = stored.firstWhere(
        (a) => a.type == ExpenseSyncActionTypes.itemCreate,
      );
      expect(report.status, SyncStatus.synced);
      expect(item.status, SyncStatus.synced);
      expect(item.payload['report_id'], 'srv-rc1');
      expect(backend.sentTypes, [
        ExpenseSyncActionTypes.reportCreate,
        ExpenseSyncActionTypes.reportCreate,
        ExpenseSyncActionTypes.itemCreate,
      ]);
    });

    test(
      'E3 · dinheiro: item com 503 não libera o envio antes de ser aceito',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(
            id: 'it2',
            type: ExpenseSyncActionTypes.itemCreate,
            payload: {
              'report_local_id': 'pc-local-2',
              'report_id': 'srv-r2',
              'category_key': 'fuel',
              'spent_at': '2026-11-09T00:00:00.000Z',
              'amount': 5000,
            },
          ),
        );
        await queue.enqueue(
          _action(
            id: 'sb2',
            type: ExpenseSyncActionTypes.reportSubmit,
            payload: {'report_local_id': 'pc-local-2', 'report_id': 'srv-r2'},
          ),
        );
        final backend = _FakeAdapter(
          (call, actions) => call == 1
              ? _jsonBody(
                  _envelopeBody('503_sync_busy'),
                  _envelopeStatus('503_sync_busy'),
                )
              : _processed(actions),
        );
        final service = _service(queue, backend);
        await service.replayTenant('t1');
        await service.replayTenant('t1');
        await service.replayTenant('t1');

        final stored = await queue.actionsForTenant('t1');
        final item = stored.firstWhere(
          (a) => a.type == ExpenseSyncActionTypes.itemCreate,
        );
        final submit = stored.firstWhere(
          (a) => a.type == ExpenseSyncActionTypes.reportSubmit,
        );
        expect(item.status, SyncStatus.synced);
        expect(submit.status, SyncStatus.synced);
        expect(backend.sentTypes, [
          ExpenseSyncActionTypes.itemCreate,
          ExpenseSyncActionTypes.itemCreate,
          ExpenseSyncActionTypes.reportSubmit,
        ]);
      },
    );

    test('E4 · 403 de sessão vira SESSION_FORBIDDEN', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'r4',
          type: ExpenseSyncActionTypes.reportCreate,
          payload: {'local_id': 'pc-local-4'},
        ),
      );
      final backend = _FakeAdapter(
        (_, _) => _jsonBody(
          _envelopeBody('403_permission_required'),
          _envelopeStatus('403_permission_required'),
        ),
      );
      final result = await _service(queue, backend).replayTenant('t1');

      final stored = (await queue.actionsForTenant('t1')).single;
      expect(stored.status, SyncStatus.conflict);
      expect(stored.lastErrorCode, 'SESSION_FORBIDDEN');
      expect(stored.lastSafeError, contains('Minha versão'));
      expect(stored.retryCount, 0);
      expect(result.conflicts, hasLength(1));
    });

    test('E5 · 500 genérico volta a failed + tentativa', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'r5',
          type: ExpenseSyncActionTypes.reportCreate,
          payload: {'local_id': 'pc-local-5'},
          retryCount: 1,
        ),
      );
      final backend = _FakeAdapter(
        (_, _) => _jsonBody(
          _envelopeBody('500_unknown_error'),
          _envelopeStatus('500_unknown_error'),
        ),
      );
      final result = await _service(queue, backend).replayTenant('t1');

      final stored = (await queue.actionsForTenant('t1')).single;
      expect(stored.status, SyncStatus.failed);
      expect(stored.retryCount, 2);
      expect(result.conflicts, isEmpty);
    });

    test('E6 · 409 status_not_editable continua conflito com texto', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'it6',
          type: ExpenseSyncActionTypes.itemCreate,
          payload: {
            'report_local_id': 'pc-local-6',
            'report_id': 'srv-r6',
            'category_key': 'fuel',
            'spent_at': '2026-11-09T00:00:00.000Z',
            'amount': 100,
          },
        ),
      );
      final backend = _FakeAdapter(
        (_, _) => _jsonBody(
          _envelopeBody('409_status_not_editable'),
          _envelopeStatus('409_status_not_editable'),
        ),
      );
      await _service(queue, backend).replayTenant('t1');

      final stored = (await queue.actionsForTenant('t1')).single;
      expect(stored.status, SyncStatus.conflict);
      expect(stored.lastErrorCode, 'status_not_editable');
      expect(stored.lastSafeError, contains('não pode mais ser alterado'));
    });

    test('E7 · 422 empty_report continua conflito com texto', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'sb7',
          type: ExpenseSyncActionTypes.reportSubmit,
          payload: {'report_local_id': 'pc-local-7', 'report_id': 'srv-r7'},
        ),
      );
      final backend = _FakeAdapter(
        (_, _) => _jsonBody(
          _envelopeBody('422_empty_report'),
          _envelopeStatus('422_empty_report'),
        ),
      );
      await _service(queue, backend).replayTenant('t1');

      final stored = (await queue.actionsForTenant('t1')).single;
      expect(stored.status, SyncStatus.conflict);
      expect(stored.lastErrorCode, 'empty_report');
      expect(stored.lastSafeError, contains('vazio'));
    });

    test('E8 · 503 sem JSON (proxy) volta a pending', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'r8',
          type: ExpenseSyncActionTypes.reportCreate,
          payload: {'local_id': 'pc-local-8'},
        ),
      );
      final backend = _FakeAdapter((_, _) => _html503());
      await _service(queue, backend).replayTenant('t1');

      final stored = (await queue.actionsForTenant('t1')).single;
      expect(stored.status, SyncStatus.pending);
      expect(stored.lastErrorCode, 'SYNC_BUSY');
      expect(stored.retryCount, 0);
    });

    test('E9 · 401 sem reason vira SESSION_FORBIDDEN com acento', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'r9',
          type: ExpenseSyncActionTypes.reportCreate,
          payload: {'local_id': 'pc-local-9'},
        ),
      );
      final backend = _FakeAdapter(
        (_, _) => _jsonBody(
          _envelopeBody('401_invalid_token'),
          _envelopeStatus('401_invalid_token'),
        ),
      );
      await _service(queue, backend).replayTenant('t1');

      final stored = (await queue.actionsForTenant('t1')).single;
      expect(stored.status, SyncStatus.conflict);
      expect(stored.lastErrorCode, 'SESSION_FORBIDDEN');
      expect(stored.lastSafeError, contains('Minha versão'));
    });

    test('E10 · 400 required_field continua conflito por código', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(
          id: 'it10',
          type: ExpenseSyncActionTypes.itemCreate,
          payload: {
            'report_local_id': 'pc-local-10',
            'report_id': 'srv-r10',
            'category_key': 'fuel',
            'spent_at': '2026-11-09T00:00:00.000Z',
            'amount': 100,
          },
        ),
      );
      final backend = _FakeAdapter(
        (_, _) => _jsonBody(
          _envelopeBody('400_required_field'),
          _envelopeStatus('400_required_field'),
        ),
      );
      await _service(queue, backend).replayTenant('t1');

      final stored = (await queue.actionsForTenant('t1')).single;
      expect(stored.status, SyncStatus.conflict);
      expect(stored.lastErrorCode, 'required_field');
      expect(stored.retryCount, 0);
    });
  });
}
