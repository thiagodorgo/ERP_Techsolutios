export type UserRole =
  | "Admin Tenant"
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
  status: "active" | "inactive";
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  expiresAt: string;
  provider: "cognito-compatible";
};
