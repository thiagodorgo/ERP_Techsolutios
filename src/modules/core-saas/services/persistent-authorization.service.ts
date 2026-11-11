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

// B-USERS-ACESSO-SEG (S4, ajuste 2 da crítica, D-USERS-3) — a leitura do STATUS do usuário na
// organização. Obrigatória no construtor (fail-closed por tipo): nenhum caminho monta este serviço
// sem dizer de onde vem o status. P-SEG-2 (Emenda 1): a mesma leitura traz a marca da senha
// provisória (`local_auth_credentials.must_change_password`).
export type UserStatusLookupLike = {
  findStatusForTenant(
    userId: string,
    tenantId: string,
  ): Promise<{ readonly status: string; readonly mustChangePassword?: boolean } | null>;
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
    private readonly users: UserStatusLookupLike,
  ) {}

  async resolveForActor(
    input: ResolvePersistentAuthorizationInput,
  ): Promise<PersistentAuthorizationResult> {
    // B-USERS-ACESSO-SEG (S4) — usuário desativado, ou fora da organização, não tem papel nem
    // permissão. Este caminho já consulta o banco em toda requisição (o middleware persistente),
    // então a desativação corta as permissões na PRÓXIMA requisição, mesmo com o token de acesso
    // ainda válido: os até 15 min do D-USERS-2 valem para a identidade do token, não para o que
    // ela pode fazer. Nenhuma consulta nova no caminho do token (authenticated-actor fica intocado).
    // P-SEG-2 (Emenda 1, opção a) — com a senha provisória ainda não trocada, a sessão não executa
    // nada que passe por requirePermission: a única ação dela é POST /auth/password (só JWT).
    const user = await this.users.findStatusForTenant(input.userId, input.tenantId);

    if (!user || user.status !== "active" || user.mustChangePassword === true) {
      return {
        roles: [],
        permissions: [],
        source: "persistent_rbac",
      };
    }

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
