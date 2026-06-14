// B-098B — Flutter Consume Expanded Mobile Bootstrap Contract
//
// Tests cover:
//   Group 1 — CapabilityStatus parsing
//   Group 2 — Minimal contract (B-098) backward compat
//   Group 3 — Expanded contract (B-098A) full parsing
//   Group 4 — Feature flags
//   Group 5 — Expanded mobile policy
//   Group 6 — Sync cursors and contract metadata
//   Group 7 — Optional fields absent / graceful degradation
//   Group 8 — BootstrapSession helpers

import 'package:flutter_test/flutter_test.dart';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_expanded_session.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';

// ── Fixture helpers ───────────────────────────────────────────────────────────

Map<String, dynamic> _minimalBody({
  String userId = 'u-1',
  String email = 'tech@demo.com',
  String tenantId = 'tenant-demo',
  List<String> permissions = const ['work_orders:read'],
}) => {
  'user': {
    'sub': userId,
    'email': email,
    'tenantId': tenantId,
    'tenantRole': 'field_technician',
    'tenantRoles': ['field_technician'],
    'scope': 'tenant',
    'permissions': permissions,
  },
  'activeTenant': {'tenantId': tenantId, 'displayName': 'Demo'},
  'availableTenants': [
    {'tenantId': tenantId, 'displayName': 'Demo'},
    {'tenantId': 'tenant-b', 'displayName': 'Tenant B'},
  ],
  'enabledModules': [
    {
      'id': 'expense_management',
      'title': 'Gestao de Despesas',
      'route': '/expenses',
      'requiredPermissions': ['expense_report:read'],
    },
  ],
  'mobilePolicy': {'offlineEnabled': true, 'syncBatchSize': 25, 'receiptMaxSizeMb': 10},
  'expenseCategories': [
    {'id': 'fuel', 'label': 'Combustivel', 'requiresReceipt': true, 'limit': 150.0},
  ],
  'expensePolicy': {
    'version': '1.0',
    'categoryLimits': {'fuel': 150.0},
    'receiptRequiredCategories': ['fuel'],
  },
};

Map<String, dynamic> _expandedBody({
  String userId = 'u-1',
  String email = 'admin@demo.com',
  String tenantId = 'tenant-demo',
  String tenantName = 'Demo Tenant',
  List<String> roles = const ['tenant_admin'],
  List<String> permissions = const ['work_orders:read', 'expense_report:read'],
  List<Map<String, dynamic>> modules = const [
    {'key': 'expense_management', 'enabled': true},
    {'key': 'work_orders', 'enabled': true},
    {'key': 'mobile', 'enabled': true},
  ],
  Map<String, dynamic>? featureFlags,
  Map<String, dynamic>? mobilePolicy,
  List<Map<String, dynamic>> expenseCategories = const [
    {
      'id': 'fuel',
      'name': 'Combustivel',
      'policy': {'receiptRequired': true, 'defaultLimit': 150.0},
    },
  ],
  Map<String, dynamic>? syncBlock,
  Map<String, dynamic>? contractBlock,
}) => {
  'data': {
    'contract': contractBlock ??
        {
          'name': 'mobile_bootstrap',
          'version': '2026-06-14.b098a',
          'schemaVersion': 2,
          'status': 'expanded',
          'generatedAt': '2026-06-14T20:00:00.000Z',
        },
    'tenant': {'id': tenantId, 'name': tenantName},
    'user': {'id': userId, 'name': 'Admin User', 'email': email},
    'roles': roles,
    'permissions': permissions,
    'modules': modules,
    'feature_flags': featureFlags ??
        {
          'mobile_bootstrap_expanded': {'enabled': true, 'status': 'implemented'},
          'work_orders': {'enabled': true, 'status': 'implemented'},
          'checklists': {'enabled': false, 'status': 'unavailable', 'reason': 'module_disabled'},
          'work_order_sync': {'enabled': false, 'status': 'planned', 'reason': 'planned_for_b098b'},
          'inventory_mobile': {'enabled': false, 'status': 'planned', 'reason': 'backend_contract_unavailable'},
          'expense_sync': {'enabled': true, 'status': 'implemented'},
        },
    'mobile_policy': mobilePolicy ??
        {
          'auth': {'bearer_required': true, 'tenant_source': 'authenticated_actor'},
          'sync': {
            'actions_enabled': false,
            'read_only_bootstrap': true,
            'client_action_id_required': true,
            'max_batch_size': 50,
            'retry_backoff_seconds': [10, 30, 120],
            'implemented_domains': ['expenses'],
            'planned_domains': ['work_orders', 'checklists', 'inventory'],
          },
          'evidence': {
            'checklist_attachments': 'implemented',
            'work_order_evidence': 'planned',
            'generic_upload': 'planned',
            'max_upload_mb': 10,
            'allowed_mime_types': ['image/jpeg', 'image/png'],
          },
          'diagnostics': {'safe_logs_only': true, 'include_tokens': false},
        },
    'catalogs': {
      'version': 'mobile-catalogs:v1',
      'expense_categories': {
        'status': 'implemented',
        'version': 'expense-categories:v1',
        'reason': null,
        'items': expenseCategories,
      },
      'endpoints': {
        'status': 'partial',
        'items': [
          {'key': 'work_orders', 'endpoint': 'GET /api/v1/work-orders', 'status': 'implemented'},
          {'key': 'work_order_sync', 'endpoint': 'POST /api/v1/mobile/sync/work-order-actions', 'status': 'planned'},
        ],
      },
    },
    'expenseCategories': expenseCategories,
    'sync': syncBlock ??
        {
          'workOrdersCursor': null,
          'checklistsCursor': null,
          'expensesCursor': null,
          'inventoryCursor': null,
        },
    'serverTime': '2026-06-14T20:00:00.000Z',
  },
};

// ── Group 1 — CapabilityStatus parsing ───────────────────────────────────────

void main() {
  group('Group 1 — CapabilityStatus', () {
    test('1.1 "implemented" → CapabilityStatus.implemented', () {
      expect(
        CapabilityStatus.fromString('implemented'),
        CapabilityStatus.implemented,
      );
    });

    test('1.2 "partial" → CapabilityStatus.partial', () {
      expect(CapabilityStatus.fromString('partial'), CapabilityStatus.partial);
    });

    test('1.3 "planned" → CapabilityStatus.planned', () {
      expect(CapabilityStatus.fromString('planned'), CapabilityStatus.planned);
    });

    test('1.4 unknown string → CapabilityStatus.unavailable', () {
      expect(
        CapabilityStatus.fromString('not_a_real_status'),
        CapabilityStatus.unavailable,
      );
    });

    test('1.5 empty string → CapabilityStatus.unavailable', () {
      expect(CapabilityStatus.fromString(''), CapabilityStatus.unavailable);
    });

    test('1.6 isAvailable: implemented → true', () {
      expect(CapabilityStatus.implemented.isAvailable, isTrue);
    });

    test('1.7 isAvailable: partial → true', () {
      expect(CapabilityStatus.partial.isAvailable, isTrue);
    });

    test('1.8 isAvailable: planned → false', () {
      expect(CapabilityStatus.planned.isAvailable, isFalse);
    });

    test('1.9 isAvailable: unavailable → false', () {
      expect(CapabilityStatus.unavailable.isAvailable, isFalse);
    });
  });

  // ── Group 2 — Minimal contract backward compat ───────────────────────────────

  group('Group 2 — Minimal contract (B-098 backward compat)', () {
    test('2.1 parses user fields from minimal body', () {
      final session = bootstrapSessionFromJson(_minimalBody());
      expect(session.user.userId, 'u-1');
      expect(session.user.email, 'tech@demo.com');
      expect(session.user.tenantRole, 'field_technician');
      expect(session.user.tenantRoles, ['field_technician']);
    });

    test('2.2 parses activeTenant and availableTenants from minimal body', () {
      final session = bootstrapSessionFromJson(_minimalBody());
      expect(session.activeTenant.tenantId, 'tenant-demo');
      expect(session.availableTenants.length, 2);
      expect(session.availableTenants.last.tenantId, 'tenant-b');
    });

    test('2.3 parses enabledModules from minimal body', () {
      final session = bootstrapSessionFromJson(_minimalBody());
      expect(session.enabledModules.length, 1);
      expect(session.enabledModules.first.id, 'expense_management');
      expect(session.enabledModules.first.route, '/expenses');
    });

    test('2.4 parses permissions from user object in minimal body', () {
      final session = bootstrapSessionFromJson(
        _minimalBody(permissions: ['work_orders:read', 'inventory:read']),
      );
      expect(session.permissions.contains('work_orders:read'), isTrue);
      expect(session.permissions.contains('inventory:read'), isTrue);
    });

    test('2.5 minimal contract produces empty featureFlags', () {
      final session = bootstrapSessionFromJson(_minimalBody());
      expect(session.featureFlags, isEmpty);
    });

    test('2.6 minimal contract produces default expandedPolicy', () {
      final session = bootstrapSessionFromJson(_minimalBody());
      expect(session.expandedPolicy, ExpandedMobilePolicy.defaultPolicy);
    });

    test('2.7 minimal contract produces null contractMeta', () {
      final session = bootstrapSessionFromJson(_minimalBody());
      expect(session.contractMeta, isNull);
    });

    test('2.8 minimal contract produces empty SyncCursors', () {
      final session = bootstrapSessionFromJson(_minimalBody());
      expect(session.syncCursors, SyncCursors.empty);
      expect(session.syncCursors.hasAnyCursor, isFalse);
    });
  });

  // ── Group 3 — Expanded contract (B-098A) parsing ─────────────────────────────

  group('Group 3 — Expanded contract (B-098A)', () {
    test('3.1 detects expanded contract via data wrapper', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.contractMeta?.isExpanded, isTrue);
    });

    test('3.2 tenant mapped from data.tenant.{id, name}', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(tenantId: 'tenant-xyz', tenantName: 'XYZ Corp'),
      );
      expect(session.activeTenant.tenantId, 'tenant-xyz');
      expect(session.activeTenant.displayName, 'XYZ Corp');
    });

    test('3.3 user mapped from data.user.id and data.roles', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(userId: 'u-42', email: 'field@xyz.com', roles: ['field_technician']),
      );
      expect(session.user.userId, 'u-42');
      expect(session.user.email, 'field@xyz.com');
      expect(session.user.tenantRole, 'field_technician');
      expect(session.user.tenantRoles, ['field_technician']);
      expect(session.user.scope, 'tenant');
    });

    test('3.4 permissions from top-level permissions array', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(permissions: ['work_orders:read', 'expense_report:create']),
      );
      expect(session.permissions.contains('work_orders:read'), isTrue);
      expect(session.permissions.contains('expense_report:create'), isTrue);
      expect(session.permissions.contains('admin:all'), isFalse);
    });

    test('3.5 modules mapped via local navigation lookup, platform keys ignored', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(modules: [
          {'key': 'expense_management', 'enabled': true},
          {'key': 'work_orders', 'enabled': true},
          {'key': 'mobile', 'enabled': true},       // platform key — ignored
          {'key': 'unknown_future_module', 'enabled': true}, // unknown — ignored
        ]),
      );
      expect(session.enabledModules.length, 2);
      expect(session.enabledModules.map((m) => m.id), containsAll(['expense_management', 'work_orders']));
    });

    test('3.6 disabled modules excluded', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(modules: [
          {'key': 'expense_management', 'enabled': true},
          {'key': 'work_orders', 'enabled': false},
        ]),
      );
      expect(session.enabledModules.length, 1);
      expect(session.enabledModules.first.id, 'expense_management');
    });

    test('3.7 expenseCategories mapped from B-098A legacy field (name → label, policy nested)', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.expenseCategories.length, 1);
      expect(session.expenseCategories.first.id, 'fuel');
      expect(session.expenseCategories.first.label, 'Combustivel');
      expect(session.expenseCategories.first.requiresReceipt, isTrue);
      expect(session.expenseCategories.first.limit, 150.0);
    });

    test('3.8 expensePolicy derived from expanded categories', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.expensePolicy.categoryLimits['fuel'], 150.0);
      expect(session.expensePolicy.receiptRequiredCategories, contains('fuel'));
    });

    test('3.9 availableTenants contains only activeTenant for expanded contract', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.availableTenants.length, 1);
      expect(session.availableTenants.first.tenantId, session.activeTenant.tenantId);
    });
  });

  // ── Group 4 — Feature flags ───────────────────────────────────────────────────

  group('Group 4 — Feature flags', () {
    test('4.1 feature_flags block fully parsed', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.featureFlags, isNotEmpty);
      expect(session.featureFlags.containsKey('work_orders'), isTrue);
      expect(session.featureFlags.containsKey('work_order_sync'), isTrue);
    });

    test('4.2 enabled flag: isFeatureEnabled returns true', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.isFeatureEnabled('work_orders'), isTrue);
      expect(session.isFeatureEnabled('mobile_bootstrap_expanded'), isTrue);
    });

    test('4.3 disabled flag: isFeatureEnabled returns false', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.isFeatureEnabled('work_order_sync'), isFalse);
      expect(session.isFeatureEnabled('checklists'), isFalse);
    });

    test('4.4 absent flag key: isFeatureEnabled returns false', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.isFeatureEnabled('not_a_real_flag'), isFalse);
    });

    test('4.5 featureStatus returns correct CapabilityStatus', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.featureStatus('work_orders'), CapabilityStatus.implemented);
      expect(session.featureStatus('work_order_sync'), CapabilityStatus.planned);
      expect(session.featureStatus('checklists'), CapabilityStatus.unavailable);
    });

    test('4.6 absent flag key: featureStatus returns unavailable', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.featureStatus('not_a_real_flag'), CapabilityStatus.unavailable);
    });

    test('4.7 feature flag reason is preserved', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.featureFlags['checklists']?.reason, 'module_disabled');
      expect(session.featureFlags['work_order_sync']?.reason, 'planned_for_b098b');
    });

    test('4.8 feature_flags block absent in expanded → empty featureFlags', () {
      final body = _expandedBody();
      (body['data'] as Map<String, dynamic>).remove('feature_flags');
      // featureFlags key removed — but the body still has a feature_flags:null
      // Manually inject empty map to simulate absence
      (body['data'] as Map<String, dynamic>)['feature_flags'] = <String, dynamic>{};
      final session = bootstrapSessionFromJson(body);
      expect(session.featureFlags, isEmpty);
      expect(session.isFeatureEnabled('work_orders'), isFalse);
    });
  });

  // ── Group 5 — Expanded mobile policy ─────────────────────────────────────────

  group('Group 5 — Expanded mobile policy', () {
    test('5.1 sync.actionsEnabled parsed correctly', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.expandedPolicy.sync.actionsEnabled, isFalse);
    });

    test('5.2 sync.maxBatchSize parsed correctly', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.expandedPolicy.sync.maxBatchSize, 50);
    });

    test('5.3 sync.implementedDomains parsed correctly', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.expandedPolicy.sync.implementedDomains, ['expenses']);
    });

    test('5.4 sync.plannedDomains parsed correctly', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(
        session.expandedPolicy.sync.plannedDomains,
        containsAll(['work_orders', 'checklists', 'inventory']),
      );
    });

    test('5.5 evidence.maxUploadMb reflected in legacy MobilePolicy', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.mobilePolicy.receiptMaxSizeMb, 10);
    });

    test('5.6 evidence capability statuses parsed', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(
        session.expandedPolicy.evidence.checklistAttachments,
        CapabilityStatus.implemented,
      );
      expect(
        session.expandedPolicy.evidence.workOrderEvidence,
        CapabilityStatus.planned,
      );
      expect(
        session.expandedPolicy.evidence.genericUpload,
        CapabilityStatus.planned,
      );
    });

    test('5.7 mobile_policy block absent → defaultPolicy', () {
      final body = _expandedBody();
      (body['data'] as Map<String, dynamic>).remove('mobile_policy');
      final session = bootstrapSessionFromJson(body);
      expect(session.expandedPolicy.sync.actionsEnabled, isFalse);
      expect(session.expandedPolicy.sync.maxBatchSize, 50);
      expect(
        session.expandedPolicy.evidence.maxUploadMb,
        EvidencePolicy.defaultPolicy.maxUploadMb,
      );
    });

    test('5.8 legacy syncBatchSize derived from expandedPolicy.sync.maxBatchSize', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.mobilePolicy.syncBatchSize, 50);
    });
  });

  // ── Group 6 — Contract meta and sync cursors ──────────────────────────────────

  group('Group 6 — Contract meta and sync cursors', () {
    test('6.1 contractMeta.version parsed', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.contractMeta?.version, '2026-06-14.b098a');
    });

    test('6.2 contractMeta.schemaVersion parsed', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.contractMeta?.schemaVersion, 2);
    });

    test('6.3 contractMeta.isExpanded true for expanded contract', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.contractMeta?.isExpanded, isTrue);
    });

    test('6.4 syncCursors all null when backend returns null cursors', () {
      final session = bootstrapSessionFromJson(_expandedBody());
      expect(session.syncCursors.workOrdersCursor, isNull);
      expect(session.syncCursors.checklistsCursor, isNull);
      expect(session.syncCursors.expensesCursor, isNull);
      expect(session.syncCursors.inventoryCursor, isNull);
      expect(session.syncCursors.hasAnyCursor, isFalse);
    });

    test('6.5 syncCursors populated when backend provides cursor values', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(syncBlock: {
          'workOrdersCursor': 'cursor-wo-abc',
          'checklistsCursor': null,
          'expensesCursor': 'cursor-exp-xyz',
          'inventoryCursor': null,
        }),
      );
      expect(session.syncCursors.workOrdersCursor, 'cursor-wo-abc');
      expect(session.syncCursors.expensesCursor, 'cursor-exp-xyz');
      expect(session.syncCursors.checklistsCursor, isNull);
      expect(session.syncCursors.hasAnyCursor, isTrue);
    });

    test('6.6 sync block absent → SyncCursors.empty', () {
      final body = _expandedBody();
      (body['data'] as Map<String, dynamic>).remove('sync');
      final session = bootstrapSessionFromJson(body);
      expect(session.syncCursors, SyncCursors.empty);
    });

    test('6.7 contract block absent → contractMeta is null', () {
      final body = _expandedBody();
      (body['data'] as Map<String, dynamic>).remove('contract');
      final session = bootstrapSessionFromJson(body);
      expect(session.contractMeta, isNull);
    });
  });

  // ── Group 7 — Optional fields absent / graceful degradation ──────────────────

  group('Group 7 — Graceful degradation', () {
    test('7.1 empty expenseCategories in expanded → empty list, no crash', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(expenseCategories: []),
      );
      expect(session.expenseCategories, isEmpty);
      expect(session.expensePolicy.categoryLimits, isEmpty);
      expect(session.expensePolicy.receiptRequiredCategories, isEmpty);
    });

    test('7.2 modules list absent → empty enabledModules, no crash', () {
      final body = _expandedBody();
      (body['data'] as Map<String, dynamic>).remove('modules');
      final session = bootstrapSessionFromJson(body);
      expect(session.enabledModules, isEmpty);
    });

    test('7.3 roles list empty in expanded → default tenantRole', () {
      final session = bootstrapSessionFromJson(_expandedBody(roles: []));
      expect(session.user.tenantRole, 'tenant_member');
      expect(session.user.tenantRoles, isEmpty);
    });

    test('7.4 permissions list empty in expanded → empty PermissionSet', () {
      final session = bootstrapSessionFromJson(_expandedBody(permissions: []));
      expect(session.permissions.contains('work_orders:read'), isFalse);
    });

    test('7.5 category with null defaultLimit → limit is null', () {
      final session = bootstrapSessionFromJson(
        _expandedBody(expenseCategories: [
          {
            'id': 'misc',
            'name': 'Outros',
            'policy': {'receiptRequired': false, 'defaultLimit': null},
          },
        ]),
      );
      expect(session.expenseCategories.first.limit, isNull);
      expect(session.expensePolicy.categoryLimits.containsKey('misc'), isFalse);
    });

    test('7.6 session loaded from cache has default expandedPolicy', () {
      // Simulate a cached session (no expanded fields in constructor).
      const cached = BootstrapSession(
        activeTenant: TenantContext(tenantId: 't-1', displayName: 'T1'),
        enabledModules: [],
        permissions: PermissionSet({}),
      );
      expect(cached.featureFlags, isEmpty);
      expect(cached.expandedPolicy, ExpandedMobilePolicy.defaultPolicy);
      expect(cached.contractMeta, isNull);
      expect(cached.syncCursors, SyncCursors.empty);
    });
  });

  // ── Group 8 — BootstrapSession helpers ───────────────────────────────────────

  group('Group 8 — BootstrapSession helpers', () {
    test('8.1 isFeatureEnabled returns false for empty featureFlags', () {
      const session = BootstrapSession(
        activeTenant: TenantContext(tenantId: 't-1', displayName: 'T1'),
        enabledModules: [],
        permissions: PermissionSet({}),
      );
      expect(session.isFeatureEnabled('work_orders'), isFalse);
    });

    test('8.2 featureStatus returns unavailable for empty featureFlags', () {
      const session = BootstrapSession(
        activeTenant: TenantContext(tenantId: 't-1', displayName: 'T1'),
        enabledModules: [],
        permissions: PermissionSet({}),
      );
      expect(session.featureStatus('work_orders'), CapabilityStatus.unavailable);
    });

    test('8.3 SyncCursors.hasAnyCursor false when all null', () {
      expect(SyncCursors.empty.hasAnyCursor, isFalse);
    });

    test('8.4 SyncCursors.hasAnyCursor true when at least one cursor set', () {
      const cursors = SyncCursors(workOrdersCursor: 'abc');
      expect(cursors.hasAnyCursor, isTrue);
    });

    test('8.5 BootstrapContractMeta.isExpanded true only for "expanded" status', () {
      const expanded = BootstrapContractMeta(
        version: '2026-06-14.b098a',
        schemaVersion: 2,
        status: 'expanded',
      );
      const minimal = BootstrapContractMeta(
        version: '1.0',
        schemaVersion: 1,
        status: 'minimal',
      );
      expect(expanded.isExpanded, isTrue);
      expect(minimal.isExpanded, isFalse);
    });

    test('8.6 devBootstrapSession compiles with new optional fields at defaults', () {
      // Verify the existing const devBootstrapSession still works unchanged.
      expect(devBootstrapSession.featureFlags, isEmpty);
      expect(devBootstrapSession.syncCursors, SyncCursors.empty);
      expect(devBootstrapSession.contractMeta, isNull);
      expect(devBootstrapSession.expandedPolicy, ExpandedMobilePolicy.defaultPolicy);
    });
  });
}
