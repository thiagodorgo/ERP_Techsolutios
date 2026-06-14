import 'package:equatable/equatable.dart';

import '../permissions/permission_resolver.dart';
import 'bootstrap_expanded_session.dart';

class AuthenticatedUser extends Equatable {
  const AuthenticatedUser({
    required this.userId,
    required this.email,
    required this.tenantRole,
    required this.tenantRoles,
    required this.scope,
  });

  final String userId;
  final String email;
  final String tenantRole;
  final List<String> tenantRoles;
  final String scope;

  @override
  List<Object?> get props => [userId, email, tenantRole, tenantRoles, scope];
}

class TenantContext extends Equatable {
  const TenantContext({required this.tenantId, required this.displayName});

  final String tenantId;
  final String displayName;

  @override
  List<Object?> get props => [tenantId, displayName];
}

class EnabledModule extends Equatable {
  const EnabledModule({
    required this.id,
    required this.title,
    required this.route,
    this.requiredPermissions = const <String>[],
  });

  final String id;
  final String title;
  final String route;
  final List<String> requiredPermissions;

  @override
  List<Object?> get props => [id, title, route, requiredPermissions];
}

class MobilePolicy extends Equatable {
  const MobilePolicy({
    required this.offlineEnabled,
    required this.syncBatchSize,
    required this.receiptMaxSizeMb,
  });

  final bool offlineEnabled;
  final int syncBatchSize;
  final int receiptMaxSizeMb;

  @override
  List<Object?> get props => [offlineEnabled, syncBatchSize, receiptMaxSizeMb];
}

class ExpenseCategorySnapshot extends Equatable {
  const ExpenseCategorySnapshot({
    required this.id,
    required this.label,
    required this.requiresReceipt,
    this.limit,
  });

  final String id;
  final String label;
  final bool requiresReceipt;
  final double? limit;

  @override
  List<Object?> get props => [id, label, requiresReceipt, limit];
}

class ExpensePolicySnapshot extends Equatable {
  const ExpensePolicySnapshot({
    required this.version,
    required this.categoryLimits,
    required this.receiptRequiredCategories,
  });

  final String version;
  final Map<String, double> categoryLimits;
  final Set<String> receiptRequiredCategories;

  @override
  List<Object?> get props => [
    version,
    categoryLimits,
    receiptRequiredCategories,
  ];
}

class BootstrapSession extends Equatable {
  const BootstrapSession({
    required this.activeTenant,
    required this.enabledModules,
    required this.permissions,
    this.availableTenants = const <TenantContext>[],
    this.user = const AuthenticatedUser(
      userId: 'employee-1',
      email: 'tecnico@tenant.demo',
      tenantRole: 'field_technician',
      tenantRoles: <String>['field_technician'],
      scope: 'tenant',
    ),
    this.mobilePolicy = const MobilePolicy(
      offlineEnabled: true,
      syncBatchSize: 25,
      receiptMaxSizeMb: 10,
    ),
    this.expenseCategories = const <ExpenseCategorySnapshot>[],
    this.expensePolicy = const ExpensePolicySnapshot(
      version: '2026-06-11',
      categoryLimits: <String, double>{},
      receiptRequiredCategories: <String>{},
    ),
    // Expanded contract fields — absent when loaded from cache (defaults apply).
    this.featureFlags = const <String, FeatureFlag>{},
    this.expandedPolicy = ExpandedMobilePolicy.defaultPolicy,
    this.contractMeta,
    this.syncCursors = SyncCursors.empty,
  });

  final TenantContext activeTenant;
  final List<TenantContext> availableTenants;
  final AuthenticatedUser user;
  final List<EnabledModule> enabledModules;
  final PermissionSet permissions;
  final MobilePolicy mobilePolicy;
  final List<ExpenseCategorySnapshot> expenseCategories;
  final ExpensePolicySnapshot expensePolicy;

  // Expanded bootstrap fields (B-098A). Empty/default when session comes from cache.
  final Map<String, FeatureFlag> featureFlags;
  final ExpandedMobilePolicy expandedPolicy;
  final BootstrapContractMeta? contractMeta;
  final SyncCursors syncCursors;

  /// Returns true only when the backend explicitly enabled this flag.
  bool isFeatureEnabled(String flagKey) =>
      featureFlags[flagKey]?.enabled ?? false;

  /// Returns the backend-reported capability status for [flagKey].
  /// Defaults to [CapabilityStatus.unavailable] when the flag is absent.
  CapabilityStatus featureStatus(String flagKey) =>
      featureFlags[flagKey]?.status ?? CapabilityStatus.unavailable;

  @override
  List<Object?> get props => [
    activeTenant,
    availableTenants,
    user,
    enabledModules,
    permissions,
    mobilePolicy,
    expenseCategories,
    expensePolicy,
    featureFlags,
    expandedPolicy,
    contractMeta,
    syncCursors,
  ];
}

const devBootstrapSession = BootstrapSession(
  activeTenant: TenantContext(
    tenantId: 'tenant-demo',
    displayName: 'Tenant Demo',
  ),
  availableTenants: [
    TenantContext(tenantId: 'tenant-demo', displayName: 'Tenant Demo'),
    TenantContext(
      tenantId: 'tenant-field',
      displayName: 'Tenant Field Services',
    ),
  ],
  enabledModules: [
    EnabledModule(
      id: 'expense_management',
      title: 'Gestao de Despesas',
      route: '/expenses',
      requiredPermissions: ['expense_report:read', 'expense_report:create'],
    ),
    EnabledModule(
      id: 'field_operations',
      title: 'Operacoes de Campo',
      route: '/work-orders',
      requiredPermissions: ['field_location:send'],
    ),
    EnabledModule(
      id: 'inventory',
      title: 'Estoque do Tecnico',
      route: '/inventory',
      requiredPermissions: ['inventory:read'],
    ),
    EnabledModule(
      id: 'approvals',
      title: 'Aprovacoes',
      route: '/approvals',
      requiredPermissions: ['workflow:request'],
    ),
  ],
  permissions: PermissionSet({
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
  }),
  expenseCategories: [
    ExpenseCategorySnapshot(
      id: 'fuel',
      label: 'Combustivel',
      requiresReceipt: true,
      limit: 150,
    ),
    ExpenseCategorySnapshot(
      id: 'meal',
      label: 'Alimentacao',
      requiresReceipt: false,
      limit: 80,
    ),
    ExpenseCategorySnapshot(
      id: 'parking',
      label: 'Estacionamento',
      requiresReceipt: true,
      limit: 60,
    ),
  ],
  expensePolicy: ExpensePolicySnapshot(
    version: '2026-06-11',
    categoryLimits: {'fuel': 150, 'meal': 80, 'parking': 60},
    receiptRequiredCategories: {'fuel', 'parking'},
  ),
);
