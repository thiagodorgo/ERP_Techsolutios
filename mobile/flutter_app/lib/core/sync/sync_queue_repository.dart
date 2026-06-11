import 'sync_models.dart';

abstract class SyncQueueRepository {
  Future<void> enqueue(SyncAction action);
  Future<List<SyncAction>> pendingForTenant(String tenantId);
  Future<void> update(SyncAction action);
}

class InMemorySyncQueueRepository implements SyncQueueRepository {
  final Map<String, SyncAction> _actionsById = <String, SyncAction>{};

  @override
  Future<void> enqueue(SyncAction action) async {
    if (action.tenantId.trim().isEmpty) {
      throw ArgumentError.value(
        action.tenantId,
        'tenantId',
        'tenantId is required',
      );
    }

    _actionsById.putIfAbsent(action.clientActionId, () => action);
  }

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async {
    return _actionsById.values
        .where((action) => action.tenantId == tenantId)
        .where(
          (action) =>
              action.status == SyncStatus.pending ||
              action.status == SyncStatus.failed ||
              action.status == SyncStatus.conflict,
        )
        .toList(growable: false);
  }

  @override
  Future<void> update(SyncAction action) async {
    _actionsById[action.clientActionId] = action;
  }
}
