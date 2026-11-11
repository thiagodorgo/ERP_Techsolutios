// B-USERS-ACESSO-SEG (T2) — troca da senha provisória no app de campo.
//
// Plano B-USERS-ACESSO-SEG-conserto-c1.md: A-04 (T.1, T.3) e emendas 3 (RQ-2(b),
// RQ-6), 4 (opção A e a linha "Entrando como <e-mail>") e 5 (programado pelo
// CONTRATO, com dublês: a resposta do login com `must_change_password` e
// `user.email`, e o `POST /api/v1/auth/password` com o mapa de erros de T.1).
//
// Todo HTTP passa por um adaptador falso por caminho (sem rede real). As senhas
// abaixo são fictícias e só existem neste arquivo.
//
// Casos: F1 a F7 de T.3 (F7 é o do RQ-2(b)), o e-mail da Emenda 4, o RQ-6 no app
// (uma tentativa = uma requisição) e os estados de §7 (sessão expirada, acesso
// não permitido, "Sair", token fora do resto do app).

import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/auth/change_password_screen.dart';
import 'package:erp_techsolutions_mobile/features/auth/login_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ── Dados fictícios ──────────────────────────────────────────────────────────

const _email = 'maria.souza@guinchoexemplo.com.br';
const _provisoria = 'Provisoria#1';
const _nova = 'NovaSenha#2026';
const _ecoDoServidor = 'ECO-DO-SERVIDOR-nao-pode-aparecer';

const _loginPath = '/api/v1/auth/login';
const _refreshPath = '/api/v1/auth/refresh';
const _passwordPath = '/api/v1/auth/password';

/// Resposta do login no formato do backend (`data`, irmãos `roles` e
/// `permissions`). `mustChange == null` = o campo não vem (backend antigo).
Map<String, dynamic> _loginJson({bool? mustChange, String access = 'acc-1'}) {
  final restricted = mustChange == true;
  return {
    'data': {
      'authenticated': true,
      'accessToken': access,
      'refreshToken': 'ref-1',
      'expiresIn': 900,
      'user': {'id': 'usr-001', 'email': _email, 'tenant_id': 'ten-001'},
      'roles': restricted
          ? const <Object>[]
          : const [
              {'id': 'r1', 'key': 'field_technician', 'name': 'Técnico'},
            ],
      'permissions': restricted ? const <Object>[] : const ['work_orders:read'],
      'must_change_password': ?mustChange,
    },
  };
}

/// Resposta do refresh SEM o campo (o refresh nunca decide a restrição).
Map<String, dynamic> _refreshJson() => {
  'data': {
    'accessToken': 'acc-renovado',
    'refreshToken': 'ref-renovado',
    'expiresIn': 900,
    'user': {'id': 'usr-001', 'email': _email, 'tenant_id': 'ten-001'},
    'roles': const [
      {'id': 'r1', 'key': 'field_technician', 'name': 'Técnico'},
    ],
  },
};

Map<String, dynamic> _erro(String code, {String? reason}) => {
  'error': {'code': code, 'reason': ?reason, 'message': _ecoDoServidor},
};

// ── Adaptador HTTP falso, por caminho ─────────────────────────────────────────

class _Reply {
  const _Reply(this.status, [this.body = const {}]);
  final int status;
  final Map<String, dynamic> body;
}

class _RouteAdapter implements HttpClientAdapter {
  _RouteAdapter(this.replies);

  final Map<String, _Reply> replies;
  final List<RequestOptions> requests = [];
  bool networkDown = false;

  int count(String path) => requests.where((r) => r.path == path).length;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    if (networkDown) {
      throw DioException(
        requestOptions: options,
        type: DioExceptionType.connectionError,
      );
    }
    final reply = replies[options.path] ?? const _Reply(404);
    return ResponseBody.fromString(
      jsonEncode(reply.body),
      reply.status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

Dio _dio(_RouteAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'https://teste.local'));
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = adapter;
  return dio;
}

// ── Dublês de fila e telemetria ───────────────────────────────────────────────

class _RecordingSyncQueue implements SyncQueueRepository {
  final List<SyncAction> enqueued = [];

  @override
  Future<void> enqueue(SyncAction action) async => enqueued.add(action);

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) async => [];

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) async => [];

  @override
  Future<void> update(SyncAction action) async {}
}

class _SpyTelemetry implements TelemetryCaptureService {
  int connects = 0;
  int disconnects = 0;

  @override
  Future<TelemetryEvent?> recordAppConnect({required String tenantId}) async {
    connects++;
    return null;
  }

  @override
  Future<TelemetryEvent?> recordAppDisconnect({
    required String tenantId,
  }) async {
    disconnects++;
    return null;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

// ── Montagem ──────────────────────────────────────────────────────────────────

class _Harness {
  _Harness({
    required this.adapter,
    required this.storage,
    required this.repo,
    required this.queue,
    required this.telemetry,
    required this.container,
  });

  final _RouteAdapter adapter;
  final InMemoryAuthTokenStorage storage;
  final DioAuthRepository repo;
  final _RecordingSyncQueue queue;
  final _SpyTelemetry telemetry;
  final ProviderContainer container;

  GoRouter get router => container.read(appRouterProvider);
  String get path => router.routerDelegate.currentConfiguration.uri.path;
}

_Harness _harness(Map<String, _Reply> replies) {
  final adapter = _RouteAdapter(replies);
  final storage = InMemoryAuthTokenStorage();
  final repo = DioAuthRepository(client: _dio(adapter), storage: storage);
  final queue = _RecordingSyncQueue();
  final telemetry = _SpyTelemetry();
  final container = ProviderContainer(
    overrides: [
      authTokenStorageProvider.overrideWithValue(storage),
      authRepositoryProvider.overrideWithValue(repo),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      telemetryCaptureServiceProvider.overrideWithValue(telemetry),
    ],
  );
  return _Harness(
    adapter: adapter,
    storage: storage,
    repo: repo,
    queue: queue,
    telemetry: telemetry,
    container: container,
  );
}

/// Abre o app real (roteador com o redirect) num aparelho de 390 × 812 e
/// passa pela abertura até o login.
Future<_Harness> _pumpApp(
  WidgetTester tester,
  Map<String, _Reply> replies,
) async {
  tester.view.physicalSize = const Size(1170, 2436);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final h = _harness(replies);
  addTearDown(h.container.dispose);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: h.container,
      child: MaterialApp.router(
        theme: ErpMobileTheme.light(),
        routerConfig: h.router,
      ),
    ),
  );
  // A abertura navega sozinha depois de 2,2 s; sem sessão, cai no login.
  await tester.pump(const Duration(milliseconds: 2300));
  await tester.pumpAndSettle();
  expect(find.byType(LoginScreen), findsOneWidget);
  return h;
}

Future<void> _loginPelaTela(WidgetTester tester) async {
  final campos = find.byType(TextField);
  await tester.enterText(campos.at(0), _email);
  await tester.enterText(campos.at(1), _provisoria);
  await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
  await tester.pumpAndSettle();
}

Future<void> _preencherTroca(
  WidgetTester tester, {
  String atual = _provisoria,
  String nova = _nova,
  String? confirmacao,
}) async {
  await tester.enterText(
    find.byKey(ChangePasswordScreen.currentFieldKey),
    atual,
  );
  await tester.enterText(find.byKey(ChangePasswordScreen.newFieldKey), nova);
  await tester.enterText(
    find.byKey(ChangePasswordScreen.confirmFieldKey),
    confirmacao ?? nova,
  );
}

Future<void> _salvar(WidgetTester tester) async {
  final botao = find.byKey(ChangePasswordScreen.saveButtonKey);
  await tester.ensureVisible(botao);
  await tester.tap(botao);
  await tester.pumpAndSettle();
}

String _textoDaFaixa(WidgetTester tester) {
  final faixa = find.byKey(ChangePasswordScreen.bannerKey);
  expect(faixa, findsOneWidget);
  final textos = tester
      .widgetList<Text>(find.descendant(of: faixa, matching: find.byType(Text)))
      .map((t) => t.data ?? '')
      .join(' ');
  return textos;
}

bool _botaoSalvarAtivo(WidgetTester tester) => tester
    .widget<FilledButton>(find.byKey(ChangePasswordScreen.saveButtonKey))
    .enabled;

// ── Testes ────────────────────────────────────────────────────────────────────

void main() {
  group('Repositório: a regra do campo vale só na resposta do login (RQ-2(b))', () {
    test(
      'F2 — login restrito: o armazenamento fica VAZIO e o restoreSession devolve nulo',
      () async {
        final h = _harness({
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
        });
        addTearDown(h.container.dispose);
        // Uma sessão antiga guardada também não sobrevive ao login restrito.
        await h.storage.saveSession(
          AuthSession(
            tokens: AuthTokens(
              accessToken: 'acc-antigo',
              expiresAt: DateTime.now().toUtc().add(const Duration(hours: 1)),
            ),
            user: const AuthUser(
              sub: 'usr-antigo',
              email: 'antigo@guinchoexemplo.com.br',
              tenantId: 'ten-001',
              tenantRole: 'field_technician',
              tenantRoles: ['field_technician'],
              permissions: [],
              scope: 'tenant',
            ),
          ),
        );

        final session = await h.repo.login(
          email: _email,
          password: _provisoria,
        );

        expect(session.mustChangePassword, isTrue);
        expect(await h.storage.loadSession(), isNull);
        expect(await h.repo.restoreSession(), isNull);
        // Fica só em memória, para a troca.
        expect(h.repo.currentSession()?.mustChangePassword, isTrue);
      },
    );

    test(
      'F7 — login sem o campo dá sessão INTEIRA e gravada; o refresh dela continua inteiro e gravado',
      () async {
        final h = _harness({
          _loginPath: _Reply(200, _loginJson()),
          _refreshPath: _Reply(200, _refreshJson()),
        });
        addTearDown(h.container.dispose);

        final session = await h.repo.login(email: _email, password: 'x');
        expect(session.mustChangePassword, isFalse);
        final guardada = await h.storage.loadSession();
        expect(guardada, isNotNull);
        expect(guardada!.mustChangePassword, isFalse);

        final renovada = await h.repo.refresh();
        expect(renovada.mustChangePassword, isFalse);
        expect(renovada.tokens.accessToken, 'acc-renovado');
        final guardadaDepois = await h.storage.loadSession();
        expect(guardadaDepois?.tokens.accessToken, 'acc-renovado');
        expect(guardadaDepois?.mustChangePassword, isFalse);
      },
    );

    test('F7 — login com o campo false dá sessão inteira e gravada', () async {
      final h = _harness({
        _loginPath: _Reply(200, _loginJson(mustChange: false)),
      });
      addTearDown(h.container.dispose);

      final session = await h.repo.login(email: _email, password: 'x');

      expect(session.mustChangePassword, isFalse);
      expect(await h.storage.loadSession(), isNotNull);
    });

    test(
      'RQ-6 no app — 401 invalid_credentials: UMA requisição à troca e nenhuma ao refresh',
      () async {
        final h = _harness({
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
          _passwordPath: _Reply(
            401,
            _erro('UNAUTHORIZED', reason: 'invalid_credentials'),
          ),
        });
        addTearDown(h.container.dispose);
        await h.repo.login(email: _email, password: _provisoria);

        await expectLater(
          h.repo.changePassword(currentPassword: 'errada', newPassword: _nova),
          throwsA(
            isA<PasswordChangeError>().having(
              (e) => e.failure,
              'failure',
              PasswordChangeFailure.wrongCurrentPassword,
            ),
          ),
        );

        expect(h.adapter.count(_passwordPath), 1);
        expect(h.adapter.count(_refreshPath), 0);
        // A senha errada não derruba a sessão em memória: a tela fica.
        expect(h.repo.currentSession()?.mustChangePassword, isTrue);
      },
    );

    test(
      'a troca vai com o token da sessão em memória e o corpo do contrato',
      () async {
        final h = _harness({
          _loginPath: _Reply(
            200,
            _loginJson(mustChange: true, access: 'acc-restrito'),
          ),
          _passwordPath: const _Reply(200, {
            'data': {'changed': true, 'revoked_sessions': 1, 'unlinked': false},
          }),
        });
        addTearDown(h.container.dispose);
        await h.repo.login(email: _email, password: _provisoria);

        await h.repo.changePassword(
          currentPassword: _provisoria,
          newPassword: _nova,
        );

        final req = h.adapter.requests.singleWhere(
          (r) => r.path == _passwordPath,
        );
        expect(req.method, 'POST');
        expect(req.headers['Authorization'], 'Bearer acc-restrito');
        expect(req.data, {
          'currentPassword': _provisoria,
          'newPassword': _nova,
        });
      },
    );
  });

  group('F5 — mapa fixo de erros: nenhum texto ecoa o servidor', () {
    DioException resposta(int status, Map<String, dynamic> body) {
      final options = RequestOptions(path: _passwordPath);
      return DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response<Map<String, dynamic>>(
          requestOptions: options,
          statusCode: status,
          data: body,
        ),
      );
    }

    final casos = <String, (DioException, String)>{
      '400 invalid_payload': (
        resposta(400, _erro('BAD_REQUEST', reason: 'invalid_payload')),
        'Preencha todos os campos.',
      ),
      '400 invalid_new_password': (
        resposta(400, _erro('BAD_REQUEST', reason: 'invalid_new_password')),
        'A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória.',
      ),
      '401 invalid_credentials': (
        resposta(401, _erro('UNAUTHORIZED', reason: 'invalid_credentials')),
        'A senha provisória não confere.',
      ),
      '401 jwt_required': (
        resposta(401, _erro('UNAUTHORIZED', reason: 'jwt_required')),
        'Sua sessão expirou. Entre de novo com a senha provisória.',
      ),
      '401 INVALID_TOKEN': (
        resposta(401, _erro('INVALID_TOKEN')),
        'Sua sessão expirou. Entre de novo com a senha provisória.',
      ),
      '403 user_inactive': (
        resposta(403, _erro('FORBIDDEN', reason: 'user_inactive')),
        'Seu acesso está desativado. Fale com o administrador da sua organização.',
      ),
      '403 credential_unavailable': (
        resposta(403, _erro('FORBIDDEN', reason: 'credential_unavailable')),
        'Não foi possível trocar a senha por aqui. Fale com o administrador da sua organização.',
      ),
      '423 account_locked': (
        resposta(423, _erro('LOCKED', reason: 'account_locked')),
        'Conta bloqueada por tentativas. Fale com o administrador da sua organização.',
      ),
      '500': (
        resposta(500, _erro('INTERNAL_SERVER_ERROR')),
        'Não foi possível trocar a senha agora. Tente de novo.',
      ),
      '503': (
        resposta(503, _erro('SERVICE_UNAVAILABLE')),
        'Não foi possível trocar a senha agora. Tente de novo.',
      ),
      'rede': (
        DioException(
          requestOptions: RequestOptions(path: _passwordPath),
          type: DioExceptionType.connectionError,
        ),
        'Não foi possível trocar a senha agora. Tente de novo.',
      ),
      'tempo esgotado': (
        DioException(
          requestOptions: RequestOptions(path: _passwordPath),
          type: DioExceptionType.receiveTimeout,
        ),
        'Não foi possível trocar a senha agora. Tente de novo.',
      ),
      '403 de motivo desconhecido': (
        resposta(403, _erro('FORBIDDEN', reason: 'outro_motivo')),
        'Não foi possível trocar a senha agora. Tente de novo.',
      ),
    };

    for (final MapEntry(key: nome, value: (erro, texto)) in casos.entries) {
      test('F5 — $nome vira o texto fixo', () {
        final mapeado = mapPasswordChangeError(erro);
        expect(mapeado.safeMessage, texto);
        expect(mapeado.safeMessage.contains(_ecoDoServidor), isFalse);
      });
    }

    test('F5 — nenhum texto do mapa tem termo técnico', () {
      const proibidos = [
        'tenant',
        'token',
        'jwt',
        'password',
        'invalid',
        'credential',
        'payload',
        'status',
      ];
      for (final failure in PasswordChangeFailure.values) {
        final texto = passwordChangeMessage(failure).toLowerCase();
        for (final termo in proibidos) {
          expect(texto.contains(termo), isFalse, reason: '$failure: $termo');
        }
      }
    });
  });

  group('Notificador: a sessão restrita não aciona o resto do app', () {
    test(
      'login restrito: sem APP_CONNECT, sem token para o resto do app, sem usuário de fila; "Sair" sem APP_DISCONNECT',
      () async {
        final h = _harness({
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
        });
        addTearDown(h.container.dispose);
        await h.container.read(authStateProvider.future);

        await h.container
            .read(authStateProvider.notifier)
            .login(email: _email, password: _provisoria);

        final state = h.container.read(authStateProvider).value!;
        expect(state.status, AuthStatus.passwordChangeRequired);
        expect(state.isAuthenticated, isFalse);
        expect(h.telemetry.connects, 0);
        expect(
          h.container.read(authenticatedApiConfigProvider).accessToken,
          isNull,
        );
        expect(h.container.read(currentSyncUserIdProvider), isNull);

        await h.container.read(authStateProvider.notifier).logout();
        expect(h.telemetry.disconnects, 0);
        expect(h.repo.currentSession(), isNull);
        expect(
          h.container.read(authStateProvider).value!.status,
          AuthStatus.unauthenticated,
        );
      },
    );

    test(
      'controle: login inteiro registra APP_CONNECT e entrega o token',
      () async {
        final h = _harness({_loginPath: _Reply(200, _loginJson())});
        addTearDown(h.container.dispose);
        await h.container.read(authStateProvider.future);

        await h.container
            .read(authStateProvider.notifier)
            .login(email: _email, password: 'x');
        await Future<void>.delayed(Duration.zero);

        expect(
          h.container.read(authStateProvider).value!.status,
          AuthStatus.authenticated,
        );
        expect(h.telemetry.connects, 1);
        expect(
          h.container.read(authenticatedApiConfigProvider).accessToken,
          'acc-1',
        );
      },
    );
  });

  group('Tela e roteador (app real, aparelho 390 × 812)', () {
    testWidgets(
      'F1 — login com must_change_password:true abre a troca de senha, não o início',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
        });

        await _loginPelaTela(tester);

        expect(h.path, '/change-password');
        expect(find.byType(ChangePasswordScreen), findsOneWidget);
        expect(find.text('Crie sua nova senha'), findsOneWidget);
        expect(find.byType(LoginScreen), findsNothing);
      },
    );

    testWidgets(
      'Emenda 4 — a linha mostra o e-mail da própria sessão e nenhum outro texto',
      (tester) async {
        await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
        });
        await _loginPelaTela(tester);

        final linha = tester.widget<Text>(
          find.byKey(ChangePasswordScreen.accountLineKey),
        );
        expect(linha.data, 'Entrando como $_email');
        expect(find.text('Entrando como $_email'), findsOneWidget);
      },
    );

    testWidgets(
      'F3 — com sessão restrita, /work-orders e /sync terminam na troca de senha',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
        });
        await _loginPelaTela(tester);

        for (final destino in ['/work-orders', '/sync', '/', '/profile']) {
          h.router.go(destino);
          await tester.pumpAndSettle();
          expect(h.path, '/change-password', reason: destino);
          expect(find.byType(ChangePasswordScreen), findsOneWidget);
        }
      },
    );

    testWidgets('sem sessão, /change-password vai para o login', (
      tester,
    ) async {
      final h = await _pumpApp(tester, {});

      h.router.go('/change-password');
      await tester.pumpAndSettle();

      expect(h.path, '/login');
      expect(find.byType(ChangePasswordScreen), findsNothing);
    });

    testWidgets(
      'F4 — 200: memória apagada e volta ao login com o aviso "Senha alterada"',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
          _passwordPath: const _Reply(200, {
            'data': {'changed': true, 'revoked_sessions': 1, 'unlinked': false},
          }),
        });
        await _loginPelaTela(tester);

        await _preencherTroca(tester);
        await _salvar(tester);

        expect(h.adapter.count(_passwordPath), 1);
        expect(h.repo.currentSession(), isNull);
        expect(await h.storage.loadSession(), isNull);
        expect(h.path, '/login');
        expect(find.byType(LoginScreen), findsOneWidget);
        expect(
          find.text('Senha alterada. Entre com a nova senha.'),
          findsOneWidget,
        );
        expect(h.queue.enqueued, isEmpty);
      },
    );

    testWidgets(
      'F4 — 401 invalid_credentials: texto fixo, a tela fica e a provisória volta vazia',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
          _passwordPath: _Reply(
            401,
            _erro('UNAUTHORIZED', reason: 'invalid_credentials'),
          ),
        });
        await _loginPelaTela(tester);

        await _preencherTroca(tester, atual: 'Errada#123');
        await _salvar(tester);

        expect(h.path, '/change-password');
        expect(_textoDaFaixa(tester), 'A senha provisória não confere.');
        expect(find.textContaining(_ecoDoServidor), findsNothing);
        final provisoria = tester.widget<TextField>(
          find.byKey(ChangePasswordScreen.currentFieldKey),
        );
        expect(provisoria.controller!.text, isEmpty);
        expect(h.repo.currentSession()?.mustChangePassword, isTrue);
        expect(_botaoSalvarAtivo(tester), isTrue);
      },
    );

    testWidgets(
      'F6 — sem conexão: texto de offline, botão travado, nenhuma chamada e nada na fila',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
          _passwordPath: const _Reply(200, {
            'data': {'changed': true, 'revoked_sessions': 1, 'unlinked': false},
          }),
        });
        await _loginPelaTela(tester);
        await _preencherTroca(tester);

        h.container.read(networkStatusProvider.notifier).setOffline();
        await tester.pumpAndSettle();

        expect(
          _textoDaFaixa(tester),
          'Sem conexão. A troca de senha precisa de internet.',
        );
        expect(_botaoSalvarAtivo(tester), isFalse);

        await _salvar(tester);
        await tester.testTextInput.receiveAction(TextInputAction.done);
        await tester.pumpAndSettle();

        expect(h.adapter.count(_passwordPath), 0);
        expect(h.queue.enqueued, isEmpty);
        expect(h.path, '/change-password');
        expect(await h.storage.loadSession(), isNull);
      },
    );

    testWidgets(
      'sessão restrita vencida (401 jwt_required): volta ao login com o texto de sessão expirada',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
          _passwordPath: _Reply(
            401,
            _erro('UNAUTHORIZED', reason: 'jwt_required'),
          ),
        });
        await _loginPelaTela(tester);

        await _preencherTroca(tester);
        await _salvar(tester);

        expect(h.path, '/login');
        expect(
          find.text(
            'Sua sessão expirou. Entre de novo com a senha provisória.',
          ),
          findsOneWidget,
        );
        expect(h.repo.currentSession(), isNull);
      },
    );

    testWidgets(
      'acesso não permitido (403 user_inactive): faixa, formulário travado e só "Sair"',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
          _passwordPath: _Reply(
            403,
            _erro('FORBIDDEN', reason: 'user_inactive'),
          ),
        });
        await _loginPelaTela(tester);

        await _preencherTroca(tester);
        await _salvar(tester);

        expect(
          _textoDaFaixa(tester),
          'Seu acesso está desativado. Fale com o administrador da sua organização.',
        );
        expect(_botaoSalvarAtivo(tester), isFalse);
        final campo = tester.widget<TextField>(
          find.byKey(ChangePasswordScreen.newFieldKey),
        );
        expect(campo.enabled, isFalse);

        final sair = find.byKey(ChangePasswordScreen.exitButtonKey);
        await tester.ensureVisible(sair);
        await tester.tap(sair);
        await tester.pumpAndSettle();

        expect(h.path, '/login');
        expect(h.repo.currentSession(), isNull);
        expect(h.telemetry.disconnects, 0);
      },
    );

    testWidgets(
      'validação local: confirmação diferente e senha curta não chamam o servidor',
      (tester) async {
        final h = await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
        });
        await _loginPelaTela(tester);

        await _preencherTroca(tester, confirmacao: 'OutraSenha#9');
        await _salvar(tester);
        expect(
          _textoDaFaixa(tester),
          'A confirmação não é igual à nova senha.',
        );
        // O foco vai para o campo a corrigir.
        expect(
          tester
              .widget<TextField>(
                find.byKey(ChangePasswordScreen.confirmFieldKey),
              )
              .focusNode!
              .hasFocus,
          isTrue,
        );

        await _preencherTroca(tester, nova: 'curta');
        await _salvar(tester);
        expect(
          _textoDaFaixa(tester),
          'A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória.',
        );

        await _preencherTroca(tester, nova: _email.toUpperCase());
        await _salvar(tester);
        expect(
          _textoDaFaixa(tester),
          'A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória.',
        );

        expect(h.adapter.count(_passwordPath), 0);
      },
    );

    testWidgets(
      'a11y — mostrar senha com rótulo acessível e alvos de toque de 44 px',
      (tester) async {
        await _pumpApp(tester, {
          _loginPath: _Reply(200, _loginJson(mustChange: true)),
        });
        await _loginPelaTela(tester);

        // Cada campo é lido pelo seu rótulo, não pela dica "••••••••".
        final semantica = tester.ensureSemantics();
        for (final rotulo in [
          'Senha provisória',
          'Nova senha',
          'Confirme a nova senha',
        ]) {
          expect(find.bySemanticsLabel(rotulo), findsOneWidget, reason: rotulo);
        }
        semantica.dispose();

        expect(find.byTooltip('Mostrar senha provisória'), findsOneWidget);
        expect(find.byTooltip('Mostrar nova senha'), findsOneWidget);
        expect(
          find.byTooltip('Mostrar confirmação da nova senha'),
          findsOneWidget,
        );

        await tester.tap(find.byTooltip('Mostrar nova senha'));
        await tester.pumpAndSettle();
        expect(find.byTooltip('Ocultar nova senha'), findsOneWidget);
        final nova = tester.widget<TextField>(
          find.byKey(ChangePasswordScreen.newFieldKey),
        );
        expect(nova.obscureText, isFalse);

        for (final alvo in [
          find.byKey(ChangePasswordScreen.saveButtonKey),
          find.byKey(ChangePasswordScreen.exitButtonKey),
          find.byTooltip('Mostrar senha provisória'),
        ]) {
          final tamanho = tester.getSize(alvo);
          expect(tamanho.height, greaterThanOrEqualTo(44), reason: '$alvo');
          expect(tamanho.width, greaterThanOrEqualTo(44), reason: '$alvo');
        }
      },
    );
  });
}
