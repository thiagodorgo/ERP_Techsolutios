export type UserRole =
  | "Super Admin"
  | "Administrador"
  | "Gestor Operacional"
  | "Operador Logistico"
  | "Operação de Campo"
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
  refreshToken?: string;
  tokenType: "Bearer";
  expiresAt: string;
  refreshExpiresAt?: string;
  sessionId?: string;
  tenant?: AuthTenant;
  provider: "cognito-compatible" | "local-jwt" | "mock";
};

export type AuthTokenUpdate = {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
  refreshToken?: string;
  refreshExpiresAt?: string;
  sessionId?: string;
};

export type LoginCredentials = {
  tenantId: string;
  email: string;
  password: string;
};
