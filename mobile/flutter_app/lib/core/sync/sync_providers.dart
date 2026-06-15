import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_notifier.dart';
import '../evidence/evidence_sync.dart';
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

final evidenceSyncBatchApiProvider = Provider<EvidenceSyncBatchApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingEvidenceSyncBatchApi();
  }

  return DioEvidenceSyncBatchApi(
    createAuthenticatedHttpClient(
      config,
      onRefresh: () async {
        await ref.read(authStateProvider.notifier).tryRefresh();
        return ref
            .read(authStateProvider)
            .maybeWhen(
              data: (state) => state.session?.tokens.accessToken,
              orElse: () => null,
            );
      },
      onClearSession: () => ref.read(authStateProvider.notifier).logout(),
    ),
  );
});

final evidenceSyncReplayServiceProvider = Provider<EvidenceSyncReplayService>(
  (ref) => EvidenceSyncReplayService(
    queue: ref.watch(syncQueueRepositoryProvider),
    api: ref.watch(evidenceSyncBatchApiProvider),
  ),
);
