// B-APP-ORG (item 70), fatia A2 — a troca de organização troca a SESSÃO.
//
// Plano B-APP-ORG-69-70 §3.4, §4.2 e §5.2; Emenda 1 §A4 (T18), §A5 (o
// DISCONNECT de A) e §6 (linha A2, com o T10a-troca). A troca chama
// `POST /api/v1/auth/active-tenant` pelo cliente de sessão criado na hora,
// grava a sessão de B, revoga a de A e sobe a época; qualquer falha deixa tudo
// em A.
//
// Todo HTTP passa por um servidor falso por caminho (sem rede). Os dados são
// fictícios e só existem neste arquivo.

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/auth/tenant_switch_orchestrator.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

// ── Dados fictícios ──────────────────────────────────────────────────────────

const _email = 'joao.prado@guinchoexemplo.com.br';
const _orgA = 'org-a';
const _orgB = 'org-b';
const _activeTenant = '/api/v1/auth/active-tenant';
const _logout = '/api/v1/auth/logout';
const _refresh = '/api/v1/auth/refresh';
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

/// O 200 do `/auth/active-tenant` no formato do servidor (`auth.routes.ts`):
/// `user` sem `tenant_id`, `roles` em texto, os dois estilos de token.
Map<String, Object?> _trocou({
  String tenantId = _orgB,
  String access = 'tok-b',
  bool mustChange = false,
}) => {
  'data': {
    'access_token': access,
    'accessToken': access,
    'token_type': 'Bearer',
    'tokenType': 'Bearer',
    'expires_in': 900,
    'expiresIn': 900,
    'refresh_token': 'ref-${access.substring(4)}',
    'refreshToken': 'ref-${access.substring(4)}',
    'refresh_expires_in': 2592000,
    'session_id': 'sess-$tenantId',
    'sessionId': 'sess-$tenantId',
    'tenant': {'id': tenantId, 'name': 'Guincho $tenantId'},
    'user': {'id': 'u-b', 'name': 'João Prado', 'email': _email},
    'must_change_password': mustChange,
    'roles': mustChange ? const <String>[] : const ['field_technician'],
    'permissions': mustChange
        ? const <String>[]
        : const ['work_orders:read', 'expense_sync:write'],
  },
};

/// O bootstrap da organização do TOKEN (o servidor ignora `?tenantId`).
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

// ── Servidor falso ────────────────────────────────────────────────────────────

class _Sent {
  _Sent(this.options, this.auth);
  final RequestOptions options;
  final String? auth; // o Authorization no momento do envio
  String get path => options.path;
  Map<String, Object?> get body =>
      Map<String, Object?>.from(options.data as Map);
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

Never _semRede(_Sent s) => throw DioException(
  requestOptions: s.options,
  type: DioExceptionType.connectionError,
);

// ── Dublês ────────────────────────────────────────────────────────────────────

class _Porta extends AutoSyncCoordinator {
  _Porta(this.drains);
  final bool drains;
  int holds = 0;
  int releases = 0;

  @override
  AutoSyncState build() => const AutoSyncState();

  @override
  Future<bool> holdForSessionChange({
    Duration timeout = kSessionChangeHoldTimeout,
  }) async {
    holds++;
    return drains;
  }

  @override
  void releaseAfterSessionChange() => releases++;
}

class _Telemetria implements TelemetryCaptureService {
  final List<String> eventos = [];

  @override
  Future<TelemetryEvent?> recordAppConnect({required String tenantId}) async {
    eventos.add('CONNECT($tenantId)');
    return null;
  }

  @override
  Future<TelemetryEvent?> recordAppDisconnect({
    required String tenantId,
  }) async {
    eventos.add('DISCONNECT($tenantId)');
    return null;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _H {
  _H(this.server, this.storage, this.container, this.porta, this.telemetria);
  final _Server server;
  final InMemoryAuthTokenStorage storage;
  final ProviderContainer container;
  final _Porta porta;
  final _Telemetria telemetria;

  AuthNotifier get auth => container.read(authStateProvider.notifier);

  /// A troca pelo ponto único (Emenda 1.3.1).
  Future<void> troca(String tenantId) =>
      container.read(tenantSwitchOrchestratorProvider).run(tenantId);
  AuthState get value => container.read(authStateProvider).asData!.value;
  String? get key => auth.liveSessionKey;
}

/// Abre o app com a sessão A guardada (autenticado em A) e o servidor falso
/// atrás de todos os clientes: o de autenticação, o da troca e o do bootstrap.
Future<_H> _abre({bool drains = true}) async {
  final server = _Server()
    ..on(_bootstrap, (s) {
      final b = s.auth == 'Bearer tok-b';
      return (200, _bootstrapDe(b ? _orgB : _orgA, b ? 'u-b' : 'u-a'));
    })
    ..on(_logout, (_) => (200, {'data': 'ok'}));
  final storage = InMemoryAuthTokenStorage();
  await storage.saveSession(_sessaoA());
  final authDio = Dio(BaseOptions(baseUrl: 'https://teste.local'))
    ..transformer = SyncTransformer()
    ..httpClientAdapter = server;
  final porta = _Porta(drains);
  final telemetria = _Telemetria();
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
      autoSyncCoordinatorProvider.overrideWith(() => porta),
      telemetryCaptureServiceProvider.overrideWithValue(telemetria),
    ],
  );
  addTearDown(container.dispose);
  final opened = await container.read(authStateProvider.future);
  expect(opened.status, AuthStatus.authenticated);
  expect(opened.session!.user.tenantId, _orgA);
  return _H(server, storage, container, porta, telemetria);
}

/// Confere que tudo ficou em A: sessão, chave, época e armazenamento.
Future<void> _ficouEmA(_H h, {required String key, required int epoch}) async {
  expect(h.value.status, AuthStatus.authenticated);
  expect(h.value.session!.user.tenantId, _orgA);
  expect(h.value.session!.tokens.accessToken, 'tok-a');
  expect(h.key, key);
  expect(h.auth.epoch, epoch);
  final saved = await h.storage.loadSession();
  expect(saved!.user.tenantId, _orgA);
  expect(saved.tokens.refreshToken, 'ref-a');
  expect(h.server.to(_logout), isEmpty);
}

void main() {
  test('T1 — a troca A→B faz UM POST /auth/active-tenant {tenantId: B} com '
      'Bearer tok-a, e nenhum bootstrap com ?tenantId', () async {
    final h = await _abre();
    h.server.on(_activeTenant, (_) => (200, _trocou()));

    await h.troca(_orgB);

    final trocas = h.server.to(_activeTenant);
    expect(trocas, hasLength(1));
    expect(trocas.single.options.method, 'POST');
    expect(trocas.single.body, {'tenantId': _orgB});
    expect(trocas.single.auth, 'Bearer tok-a');
    expect(
      h.server.sent.where(
        (s) => s.options.queryParameters.containsKey('tenantId'),
      ),
      isEmpty,
    );
    expect(
      h.server.sent.where((s) => s.options.uri.query.contains('tenantId')),
      isEmpty,
    );
    // A porta da sincronização (T-a) fechou antes e reabriu no fim.
    expect(h.porta.holds, 1);
    expect(h.porta.releases, 1);
  });

  test('T2 — depois da troca, a sessão, o armazenamento, a chave, a época e '
      'os dois bootstraps estão em B; a telemetria fecha A e abre B', () async {
    final h = await _abre();
    h.server.on(_activeTenant, (_) => (200, _trocou()));
    final keyA = h.key;
    final epochA = h.auth.epoch;
    final bootA = await h.container.read(bootstrapSessionProvider.future);
    expect(bootA.activeTenant.tenantId, _orgA);

    await h.troca(_orgB);

    final s = h.value.session!;
    expect(h.value.status, AuthStatus.authenticated);
    expect(s.user.tenantId, _orgB);
    expect(s.user.sub, 'u-b');
    expect(s.tokens.accessToken, 'tok-b');
    final saved = await h.storage.loadSession();
    expect(saved!.tokens.accessToken, 'tok-b');
    expect(saved.user.tenantId, _orgB);
    expect(h.key, isNot(keyA));
    expect(h.key, sessionKeyOf(s));
    expect(h.auth.epoch, greaterThan(epochA));
    final bootB = await h.container.read(bootstrapSessionProvider.future);
    expect(bootB.activeTenant.tenantId, _orgB);
    final notifierB = await h.container.read(bootstrapNotifierProvider.future);
    expect(notifierB.activeTenant.tenantId, _orgB);
    // O bootstrap de B saiu com o token de B.
    expect(h.server.to(_bootstrap).last.auth, 'Bearer tok-b');
    await pumpEventQueue();
    expect(h.telemetria.eventos, ['DISCONNECT(org-a)', 'CONNECT(org-b)']);
  });

  test('T3 — o token de renovação de A vai para /auth/logout; sem rede, fica '
      'na fila de revogação; o de B nunca vai', () async {
    final h = await _abre();
    h.server.on(_activeTenant, (_) => (200, _trocou()));

    await h.troca(_orgB);

    final saidas = h.server.to(_logout);
    expect(saidas, hasLength(1));
    expect(saidas.single.body, {'refreshToken': 'ref-a'});

    // Sem rede no "Sair" do servidor: o token de A fica na fila.
    final h2 = await _abre();
    h2.server.routes[_logout] = [_semRede];
    h2.server.on(_activeTenant, (_) => (200, _trocou()));
    await h2.troca(_orgB);
    final fila = await h2.container.read(pendingRevocationsProvider).pending();
    expect(fila.map((e) => e.token), ['ref-a']);
    expect(
      h2.server.to(_logout).map((s) => s.body['refreshToken']),
      everyElement('ref-a'),
    );
    expect(h2.value.session!.user.tenantId, _orgB);
  });

  test('T4 — o 403 deixa tudo em A e mostra a mensagem', () async {
    final h = await _abre();
    h.server.on(
      _activeTenant,
      (_) => (
        403,
        {
          'error': {
            'code': 'FORBIDDEN',
            'message': 'User does not belong to the requested tenant.',
          },
        },
      ),
    );
    final key = h.key!;
    final epoch = h.auth.epoch;

    final erro = await h
        .troca(_orgB)
        .then<Object?>((_) => null, onError: (Object e) => e);

    expect(erro, isA<TenantSwitchRefusedError>());
    expect(
      (erro! as ApiError).safeMessage,
      'Não foi possível entrar nessa organização. Fale com o administrador.',
    );
    await _ficouEmA(h, key: key, epoch: epoch);
    expect(h.porta.releases, 1);
  });

  test(
    'T4b — o 200 com outra organização é recusado e tudo fica em A',
    () async {
      final h = await _abre();
      h.server.on(_activeTenant, (_) => (200, _trocou(tenantId: 'org-c')));
      final key = h.key!;
      final epoch = h.auth.epoch;

      final erro = await h
          .troca(_orgB)
          .then<Object?>((_) => null, onError: (Object e) => e);

      expect(erro, isA<TenantSwitchMismatchError>());
      await _ficouEmA(h, key: key, epoch: epoch);
    },
  );

  test('T5 — sem rede, fica em A e mostra a mensagem', () async {
    final h = await _abre();
    h.server.on(_activeTenant, _semRede);
    final key = h.key!;
    final epoch = h.auth.epoch;

    final erro = await h
        .troca(_orgB)
        .then<Object?>((_) => null, onError: (Object e) => e);

    expect(erro, isA<ApiNetworkError>());
    expect(
      (erro! as ApiError).safeMessage,
      'Sem conexão. A troca precisa de internet.',
    );
    await _ficouEmA(h, key: key, epoch: epoch);
  });

  test('T6 — destino com must_change_password: a sessão restrita fica só em '
      'memória (o caminho da troca de senha); nada gravado', () async {
    final h = await _abre();
    h.server.on(_activeTenant, (_) => (200, _trocou(mustChange: true)));

    await h.troca(_orgB);

    expect(h.value.status, AuthStatus.passwordChangeRequired);
    expect(h.value.isPasswordChangeRequired, isTrue);
    expect(h.value.session!.user.tenantId, _orgB);
    expect(h.value.isAuthenticated, isFalse);
    expect(await h.storage.loadSession(), isNull);
    // Sessão restrita não registra CONNECT (como no login).
    await pumpEventQueue();
    expect(h.telemetria.eventos, isEmpty);
  });

  test(
    'T7 — o corpo real do /auth/active-tenant vira a sessão B correta',
    () async {
      final h = await _abre();
      h.server.on(_activeTenant, (_) => (200, _trocou()));

      await h.troca(_orgB);

      final s = h.value.session!;
      expect(s.user.sub, 'u-b');
      expect(s.user.email, _email);
      expect(s.user.tenantId, _orgB);
      expect(s.user.tenantRole, 'field_technician');
      expect(s.user.tenantRoles, ['field_technician']);
      expect(s.user.permissions, ['work_orders:read', 'expense_sync:write']);
      expect(s.tokens.accessToken, 'tok-b');
      expect(s.tokens.refreshToken, 'ref-b');
      expect(s.mustChangePassword, isFalse);
      final ttl = s.tokens.expiresAt.difference(DateTime.now().toUtc());
      expect(ttl.inSeconds, inInclusiveRange(890, 900));
    },
  );

  test('T8 — depois da troca, a renovação usa o token de B, e o '
      'sessionNonce é novo', () async {
    final h = await _abre();
    h.server
      ..on(_activeTenant, (_) => (200, _trocou()))
      ..on(
        _refresh,
        (_) => (
          200,
          {
            'data': {
              'accessToken': 'tok-b2',
              'refreshToken': 'ref-b2',
              'expiresIn': 900,
            },
          },
        ),
      );

    await h.troca(_orgB);
    final nonce = h.value.session!.sessionNonce;
    expect(nonce, isNotNull);
    expect(nonce, isNot('n-a'));

    final outcome = await h.auth.renewAfterUnauthorized('tok-b', h.auth.epoch);

    expect(outcome, isA<SessionRenewed>());
    expect(h.server.to(_refresh).single.body['refreshToken'], 'ref-b');
    expect(h.value.session!.tokens.accessToken, 'tok-b2');
    expect(h.value.session!.sessionNonce, nonce);
  });

  test('T9 — um "Sair" durante a troca descarta o resultado (época)', () async {
    final h = await _abre();
    final gate = Completer<void>();
    h.server.on(_activeTenant, (_) async {
      await gate.future;
      return (200, _trocou());
    });

    final troca = h.troca(_orgB);
    await pumpEventQueue();
    expect(h.server.to(_activeTenant), hasLength(1));
    await h.auth.logout();
    gate.complete();
    await troca;

    expect(h.value.status, AuthStatus.unauthenticated);
    expect(h.value.session, isNull);
    expect(await h.storage.loadSession(), isNull);
    // Só o token de A foi ao "Sair"; o de B nunca.
    expect(h.server.to(_logout).map((s) => s.body['refreshToken']), ['ref-a']);
  });

  test('T10a-troca — a porta não esvaziou no prazo: a troca não acontece e '
      'aparece a mensagem', () async {
    final h = await _abre(drains: false);
    h.server.on(_activeTenant, (_) => (200, _trocou()));
    final key = h.key!;
    final epoch = h.auth.epoch;

    final erro = await h
        .troca(_orgB)
        .then<Object?>((_) => null, onError: (Object e) => e);

    expect(erro, isA<TenantSwitchBusyError>());
    expect(
      (erro! as TenantSwitchBusyError).safeMessage,
      'O envio ainda está em andamento. Tente de novo em instantes.',
    );
    expect(h.server.to(_activeTenant), isEmpty);
    await _ficouEmA(h, key: key, epoch: epoch);
  });

  test('T18 — o active-tenant leva 401: a sessão de A renova e a repetição '
      'sai com o token renovado de A; termina em B', () async {
    final h = await _abre();
    h.server
      ..on(
        _activeTenant,
        (_) => (
          401,
          {
            'error': {'code': 'INVALID_TOKEN', 'message': 'expired'},
          },
        ),
      )
      ..on(_activeTenant, (_) => (200, _trocou()))
      ..on(
        _refresh,
        (_) => (
          200,
          {
            'data': {
              'accessToken': 'tok-a2',
              'refreshToken': 'ref-a2',
              'expiresIn': 900,
            },
          },
        ),
      );

    await h.troca(_orgB);

    final trocas = h.server.to(_activeTenant);
    expect(trocas.map((t) => t.auth), ['Bearer tok-a', 'Bearer tok-a2']);
    expect(h.server.to(_refresh).single.body['refreshToken'], 'ref-a');
    expect(h.value.session!.user.tenantId, _orgB);
    // A sessão anterior que sai é a renovada de A.
    expect(h.server.to(_logout).single.body, {'refreshToken': 'ref-a2'});
  });

  test('a troca para a organização atual não faz nada', () async {
    final h = await _abre();
    final key = h.key!;
    final epoch = h.auth.epoch;

    await h.troca(_orgA);

    expect(h.server.to(_activeTenant), isEmpty);
    expect(h.porta.holds, 0);
    await _ficouEmA(h, key: key, epoch: epoch);
  });

  test(
    'o modo de desenvolvimento troca só para organizações da lista dele',
    () async {
      final storage = InMemoryAuthTokenStorage();
      final repo = LocalDevAuthRepository(storage: storage);
      final a = await repo.login(
        email: _email,
        password: 'x',
        tenantId: 'tenant-demo',
      );
      final dio = Dio();

      final b = await repo.switchTenant(
        current: a,
        tenantId: 'tenant-field',
        client: dio,
      );
      expect(b.user.tenantId, 'tenant-field');
      expect(b.sessionNonce, isNot(a.sessionNonce));
      await expectLater(
        repo.switchTenant(current: a, tenantId: 'org-estranha', client: dio),
        throwsA(isA<TenantSwitchRefusedError>()),
      );
    },
  );

  // ── Emenda 1.3 (D-A2-3): a troca com o coordenador REAL ──────────────────
  //
  // Sem dublê do coordenador: o `build` dele ouve o `authStateProvider`. Se o
  // `AuthNotifier` lesse o coordenador, o Riverpod 3 lançaria
  // `CircularDependencyError` em modo debug (o defeito do `2e174dde`).

  Future<ProviderContainer> abreReal({List<Override> extra = const []}) async {
    final c = ProviderContainer(
      overrides: [
        authTokenStorageProvider.overrideWithValue(InMemoryAuthTokenStorage()),
        ...extra,
      ],
    );
    addTearDown(c.dispose);
    await c.read(authStateProvider.future);
    await c
        .read(authStateProvider.notifier)
        .login(email: _email, password: 'x', tenantId: 'tenant-demo');
    expect(c.read(authStateProvider).asData!.value.isAuthenticated, isTrue);
    return c;
  }

  test('T-REAL — a troca com o coordenador real termina sem ciclo, a porta '
      'fecha e reabre, e a sessão é a de B', () async {
    final espia = _PortaEspia();
    final c = await abreReal(
      extra: [autoSyncCoordinatorProvider.overrideWith(() => espia)],
    );

    await c.read(tenantSwitchOrchestratorProvider).run('tenant-field');

    final s = c.read(authStateProvider).asData!.value.session!;
    expect(s.user.tenantId, 'tenant-field');
    expect(espia.holds, 1);
    expect(espia.releases, 1);
    expect(c.read(autoSyncCoordinatorProvider).isRunning, isFalse);
  });

  test('T-REAL (sem nenhuma substituição) — a troca termina sem ciclo e a '
      'sessão é a de B', () async {
    final c = await abreReal();
    expect(c.read(autoSyncCoordinatorProvider.notifier), isNotNull);

    await c.read(tenantSwitchOrchestratorProvider).run('tenant-field');

    final s = c.read(authStateProvider).asData!.value.session!;
    expect(s.user.tenantId, 'tenant-field');
  });

  test('T-REAL-FALHA — a troca recusada reabre a porta (o finally) e fica '
      'na organização atual', () async {
    final espia = _PortaEspia();
    final c = await abreReal(
      extra: [autoSyncCoordinatorProvider.overrideWith(() => espia)],
    );

    await expectLater(
      c.read(tenantSwitchOrchestratorProvider).run('org-estranha'),
      throwsA(isA<TenantSwitchRefusedError>()),
    );

    expect(espia.holds, 1);
    expect(espia.releases, 1);
    final s = c.read(authStateProvider).asData!.value.session!;
    expect(s.user.tenantId, 'tenant-demo');
  });

  // ── Emenda 1.3.1 (E1.3.1-1): a guarda G-ORQ ──────────────────────────────
  //
  // Toda troca passa pelo orquestrador. Em `lib/`, `switchTenant(` só pode
  // aparecer no repositório (as definições), no `AuthNotifier` (a definição e
  // a chamada ao repositório) e no arquivo do orquestrador.
  group('G-ORQ — nenhuma troca fora do orquestrador', () {
    final sites = _switchSites();

    test('as ocorrências de switchTenant( em lib/ (o censo)', () {
      expect(sites.map((s) => s.label).toList(), [
        'lib/core/auth/auth_notifier.dart: Future<void> switchTenant(String tenantId) async {',
        'lib/core/auth/auth_notifier.dart: final switched = await repo.switchTenant(',
        'lib/core/auth/auth_repository.dart: Future<AuthSession> switchTenant({',
        'lib/core/auth/auth_repository.dart: Future<AuthSession> switchTenant({',
        'lib/core/auth/auth_repository.dart: Future<AuthSession> switchTenant({',
        'lib/core/auth/tenant_switch_orchestrator.dart: // Nenhum código de `lib/` fora deste arquivo chama `switchTenant(` do',
        'lib/core/auth/tenant_switch_orchestrator.dart: await _ref.read(authStateProvider.notifier).switchTenant(tenantId);',
      ]);
    });

    test('nenhuma está fora dos lugares permitidos', () {
      final fora = [
        for (final s in sites)
          if (!_switchSiteAllowed(s)) s.label,
      ];
      expect(fora, isEmpty);
    });
  });
}

/// O coordenador REAL (o `build` dele é o do app, que ouve a sessão), com a
/// contagem de quantas vezes a porta fechou e reabriu.
class _PortaEspia extends AutoSyncCoordinator {
  int holds = 0;
  int releases = 0;

  @override
  Future<bool> holdForSessionChange({
    Duration timeout = kSessionChangeHoldTimeout,
  }) {
    holds++;
    return super.holdForSessionChange(timeout: timeout);
  }

  @override
  void releaseAfterSessionChange() {
    releases++;
    super.releaseAfterSessionChange();
  }
}

class _SwitchSite {
  const _SwitchSite(this.file, this.line);
  final String file;
  final String line;
  String get label => '$file: $line';
}

List<_SwitchSite> _switchSites() {
  final files =
      Directory('lib')
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));
  return [
    for (final f in files)
      for (final line in f.readAsLinesSync())
        if (line.contains('switchTenant('))
          _SwitchSite(f.path.replaceAll(r'\', '/'), line.trim()),
  ];
}

bool _switchSiteAllowed(_SwitchSite s) {
  if (s.file == 'lib/core/auth/tenant_switch_orchestrator.dart') return true;
  if (s.file == 'lib/core/auth/auth_repository.dart') {
    return s.line.startsWith('Future<AuthSession> switchTenant(');
  }
  if (s.file == 'lib/core/auth/auth_notifier.dart') {
    return s.line == 'Future<void> switchTenant(String tenantId) async {' ||
        s.line.contains('await repo.switchTenant(');
  }
  return false;
}
