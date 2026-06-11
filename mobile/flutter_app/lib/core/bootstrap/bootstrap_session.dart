import 'package:equatable/equatable.dart';

import '../permissions/permission_resolver.dart';

class TenantContext extends Equatable {
  const TenantContext({
    required this.tenantId,
    required this.displayName,
  });

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

class BootstrapSession extends Equatable {
  const BootstrapSession({
    required this.activeTenant,
    required this.enabledModules,
    required this.permissions,
  });

  final TenantContext activeTenant;
  final List<EnabledModule> enabledModules;
  final PermissionSet permissions;

  @override
  List<Object?> get props => [activeTenant, enabledModules, permissions];
}

const devBootstrapSession = BootstrapSession(
  activeTenant: TenantContext(
    tenantId: 'tenant-demo',
    displayName: 'Tenant Demo',
  ),
  enabledModules: [
    EnabledModule(
      id: 'expense_management',
      title: 'Gestao de Despesas',
      route: '/expenses',
      requiredPermissions: ['expense_report:create'],
    ),
    EnabledModule(
      id: 'field_operations',
      title: 'Operacoes de Campo',
      route: '/field-ops',
      requiredPermissions: ['field_location:send'],
    ),
  ],
  permissions: PermissionSet({
    'expense_report:create',
    'expense_report:submit',
    'receipt:attach',
    'ocr:run_local',
    'sync_diagnostics:read',
  }),
);
