import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_sessions.dart';
import 'package:erp_techsolutions_mobile/core/auth/listen_token_journal.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/commissions/data/commission_patio_clients.dart';
import 'package:erp_techsolutions_mobile/features/commissions/data/commissions_by_patio.dart'
    as commission;
import 'package:erp_techsolutions_mobile/features/commissions/state/commissions_controller.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart'
    show remoteAuthModeProvider;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _email = 'joao.prado@guinchoexemplo.com.br';
const _orgA = 'org-a';
const _orgB = 'org-b';
const _activeTenant = '/api/v1/auth/active-tenant';
const _logout = '/api/v1/auth/logout';
const _bootstrap = '/api/v1/mobile/bootstrap';
const _refresh = '/api/v1/auth/refresh';
const _login = '/api/v1/auth/login';

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

Map<String, Object?> _entrou(String sub, String tenantId, String access) => {
  'data': {
    'authenticated': true,
    'accessToken': access,
    'refreshToken': 'ref-$access',
    'expiresIn': 900,
    'user': {'id': sub, 'email': _email, 'tenant_id': tenantId},
    'tenant': {'id': tenantId, 'name': 'qualquer'},
    'must_change_password': false,
    'roles': const [
      {'id': 'r1', 'key': 'field_technician', 'name': 'Técnico'},
    ],
    'permissions': const ['work_orders:read'],
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

class _Armazenamento extends InMemoryAuthTokenStorage {
  bool falhaSessao = false;

  @override
  Future<void> saveSession(AuthSession session) async {
    if (falhaSessao) throw StateError('armazenamento');
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
}

Future<_H> _abre({
  required String baseVivo,
  bool authRepoNoVivo = false,
}) async {
  final server = _Server()
    ..on(_bootstrap, (s) {
      final b = s.auth == 'Bearer tok-b';
      return (200, _bootstrapDe(b ? _orgB : _orgA, b ? 'u-b' : 'u-a'));
    })
    ..on(_logout, (_) => (200, {'data': 'ok'}));
  final storage = _Armazenamento();
  await storage.saveSession(_sessaoA());

  final authDio = Dio(
    BaseOptions(baseUrl: authRepoNoVivo ? baseVivo : 'https://teste.local'),
  )..transformer = SyncTransformer();
  if (!authRepoNoVivo) authDio.httpClientAdapter = server;

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
      listenSessionsProvider.overrideWith(
        (ref) => ListenSessions(
          repository: ref.watch(authRepositoryProvider),
          journal: ListenTokenJournal(ref.watch(authTokenStorageProvider)),
          revocations: ref.watch(pendingRevocationsProvider),
          config: const ApiConfig(baseUrl: 'https://teste.local'),
          liveClient: () => ref.read(tenantSwitchClientProvider)(),
          liveKey: () => ref.read(authStateProvider.notifier).liveSessionKey,
          adapter: server,
        ),
      ),
      commissionRepositoryProvider.overrideWith(
        (ref) => commission.CommissionByPatioRepository(
          patioClients: ref.watch(commissionPatioClientsProvider),
        ),
      ),
      remoteAuthModeProvider.overrideWithValue(true),
      authenticatedApiConfigProvider.overrideWith((ref) {
        final s = ref.watch(authStateProvider).asData?.value;
        final token = (s?.isAuthenticated ?? false)
            ? s?.session?.tokens.accessToken
            : null;
        return ApiConfig(baseUrl: baseVivo, accessToken: token);
      }),
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
  test('IC1 — patio vivo renova no servidor de laco local', () async {
    final vivo = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final recebidos = <(String, String?)>[];
    var tentou = 0;
    vivo.listen((r) async {
      final auth = r.headers.value('authorization');
      recebidos.add((r.uri.path, auth));
      if (r.uri.path == _refresh) {
        r.response.statusCode = 200;
        r.response.headers.contentType = ContentType.json;
        r.response.write(jsonEncode(_ativa(_orgA, 'tok-a2')));
      } else if (r.uri.path == commission.commissionStatementsMySummaryPath) {
        tentou++;
        r.response.statusCode = tentou == 1 ? 401 : 200;
        r.response.headers.contentType = ContentType.json;
        r.response.write(
          jsonEncode({
            'data': {'items': [], 'totalCents': '1'},
          }),
        );
      } else {
        r.response.statusCode = 404;
      }
      await r.response.close();
    });
    addTearDown(() => vivo.close(force: true));
    final base = 'http://127.0.0.1:${vivo.port}';
    final h = await _abre(baseVivo: base, authRepoNoVivo: true);

    final porta = h.container.read(commissionPatioClientsProvider);
    final client = await porta.clientFor(_orgA);
    final response = await client!.get<Object?>(
      commission.commissionStatementsMySummaryPath,
    );

    expect(response.statusCode, 200);
    expect(
      recebidos.where(
        (r) => r.$1 == commission.commissionStatementsMySummaryPath,
      ),
      [
        (commission.commissionStatementsMySummaryPath, 'Bearer tok-a'),
        (commission.commissionStatementsMySummaryPath, 'Bearer tok-a2'),
      ],
    );
    expect(recebidos.where((r) => r.$1 == _refresh), hasLength(1));
  });

  test('IC2 — outro patio usa escuta e nao usa o cliente vivo', () async {
    final vivo = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    var pedidosVivos = 0;
    vivo.listen((r) async {
      pedidosVivos++;
      r.response.statusCode = 200;
      await r.response.close();
    });
    addTearDown(() => vivo.close(force: true));
    final h = await _abre(baseVivo: 'http://127.0.0.1:${vivo.port}');
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')))
      ..on(
        commission.commissionStatementsMySummaryPath,
        (_) => (
          200,
          <String, Object?>{
            'data': {'items': [], 'totalCents': '10'},
          },
        ),
      )
      ..on(
        commission.commissionCalculationsMinePath,
        (_) => (
          200,
          <String, Object?>{
            'items': const [],
            'pagination': {'limit': 100, 'offset': 0, 'total': 0},
          },
        ),
      );

    final porta = h.container.read(commissionPatioClientsProvider);
    final client = await porta.clientFor(_orgB);
    await client!.get<Object?>(commission.commissionStatementsMySummaryPath);

    expect(pedidosVivos, 0);
    expect(
      h.server.to(commission.commissionStatementsMySummaryPath).single.auth,
      'Bearer tok-bl',
    );
  });

  test('IC3 — escuta indisponivel afeta so o bloco daquele patio', () async {
    final h = await _abre(baseVivo: 'https://teste.local');
    await h.storage.saveListenTokens({_orgB: 'ref-velho'});
    h.server
      ..on(_logout, (s) {
        if (s.body['refreshToken'] == 'ref-velho') {
          return (
            503,
            <String, Object?>{
              'error': {'code': 'UNAVAILABLE'},
            },
          );
        }
        return (200, <String, Object?>{'data': 'ok'});
      })
      ..on(
        _activeTenant,
        (_) => (
          503,
          <String, Object?>{
            'error': {'code': 'UNAVAILABLE'},
          },
        ),
      );

    final porta = h.container.read(commissionPatioClientsProvider);
    expect(await porta.clientFor(_orgB), isNull);
    expect(await porta.clientFor(_orgA), isNotNull);
  });

  test('IC4 — a escuta recusada da erro so no bloco', () async {
    final h = await _abre(baseVivo: 'https://teste.local');
    h.server.on(
      _activeTenant,
      (_) => (
        403,
        <String, Object?>{
          'error': {'code': 'FORBIDDEN', 'reason': 'forbidden'},
        },
      ),
    );
    final porta = h.container.read(commissionPatioClientsProvider);
    expect(await porta.clientFor(_orgB), isNull);
    expect(await porta.clientFor(_orgA), isNotNull);
  });

  test('IC5 — sessao restrita: nenhum cliente', () async {
    final h = await _abre(baseVivo: 'https://teste.local');
    final restrita = _entrou('u-c', _orgA, 'tok-c');
    (restrita['data']! as Map<String, Object?>)['must_change_password'] = true;
    h.server.on(_login, (_) => (200, restrita));
    await h.auth.login(email: _email, password: 'x');
    expect(h.value.status, AuthStatus.passwordChangeRequired);
    final porta = h.container.read(commissionPatioClientsProvider);
    expect(await porta.clientFor(_orgA), isNull);
    expect(await porta.clientFor(_orgB), isNull);
    expect(h.server.to(_activeTenant), isEmpty);
  });

  test('IC6 — 401 da escuta derruba so a sessao do patio', () async {
    final h = await _abre(baseVivo: 'https://teste.local');
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')))
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl2')))
      ..on(
        commission.commissionStatementsMySummaryPath,
        (_) => (
          401,
          <String, Object?>{
            'error': {'code': 'UNAUTHORIZED'},
          },
        ),
      );

    final porta = h.container.read(commissionPatioClientsProvider);
    final client = await porta.clientFor(_orgB);
    await expectLater(
      () => client!.get<Object?>(commission.commissionStatementsMySummaryPath),
      throwsA(isA<DioException>()),
    );

    final deNovo = await porta.clientFor(_orgB);
    expect(deNovo, isNotNull);
    final live = await porta.clientFor(_orgA);
    expect(live, isNotNull);
    expect(h.server.to(_activeTenant), hasLength(2));
  });

  test('IC8a — na transicao da troca', () async {
    final vivo = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    final recebidos = <(String, String?)>[];
    vivo.listen((r) async {
      recebidos.add((r.uri.path, r.headers.value('authorization')));
      r.response.statusCode = 200;
      r.response.headers.contentType = ContentType.json;
      r.response.write(jsonEncode({'data': 'ok'}));
      await r.response.close();
    });
    addTearDown(() => vivo.close(force: true));
    final base = 'http://127.0.0.1:${vivo.port}';
    final h = await _abre(baseVivo: base);
    const resumo = commission.commissionStatementsMySummaryPath;
    final solta = Completer<void>();
    h.server.routes[_bootstrap] = [
      (s) async {
        final b = s.auth == 'Bearer tok-b';
        if (b) await solta.future;
        return (200, _bootstrapDe(b ? _orgB : _orgA, b ? 'u-b' : 'u-a'));
      },
    ];
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-b')))
      ..on(_activeTenant, (_) => (200, _ativa(_orgA, 'tok-al')))
      ..on(resumo, (_) => (200, <String, Object?>{'data': 'ok'}));
    await h.auth.switchTenant(_orgB);
    expect(h.value.session!.user.tenantId, _orgB);

    final porta = h.container.read(commissionPatioClientsProvider);
    final deB = await porta.clientFor(_orgB);
    final deA = await porta.clientFor(_orgA);
    await deB!.get<Object?>(resumo);
    await deA!.get<Object?>(resumo);

    expect(recebidos, [(resumo, 'Bearer tok-b')]);
    expect(h.server.to(resumo).single.auth, 'Bearer tok-al');
    expect(h.server.to(_activeTenant).last.auth, 'Bearer tok-b');
    expect(h.server.to(_activeTenant).last.body, {'tenantId': _orgA});
    solta.complete();
  });
}
