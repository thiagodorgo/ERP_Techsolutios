import 'dart:async';

import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/config/app_config.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_bridge.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/shared/ui/profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ---------------------------------------------------------------------------
// Fake fixed network status notifier (overrides build to return desired status)
// ---------------------------------------------------------------------------

class _FixedNetworkStatusNotifier extends NetworkStatusNotifier {
  _FixedNetworkStatusNotifier(this._fixedStatus);
  final NetworkStatus _fixedStatus;

  @override
  NetworkStatus build() => _fixedStatus;
}

// ---------------------------------------------------------------------------
// Fake connectivity source
// ---------------------------------------------------------------------------

class _FakeConnectivitySource implements ConnectivitySource {
  _FakeConnectivitySource([NetworkStatus initial = NetworkStatus.online])
    : _current = initial;

  NetworkStatus _current;
  final _controller = StreamController<NetworkStatus>.broadcast();

  void emit(NetworkStatus status) {
    _current = status;
    _controller.add(status);
  }

  @override
  Stream<NetworkStatus> get statusStream => _controller.stream;

  @override
  Future<NetworkStatus> fetchCurrent() async => _current;

  void dispose() => _controller.close();
}

// ---------------------------------------------------------------------------
// Fake auth notifier (extends AuthNotifier so type matches overrideWith)
// ---------------------------------------------------------------------------

class _FakeAuthNotifier extends AuthNotifier {
  _FakeAuthNotifier(this._state);

  final AuthState _state;
  bool logoutCalled = false;

  @override
  Future<AuthState> build() async => _state;

  @override
  Future<void> logout() async {
    logoutCalled = true;
    state = const AsyncValue.data(
      AuthState(status: AuthStatus.unauthenticated),
    );
  }
}

// ---------------------------------------------------------------------------
// Fake replay services (prevent Drift dependency in Profile tests)
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

class _CountingSync extends SyncReplayService {
  _CountingSync(this._onCall)
    : super(queue: _NullQueue(), api: MockExpenseSyncBatchApi());

  final void Function() _onCall;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    _onCall();
    return const SyncReplayResult(synced: [], failed: [], conflicts: []);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Not const: AuthTokens has DateTime, which cannot be const.
AuthState _authenticatedState() => AuthState(
  status: AuthStatus.authenticated,
  session: AuthSession(
    tokens: AuthTokens(
      accessToken: 'acc-test',
      expiresAt: DateTime(2099, 12, 31),
    ),
    user: const AuthUser(
      sub: 'u-test',
      email: 'tecnico@tenant.test',
      tenantId: 'tenant-demo',
      tenantRole: 'field_technician',
      tenantRoles: ['field_technician'],
      permissions: ['dashboard:read'],
      scope: 'tenant',
    ),
  ),
);

GoRouter _router() => GoRouter(
  initialLocation: '/profile',
  routes: [
    GoRoute(
      path: '/profile',
      builder: (context, state) => const ProfileScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) =>
          const Scaffold(body: Center(child: Text('Login'))),
    ),
  ],
);

/// Minimal overrides for ProfileScreen widget tests.
Widget _profileApp({
  AuthState? authState,
  BootstrapSession session = devBootstrapSession,
  NetworkStatus networkStatus = NetworkStatus.online,
}) {
  final state = authState ?? _authenticatedState();
  return ProviderScope(
    overrides: [
      authStateProvider.overrideWith(() => _FakeAuthNotifier(state)),
      bootstrapSessionProvider.overrideWith((ref) async => session),
      networkStatusProvider.overrideWith(
        () => _FixedNetworkStatusNotifier(networkStatus),
      ),
      syncReplayServiceProvider.overrideWithValue(_NoopSyncReplayService()),
      workOrderSyncReplayServiceProvider.overrideWithValue(
        _NoopWorkOrderSyncReplayService(),
      ),
      checklistSyncReplayServiceProvider.overrideWithValue(
        _NoopChecklistSyncReplayService(),
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
    child: MaterialApp.router(routerConfig: _router()),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // ── Group 1: ManualConnectivitySource (unit) ─────────────────────────────
  group('ManualConnectivitySource', () {
    test('t01 — fetchCurrent returns initial status', () async {
      final source = _FakeConnectivitySource(NetworkStatus.offline);
      expect(await source.fetchCurrent(), NetworkStatus.offline);
      source.dispose();
    });

    test('t02 — emitting online updates stream and fetchCurrent', () async {
      final source = _FakeConnectivitySource(NetworkStatus.offline);
      final received = <NetworkStatus>[];
      final sub = source.statusStream.listen(received.add);

      source.emit(NetworkStatus.online);
      await Future.delayed(Duration.zero);

      expect(received, [NetworkStatus.online]);
      expect(await source.fetchCurrent(), NetworkStatus.online);

      await sub.cancel();
      source.dispose();
    });

    test('t03 — emitting multiple statuses delivers all in order', () async {
      final source = _FakeConnectivitySource();
      final received = <NetworkStatus>[];
      final sub = source.statusStream.listen(received.add);

      source.emit(NetworkStatus.offline);
      source.emit(NetworkStatus.checking);
      source.emit(NetworkStatus.online);
      await Future.delayed(Duration.zero);

      expect(received, [
        NetworkStatus.offline,
        NetworkStatus.checking,
        NetworkStatus.online,
      ]);

      await sub.cancel();
      source.dispose();
    });
  });

  // ── Group 2: connectivityBridgeProvider ──────────────────────────────────
  group('connectivityBridgeProvider', () {
    test(
      't04 — connectivitySourceProvider is overrideável — bridge uses fake source',
      () async {
        final fakeSource = _FakeConnectivitySource(NetworkStatus.offline);

        final container = ProviderContainer(
          overrides: [connectivitySourceProvider.overrideWithValue(fakeSource)],
        );
        addTearDown(container.dispose);

        container.read(connectivityBridgeProvider);
        await Future.delayed(Duration.zero); // fetchCurrent completes

        expect(container.read(networkStatusProvider), NetworkStatus.offline);

        fakeSource.dispose();
      },
    );

    test(
      't05 — bridge propagates stream event to networkStatusProvider',
      () async {
        final fakeSource = _FakeConnectivitySource(NetworkStatus.online);

        final container = ProviderContainer(
          overrides: [connectivitySourceProvider.overrideWithValue(fakeSource)],
        );
        addTearDown(container.dispose);

        container.read(connectivityBridgeProvider);
        await Future.delayed(Duration.zero);

        fakeSource.emit(NetworkStatus.offline);
        await Future.delayed(Duration.zero);

        expect(container.read(networkStatusProvider), NetworkStatus.offline);

        fakeSource.dispose();
      },
    );

    test(
      't06 — auto sync fires when bridge transitions offline → online',
      () async {
        int syncCount = 0;
        final fakeSource = _FakeConnectivitySource(NetworkStatus.online);

        final container = ProviderContainer(
          overrides: [
            connectivitySourceProvider.overrideWithValue(fakeSource),
            bootstrapSessionProvider.overrideWith(
              (ref) async => devBootstrapSession,
            ),
            syncReplayServiceProvider.overrideWithValue(
              _CountingSync(() => syncCount++),
            ),
            workOrderSyncReplayServiceProvider.overrideWithValue(
              _NoopWorkOrderSyncReplayService(),
            ),
            checklistSyncReplayServiceProvider.overrideWithValue(
              _NoopChecklistSyncReplayService(),
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
        addTearDown(container.dispose);

        container.read(connectivityBridgeProvider);
        container.read(autoSyncCoordinatorProvider);
        await container.read(bootstrapSessionProvider.future);

        fakeSource.emit(NetworkStatus.offline);
        await Future.delayed(Duration.zero);
        fakeSource.emit(NetworkStatus.online);
        await Future.delayed(Duration.zero);
        await Future.delayed(Duration.zero);

        expect(syncCount, greaterThan(0));

        fakeSource.dispose();
      },
    );
  });

  // ── Group 3: ProfileScreen widget tests ──────────────────────────────────
  group('ProfileScreen', () {
    testWidgets('t07 — shows email and tenant role', (tester) async {
      await tester.pumpWidget(_profileApp());
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.textContaining('tecnico@tenant.demo'), findsWidgets);
      expect(find.textContaining('field_technician'), findsWidgets);
    });

    testWidgets('t08 — shows tenant display name', (tester) async {
      await tester.pumpWidget(_profileApp());
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      expect(find.textContaining('Tenant Demo'), findsWidgets);
    });

    testWidgets('t09 — shows auth mode label (local in test env)', (
      tester,
    ) async {
      await tester.pumpWidget(_profileApp());
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      expect(kIsRemoteAuth, isFalse);

      await tester.scrollUntilVisible(
        find.textContaining('Local (desenvolvimento)'),
        200.0,
      );
      expect(find.textContaining('Local (desenvolvimento)'), findsOneWidget);
    });

    testWidgets('t10 — shows connectivity online', (tester) async {
      await tester.pumpWidget(_profileApp(networkStatus: NetworkStatus.online));
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(find.text('Online'), 200.0);
      expect(find.text('Online'), findsOneWidget);
    });

    testWidgets('t11 — shows connectivity offline', (tester) async {
      await tester.pumpWidget(
        _profileApp(networkStatus: NetworkStatus.offline),
      );
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(find.text('Offline'), 200.0);
      expect(find.text('Offline'), findsOneWidget);
    });

    testWidgets('t12 — does NOT render access token value', (tester) async {
      await tester.pumpWidget(_profileApp());
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      // Scroll through entire list to force all lazy items to build
      await tester.drag(find.byType(ListView), const Offset(0, -5000));
      await tester.pumpAndSettle();

      expect(find.textContaining('acc-test'), findsNothing);
      expect(find.textContaining('Bearer'), findsNothing);
    });

    testWidgets('t13 — logout calls auth notifier logout', (tester) async {
      final notifier = _FakeAuthNotifier(_authenticatedState());

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authStateProvider.overrideWith(() => notifier),
            bootstrapSessionProvider.overrideWith(
              (ref) async => devBootstrapSession,
            ),
            syncReplayServiceProvider.overrideWithValue(
              _NoopSyncReplayService(),
            ),
            workOrderSyncReplayServiceProvider.overrideWithValue(
              _NoopWorkOrderSyncReplayService(),
            ),
            checklistSyncReplayServiceProvider.overrideWithValue(
              _NoopChecklistSyncReplayService(),
            ),
            evidenceSyncReplayServiceProvider.overrideWithValue(
              _NoopEvidenceSyncReplayService(),
            ),
          ],
          child: MaterialApp.router(routerConfig: _router()),
        ),
      );
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      await tester.scrollUntilVisible(find.text('Sair'), 200.0);
      await tester.tap(find.text('Sair'));
      await tester.pumpAndSettle();

      expect(notifier.logoutCalled, isTrue);
    });

    testWidgets('t14 — expired session shows warning and login button', (
      tester,
    ) async {
      final expiredState = AuthState(
        status: AuthStatus.expired,
        safeError: 'Sua sessao expirou. Faca login novamente.',
      );

      await tester.pumpWidget(_profileApp(authState: expiredState));
      await tester.pumpAndSettle();

      expect(find.textContaining('Sessao expirada'), findsOneWidget);
      expect(find.textContaining('Sua sessao expirou'), findsOneWidget);
      expect(find.text('Fazer login novamente'), findsOneWidget);
      expect(find.textContaining('Bearer'), findsNothing);
    });

    testWidgets('t15 — avatar shows initials from email', (tester) async {
      await tester.pumpWidget(_profileApp());
      await tester.pumpAndSettle();
      await tester.pump();
      await tester.pumpAndSettle();

      // email = 'tecnico@tenant.test' → first part = 'tecnico' → 'TE'
      expect(find.text('TE'), findsOneWidget);
    });
  });
}
