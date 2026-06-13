import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/modules/module_resolver.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('permission resolver checks exact permissions', () {
    const resolver = PermissionResolver();
    const permissions = PermissionSet({'expense_report:create'});

    expect(resolver.has(permissions, 'expense_report:create'), isTrue);
    expect(resolver.has(permissions, 'expense_report:submit'), isFalse);
  });

  test('module resolver hides module without required permission', () {
    const session = BootstrapSession(
      activeTenant: TenantContext(tenantId: 'tenant-a', displayName: 'A'),
      enabledModules: [
        EnabledModule(
          id: 'expense_management',
          title: 'Gestao de Despesas',
          route: '/expenses',
          requiredPermissions: ['expense_report:create'],
        ),
      ],
      permissions: PermissionSet({'expense_report:read'}),
    );

    final modules = const ModuleResolver(
      PermissionResolver(),
    ).visibleModules(session);

    expect(modules, isEmpty);
  });

  test('field operations module requires field location permission', () {
    const session = BootstrapSession(
      activeTenant: TenantContext(tenantId: 'tenant-a', displayName: 'A'),
      enabledModules: [
        EnabledModule(
          id: 'field_operations',
          title: 'Operacoes de Campo',
          route: '/work-orders',
          requiredPermissions: ['field_location:send'],
        ),
      ],
      permissions: PermissionSet({'work_orders:read'}),
    );

    final modules = const ModuleResolver(
      PermissionResolver(),
    ).visibleModules(session);

    expect(modules, isEmpty);
  });

  test('field operations module appears with field location permission', () {
    const session = BootstrapSession(
      activeTenant: TenantContext(tenantId: 'tenant-a', displayName: 'A'),
      enabledModules: [
        EnabledModule(
          id: 'field_operations',
          title: 'Operacoes de Campo',
          route: '/work-orders',
          requiredPermissions: ['field_location:send'],
        ),
      ],
      permissions: PermissionSet({'field_location:send'}),
    );

    final modules = const ModuleResolver(
      PermissionResolver(),
    ).visibleModules(session);

    expect(modules.single.id, 'field_operations');
  });
}
