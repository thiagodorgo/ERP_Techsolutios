import '../network/api_contracts.dart';
import 'sync_models.dart';
import 'sync_stalled_resolver.dart';

enum SyncPresentation {
  awaitingBackend,
  pending,
  syncing,
  failed,
  stalled,
  conflict,
  synced,
  discarded,
  local,
}

SyncPresentation presentSyncAction(
  SyncAction action, {
  required bool expenseChannelOff,
}) {
  if (expenseChannelOff &&
      ExpenseSyncActionTypes.supported.contains(action.type) &&
      (action.status == SyncStatus.pending ||
          action.status == SyncStatus.failed ||
          action.status == SyncStatus.syncing)) {
    return SyncPresentation.awaitingBackend;
  }

  return switch (action.status) {
    SyncStatus.local => SyncPresentation.local,
    SyncStatus.pending => SyncPresentation.pending,
    SyncStatus.syncing => SyncPresentation.syncing,
    SyncStatus.failed =>
      isStalledAction(action)
          ? SyncPresentation.stalled
          : SyncPresentation.failed,
    SyncStatus.conflict => SyncPresentation.conflict,
    SyncStatus.synced =>
      action.lastErrorCode == syncDiscardedErrorCode
          ? SyncPresentation.discarded
          : SyncPresentation.synced,
  };
}

class SyncPresentationCounts {
  const SyncPresentationCounts({
    required this.pending,
    required this.synced,
    required this.errors,
    required this.conflicts,
  });

  factory SyncPresentationCounts.fromActions(
    Iterable<SyncAction> actions, {
    required bool expenseChannelOff,
  }) {
    var pending = 0;
    var synced = 0;
    var errors = 0;
    var conflicts = 0;
    for (final action in actions) {
      switch (presentSyncAction(action, expenseChannelOff: expenseChannelOff)) {
        case SyncPresentation.awaitingBackend:
        case SyncPresentation.pending:
          pending++;
        case SyncPresentation.synced:
          synced++;
        case SyncPresentation.failed:
        case SyncPresentation.stalled:
          errors++;
        case SyncPresentation.conflict:
          conflicts++;
        case SyncPresentation.syncing:
        case SyncPresentation.discarded:
        case SyncPresentation.local:
          break;
      }
    }
    return SyncPresentationCounts(
      pending: pending,
      synced: synced,
      errors: errors,
      conflicts: conflicts,
    );
  }

  final int pending;
  final int synced;
  final int errors;
  final int conflicts;
}
