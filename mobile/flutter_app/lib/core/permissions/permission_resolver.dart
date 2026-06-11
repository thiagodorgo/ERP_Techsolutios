import 'package:equatable/equatable.dart';

class PermissionSet extends Equatable {
  const PermissionSet(this.permissions);

  final Set<String> permissions;

  bool contains(String permission) => permissions.contains(permission);

  @override
  List<Object?> get props => [permissions];
}

class PermissionResolver {
  const PermissionResolver();

  bool has(PermissionSet permissionSet, String permission) {
    return permissionSet.contains(permission);
  }

  bool hasAll(PermissionSet permissionSet, Iterable<String> permissions) {
    return permissions.every(permissionSet.contains);
  }

  bool hasAny(PermissionSet permissionSet, Iterable<String> permissions) {
    return permissions.any(permissionSet.contains);
  }
}
