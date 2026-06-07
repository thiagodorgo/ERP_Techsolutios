export type UserRole =
  | "Super Admin"
  | "Administrador"
  | "Gestor Operacional"
  | "Operador Logistico"
  | "Supervisor"
  | "Financeiro"
  | "Auditor";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  cognitoSubject: string;
  roles: UserRole[];
  backendRoles?: string[];
  permissions: string[];
  status: "active" | "inactive";
};

export type AuthTenant = {
  id: string;
  name: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
  tenant?: AuthTenant;
  provider: "cognito-compatible" | "local-jwt" | "mock";
};

export type LoginCredentials = {
  tenantId: string;
  email: string;
  password: string;
};
