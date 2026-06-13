import 'sync_models.dart';
import 'sync_action_store.dart';

abstract class SyncQueueRepository {
  Future<void> enqueue(SyncAction action);
  Future<List<SyncAction>> pendingForTenant(String tenantId);
  Future<List<SyncAction>> actionsForTenant(String tenantId);
  Future<void> update(SyncAction action);
}

class PersistentSyncQueueRepository implements SyncQueueRepository {
  PersistentSyncQueueRepository(this._store);

  final SyncActionStore _store;

  @override
  Future<void> enqueue(SyncAction action) async {
    if (action.tenantId.trim().isEmpty) {
      throw ArgumentError.value(
        action.tenantId,
        'tenantId',
        'tenantId is required',
      );
    }

    final actions = await _store.load();
    if (actions.any(
      (existing) => existing.clientActionId == action.clientActionId,
    )) {
      return;
    }

    await _store.save([...actions, action]);
  }

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async {
    final actions = await actionsForTenant(tenantId);
    return actions
        .where(
          (action) =>
              action.status == SyncStatus.pending ||
              action.status == SyncStatus.failed ||
              action.status == SyncStatus.conflict,
        )
        .toList(growable: false);
  }

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async {
    final actions = await _store.load();
    return actions
        .where((action) => action.tenantId == tenantId)
        .toList(growable: false);
  }

  @override
  Future<void> update(SyncAction action) async {
    final actions = await _store.load();
    await _store.save([
      for (final existing in actions)
        if (existing.clientActionId == action.clientActionId)
          action
        else
          existing,
    ]);
  }
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
  Future<List<SyncAction>> actionsForTenant(String tenantId) async {
    return _actionsById.values
        .where((action) => action.tenantId == tenantId)
        .toList(growable: false);
  }

  @override
  Future<void> update(SyncAction action) async {
    _actionsById[action.clientActionId] = action;
  }
}
