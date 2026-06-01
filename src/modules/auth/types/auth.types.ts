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
