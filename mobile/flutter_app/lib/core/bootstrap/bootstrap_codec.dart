import 'dart:convert';

import '../permissions/permission_resolver.dart';
import 'bootstrap_session.dart';

class BootstrapSessionCodec {
  const BootstrapSessionCodec._();

  static String encode(BootstrapSession session) =>
      jsonEncode(_toJson(session));

  static BootstrapSession decode(String json) =>
      _fromJson(jsonDecode(json) as Map<String, dynamic>);

  // ── Serialisation ─────────────────────────────────────────────────────────

  static Map<String, Object?> _toJson(BootstrapSession s) => {
    'activeTenant': _tenantToJson(s.activeTenant),
    'availableTenants': s.availableTenants.map(_tenantToJson).toList(),
    'user': _userToJson(s.user),
    'enabledModules': s.enabledModules.map(_moduleToJson).toList(),
    'permissions': s.permissions.permissions.toList(),
    'mobilePolicy': _mobilePolicyToJson(s.mobilePolicy),
    'expenseCategories': s.expenseCategories.map(_categoryToJson).toList(),
    'expensePolicy': _expensePolicyToJson(s.expensePolicy),
  };

  static Map<String, Object?> _tenantToJson(TenantContext t) => {
    'tenantId': t.tenantId,
    'displayName': t.displayName,
  };

  static Map<String, Object?> _userToJson(AuthenticatedUser u) => {
    'userId': u.userId,
    'email': u.email,
    'tenantRole': u.tenantRole,
    'tenantRoles': u.tenantRoles,
    'scope': u.scope,
    // NOT stored: password, raw tokens, private paths
  };

  static Map<String, Object?> _moduleToJson(EnabledModule m) => {
    'id': m.id,
    'title': m.title,
    'route': m.route,
    'requiredPermissions': m.requiredPermissions,
  };

  static Map<String, Object?> _mobilePolicyToJson(MobilePolicy p) => {
    'offlineEnabled': p.offlineEnabled,
    'syncBatchSize': p.syncBatchSize,
    'receiptMaxSizeMb': p.receiptMaxSizeMb,
  };

  static Map<String, Object?> _categoryToJson(ExpenseCategorySnapshot c) => {
    'id': c.id,
    'label': c.label,
    'requiresReceipt': c.requiresReceipt,
    if (c.limit != null) 'limit': c.limit,
  };

  static Map<String, Object?> _expensePolicyToJson(ExpensePolicySnapshot p) => {
    'version': p.version,
    'categoryLimits': p.categoryLimits,
    'receiptRequiredCategories': p.receiptRequiredCategories.toList(),
  };

  // ── Deserialisation ───────────────────────────────────────────────────────

  static BootstrapSession _fromJson(Map<String, dynamic> j) => BootstrapSession(
    activeTenant: _tenantFromJson(j['activeTenant'] as Map<String, dynamic>),
    availableTenants: (j['availableTenants'] as List<dynamic>)
        .map((t) => _tenantFromJson(t as Map<String, dynamic>))
        .toList(),
    user: _userFromJson(j['user'] as Map<String, dynamic>),
    enabledModules: (j['enabledModules'] as List<dynamic>)
        .map((m) => _moduleFromJson(m as Map<String, dynamic>))
        .toList(),
    permissions: PermissionSet(
      Set<String>.from(j['permissions'] as List<dynamic>),
    ),
    mobilePolicy: _mobilePolicyFromJson(
      j['mobilePolicy'] as Map<String, dynamic>,
    ),
    expenseCategories: (j['expenseCategories'] as List<dynamic>)
        .map((c) => _categoryFromJson(c as Map<String, dynamic>))
        .toList(),
    expensePolicy: _expensePolicyFromJson(
      j['expensePolicy'] as Map<String, dynamic>,
    ),
  );

  static TenantContext _tenantFromJson(Map<String, dynamic> j) => TenantContext(
    tenantId: j['tenantId'] as String,
    displayName: j['displayName'] as String,
  );

  static AuthenticatedUser _userFromJson(Map<String, dynamic> j) =>
      AuthenticatedUser(
        userId: j['userId'] as String,
        email: j['email'] as String,
        tenantRole: j['tenantRole'] as String,
        tenantRoles: (j['tenantRoles'] as List<dynamic>).cast<String>(),
        scope: j['scope'] as String,
      );

  static EnabledModule _moduleFromJson(Map<String, dynamic> j) => EnabledModule(
    id: j['id'] as String,
    title: j['title'] as String,
    route: j['route'] as String,
    requiredPermissions: (j['requiredPermissions'] as List<dynamic>)
        .cast<String>(),
  );

  static MobilePolicy _mobilePolicyFromJson(Map<String, dynamic> j) =>
      MobilePolicy(
        offlineEnabled: j['offlineEnabled'] as bool,
        syncBatchSize: j['syncBatchSize'] as int,
        receiptMaxSizeMb: j['receiptMaxSizeMb'] as int,
      );

  static ExpenseCategorySnapshot _categoryFromJson(Map<String, dynamic> j) =>
      ExpenseCategorySnapshot(
        id: j['id'] as String,
        label: j['label'] as String,
        requiresReceipt: j['requiresReceipt'] as bool,
        limit: (j['limit'] as num?)?.toDouble(),
      );

  static ExpensePolicySnapshot _expensePolicyFromJson(Map<String, dynamic> j) =>
      ExpensePolicySnapshot(
        version: j['version'] as String,
        categoryLimits: (j['categoryLimits'] as Map<String, dynamic>).map(
          (k, v) => MapEntry(k, (v as num).toDouble()),
        ),
        receiptRequiredCategories: Set<String>.from(
          j['receiptRequiredCategories'] as List<dynamic>,
        ),
      );
}
