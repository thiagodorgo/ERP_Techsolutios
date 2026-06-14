import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/auth/auth_models.dart';

// Key constants — values written here are never logged
class _K {
  static const accessToken = 'erp.access_token';
  static const refreshToken = 'erp.refresh_token';
  static const tokenExpiryMs = 'erp.token_expiry_ms';
  static const userJson = 'erp.user_safe_json';
  static const bootstrapJson = 'erp.bootstrap_json';
}

abstract class AuthTokenStorage {
  Future<void> saveSession(AuthSession session);
  Future<AuthSession?> loadSession();
  Future<void> clearSession();
  Future<void> saveBootstrapJson(String json);
  Future<String?> loadBootstrapJson();
  Future<void> clearBootstrap();
}

class SecureAuthTokenStorage implements AuthTokenStorage {
  const SecureAuthTokenStorage(this._storage);

  final FlutterSecureStorage _storage;

  @override
  Future<void> saveSession(AuthSession session) async {
    await _storage.write(
      key: _K.accessToken,
      value: session.tokens.accessToken,
    );
    await _storage.write(
      key: _K.tokenExpiryMs,
      value: session.tokens.expiresAt.millisecondsSinceEpoch.toString(),
    );
    if (session.tokens.refreshToken != null) {
      await _storage.write(
        key: _K.refreshToken,
        value: session.tokens.refreshToken,
      );
    }
    // Store only safe user metadata — no password, no raw JWT payload, no private paths
    await _storage.write(
      key: _K.userJson,
      value: jsonEncode(_userToSafeJson(session.user)),
    );
  }

  @override
  Future<AuthSession?> loadSession() async {
    final accessToken = await _storage.read(key: _K.accessToken);
    if (accessToken == null) return null;

    final expiryMs = await _storage.read(key: _K.tokenExpiryMs);
    if (expiryMs == null) return null;

    final userJsonStr = await _storage.read(key: _K.userJson);
    if (userJsonStr == null) return null;

    try {
      final expiresAt = DateTime.fromMillisecondsSinceEpoch(
        int.parse(expiryMs),
        isUtc: true,
      );
      final userJson = jsonDecode(userJsonStr) as Map<String, dynamic>;
      final user = _userFromSafeJson(userJson);
      final refreshToken = await _storage.read(key: _K.refreshToken);

      return AuthSession(
        tokens: AuthTokens(
          accessToken: accessToken,
          refreshToken: refreshToken,
          expiresAt: expiresAt,
        ),
        user: user,
      );
    } catch (_) {
      // Corrupted storage — clear silently and force re-login
      await clearSession();
      return null;
    }
  }

  @override
  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: _K.accessToken),
      _storage.delete(key: _K.refreshToken),
      _storage.delete(key: _K.tokenExpiryMs),
      _storage.delete(key: _K.userJson),
    ]);
  }

  @override
  Future<void> saveBootstrapJson(String json) async {
    await _storage.write(key: _K.bootstrapJson, value: json);
  }

  @override
  Future<String?> loadBootstrapJson() => _storage.read(key: _K.bootstrapJson);

  @override
  Future<void> clearBootstrap() => _storage.delete(key: _K.bootstrapJson);

  Map<String, Object?> _userToSafeJson(AuthUser user) => {
    'sub': user.sub,
    'email': user.email,
    'tenantId': user.tenantId,
    'tenantRole': user.tenantRole,
    'tenantRoles': user.tenantRoles,
    'permissions': user.permissions,
    'scope': user.scope,
    // NOT stored: password, full JWT payload, private paths, raw tokens beyond accessToken
  };

  AuthUser _userFromSafeJson(Map<String, dynamic> j) => AuthUser(
    sub: j['sub'] as String,
    email: j['email'] as String,
    tenantId: j['tenantId'] as String,
    tenantRole: j['tenantRole'] as String,
    tenantRoles: (j['tenantRoles'] as List<dynamic>).cast<String>(),
    permissions: (j['permissions'] as List<dynamic>).cast<String>(),
    scope: j['scope'] as String,
  );
}

class InMemoryAuthTokenStorage implements AuthTokenStorage {
  AuthSession? _session;
  String? _bootstrapJson;

  @override
  Future<void> saveSession(AuthSession session) async => _session = session;

  @override
  Future<AuthSession?> loadSession() async => _session;

  @override
  Future<void> clearSession() async => _session = null;

  @override
  Future<void> saveBootstrapJson(String json) async => _bootstrapJson = json;

  @override
  Future<String?> loadBootstrapJson() async => _bootstrapJson;

  @override
  Future<void> clearBootstrap() async => _bootstrapJson = null;
}
