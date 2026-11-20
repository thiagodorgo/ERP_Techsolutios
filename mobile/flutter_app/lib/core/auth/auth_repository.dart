import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../network/api_error.dart';
import '../network/http_client.dart';
import '../bootstrap/bootstrap_session.dart';
import 'auth_token_storage.dart';
import 'session_renewal.dart';
import '../../features/auth/auth_models.dart';

/// B-APP-ORG (70): a rota da troca de organização (decide pelo vínculo).
const kActiveTenantPath = '/api/v1/auth/active-tenant';

/// B-APP-ORG (70, plano §3.4): a troca sem rede.
const kTenantSwitchOfflineMessage = 'Sem conexão. A troca precisa de internet.';

/// B-APP-SESSAO-RENOVA (D11): o desfecho de um "Sair" no servidor.
/// - `revoked`: 2xx; o servidor garante que o token não renova mais (S1);
/// - `discard`: 400; tentar de novo não resolve;
/// - `retry`: 5xx, rede, tempo esgotado ou qualquer outra resposta.
enum RevocationOutcome { revoked, discard, retry }

abstract class AuthRepository {
  Future<AuthSession> login({
    required String email,
    required String password,
    String? tenantId,
  });

  /// B-APP-SESSAO-RENOVA (D1): pede ao servidor a sessão renovada e a
  /// DEVOLVE, sem gravar nada. Só o notifier grava, dentro da trava
  /// ([commitRefreshed]). A recusa do servidor (400, 401, 403) e a falta de
  /// token guardado viram [ApiSessionExpiredError]; um 200 ilegível vira
  /// [SessionRenewalLocalError]; o resto passa por `mapDioError`.
  Future<AuthSession> refresh();

  /// Guarda a sessão renovada. Só o notifier chama, dentro da trava.
  Future<void> commitRefreshed(AuthSession session);

  /// B-APP-ORG (70): pede a troca para [tenantId] (`POST
  /// /api/v1/auth/active-tenant`) pelo [client] de sessão (com a porta da
  /// renovação) e DEVOLVE a sessão nova, sem gravar nada. O 403 vira
  /// [TenantSwitchRefusedError]; sem rede, [ApiNetworkError] com
  /// [kTenantSwitchOfflineMessage]; um 200 ilegível, [TenantSwitchMismatchError].
  Future<AuthSession> switchTenant({
    required AuthSession current,
    required String tenantId,
    required Dio client,
  });

  /// B-APP-ORG (70): guarda a sessão da troca. Só o notifier chama, dentro da
  /// trava. A sessão restrita (senha provisória) fica só em memória, como no
  /// login.
  Future<void> commitSwitched(AuthSession session);

  /// O único `POST /auth/logout` do app: entrega ao servidor o token de
  /// renovação que deve morrer (o servidor revoga a sessão inteira). Nunca
  /// lança: devolve [RevocationOutcome] (D11).
  Future<RevocationOutcome> revokeRefreshToken(String refreshToken);

  /// Limpa só o aparelho (sessão e bootstrap). Quem revoga é o notifier.
  Future<void> logout();
  Future<AuthSession?> restoreSession();
  AuthSession? currentSession();
  Future<void> clearSession();

  /// B-USERS-ACESSO-SEG (T2): troca a PRÓPRIA senha (`POST /api/v1/auth/password`)
  /// com o token da sessão em memória. Sucesso: o backend revoga todas as
  /// sessões do par, e a sessão local é apagada. Falha: [PasswordChangeError],
  /// com texto fixo. A troca nunca vai para a fila offline nem é repetida.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  });
}

// ── B-USERS-ACESSO-SEG (T2): textos e mapa fixo da troca de senha ──────────────
//
// Plano B-USERS-ACESSO-SEG-conserto-c1.md, A-04 (T.1): a mensagem do servidor
// NUNCA é exibida (vem em inglês e pode vir crua); o cliente mapeia por `status`
// e `reason` para um texto fixo, em PT-BR de negócio, sem termo técnico (§3).

const kPasswordChangedNotice = 'Senha alterada. Entre com a nova senha.';
const kPasswordChangeOfflineMessage =
    'Sem conexão. A troca de senha precisa de internet.';
const kPasswordChangeConfirmMismatch =
    'A confirmação não é igual à nova senha.';

/// Por que a troca de senha falhou. Decide o que a tela faz; o texto é fixo.
enum PasswordChangeFailure {
  /// 400 `invalid_payload`.
  incomplete,

  /// 400 `invalid_new_password` (e a mesma regra conferida no aparelho).
  invalidNewPassword,

  /// 401 `invalid_credentials`: a senha provisória não confere.
  wrongCurrentPassword,

  /// 401 `jwt_required` ou `INVALID_TOKEN`: a sessão restrita venceu; volta ao login.
  sessionExpired,

  /// 403 `user_inactive`.
  accessDisabled,

  /// 403 `credential_unavailable`.
  credentialUnavailable,

  /// 423 `account_locked`.
  accountLocked,

  /// Rede, tempo esgotado, 5xx ou qualquer resposta fora do mapa.
  unavailable,
}

String passwordChangeMessage(PasswordChangeFailure failure) {
  return switch (failure) {
    PasswordChangeFailure.incomplete => 'Preencha todos os campos.',
    PasswordChangeFailure.invalidNewPassword =>
      'A nova senha precisa ter pelo menos 8 caracteres e ser diferente do seu e-mail e da senha provisória.',
    PasswordChangeFailure.wrongCurrentPassword =>
      'A senha provisória não confere.',
    PasswordChangeFailure.sessionExpired =>
      'Sua sessão expirou. Entre de novo com a senha provisória.',
    PasswordChangeFailure.accessDisabled =>
      'Seu acesso está desativado. Fale com o administrador da sua organização.',
    PasswordChangeFailure.credentialUnavailable =>
      'Não foi possível trocar a senha por aqui. Fale com o administrador da sua organização.',
    PasswordChangeFailure.accountLocked =>
      'Conta bloqueada por tentativas. Fale com o administrador da sua organização.',
    PasswordChangeFailure.unavailable =>
      'Não foi possível trocar a senha agora. Tente de novo.',
  };
}

class PasswordChangeError implements Exception {
  const PasswordChangeError(this.failure);

  final PasswordChangeFailure failure;

  /// Texto fixo do mapa; nunca contém senha, token nem a mensagem do servidor.
  String get safeMessage => passwordChangeMessage(failure);

  /// Acesso não permitido (§7): tentar de novo não resolve; a tela trava o
  /// formulário e deixa só "Sair".
  bool get locksForm =>
      failure == PasswordChangeFailure.accessDisabled ||
      failure == PasswordChangeFailure.credentialUnavailable;

  @override
  String toString() => 'PasswordChangeError(${failure.name})';
}

/// Mapeia a resposta de `POST /api/v1/auth/password` por `status` e `reason`
/// (envelope `{error:{code, reason, message}}`; o token inválido vem como
/// `{error:{code:"INVALID_TOKEN"}}`). O `message` do servidor nunca é lido.
PasswordChangeError mapPasswordChangeError(DioException e) {
  if (e.type != DioExceptionType.badResponse) {
    return const PasswordChangeError(PasswordChangeFailure.unavailable);
  }

  final status = e.response?.statusCode;
  final data = e.response?.data;
  final error = data is Map ? data['error'] : null;
  final reason = error is Map ? error['reason'] : null;
  final code = error is Map ? error['code'] : null;

  final failure = switch (status) {
    400 when reason == 'invalid_payload' => PasswordChangeFailure.incomplete,
    400 when reason == 'invalid_new_password' =>
      PasswordChangeFailure.invalidNewPassword,
    401 when reason == 'invalid_credentials' =>
      PasswordChangeFailure.wrongCurrentPassword,
    401 when reason == 'jwt_required' || code == 'INVALID_TOKEN' =>
      PasswordChangeFailure.sessionExpired,
    403 when reason == 'user_inactive' => PasswordChangeFailure.accessDisabled,
    403 when reason == 'credential_unavailable' =>
      PasswordChangeFailure.credentialUnavailable,
    423 when reason == 'account_locked' => PasswordChangeFailure.accountLocked,
    _ => PasswordChangeFailure.unavailable,
  };
  return PasswordChangeError(failure);
}

// ── Local / dev implementation ────────────────────────────────────────────────

class LocalDevAuthRepository implements AuthRepository {
  LocalDevAuthRepository({required AuthTokenStorage storage})
    : _storage = storage;

  final AuthTokenStorage _storage;
  AuthSession? _current;

  static const _defaultTenantId = 'tenant-demo';
  static const _defaultSub = 'employee-1';
  static const _tokenTtl = Duration(hours: 8);

  @override
  Future<AuthSession> login({
    required String email,
    required String password,
    String? tenantId,
  }) async {
    if (email.trim().isEmpty || password.isEmpty) {
      throw const ApiNetworkError('E-mail e senha são obrigatórios.');
    }

    final session = _buildDevSession(
      email: email.trim(),
      tenantId: tenantId ?? _defaultTenantId,
    );
    _current = session;
    await _storage.saveSession(session);
    return session;
  }

  @override
  Future<AuthSession> refresh() async {
    final stored = await _storage.loadSession();
    if (stored == null) throw const ApiSessionExpiredError();

    final refreshed = _buildDevSession(
      email: stored.user.email,
      tenantId: stored.user.tenantId,
    );
    return AuthSession(
      tokens: refreshed.tokens,
      user: refreshed.user,
      sessionNonce: stored.sessionNonce,
    );
  }

  @override
  Future<void> commitRefreshed(AuthSession session) async {
    _current = session;
    await _storage.saveSession(session);
  }

  /// B-APP-ORG (70): no modo de desenvolvimento, a troca só vale para as
  /// organizações da lista de desenvolvimento; fora dela, é recusada.
  @override
  Future<AuthSession> switchTenant({
    required AuthSession current,
    required String tenantId,
    required Dio client,
  }) async {
    final known = devBootstrapSession.availableTenants.any(
      (t) => t.tenantId == tenantId,
    );
    if (!known) throw const TenantSwitchRefusedError();
    return _buildDevSession(email: current.user.email, tenantId: tenantId);
  }

  @override
  Future<void> commitSwitched(AuthSession session) async {
    _current = session;
    await _storage.saveSession(session);
  }

  /// Sem servidor no modo de desenvolvimento: não há token a revogar.
  @override
  Future<RevocationOutcome> revokeRefreshToken(String refreshToken) async =>
      RevocationOutcome.revoked;

  @override
  Future<void> logout() async {
    _current = null;
    await _storage.clearSession();
    await _storage.clearBootstrap();
  }

  @override
  Future<AuthSession?> restoreSession() async {
    final stored = await _storage.loadSession();
    if (stored == null) return null;
    _current = stored;
    return stored;
  }

  @override
  AuthSession? currentSession() => _current;

  @override
  Future<void> clearSession() async {
    _current = null;
    await _storage.clearSession();
  }

  /// O modo de desenvolvimento nunca abre sessão restrita (não há servidor que
  /// mande `must_change_password`), então não há troca a fazer aqui.
  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    throw const PasswordChangeError(
      PasswordChangeFailure.credentialUnavailable,
    );
  }

  AuthSession _buildDevSession({
    required String email,
    required String tenantId,
  }) {
    return AuthSession(
      tokens: AuthTokens(
        accessToken: 'dev-token-local',
        refreshToken: 'dev-refresh-local',
        expiresAt: DateTime.now().toUtc().add(_tokenTtl),
      ),
      user: AuthUser(
        sub: _defaultSub,
        email: email,
        tenantId: tenantId,
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        // B-MOBILE-GATE-CHAVE — subconjunto do que o catálogo do servidor dá ao técnico de campo, o papel que a demo
        // declara (T4.3 do `tests/mobile-gate-chave-catalogo.test.ts`). Sem chave inventada.
        permissions: const [
          'dashboard:read',
          'expense_report:create',
          'expense_report:read_own',
          'expense_report:update',
          'expense_report:submit',
          'expense_sync:write',
          'field_location:send',
          'work_orders:read',
          'inventory.read',
          'checklist_runs:read',
          'checklist_runs:update',
          'checklist_runs:complete',
        ],
        scope: 'tenant',
      ),
      // dart format off
      sessionNonce: const Uuid().v4(), // cada login é uma sessão nova (local)
      // dart format on
    );
  }
}

// ── Dio / remote implementation ───────────────────────────────────────────────

// B-APP-ORG (69): o 409 que não trouxe uma lista legível. Não inventa lista e
// não promete escolha: a pessoa tenta de novo.
const kTenantListMissingMessage =
    'Sua senha vale em mais de uma organização, mas a lista de organizações '
    'não chegou. Tente entrar de novo.';

// B-APP-ORG (69), Emenda 1 §A2.2: o 400 (e-mail em mais organizações do que o
// servidor lista). Sem lista, sem campo, sem "Selecione" e sem dizer quantas.
const kTenantIdRequiredMessage =
    'Este e-mail está ligado a muitas organizações, e o app ainda não consegue '
    'listá-las aqui. Fale com o administrador da organização em que você quer '
    'entrar.';

// B-O6R-01 — mapeamento MÍNIMO dos códigos novos do login sem organização (§6.2 do plano):
// 409 TENANT_SELECTION_REQUIRED (a senha vale em mais de uma organização — escolher uma),
// 400 TENANT_ID_REQUIRED (e-mail em muitas organizações) e
// 429 RATE_LIMITED (balde por e-mail estourou). Qualquer outro caso cai no mapDioError
// existente, byte-idêntico. Cópia SEM termo técnico ("organização", nunca "tenant").
// B-APP-ORG (69): o 409 passa a levar a lista que o servidor mandou
// (`error.tenants`), e só ela.
ApiError mapLoginError(DioException e) {
  final status = e.response?.statusCode;
  final data = e.response?.data;
  final error = data is Map ? data['error'] : null;
  final errorCode = error is Map ? error['code'] : null;

  if (status == 409 && errorCode == 'TENANT_SELECTION_REQUIRED') {
    final tenants = _tenantChoicesFrom(error);
    // dart format off
    if (tenants.isEmpty) return const ApiConflictError(kTenantListMissingMessage); // 409 sem lista legível: nenhuma lista inventada
    // dart format on
    return TenantSelectionRequiredError(tenants);
  }

  if (status == 400 && errorCode == 'TENANT_ID_REQUIRED') {
    return const ApiServerError(
      statusCode: 400,
      safeMessage: kTenantIdRequiredMessage,
    );
  }

  if (status == 429) {
    return const ApiServerError(
      statusCode: 429,
      safeMessage:
          'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    );
  }

  // dart format off
  if (status == 401) return const ApiUnauthorizedError(kLoginRefusedMessage); // senha errada não é sessão expirada
  // dart format on

  return mapDioError(e);
}

/// B-APP-ORG (69): as organizações de `error.tenants` do 409, na ordem do
/// servidor. Só `id` e `name` em texto não vazio. Qualquer item fora disso, ou
/// um `id` repetido, torna a lista inteira ilegível (vazia): nunca uma lista
/// pela metade, nunca uma organização que o servidor não mandou.
List<TenantChoice> _tenantChoicesFrom(Object? error) {
  final raw = error is Map ? error['tenants'] : null;
  if (raw is! List) return const <TenantChoice>[];
  final choices = <TenantChoice>[];
  final seen = <String>{};
  for (final item in raw) {
    final id = item is Map ? item['id'] : null;
    final name = item is Map ? item['name'] : null;
    if (id is! String || id.trim().isEmpty) return const <TenantChoice>[];
    if (name is! String || name.trim().isEmpty) return const <TenantChoice>[];
    if (!seen.add(id)) return const <TenantChoice>[];
    choices.add(TenantChoice(id, name));
  }
  return List.unmodifiable(choices);
}

// ── B-APP-SESSAO-RENOVA (D1b, D1c): o reenvio do mesmo token e a prova de posse ──

/// O segredo de 32 bytes que prende o sucessor ao aparelho (S5). Vive só em
/// memória, junto do token que ele acompanha.
List<int> renewalNonce() {
  final random = Random.secure();
  // dart format off
  return List<int>.generate(32, (_) => random.nextInt(256)); // 32 bytes do gerador seguro
  // dart format on
}

/// O 1º envio de um token leva só o compromisso (o SHA-256 do segredo); todo
/// envio seguinte do mesmo token leva a prova (o segredo), em base64url sem `=`.
// dart format off
Map<String, String> renewalBindingFields(List<int> nonce, {required bool firstSend}) => firstSend
    ? {'renewalCommit': base64Url.encode(sha256.convert(nonce).bytes).replaceAll('=', '')} // o 1º envio só compromete
    : {'renewalProof': base64Url.encode(nonce).replaceAll('=', '')}; // o reenvio prova a posse
// dart format on

/// A renovação sem resposta, ou com 5xx, se repete com o MESMO token (o
/// servidor devolve o mesmo sucessor, S4); a recusa (4xx) nunca se repete; e
/// nenhuma tentativa começa depois do prazo.
// dart format off
bool renewalCanRetry(DioException e, int attempt, Duration elapsed, List<Duration> delays, Duration deadline) {
  if (attempt >= delays.length || elapsed + delays[attempt] > deadline) return false; // o prazo cabe na janela do servidor
  final status = e.response?.statusCode;
  if (status != null) return status >= 500; // com resposta, só o 5xx se repete; a recusa (4xx) não
  return e.type != DioExceptionType.cancel && e.type != DioExceptionType.badCertificate; // sem resposta, inclusive unknown: pode ter trocado no servidor
}
// dart format on

class DioAuthRepository implements AuthRepository {
  DioAuthRepository({
    required Dio client,
    required AuthTokenStorage storage,
    List<Duration> renewalRetryDelays = kRenewalRetryDelays,
    Duration renewalRetryDeadline = kRenewalRetryDeadline,
    Stopwatch Function() renewalClock = Stopwatch.new,
  }) : _client = client,
       _storage = storage,
       _renewalRetryDelays = renewalRetryDelays,
       _renewalRetryDeadline = renewalRetryDeadline,
       _renewalClock = renewalClock;

  // dart format off
  static const kRenewalRetryDelays = <Duration>[Duration(seconds: 1), Duration(seconds: 3)]; // reenvio do mesmo token
  static const kRenewalRetryDeadline = Duration(seconds: 20); // nenhuma tentativa começa depois disto; a janela do servidor é 60 s
  // dart format on

  final Dio _client;
  final AuthTokenStorage _storage;
  final List<Duration> _renewalRetryDelays;
  final Duration _renewalRetryDeadline;

  /// O relógio do prazo do reenvio (Emenda 3.6: os testes passam um relógio
  /// controlado; no app é o `Stopwatch`).
  final Stopwatch Function() _renewalClock;
  AuthSession? _current;
  // dart format off
  ({String token, List<int> nonce, bool sent})? _renewalBinding; // a prova do reenvio: só em memória, nunca gravada
  // dart format on

  @override
  Future<AuthSession> login({
    required String email,
    required String password,
    String? tenantId,
  }) async {
    try {
      final normalizedTenantId = tenantId?.trim();
      final payload = <String, Object?>{
        'email': email,
        'password': password,
        if (normalizedTenantId != null && normalizedTenantId.isNotEmpty)
          'tenantId': normalizedTenantId,
      };
      final response = await _client.post('/api/v1/auth/login', data: payload);
      final json = response.data as Map<String, dynamic>;
      final parsed = _sessionFromJson(json);
      final session = AuthSession(
        tokens: parsed.tokens,
        user: parsed.user,
        // B-USERS-ACESSO-SEG (RQ-2(b)): a regra do campo vale SÓ aqui, na
        // resposta do LOGIN — restrita se, e somente se, o campo é `true`.
        // Ausente conta como sessão inteira. Nunca no `_sessionFromJson`, que o
        // `refresh()` também usa: o refresh mantém a sessão que renova.
        mustChangePassword: _loginBody(json)['must_change_password'] == true,
        // dart format off
        sessionNonce: const Uuid().v4(), // cada login é uma sessão nova (remoto)
        // dart format on
      );
      _current = session;
      if (session.mustChangePassword) {
        // A sessão restrita fica SÓ em memória: nada no armazenamento seguro,
        // para que nem o restoreSession nem o modo offline a ressuscitem como
        // sessão inteira. Uma sessão antiga guardada também sai.
        await _storage.clearSession();
        return session;
      }
      await _storage.saveSession(session);
      return session;
    } on DioException catch (e) {
      throw mapLoginError(e);
    }
  }

  @override
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final current = _current;
    if (current == null) {
      throw const PasswordChangeError(PasswordChangeFailure.sessionExpired);
    }

    try {
      // Uma tentativa = UMA requisição: este cliente não tem o interceptor de
      // refresh, então o 401 `invalid_credentials` não se repete (RQ-6).
      await _client.post(
        '/api/v1/auth/password',
        data: {'currentPassword': currentPassword, 'newPassword': newPassword},
        options: Options(
          headers: {'Authorization': 'Bearer ${current.tokens.accessToken}'},
        ),
      );
    } on DioException catch (e) {
      final error = mapPasswordChangeError(e);
      if (error.failure == PasswordChangeFailure.sessionExpired) {
        _current = null;
        await _storage.clearSession();
      }
      throw error;
    }

    // 200: o backend revogou TODAS as sessões do par, inclusive esta.
    _current = null;
    await _storage.clearSession();
  }

  @override
  Future<AuthSession> refresh() async {
    final loaded = await _storage.loadSession();
    final refreshToken = loaded?.tokens.refreshToken;
    // dart format off
    if (refreshToken == null) throw const ApiSessionExpiredError(); // sem credencial: o 401 do servidor fica
    // dart format on
    final stored = loaded!;
    // dart format off
    final binding = _renewalBinding?.token == refreshToken ? _renewalBinding! : (token: refreshToken, nonce: renewalNonce(), sent: false); // um nonce por token
    // dart format on
    final clock = _renewalClock()..start();
    Response<dynamic>? received;
    for (var attempt = 0; received == null; attempt++) {
      // dart format off
      final fields = renewalBindingFields(binding.nonce, firstSend: attempt == 0 && !binding.sent);
      _renewalBinding = (token: refreshToken, nonce: binding.nonce, sent: true); // daqui em diante, só a prova
      // dart format on
      try {
        // dart format off
        final response = await _client.post('/api/v1/auth/refresh', data: {'refreshToken': refreshToken, ...fields}); // o token e a prova
        // dart format on
        received = response;
      } on DioException catch (e) {
        // dart format off
        if (renewalCanRetry(e, attempt, clock.elapsed, _renewalRetryDelays, _renewalRetryDeadline)) { // o mesmo token: o servidor devolve o mesmo sucessor (S4)
          // dart format on
          await Future<void>.delayed(_renewalRetryDelays[attempt]);
          continue;
        }
        throw _refreshFailure(e);
      }
    }
    try {
      final tokens = _refreshedTokens(received.data);
      // dart format off
      final session = AuthSession(tokens: tokens, user: stored.user, sessionNonce: stored.sessionNonce); // o refresh mantém a sessão que renova
      // dart format on
      return session;
    } catch (_) {
      // dart format off
      throw const SessionRenewalLocalError(); // 200 ilegível: falha local
      // dart format on
    }
  }

  @override
  Future<void> commitRefreshed(AuthSession session) async {
    _current = session;
    await _storage.saveSession(session);
  }

  @override
  Future<AuthSession> switchTenant({
    required AuthSession current,
    required String tenantId,
    required Dio client,
  }) async {
    final Response<dynamic> response;
    try {
      response = await client.post(
        kActiveTenantPath,
        data: {'tenantId': tenantId},
      );
    } on DioException catch (e) {
      throw _switchFailure(e);
    }
    try {
      return _sessionFromActiveTenantJson(response.data, current);
    } catch (_) {
      // dart format off
      throw const TenantSwitchMismatchError(); // 200 ilegível: fica na organização atual
      // dart format on
    }
  }

  @override
  Future<void> commitSwitched(AuthSession session) async {
    _current = session;
    if (session.mustChangePassword) {
      // Como no login: a sessão restrita nunca vai para o armazenamento.
      await _storage.clearSession();
      return;
    }
    await _storage.saveSession(session);
  }

  /// O 403 é a recusa do vínculo; sem rede, a mensagem da troca; o resto, como
  /// em qualquer pedido (inclusive o [ApiSessionChangedError] da T-b).
  ApiError _switchFailure(DioException e) {
    if (e.response?.statusCode == 403) return const TenantSwitchRefusedError();
    final mapped = mapDioError(e);
    if (mapped is ApiNetworkError || mapped is ApiTimeoutError) {
      return const ApiNetworkError(kTenantSwitchOfflineMessage);
    }
    return mapped;
  }

  /// O corpo do 200 do `/auth/active-tenant` (`auth.routes.ts`): `tenant`,
  /// `user` (sem `tenant_id`), `roles` em texto, `permissions`, os tokens e
  /// `must_change_password`. Cada troca é uma sessão nova (`sessionNonce`).
  AuthSession _sessionFromActiveTenantJson(Object? data, AuthSession current) {
    final json = data as Map<String, dynamic>;
    final envelopeData = json['data'];
    final body = envelopeData is Map<String, dynamic> ? envelopeData : json;
    final tenantJson = body['tenant'] as Map<String, dynamic>;
    final userJson = body['user'] as Map<String, dynamic>;
    final roles = (body['roles'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .where((r) => r.isNotEmpty)
        .toList();
    final expiresIn =
        body['expiresIn'] as int? ?? body['expires_in'] as int? ?? 900;
    return AuthSession(
      tokens: AuthTokens(
        accessToken: (body['accessToken'] ?? body['access_token']) as String,
        refreshToken: (body['refreshToken'] ?? body['refresh_token']) as String,
        expiresAt: DateTime.now().toUtc().add(Duration(seconds: expiresIn)),
      ),
      user: AuthUser(
        sub: userJson['id'] as String,
        email: userJson['email'] as String? ?? current.user.email,
        tenantId: tenantJson['id'] as String,
        tenantRole: roles.isNotEmpty ? roles.first : 'tenant_member',
        tenantRoles: roles,
        permissions: (body['permissions'] as List<dynamic>? ?? const [])
            .whereType<String>()
            .toList(),
        scope: 'tenant',
      ),
      mustChangePassword: body['must_change_password'] == true,
      // dart format off
      sessionNonce: const Uuid().v4(), // cada troca é uma sessão nova
      // dart format on
    );
  }

  @override
  Future<RevocationOutcome> revokeRefreshToken(String refreshToken) async {
    try {
      // dart format off
      await _client.post('/api/v1/auth/logout', data: {'refreshToken': refreshToken}); // Sair revoga
      return RevocationOutcome.revoked; // 2xx: o servidor garante que o token não renova mais
      // dart format on
    } on DioException catch (e) {
      // dart format off
      if (e.response?.statusCode == 400) return RevocationOutcome.discard; // pedido sem token: tentar de novo não resolve
      // dart format on
      return RevocationOutcome.retry;
    } catch (_) {
      return RevocationOutcome.retry;
    }
  }

  @override
  Future<void> logout() async {
    _current = null;
    await _storage.clearSession();
    await _storage.clearBootstrap();
  }

  /// A recusa do servidor (400, 401, 403) é sessão morta; o resto não é.
  ApiError _refreshFailure(DioException e) {
    final status = e.response?.statusCode;
    if (status == 400 || status == 401 || status == 403) {
      return const ApiSessionExpiredError();
    }
    return mapDioError(e);
  }

  /// Só os tokens do corpo da renovação (`auth.routes.ts`, o fixture do C1):
  /// o servidor não manda o usuário, e o app não o exige.
  AuthTokens _refreshedTokens(Object? data) {
    final json = data as Map<String, dynamic>;
    final envelopeData = json['data'];
    final body = envelopeData is Map<String, dynamic> ? envelopeData : json;
    final tokenJson = body['tokens'] as Map<String, dynamic>? ?? body;
    final expiresIn =
        tokenJson['expiresIn'] as int? ??
        tokenJson['expires_in'] as int? ??
        900;
    return AuthTokens(
      accessToken:
          (tokenJson['accessToken'] ?? tokenJson['access_token']) as String,
      refreshToken:
          (tokenJson['refreshToken'] ?? tokenJson['refresh_token']) as String,
      expiresAt: DateTime.now().toUtc().add(Duration(seconds: expiresIn)),
    );
  }

  @override
  Future<AuthSession?> restoreSession() async {
    final stored = await _storage.loadSession();
    if (stored == null) return null;
    _current = stored;
    return stored;
  }

  @override
  AuthSession? currentSession() => _current;

  @override
  Future<void> clearSession() async {
    _current = null;
    await _storage.clearSession();
  }

  // Mesmo envelope do `_sessionFromJson`: `data` quando existe, senão a raiz.
  Map<String, dynamic> _loginBody(Map<String, dynamic> json) {
    final envelopeData = json['data'];
    return envelopeData is Map<String, dynamic> ? envelopeData : json;
  }

  AuthSession _sessionFromJson(Map<String, dynamic> json) {
    final envelopeData = json['data'];
    final body = envelopeData is Map<String, dynamic> ? envelopeData : json;
    // Backend may wrap tokens under a 'tokens' key or inline them at body level
    final tokenJson = body['tokens'] as Map<String, dynamic>? ?? body;
    final userJson = body['user'] as Map<String, dynamic>;
    // Roles array: [{ id, key, name }] — present on /login and /active-tenant
    final rolesRaw = (body['roles'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
    final roleKeys = rolesRaw
        .map((r) => (r['key'] ?? r['name'] ?? '').toString())
        .where((k) => k.isNotEmpty)
        .toList();

    final expiresIn =
        tokenJson['expiresIn'] as int? ??
        tokenJson['expires_in'] as int? ??
        28800;
    final expiresAt = DateTime.now().toUtc().add(Duration(seconds: expiresIn));

    return AuthSession(
      tokens: AuthTokens(
        accessToken:
            (tokenJson['accessToken'] ?? tokenJson['access_token']) as String,
        refreshToken:
            (tokenJson['refreshToken'] ?? tokenJson['refresh_token'])
                as String?,
        expiresAt: expiresAt,
      ),
      user: AuthUser(
        // Backend sends 'id'; fall back to 'sub' for Cognito-compatible responses
        sub: (userJson['id'] ?? userJson['sub']) as String,
        email: userJson['email'] as String,
        // Backend sends snake_case 'tenant_id'; camelCase as fallback
        tenantId: (userJson['tenant_id'] ?? userJson['tenantId']) as String,
        tenantRole: roleKeys.isNotEmpty ? roleKeys.first : 'tenant_member',
        tenantRoles: roleKeys,
        // Permissions are not present in /login — bootstrap fills them later
        permissions: (userJson['permissions'] as List<dynamic>? ?? [])
            .cast<String>(),
        scope: userJson['scope'] as String? ?? 'tenant',
      ),
    );
  }
}
