import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_notifier.dart';
import '../evidence/evidence_blob_store.dart';
import '../evidence/evidence_sync.dart';
import '../evidence/evidence_upload.dart';
import '../local_db/database_provider.dart';
import '../local_db/drift_work_order_local_store.dart';
import '../local_db/drift_sync_action_store.dart';
import '../location/device_location_provider.dart';
import '../location/field_location_api.dart';
import '../location/field_location_service.dart';
import '../location/field_location_store.dart';
import '../network/api_contracts.dart';
import '../network/http_client.dart';
import '../../features/work_orders/data/work_order_local_store.dart';
import 'sync_action_factory.dart';
import 'sync_action_store.dart';
import 'sync_engine.dart';
import 'sync_models.dart';
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

final _fieldLocationFallbackStore = InMemoryFieldLocationStore();

final fieldLocationStoreProvider = Provider<FieldLocationStore>((ref) {
  try {
    return DriftFieldLocationStore(ref.watch(appDatabaseProvider));
  } catch (_) {
    return _fieldLocationFallbackStore;
  }
});

final deviceLocationProvider = Provider<DeviceLocationProvider>(
  (ref) => const PendingDeviceLocationProvider(),
);

final fieldLocationApiProvider = Provider<FieldLocationApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingFieldLocationApi();
  }

  return DioFieldLocationApi(
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

final fieldLocationSyncServiceProvider = Provider<FieldLocationSyncService>(
  (ref) => FieldLocationSyncService(
    store: ref.watch(fieldLocationStoreProvider),
    api: ref.watch(fieldLocationApiProvider),
    deviceLocationProvider: ref.watch(deviceLocationProvider),
  ),
);

final syncBatchApiProvider = Provider<ExpenseSyncBatchApi>((ref) {
  final config = ref.watch(apiConfigProvider);
  return DioExpenseSyncBatchApi(createExpenseHttpClient(config));
});

final syncReplayServiceProvider = Provider<SyncReplayService>((ref) {
  return SyncReplayService(
    queue: ref.watch(syncQueueRepositoryProvider),
    api: ref.watch(syncBatchApiProvider),
    supportedActionTypes: ExpenseSyncActionTypes.supported,
  );
});

final workOrderSyncBatchApiProvider = Provider<WorkOrderSyncBatchApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingBackendWorkOrderSyncBatchApi();
  }

  return DioWorkOrderSyncBatchApi(
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

final workOrderSyncReplayServiceProvider = Provider<WorkOrderSyncReplayService>(
  (ref) {
    final store = DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider));
    return WorkOrderSyncReplayService(
      queue: ref.watch(syncQueueRepositoryProvider),
      api: ref.watch(workOrderSyncBatchApiProvider),
      entityUpdater: buildWorkOrderSyncEntityUpdater(store),
    );
  },
);

WorkOrderSyncEntityUpdater buildWorkOrderSyncEntityUpdater(
  WorkOrderLocalStore store,
) {
  return (action, result, status) async {
    final rawLocalId = action.payload['local_id'];
    if (rawLocalId is! String || rawLocalId.trim().isEmpty) return;

    final localId = rawLocalId.trim();
    final orders = await store.loadWorkOrders();
    for (final current in orders) {
      if (current.localId != localId) continue;

      final next = switch (status) {
        SyncStatus.synced => current.copyWith(
          syncStatus: SyncStatus.synced,
          serverId: result.resultRef ?? current.serverId,
        ),
        SyncStatus.conflict => current.copyWith(
          syncStatus: SyncStatus.conflict,
        ),
        _ => current,
      };

      if (next != current) {
        await store.saveWorkOrder(next);
      }
      return;
    }
  };
}

final checklistSyncBatchApiProvider = Provider<ChecklistSyncBatchApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingBackendChecklistSyncBatchApi();
  }

  return DioChecklistSyncBatchApi(
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

final checklistSyncReplayServiceProvider = Provider<ChecklistSyncReplayService>(
  (ref) {
    return ChecklistSyncReplayService(
      queue: ref.watch(syncQueueRepositoryProvider),
      api: ref.watch(checklistSyncBatchApiProvider),
      supportedActionTypes: b102BackendChecklistActionTypes,
      extraEligibility: b102ChecklistActionReadyForBackend,
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

final evidenceSyncReplayServiceProvider = Provider<EvidenceSyncReplayService>((
  ref,
) {
  final store = DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider));
  return EvidenceSyncReplayService(
    queue: ref.watch(syncQueueRepositoryProvider),
    api: ref.watch(evidenceSyncBatchApiProvider),
    entityUpdater: buildEvidenceSyncEntityUpdater(store),
  );
});

EvidenceSyncEntityUpdater buildEvidenceSyncEntityUpdater(
  WorkOrderLocalStore store,
) {
  return (action, result, status) async {
    final rawLocalEvidenceId =
        action.payload['local_evidence_id'] ?? action.clientActionId;
    if (rawLocalEvidenceId is! String || rawLocalEvidenceId.trim().isEmpty) {
      return;
    }

    final current = await store.findEvidence(rawLocalEvidenceId.trim());
    if (current == null) return;

    final next = switch (status) {
      SyncStatus.synced => current.copyWith(
        syncStatus: SyncStatus.synced,
        serverId: result?.evidenceId ?? current.serverId,
        uploadStatus: current.localBlobRef == null
            ? current.uploadStatus
            : SyncStatus.pending,
      ),
      SyncStatus.conflict => current.copyWith(
        syncStatus: SyncStatus.conflict,
        uploadStatus: SyncStatus.conflict,
      ),
      _ => current,
    };

    if (next != current) {
      await store.saveEvidence(next);
    }
  };
}

final evidenceUploadApiProvider = Provider<EvidenceUploadApi>((ref) {
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) {
    return const PendingEvidenceUploadApi();
  }

  return DioEvidenceUploadApi(
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

final evidenceBinaryUploadServiceProvider =
    Provider<EvidenceBinaryUploadService>(
      (ref) => EvidenceBinaryUploadService(
        store: DriftWorkOrderLocalStore(ref.watch(appDatabaseProvider)),
        blobStore: ref.watch(evidenceBlobStoreProvider),
        api: ref.watch(evidenceUploadApiProvider),
      ),
    );
