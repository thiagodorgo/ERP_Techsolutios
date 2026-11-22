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
import 'package:erp_techsolutions_mobile/core/auth/listen_token_journal.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/features/commissions/data/commissions_by_patio.dart'
    as commission;
import 'package:erp_techsolutions_mobile/features/commissions/data/commission_patio_clients.dart';
import 'package:erp_techsolutions_mobile/features/commissions/state/commissions_controller.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart'
    show remoteAuthModeProvider;
import 'package:erp_techsolutions_mobile/features/work_orders/data/other_patios_calls.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
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

  bool falhaSessao = false;
  Completer<void>? _chegou;
  Completer<void>? _solta;

  ({Completer<void> chegou, Completer<void> solta}) seguraDiario() {
    final c = _chegou = Completer<void>();
    final s = _solta = Completer<void>();
    return (chegou: c, solta: s);
  }

  @override
  Future<void> saveSession(AuthSession session) async {
    if (falhaSessao) throw StateError('armazenamento');
    sessionWrites++;
    await super.saveSession(session);
  }

  @override
  Future<void> saveListenTokens(Map<String, String> tokensByTenant) async {
    final c = _chegou;
    final s = _solta;
    _chegou = null;
    _solta = null;
    if (c != null && s != null) {
      c.complete();
      await s.future;
    }
    await super.saveListenTokens(tokensByTenant);
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
      commissionRepositoryProvider.overrideWith((ref) => _repoAtual),
      remoteAuthModeProvider.overrideWithValue(true),
      authenticatedApiConfigProvider.overrideWith((ref) {
        final s = ref.watch(authStateProvider).asData?.value;
        final token = (s?.isAuthenticated ?? false)
            ? s?.session?.tokens.accessToken
            : null;
        return ApiConfig(baseUrl: _baseVivo, accessToken: token);
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

const _login = '/api/v1/auth/login';
const _workOrders = '/api/v1/work-orders';
const _refresh = '/api/v1/auth/refresh';

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

/// Segura a revogação da sessão viva (`ref-a`) no servidor.
({Completer<void> chegou, Completer<void> solta}) _seguraSairDeA(_Server s) {
  final chegou = Completer<void>();
  final solta = Completer<void>();
  s.routes[_logout] = [
    (sent) async {
      if (sent.body['refreshToken'] == 'ref-a') {
        if (!chegou.isCompleted) chegou.complete();
        await solta.future;
      }
      return (200, <String, Object?>{'data': 'ok'});
    },
  ];
  return (chegou: chegou, solta: solta);
}

void main() {
  test('N1 — a janela do Sair', () async {
    final h = await _abre();
    h.server.on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')));
    final hold = _seguraSairDeA(h.server);
    final a = h.value.session!;
    final out = h.auth.logout();
    await hold.chegou.future;
    expect(h.value.status, AuthStatus.authenticated);
    expect(await h.listen.acquire(_orgB, a), isNull);
    hold.solta.complete();
    await out;
    expect(h.server.to(_activeTenant), isEmpty);
    expect(h.listen.sessions, isEmpty);
    expect(await h.storage.loadListenTokens(), isEmpty);
    expect(h.value.status, AuthStatus.unauthenticated);
  });

  test('N2 — duas pessoas no mesmo aparelho', () async {
    final h = await _abre();
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')))
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl2')))
      ..on(_login, (_) => (200, _entrou('u-c', _orgA, 'tok-c')));
    final a = h.value.session!;
    final gravando = h.storage.seguraDiario();
    final pedido = h.listen.acquire(_orgB, a);
    await gravando.chegou.future;
    final out = h.auth.logout();
    gravando.solta.complete();
    await out;
    expect(await pedido, isNull);
    expect(h.listen.sessions, isEmpty);
    expect(await h.storage.loadListenTokens(), isEmpty);
    expect(h.server.revoked, containsAll(['ref-bl', 'ref-a']));

    await h.auth.login(email: _email, password: 'x');
    final c = h.value.session!;
    expect(c.user.sub, 'u-c');
    final deC = await h.listen.acquire(_orgB, c);
    expect(deC!.tokens.accessToken, 'tok-bl2');
    expect(h.server.to(_activeTenant).last.auth, 'Bearer tok-c');
  });

  test('N3 — entrada por cima de uma sessao', () async {
    final h = await _abre();
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')))
      ..on(_login, (_) => (200, _entrou('u-c', _orgA, 'tok-c')));
    await h.listen.acquire(_orgB, h.value.session!);
    await h.auth.login(email: _email, password: 'x');
    expect(h.value.session!.user.sub, 'u-c');
    expect(h.server.revoked, contains('ref-bl'));
    expect(await h.storage.loadListenTokens(), isEmpty);
    expect(h.listen.sessions, isEmpty);
  });

  test('N4 — a troca que nao grava', () async {
    final h = await _abre();
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')))
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-b')))
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl3')));
    final a = h.value.session!;
    await h.listen.acquire(_orgB, a);
    h.storage.falhaSessao = true;
    Object? erro;
    try {
      await h.auth.switchTenant(_orgB);
    } catch (e) {
      erro = e;
    }
    h.storage.falhaSessao = false;
    expect(erro, isNotNull);
    expect(h.value.session!.user.tenantId, _orgA);
    expect(h.listen.sessions, isEmpty);
    expect(h.server.revoked, contains('ref-bl'));
    final again = await h.listen.acquire(_orgB, a);
    expect(again, isNotNull);
    expect(again!.tokens.accessToken, 'tok-bl3');
  });

  test('N5 — queda na abertura', () async {
    final server = _Server()
      ..on(
        _refresh,
        (_) => (
          401,
          <String, Object?>{
            'error': {'code': 'INVALID_TOKEN'},
          },
        ),
      )
      ..on(_logout, (_) => (200, <String, Object?>{'data': 'ok'}));
    final storage = _Armazenamento();
    await storage.saveSession(
      AuthSession(
        tokens: AuthTokens(
          accessToken: 'tok-a',
          refreshToken: 'ref-a',
          expiresAt: DateTime.now().toUtc().subtract(const Duration(hours: 1)),
        ),
        user: _sessaoA().user,
        sessionNonce: 'n-a',
      ),
    );
    await storage.saveListenTokens({_orgB: 'ref-velho'});
    final authDio = Dio(BaseOptions(baseUrl: 'https://teste.local'))
      ..transformer = SyncTransformer()
      ..httpClientAdapter = server;
    final container = ProviderContainer(
      overrides: [
        authTokenStorageProvider.overrideWithValue(storage),
        authRepositoryProvider.overrideWithValue(
          DioAuthRepository(client: authDio, storage: storage),
        ),
        telemetryCaptureServiceProvider.overrideWithValue(_Telemetria()),
      ],
    );
    addTearDown(container.dispose);
    final opened = await container.read(authStateProvider.future);
    expect(opened.status, AuthStatus.expired);
    expect(server.revoked, contains('ref-velho'));
    expect(await storage.loadListenTokens(), isEmpty);
  });

  test('OP1 — os blocos guardados nao passam de pessoa', () async {
    final h = await _abre();
    const tenants = [
      TenantContext(tenantId: _orgA, displayName: 'A'),
      TenantContext(tenantId: _orgB, displayName: 'B'),
    ];
    var status = 200;
    h.server
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl')))
      ..on(_activeTenant, (_) => (200, _ativa(_orgB, 'tok-bl2')))
      ..on(_login, (_) => (200, _entrou('u-c', _orgA, 'tok-c')))
      ..on(_workOrders, (_) {
        if (status != 200) {
          return (
            503,
            <String, Object?>{
              'error': {'code': 'UNAVAILABLE'},
            },
          );
        }
        return (
          200,
          <String, Object?>{
            'items': [
              {
                'id': 'os-de-a',
                'code': 'OS-DE-A',
                'title': 'Remoção',
                'status': 'assigned',
              },
            ],
            'pagination': {'nextCursor': null},
          },
        );
      });
    final deA = h.container.read(otherPatiosCallsProvider);
    final blocosA = await deA.load(current: h.value.session!, tenants: tenants);
    expect(blocosA.single.state, OtherPatioState.ready);
    expect(blocosA.single.orders, hasLength(1));
    await h.auth.logout();
    await h.auth.login(email: _email, password: 'x');
    status = 503;
    final deC = h.container.read(otherPatiosCallsProvider);
    final blocosC = await deC.load(current: h.value.session!, tenants: tenants);
    expect(blocosC.single.state, OtherPatioState.failed);
    expect(blocosC.single.orders, isEmpty);
  });

  // Adendo 1 da Emenda 1.8.3.9 (ATQ2): o GET do 1º pátio fica segurado, a
  // pessoa sai, a outra entra e pega a escuta do 2º pátio; o GET é solto. O
  // laço da pessoa que saiu não pode pedir o 2º pátio com o cliente da nova.
  test(
    'OP2 — o laco da pessoa que saiu nao pede com o cliente da que entrou',
    () async {
      final h = await _abre();
      const orgC = 'org-c';
      const tenants = [
        TenantContext(tenantId: _orgA, displayName: 'A'),
        TenantContext(tenantId: _orgB, displayName: 'B'),
        TenantContext(tenantId: orgC, displayName: 'C'),
      ];
      var emitidas = 0;
      final chegou = Completer<void>();
      final solta = Completer<void>();
      h.server
        ..on(_activeTenant, (sent) {
          emitidas++;
          final de = sent.auth == 'Bearer tok-c' ? 'c' : 'a';
          final tenant = sent.body['tenantId'] as String;
          return (200, _ativa(tenant, 'tok-l$de$emitidas-$tenant'));
        })
        ..on(_login, (_) => (200, _entrou('u-c', _orgA, 'tok-c')))
        ..on(_workOrders, (sent) async {
          if (!chegou.isCompleted) {
            chegou.complete();
            await solta.future;
          }
          final daNova = sent.auth?.startsWith('Bearer tok-lc') ?? false;
          return (
            200,
            <String, Object?>{
              'items': [
                {
                  'id': daNova ? 'os-de-c' : 'os-de-a',
                  'code': daNova ? 'OS-DE-C' : 'OS-DE-A',
                  'title': 'Remoção',
                  'status': 'assigned',
                },
              ],
              'pagination': {'nextCursor': null},
            },
          );
        });
      final deA = h.container.read(otherPatiosCallsProvider);
      final cicloDeA = deA.load(current: h.value.session!, tenants: tenants);
      await chegou.future;
      expect(h.listen.sessions, hasLength(2));
      await h.auth.logout();
      await h.auth.login(email: _email, password: 'x');
      final c = h.value.session!;
      expect(c.user.sub, 'u-c');
      final escutaDeC = await h.listen.acquire(orgC, c);
      expect(escutaDeC, isNotNull);
      expect(escutaDeC!.tokens.accessToken, startsWith('tok-lc'));
      solta.complete();
      final blocosA = await cicloDeA;

      final pedidosComTokenNovo = [
        for (final s in h.server.to(_workOrders))
          if (s.auth?.startsWith('Bearer tok-lc') ?? false) s.auth,
      ];
      expect(
        pedidosComTokenNovo,
        isEmpty,
        reason:
            'P-ÉPOCA: o laço da sessão que saiu usou o cliente da sessão nova',
      );
      expect(h.server.to(_workOrders), hasLength(1));
      for (final bloco in blocosA) {
        expect(bloco.orders.map((o) => o.code), isNot(contains('OS-DE-C')));
      }
      expect(blocosA.last.tenantId, orgC);
      expect(blocosA.last.state, OtherPatioState.failed);
    },
  );

  test('CE1 — o estado da aba nao passa de pessoa', () async {
    final com = _Com();
    _repoAtual = _repoDe(com);
    addTearDown(() => _repoAtual = null);
    final h = await _abre();
    h.server.on(_login, (_) => (200, _entrou('u-c', _orgA, 'tok-c')));
    const x = commission.CommissionPatio(id: _orgA, name: 'Guincho A');
    await h.container.read(commissionsControllerProvider.notifier).open(const [
      x,
    ]);
    expect(
      h.container
          .read(commissionsControllerProvider)[_orgA]!
          .block!
          .data!
          .totalCents,
      1000,
    );
    await h.auth.logout();
    expect(h.container.read(commissionsControllerProvider), isEmpty);
    await h.auth.login(email: _email, password: 'x');
    com.cents = '2000';
    final pedidos = com.requests;
    await h.container.read(commissionsControllerProvider.notifier).open(const [
      x,
    ]);
    expect(com.requests, greaterThan(pedidos));
    expect(
      h.container
          .read(commissionsControllerProvider)[_orgA]!
          .block!
          .data!
          .totalCents,
      2000,
    );
  });

  test('CE2 — o pedido em voo de uma pessoa nao cai na outra', () async {
    final com = _Com();
    _repoAtual = _repoDe(com);
    addTearDown(() => _repoAtual = null);
    final h = await _abre();
    h.server.on(_login, (_) => (200, _entrou('u-c', _orgA, 'tok-c')));
    const x = commission.CommissionPatio(id: _orgA, name: 'Guincho A');
    com.gate = Completer<void>();
    final emVoo = h.container.read(commissionsControllerProvider.notifier).open(
      const [x],
    );
    await com.chegou.future;
    await h.auth.logout();
    await h.auth.login(email: _email, password: 'x');
    com.gate!.complete();
    await emVoo;
    expect(
      h.container.read(commissionsControllerProvider)[_orgA]?.block,
      isNull,
    );
  });
}

commission.CommissionByPatioRepository? _repoAtual;

commission.CommissionByPatioRepository _repoDe(_Com com) =>
    commission.CommissionByPatioRepository(patioClients: _Tok(com));

final class _Tok implements CommissionPatioClients {
  _Tok(this.com);

  final _Com com;

  @override
  Future<Dio?> clientFor(String patioId) async =>
      Dio(BaseOptions(baseUrl: 'https://teste.local'))..httpClientAdapter = com;
}

class _Com implements HttpClientAdapter {
  String cents = '1000';
  int requests = 0;
  Completer<void>? gate;
  final chegou = Completer<void>();

  @override
  Future<ResponseBody> fetch(
    RequestOptions o,
    Stream<Uint8List>? r,
    Future<void>? c,
  ) async {
    requests++;
    final total = cents;
    final g = gate;
    if (g != null) {
      if (!chegou.isCompleted) chegou.complete();
      await g.future;
    }
    final Map<String, Object?> body =
        o.path == commission.commissionCalculationsMinePath
        ? {
            'items': const <Object?>[],
            'pagination': {'limit': 100, 'offset': 0, 'total': 0},
          }
        : {
            'data': {'items': const <Object?>[], 'totalCents': total},
          };
    return ResponseBody.fromString(
      jsonEncode(body),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

String _baseVivo = 'https://teste.local';
