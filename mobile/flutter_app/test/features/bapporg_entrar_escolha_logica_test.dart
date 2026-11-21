// B-APP-ORG (item 69), fatia A1 — a lógica do Entrar com a escolha de
// organização, sem tela.
//
// Plano B-APP-ORG-69-70 §4.2 e §5.1, Emenda 1 §A2.2 e §6 (linha A1): o 409 do
// login sem organização traz a lista que o servidor mandou (`error.tenants`), e
// só ela; a pessoa escolhe uma, e o 2º login vai direcionado (`tenantId`). O
// 400 diz a verdade, sem lista e sem "Selecione". Nada é gravado antes de entrar.
//
// Todo HTTP passa por um adaptador falso por caminho (sem rede). Os dados são
// fictícios e só existem neste arquivo.

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_capture_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// ── Dados fictícios ──────────────────────────────────────────────────────────

const _email = 'ana.lima@guinchoexemplo.com.br';
const _senha = 'SenhaFicticia#1';
const _loginPath = '/api/v1/auth/login';

const _orgA = {
  'id': '0b6a3c1e-0000-4000-8000-00000000000a',
  'name': 'Guincho Norte',
};
const _orgB = {
  'id': '0b6a3c1e-0000-4000-8000-00000000000b',
  'name': 'Guincho Sul',
};

// O texto do §A2.2 da Emenda 1, literal (o teste não lê a constante do app).
const _textoDoQuatrocentos =
    'Este e-mail está ligado a muitas organizações, e o app ainda não consegue '
    'listá-las aqui. Fale com o administrador da organização em que você quer '
    'entrar.';
const _textoSemLista =
    'Sua senha vale em mais de uma organização, mas a lista de organizações '
    'não chegou. Tente entrar de novo.';

Map<String, Object?> _escolha(List<Object?>? tenants) => {
  'error': {
    'code': 'TENANT_SELECTION_REQUIRED',
    'message': 'Credential matches more than one organization. Choose one.',
    'tenants': ?tenants,
  },
};

/// O 200 do login no formato do servidor (`auth.routes.ts`).
Map<String, Object?> _entrou(String tenantId, {String access = 'tok-1'}) => {
  'data': {
    'authenticated': true,
    'accessToken': access,
    'refreshToken': 'ref-$access',
    'expiresIn': 900,
    'user': {'id': 'usr-$tenantId', 'email': _email, 'tenant_id': tenantId},
    'tenant': {'id': tenantId, 'name': 'qualquer'},
    'must_change_password': false,
    'roles': const [
      {'id': 'r1', 'key': 'field_technician', 'name': 'Técnico'},
    ],
    'permissions': const ['work_orders:read'],
  },
};

// ── Servidor falso: responde por ordem, grava o corpo de cada pedido ─────────

class _Reply {
  const _Reply(this.status, this.body);
  final int status;
  final Map<String, Object?> body;
}

class _Server implements HttpClientAdapter {
  _Server(this.replies);

  final List<_Reply> replies;
  final List<RequestOptions> requests = [];

  List<Map<String, Object?>> get bodies => [
    for (final r in requests) Map<String, Object?>.from(r.data as Map),
  ];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final i = requests.length - 1;
    final reply = i < replies.length
        ? replies[i]
        : const _Reply(500, {
            'error': {'code': 'SEM_RESPOSTA'},
          });
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

/// Conta quantas sessões foram gravadas (nada antes de entrar).
class _CountingStorage extends InMemoryAuthTokenStorage {
  int saves = 0;

  @override
  Future<void> saveSession(AuthSession session) async {
    saves++;
    await super.saveSession(session);
  }
}

class _NoTelemetry implements TelemetryCaptureService {
  int connects = 0;

  @override
  Future<TelemetryEvent?> recordAppConnect({required String tenantId}) async {
    connects++;
    return null;
  }

  @override
  Future<TelemetryEvent?> recordAppDisconnect({
    required String tenantId,
  }) async => null;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _H {
  _H(this.server, this.storage, this.container, this.telemetry);
  final _Server server;
  final _CountingStorage storage;
  final ProviderContainer container;
  final _NoTelemetry telemetry;

  AuthNotifier get notifier => container.read(authStateProvider.notifier);
  AsyncValue<AuthState> get state => container.read(authStateProvider);

  Future<void> login({String? tenantId}) =>
      notifier.login(email: _email, password: _senha, tenantId: tenantId);
}

Future<_H> _harness(List<_Reply> replies) async {
  final server = _Server(replies);
  final dio = Dio(BaseOptions(baseUrl: 'https://teste.local'))
    ..transformer = SyncTransformer()
    ..httpClientAdapter = server;
  final storage = _CountingStorage();
  final telemetry = _NoTelemetry();
  final container = ProviderContainer(
    overrides: [
      authTokenStorageProvider.overrideWithValue(storage),
      authRepositoryProvider.overrideWithValue(
        DioAuthRepository(client: dio, storage: storage),
      ),
      telemetryCaptureServiceProvider.overrideWithValue(telemetry),
    ],
  );
  addTearDown(container.dispose);
  // A abertura: sem sessão guardada, não autenticado, nenhum pedido.
  final opened = await container.read(authStateProvider.future);
  expect(opened.status, AuthStatus.unauthenticated);
  return _H(server, storage, container, telemetry);
}

DioException _badResponse(int status, Map<String, Object?> body) {
  final requestOptions = RequestOptions(path: _loginPath);
  return DioException(
    requestOptions: requestOptions,
    type: DioExceptionType.badResponse,
    response: Response<Map<String, Object?>>(
      requestOptions: requestOptions,
      statusCode: status,
      data: body,
    ),
  );
}

List<String> _ids(List<TenantChoice> choices) => [
  for (final c in choices) c.id,
];

TenantSelectionRequiredError _choiceError(_H h) {
  final error = h.state.error;
  expect(error, isA<TenantSelectionRequiredError>());
  return error! as TenantSelectionRequiredError;
}

void main() {
  test('L1r — o 409 com [A, B] vira a escolha com exatamente A e B; '
      'nada gravado; não autenticado', () async {
    final h = await _harness([
      _Reply(409, _escolha([_orgA, _orgB])),
    ]);

    await h.login();

    final error = _choiceError(h);
    expect(error.tenants, const [
      TenantChoice('0b6a3c1e-0000-4000-8000-00000000000a', 'Guincho Norte'),
      TenantChoice('0b6a3c1e-0000-4000-8000-00000000000b', 'Guincho Sul'),
    ]);
    expect(error.safeMessage.contains('organização'), isTrue);
    expect(error.safeMessage.toLowerCase().contains('tenant'), isFalse);
    // O 1º login foi sem organização, e só ele saiu.
    expect(h.server.requests, hasLength(1));
    expect(h.server.bodies.single.containsKey('tenantId'), isFalse);
    // Nada gravado, ninguém entrou.
    expect(h.storage.saves, 0);
    expect(await h.storage.loadSession(), isNull);
    expect(h.state.asData?.value.isAuthenticated ?? false, isFalse);
    expect(h.telemetry.connects, 0);
  });

  test(
    'L2n — escolher B faz o 2º login com tenantId B, e a sessão é a de B',
    () async {
      final h = await _harness([
        _Reply(409, _escolha([_orgA, _orgB])),
        _Reply(200, _entrou(_orgB['id']!, access: 'tok-b')),
      ]);

      await h.login();
      final escolhida = _choiceError(
        h,
      ).tenants.singleWhere((c) => c.name == 'Guincho Sul');
      await h.login(tenantId: escolhida.id);

      expect(h.server.requests, hasLength(2));
      expect(h.server.bodies.last, {
        'email': _email,
        'password': _senha,
        'tenantId': '0b6a3c1e-0000-4000-8000-00000000000b',
      });
      final value = h.state.asData!.value;
      expect(value.status, AuthStatus.authenticated);
      expect(
        value.session!.user.tenantId,
        '0b6a3c1e-0000-4000-8000-00000000000b',
      );
      expect(value.session!.tokens.accessToken, 'tok-b');
      final saved = await h.storage.loadSession();
      expect(saved!.user.tenantId, '0b6a3c1e-0000-4000-8000-00000000000b');
      expect(h.storage.saves, 1);
      expect(h.telemetry.connects, 1);
    },
  );

  test('L3r — a lista é só a do 409: um bootstrap antigo guardado, de outra '
      'organização, não entra', () async {
    final h = await _harness([
      _Reply(409, _escolha([_orgA, _orgB])),
    ]);
    await h.storage.saveBootstrapJson(
      jsonEncode({
        'available_tenants': [
          {'tenant_id': 'org-velha', 'tenant_name': 'Organização Antiga'},
        ],
        'active_tenant': {'tenant_id': 'org-velha'},
      }),
    );

    await h.login();

    final ids = _ids(_choiceError(h).tenants);
    expect(ids, [
      '0b6a3c1e-0000-4000-8000-00000000000a',
      '0b6a3c1e-0000-4000-8000-00000000000b',
    ]);
    expect(ids.contains('org-velha'), isFalse);
    // A ordem é a do servidor, e não outra.
    final invertida = mapLoginError(
      _badResponse(409, _escolha([_orgB, _orgA])),
    );
    expect(_ids((invertida as TenantSelectionRequiredError).tenants), [
      '0b6a3c1e-0000-4000-8000-00000000000b',
      '0b6a3c1e-0000-4000-8000-00000000000a',
    ]);
  });

  test('L4n — o 2º login dá 401: volta ao erro de senha, a lista some e '
      'nada é gravado', () async {
    final h = await _harness([
      _Reply(409, _escolha([_orgA, _orgB])),
      const _Reply(401, {
        'error': {
          'code': 'INVALID_CREDENTIALS',
          'message': 'Invalid credentials.',
        },
      }),
    ]);

    await h.login();
    await h.login(tenantId: _choiceError(h).tenants.first.id);

    final error = h.state.error;
    expect(error, isA<ApiUnauthorizedError>());
    expect(error, isNot(isA<TenantSelectionRequiredError>()));
    expect(
      (error! as ApiError).safeMessage,
      'Não foi possível entrar. Confira o e-mail e a senha.',
    );
    expect(h.server.requests, hasLength(2));
    expect(h.storage.saves, 0);
    expect(await h.storage.loadSession(), isNull);
    expect(h.state.asData?.value.isAuthenticated ?? false, isFalse);
  });

  test('L5r — o 400 TENANT_ID_REQUIRED diz a verdade: sem lista, sem '
      '"Selecione" e sem dizer quantas', () {
    final error = mapLoginError(
      _badResponse(400, {
        'error': {
          'code': 'TENANT_ID_REQUIRED',
          'message': 'tenantId is required for this email.',
        },
      }),
    );

    expect(error, isA<ApiServerError>());
    expect(error, isNot(isA<TenantSelectionRequiredError>()));
    expect((error as ApiServerError).statusCode, 400);
    expect(error.safeMessage, _textoDoQuatrocentos);
    expect(error.safeMessage.toLowerCase().contains('selecione'), isFalse);
    expect(error.safeMessage.toLowerCase().contains('escolha'), isFalse);
    expect(RegExp(r'\d').hasMatch(error.safeMessage), isFalse);
    expect(error.safeMessage.contains('administrador'), isTrue);
    expect(error.safeMessage.toLowerCase().contains('tenant'), isFalse);
  });

  test('L5r (notifier) — o 400 no login: o mesmo texto, nenhuma lista, '
      'nada gravado', () async {
    final h = await _harness([
      const _Reply(400, {
        'error': {
          'code': 'TENANT_ID_REQUIRED',
          'message': 'tenantId is required for this email.',
        },
      }),
    ]);

    await h.login();

    final error = h.state.error;
    expect(error, isA<ApiServerError>());
    expect((error! as ApiError).safeMessage, _textoDoQuatrocentos);
    expect(h.server.requests, hasLength(1));
    expect(h.storage.saves, 0);
    expect(h.state.asData?.value.isAuthenticated ?? false, isFalse);
  });

  test('L6 — a senha que vale em 1 organização entra direto (200), '
      'sem passar pela escolha', () async {
    final h = await _harness([
      _Reply(200, _entrou(_orgA['id']!, access: 'tok-a')),
    ]);
    final seen = <AsyncValue<AuthState>>[];
    h.container.listen(authStateProvider, (_, next) => seen.add(next));

    await h.login();

    expect(h.server.requests, hasLength(1));
    expect(h.server.bodies.single.containsKey('tenantId'), isFalse);
    expect(seen.where((s) => s.error is TenantSelectionRequiredError), isEmpty);
    final value = h.state.asData!.value;
    expect(value.status, AuthStatus.authenticated);
    expect(
      value.session!.user.tenantId,
      '0b6a3c1e-0000-4000-8000-00000000000a',
    );
    expect(h.storage.saves, 1);
  });

  group('L7r — o 409 sem lista legível vira a mensagem honesta, '
      'sem lista inventada', () {
    final casos = <String, List<Object?>?>{
      'tenants ausente': null,
      'tenants vazia': const [],
      'item sem name': [
        _orgA,
        {'id': 'org-x'},
      ],
      'id que não é texto': [
        {'id': 7, 'name': 'Org Sete'},
      ],
      'id vazio': [
        {'id': '  ', 'name': 'Org Branca'},
      ],
      'name vazio': [
        {'id': 'org-y', 'name': ''},
      ],
      'item que não é objeto': [_orgA, 'org-z'],
      'id repetido': [_orgA, _orgA],
    };
    for (final caso in casos.entries) {
      test(caso.key, () {
        final error = mapLoginError(_badResponse(409, _escolha(caso.value)));
        expect(error, isA<ApiConflictError>());
        expect(error, isNot(isA<TenantSelectionRequiredError>()));
        expect(error.safeMessage, _textoSemLista);
        expect(error.safeMessage.toLowerCase().contains('selecione'), isFalse);
      });
    }

    test('tenants que não é lista', () {
      final error = mapLoginError(
        _badResponse(409, {
          'error': {
            'code': 'TENANT_SELECTION_REQUIRED',
            'tenants': {'id': 'org-a', 'name': 'Org A'},
          },
        }),
      );
      expect(error, isA<ApiConflictError>());
      expect(error.safeMessage, _textoSemLista);
    });

    test('um corpo de erro que não é objeto não derruba o login', () {
      final error = mapLoginError(_badResponse(409, {'error': 'quebrado'}));
      expect(error, isA<ApiError>());
      expect(error, isNot(isA<TenantSelectionRequiredError>()));
    });

    test('no notifier: nada gravado, nenhuma lista', () async {
      final h = await _harness([_Reply(409, _escolha(null))]);
      await h.login();
      expect(h.state.error, isA<ApiConflictError>());
      expect((h.state.error! as ApiError).safeMessage, _textoSemLista);
      expect(h.notifier.loginTenantChoices, isEmpty);
      expect(h.container.read(loginTenantChoicesProvider), isEmpty);
      expect(h.storage.saves, 0);
    });
  });

  test('o estado do login com a lista — o notifier e o provider leem a lista '
      'do 409; somem no 2º login e no "Voltar", sem pedido a mais', () async {
    final h = await _harness([
      _Reply(409, _escolha([_orgA, _orgB])),
      _Reply(409, _escolha([_orgA, _orgB])),
      _Reply(200, _entrou(_orgA['id']!)),
    ]);

    expect(h.notifier.loginTenantChoices, isEmpty);
    await h.login();
    final esperado = [
      '0b6a3c1e-0000-4000-8000-00000000000a',
      '0b6a3c1e-0000-4000-8000-00000000000b',
    ];
    expect(_ids(h.notifier.loginTenantChoices), esperado);
    expect(_ids(h.container.read(loginTenantChoicesProvider)), esperado);

    // "Voltar": sai da escolha sem pedido e sem gravar nada.
    h.notifier.dismissTenantChoice();
    expect(h.notifier.loginTenantChoices, isEmpty);
    expect(h.container.read(loginTenantChoicesProvider), isEmpty);
    expect(h.state.asData!.value.status, AuthStatus.unauthenticated);
    expect(h.server.requests, hasLength(1));
    // Fora da escolha, o "Voltar" não faz nada.
    h.notifier.dismissTenantChoice();
    expect(h.state.asData!.value.status, AuthStatus.unauthenticated);

    // De novo o 409; enquanto o 2º login corre, a lista não fica na tela.
    await h.login();
    expect(_ids(h.notifier.loginTenantChoices), esperado);
    final segundo = h.login(tenantId: esperado.first);
    expect(h.notifier.loginTenantChoices, isEmpty);
    await segundo;
    expect(h.notifier.loginTenantChoices, isEmpty);
    expect(h.state.asData!.value.status, AuthStatus.authenticated);
    expect(h.server.requests, hasLength(3));
    expect(h.storage.saves, 1);
  });

  // Ressalva da verificação da F1 (Azure, MÉDIA): os parâmetros da T-b são
  // opcionais no interceptador e no `createAuthenticatedHttpClient`. Esta
  // guarda varre `lib/` e falha se alguma CONSTRUÇÃO de
  // `AuthRefreshInterceptor(` ou CHAMADA de `createAuthenticatedHttpClient(`
  // (fora das declarações) não passar `boundSessionKey:` e `currentSessionKey:`.
  // É guarda de fiação: avisa; quem prova o comportamento é o
  // `bapporg_travas_test.dart` (T10b e T10b-fiação).
  group('G-TB — todo cliente autenticado de lib/ passa as duas chaves da T-b', () {
    final sites = _tbSites();

    test('as construções e chamadas encontradas (o censo)', () {
      // O censo de hoje: 1 construção do interceptador e 1 chamada do cliente.
      // Um sítio novo entra aqui e precisa passar as duas chaves (abaixo).
      expect(sites.map((s) => s.label).toList(), [
        'createAuthenticatedHttpClient( em lib/core/auth/session_http_client.dart',
        'AuthRefreshInterceptor( em lib/core/network/http_client.dart',
      ]);
    });

    test('cada uma passa boundSessionKey: e currentSessionKey:', () {
      final faltando = [
        for (final site in sites)
          for (final param in const ['boundSessionKey:', 'currentSessionKey:'])
            if (!site.args.contains(param)) '${site.label} sem $param',
      ];
      expect(faltando, isEmpty);
    });
  });
}

class _TbSite {
  const _TbSite(this.label, this.args);
  final String label;
  final String args;
}

/// Os sítios de `lib/` que montam um cliente autenticado: cada
/// `AuthRefreshInterceptor(` que não é a declaração do construtor (`({`) e cada
/// `createAuthenticatedHttpClient(` que não é a declaração da função
/// (`Dio createAuthenticatedHttpClient(`). `args` é o texto entre os parênteses
/// balanceados da chamada.
List<_TbSite> _tbSites() {
  final sites = <_TbSite>[];
  final files =
      Directory('lib')
          .listSync(recursive: true)
          .whereType<File>()
          .where((f) => f.path.endsWith('.dart'))
          .toList()
        ..sort((a, b) => a.path.compareTo(b.path));
  for (final file in files) {
    final rel = file.path.replaceAll(r'\', '/');
    final text = file.readAsStringSync();
    for (final name in const [
      'AuthRefreshInterceptor(',
      'createAuthenticatedHttpClient(',
    ]) {
      var from = 0;
      while (true) {
        final at = text.indexOf(name, from);
        if (at < 0) break;
        from = at + name.length;
        final open = at + name.length - 1;
        final args = _balanced(text, open);
        final declaration =
            args.trimLeft().startsWith('{') ||
            text.substring(0, at).trimRight().endsWith('Dio');
        if (declaration) continue;
        sites.add(_TbSite('$name em $rel', args));
      }
    }
  }
  return sites;
}

String _balanced(String text, int open) {
  var depth = 0;
  for (var i = open; i < text.length; i++) {
    final c = text[i];
    if (c == '(') depth++;
    if (c == ')') {
      depth--;
      if (depth == 0) return text.substring(open + 1, i);
    }
  }
  return text.substring(open + 1);
}
