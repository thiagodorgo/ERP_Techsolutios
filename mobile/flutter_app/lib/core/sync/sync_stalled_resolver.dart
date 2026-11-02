import '../network/api_contracts.dart';
import 'sync_models.dart';

const kSyncMaxRetry = 5;
const syncDiscardedErrorCode = 'DISCARDED_BY_TECHNICIAN';
const syncDiscardedSafeError =
    'Descartado neste aparelho. Se chegou ao servidor antes da falha, o '
    'registro continua lá.';

bool isStalledAction(SyncAction action) =>
    action.status == SyncStatus.failed && action.retryCount >= kSyncMaxRetry;

bool canDiscardSyncAction(String type) =>
    !ExpenseSyncActionTypes.supported.contains(type);

enum StalledChoice { retry, discard }

SyncAction resolveStalledAction(
  SyncAction action,
  StalledChoice choice, {
  DateTime? resolvedAt,
}) {
  if (!isStalledAction(action)) return action;

  return switch (choice) {
    StalledChoice.retry => action.copyWith(
      status: SyncStatus.pending,
      retryCount: 0,
      clearLastErrorCode: true,
      clearLastSafeError: true,
      clearProcessedAt: true,
    ),
    StalledChoice.discard when canDiscardSyncAction(action.type) =>
      action.copyWith(
        status: SyncStatus.synced,
        lastErrorCode: syncDiscardedErrorCode,
        lastSafeError: syncDiscardedSafeError,
        processedAt: resolvedAt ?? DateTime.now().toUtc(),
      ),
    StalledChoice.discard => action,
  };
}
