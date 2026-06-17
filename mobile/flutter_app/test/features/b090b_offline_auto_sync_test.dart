import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/shared/ui/erp_components.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Fakes — queue
// ---------------------------------------------------------------------------

class _NullQueue implements SyncQueueRepository {
  @override
  Future<void> enqueue(SyncAction action) async {}
  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async => const [];
  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async => const [];
  @override
  Future<void> update(SyncAction action) async {}
}

// ---------------------------------------------------------------------------
// Fakes — replay services
// ---------------------------------------------------------------------------

class _NoopSyncReplayService extends SyncReplayService {
  _NoopSyncReplayService()
    : super(queue: _NullQueue(), api: MockExpenseSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopChecklistSyncReplayService extends ChecklistSyncReplayService {
  _NoopChecklistSyncReplayService()
    : super(queue: _NullQueue(), api: MockChecklistSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopWorkOrderSyncReplayService extends WorkOrderSyncReplayService {
  _NoopWorkOrderSyncReplayService()
    : super(queue: _NullQueue(), api: MockWorkOrderSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopEvidenceSyncReplayService extends EvidenceSyncReplayService {
  _NoopEvidenceSyncReplayService()
    : super(queue: _NullQueue(), api: const PendingEvidenceSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _CountingSyncReplayService extends SyncReplayService {
  _CountingSyncReplayService()
    : super(queue: _NullQueue(), api: MockExpenseSyncBatchApi());

  int callCount = 0;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    callCount++;
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _CountingWorkOrderSyncReplayService extends WorkOrderSyncReplayService {
  _CountingWorkOrderSyncReplayService()
    : super(queue: _NullQueue(), api: MockWorkOrderSyncBatchApi());

  int callCount = 0;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    callCount++;
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

class _ThrowingSyncReplayService extends SyncReplayService {
  _ThrowingSyncReplayService()
    : super(queue: _NullQueue(), api: MockExpenseSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      throw const ApiNetworkError();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

BootstrapSession _fakeSession() => const BootstrapSession(
  activeTenant: TenantContext(
    tenantId: 'tenant-b090b',
    displayName: 'B090B Test',
  ),
  enabledModules: [],
  permissions: PermissionSet({'dashboard:read'}),
);

ProviderContainer _container({
  SyncReplayService? syncService,
  WorkOrderSyncReplayService? workOrderService,
  ChecklistSyncReplayService? checklistService,
  bool authenticated = true,
}) {
  return ProviderContainer(
    overrides: [
      bootstrapSessionProvider.overrideWith(
        (ref) async =>
            authenticated ? _fakeSession() : throw Exception('unauthenticated'),
      ),
      syncReplayServiceProvider.overrideWithValue(
        syncService ?? _NoopSyncReplayService(),
      ),
      workOrderSyncReplayServiceProvider.overrideWithValue(
        workOrderService ?? _NoopWorkOrderSyncReplayService(),
      ),
      checklistSyncReplayServiceProvider.overrideWithValue(
        checklistService ?? _NoopChecklistSyncReplayService(),
      ),
      evidenceSyncReplayServiceProvider.overrideWithValue(
        _NoopEvidenceSyncReplayService(),
      ),
      evidenceBinaryUploadServiceProvider.overrideWithValue(
        EvidenceBinaryUploadService(
          store: InMemoryWorkOrderLocalStore(),
          blobStore: InMemoryEvidenceBlobStore(),
          api: const PendingEvidenceUploadApi(),
        ),
      ),
    ],
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // ── Group 1: NetworkStatusNotifier ────────────────────────────────────────
  group('NetworkStatusNotifier', () {
    test('t01 — starts online (optimistic default)', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      expect(container.read(networkStatusProvider), NetworkStatus.online);
    });

    test('t02 — setOffline / setOnline transitions correctly', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(networkStatusProvider.notifier);

      notifier.setOffline();
      expect(container.read(networkStatusProvider), NetworkStatus.offline);

      notifier.setOnline();
      expect(container.read(networkStatusProvider), NetworkStatus.online);
    });

    test('t03 — setStatus covers all values', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(networkStatusProvider.notifier);

      for (final status in NetworkStatus.values) {
        notifier.setStatus(status);
        expect(container.read(networkStatusProvider), status);
      }
    });
  });

  // ── Group 2: NetworkStatusBanner widget ───────────────────────────────────
  group('NetworkStatusBanner widget', () {
    testWidgets('t04 — invisible when online', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: NetworkStatusBanner(status: NetworkStatus.online),
          ),
        ),
      );

      // SizedBox.shrink has zero size — no banner text visible
      expect(find.byType(Container), findsNothing);
      expect(find.text('Modo offline'), findsNothing);
    });

    testWidgets('t05 — shows offline message when offline', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: NetworkStatusBanner(status: NetworkStatus.offline),
          ),
        ),
      );

      expect(find.textContaining('Modo offline'), findsOneWidget);
      expect(find.byIcon(Icons.wifi_off_outlined), findsOneWidget);
    });

    testWidgets('t06 — shows checking message when checking', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: NetworkStatusBanner(status: NetworkStatus.checking),
          ),
        ),
      );

      expect(find.textContaining('Verificando conexao'), findsOneWidget);
      expect(find.byIcon(Icons.sync_outlined), findsOneWidget);
    });
  });

  // ── Group 3: AutoSyncCoordinator ──────────────────────────────────────────
  group('AutoSyncCoordinator', () {
    test('t07 — initial state is idle with no error', () {
      final container = _container();
      addTearDown(container.dispose);

      // Read to initialize the notifier and its ref.listen
      final state = container.read(autoSyncCoordinatorProvider);

      expect(state.isRunning, isFalse);
      expect(state.lastSyncAt, isNull);
      expect(state.lastSafeError, isNull);
      expect(state.hasError, isFalse);
    });

    test(
      't08 — offline→online transition triggers sync and updates lastSyncAt',
      () async {
        final container = _container();
        addTearDown(container.dispose);

        // Resolve session first so asData is non-null when _triggerSync runs
        await container.read(bootstrapSessionProvider.future);

        // Initialize the coordinator (registers ref.listen)
        container.read(autoSyncCoordinatorProvider);

        // Set offline first so the transition fires
        container.read(networkStatusProvider.notifier).setOffline();
        container.read(networkStatusProvider.notifier).setOnline();

        // Drain the async chain
        await Future.delayed(Duration.zero);
        await Future.delayed(Duration.zero);

        final state = container.read(autoSyncCoordinatorProvider);
        expect(state.isRunning, isFalse);
        expect(state.lastSyncAt, isNotNull);
        expect(state.hasError, isFalse);
      },
    );

    test('t09 — concurrent calls are ignored (only one sync runs)', () async {
      final counting = _CountingSyncReplayService();
      final container = _container(syncService: counting);
      addTearDown(container.dispose);

      await container.read(bootstrapSessionProvider.future);
      container.read(autoSyncCoordinatorProvider);
      final notifier = container.read(autoSyncCoordinatorProvider.notifier);

      // Fire two manual triggers without awaiting
      final f1 = notifier.triggerManual();
      final f2 = notifier.triggerManual();
      await Future.wait([f1, f2]);
      await Future.delayed(Duration.zero);

      // Only one replayTenant call despite two trigger attempts
      expect(counting.callCount, 1);
    });

    test('t09b — manual trigger chama WorkOrder sync', () async {
      final counting = _CountingWorkOrderSyncReplayService();
      final container = _container(workOrderService: counting);
      addTearDown(container.dispose);

      await container.read(bootstrapSessionProvider.future);
      container.read(autoSyncCoordinatorProvider);
      await container
          .read(autoSyncCoordinatorProvider.notifier)
          .triggerManual();

      expect(counting.callCount, 1);
    });

    test('t10 — manual triggerManual syncs and updates lastSyncAt', () async {
      final container = _container();
      addTearDown(container.dispose);

      await container.read(bootstrapSessionProvider.future);
      container.read(autoSyncCoordinatorProvider);
      await container
          .read(autoSyncCoordinatorProvider.notifier)
          .triggerManual();
      await Future.delayed(Duration.zero);

      final state = container.read(autoSyncCoordinatorProvider);
      expect(state.isRunning, isFalse);
      expect(state.lastSyncAt, isNotNull);
    });

    test(
      't11 — sync failure stores safe error, does not expose token or stacktrace',
      () async {
        final container = _container(syncService: _ThrowingSyncReplayService());
        addTearDown(container.dispose);

        await container.read(bootstrapSessionProvider.future);
        container.read(autoSyncCoordinatorProvider);
        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();
        await Future.delayed(Duration.zero);

        final state = container.read(autoSyncCoordinatorProvider);
        expect(state.isRunning, isFalse);
        expect(state.hasError, isTrue);
        // Must be the human-readable message, not an exception dump
        expect(state.lastSafeError, isNot(contains('Exception')));
      },
    );

    test(
      't12 — no session → sync is skipped silently (no error state)',
      () async {
        final container = _container(authenticated: false);
        addTearDown(container.dispose);

        container.read(autoSyncCoordinatorProvider);
        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();
        await Future.delayed(Duration.zero);

        final state = container.read(autoSyncCoordinatorProvider);
        expect(state.isRunning, isFalse);
        expect(state.hasError, isFalse);
        expect(state.lastSyncAt, isNull);
      },
    );

    test(
      't13 — online→online transition does NOT trigger sync (no false positive)',
      () async {
        final counting = _CountingSyncReplayService();
        final container = _container(syncService: counting);
        addTearDown(container.dispose);

        container.read(autoSyncCoordinatorProvider);

        // Both transitions start from online (the default)
        container.read(networkStatusProvider.notifier).setOnline();
        container.read(networkStatusProvider.notifier).setOnline();

        await Future.delayed(Duration.zero);

        // No sync triggered — prev was online, not offline
        expect(counting.callCount, 0);
      },
    );
  });

  // ── Group 4: Safety ───────────────────────────────────────────────────────
  group('Safety — no token leakage', () {
    test(
      't14 — AutoSyncState fields never contain token-shaped strings',
      () async {
        final container = _container();
        addTearDown(container.dispose);

        await container.read(bootstrapSessionProvider.future);
        container.read(autoSyncCoordinatorProvider);
        await container
            .read(autoSyncCoordinatorProvider.notifier)
            .triggerManual();
        await Future.delayed(Duration.zero);

        final state = container.read(autoSyncCoordinatorProvider);

        // Ensure no Bearer / jwt-shaped content appears in any state field
        final safeError = state.lastSafeError ?? '';
        expect(safeError.toLowerCase(), isNot(contains('bearer')));
        expect(safeError.toLowerCase(), isNot(contains('token')));
        expect(safeError.toLowerCase(), isNot(contains('eyj')));
      },
    );
  });
}
