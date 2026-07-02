// B-098 — Flutter Mobile Real Auth and Bootstrap
// Tests: DioAuthRepository, DioMobileBootstrapRepository (cache/restore),
//        LocalDevBootstrapRepository, BootstrapNotifier, TenantSelectorScreen,
//        HomeScreen bootstrap error state.
// All HTTP calls via _FakeHttpAdapter (no real network).

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_codec.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/auth/tenant_selector_screen.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Fake HTTP adapters ────────────────────────────────────────────────────────

class _FakeHttpAdapter implements HttpClientAdapter {
  _FakeHttpAdapter({required this.statusCode, this.body = const {}});

  final int statusCode;
  final Map<String, dynamic> body;
  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    if (statusCode >= 400) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response(requestOptions: options, statusCode: statusCode),
      );
    }
    return ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _NetworkErrorAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw DioException(
      requestOptions: options,
      type: DioExceptionType.connectionError,
    );
  }

  @override
  void close({bool force = false}) {}
}

// ── Test data helpers ─────────────────────────────────────────────────────────

Dio _fakeDio({int statusCode = 200, Map<String, dynamic> body = const {}}) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _FakeHttpAdapter(statusCode: statusCode, body: body);
  return dio;
}

Dio _networkErrorDio() {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = _NetworkErrorAdapter();
  return dio;
}

Map<String, dynamic> _sessionJson({
  String access = 'acc-tok-test',
  String refresh = 'ref-tok-test',
}) => {
  'tokens': {'accessToken': access, 'refreshToken': refresh, 'expiresIn': 3600},
  'user': {
    'sub': 'usr-001',
    'email': 'tecnico@empresa.test',
    'tenantId': 'ten-test',
    'tenantRole': 'field_technician',
    'tenantRoles': ['field_technician'],
    'permissions': ['dashboard:read', 'work_orders:read'],
    'scope': 'tenant',
  },
};

AuthSession fakeSession({String tenantId = 'ten-test'}) => AuthSession(
  tokens: AuthTokens(
    accessToken: 'acc-tok-test',
    refreshToken: 'ref-tok-test',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 8)),
  ),
  user: AuthUser(
    sub: 'usr-001',
    email: 'tecnico@empresa.test',
    tenantId: tenantId,
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    permissions: const ['dashboard:read', 'work_orders:read'],
    scope: 'tenant',
  ),
);

BootstrapSession fakeBootstrapSession({
  String tenantId = 'ten-test',
  String displayName = 'Empresa Teste',
  List<TenantContext>? availableTenants,
}) => BootstrapSession(
  activeTenant: TenantContext(tenantId: tenantId, displayName: displayName),
  availableTenants:
      availableTenants ??
      [TenantContext(tenantId: tenantId, displayName: displayName)],
  enabledModules: const [
    EnabledModule(
      id: 'field_operations',
      title: 'Operacoes de Campo',
      route: '/work-orders',
      requiredPermissions: ['work_orders:read'],
    ),
  ],
  permissions: const PermissionSet({'dashboard:read', 'work_orders:read'}),
);

// ── Group 1: DioAuthRepository ────────────────────────────────────────────────

void main() {
  group('1. DioAuthRepository', () {
    late InMemoryAuthTokenStorage storage;

    setUp(() => storage = InMemoryAuthTokenStorage());

    test('1.1 login sucesso — tokens armazenados no storage', () async {
      final repo = DioAuthRepository(
        client: _fakeDio(body: _sessionJson()),
        storage: storage,
      );

      final session = await repo.login(email: 'a@b.com', password: 'pw');

      expect(session.tokens.accessToken, 'acc-tok-test');
      expect(session.tokens.refreshToken, 'ref-tok-test');
      expect(session.user.tenantId, 'ten-test');
      expect(session.isExpired, isFalse);

      final stored = await storage.loadSession();
      expect(stored?.tokens.accessToken, 'acc-tok-test');
    });

    test('1.2 login com 401 lanca ApiUnauthorizedError', () async {
      final repo = DioAuthRepository(
        client: _fakeDio(statusCode: 401),
        storage: storage,
      );

      expect(
        () => repo.login(email: 'a@b.com', password: 'wrong'),
        throwsA(isA<ApiUnauthorizedError>()),
      );
    });

    test('1.3 login com erro de rede lanca ApiNetworkError', () async {
      final repo = DioAuthRepository(
        client: _networkErrorDio(),
        storage: storage,
      );

      expect(
        () => repo.login(email: 'a@b.com', password: 'pw'),
        throwsA(isA<ApiNetworkError>()),
      );
    });

    test('1.4 login com 503 lanca ApiServerError', () async {
      final repo = DioAuthRepository(
        client: _fakeDio(statusCode: 503),
        storage: storage,
      );

      expect(
        () => repo.login(email: 'a@b.com', password: 'pw'),
        throwsA(isA<ApiServerError>()),
      );
    });

    test('1.5 refresh sucesso — atualiza tokens no storage', () async {
      await storage.saveSession(fakeSession());
      final repo = DioAuthRepository(
        client: _fakeDio(
          body: _sessionJson(access: 'new-acc', refresh: 'new-ref'),
        ),
        storage: storage,
      );

      final refreshed = await repo.refresh();

      expect(refreshed.tokens.accessToken, 'new-acc');
      final stored = await storage.loadSession();
      expect(stored?.tokens.accessToken, 'new-acc');
    });

    test(
      '1.6 refresh sem token no storage lanca ApiUnauthorizedError',
      () async {
        final repo = DioAuthRepository(
          client: _fakeDio(body: _sessionJson()),
          storage: storage,
        );

        expect(repo.refresh, throwsA(isA<ApiUnauthorizedError>()));
      },
    );

    test('1.7 logout limpa session e bootstrap do storage', () async {
      await storage.saveSession(fakeSession());
      await storage.saveBootstrapJson('{"cached":true}');
      final repo = DioAuthRepository(client: _fakeDio(), storage: storage);

      await repo.logout();

      expect(await storage.loadSession(), isNull);
      expect(await storage.loadBootstrapJson(), isNull);
      expect(repo.currentSession(), isNull);
    });

    test(
      '1.8 restoreSession recupera sessao armazenada e atualiza currentSession',
      () async {
        await storage.saveSession(fakeSession());
        final repo = DioAuthRepository(client: _fakeDio(), storage: storage);

        final restored = await repo.restoreSession();

        expect(restored?.tokens.accessToken, 'acc-tok-test');
        expect(repo.currentSession()?.tokens.accessToken, 'acc-tok-test');
      },
    );

    test('1.9 clearSession limpa apenas session, nao bootstrap', () async {
      await storage.saveSession(fakeSession());
      await storage.saveBootstrapJson('{"v":1}');
      final repo = DioAuthRepository(client: _fakeDio(), storage: storage);

      await repo.clearSession();

      expect(await storage.loadSession(), isNull);
      expect(await storage.loadBootstrapJson(), '{"v":1}');
      expect(repo.currentSession(), isNull);
    });

    test(
      '1.10 safeMessage dos ApiErrors nao contem tokens ou caminhos privados',
      () {
        const token = 'Bearer eyJhbGciOiJIUzI1NiJ9.secret';
        final errors = [
          const ApiNetworkError(),
          const ApiTimeoutError(),
          const ApiUnauthorizedError(),
          const ApiConflictError(),
          const ApiServerError(statusCode: 500),
          const ApiIntegrationUnavailableError(),
        ];

        for (final err in errors) {
          expect(
            err.safeMessage.contains(token),
            isFalse,
            reason: '${err.runtimeType}.safeMessage nao deve conter token',
          );
          expect(err.safeMessage.toLowerCase().contains('bearer'), isFalse);
        }
      },
    );
  });

  // ── Group 2: DioMobileBootstrapRepository cache/restore ───────────────────

  group('2. DioMobileBootstrapRepository — cache e restore', () {
    late InMemoryAuthTokenStorage storage;

    setUp(() => storage = InMemoryAuthTokenStorage());

    test(
      '2.1 cache + restoreCached round-trip preserva activeTenant',
      () async {
        final repo = DioMobileBootstrapRepository(storage);
        final bs = fakeBootstrapSession();

        await repo.cache(bs);
        final restored = await repo.restoreCached();

        expect(restored?.activeTenant.tenantId, 'ten-test');
        expect(restored?.activeTenant.displayName, 'Empresa Teste');
      },
    );

    test('2.2 restoreCached retorna null quando cache esta vazio', () async {
      final repo = DioMobileBootstrapRepository(storage);

      expect(await repo.restoreCached(), isNull);
    });

    test('2.3 clearCache remove bootstrap do storage', () async {
      final repo = DioMobileBootstrapRepository(storage);
      await repo.cache(fakeBootstrapSession());
      expect(await repo.restoreCached(), isNotNull);

      await repo.clearCache();

      expect(await repo.restoreCached(), isNull);
    });

    test(
      '2.4 cache round-trip preserva enabledModules e permissions',
      () async {
        final repo = DioMobileBootstrapRepository(storage);
        final bs = fakeBootstrapSession();

        await repo.cache(bs);
        final restored = await repo.restoreCached();

        expect(restored?.enabledModules, hasLength(1));
        expect(restored?.enabledModules.first.id, 'field_operations');
        expect(restored?.permissions.contains('dashboard:read'), isTrue);
        expect(restored?.permissions.contains('work_orders:read'), isTrue);
      },
    );

    test('2.5 cache round-trip preserva availableTenants multiplos', () async {
      final repo = DioMobileBootstrapRepository(storage);
      final bs = fakeBootstrapSession(
        availableTenants: const [
          TenantContext(tenantId: 'ten-a', displayName: 'Empresa A'),
          TenantContext(tenantId: 'ten-b', displayName: 'Empresa B'),
        ],
      );

      await repo.cache(bs);
      final restored = await repo.restoreCached();

      expect(restored?.availableTenants, hasLength(2));
      expect(restored?.availableTenants.last.tenantId, 'ten-b');
    });

    test(
      '2.6 restoreCached retorna null e limpa storage em JSON corrompido',
      () async {
        await storage.saveBootstrapJson('{json invalido---}');
        final repo = DioMobileBootstrapRepository(storage);

        final restored = await repo.restoreCached();

        expect(restored, isNull);
        expect(await storage.loadBootstrapJson(), isNull);
      },
    );

    test('2.7 BootstrapSessionCodec encode/decode preserva mobilePolicy', () {
      final bs = fakeBootstrapSession();
      final encoded = BootstrapSessionCodec.encode(bs);
      final decoded = BootstrapSessionCodec.decode(encoded);

      expect(decoded.mobilePolicy.offlineEnabled, isTrue);
      expect(decoded.mobilePolicy.syncBatchSize, 25);
      expect(decoded.mobilePolicy.receiptMaxSizeMb, 10);
    });
  });

  // ── Group 3: LocalDevBootstrapRepository ──────────────────────────────────

  group('3. LocalDevBootstrapRepository', () {
    late InMemoryAuthTokenStorage storage;

    setUp(() => storage = InMemoryAuthTokenStorage());

    test('3.1 fetch(null) retorna devBootstrapSession completo', () async {
      final repo = LocalDevBootstrapRepository(storage);

      final bs = await repo.fetch(null);

      expect(
        bs.activeTenant.tenantId,
        devBootstrapSession.activeTenant.tenantId,
      );
      expect(
        bs.enabledModules.length,
        devBootstrapSession.enabledModules.length,
      );
      expect(bs.permissions.contains('expense_report:create'), isTrue);
      expect(bs.expenseCategories, isNotEmpty);
    });

    test(
      '3.2 fetch(session) usa dados da sessao para user e activeTenant',
      () async {
        final repo = LocalDevBootstrapRepository(storage);
        final session = fakeSession(tenantId: 'ten-customizado');

        final bs = await repo.fetch(session);

        expect(bs.activeTenant.tenantId, 'ten-customizado');
        expect(bs.user.email, 'tecnico@empresa.test');
        expect(bs.user.tenantRole, 'field_technician');
      },
    );

    test(
      '3.3 fetchForTenant seleciona tenant correto dentre os disponiveis',
      () async {
        final repo = LocalDevBootstrapRepository(storage);
        final session = fakeSession();

        // devBootstrapSession.availableTenants contains 'tenant-field'
        final bs = await repo.fetchForTenant(session, 'tenant-field');

        expect(bs.activeTenant.tenantId, 'tenant-field');
        expect(bs.activeTenant.displayName, 'Tenant Field Services');
      },
    );

    test(
      '3.4 fetchForTenant com tenantId inexistente mantem activeTenant original',
      () async {
        final repo = LocalDevBootstrapRepository(storage);
        final session = fakeSession();

        final bs = await repo.fetchForTenant(session, 'ten-inexistente');

        // Falls back to activeTenant returned by fetch()
        expect(bs.activeTenant.tenantId, isNotEmpty);
        expect(bs.availableTenants, isNotEmpty);
      },
    );

    test('3.5 cache/clearCache via storage', () async {
      final repo = LocalDevBootstrapRepository(storage);
      final bs = await repo.fetch(null);

      await repo.cache(bs);
      final restored = await repo.restoreCached();
      expect(restored?.activeTenant.tenantId, bs.activeTenant.tenantId);

      await repo.clearCache();
      expect(await repo.restoreCached(), isNull);
    });
  });

  // ── Group 4: BootstrapNotifier ─────────────────────────────────────────────

  group('4. BootstrapNotifier', () {
    ProviderContainer makeContainer({InMemoryAuthTokenStorage? storage}) {
      final st = storage ?? InMemoryAuthTokenStorage();
      return ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(st),
          authRepositoryProvider.overrideWithValue(
            LocalDevAuthRepository(storage: st),
          ),
        ],
      );
    }

    test(
      '4.1 build() em modo dev retorna session via LocalDevBootstrapRepository',
      () async {
        final st = InMemoryAuthTokenStorage();
        await st.saveSession(fakeSession());
        final container = makeContainer(storage: st);
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        final bs = await container.read(bootstrapNotifierProvider.future);

        expect(bs.activeTenant.tenantId, isNotEmpty);
        expect(bs.enabledModules, isNotEmpty);
      },
    );

    test('4.2 build() usa bootstrap cacheado quando disponivel', () async {
      final st = InMemoryAuthTokenStorage();
      await st.saveSession(fakeSession());
      // Pre-populate cache so repo.restoreCached() returns it
      await st.saveBootstrapJson(
        BootstrapSessionCodec.encode(fakeBootstrapSession()),
      );
      final container = makeContainer(storage: st);
      addTearDown(container.dispose);

      await container.read(authStateProvider.future);
      final bs = await container.read(bootstrapNotifierProvider.future);

      expect(bs.activeTenant.tenantId, 'ten-test');
    });

    test('4.3 retry() invalida estado e re-busca bootstrap', () async {
      final st = InMemoryAuthTokenStorage();
      await st.saveSession(fakeSession());
      final container = makeContainer(storage: st);
      addTearDown(container.dispose);

      await container.read(authStateProvider.future);
      await container.read(bootstrapNotifierProvider.future);

      await container.read(bootstrapNotifierProvider.notifier).retry();
      final bs2 = await container.read(bootstrapNotifierProvider.future);

      expect(bs2.activeTenant.tenantId, isNotEmpty);
    });

    test(
      '4.4 switchTenant() atualiza activeTenant no estado do notifier',
      () async {
        final st = InMemoryAuthTokenStorage();
        await st.saveSession(fakeSession());
        final container = makeContainer(storage: st);
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(bootstrapNotifierProvider.future);

        await container
            .read(bootstrapNotifierProvider.notifier)
            .switchTenant(
              const TenantContext(
                tenantId: 'tenant-field',
                displayName: 'Tenant Field Services',
              ),
            );

        final updated = container.read(bootstrapNotifierProvider).asData?.value;
        expect(updated?.activeTenant.tenantId, 'tenant-field');
      },
    );

    test(
      '4.5 pendingTenantSelection e false em modo local (kIsRemoteAuth=false)',
      () async {
        final st = InMemoryAuthTokenStorage();
        await st.saveSession(fakeSession());
        final container = makeContainer(storage: st);
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(bootstrapNotifierProvider.future);

        // kIsRemoteAuth is always false in test builds
        expect(
          container
              .read(bootstrapNotifierProvider.notifier)
              .pendingTenantSelection,
          isFalse,
        );
      },
    );

    test(
      '4.6 switchTenant() seta pendingTenantSelection=false apos selecao',
      () async {
        final st = InMemoryAuthTokenStorage();
        await st.saveSession(fakeSession());
        final container = makeContainer(storage: st);
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(bootstrapNotifierProvider.future);

        await container
            .read(bootstrapNotifierProvider.notifier)
            .switchTenant(
              const TenantContext(
                tenantId: 'tenant-demo',
                displayName: 'Tenant Demo',
              ),
            );

        expect(
          container
              .read(bootstrapNotifierProvider.notifier)
              .pendingTenantSelection,
          isFalse,
        );
      },
    );
  });

  // ── Group 5: TenantSelectorScreen widget ──────────────────────────────────

  group('5. TenantSelectorScreen', () {
    BootstrapSession multiTenantSession() => const BootstrapSession(
      activeTenant: TenantContext(
        tenantId: 'ten-a',
        displayName: 'Empresa Alpha',
      ),
      availableTenants: [
        TenantContext(tenantId: 'ten-a', displayName: 'Empresa Alpha'),
        TenantContext(tenantId: 'ten-b', displayName: 'Empresa Beta'),
      ],
      enabledModules: [],
      permissions: PermissionSet({'dashboard:read'}),
    );

    Widget buildScreen(BootstrapSession session) => ProviderScope(
      overrides: [
        bootstrapNotifierProvider.overrideWith(
          () => _FakeBootstrapNotifier(session),
        ),
      ],
      child: const MaterialApp(home: TenantSelectorScreen()),
    );

    testWidgets('5.1 exibe titulo da tela de selecao de empresa', (t) async {
      await t.pumpWidget(buildScreen(multiTenantSession()));
      await t.pumpAndSettle();

      expect(find.text('Selecionar empresa'), findsOneWidget);
    });

    testWidgets('5.2 exibe todos os tenants disponiveis', (t) async {
      await t.pumpWidget(buildScreen(multiTenantSession()));
      await t.pumpAndSettle();

      expect(find.text('Empresa Alpha'), findsOneWidget);
      expect(find.text('Empresa Beta'), findsOneWidget);
    });

    testWidgets('5.3 exibe botao Acessar para cada tenant', (t) async {
      await t.pumpWidget(buildScreen(multiTenantSession()));
      await t.pumpAndSettle();

      expect(find.text('Acessar'), findsNWidgets(2));
    });

    testWidgets('5.4 exibe instrucao para o usuario selecionar empresa', (
      t,
    ) async {
      await t.pumpWidget(buildScreen(multiTenantSession()));
      await t.pumpAndSettle();

      expect(find.textContaining('mais de uma empresa'), findsOneWidget);
    });

    testWidgets('5.5 exibe inicial do tenant no CircleAvatar', (t) async {
      await t.pumpWidget(buildScreen(multiTenantSession()));
      await t.pumpAndSettle();

      expect(find.text('E'), findsNWidgets(2)); // 'E' from 'Empresa Alpha/Beta'
    });
  });

  // ── Group 6: HomeScreen bootstrap error state ──────────────────────────────

  group('6. HomeScreen — estado de erro de bootstrap', () {
    Widget buildHomeWithError(Object error) => ProviderScope(
      // Riverpod 3.x auto-retries on Exception by default, which keeps the
      // provider in AsyncLoading (retrying:true) instead of AsyncError.
      // Disable retry so the error state is immediately visible in tests.
      retry: (_, _) => null,
      overrides: [
        bootstrapNotifierProvider.overrideWith(
          () => _ErrorBootstrapNotifier(error),
        ),
        expenseLocalStoreProvider.overrideWithValue(
          InMemoryExpenseLocalStore(),
        ),
        syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
        workOrderLocalStoreProvider.overrideWithValue(
          InMemoryWorkOrderLocalStore(),
        ),
      ],
      child: const MaterialApp(home: HomeScreen()),
    );

    testWidgets('6.1 exibe mensagem de erro de ApiError no bootstrap', (
      t,
    ) async {
      const error = ApiNetworkError('Sem conexao com o servidor.');
      await t.pumpWidget(buildHomeWithError(error));
      await t.pump(); // flush microtasks: AsyncNotifier.build() future rejects
      await t.pump(); // process widget rebuild with AsyncError state

      expect(find.textContaining('Sem conexao'), findsOneWidget);
    });

    testWidgets('6.2 exibe botao Tentar novamente no erro de bootstrap', (
      t,
    ) async {
      const error = ApiServerError(statusCode: 503);
      await t.pumpWidget(buildHomeWithError(error));
      await t.pump();
      await t.pump();

      expect(find.text('Tentar novamente'), findsOneWidget);
    });

    testWidgets('6.3 erro generico nao expoe detalhe interno', (t) async {
      await t.pumpWidget(
        buildHomeWithError(Exception('detalhe_interno_privado')),
      );
      await t.pump();
      await t.pump();

      expect(find.text('Tentar novamente'), findsOneWidget);
      expect(find.textContaining('detalhe_interno_privado'), findsNothing);
    });

    testWidgets('6.4 exibe icone de cloud_off no estado de erro', (t) async {
      const error = ApiTimeoutError();
      await t.pumpWidget(buildHomeWithError(error));
      await t.pump();
      await t.pump();

      expect(find.byIcon(Icons.cloud_off_outlined), findsOneWidget);
    });
  });
}

// ── Fake notifiers for widget tests ──────────────────────────────────────────

class _FakeBootstrapNotifier extends BootstrapNotifier {
  _FakeBootstrapNotifier(this._session);

  final BootstrapSession _session;

  @override
  Future<BootstrapSession> build() async => _session;

  @override
  Future<void> retry() async {}

  @override
  Future<void> switchTenant(TenantContext tenant) async {}
}

class _ErrorBootstrapNotifier extends BootstrapNotifier {
  _ErrorBootstrapNotifier(this._error);

  final Object _error;

  @override
  // Uses Future.error() so the rejection is delivered in one microtask hop.
  Future<BootstrapSession> build() => Future.error(_error);

  @override
  Future<void> retry() async {}

  @override
  Future<void> switchTenant(TenantContext tenant) async {}
}
