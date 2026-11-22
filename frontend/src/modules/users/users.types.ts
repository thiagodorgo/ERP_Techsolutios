// F9 Usuários — tipos do módulo de gestão de acesso (papéis, situação) ligado a /api/v1/users.

// Enum real do backend: apenas active|inactive. "invited" é tolerado defensivamente para não
// fabricar dados caso o backend passe a emitir convites — nunca é inventado no cliente (D-007).
export type UserStatus = "active" | "inactive" | "invited";

// Situação gravável (POST/PATCH aceitam somente active|inactive).
export type UserWritableStatus = "active" | "inactive";

export type User = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  // Chaves canônicas de papel (RBAC_MATRIX). Rótulo PT-BR é resolvido na camada de UI.
  readonly roles: string[];
  readonly branchIds: string[];
  readonly status: UserStatus;
  readonly createdAt: string;
};

export type UsersPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type UsersSource = "api" | "mock" | "fallback";

export type UsersData = {
  readonly items: User[];
  readonly pagination: UsersPagination;
  readonly source: UsersSource;
  readonly fallbackReason?: string;
};

export type UsersStatusFilter = "all" | "active" | "inactive";

export type UsersFilters = {
  readonly search: string;
  readonly isActive: UsersStatusFilter;
  // Janela de busca (parâmetro `limit`); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type UsersApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type UserCreatePayload = {
  readonly name: string;
  readonly email: string;
  readonly roles: string[];
  readonly branchIds?: string[];
  readonly status?: UserWritableStatus;
};

export type UserUpdatePayload = {
  readonly name?: string;
  readonly roles?: string[];
  readonly status?: UserWritableStatus;
};

export type UserField = "name" | "email" | "roles" | "status";

export type UserFieldError = {
  readonly field: UserField;
  readonly message: string;
};

// B-APP-ORG-2S (S3) — dar acesso a um login do grupo (`POST /users/access-grants`, plano 1.8 §3.1). O perfil é fixo
// no servidor (`field_technician`) e a organização vem do ator: o corpo leva só o e-mail e o nome.
export type UserAccessGrantPayload = {
  readonly email: string;
  readonly name: string;
};

// A criação devolve a senha provisória UMA vez, no 201 (`temporaryPassword`). Ela nunca entra na lista de usuários: o
// chamador a entrega ao diálogo da provisória e a descarta ao fechar.
export type CreatedUserResult = {
  readonly user: User | null;
  readonly temporaryPassword: string | null;
};

// `POST /auth/users/:userId/reset-password` (plano 1.8.3 §2.3): a provisória, uma vez, e quantos pátios ela atinge.
export type PasswordResetResult = {
  readonly temporaryPassword: string;
  readonly affectedPatios: number;
};
