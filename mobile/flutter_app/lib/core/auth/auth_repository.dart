import 'package:dio/dio.dart';

import '../network/api_error.dart';
import '../network/http_client.dart';
import 'auth_token_storage.dart';
import '../../features/auth/auth_models.dart';

abstract class AuthRepository {
  Future<AuthSession> login({
    required String email,
    required String password,
    String? tenantId,
  });
  Future<AuthSession> refresh();
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
      throw const ApiNetworkError('Email e senha sao obrigatorios.');
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
    if (stored == null) throw const ApiUnauthorizedError();

    final refreshed = _buildDevSession(
      email: stored.user.email,
      tenantId: stored.user.tenantId,
    );
    _current = refreshed;
    await _storage.saveSession(refreshed);
    return refreshed;
  }

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
        permissions: const [
          'dashboard:read',
          'expense_report:create',
          'expense_report:read',
          'expense_report:update',
          'expense_report:submit',
          'receipt:attach',
          'ocr:run_local',
          'expense_sync:write',
          'sync_diagnostics:read',
          'field_location:send',
          'work_orders:read',
          'inventory:read',
          'workflow:request',
        ],
        scope: 'tenant',
      ),
    );
  }
}

// ── Dio / remote implementation ───────────────────────────────────────────────

// B-O6R-01 — mapeamento MÍNIMO dos códigos novos do login sem organização (§6.2 do plano):
// 409 TENANT_SELECTION_REQUIRED (a senha vale em mais de uma organização — escolher uma),
// 400 TENANT_ID_REQUIRED (e-mail em muitas organizações — informar a organização) e
// 429 RATE_LIMITED (balde por e-mail estourou). Qualquer outro caso cai no mapDioError
// existente, byte-idêntico. Cópia SEM termo técnico ("organização", nunca "tenant").
ApiError mapLoginError(DioException e) {
  final status = e.response?.statusCode;
  final data = e.response?.data;
  final errorCode = data is Map<String, dynamic>
      ? ((data['error'] as Map<String, dynamic>?)?['code'] as String?)
      : null;

  if (status == 409 && errorCode == 'TENANT_SELECTION_REQUIRED') {
    return const ApiConflictError(
      'Sua senha vale em mais de uma organizacao. Selecione a organizacao para entrar.',
    );
  }

  if (status == 400 && errorCode == 'TENANT_ID_REQUIRED') {
    return const ApiServerError(
      statusCode: 400,
      safeMessage:
          'Este e-mail existe em mais de uma organizacao. Selecione a organizacao para entrar.',
    );
  }

  if (status == 429) {
    return const ApiServerError(
      statusCode: 429,
      safeMessage:
          'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    );
  }

  return mapDioError(e);
}

class DioAuthRepository implements AuthRepository {
  DioAuthRepository({required Dio client, required AuthTokenStorage storage})
    : _client = client,
      _storage = storage;

  final Dio _client;
  final AuthTokenStorage _storage;
  AuthSession? _current;

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
    final stored = await _storage.loadSession();
    final refreshToken = stored?.tokens.refreshToken;
    if (refreshToken == null) throw const ApiUnauthorizedError();
    try {
      final response = await _client.post(
        '/api/v1/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final session = _sessionFromJson(response.data as Map<String, dynamic>);
      _current = session;
      await _storage.saveSession(session);
      return session;
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _client.post('/api/v1/auth/logout');
    } catch (_) {
      // Best-effort server logout; always clear locally regardless
    }
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
