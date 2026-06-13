import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/config/app_config.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Fake HTTP adapters
// ---------------------------------------------------------------------------

// First call → throws DioException(401); subsequent calls → returns 200.
// Captures the Authorization header from every call.
class _CountingAdapter implements HttpClientAdapter {
  int callCount = 0;
  final List<String> capturedAuthHeaders = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    callCount++;
    capturedAuthHeaders.add(options.headers['Authorization'] as String? ?? '');
    if (callCount == 1) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response(requestOptions: options, statusCode: 401),
      );
    }
    return ResponseBody.fromString(
      jsonEncode(<String, dynamic>{'data': 'ok'}),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

// Delegates to a sync handler; captured requests are available for assertion.
class _StaticAdapter implements HttpClientAdapter {
  _StaticAdapter(this.handler);

  final ResponseBody Function(RequestOptions) handler;
  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

// Always throws a connection error.
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

// ---------------------------------------------------------------------------
// Fake auth repository (throws on refresh to simulate expired token)
// ---------------------------------------------------------------------------

class _ThrowingAuthRepository extends LocalDevAuthRepository {
  _ThrowingAuthRepository() : super(storage: InMemoryAuthTokenStorage());

  @override
  Future<AuthSession> refresh() async => throw const ApiUnauthorizedError();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Minimal valid session JSON matching DioAuthRepository._sessionFromJson
Map<String, dynamic> _sessionJson({
  String access = 'acc-tok-test',
  String refresh = 'ref-tok-test',
}) => {
  'tokens': {'accessToken': access, 'refreshToken': refresh, 'expiresIn': 3600},
  'user': {
    'sub': 'user-test-1',
    'email': 'test@tenant.test',
    'tenantId': 'tenant-test',
    'tenantRole': 'field_technician',
    'tenantRoles': ['field_technician'],
    'permissions': ['dashboard:read'],
    'scope': 'tenant',
  },
};

// Pre-built session for direct storage seeding (does not involve HTTP)
AuthSession _storedSession({String refresh = 'stored-refresh-tok'}) =>
    AuthSession(
      tokens: AuthTokens(
        accessToken: 'old-access',
        refreshToken: refresh,
        expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
      ),
      user: const AuthUser(
        sub: 'u1',
        email: 'u@t.test',
        tenantId: 'tenant-1',
        tenantRole: 'field_technician',
        tenantRoles: ['field_technician'],
        permissions: ['dashboard:read'],
        scope: 'tenant',
      ),
    );

// Creates an authenticated Dio client for interceptor tests, then replaces
// the adapter with the supplied one and sets SyncTransformer.
Dio _authedDio({
  String accessToken = 'old-token',
  required Future<String?> Function() onRefresh,
  required Future<void> Function() onClearSession,
  required HttpClientAdapter adapter,
}) {
  final dio = createAuthenticatedHttpClient(
    ApiConfig(baseUrl: 'https://test.local', accessToken: accessToken),
    onRefresh: onRefresh,
    onClearSession: onClearSession,
  );
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = adapter;
  return dio;
}

// Creates a plain DioAuthRepository backed by a fake adapter (no interceptor).
DioAuthRepository _dioRepo(HttpClientAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = adapter;
  return DioAuthRepository(client: dio, storage: InMemoryAuthTokenStorage());
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  // ── Group 1: compile-time constant ────────────────────────────────────────
  group('kIsRemoteAuth constant', () {
    test('t01 — is false in test environment (dart-define not set)', () {
      // Without --dart-define=ERP_AUTH_MODE=remote, kAuthMode defaults to 'local'
      expect(kIsRemoteAuth, isFalse);
    });
  });

  // ── Group 2: AuthRefreshInterceptor ───────────────────────────────────────
  group('AuthRefreshInterceptor', () {
    test(
      't02 — 401 triggers refresh, retries with new token, and resolves',
      () async {
        bool refreshCalled = false;
        final adapter = _CountingAdapter();
        final dio = _authedDio(
          onRefresh: () async {
            refreshCalled = true;
            return 'new-access-token';
          },
          onClearSession: () async {},
          adapter: adapter,
        );

        final response = await dio.get('/api/v1/mobile/data');

        expect(response.statusCode, 200);
        expect(refreshCalled, isTrue);
        expect(adapter.callCount, 2);
        expect(adapter.capturedAuthHeaders.last, 'Bearer new-access-token');
      },
    );

    test('t03 — 401 on auth endpoint is not retried', () async {
      bool refreshCalled = false;
      final adapter = _CountingAdapter();
      final dio = _authedDio(
        onRefresh: () async {
          refreshCalled = true;
          return 'new-token';
        },
        onClearSession: () async {},
        adapter: adapter,
      );

      await expectLater(
        () => dio.post('/api/v1/auth/refresh', data: {'refreshToken': 'r'}),
        throwsA(isA<DioException>()),
      );

      expect(refreshCalled, isFalse);
      expect(adapter.callCount, 1);
    });

    test(
      't04 — request already marked _authRetry=true is not refreshed',
      () async {
        bool refreshCalled = false;
        final adapter = _CountingAdapter();
        final dio = _authedDio(
          onRefresh: () async {
            refreshCalled = true;
            return 'new-token';
          },
          onClearSession: () async {},
          adapter: adapter,
        );

        await expectLater(
          () => dio.get(
            '/api/v1/mobile/data',
            options: Options(extra: {'_authRetry': true}),
          ),
          throwsA(isA<DioException>()),
        );

        expect(refreshCalled, isFalse);
        expect(adapter.callCount, 1);
      },
    );

    test(
      't05 — onRefresh returning null calls onClearSession and propagates 401',
      () async {
        bool clearCalled = false;
        final adapter = _CountingAdapter();
        final dio = _authedDio(
          onRefresh: () async => null,
          onClearSession: () async {
            clearCalled = true;
          },
          adapter: adapter,
        );

        await expectLater(
          () => dio.get('/api/v1/mobile/data'),
          throwsA(isA<DioException>()),
        );

        expect(clearCalled, isTrue);
        expect(adapter.callCount, 1);
      },
    );

    test('t06 — non-401 error propagates without calling onRefresh', () async {
      bool refreshCalled = false;
      final dio = _authedDio(
        onRefresh: () async {
          refreshCalled = true;
          return 'new-token';
        },
        onClearSession: () async {},
        adapter: _NetworkErrorAdapter(),
      );

      await expectLater(
        () => dio.get('/api/v1/mobile/data'),
        throwsA(isA<DioException>()),
      );

      expect(refreshCalled, isFalse);
    });
  });

  // ── Group 3: DioAuthRepository — login ────────────────────────────────────
  group('DioAuthRepository — login', () {
    test(
      't07 — login returns AuthSession with tokens from server response',
      () async {
        final repo = _dioRepo(
          _StaticAdapter(
            (_) => ResponseBody.fromString(
              jsonEncode(_sessionJson()),
              200,
              headers: {
                Headers.contentTypeHeader: ['application/json; charset=utf-8'],
              },
            ),
          ),
        );

        final session = await repo.login(email: 'u@t.test', password: 'pw');

        expect(session.tokens.accessToken, 'acc-tok-test');
        expect(session.tokens.refreshToken, 'ref-tok-test');
        expect(session.user.tenantId, 'tenant-test');
      },
    );

    test(
      't08 — login saves token to storage and never persists password',
      () async {
        final storage = InMemoryAuthTokenStorage();
        Map<String, dynamic>? sentBody;

        final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
        dio.transformer = SyncTransformer();
        dio.httpClientAdapter = _StaticAdapter((opts) {
          sentBody = opts.data as Map<String, dynamic>?;
          return ResponseBody.fromString(
            jsonEncode(_sessionJson()),
            200,
            headers: {
              Headers.contentTypeHeader: ['application/json; charset=utf-8'],
            },
          );
        });

        final repo = DioAuthRepository(client: dio, storage: storage);
        await repo.login(email: 'tech@t.test', password: 'ultra-secret-99');

        // Request body carries the password for authentication — expected
        expect(sentBody?['password'], 'ultra-secret-99');

        // Stored session has no password field
        final stored = await storage.loadSession();
        expect(stored?.tokens.accessToken, 'acc-tok-test');
        // Serialize the stored fields we know about — password must not appear
        final storedJson = jsonEncode({
          'accessToken': stored!.tokens.accessToken,
          'refreshToken': stored.tokens.refreshToken,
          'sub': stored.user.sub,
          'email': stored.user.email,
          'tenantId': stored.user.tenantId,
        });
        expect(storedJson, isNot(contains('ultra-secret-99')));
      },
    );

    test('t09 — login throws ApiUnauthorizedError on 401', () async {
      final repo = _dioRepo(
        _StaticAdapter(
          (opts) => throw DioException(
            requestOptions: opts,
            type: DioExceptionType.badResponse,
            response: Response(requestOptions: opts, statusCode: 401),
          ),
        ),
      );

      await expectLater(
        () => repo.login(email: 'bad@t.test', password: 'wrong'),
        throwsA(isA<ApiUnauthorizedError>()),
      );
    });

    test('t10 — login throws ApiNetworkError on connection failure', () async {
      final repo = _dioRepo(_NetworkErrorAdapter());

      await expectLater(
        () => repo.login(email: 'u@t.test', password: 'pw'),
        throwsA(isA<ApiNetworkError>()),
      );
    });
  });

  // ── Group 4: DioAuthRepository — refresh ──────────────────────────────────
  group('DioAuthRepository — refresh', () {
    test('t11 — refresh sends stored refreshToken in request body', () async {
      final storage = InMemoryAuthTokenStorage();
      await storage.saveSession(_storedSession(refresh: 'stored-refresh-tok'));

      final adapter = _StaticAdapter(
        (_) => ResponseBody.fromString(
          jsonEncode(_sessionJson(access: 'refreshed-access')),
          200,
          headers: {
            Headers.contentTypeHeader: ['application/json; charset=utf-8'],
          },
        ),
      );
      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = adapter;
      final repo = DioAuthRepository(client: dio, storage: storage);

      await repo.refresh();

      final sentBody = adapter.captured.first.data as Map<String, dynamic>;
      expect(sentBody['refreshToken'], 'stored-refresh-tok');
    });

    test('t12 — refresh returns session with new accessToken', () async {
      final storage = InMemoryAuthTokenStorage();
      await storage.saveSession(_storedSession());

      final dio = Dio(BaseOptions(baseUrl: 'https://test.local'));
      dio.transformer = SyncTransformer();
      dio.httpClientAdapter = _StaticAdapter(
        (_) => ResponseBody.fromString(
          jsonEncode(_sessionJson(access: 'refreshed-access')),
          200,
          headers: {
            Headers.contentTypeHeader: ['application/json; charset=utf-8'],
          },
        ),
      );
      final repoWithStorage = DioAuthRepository(client: dio, storage: storage);

      final session = await repoWithStorage.refresh();
      expect(session.tokens.accessToken, 'refreshed-access');
    });

    test(
      't13 — refresh with no stored session throws ApiUnauthorizedError immediately',
      () async {
        // Storage is empty — DioAuthRepository checks storage before HTTP call
        final repo = _dioRepo(_NetworkErrorAdapter());

        await expectLater(repo.refresh, throwsA(isA<ApiUnauthorizedError>()));
      },
    );
  });

  // ── Group 5: AuthNotifier — expired state ─────────────────────────────────
  group('AuthNotifier — expired state after refresh failure', () {
    test(
      't14 — tryRefresh failure sets status to AuthStatus.expired',
      () async {
        final container = ProviderContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(_ThrowingAuthRepository()),
          ],
        );
        addTearDown(container.dispose);

        // build() completes: empty storage → unauthenticated
        await container.read(authStateProvider.future);

        await container.read(authStateProvider.notifier).tryRefresh();

        final state = container.read(authStateProvider).asData!.value;
        expect(state.status, AuthStatus.expired);
      },
    );

    test(
      't15 — tryRefresh failure safeError is non-null and contains no token',
      () async {
        final container = ProviderContainer(
          overrides: [
            authRepositoryProvider.overrideWithValue(_ThrowingAuthRepository()),
          ],
        );
        addTearDown(container.dispose);

        await container.read(authStateProvider.future);
        await container.read(authStateProvider.notifier).tryRefresh();

        final state = container.read(authStateProvider).asData!.value;
        expect(state.safeError, isNotNull);
        expect(state.safeError!.toLowerCase(), isNot(contains('bearer')));
        expect(state.safeError!.toLowerCase(), isNot(contains('eyj')));
      },
    );
  });

  // ── Group 6: Safety ───────────────────────────────────────────────────────
  group('Safety — no sensitive data leaks into errors or messages', () {
    test(
      't16 — mapDioError on 401 never echoes response body or bearer token',
      () {
        final opts = RequestOptions(path: '/api/v1/mobile/data');
        final dioErr = DioException(
          requestOptions: opts,
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: opts,
            statusCode: 401,
            data: 'Bearer super-secret-token-xyz',
          ),
        );

        final error = mapDioError(dioErr);

        expect(error, isA<ApiUnauthorizedError>());
        expect(error.safeMessage, isNot(contains('super-secret-token-xyz')));
        expect(error.safeMessage.toLowerCase(), isNot(contains('bearer')));
      },
    );
  });
}
