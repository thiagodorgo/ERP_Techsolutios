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

    final rawLocalId = action.payload['local_id'];
    final serverId = result.resultRef;
    if (rawLocalId is! String || rawLocalId.trim().isEmpty) return;
    if (serverId == null || serverId.trim().isEmpty) return;

    if (action.type == ExpenseSyncActionTypes.reportCreate) {
      await repository.markReportSynced(rawLocalId.trim(), serverId.trim());
      return;
    }

    // B-RDV-COMPROVANTE: o comprovante precisa do serverId do ITEM para montar
    // a URL do upload multipart — o item processado no lote o grava aqui.
    if (action.type == ExpenseSyncActionTypes.itemCreate) {
      final rawReportLocalId = action.payload['report_local_id'];
      if (rawReportLocalId is! String || rawReportLocalId.trim().isEmpty) {
        return;
      }
      await repository.markItemSynced(
        rawReportLocalId.trim(),
        rawLocalId.trim(),
        serverId.trim(),
      );
    }
  };
}
