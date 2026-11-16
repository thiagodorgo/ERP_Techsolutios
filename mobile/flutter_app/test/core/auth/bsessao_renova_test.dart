// B-APP-SESSAO-RENOVA (item 68 do portão) — a porta da renovação e as frases.
//
// Cada caso começa por `[ID]` e roda com `--plain-name '[ID]'` (§5.0 do plano).
//
// O terreno (§5.0) é um servidor local (`dart:io`) que segue o contrato NOVO do
// servidor: troca o token de renovação a cada uso; o antecessor imediato, com a
// janela aberta e o vínculo certo, recebe o MESMO sucessor (S4, S5, S6); o token
// velho fora disso revoga a sessão (S3); o "Sair" com qualquer token da sessão
// a revoga (S2) e responde 503, 400 ou 200 conforme pedido (S1). Clientes,
// interceptador, repositório e notifier são os reais. Os outros testes do bloco
// importam este terreno.
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_http_client.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';

// ── O terreno: o servidor local com o contrato novo ──────────────────────────

String commitDaProva(String prova) => base64Url
    .encode(sha256.convert(base64Url.decode(base64Url.normalize(prova))).bytes)
    .replaceAll('=', '');

class Terreno {
  late HttpServer _server;
  String get base => 'http://127.0.0.1:${_server.port}';

  int geracao = 0;
  String vigente = 'R0';
  String? anterior;
  String vinculo = '';
  String acesso = 'A0';
  bool revogada = false;
  bool janelaAberta = true;
  final usados = <String>{};

  int renovacoes = 0;
  int trocas = 0;
  int reenvios = 0;
  final corposRenovacao = <Map<String, dynamic>>[];
  final corposSair = <Map<String, dynamic>>[];
  final gets = <String, int>{};

  /// Um passo por pedido de renovação: 'ok', '503', '400', '401', '403',
  /// 'ilegivel' (troca e responde 200 sem os tokens), 'fecha' (troca e fecha a
  /// conexão sem responder), 'lento' (espera [lentidao] antes de responder).
  final roteiro = <String>[];
  Duration lentidao = const Duration(seconds: 2);
  int? maxTrocas;
  bool recusaTodoGet = false;
  Duration atrasoRenovacao = Duration.zero;
  Completer<void>? portaoRenovacao;
  Completer<void>? portaoLento;
  String sairModo = 'ok';

  /// F3a: segura a RESPOSTA da renovação depois de o servidor já ter decidido
  /// (trocado ou reenviado); os tokens da resposta ficam os daquele instante.
  Completer<void>? portaoResposta;

  /// F3a: segura o "Sair" antes de o servidor o processar.
  Completer<void>? portaoSair;

  /// F3a: o login abre uma família nova (outra pessoa ou a mesma).
  int logins = 0;
  int trocasSenha = 0;

  /// F3b: o bootstrap do servidor (`GET /mobile/bootstrap`): a pessoa e a
  /// organização do token de acesso (o login as registra), a organização
  /// pedida na troca, e as permissões de agora.
  final contas = <String, (String, String)>{};
  List<String> permissoesBootstrap = const ['work_orders:read'];
  int bootstraps = 0;

  int get gs => gets.values.fold(0, (a, b) => a + b);

  Future<void> start() async {
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server.listen(_handle);
  }

  Future<void> stop() => _server.close(force: true);

  Future<void> _handle(HttpRequest r) async {
    final path = r.uri.path;
    final raw = await utf8.decoder.bind(r).join();
    if (path == '/api/v1/auth/refresh') return _refresh(r, raw);
    if (path == '/api/v1/auth/logout') return _logout(r, raw);
    if (path == '/api/v1/auth/login') return _login(r, raw);
    if (path == '/api/v1/mobile/bootstrap') return _bootstrap(r);
    if (path == '/api/v1/auth/password') {
      trocasSenha++;
      return _json(r, 200, {'data': <String, dynamic>{}});
    }
    gets[path] = (gets[path] ?? 0) + 1;
    if (path == '/lento' && portaoLento != null) await portaoLento!.future;
    final bearer = r.headers.value('authorization');
    if (!recusaTodoGet && !revogada && bearer == 'Bearer $acesso') {
      return _json(r, 200, {'data': 'ok'});
    }
    return _json(r, 401, {
      'error': {'code': 'INVALID_TOKEN'},
    });
  }

  Map<String, dynamic> _corpo(String raw) {
    if (raw.isEmpty) return {};
    final decoded = jsonDecode(raw);
    return decoded is Map<String, dynamic> ? decoded : {};
  }

  Future<void> _refresh(HttpRequest r, String raw) async {
    renovacoes++;
    final corpo = _corpo(raw);
    corposRenovacao.add(corpo);
    if (atrasoRenovacao > Duration.zero) await Future.delayed(atrasoRenovacao);
    if (portaoRenovacao != null) await portaoRenovacao!.future;
    final passo = roteiro.isNotEmpty ? roteiro.removeAt(0) : 'ok';
    if (passo == 'lento') await Future.delayed(lentidao);
    if (const {'503', '400', '401', '403'}.contains(passo)) {
      return _json(r, int.parse(passo), {
        'error': {'code': 'HTTP_$passo'},
      });
    }
    final token = corpo['refreshToken'] as String?;
    if (token == null) {
      return _json(r, 400, {
        'error': {'code': 'BAD_REQUEST'},
      });
    }
    if (revogada || (maxTrocas != null && trocas >= maxTrocas!)) {
      return _recusa(r);
    }
    final commit = corpo['renewalCommit'] as String?;
    final prova = corpo['renewalProof'] as String?;
    final aberto = prova != null ? commitDaProva(prova) : '';
    if (token == vigente) {
      usados.add(vigente);
      anterior = vigente;
      geracao++;
      vigente = 'R$geracao';
      acesso = 'A$geracao';
      vinculo = commit != null
          ? 'commit:$commit'
          : (aberto.isNotEmpty ? 'proof:$aberto' : '');
      trocas++;
    } else if (token == anterior &&
        janelaAberta &&
        _casa(commit: commit, aberto: aberto)) {
      reenvios++;
    } else {
      // Reuso (S3): um token já trocado volta fora do reenvio.
      if (usados.contains(token)) revogada = true;
      return _recusa(r);
    }
    final acessoDaResposta = acesso;
    final vigenteDaResposta = vigente;
    if (portaoResposta != null) await portaoResposta!.future;
    if (passo == 'fecha') {
      final socket = await r.response.detachSocket(writeHeaders: false);
      socket.destroy();
      return;
    }
    if (passo == 'ilegivel') {
      return _json(r, 200, {'data': <String, dynamic>{}});
    }
    return _json(r, 200, {
      'data': {
        'access_token': acessoDaResposta,
        'accessToken': acessoDaResposta,
        'token_type': 'Bearer',
        'expires_in': 900,
        'refresh_token': vigenteDaResposta,
        'refreshToken': vigenteDaResposta,
        'session_id': 's1',
      },
    });
  }

  /// O login abre uma família nova: `RL<n>` e `AL<n>`; o usuário sai do e-mail
  /// (`b@t1.test` → `b`) e da organização pedida (`t1` sem pedido).
  Future<void> _login(HttpRequest r, String raw) async {
    final corpo = _corpo(raw);
    logins++;
    revogada = false;
    anterior = null;
    vinculo = '';
    usados.clear();
    vigente = 'RL$logins';
    acesso = 'AL$logins';
    final email = corpo['email'] as String? ?? 'x@t1.test';
    contas[acesso] = (
      email.split('@').first,
      corpo['tenantId'] as String? ?? 't1',
    );
    return _json(r, 200, {
      'data': {
        'access_token': acesso,
        'refresh_token': vigente,
        'expires_in': 900,
        'user': {
          'id': email.split('@').first,
          'email': email,
          'tenant_id': corpo['tenantId'] as String? ?? 't1',
        },
        'roles': [
          {'key': 'field_technician'},
        ],
      },
    });
  }

  bool _casa({required String? commit, required String aberto}) {
    if (aberto.isNotEmpty) {
      return vinculo == 'commit:$aberto' || vinculo == 'proof:$aberto';
    }
    if (commit != null) return vinculo == 'proof:$commit' || vinculo == '';
    return vinculo == '';
  }

  Future<void> _logout(HttpRequest r, String raw) async {
    final corpo = _corpo(raw);
    corposSair.add(corpo);
    if (portaoSair != null) await portaoSair!.future;
    if (sairModo == '503') {
      return _json(r, 503, {
        'error': {'reason': 'logout_failed'},
      });
    }
    final token = corpo['refreshToken'] as String?;
    if (sairModo == '400' || token == null) {
      return _json(r, 400, {
        'error': {'reason': 'refresh_token_required'},
      });
    }
    if (token == vigente || token == anterior || usados.contains(token)) {
      revogada = true;
    }
    return _json(r, 200, {
      'data': {'revoked': true},
    });
  }

  Future<void> _bootstrap(HttpRequest r) {
    bootstraps++;
    final bearer = r.headers.value('authorization') ?? '';
    final token = bearer.startsWith('Bearer ') ? bearer.substring(7) : '';
    final (sub, tenantDoLogin) = contas[token] ?? ('u1', 't1');
    final tenant = r.uri.queryParameters['tenantId'] ?? tenantDoLogin;
    return _json(r, 200, {
      'user': {
        'sub': sub,
        'email': '$sub@$tenant.test',
        'tenantRole': 'field_technician',
        'tenantRoles': ['field_technician'],
        'permissions': permissoesBootstrap,
      },
      'activeTenant': {
        'tenantId': tenant,
        'displayName': 'Organização $tenant',
      },
    });
  }

  Future<void> _recusa(HttpRequest r) => _json(r, 401, {
    'error': {'code': 'INVALID_REFRESH_TOKEN'},
  });

  Future<void> _json(HttpRequest r, int status, Object body) async {
    r.response
      ..statusCode = status
      ..headers.contentType = ContentType.json
      ..write(jsonEncode(body));
    await r.response.close();
  }
}

/// Uma porta que nada escuta (o servidor fora do ar).
Future<int> portaFechada() async {
  final s = await ServerSocket.bind(InternetAddress.loopbackIPv4, 0);
  final port = s.port;
  await s.close();
  return port;
}

// ── O aparelho: o app de verdade sobre o terreno ─────────────────────────────

const usuarioU1 = AuthUser(
  sub: 'u1',
  email: 'tecnico@t1.test',
  tenantId: 't1',
  tenantRole: 'field_technician',
  tenantRoles: ['field_technician'],
  permissions: ['work_orders:read'],
  scope: 'tenant',
);

AuthSession sessaoGuardada({
  String acesso = 'A-vencido',
  String? renovacao = 'R0',
  AuthUser user = usuarioU1,
  bool vencida = false,
  String? sessionNonce,
}) => AuthSession(
  tokens: AuthTokens(
    accessToken: acesso,
    refreshToken: renovacao,
    expiresAt: vencida
        ? DateTime.now().toUtc().subtract(const Duration(minutes: 1))
        : DateTime.now().toUtc().add(const Duration(minutes: 15)),
  ),
  user: user,
  sessionNonce: sessionNonce,
);

/// O armazenamento em memória que pode lançar sob comando.
class ArmazenamentoInstavel extends InMemoryAuthTokenStorage {
  bool lancaAoLer = false;
  bool lancaAoGravar = false;
  bool lancaAoLimparBootstrap = false;
  int gravacoes = 0;
  final gravados = <String?>[];
  Completer<void>? portaoGravacao;

  @override
  Future<AuthSession?> loadSession() async {
    if (lancaAoLer) throw StateError('armazenamento indisponível');
    return super.loadSession();
  }

  @override
  Future<void> saveSession(AuthSession session) async {
    gravacoes++;
    gravados.add(session.tokens.refreshToken);
    if (portaoGravacao != null) await portaoGravacao!.future;
    if (lancaAoGravar) throw StateError('armazenamento indisponível');
    return super.saveSession(session);
  }

  @override
  Future<void> clearBootstrap() async {
    if (lancaAoLimparBootstrap) throw StateError('armazenamento indisponível');
    return super.clearBootstrap();
  }
}

/// Monta o repositório remoto do app sobre o terreno (os reenvios em ms).
DioAuthRepository repositorioRemoto(
  Dio dio,
  AuthTokenStorage storage, {
  List<Duration> delays = const [
    Duration(milliseconds: 50),
    Duration(milliseconds: 150),
  ],
  Duration deadline = const Duration(seconds: 2),
}) => DioAuthRepository(
  client: dio,
  storage: storage,
  renewalRetryDelays: delays,
  renewalRetryDeadline: deadline,
);

class Aparelho {
  Aparelho(this.terreno, {ArmazenamentoInstavel? storage})
    : storage = storage ?? ArmazenamentoInstavel();

  final Terreno terreno;
  final ArmazenamentoInstavel storage;
  final reportes = <String>[];
  late final Dio authDio;
  late final ProviderContainer container;
  late final Provider<Dio> _cliente;

  /// Abre o app (o `build` do notifier corre aqui).
  Future<AuthState> abrir({
    String? authBase,
    List<Override> extras = const [],
  }) async {
    authDio = createExpenseHttpClient(
      ApiConfig(
        baseUrl: authBase ?? terreno.base,
        connectTimeoutMs: 1000,
        receiveTimeoutMs: 500,
      ),
    );
    container = ProviderContainer(
      overrides: [
        authTokenStorageProvider.overrideWithValue(storage),
        authRepositoryProvider.overrideWithValue(
          repositorioRemoto(authDio, storage),
        ),
        authFailureReporterProvider.overrideWithValue(reportes.add),
        ...extras,
      ],
    );
    _cliente = Provider<Dio>(
      (ref) => sessionHttpClient(ref, ApiConfig(baseUrl: terreno.base)),
    );
    return container.read(authStateProvider.future);
  }

  Dio cliente() => container.read(_cliente);

  /// Um cliente a mais, como outro provider do app (outro Dio, a mesma porta).
  Dio outroCliente() => container.read(
    Provider<Dio>(
      (ref) => sessionHttpClient(ref, ApiConfig(baseUrl: terreno.base)),
    ),
  );

  AuthNotifier get notifier => container.read(authStateProvider.notifier);
  AuthState? get estado => container.read(authStateProvider).asData?.value;

  void fechar() => container.dispose();
}

/// Faz o GET e devolve o status (ou o erro do app, já mapeado).
Future<Object> pedir(Dio dio, [String path = '/api/v1/work-orders']) async {
  try {
    final r = await dio.get<dynamic>(path);
    return r.statusCode ?? -1;
  } on DioException catch (e) {
    return mapDioError(e);
  }
}

// ── Os dublês das frases (T7, T8) ────────────────────────────────────────────

class _CapturingAdapter implements HttpClientAdapter {
  final List<RequestOptions> captured = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    captured.add(options);
    return ResponseBody.fromString(
      '{"data":{"revoked":true}}',
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

DioException _bad(int status, {String path = '/api/v1/work-orders'}) {
  final options = RequestOptions(path: path);
  return DioException(
    requestOptions: options,
    type: DioExceptionType.badResponse,
    response: Response(requestOptions: options, statusCode: status),
  );
}

void main() {
  late Terreno terreno;
  late Aparelho app;

  setUp(() async {
    terreno = Terreno();
    await terreno.start();
    app = Aparelho(terreno);
  });

  tearDown(() async {
    try {
      app.fechar();
    } catch (_) {}
    await terreno.stop();
  });

  test(
    '[T7] o "Sair" manda o token de renovação vigente ao servidor',
    () async {
      final storage = InMemoryAuthTokenStorage();
      await storage.saveSession(sessaoGuardada(renovacao: 'R-vigente'));
      final adapter = _CapturingAdapter();
      final dio = Dio(BaseOptions(baseUrl: 'https://t7.test'))
        ..httpClientAdapter = adapter;
      final container = ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(
            DioAuthRepository(client: dio, storage: storage),
          ),
        ],
      );
      addTearDown(container.dispose);
      await container.read(authStateProvider.future);

      await container.read(authStateProvider.notifier).logout();

      final logout = adapter.captured.where(
        (o) => o.path == '/api/v1/auth/logout',
      );
      expect(logout, hasLength(1));
      expect(logout.single.data, {'refreshToken': 'R-vigente'});
      expect(await storage.loadSession(), isNull);
      expect(
        container.read(authStateProvider).asData?.value.status,
        AuthStatus.unauthenticated,
      );
    },
  );

  test('[T8] as frases do 401, do 403 e da senha errada', () {
    final expired = mapDioError(_bad(401));
    expect(expired, isA<ApiSessionExpiredError>());
    expect(expired.safeMessage, kSessionExpiredMessage);

    final forbidden = mapDioError(_bad(403));
    expect(forbidden, isA<ApiForbiddenError>());
    expect(forbidden, isNot(isA<ApiSessionExpiredError>()));
    expect(forbidden.safeMessage, 'Você não tem permissão para esta ação.');

    final refused = mapLoginError(_bad(401, path: '/api/v1/auth/login'));
    expect(refused, isNot(isA<ApiSessionExpiredError>()));
    expect(refused.safeMessage, kLoginRefusedMessage);
    expect(refused.safeMessage, isNot(kSessionExpiredMessage));
    expect(
      kLoginRefusedMessage,
      'Não foi possível entrar. Confira o e-mail e a senha.',
    );
    expect(
      kSessionExpiredMessage,
      'Sua sessão expirou. Entre de novo para continuar.',
    );
  });

  test(
    '[T1b] o servidor recusa todo GET e aceita no máximo 3 renovações: GET = 2, renovação = 1, expired',
    () async {
      terreno.recusaTodoGet = true;
      terreno.maxTrocas = 3;
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      final r = await pedir(app.cliente());

      expect(r, isA<ApiSessionExpiredError>());
      expect(terreno.gs, 2, reason: 'o pedido e uma repetição');
      expect(terreno.renovacoes, 1);
      expect(app.estado?.status, AuthStatus.expired);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T2] 3 pedidos 401 juntos, de 2 clientes: 1 renovação, 3 × 200',
    () async {
      terreno.atrasoRenovacao = const Duration(milliseconds: 150);
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      final a = app.cliente();
      final b = app.outroCliente();

      final rs = await Future.wait([pedir(a), pedir(b), pedir(a)]);

      expect(rs, [200, 200, 200]);
      expect(terreno.renovacoes, 1);
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.estado?.session?.tokens.accessToken, 'A1');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T2b] um 401 atrasado, com o token já trocado: 0 renovação nova, repete com o atual',
    () async {
      terreno.portaoLento = Completer<void>();
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      final dio = app.cliente();

      final lento = pedir(dio, '/lento'); // sai com o token velho
      await Future<void>.delayed(const Duration(milliseconds: 100));
      expect(await pedir(dio), 200); // renova (1) e repete
      expect(terreno.renovacoes, 1);
      terreno.portaoLento!.complete(); // o 401 do token velho chega agora
      terreno.portaoLento = null;

      expect(await lento, 200);
      expect(terreno.renovacoes, 1, reason: 'nenhuma renovação nova');
      expect(terreno.gets['/lento'], 2, reason: 'repetiu com o token atual');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3] o servidor recusa a renovação: expired, frase, sessão e bootstrap nulos, dono, 0 "Sair"',
    () async {
      terreno.roteiro.add('401');
      await app.storage.saveSession(sessaoGuardada());
      await app.storage.saveBootstrapJson('{"cache":"de u1"}');
      await app.abrir();

      final r = await pedir(app.cliente());

      expect(r, isA<ApiSessionExpiredError>());
      final s = app.estado!;
      expect(s.status, AuthStatus.expired);
      expect(s.safeError, kSessionExpiredMessage);
      expect(s.expiredOwnerSub, 'u1');
      expect(await app.storage.loadSession(), isNull);
      expect(await app.storage.loadBootstrapJson(), isNull);
      expect(terreno.corposSair, isEmpty, reason: 'não chama /auth/logout');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3c] sem token de renovação guardado e o pedido volta 401: expired, 0 /auth/refresh',
    () async {
      await app.storage.saveSession(sessaoGuardada(renovacao: null));
      await app.abrir();

      final r = await pedir(app.cliente());

      expect(r, isA<ApiSessionExpiredError>());
      expect(app.estado?.status, AuthStatus.expired);
      expect(terreno.renovacoes, 0);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T4] renovação com porta fechada, 503 ou tempo esgotado: a sessão fica, ApiNetworkError, e renova quando o servidor volta',
    () async {
      final fechada = await portaFechada();
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir(authBase: 'http://127.0.0.1:$fechada');
      final dio = app.cliente();

      // porta fechada
      expect(await pedir(dio), isA<ApiNetworkError>());
      expect(app.estado?.status, AuthStatus.authenticated);
      // 503 (o bastante para qualquer reenvio) e tempo esgotado
      app.authDio.options.baseUrl = terreno.base;
      terreno.roteiro.addAll(['503', '503', '503']);
      expect(await pedir(dio), isA<ApiNetworkError>());
      expect(app.estado?.status, AuthStatus.authenticated);
      terreno.roteiro
        ..clear()
        ..addAll(['lento', 'lento', 'lento']);
      expect(await pedir(dio), isA<ApiNetworkError>());
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(await app.storage.loadSession(), isNotNull);

      // o servidor volta
      terreno.roteiro.clear();
      await Future<void>.delayed(const Duration(seconds: 2));
      expect(await pedir(dio), 200);
      expect(app.estado?.status, AuthStatus.authenticated);
    },
    timeout: const Timeout(Duration(seconds: 30)),
  );

  test(
    '[T4b] abrir sem rede com o token vencido: offlineCached',
    () async {
      final fechada = await portaFechada();
      await app.storage.saveSession(sessaoGuardada(vencida: true));

      final s = await app.abrir(authBase: 'http://127.0.0.1:$fechada');

      expect(s.status, AuthStatus.offlineCached);
      expect(s.session?.user.sub, 'u1');
      expect(await app.storage.loadSession(), isNotNull);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T10a] o armazenamento lança na renovação: a sessão fica, kSessionCheckFailedMessage, relato StateError',
    () async {
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      app.storage.lancaAoLer = true;

      final r = await pedir(app.cliente());

      expect(r, isA<ApiServerError>());
      expect((r as ApiServerError).statusCode, 0);
      expect(r.safeMessage, kSessionCheckFailedMessage);
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.reportes, ['StateError']);
      app.storage.lancaAoLer = false;
      expect(await app.storage.loadSession(), isNotNull);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T10b] renovação com 200 ilegível: a sessão fica, com relato; janela aberta, o pedido seguinte recebe o mesmo sucessor; janela fechada, expired',
    () async {
      // janela aberta
      terreno.roteiro.add('ilegivel');
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      final dio = app.cliente();
      final r = await pedir(dio);
      expect(r, isA<ApiServerError>());
      expect((r as ApiServerError).safeMessage, kSessionCheckFailedMessage);
      expect(app.reportes, ['SessionRenewalLocalError']);
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(await pedir(dio), 200);
      expect(terreno.reenvios, 1, reason: 'o mesmo sucessor, agora legível');
      expect(app.estado?.session?.tokens.refreshToken, 'R1');

      // janela fechada
      final t2 = Terreno();
      await t2.start();
      addTearDown(t2.stop);
      final app2 = Aparelho(t2);
      addTearDown(app2.fechar);
      t2.roteiro.add('ilegivel');
      t2.janelaAberta = false;
      await app2.storage.saveSession(sessaoGuardada());
      await app2.abrir();
      final dio2 = app2.cliente();
      expect(await pedir(dio2), isA<ApiServerError>());
      expect(await pedir(dio2), isA<ApiSessionExpiredError>());
      expect(app2.estado?.status, AuthStatus.expired);
      expect(t2.revogada, isTrue, reason: 'o token velho derrubou a família');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  // ── F3a: a gravação da renovação que falha (N22) ───────────────────────────

  test(
    '[T10c] o saveSession lança na gravação: estado e sessão em memória intactos, com relato; com a janela fechada, o token velho derruba a família e o estado vai a expired',
    () async {
      terreno.janelaAberta = false;
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      final dio = app.cliente();
      app.storage.lancaAoGravar = true;

      final r = await pedir(dio);

      expect(r, isA<ApiServerError>());
      expect((r as ApiServerError).safeMessage, kSessionCheckFailedMessage);
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.estado?.session?.tokens.refreshToken, 'R0');
      expect(app.reportes, ['StateError']);
      expect(terreno.trocas, 1, reason: 'o servidor já trocou');

      app.storage.lancaAoGravar = false;
      final r2 = await pedir(dio);

      expect(r2, isA<ApiSessionExpiredError>());
      expect(app.estado?.status, AuthStatus.expired);
      expect(
        terreno.revogada,
        isTrue,
        reason: 'o reuso do R0 derrubou a família',
      );
      final r1 = await createExpenseHttpClient(ApiConfig(baseUrl: terreno.base))
          .post<dynamic>(
            '/api/v1/auth/refresh',
            data: {'refreshToken': 'R1'},
            options: Options(validateStatus: (_) => true),
          );
      expect(r1.statusCode, 401, reason: 'o R1 não renova mais');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T10d] o saveSession lança na gravação; com a janela aberta e o armazenamento bom, o pedido seguinte recebe o mesmo sucessor e grava: 0 expired, 0 revogação',
    () async {
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      final dio = app.cliente();
      final estados = <AuthStatus>[];
      app.container.listen<AsyncValue<AuthState>>(authStateProvider, (_, n) {
        final s = n.asData?.value.status;
        if (s != null) estados.add(s);
      });
      app.storage.lancaAoGravar = true;

      expect(await pedir(dio), isA<ApiServerError>());
      app.storage.lancaAoGravar = false;
      expect(await pedir(dio), 200);

      expect(terreno.trocas, 1);
      expect(terreno.reenvios, 1, reason: 'o mesmo sucessor');
      expect(terreno.revogada, isFalse);
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.estado?.session?.tokens.refreshToken, 'R1');
      expect((await app.storage.loadSession())?.tokens.refreshToken, 'R1');
      expect(estados, isNot(contains(AuthStatus.expired)));
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  // ── F2b: o reenvio do mesmo token (D1b) e a prova de posse (D1c) ───────────

  Future<(DioAuthRepository, Dio)> repoSobre(
    Terreno t, {
    List<Duration> delays = const [
      Duration(milliseconds: 50),
      Duration(milliseconds: 150),
    ],
    Duration deadline = const Duration(seconds: 2),
  }) async {
    final storage = InMemoryAuthTokenStorage();
    await storage.saveSession(sessaoGuardada());
    final dio = createExpenseHttpClient(
      ApiConfig(baseUrl: t.base, connectTimeoutMs: 1000, receiveTimeoutMs: 500),
    );
    return (
      repositorioRemoto(dio, storage, delays: delays, deadline: deadline),
      dio,
    );
  }

  test(
    '[T11] o servidor troca e fecha a conexão: o app reenvia o mesmo token, recebe o mesmo sucessor, e o pedido repete com 200',
    () async {
      terreno.roteiro.add('fecha');
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      expect(await pedir(app.cliente()), 200);
      expect(terreno.trocas, 1);
      expect(terreno.reenvios, 1);
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.estado?.session?.tokens.refreshToken, 'R1');
      expect(terreno.revogada, isFalse);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T11b] 400, 401 e 403 na renovação: 1 pedido em cada, e nenhum reenvio',
    () async {
      for (final status in ['400', '401', '403']) {
        final t = Terreno();
        await t.start();
        try {
          t.roteiro.add(status);
          final (repo, _) = await repoSobre(t);
          await expectLater(
            repo.refresh(),
            throwsA(isA<ApiSessionExpiredError>()),
          );
          expect(t.renovacoes, 1, reason: status);
        } finally {
          await t.stop();
        }
      }
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T11c] três 503: 3 pedidos e para; a sessão fica (D7)',
    () async {
      terreno.roteiro.addAll(['503', '503', '503', '503']);
      final (repo, _) = await repoSobre(terreno);
      await expectLater(repo.refresh(), throwsA(isA<ApiServerError>()));
      expect(terreno.renovacoes, 3);

      await app.storage.saveSession(sessaoGuardada());
      terreno.roteiro
        ..clear()
        ..addAll(['503', '503', '503']);
      await app.abrir();
      expect(await pedir(app.cliente()), isA<ApiNetworkError>());
      expect(app.estado?.status, AuthStatus.authenticated);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T11d] com esperas de 50 ms e 150 ms e prazo de 120 ms: 2 pedidos',
    () async {
      terreno.roteiro.addAll(['503', '503', '503']);
      final (repo, _) = await repoSobre(
        terreno,
        deadline: const Duration(milliseconds: 120),
      );
      await expectLater(repo.refresh(), throwsA(isA<ApiServerError>()));
      expect(terreno.renovacoes, 2);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test('[T11e] a tabela do renewalCanRetry', () {
    final options = RequestOptions(path: '/api/v1/auth/refresh');
    DioException sem(DioExceptionType type) =>
        DioException(requestOptions: options, type: type);
    DioException com(int status) => DioException(
      requestOptions: options,
      type: DioExceptionType.badResponse,
      response: Response(requestOptions: options, statusCode: status),
    );
    const delays = [Duration(seconds: 1), Duration(seconds: 3)];
    const deadline = Duration(seconds: 20);
    bool pode(DioException e, {int attempt = 0, Duration? elapsed}) =>
        renewalCanRetry(e, attempt, elapsed ?? Duration.zero, delays, deadline);

    for (final type in [
      DioExceptionType.unknown,
      DioExceptionType.connectionError,
      DioExceptionType.connectionTimeout,
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
    ]) {
      expect(pode(sem(type)), isTrue, reason: type.name);
    }
    for (final type in [
      DioExceptionType.cancel,
      DioExceptionType.badCertificate,
    ]) {
      expect(pode(sem(type)), isFalse, reason: type.name);
    }
    for (final s in [500, 502, 503, 504]) {
      expect(pode(com(s)), isTrue, reason: '$s');
    }
    for (final s in [400, 401, 403, 404, 409, 422]) {
      expect(pode(com(s)), isFalse, reason: '$s');
    }
    expect(pode(com(503), attempt: 2), isFalse, reason: '3ª tentativa');
    expect(
      pode(com(503), elapsed: const Duration(seconds: 19, milliseconds: 500)),
      isFalse,
      reason: 'prazo estourado',
    );
  });

  test(
    '[T11f] a resposta se perde: o 1º corpo leva só o compromisso; o reenvio só a prova, que abre o compromisso; o mesmo R1',
    () async {
      terreno.roteiro.add('fecha');
      final (repo, _) = await repoSobre(terreno);

      final fresh = await repo.refresh();

      expect(fresh.tokens.refreshToken, 'R1');
      expect(terreno.trocas, 1);
      expect(terreno.reenvios, 1);
      expect(terreno.revogada, isFalse);
      final c0 = terreno.corposRenovacao[0];
      final c1 = terreno.corposRenovacao[1];
      expect(c0.keys.toSet(), {'refreshToken', 'renewalCommit'});
      expect(c1.keys.toSet(), {'refreshToken', 'renewalProof'});
      expect(commitDaProva(c1['renewalProof'] as String), c0['renewalCommit']);
      expect((c0['renewalCommit'] as String).length, 43);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T11g] a renovação esgota as tentativas (D7); a seguinte do mesmo token leva a prova e recebe o mesmo R1',
    () async {
      terreno.roteiro.addAll(['fecha', '503', '503']);
      final (repo, _) = await repoSobre(terreno);
      await expectLater(repo.refresh(), throwsA(isA<ApiServerError>()));
      expect(terreno.trocas, 1);

      final second = await repo.refresh();

      expect(second.tokens.refreshToken, 'R1');
      expect(terreno.corposRenovacao.last.keys.toSet(), {
        'refreshToken',
        'renewalProof',
      });
      expect(terreno.revogada, isFalse);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T11h] token novo, nonce novo: o 1º envio do token novo volta a levar o compromisso, outro',
    () async {
      final storage = InMemoryAuthTokenStorage();
      await storage.saveSession(sessaoGuardada());
      final dio = createExpenseHttpClient(ApiConfig(baseUrl: terreno.base));
      final repo = repositorioRemoto(dio, storage);
      final r1 = await repo.refresh();
      await repo.commitRefreshed(r1);
      final r2 = await repo.refresh();

      expect(r2.tokens.refreshToken, 'R2');
      final c0 = terreno.corposRenovacao[0];
      final c1 = terreno.corposRenovacao[1];
      expect(c0.keys.toSet(), {'refreshToken', 'renewalCommit'});
      expect(c1.keys.toSet(), {'refreshToken', 'renewalCommit'});
      expect(c1['renewalCommit'], isNot(c0['renewalCommit']));
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T11i] o vetor fixo: o nonce 0..31 dá o compromisso e a prova do C5',
    () {
      final nonce = List<int>.generate(32, (i) => i);
      expect(renewalBindingFields(nonce, firstSend: true), {
        'renewalCommit': 'Yw3NKWbEM2aRElRIu7JbT_QSpJxzLbLIq8G4WBvXEN0',
      });
      expect(renewalBindingFields(nonce, firstSend: false), {
        'renewalProof': 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
      });
      expect(renewalNonce(), hasLength(32));
      expect(renewalNonce(), isNot(renewalNonce()));
    },
  );
}
