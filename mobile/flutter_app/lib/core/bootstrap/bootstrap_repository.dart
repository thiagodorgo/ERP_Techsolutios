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
import 'bootstrap_expanded_session.dart';
import 'bootstrap_session.dart';

// ── Repository interface ──────────────────────────────────────────────────────

abstract class MobileBootstrapRepository {
  // Fetches bootstrap for the given auth session (null → dev/mock session).
  Future<BootstrapSession> fetch(AuthSession? session);

  // Fetches bootstrap scoped to a specific tenant (multi-tenant switch).
  // Default implementation delegates to fetch(); remote impl passes tenantId.
  Future<BootstrapSession> fetchForTenant(
    AuthSession session,
    String tenantId,
  ) => fetch(session);

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
  Future<BootstrapSession> fetchForTenant(
    AuthSession session,
    String tenantId,
  ) async {
    final base = await fetch(session);
    // Dev mode: search across the full dev tenant list, not just session tenant
    final allAvailable = devBootstrapSession.availableTenants;
    final selected = allAvailable.firstWhere(
      (t) => t.tenantId == tenantId,
      orElse: () => base.activeTenant,
    );
    return BootstrapSession(
      activeTenant: selected,
      availableTenants: allAvailable,
      user: base.user,
      enabledModules: base.enabledModules,
      permissions: base.permissions,
      mobilePolicy: base.mobilePolicy,
      expenseCategories: base.expenseCategories,
      expensePolicy: base.expensePolicy,
    );
  }

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

// ── Module key → navigation defaults (B-098A expanded contract) ───────────────
//
// The expanded bootstrap sends modules as [{key, enabled}] without titles or
// routes. This local map fills in UI metadata so the app can render navigation
// items without needing extra API calls.

typedef _ModuleDef = ({String title, String route, List<String> perms});

final _kNavigationModules = <String, _ModuleDef>{
  'expense_management': (
    title: 'Gestao de Despesas',
    route: '/expenses',
    perms: ['expense_report:read', 'expense_report:create'],
  ),
  'field_operations': (
    title: 'Operacoes de Campo',
    route: '/work-orders',
    perms: ['field_location:send'],
  ),
  'work_orders': (
    title: 'Ordens de Servico',
    route: '/work-orders',
    perms: ['work_orders:read'],
  ),
  'tenant_checklist': (
    title: 'Checklists',
    route: '/checklists',
    perms: ['checklist_runs:read'],
  ),
  'inventory': (
    title: 'Estoque do Tecnico',
    route: '/inventory',
    perms: ['inventory:read'],
  ),
  'approvals': (
    title: 'Aprovacoes',
    route: '/approvals',
    perms: ['workflow:request'],
  ),
  'notifications': (
    title: 'Notificacoes',
    route: '/notifications',
    perms: ['notifications:read'],
  ),
};

// ── Top-level parser — handles both B-098 (minimal) and B-098A (expanded) ─────
//
// Exposed at library scope so tests can call it directly without HTTP.
// The B-098A response body is wrapped in {"data": {...}}.
// B-098 sends the session object at the top level.

BootstrapSession bootstrapSessionFromJson(Map<String, dynamic> body) {
  // B-098A wraps everything under "data"; unwrap if present.
  final j = body.containsKey('data')
      ? body['data'] as Map<String, dynamic>
      : body;

  // Presence of "feature_flags" is the reliable indicator of expanded contract.
  if (j.containsKey('feature_flags')) {
    return _parseExpanded(j);
  }
  return _parseMinimal(j);
}

BootstrapSession _parseMinimal(Map<String, dynamic> j) {
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
    mobilePolicy: _mobilePolicyFromLegacyJson(
      j['mobilePolicy'] as Map<String, dynamic>? ?? const {},
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
      j['expensePolicy'] as Map<String, dynamic>? ?? const {},
    ),
  );
}

BootstrapSession _parseExpanded(Map<String, dynamic> j) {
  final tenantJson = j['tenant'] as Map<String, dynamic>;
  final userJson = j['user'] as Map<String, dynamic>;
  final roles = (j['roles'] as List<dynamic>? ?? []).cast<String>();
  final permissions = (j['permissions'] as List<dynamic>? ?? []).cast<String>();

  final activeTenant = TenantContext(
    tenantId: tenantJson['id'] as String,
    displayName: tenantJson['name'] as String,
  );

  // Map platform module keys to navigation modules via the local lookup table.
  final rawModules = (j['modules'] as List<dynamic>? ?? [])
      .cast<Map<String, dynamic>>();
  final enabledModules = rawModules.where((m) => m['enabled'] == true).expand((
    m,
  ) {
    final key = m['key'] as String;
    final def = _kNavigationModules[key];
    if (def == null) return const <EnabledModule>[];
    return [
      EnabledModule(
        id: key,
        title: def.title,
        route: def.route,
        requiredPermissions: def.perms,
      ),
    ];
  }).toList();

  // Expense categories — B-098A uses legacy `expenseCategories` field with
  // `name` (not `label`) and a nested `policy` object.
  final legacyCats = (j['expenseCategories'] as List<dynamic>? ?? [])
      .cast<Map<String, dynamic>>();
  final expenseCategories = legacyCats.map((c) {
    final policy = c['policy'] as Map<String, dynamic>?;
    return ExpenseCategorySnapshot(
      id: c['id'] as String,
      label: c['name'] as String,
      requiresReceipt: policy?['receiptRequired'] as bool? ?? false,
      limit: (policy?['defaultLimit'] as num?)?.toDouble(),
    );
  }).toList();

  // Derive ExpensePolicySnapshot from the catalog items.
  final expensePolicy = ExpensePolicySnapshot(
    version: 'b098a',
    categoryLimits: {
      for (final c in expenseCategories)
        if (c.limit != null) c.id: c.limit!,
    },
    receiptRequiredCategories: {
      for (final c in expenseCategories)
        if (c.requiresReceipt) c.id,
    },
  );

  // Feature flags
  final flagsJson = j['feature_flags'] as Map<String, dynamic>? ?? {};
  final featureFlags = flagsJson.map((key, value) {
    final f = value as Map<String, dynamic>;
    return MapEntry(
      key,
      FeatureFlag(
        enabled: f['enabled'] as bool? ?? false,
        status: CapabilityStatus.fromString(f['status'] as String? ?? ''),
        reason: f['reason'] as String?,
      ),
    );
  });

  // Expanded mobile policy
  final policyJson = j['mobile_policy'] as Map<String, dynamic>? ?? {};
  final syncJ = policyJson['sync'] as Map<String, dynamic>? ?? {};
  final evidJ = policyJson['evidence'] as Map<String, dynamic>? ?? {};

  final expandedPolicy = ExpandedMobilePolicy(
    sync: SyncPolicy(
      actionsEnabled: syncJ['actions_enabled'] as bool? ?? false,
      maxBatchSize: syncJ['max_batch_size'] as int? ?? 50,
      implementedDomains: (syncJ['implemented_domains'] as List<dynamic>? ?? [])
          .cast<String>(),
      plannedDomains: (syncJ['planned_domains'] as List<dynamic>? ?? [])
          .cast<String>(),
    ),
    evidence: EvidencePolicy(
      checklistAttachments: CapabilityStatus.fromString(
        evidJ['checklist_attachments'] as String? ?? 'planned',
      ),
      workOrderEvidence: CapabilityStatus.fromString(
        evidJ['work_order_evidence'] as String? ?? 'planned',
      ),
      genericUpload: CapabilityStatus.fromString(
        evidJ['generic_upload'] as String? ?? 'planned',
      ),
      maxUploadMb: evidJ['max_upload_mb'] as int? ?? 10,
    ),
  );

  // Legacy MobilePolicy derived from expanded fields.
  final mobilePolicy = MobilePolicy(
    offlineEnabled: true,
    syncBatchSize: expandedPolicy.sync.maxBatchSize,
    receiptMaxSizeMb: expandedPolicy.evidence.maxUploadMb,
  );

  // Contract metadata
  final contractJ = j['contract'] as Map<String, dynamic>?;
  final contractMeta = contractJ == null
      ? null
      : BootstrapContractMeta(
          version: contractJ['version'] as String,
          schemaVersion: contractJ['schemaVersion'] as int,
          status: contractJ['status'] as String,
        );

  // Sync cursors
  final syncCursJ = j['sync'] as Map<String, dynamic>? ?? {};
  final syncCursors = SyncCursors(
    workOrdersCursor: syncCursJ['workOrdersCursor'] as String?,
    checklistsCursor: syncCursJ['checklistsCursor'] as String?,
    expensesCursor: syncCursJ['expensesCursor'] as String?,
    inventoryCursor: syncCursJ['inventoryCursor'] as String?,
  );

  return BootstrapSession(
    activeTenant: activeTenant,
    availableTenants: [activeTenant],
    user: AuthenticatedUser(
      userId: userJson['id'] as String,
      email: userJson['email'] as String,
      tenantRole: roles.isNotEmpty ? roles.first : 'tenant_member',
      tenantRoles: roles,
      scope: 'tenant',
    ),
    enabledModules: enabledModules,
    permissions: PermissionSet(Set.from(permissions)),
    mobilePolicy: mobilePolicy,
    expenseCategories: expenseCategories,
    expensePolicy: expensePolicy,
    featureFlags: featureFlags,
    expandedPolicy: expandedPolicy,
    contractMeta: contractMeta,
    syncCursors: syncCursors,
  );
}

MobilePolicy _mobilePolicyFromLegacyJson(Map<String, dynamic> j) =>
    MobilePolicy(
      offlineEnabled: j['offlineEnabled'] as bool? ?? true,
      syncBatchSize: j['syncBatchSize'] as int? ?? 25,
      receiptMaxSizeMb: j['receiptMaxSizeMb'] as int? ?? 10,
    );

ExpensePolicySnapshot _expensePolicyFromJson(Map<String, dynamic> j) =>
    ExpensePolicySnapshot(
      version: j['version'] as String? ?? '1.0',
      categoryLimits: (j['categoryLimits'] as Map<String, dynamic>? ?? {}).map(
        (k, v) => MapEntry(k, (v as num).toDouble()),
      ),
      receiptRequiredCategories: Set<String>.from(
        (j['receiptRequiredCategories'] as List<dynamic>? ?? []),
      ),
    );

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
      final bootstrap = bootstrapSessionFromJson(
        response.data as Map<String, dynamic>,
      );
      await cache(bootstrap);
      return bootstrap;
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  @override
  Future<BootstrapSession> fetchForTenant(
    AuthSession session,
    String tenantId,
  ) async {
    final client = createExpenseHttpClient(
      ApiConfig(accessToken: session.tokens.accessToken),
    );
    try {
      final response = await client.get(
        ExpenseApiEndpoints.mobileBootstrap,
        queryParameters: {'tenantId': tenantId},
      );
      final bootstrap = bootstrapSessionFromJson(
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

// ── Bootstrap session provider (FutureProvider — kept for backward compat) ────
//
// All screens and pre-B-098 tests continue to use this provider unchanged.
// HomeScreen now watches bootstrapNotifierProvider for retry/switchTenant.

final bootstrapSessionProvider = FutureProvider<BootstrapSession>((ref) async {
  final authState = await ref.watch(authStateProvider.future);
  final repo = ref.watch(mobileBootstrapRepositoryProvider);

  if (authState.isAuthenticated && authState.session != null) {
    final cached = await repo.restoreCached();
    if (cached != null) return cached;

    final fetched = await repo.fetch(authState.session);
    await repo.cache(fetched);
    return fetched;
  }

  return repo.fetch(null);
});

// ── Bootstrap notifier (B-098) — adds retry() and switchTenant() ─────────────

class BootstrapNotifier extends AsyncNotifier<BootstrapSession> {
  // Set to true after the user explicitly selects a tenant, preventing
  // HomeScreen from re-triggering the /tenant-select redirect.
  bool _tenantWasSelected = false;

  bool get pendingTenantSelection {
    if (!kIsRemoteAuth) return false;
    if (_tenantWasSelected) return false;
    final data = state.asData?.value;
    return data != null && data.availableTenants.length > 1;
  }

  @override
  Future<BootstrapSession> build() async {
    final authState = await ref.watch(authStateProvider.future);
    final repo = ref.watch(mobileBootstrapRepositoryProvider);

    if (authState.isAuthenticated && authState.session != null) {
      final cached = await repo.restoreCached();
      if (cached != null) return cached;

      final fetched = await repo.fetch(authState.session);
      await repo.cache(fetched);
      return fetched;
    }

    return repo.fetch(null);
  }

  Future<void> retry() async {
    final repo = ref.read(mobileBootstrapRepositoryProvider);
    await repo.clearCache();
    _tenantWasSelected = false;
    ref.invalidateSelf();
  }

  Future<void> switchTenant(TenantContext tenant) async {
    final authAsync = ref.read(authStateProvider);
    final session = authAsync.asData?.value.session;
    if (session == null) return;

    state = const AsyncValue.loading();
    try {
      final repo = ref.read(mobileBootstrapRepositoryProvider);
      final updated = await repo.fetchForTenant(session, tenant.tenantId);
      await repo.cache(updated);
      _tenantWasSelected = true;
      state = AsyncValue.data(updated);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final bootstrapNotifierProvider =
    AsyncNotifierProvider<BootstrapNotifier, BootstrapSession>(
      BootstrapNotifier.new,
    );
