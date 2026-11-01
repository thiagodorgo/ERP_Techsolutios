import 'package:erp_techsolutions_mobile/core/sync/sync_conflict_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenantId = 'tenant-b-o6r-11';
const _type = 'expense_report.create';

SyncAction _action(
  String id, {
  required SyncStatus status,
  int retryCount = 0,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenantId,
  type: _type,
  payload: {'local_id': id},
  status: status,
  createdAt: DateTime.utc(2026, 10, 31),
  retryCount: retryCount,
);

CaptureBatchApi _capturingApi() => CaptureBatchApi(
  (batch) => [
    for (final action in batch)
      SyncActionResult(
        clientActionId: action.clientActionId,
        status: 'processed',
      ),
  ],
);

void main() {
  group('B-O6R-11 — despesa em conflito espera decisão', () {
    test('1. pending e failed entram no lote; conflict fica intacta', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(_action('pending', status: SyncStatus.pending));
      await queue.enqueue(
        _action('failed', status: SyncStatus.failed, retryCount: 1),
      );
      await queue.enqueue(
        _action('conflict', status: SyncStatus.conflict, retryCount: 3),
      );
      final api = _capturingApi();
      final service = SyncReplayService(
        queue: queue,
        api: api,
        supportedActionTypes: const {_type},
      );

      await service.replayTenant(_tenantId);

      expect(
        api.captured!.map((action) => action.clientActionId),
        orderedEquals(const ['pending', 'failed']),
      );
      final conflict = (await queue.actionsForTenant(
        _tenantId,
      )).singleWhere((action) => action.clientActionId == 'conflict');
      expect(conflict.status, SyncStatus.conflict);
      expect(conflict.retryCount, 3);
    });

    test('2. manter minha versão devolve a ação ao lote seguinte', () async {
      final queue = InMemorySyncQueueRepository();
      final conflict = _action(
        'conflict',
        status: SyncStatus.conflict,
        retryCount: 3,
      );
      await queue.enqueue(conflict);
      await queue.update(
        resolveConflictAction(conflict, ConflictChoice.keepMine),
      );
      final api = _capturingApi();
      final service = SyncReplayService(
        queue: queue,
        api: api,
        supportedActionTypes: const {_type},
      );

      await service.replayTenant(_tenantId);

      expect(api.captured, hasLength(1));
      expect(api.captured!.single.clientActionId, 'conflict');
    });
  });
}
