// B-APP-ORG (item 69), fatia F5 — a TELA Entrar com a escolha de organização.
//
// Plano B-APP-ORG-69-70 §5.1 (L1, L2, L4, L5, L8, L9) e §8; Emenda 1 §A2.2 (o
// texto do 400) e §6 (linha F5); maquete aprovada pelo dono em 20/11, opção A
// (`telas-3opcoes/app-org-3opcoes.reference.html`), com a regra do dono: a
// escolha só aparece com MAIS de uma organização; com uma só, o app entra nela
// direto.
//
// O app de verdade (o roteador com o redirect, a tela Entrar, o Início) num
// aparelho de 390 × 812. Todo HTTP passa por um adaptador falso (sem rede). Os
// dados são fictícios e só existem neste arquivo.
//
// Mutações que este arquivo pega: M2 (L2), M4 (L9).

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/features/auth/login_screen.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:erp_techsolutions_mobile/shared/ui/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ── Dados fictícios ──────────────────────────────────────────────────────────

const _email = 'ana.lima@guinchoexemplo.com.br';
const _senha = 'SenhaFicticia#1';
const _loginPath = '/api/v1/auth/login';

const _idA = '0b6a3c1e-0000-4000-8000-00000000000a';
const _idB = '0b6a3c1e-0000-4000-8000-00000000000b';
const _idC = '0b6a3c1e-0000-4000-8000-00000000000c';
const _nomes = {
  _idA: 'Guincho Norte',
  _idB: 'Guincho Sul',
  _idC: 'Guincho Leste',
};

Map<String, String> _org(String id) => {'id': id, 'name': _nomes[id]!};

// O texto do §A2.2 da Emenda 1, literal (o teste não lê a constante do app).
const _textoDoQuatrocentos =
    'Este e-mail está ligado a muitas organizações, e o app ainda não consegue '
    'listá-las aqui. Fale com o administrador da organização em que você quer '
    'entrar.';

Map<String, Object?> _escolha(List<Object?> tenants) => {
  'error': {
    'code': 'TENANT_SELECTION_REQUIRED',
    'message': 'Credential matches more than one organization. Choose one.',
    'tenants': tenants,
  },
};

/// O 200 do login no formato do servidor (`auth.routes.ts`).
Map<String, Object?> _entrou(String tenantId) => {
  'data': {
    'authenticated': true,
    'accessToken': 'tok-$tenantId',
    'refreshToken': 'ref-$tenantId',
    'expiresIn': 900,
    'user': {'id': 'usr-$tenantId', 'email': _email, 'tenant_id': tenantId},
    'tenant': {'id': tenantId, 'name': _nomes[tenantId]},
    'must_change_password': false,
    'roles': const [
      {'id': 'r1', 'key': 'field_technician', 'name': 'Técnico'},
    ],
    'permissions': const ['work_orders:read'],
  },
};

// ── Servidor falso: responde por ordem; uma resposta pode esperar ──────────────

class _Reply {
  const _Reply(this.status, this.body, {this.gate});
  final int status;
  final Map<String, Object?> body;
  final Completer<void>? gate;
}

class _Server implements HttpClientAdapter {
  _Server(this.replies);

  final List<_Reply> replies;
  final List<RequestOptions> requests = [];

  List<RequestOptions> get logins =>
      requests.where((r) => r.path == _loginPath).toList();

  Map<String, Object?> bodyOf(RequestOptions r) =>
      Map<String, Object?>.from(r.data as Map);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final i = logins.length - 1;
    final reply = options.path == _loginPath && i < replies.length
        ? replies[i]
        : const _Reply(500, {
            'error': {'code': 'SEM_RESPOSTA'},
          });
    await reply.gate?.future;
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

class _CountingStorage extends InMemoryAuthTokenStorage {
  int saves = 0;

  @override
  Future<void> saveSession(AuthSession session) async {
    saves++;
    await super.saveSession(session);
  }
}

class _NoTelemetry implements TelemetryCaptureService {
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

/// O bootstrap da organização da sessão, sem rede (o Início lê dele).
class _Boot implements MobileBootstrapRepository {
  @override
  Future<BootstrapSession> fetch(AuthSession? session) async {
    if (session == null) throw const ApiUnauthorizedError();
    final id = session.user.tenantId;
    return BootstrapSession(
      activeTenant: TenantContext(
        tenantId: id,
        displayName: _nomes[id]!,
        userRole: 'field_technician',
      ),
      availableTenants: [
        TenantContext(
          tenantId: id,
          displayName: _nomes[id]!,
          userRole: 'field_technician',
        ),
      ],
      enabledModules: const [],
      permissions: const PermissionSet({'work_orders:read'}),
      user: AuthenticatedUser(
        userId: session.user.sub,
        email: _email,
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        scope: 'tenant',
      ),
    ).withOwnerKey(sessionKeyOf(session));
  }

  @override
  Future<BootstrapSession?> restoreCached() async => null;

  @override
  Future<void> cache(BootstrapSession session) async {}

  @override
  Future<void> clearCache() async {}
}

class _H {
  _H(this.server, this.storage, this.container);
  final _Server server;
  final _CountingStorage storage;
  final ProviderContainer container;

  GoRouter get router => container.read(appRouterProvider);
  String get path => router.routerDelegate.currentConfiguration.uri.path;
  AuthState? get auth => container.read(authStateProvider).asData?.value;
}

/// Abre o app real no Entrar, num aparelho de 390 × 812.
Future<_H> _abre(
  WidgetTester tester,
  List<_Reply> replies, {
  bool offline = false,
}) async {
  tester.view.physicalSize = const Size(1170, 2436);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final server = _Server(replies);
  final dio = Dio(BaseOptions(baseUrl: 'https://teste.local'))
    ..transformer = SyncTransformer()
    ..httpClientAdapter = server;
  final storage = _CountingStorage();
  final container = ProviderContainer(
    overrides: [
      authTokenStorageProvider.overrideWithValue(storage),
      authRepositoryProvider.overrideWithValue(
        DioAuthRepository(client: dio, storage: storage),
      ),
      telemetryCaptureServiceProvider.overrideWithValue(_NoTelemetry()),
      mobileBootstrapRepositoryProvider.overrideWithValue(_Boot()),
      remoteAuthModeProvider.overrideWithValue(true),
      workOrderRemoteApiProvider.overrideWithValue(null),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      syncActionStoreProvider.overrideWithValue(InMemorySyncActionStore()),
    ],
  );
  addTearDown(container.dispose);
  if (offline) container.read(networkStatusProvider.notifier).setOffline();
  final h = _H(server, storage, container);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: ErpMobileTheme.light(),
        routerConfig: h.router,
      ),
    ),
  );
  // A abertura navega sozinha depois de 2,2 s; sem sessão, cai no Entrar.
  await tester.pump(const Duration(milliseconds: 2300));
  await tester.pumpAndSettle();
  expect(find.byType(LoginScreen), findsOneWidget);
  return h;
}

Future<void> _entra(WidgetTester tester) async {
  final campos = find.byType(TextField);
  await tester.enterText(campos.at(0), _email);
  await tester.enterText(campos.at(1), _senha);
  await tester.tap(find.byKey(const Key('login-entrar')));
  await tester.pumpAndSettle();
}

Finder _linha(String id) => find.byKey(Key('login-escolha-$id'));

void main() {
  testWidgets('L1 — o 409 com [A, B] mostra a escolha com exatamente A e B; '
      'nada gravado; não autenticado', (tester) async {
    final h = await _abre(tester, [
      _Reply(409, _escolha([_org(_idA), _org(_idB)])),
    ]);
    await _entra(tester);

    expect(find.text('Escolha a organização'), findsOneWidget);
    expect(_linha(_idA), findsOneWidget);
    expect(_linha(_idB), findsOneWidget);
    expect(
      find.byWidgetPredicate((w) {
        final k = w.key;
        return k is ValueKey<String> && k.value.startsWith('login-escolha-0');
      }),
      findsNWidgets(2),
    );
    expect(find.text('Guincho Norte'), findsOneWidget);
    expect(find.text('Guincho Sul'), findsOneWidget);
    expect(find.textContaining(_email), findsOneWidget);
    expect(
      find.textContaining('Sua senha vale em 2 organizações'),
      findsOneWidget,
    );
    // Nada gravado, ninguém entrou, um pedido só (sem organização).
    expect(h.storage.saves, 0);
    expect(await h.storage.loadSession(), isNull);
    expect(h.auth?.isAuthenticated ?? false, isFalse);
    expect(h.server.logins, hasLength(1));
    expect(
      h.server.bodyOf(h.server.logins.single).containsKey('tenantId'),
      isFalse,
    );
    expect(h.path, '/login');
  });

  testWidgets('L2 — tocar B faz o 2º login com {email, password, tenantId: B}; '
      'a sessão gravada é a de B e o Início mostra B', (tester) async {
    final h = await _abre(tester, [
      _Reply(409, _escolha([_org(_idA), _org(_idB)])),
      _Reply(200, _entrou(_idB)),
    ]);
    await _entra(tester);
    await tester.tap(_linha(_idB));
    await tester.pumpAndSettle();

    expect(h.server.logins, hasLength(2));
    expect(h.server.bodyOf(h.server.logins.last), {
      'email': _email,
      'password': _senha,
      'tenantId': _idB,
    });
    final saved = await h.storage.loadSession();
    expect(saved!.user.tenantId, _idB);
    expect(h.auth!.session!.user.tenantId, _idB);
    expect(h.path, '/');
    expect(find.byType(HomeScreen), findsOneWidget);
    expect(find.textContaining('Guincho Sul'), findsWidgets);
    expect(find.textContaining('Guincho Norte'), findsNothing);
  });

  testWidgets(
    'L4 — o 2º login dá 401: volta ao Entrar com a mensagem de senha; '
    'a lista some; 0 sessão gravada',
    (tester) async {
      final h = await _abre(tester, [
        _Reply(409, _escolha([_org(_idA), _org(_idB)])),
        const _Reply(401, {
          'error': {'code': 'INVALID_CREDENTIALS'},
        }),
      ]);
      await _entra(tester);
      await tester.tap(_linha(_idA));
      await tester.pumpAndSettle();

      expect(find.text('Escolha a organização'), findsNothing);
      expect(_linha(_idA), findsNothing);
      expect(find.byKey(const Key('login-entrar')), findsOneWidget);
      expect(find.text(kLoginRefusedMessage), findsOneWidget);
      expect(h.storage.saves, 0);
      expect(await h.storage.loadSession(), isNull);
      expect(h.path, '/login');
    },
  );

  testWidgets(
    'L5 — o 400 TENANT_ID_REQUIRED mostra o texto do §A2.2, sem lista '
    'e sem "Selecione"',
    (tester) async {
      final h = await _abre(tester, [
        const _Reply(400, {
          'error': {'code': 'TENANT_ID_REQUIRED'},
        }),
      ]);
      await _entra(tester);

      expect(find.text(_textoDoQuatrocentos), findsOneWidget);
      expect(find.text('Escolha a organização'), findsNothing);
      expect(find.textContaining('Selecione'), findsNothing);
      expect(find.byKey(const Key('login-escolha')), findsNothing);
      expect(h.storage.saves, 0);
    },
  );

  testWidgets(
    'L8 — "Voltar" na escolha volta ao Entrar sem nenhum pedido a mais',
    (tester) async {
      final h = await _abre(tester, [
        _Reply(409, _escolha([_org(_idA), _org(_idB)])),
      ]);
      await _entra(tester);
      expect(find.text('Escolha a organização'), findsOneWidget);

      await tester.tap(find.byKey(const Key('login-escolha-voltar')));
      await tester.pumpAndSettle();

      expect(find.text('Escolha a organização'), findsNothing);
      expect(find.byKey(const Key('login-entrar')), findsOneWidget);
      expect(h.server.requests, hasLength(1));
      expect(h.storage.saves, 0);
      // O e-mail continua no formulário.
      expect(find.text(_email), findsOneWidget);
    },
  );

  testWidgets('L9 — a tela de entrada não tem "Entrar com Google" (PH-01)', (
    tester,
  ) async {
    await _abre(tester, const []);
    expect(find.text('Entrar com Google'), findsNothing);
    expect(find.textContaining('Google'), findsNothing);
  });

  testWidgets(
    'UMA-login — o 409 com UMA organização não mostra a escolha: o app '
    'entra nela direto',
    (tester) async {
      final gate = Completer<void>();
      final h = await _abre(tester, [
        _Reply(409, _escolha([_org(_idA)])),
        _Reply(200, _entrou(_idA), gate: gate),
      ]);
      final campos = find.byType(TextField);
      await tester.enterText(campos.at(0), _email);
      await tester.enterText(campos.at(1), _senha);
      await tester.tap(find.byKey(const Key('login-entrar')));
      // Enquanto o 2º login espera, a escolha não aparece.
      for (var i = 0; i < 5; i++) {
        await tester.pump(const Duration(milliseconds: 20));
        expect(find.text('Escolha a organização'), findsNothing);
        expect(find.byKey(const Key('login-escolha')), findsNothing);
      }
      expect(h.server.logins, hasLength(2));
      expect(h.server.bodyOf(h.server.logins.last)['tenantId'], _idA);
      gate.complete();
      await tester.pumpAndSettle();

      expect(find.text('Escolha a organização'), findsNothing);
      expect((await h.storage.loadSession())!.user.tenantId, _idA);
      expect(h.path, '/');
    },
  );

  testWidgets('L6 — o login com 1 organização (200 direto) não passa pela '
      'escolha', (tester) async {
    final h = await _abre(tester, [_Reply(200, _entrou(_idA))]);
    await _entra(tester);
    expect(find.text('Escolha a organização'), findsNothing);
    expect(h.server.logins, hasLength(1));
    expect(h.path, '/');
  });

  testWidgets(
    'DUAS-OU-MAIS-login — com 3 organizações a escolha aparece com as '
    '3, linhas de pelo menos 44 px',
    (tester) async {
      await _abre(tester, [
        _Reply(409, _escolha([_org(_idA), _org(_idB), _org(_idC)])),
      ]);
      await _entra(tester);
      expect(find.text('Escolha a organização'), findsOneWidget);
      for (final id in [_idA, _idB, _idC]) {
        expect(_linha(id), findsOneWidget);
        expect(tester.getSize(_linha(id)).height, greaterThanOrEqualTo(44));
      }
      expect(
        find.textContaining('Sua senha vale em 3 organizações'),
        findsOneWidget,
      );
    },
  );

  testWidgets('Carregando — durante o 2º login a escolhida mostra "Entrando" e '
      'as linhas ficam travadas', (tester) async {
    final gate = Completer<void>();
    final h = await _abre(tester, [
      _Reply(409, _escolha([_org(_idA), _org(_idB)])),
      _Reply(200, _entrou(_idB), gate: gate),
    ]);
    await _entra(tester);
    await tester.tap(_linha(_idB));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 20));

    expect(find.bySemanticsLabel('Entrando em Guincho Sul'), findsOneWidget);
    // Um segundo toque, em outra, não faz pedido.
    await tester.tap(_linha(_idA), warnIfMissed: false);
    await tester.pump();
    expect(h.server.logins, hasLength(2));
    gate.complete();
    await tester.pumpAndSettle();
    expect(h.path, '/');
  });

  testWidgets(
    'Sem conexão — a faixa aparece e o Entrar fica travado, sem pedido',
    (tester) async {
      final h = await _abre(tester, const [], offline: true);
      expect(find.byKey(const Key('login-sem-conexao')), findsOneWidget);
      expect(
        find.text('Sem conexão. Para entrar, o aparelho precisa de internet.'),
        findsOneWidget,
      );
      final botao = tester.widget<FilledButton>(
        find.byKey(const Key('login-entrar')),
      );
      expect(botao.enabled, isFalse);
      await _entra(tester);
      expect(h.server.requests, isEmpty);
    },
  );

  testWidgets(
    'Vazio — o 409 sem lista diz a verdade, sem lista inventada (L7)',
    (tester) async {
      await _abre(tester, [_Reply(409, _escolha(const []))]);
      await _entra(tester);
      expect(find.text('Escolha a organização'), findsNothing);
      expect(find.byKey(const Key('login-erro')), findsOneWidget);
      expect(
        find.textContaining('a lista de organizações não chegou'),
        findsOneWidget,
      );
    },
  );
}
