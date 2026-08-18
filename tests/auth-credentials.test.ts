import assert from "node:assert/strict";
import test from "node:test";

import {
  AuthCredentialError,
  LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS,
  LOGIN_LOCKOUT_MINUTES,
  LocalAuthCredentialService,
  hashPassword,
  normalizeCredentialEmail,
  validateLocalPassword,
  verifyPassword,
} from "../src/modules/auth/index.js";

test("hashPassword stores a versioned scrypt hash and never returns the plain password", async () => {
  const plainPassword = "ChangeMe123!";
  const result = await hashPassword(plainPassword);

  assert.equal(result.password_algorithm, "scrypt-v1");
  assert.match(result.password_hash, /^scrypt\$v=1\$N=\d+\$r=\d+\$p=\d+\$salt=.+\$hash=.+$/);
  assert.notEqual(result.password_hash, plainPassword);
  assert.equal(result.password_hash.includes(plainPassword), false);
});

test("hashPassword uses a random salt for repeated hashes", async () => {
  const firstHash = await hashPassword("ChangeMe123!");
  const secondHash = await hashPassword("ChangeMe123!");

  assert.notEqual(firstHash.password_hash, secondHash.password_hash);
});

test("verifyPassword accepts the correct password and rejects the wrong password", async () => {
  const result = await hashPassword("ChangeMe123!");

  assert.equal(await verifyPassword("ChangeMe123!", result.password_hash), true);
  assert.equal(await verifyPassword("WrongPassword123!", result.password_hash), false);
  assert.equal(await verifyPassword("ChangeMe123!", "invalid-hash"), false);
});

test("validateLocalPassword rejects short, empty and email-equivalent passwords", () => {
  assert.throws(
    () => validateLocalPassword("", "admin@example.com"),
    AuthCredentialError,
  );
  assert.throws(
    () => validateLocalPassword("short", "admin@example.com"),
    /at least 8 characters/,
  );
  assert.throws(
    () => validateLocalPassword("ADMIN@example.com", "admin@example.com"),
    /must not be equal to the email/,
  );
});

test("LocalAuthCredentialService normalizes email before persistence", async () => {
  const repository = new InMemoryCredentialRepository();
  const service = new LocalAuthCredentialService(repository, {
    async findByIdForTenant(userId, tenantId) {
      return {
        id: userId,
        tenant_id: tenantId,
        email: "Admin.Demo@Example.com",
      };
    },
  });

  const credential = await service.upsertCredentialForUser({
    tenant_id: "tenant-1",
    user_id: "user-1",
    email: "  Admin.Demo@Example.com ",
    password: "ChangeMe123!",
  });

  assert.equal(credential.email, "admin.demo@example.com");
  assert.equal(repository.lastUpsert?.email, "admin.demo@example.com");
  assert.equal(repository.lastUpsert?.password_hash.includes("ChangeMe123!"), false);
});

test("LocalAuthCredentialService rejects credentials for mismatched user email", async () => {
  const service = new LocalAuthCredentialService(new InMemoryCredentialRepository(), {
    async findByIdForTenant(userId, tenantId) {
      return {
        id: userId,
        tenant_id: tenantId,
        email: "admin@example.com",
      };
    },
  });

  await assert.rejects(
    () =>
      service.upsertCredentialForUser({
        tenant_id: "tenant-1",
        user_id: "user-1",
        email: "other@example.com",
        password: "ChangeMe123!",
      }),
    /must match the tenant user email/,
  );
});

test("normalizeCredentialEmail trims and lowercases email", () => {
  assert.equal(normalizeCredentialEmail("  Admin.Demo@Example.COM "), "admin.demo@example.com");
});

// B-O6R-01 (§6.4.1) — o lockout DIRECIONADO é real: a 5ª falha grava locked_until e a tentativa
// seguinte — mesmo com a senha CERTA — devolve "locked" até a janela expirar.
test("verifyCredential arma o lockout na 5ª falha e recusa até a senha certa durante a janela", async () => {
  const repository = new InMemoryCredentialRepository();
  const service = new LocalAuthCredentialService(repository, {
    async findByIdForTenant(userId, tenantId) {
      return { id: userId, tenant_id: tenantId, email: "lock@example.com" };
    },
  });

  await service.createCredentialForUser({
    tenant_id: "tenant-lock",
    user_id: "user-lock",
    email: "lock@example.com",
    password: "SenhaCerta123!",
  });

  for (let attempt = 1; attempt <= LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS; attempt += 1) {
    const result = await service.verifyCredential({
      tenant_id: "tenant-lock",
      email: "lock@example.com",
      password: "SenhaErrada123!",
    });

    assert.equal(result.ok, false);
  }

  const lockedWithRightPassword = await service.verifyCredential({
    tenant_id: "tenant-lock",
    email: "lock@example.com",
    password: "SenhaCerta123!",
  });

  assert.equal(lockedWithRightPassword.ok, false);
  assert.equal(
    lockedWithRightPassword.ok === false ? lockedWithRightPassword.reason : null,
    "locked",
    "a 5ª falha ARMOU o lockout — a senha certa não entra durante a janela",
  );
});

type CredentialRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly password_algorithm: string;
  readonly password_updated_at: Date;
  readonly failed_attempts: number;
  readonly locked_until: Date | null;
  readonly last_login_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

type CredentialData = {
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly password_algorithm: string;
};

class InMemoryCredentialRepository {
  lastUpsert: CredentialData | undefined;
  private credential: CredentialRecord | undefined;

  async create(data: CredentialData): Promise<CredentialRecord> {
    this.credential = createRecord(data);

    return this.credential;
  }

  async upsertForUser(data: CredentialData): Promise<CredentialRecord> {
    this.lastUpsert = data;
    this.credential = createRecord(data);

    return this.credential;
  }

  async findByEmailForTenant(
    email: string,
    tenantId: string,
  ): Promise<CredentialRecord | null> {
    return this.credential?.tenant_id === tenantId && this.credential.email === email
      ? this.credential
      : null;
  }

  async findByUserForTenant(
    userId: string,
    tenantId: string,
  ): Promise<CredentialRecord | null> {
    return this.credential?.tenant_id === tenantId && this.credential.user_id === userId
      ? this.credential
      : null;
  }

  async updatePassword(
    userId: string,
    tenantId: string,
    data: Pick<CredentialData, "password_hash" | "password_algorithm">,
  ): Promise<CredentialRecord> {
    if (!this.credential || this.credential.user_id !== userId || this.credential.tenant_id !== tenantId) {
      throw new Error("Credential not found.");
    }

    this.credential = {
      ...this.credential,
      ...data,
      password_updated_at: new Date(),
    };

    return this.credential;
  }

  // B-O6R-01 (§6.4.1) — o dublê ESPELHA o repositório real: o incremento ARMA o lockout na 5ª
  // falha (LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS). Antes o no-op aqui deixava a suíte verde com o
  // lockout decorativo; agora estas asserções exercitam o lockout armado de verdade.
  async incrementFailedAttempts(id: string, tenantId: string): Promise<void> {
    if (!this.credential || this.credential.id !== id || this.credential.tenant_id !== tenantId) {
      return;
    }

    const failedAttempts = this.credential.failed_attempts + 1;

    this.credential = {
      ...this.credential,
      failed_attempts: failedAttempts,
      locked_until:
        failedAttempts >= LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000)
          : this.credential.locked_until,
    };
  }

  async resetFailedAttempts(id: string, tenantId: string): Promise<void> {
    if (!this.credential || this.credential.id !== id || this.credential.tenant_id !== tenantId) {
      return;
    }

    this.credential = { ...this.credential, failed_attempts: 0, locked_until: null };
  }

  async markSuccessfulLogin(id: string, tenantId: string): Promise<void> {
    if (!this.credential || this.credential.id !== id || this.credential.tenant_id !== tenantId) {
      return;
    }

    this.credential = {
      ...this.credential,
      failed_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
    };
  }
}

function createRecord(data: CredentialData): CredentialRecord {
  const now = new Date();

  return {
    id: "credential-1",
    tenant_id: data.tenant_id,
    user_id: data.user_id,
    email: data.email,
    password_hash: data.password_hash,
    password_algorithm: data.password_algorithm,
    password_updated_at: now,
    failed_attempts: 0,
    locked_until: null,
    last_login_at: null,
    created_at: now,
    updated_at: now,
  };
}
