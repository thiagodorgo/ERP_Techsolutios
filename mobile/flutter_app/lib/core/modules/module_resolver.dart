import '../bootstrap/bootstrap_session.dart';
import '../permissions/permission_resolver.dart';

class ModuleResolver {
  const ModuleResolver(this.permissions);

  final PermissionResolver permissions;

  List<EnabledModule> visibleModules(BootstrapSession session) {
    return session.enabledModules
        .where((module) => canOpen(module, session.permissions))
        .toList(growable: false);
  }

  bool canOpen(EnabledModule module, PermissionSet permissionSet) {
    if (module.requiredPermissions.isEmpty) {
      return true;
    }

    return permissions.hasAll(permissionSet, module.requiredPermissions);
  }
}
