import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../local_db/database_provider.dart';
import '../local_db/drift_sync_action_store.dart';
import '../network/http_client.dart';
import 'sync_action_factory.dart';
import 'sync_action_store.dart';
import 'sync_engine.dart';
import 'sync_queue_repository.dart';
import 'sync_replay_service.dart';

final syncActionStoreProvider = Provider<SyncActionStore>(
  (ref) => DriftSyncActionStore(ref.watch(appDatabaseProvider)),
);

final syncQueueRepositoryProvider = Provider<SyncQueueRepository>(
  (ref) => PersistentSyncQueueRepository(ref.watch(syncActionStoreProvider)),
);

final syncActionFactoryProvider = Provider<SyncActionFactory>(
  (ref) => SyncActionFactory(),
);

final expenseSyncApiProvider = Provider<ExpenseSyncApi>(
  (ref) => MockExpenseSyncApi(SyncApiResult.success),
);

final syncEngineProvider = Provider<SyncEngine>((ref) {
  return SyncEngine(
    queue: ref.watch(syncQueueRepositoryProvider),
    api: ref.watch(expenseSyncApiProvider),
  );
});

final apiConfigProvider = Provider<ApiConfig>((ref) => const ApiConfig());

final syncBatchApiProvider = Provider<ExpenseSyncBatchApi>((ref) {
  final config = ref.watch(apiConfigProvider);
  return DioExpenseSyncBatchApi(createExpenseHttpClient(config));
});

final syncReplayServiceProvider = Provider<SyncReplayService>((ref) {
  return SyncReplayService(
    queue: ref.watch(syncQueueRepositoryProvider),
    api: ref.watch(syncBatchApiProvider),
  );
});

final checklistSyncBatchApiProvider = Provider<ChecklistSyncBatchApi>(
  (ref) => const PendingBackendChecklistSyncBatchApi(),
);

final checklistSyncReplayServiceProvider = Provider<ChecklistSyncReplayService>(
  (ref) {
    return ChecklistSyncReplayService(
      queue: ref.watch(syncQueueRepositoryProvider),
      api: ref.watch(checklistSyncBatchApiProvider),
    );
  },
);
