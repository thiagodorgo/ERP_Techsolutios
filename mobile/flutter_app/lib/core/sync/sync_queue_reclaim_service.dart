import 'sync_interrupted_reclaim.dart';
import 'sync_queue_repository.dart';

class SyncQueueReclaimService {
  const SyncQueueReclaimService({required SyncQueueRepository queue})
    : _queue = queue;

  final SyncQueueRepository _queue;

  Future<void> reclaimTenant(String tenantId) async {
    final actions = await _queue.actionsForTenant(tenantId);
    final reclaimed = reclaimInterruptedSyncing(actions);
    for (final action in reclaimed) {
      await _queue.update(action);
    }
  }
}
