import '../../../core/network/api_contracts.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_replay_service.dart';
import 'expense_repository.dart';

typedef ExpenseSyncEntityUpdater =
    Future<void> Function(
      SyncAction action,
      SyncActionResult result,
      SyncStatus status,
    );

ExpenseSyncEntityUpdater buildExpenseSyncEntityUpdater(
  LocalExpenseRepository repository,
) {
  return (action, result, status) async {
    if (status != SyncStatus.synced) return;
    if (action.type != ExpenseSyncActionTypes.reportCreate) return;

    final rawLocalId = action.payload['local_id'];
    final serverId = result.resultRef;
    if (rawLocalId is! String || rawLocalId.trim().isEmpty) return;
    if (serverId == null || serverId.trim().isEmpty) return;

    await repository.markReportSynced(rawLocalId.trim(), serverId.trim());
  };
}
