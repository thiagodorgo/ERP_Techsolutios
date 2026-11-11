import type { Permission, Role } from "../permissions/catalog.js";

export type TenantStatus = "active" | "inactive";
export type UserStatus = "active" | "inactive";

export type Tenant = {
  readonly id: string;
  readonly name: string;
  readonly document?: string;
  readonly status: TenantStatus;
  readonly modules: readonly string[];
  readonly createdAt: Date;
};

export type User = {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly Role[];
  readonly branchIds: readonly string[];
  readonly status: UserStatus;
  readonly createdAt: Date;
};

// B-USERS-ACESSO-SEG (S2, UEM-01) — o usuário recém-criado e a senha PROVISÓRIA dele, devolvida UMA vez: só no
// 201 da criação. Nenhuma leitura (`User`) carrega este campo, e o valor em claro não é guardado em lugar nenhum
// (o banco tem só o hash). No modo memória não há credencial local, e o campo não vem.
export type CreatedUser = User & { readonly temporaryPassword?: string };

// A credencial inicial que o store grava na MESMA transação da criação do usuário: só o hash da provisória.
export type InitialCredentialInput = {
  readonly passwordHash: string;
  readonly passwordAlgorithm: string;
};

export type AuditEvent = {
  readonly id: string;
  readonly action: string;
  readonly actor_user_id: string;
  readonly tenant_id: string;
  readonly timestamp: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type AuthenticatedActor = {
  readonly tenantId: string;
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
  readonly explicitPermissions: boolean;
};

export type CreateTenantInput = {
  readonly name: string;
  readonly document?: string;
  readonly status?: TenantStatus;
  readonly modules?: readonly string[];
  readonly actorUserId?: string;
};

export type CreateUserInput = {
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly branchIds?: readonly string[];
  readonly status?: UserStatus;
  readonly actorUserId?: string;
};

export type UpdateUserInput = {
  readonly userId: string;
  readonly tenantId: string;
  readonly name?: string;
  readonly roles?: readonly string[];
  readonly status?: UserStatus;
};

export type ListTenantOptions = {
  readonly status?: TenantStatus;
};

export type TenantMembership = {
  readonly tenant: Tenant;
  readonly user: User;
  // B-USERS-ACESSO-SEG (P-SESSAO-RESTRITA) — a marca `must_change_password` do PAR, preenchida só por
  // `findMembershipForIdentity` (a troca de organização, que assina token). A listagem não a lê.
  // Ausente conta como restrita no assinador (falha fechada).
  readonly mustChangePassword?: boolean;
};

// B-O6R-01 — candidato INTERNO do login sem organização: só o par (tenant, usuário). A lista
// nunca atravessa a borda da API; quem decide é a credencial (I1).
export type LoginCandidate = {
  readonly tenantId: string;
  readonly userId: string;
};

export class CoreSaasError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "CoreSaasError";
  }
}
