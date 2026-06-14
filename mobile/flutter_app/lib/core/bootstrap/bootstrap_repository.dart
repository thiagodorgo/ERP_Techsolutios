import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_models.dart';
import '../auth/auth_notifier.dart';
import '../auth/auth_token_storage.dart';
import '../config/app_config.dart';
import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import '../permissions/permission_resolver.dart';
import 'bootstrap_codec.dart';
import 'bootstrap_session.dart';

// ── Repository interface ──────────────────────────────────────────────────────

abstract class MobileBootstrapRepository {
  // Fetches bootstrap for the given auth session (null → dev/mock session).
  Future<BootstrapSession> fetch(AuthSession? session);

  // Returns cached bootstrap from secure storage, or null if absent.
  Future<BootstrapSession?> restoreCached();

  // Persists bootstrap to secure storage for offline/resume use.
  Future<void> cache(BootstrapSession session);

  // Removes cached bootstrap (called on logout).
  Future<void> clearCache();
}

// ── Local/dev implementation ──────────────────────────────────────────────────

class LocalDevBootstrapRepository implements MobileBootstrapRepository {
  const LocalDevBootstrapRepository(this._storage);

  final AuthTokenStorage _storage;

  @override
  Future<BootstrapSession> fetch(AuthSession? session) async {
    if (session == null) return devBootstrapSession;

    final u = session.user;
    return BootstrapSession(
      activeTenant: TenantContext(
        tenantId: u.tenantId,
        displayName: _tenantDisplayName(u.tenantId),
      ),
      availableTenants: [
        TenantContext(
          tenantId: u.tenantId,
          displayName: _tenantDisplayName(u.tenantId),
        ),
      ],
      user: AuthenticatedUser(
        userId: u.sub,
        email: u.email,
        tenantRole: u.tenantRole,
        tenantRoles: u.tenantRoles,
        scope: u.scope,
      ),
      enabledModules: devBootstrapSession.enabledModules,
      permissions: PermissionSet(u.permissions.toSet()),
      mobilePolicy: devBootstrapSession.mobilePolicy,
      expenseCategories: devBootstrapSession.expenseCategories,
      expensePolicy: devBootstrapSession.expensePolicy,
    );
  }

  @override
  Future<BootstrapSession?> restoreCached() async {
    final json = await _storage.loadBootstrapJson();
    if (json == null) return null;
    try {
      return BootstrapSessionCodec.decode(json);
    } catch (_) {
      await _storage.clearBootstrap();
      return null;
    }
  }

  @override
  Future<void> cache(BootstrapSession session) =>
      _storage.saveBootstrapJson(BootstrapSessionCodec.encode(session));

  @override
  Future<void> clearCache() => _storage.clearBootstrap();

  String _tenantDisplayName(String tenantId) {
    return tenantId
        .replaceAll('-', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }
}

// ── Dio / remote implementation ───────────────────────────────────────────────

class DioMobileBootstrapRepository implements MobileBootstrapRepository {
  DioMobileBootstrapRepository(this._storage);

  final AuthTokenStorage _storage;

  @override
  Future<BootstrapSession> fetch(AuthSession? session) async {
    if (session == null) throw const ApiUnauthorizedError();

    final client = createExpenseHttpClient(
      ApiConfig(accessToken: session.tokens.accessToken),
    );
    try {
      final response = await client.get(ExpenseApiEndpoints.mobileBootstrap);
      final bootstrap = _bootstrapFromRemoteJson(
        response.data as Map<String, dynamic>,
      );
      await cache(bootstrap);
      return bootstrap;
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<BootstrapSession?> restoreCached() async {
    final json = await _storage.loadBootstrapJson();
    if (json == null) return null;
    try {
      return BootstrapSessionCodec.decode(json);
    } catch (_) {
      await _storage.clearBootstrap();
      return null;
    }
  }

  @override
  Future<void> cache(BootstrapSession session) =>
      _storage.saveBootstrapJson(BootstrapSessionCodec.encode(session));

  @override
  Future<void> clearCache() => _storage.clearBootstrap();

  BootstrapSession _bootstrapFromRemoteJson(Map<String, dynamic> j) {
    final userJson = j['user'] as Map<String, dynamic>;
    final activeTenantJson =
        j['activeTenant'] as Map<String, dynamic>? ??
        {'tenantId': userJson['tenantId'], 'displayName': userJson['tenantId']};

    return BootstrapSession(
      activeTenant: TenantContext(
        tenantId: activeTenantJson['tenantId'] as String,
        displayName: activeTenantJson['displayName'] as String,
      ),
      availableTenants: (j['availableTenants'] as List<dynamic>? ?? [])
          .map(
            (t) => TenantContext(
              tenantId: (t as Map<String, dynamic>)['tenantId'] as String,
              displayName: t['displayName'] as String,
            ),
          )
          .toList(),
      user: AuthenticatedUser(
        userId: userJson['sub'] as String,
        email: userJson['email'] as String,
        tenantRole: userJson['tenantRole'] as String,
        tenantRoles: (userJson['tenantRoles'] as List<dynamic>).cast<String>(),
        scope: userJson['scope'] as String? ?? 'tenant',
      ),
      enabledModules: (j['enabledModules'] as List<dynamic>? ?? [])
          .map(
            (m) => EnabledModule(
              id: (m as Map<String, dynamic>)['id'] as String,
              title: m['title'] as String,
              route: m['route'] as String,
              requiredPermissions:
                  (m['requiredPermissions'] as List<dynamic>? ?? [])
                      .cast<String>(),
            ),
          )
          .toList(),
      permissions: PermissionSet(
        Set<String>.from(
          (userJson['permissions'] as List<dynamic>? ?? []).cast<String>(),
        ),
      ),
      mobilePolicy: _mobilePolicyFromJson(
        j['mobilePolicy'] as Map<String, dynamic>? ?? const <String, dynamic>{},
      ),
      expenseCategories: (j['expenseCategories'] as List<dynamic>? ?? [])
          .map(
            (c) => ExpenseCategorySnapshot(
              id: (c as Map<String, dynamic>)['id'] as String,
              label: c['label'] as String,
              requiresReceipt: c['requiresReceipt'] as bool? ?? false,
              limit: (c['limit'] as num?)?.toDouble(),
            ),
          )
          .toList(),
      expensePolicy: _expensePolicyFromJson(
        j['expensePolicy'] as Map<String, dynamic>? ??
            const <String, dynamic>{},
      ),
    );
  }

  MobilePolicy _mobilePolicyFromJson(Map<String, dynamic> j) => MobilePolicy(
    offlineEnabled: j['offlineEnabled'] as bool? ?? true,
    syncBatchSize: j['syncBatchSize'] as int? ?? 25,
    receiptMaxSizeMb: j['receiptMaxSizeMb'] as int? ?? 10,
  );

  ExpensePolicySnapshot _expensePolicyFromJson(Map<String, dynamic> j) =>
      ExpensePolicySnapshot(
        version: j['version'] as String? ?? '1.0',
        categoryLimits: (j['categoryLimits'] as Map<String, dynamic>? ?? {})
            .map((k, v) => MapEntry(k, (v as num).toDouble())),
        receiptRequiredCategories: Set<String>.from(
          (j['receiptRequiredCategories'] as List<dynamic>? ?? []),
        ),
      );
}

// ── Riverpod providers ────────────────────────────────────────────────────────

final mobileBootstrapRepositoryProvider = Provider<MobileBootstrapRepository>((
  ref,
) {
  final storage = ref.watch(authTokenStorageProvider);
  if (kIsRemoteAuth) {
    return DioMobileBootstrapRepository(storage);
  }
  return LocalDevBootstrapRepository(storage);
});

final bootstrapSessionProvider = FutureProvider<BootstrapSession>((ref) async {
  final authState = await ref.watch(authStateProvider.future);
  final repo = ref.watch(mobileBootstrapRepositoryProvider);

  if (authState.isAuthenticated && authState.session != null) {
    // Try cached bootstrap first to avoid blocking the UI on network
    final cached = await repo.restoreCached();
    if (cached != null) return cached;

    final fetched = await repo.fetch(authState.session);
    await repo.cache(fetched);
    return fetched;
  }

  // Unauthenticated / dev mode — return dev bootstrap (existing behaviour)
  return repo.fetch(null);
});
