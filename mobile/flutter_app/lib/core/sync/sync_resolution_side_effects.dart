import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_contracts.dart';
import 'sync_models.dart';
import 'sync_providers.dart';
import 'sync_queue_repository.dart';

typedef SyncResolutionSideEffect =
    Future<void> Function(SyncAction before, SyncAction after);

class SyncResolutionSideEffects {
  SyncResolutionSideEffects(this._queue);

  final SyncQueueRepository _queue;

  late final List<SyncResolutionSideEffect> _effects = [
    _cascadeExpenseReportUseServer,
  ];

  Future<void> apply(SyncAction before, SyncAction after) async {
    for (final effect in _effects) {
      await effect(before, after);
    }
  }

  Future<void> _cascadeExpenseReportUseServer(
    SyncAction before,
    SyncAction after,
  ) async {
    if (before.type != ExpenseSyncActionTypes.reportCreate) return;
    if (before.status != SyncStatus.conflict) return;
    if (after.status != SyncStatus.synced) return;

    final reportLocalId = _readString(before.payload['local_id']);
    if (reportLocalId == null) return;

    final actions = await _queue.actionsForTenant(after.tenantId);
    for (final action in actions) {
      if (action.clientActionId == after.clientActionId) continue;
      if (action.type != ExpenseSyncActionTypes.itemCreate &&
          action.type != ExpenseSyncActionTypes.reportSubmit) {
        continue;
      }
      if (_readString(action.payload['report_local_id']) != reportLocalId) {
        continue;
      }
      if (action.status == SyncStatus.synced) continue;

      await _queue.update(
        action.copyWith(
          status: SyncStatus.synced,
          processedAt: after.processedAt ?? DateTime.now().toUtc(),
          lastErrorCode: 'SUPERSEDED_BY_SERVER',
          lastSafeError: 'Substituído pela versão do gestor.',
        ),
      );
    }
  }
}

final syncResolutionSideEffectsProvider = Provider<SyncResolutionSideEffects>(
  (ref) => SyncResolutionSideEffects(ref.watch(syncQueueRepositoryProvider)),
);

String? _readString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;
