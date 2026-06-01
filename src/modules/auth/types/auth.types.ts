export type PasswordHashResult = {
  readonly password_hash: string;
  readonly password_algorithm: "scrypt-v1";
};

export type CreateLocalCredentialInput = {
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password: string;
};

export type VerifyLocalCredentialInput = {
  readonly tenant_id: string;
  readonly email: string;
  readonly password: string;
};

export type VerifyLocalCredentialResult =
  | {
      readonly ok: true;
      readonly tenant_id: string;
      readonly user_id: string;
    }
  | {
      readonly ok: false;
      readonly reason: "invalid_credentials" | "locked" | "not_found";
    };

export type LocalCredentialPublic = {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password_algorithm: string;
  readonly password_updated_at: Date;
  readonly failed_attempts: number;
  readonly locked_until: Date | null;
  readonly last_login_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

export class AuthCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthCredentialError";
  }
}

export type LocalAuthLoginInput = {
  readonly tenant_id: string;
  readonly email: string;
  readonly password: string;
};

export type LocalAuthLoginUser = {
  readonly id: string;
  readonly tenant_id: string;
  readonly email: string;
  readonly name: string;
  readonly status: string;
};

export type LocalAuthLoginTenant = {
  readonly id: string;
  readonly name: string;
};

export type LocalAuthLoginRole = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
};

export type LocalAuthLoginResult =
  | {
      readonly ok: true;
      readonly user: LocalAuthLoginUser;
      readonly tenant: LocalAuthLoginTenant;
      readonly roles: readonly LocalAuthLoginRole[];
    }
  | {
      readonly ok: false;
      readonly reason: "invalid_credentials" | "locked" | "inactive";
    };

export type SignAccessTokenInput = {
  readonly user_id: string;
  readonly tenant_id: string;
  readonly email: string;
  readonly roles: readonly string[];
};

export type AuthenticatedTokenPayload = {
  readonly sub: string;
  readonly tenant_id: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly type: "access";
  readonly iat: number;
  readonly exp: number;
  readonly iss?: string;
  readonly aud?: string;
};

export type AuthenticatedActor = {
  readonly userId: string;
  readonly tenantId: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly authType: "jwt";
};

export type LegacyHeaderActor = {
  readonly userId?: string;
  readonly tenantId?: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly authType: "legacy_headers";
};

export type RequestActor = AuthenticatedActor | LegacyHeaderActor;
