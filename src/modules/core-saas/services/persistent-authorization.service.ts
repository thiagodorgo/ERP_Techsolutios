import {
  isValidPermission,
  isValidRole,
  uniquePermissions,
  type Permission,
  type Role,
} from "../permissions/catalog.js";

type RoleAssignmentRecord = {
  readonly role: {
    readonly id: string;
    readonly key: string;
  };
};

type RolePermissionRecord = {
  readonly permission: {
    readonly key: string;
  };
};

type UserRoleRepositoryLike = {
  listByUserForTenant(
    userId: string,
    tenantId: string,
  ): Promise<readonly RoleAssignmentRecord[]>;
};

type RoleRepositoryLike = {
  listPermissionsByRoleId(roleId: string): Promise<readonly RolePermissionRecord[]>;
};

export type ResolvePersistentAuthorizationInput = {
  readonly tenantId: string;
  readonly userId: string;
};

export type PersistentAuthorizationResult = {
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
  readonly source: "persistent_rbac";
};

export class PersistentAuthorizationService {
  constructor(
    private readonly userRoles: UserRoleRepositoryLike,
    private readonly roles: RoleRepositoryLike,
  ) {}

  async resolveForActor(
    input: ResolvePersistentAuthorizationInput,
  ): Promise<PersistentAuthorizationResult> {
    const assignments = await this.userRoles.listByUserForTenant(
      input.userId,
      input.tenantId,
    );
    const roleEntries = new Map<string, RoleAssignmentRecord["role"]>();

    for (const assignment of assignments) {
      roleEntries.set(assignment.role.id, assignment.role);
    }

    const validRoles = [...roleEntries.values()]
      .map((role) => role.key)
      .filter(isValidRole)
      .map((role) => role as Role);
    const permissionRecords = await Promise.all(
      [...roleEntries.values()].map((role) =>
        this.roles.listPermissionsByRoleId(role.id),
      ),
    );
    const permissions = uniquePermissions(
      permissionRecords
        .flat()
        .map((entry) => entry.permission.key)
        .filter(isValidPermission)
        .map((permission) => permission as Permission),
    );

    return {
      roles: [...new Set(validRoles)],
      permissions,
      source: "persistent_rbac",
    };
  }
}
