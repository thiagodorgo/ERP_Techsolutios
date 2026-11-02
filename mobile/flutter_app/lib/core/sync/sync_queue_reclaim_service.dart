import 'sync_interrupted_reclaim.dart';
import 'sync_queue_repository.dart';

class SyncQueueReclaimService {
  const SyncQueueReclaimService({
    required SyncQueueRepository queue,
    required bool Function() expenseChannelOff,
  }) : _queue = queue,
       _expenseChannelOff = expenseChannelOff;

  final SyncQueueRepository _queue;
  final bool Function() _expenseChannelOff;

  Future<void> reclaimTenant(String tenantId) async {
    final actions = await _queue.actionsForTenant(tenantId);
    final reclaimed = reclaimQueueAtPassStart(
      actions,
      expenseChannelOff: _expenseChannelOff(),
    );
    for (final action in reclaimed) {
      await _queue.update(action);
    }
  }
}
