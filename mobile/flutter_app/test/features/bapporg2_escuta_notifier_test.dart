// B-APP-ORG-2 (A1) — a escuta vista pelo app inteiro: o notifier, a troca pelo
// orquestrador, o Sair e a queda da sessão viva.
//
// Plano B-APP-ORG-69-70: Emenda 1.8 §5.2 (L1, L7, L8; "descartar no sair, na
// troca e na queda") e 1.8.3 §4 item 3 (os tokens do diário vão para a fila do
// Sair). Mesmo arnês do `bapporg_troca_test.dart`: o repositório real e todo
// HTTP no servidor falso.

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_sessions.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/tenant_switch_orchestrator.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _email = 'joao.prado@guinchoexemplo.com.br';
const _orgA = 'org-a';
const _orgB = 'org-b';
const _activeTenant = '/api/v1/auth/active-tenant';
const _logout = '/api/v1/auth/logout';
const _bootstrap = '/api/v1/mobile/bootstrap';

AuthSession _sessaoA() => AuthSession(
  tokens: AuthTokens(
    accessToken: 'tok-a',
    refreshToken: 'ref-a',
    expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
  ),
  user: const AuthUser(
    sub: 'u-a',
    email: _email,
    tenantId: _orgA,
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    permissions: ['work_orders:read'],
    scope: 'tenant',
  ),
  sessionNonce: 'n-a',
);

Map<String, Object?> _ativa(String tenantId, String access) => {
  'data': {
    'access_token': access,
    'accessToken': access,
    'expires_in': 900,
    'expiresIn': 900,
    'refresh_token': 'ref-${access.substring(4)}',
    'refreshToken': 'ref-${access.substring(4)}',
    'tenant': {'id': tenantId, 'name': 'Guincho $tenantId'},
    'user': {'id': 'u-b', 'name': 'João Prado', 'email': _email},
    'must_change_password': false,
    'roles': const ['field_technician'],
    'permissions': const ['work_orders:read'],
  },
};

Map<String, Object?> _bootstrapDe(String tenantId, String sub) => {
  'data': {
    'feature_flags': const <String, Object?>{},
    'tenant': {'id': tenantId, 'name': 'Guincho $tenantId'},
    'user': {'id': sub, 'email': _email},
    'roles': const ['field_technician'],
    'permissions': const ['work_orders:read'],
    'available_tenants': [
      {'tenantId': _orgA, 'displayName': 'Guincho org-a'},
      {'tenantId': _orgB, 'displayName': 'Guincho org-b'},
    ],
  },
};

class _Sent {
  _Sent(this.options, this.auth);
  final RequestOptions options;
  final String? auth;
  String get path => options.path;
  Map<String, Object?> get body =>
      Map<String, Object?>.from(options.data as Map? ?? const {});
}

typedef _Handler = FutureOr<(int, Map<String, Object?>)> Function(_Sent sent);

class _Server implements HttpClientAdapter {
  final Map<String, List<_Handler>> routes = {};
  final List<_Sent> sent = [];

  void on(String path, _Handler handler) =>
      routes.putIfAbsent(path, () => []).add(handler);

  List<_Sent> to(String path) => sent.where((s) => s.path == path).toList();

  List<String> get revoked => [
    for (final s in to(_logout)) s.body['refreshToken'] as String,
  ];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final s = _Sent(options, options.headers['Authorization'] as String?);
    sent.add(s);
    final handlers = routes[options.path];
    if (handlers == null || handlers.isEmpty) {
      return _json(404, {
        'error': {'code': 'NOT_FOUND'},
      });
    }
    final handler = handlers.length > 1 ? handlers.removeAt(0) : handlers.first;
    final (status, body) = await handler(s);
    return _json(status, body);
  }

  ResponseBody _json(int status, Map<String, Object?> body) =>
      ResponseBody.fromString(
        jsonEncode(body),
        status,
        headers: {
          Headers.contentTypeHeader: ['application/json; charset=utf-8'],
        },
      );

  @override
  void close({bool force = false}) {}
}

/// Conta as gravações da sessão viva (L1: "0 gravação no armazenamento").
class _Armazenamento extends InMemoryAuthTokenStorage {
  int sessionWrites = 0;

  @override
  Future<void> saveSession(AuthSession session) async {
    sessionWrites++;
    await super.saveSession(session);
  }
}

class _Porta extends AutoSyncCoordinator {
  @override
  AutoSyncState build() => const AutoSyncState();

  @override
  Future<bool> holdForSessionChange({
    Duration timeout = kSessionChangeHoldTimeout,
  }) async => true;

  @override
  void releaseAfterSessionChange({String? switchedTo}) {}
}

class _Telemetria implements TelemetryCaptureService {
  @override
  Future<TelemetryEvent?> recordAppConnect({required String tenantId}) async =>
      null;

  @override
  Future<TelemetryEvent?> recordAppDisconnect({
    required String tenantId,
  }) async => null;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _H {
  _H(this.server, this.storage, this.container);
  final _Server server;
  final _Armazenamento storage;
  final ProviderContainer container;

  AuthNotifier get auth => container.read(authStateProvider.notifier);
  AuthState get value => container.read(authStateProvider).asData!.value;
  ListenSessions get listen => container.read(listenSessionsProvider);
}

Future<_H> _abre() async {
  final server = _Server()
    ..on(_bootstrap, (s) {
      final b = s.auth == 'Bearer tok-b';
      return (200, _bootstrapDe(b ? _orgB : _orgA, b ? 'u-b' : 'u-a'));
    })
    ..on(_logout, (_) => (200, {'data': 'ok'}));
  final storage = _Armazenamento();
  await storage.saveSession(_sessaoA());
  storage.sessionWrites = 0;
  final authDio = Dio(BaseOptions(baseUrl: 'https://teste.local'))
    ..transformer = SyncTransformer()
    ..httpClientAdapter = server;
  final container = ProviderContainer(
    overrides: [
      authTokenStorageProvider.overrideWithValue(storage),
      authRepositoryProvider.overrideWithValue(
        DioAuthRepository(client: authDio, storage: storage),
      ),
      tenantSwitchClientProvider.overrideWith(
        (ref) =>
            () =>
                sessionHttpClient(ref, ref.read(authenticatedApiConfigProvider))
                  ..httpClientAdapter = server,
      ),
      mobileBootstrapRepositoryProvider.overrideWith(
        (ref) => DioMobileBootstrapRepository(
          storage,
          createClient: (config) =>
              sessionHttpClient(ref, config)..httpClientAdapter = server,
        ),
      ),
      autoSyncCoordinatorProvider.overrideWith(_Porta.new),
      telemetryCaptureServiceProvider.overrideWithValue(_Telemetria()),
    ],
  );
  addTearDown(container.dispose);
  final opened = await container.read(authStateProvider.future);
  expect(opened.status, AuthStatus.authenticated);
  return _H(server, storage, container);
}

void main() {
  test('L1 — pedir a sessão de escuta: 0 gravação no armazenamento, a sessão '
      'viva e a época iguais; com 2 pátios no bootstrap, 1 sessão viva e 1 de '
      'escuta', () async {
    final h = await _abre();
    final boot = await h.container.read(bootstrapSessionProvider.future);
    expect(boot.availableTenants, hasLength(2));
    h.server.on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')));
    final epoch = h.auth.epoch;
    final key = h.auth.liveSessionKey;

    final listened = await h.listen.acquire(_orgB, h.value.session!);

    expect(listened!.user.tenantId, _orgB);
    expect(h.storage.sessionWrites, 0);
    final stored = await h.storage.loadSession();
    expect(stored!.user.tenantId, _orgA);
    expect(stored.tokens.refreshToken, 'ref-a');
    expect(h.value.session!.user.tenantId, _orgA);
    expect(h.value.session!.tokens.accessToken, 'tok-a');
    expect(h.auth.epoch, epoch);
    expect(h.auth.liveSessionKey, key);
    expect(h.listen.sessions.map((s) => s.user.tenantId), [_orgB]);
    expect(h.server.to(_activeTenant).single.auth, 'Bearer tok-a');
  });

  test('L7 — Sair: uma revogação por sessão de escuta, mais a da sessão '
      'viva', () async {
    final h = await _abre();
    h.server.on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')));
    await h.listen.acquire(_orgB, h.value.session!);

    await h.auth.logout();

    expect(h.server.revoked, unorderedEquals(['ref-bl', 'ref-a']));
    expect(h.listen.sessions, isEmpty);
    expect(await h.storage.loadListenTokens(), isEmpty);
    expect(h.value.status, AuthStatus.unauthenticated);
  });

  test('L8 — troca pelo orquestrador: as sessões de escuta da época antiga '
      'são descartadas e revogadas; uma sessão de época antiga nunca é '
      'usada', () async {
    final h = await _abre();
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')))
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-b')));
    await h.listen.acquire(_orgB, h.value.session!);
    final before = h.server.revoked.length;

    await h.container.read(tenantSwitchOrchestratorProvider).run(_orgB);

    expect(h.value.session!.user.tenantId, _orgB);
    expect(h.value.session!.tokens.accessToken, 'tok-b');
    expect(h.listen.sessions, isEmpty);
    expect(() => h.listen.clientFor(_orgB), throwsStateError);
    expect(await h.storage.loadListenTokens(), isEmpty);
    expect(
      h.server.revoked.sublist(before),
      unorderedEquals(['ref-bl', 'ref-a']),
    );
  });

  test(
    'L8b — a queda da sessão viva também descarta e revoga a escuta',
    () async {
      final h = await _abre();
      h.server.on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')));
      await h.listen.acquire(_orgB, h.value.session!);

      await h.auth.expireSession(h.auth.epoch);

      expect(h.value.status, AuthStatus.expired);
      expect(h.listen.sessions, isEmpty);
      expect(await h.storage.loadListenTokens(), isEmpty);
      expect(h.server.revoked, ['ref-bl']);
    },
  );
}
