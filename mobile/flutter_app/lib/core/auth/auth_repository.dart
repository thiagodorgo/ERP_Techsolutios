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
      final session = _sessionFromJson(response.data as Map<String, dynamic>);
      _current = session;
      await _storage.saveSession(session);
      return session;
    } on DioException catch (e) {
      throw mapDioError(e);
    }
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
