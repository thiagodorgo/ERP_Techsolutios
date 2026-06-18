import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/work_order_models.dart';
import 'work_order_local_store.dart';

enum WorkOrderConflictResolution {
  keepLocalAndRetry,
  acceptServer,
  manualReview,
}

class WorkOrderConflictResolutionService {
  const WorkOrderConflictResolutionService({
    required SyncQueueRepository queue,
    required WorkOrderLocalStore store,
  }) : _queue = queue,
       _store = store;

  final SyncQueueRepository _queue;
  final WorkOrderLocalStore _store;

  Future<List<SyncAction>> conflictsForWorkOrder({
    required String tenantId,
    required String localId,
  }) async {
    final actions = await _queue.actionsForTenant(tenantId);
    return actions
        .where((action) => action.status == SyncStatus.conflict)
        .where((action) => action.type.startsWith('work_order.'))
        .where((action) => action.payload['local_id'] == localId)
        .toList(growable: false);
  }

  Future<void> resolve({
    required String tenantId,
    required String localId,
    required WorkOrderConflictResolution resolution,
  }) async {
    final conflicts = await conflictsForWorkOrder(
      tenantId: tenantId,
      localId: localId,
    );
    if (conflicts.isEmpty) return;

    switch (resolution) {
      case WorkOrderConflictResolution.keepLocalAndRetry:
        for (final action in conflicts) {
          await _queue.update(
            action.copyWith(
              status: SyncStatus.pending,
              clearLastErrorCode: true,
              clearLastSafeError: true,
              clearProcessedAt: true,
            ),
          );
        }
        await _updateOrder(localId, syncStatus: SyncStatus.pending);
        return;

      case WorkOrderConflictResolution.acceptServer:
        final serverId = _serverIdFrom(conflicts);
        if (serverId == null) {
          throw StateError(
            'Estado remoto insuficiente para aceitar com seguranca.',
          );
        }
        for (final action in conflicts) {
          await _queue.update(
            action.copyWith(
              status: SyncStatus.synced,
              processedAt: DateTime.now().toUtc(),
              clearLastErrorCode: true,
              clearLastSafeError: true,
            ),
          );
        }
        await _updateOrder(
          localId,
          syncStatus: SyncStatus.synced,
          serverId: serverId,
        );
        return;

      case WorkOrderConflictResolution.manualReview:
        for (final action in conflicts) {
          await _queue.update(
            action.copyWith(
              lastErrorCode: 'MANUAL_REVIEW_REQUIRED',
              lastSafeError: 'Conflito mantido para revisao manual.',
            ),
          );
        }
        await _updateOrder(localId, syncStatus: SyncStatus.conflict);
        return;
    }
  }

  String? _serverIdFrom(List<SyncAction> conflicts) {
    for (final action in conflicts) {
      for (final key in const ['result_ref', 'server_id', 'work_order_id']) {
        final value = action.payload[key];
        if (value is String &&
            value.trim().isNotEmpty &&
            !value.toLowerCase().startsWith('wo-local-')) {
          return value.trim();
        }
      }
    }
    return null;
  }

  Future<void> _updateOrder(
    String localId, {
    required SyncStatus syncStatus,
    String? serverId,
  }) async {
    final orders = await _store.loadWorkOrders();
    for (final current in orders) {
      if (current.localId != localId) continue;
      final WorkOrder next = current.copyWith(
        syncStatus: syncStatus,
        serverId: serverId,
      );
      await _store.saveWorkOrder(next);
      return;
    }
  }
}
