import 'sync_models.dart';

class SyncQueueSummary {
  const SyncQueueSummary({
    required this.total,
    required this.pending,
    required this.processed,
    required this.failed,
    required this.conflicts,
    required this.syncing,
    required this.local,
    required this.lastProcessedAt,
  });

  factory SyncQueueSummary.fromActions(Iterable<SyncAction> actions) {
    var total = 0;
    var pending = 0;
    var processed = 0;
    var failed = 0;
    var conflicts = 0;
    var syncing = 0;
    var local = 0;
    DateTime? lastProcessedAt;

    for (final action in actions) {
      total++;
      switch (action.status) {
        case SyncStatus.pending:
          pending++;
        case SyncStatus.synced:
          processed++;
        case SyncStatus.failed:
          failed++;
        case SyncStatus.conflict:
          conflicts++;
        case SyncStatus.syncing:
          syncing++;
        case SyncStatus.local:
          local++;
      }

      final processedAt = action.processedAt;
      if (processedAt != null &&
          (lastProcessedAt == null || processedAt.isAfter(lastProcessedAt))) {
        lastProcessedAt = processedAt;
      }
    }

    return SyncQueueSummary(
      total: total,
      pending: pending,
      processed: processed,
      failed: failed,
      conflicts: conflicts,
      syncing: syncing,
      local: local,
      lastProcessedAt: lastProcessedAt,
    );
  }

  final int total;
  final int pending;
  final int processed;
  final int failed;
  final int conflicts;
  final int syncing;
  final int local;
  final DateTime? lastProcessedAt;

  String get lastSyncLabel => lastProcessedAt?.toIso8601String() ?? 'nunca';
}
