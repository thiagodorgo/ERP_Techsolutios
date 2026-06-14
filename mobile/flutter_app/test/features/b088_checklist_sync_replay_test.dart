import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_engine.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

SyncAction _checklistAction({
  String id = 'ca-1',
  String type = ChecklistSyncActionTypes.runCreate,
  SyncStatus status = SyncStatus.pending,
  int retryCount = 0,
  Map<String, Object?>? payload,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-demo',
    type: type,
    payload: payload ?? const {'local_run_id': 'run-1'},
    status: status,
    createdAt: DateTime.utc(2026, 6, 12),
    retryCount: retryCount,
  );
}

SyncAction _rdvAction({String id = 'ea-1'}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-demo',
    type: ExpenseSyncActionTypes.reportCreate,
    payload: const {'local_report_id': 'rep-1'},
    status: SyncStatus.pending,
    createdAt: DateTime.utc(2026, 6, 12),
  );
}

ChecklistSyncReplayService _makeService(
  InMemorySyncQueueRepository queue,
  ChecklistSyncBatchApi api, {
  int maxRetry = 5,
}) {
  return ChecklistSyncReplayService(queue: queue, api: api, maxRetry: maxRetry);
}

SyncActionResult _result(
  String id, {
  String status = 'processed',
  String? resultRef,
  String? errorCode,
}) {
  return SyncActionResult(
    clientActionId: id,
    status: status,
    resultRef: resultRef,
    errorCode: errorCode,
  );
}

Widget _wrapSync({
  required InMemorySyncQueueRepository queue,
  ChecklistSyncReplayService? checklistService,
}) {
  final clService =
      checklistService ??
      ChecklistSyncReplayService(
        queue: queue,
        api: MockChecklistSyncBatchApi(),
      );
  final router = GoRouter(
    initialLocation: '/sync',
    routes: [
      GoRoute(path: '/sync', builder: (context, state) => const SyncScreen()),
    ],
  );
  return ProviderScope(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => devBootstrapSession),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      checklistSyncReplayServiceProvider.overrideWithValue(clService),
      syncEngineProvider.overrideWithValue(
        SyncEngine(
          queue: queue,
          api: MockExpenseSyncApi(SyncApiResult.success),
        ),
      ),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // -------------------------------------------------------------------------
  // Group 1: Domain filtering
  // -------------------------------------------------------------------------

  group('ChecklistSyncReplayService — filtragem por dominio (B-088)', () {
    test('1. replay envia somente actions de checklist', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_checklistAction(id: 'cl-1'));
      await queue.enqueue(_rdvAction(id: 'rdv-1'));

      final api = CaptureChecklistBatchApi(
        (batch) => batch.map((a) => _result(a.clientActionId)).toList(),
      );

      await _makeService(queue, api).replayTenant('tenant-demo');

      expect(api.captured?.length, 1);
      expect(api.captured?.first.clientActionId, 'cl-1');
    });

    test('2. nao envia actions RDV por engano', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_rdvAction(id: 'rdv-1'));

      final api = CaptureChecklistBatchApi((batch) => []);

      final result = await _makeService(queue, api).replayTenant('tenant-demo');

      expect(api.captured, isNull, reason: 'sendBatch nao deve ser chamado');
      expect(result.synced, isEmpty);
      expect(result.failed, isEmpty);
      expect(result.conflicts, isEmpty);
    });

    test('3. filtra todos os 7 tipos de action checklist', () async {
      final types = [
        ChecklistSyncActionTypes.runCreate,
        ChecklistSyncActionTypes.answerUpsert,
        ChecklistSyncActionTypes.runComplete,
        ChecklistSyncActionTypes.markerCreate,
        ChecklistSyncActionTypes.divergenceCreate,
        ChecklistSyncActionTypes.acknowledgementCreate,
        ChecklistSyncActionTypes.attachmentAttach,
      ];

      for (var i = 0; i < types.length; i++) {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(_checklistAction(id: 'cl-$i', type: types[i]));

        final api = CaptureChecklistBatchApi(
          (batch) => batch.map((a) => _result(a.clientActionId)).toList(),
        );

        await _makeService(queue, api).replayTenant('tenant-demo');

        expect(
          api.captured?.length,
          1,
          reason: 'tipo ${types[i]} deve ser enviado',
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // Group 2: Result processing
  // -------------------------------------------------------------------------

  group('ChecklistSyncReplayService — processamento de resultado (B-088)', () {
    test('4. processed vira synced com processedAt preenchido', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_checklistAction(id: 'cl-1'));

      final api = MockChecklistSyncBatchApi(
        results: [
          _result('cl-1', status: 'processed', resultRef: 'srv-run-99'),
        ],
      );

      final result = await _makeService(queue, api).replayTenant('tenant-demo');

      expect(result.synced.length, 1);
      expect(result.synced.first.status, SyncStatus.synced);
      expect(result.synced.first.processedAt, isNotNull);
      expect(result.synced.first.payload['result_ref'], 'srv-run-99');
    });

    test(
      '5. failed no servidor incrementa retryCount e lastSafeError',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(_checklistAction(id: 'cl-1'));

        final api = MockChecklistSyncBatchApi(
          results: [_result('cl-1', status: 'failed', errorCode: 'VALIDATION')],
        );

        final result = await _makeService(
          queue,
          api,
        ).replayTenant('tenant-demo');

        expect(result.failed.length, 1);
        expect(result.failed.first.status, SyncStatus.failed);
        expect(result.failed.first.retryCount, 1);
        expect(result.failed.first.lastErrorCode, 'VALIDATION');
        expect(result.failed.first.lastSafeError, isNotEmpty);
      },
    );

    test('6. conflict vira conflict com lastSafeError', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_checklistAction(id: 'cl-1'));

      final api = MockChecklistSyncBatchApi(
        results: [_result('cl-1', status: 'conflict')],
      );

      final result = await _makeService(queue, api).replayTenant('tenant-demo');

      expect(result.conflicts.length, 1);
      expect(result.conflicts.first.status, SyncStatus.conflict);
      expect(result.conflicts.first.lastSafeError, contains('Conflito'));
    });

    test('7. unknown status vira failed seguro', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_checklistAction(id: 'cl-1'));

      final api = MockChecklistSyncBatchApi(
        results: [_result('cl-1', status: 'unexpected_xyz')],
      );

      final result = await _makeService(queue, api).replayTenant('tenant-demo');

      expect(result.failed.length, 1);
      expect(result.failed.first.status, SyncStatus.failed);
      expect(result.failed.first.lastSafeError, isNotEmpty);
    });

    test('8. ignored vira synced', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_checklistAction(id: 'cl-1'));

      final api = MockChecklistSyncBatchApi(
        results: [_result('cl-1', status: 'ignored')],
      );

      final result = await _makeService(queue, api).replayTenant('tenant-demo');

      expect(result.synced.length, 1);
      expect(result.synced.first.status, SyncStatus.synced);
      expect(result.synced.first.processedAt, isNotNull);
    });

    test('9. action sem resposta vira failed MISSING_RESULT', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_checklistAction(id: 'cl-1'));

      final api = MockChecklistSyncBatchApi(
        results: [_result('outro-id', status: 'processed')],
      );

      final result = await _makeService(queue, api).replayTenant('tenant-demo');

      expect(result.failed.length, 1);
      expect(result.failed.first.lastErrorCode, 'MISSING_RESULT');
    });
  });

  // -------------------------------------------------------------------------
  // Group 3: Network error
  // -------------------------------------------------------------------------

  group('ChecklistSyncReplayService — erro de rede (B-088)', () {
    test(
      '10. network error — todas as actions viram failed NETWORK_ERROR',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(_checklistAction(id: 'cl-1'));
        await queue.enqueue(
          _checklistAction(
            id: 'cl-2',
            type: ChecklistSyncActionTypes.answerUpsert,
          ),
        );

        final api = MockChecklistSyncBatchApi(shouldThrow: true);

        final result = await _makeService(
          queue,
          api,
        ).replayTenant('tenant-demo');

        expect(result.failed.length, 2);
        expect(
          result.failed.every((a) => a.lastErrorCode == 'NETWORK_ERROR'),
          isTrue,
        );
        expect(result.failed.every((a) => a.retryCount == 1), isTrue);
        expect(result.synced, isEmpty);
      },
    );
  });

  // -------------------------------------------------------------------------
  // Group 4: Safety — não reenvia, respeita maxRetry
  // -------------------------------------------------------------------------

  group('ChecklistSyncReplayService — seguranca de replay (B-088)', () {
    test('11. actions synced nao sao reenviadas', () async {
      final queue = InMemorySyncQueueRepository();
      final action = _checklistAction(id: 'cl-1');
      await queue.enqueue(action);
      await queue.update(action.copyWith(status: SyncStatus.synced));

      final api = CaptureChecklistBatchApi((batch) => []);

      final result = await _makeService(queue, api).replayTenant('tenant-demo');

      expect(
        api.captured,
        isNull,
        reason: 'synced nao entra em pendingForTenant',
      );
      expect(result.synced, isEmpty);
      expect(result.failed, isEmpty);
    });

    test('12. action com retryCount >= maxRetry e ignorada', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_checklistAction(id: 'cl-1', retryCount: 5));

      final api = CaptureChecklistBatchApi((batch) => []);

      final result = await _makeService(
        queue,
        api,
        maxRetry: 5,
      ).replayTenant('tenant-demo');

      expect(api.captured, isNull, reason: 'retryCount >= maxRetry e filtrado');
      expect(result.synced, isEmpty);
    });
  });

  // -------------------------------------------------------------------------
  // Group 5: Payload safety
  // -------------------------------------------------------------------------

  group('ChecklistSyncReplayService — payload seguro (B-088)', () {
    test('13. attachment payload nao contem path/base64/token', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _checklistAction(
          id: 'att-1',
          type: ChecklistSyncActionTypes.attachmentAttach,
          payload: {
            'local_att_id': 'clatt-local-abc',
            'local_run_id': 'run-1',
            'field_id': 'f-photo',
            'file_name': 'evidencia-1718000000000.jpg',
            'mime_type': 'image/jpeg',
            'size_bytes': 0,
          },
        ),
      );

      final api = CaptureChecklistBatchApi(
        (batch) => batch.map((a) => _result(a.clientActionId)).toList(),
      );

      await _makeService(queue, api).replayTenant('tenant-demo');

      final payload = api.captured!.first.payload;
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('bearer'), isFalse);
      expect(payload['file_name'], 'evidencia-1718000000000.jpg');
      expect(payload['size_bytes'], 0);
    });

    test(
      '14. beforeAfter payload nao contem base64 e usa IDs prefixados',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _checklistAction(
            id: 'ba-1',
            type: ChecklistSyncActionTypes.answerUpsert,
            payload: {
              'local_run_id': 'run-1',
              'field_id': 'f-before-after',
              'multi_choice_values': [
                'before:clatt-local-1',
                'after:clatt-local-2',
              ],
            },
          ),
        );

        final api = CaptureChecklistBatchApi(
          (batch) => batch.map((a) => _result(a.clientActionId)).toList(),
        );

        await _makeService(queue, api).replayTenant('tenant-demo');

        final payload = api.captured!.first.payload;
        expect(payload.containsKey('base64'), isFalse);
        final values = payload['multi_choice_values'] as List<String>;
        expect(
          values.every(
            (v) => v.startsWith('before:') || v.startsWith('after:'),
          ),
          isTrue,
        );
      },
    );

    test('15. marker payload e seguro — sem path/base64/token', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _checklistAction(
          id: 'mark-1',
          type: ChecklistSyncActionTypes.markerCreate,
          payload: {
            'local_marker_id': 'clmark-local-abc',
            'local_run_id': 'run-1',
            'type': 'damage',
            'label': 'Arranhao lateral',
            'position_label': 'frente-esquerda',
          },
        ),
      );

      final api = CaptureChecklistBatchApi(
        (batch) => batch.map((a) => _result(a.clientActionId)).toList(),
      );

      await _makeService(queue, api).replayTenant('tenant-demo');

      final payload = api.captured!.first.payload;
      expect(payload.containsKey('path'), isFalse);
      expect(payload.containsKey('token'), isFalse);
      expect(payload.containsKey('base64'), isFalse);
      expect(payload['type'], 'damage');
      expect(payload['local_marker_id'], 'clmark-local-abc');
    });
  });

  // -------------------------------------------------------------------------
  // Group 6: SyncScreen widget
  // -------------------------------------------------------------------------

  group('SyncScreen — actions checklist (B-088)', () {
    testWidgets(
      '16. SyncScreen exibe action checklist na lista com label Checklist',
      (tester) async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _checklistAction(
            id: 'cl-display-1',
            type: ChecklistSyncActionTypes.runCreate,
          ),
        );

        await tester.pumpWidget(_wrapSync(queue: queue));
        await tester.pumpAndSettle();

        // SyncScreen renders human-readable label (not raw type string).
        expect(find.text('Checklist Run Create'), findsOneWidget);
        expect(find.textContaining('Checklist'), findsWidgets);
      },
    );
  });
}
