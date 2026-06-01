import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type CreateLocalAuthCredentialData = {
  readonly tenant_id: string;
  readonly user_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly password_algorithm: string;
};

export type UpdateLocalAuthPasswordData = {
  readonly password_hash: string;
  readonly password_algorithm: string;
};

export class LocalAuthCredentialRepository {
  constructor(private readonly client: PrismaExecutor) {}

  create(data: CreateLocalAuthCredentialData) {
    return this.client.localAuthCredential.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        email: normalizeCredentialEmail(data.email),
        password_hash: data.password_hash,
        password_algorithm: data.password_algorithm,
      },
    });
  }

  upsertForUser(data: CreateLocalAuthCredentialData) {
    return this.client.localAuthCredential.upsert({
      where: {
        tenant_id_user_id: {
          tenant_id: data.tenant_id,
          user_id: data.user_id,
        },
      },
      create: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        email: normalizeCredentialEmail(data.email),
        password_hash: data.password_hash,
        password_algorithm: data.password_algorithm,
      },
      update: {
        email: normalizeCredentialEmail(data.email),
        password_hash: data.password_hash,
        password_algorithm: data.password_algorithm,
        password_updated_at: new Date(),
        failed_attempts: 0,
        locked_until: null,
      },
    });
  }

  findByEmailForTenant(email: string, tenantId: string) {
    // Internal auth lookup: intentionally returns password_hash for verification.
    return this.client.localAuthCredential.findUnique({
      where: {
        tenant_id_email: {
          tenant_id: tenantId,
          email: normalizeCredentialEmail(email),
        },
      },
    });
  }

  findByUserForTenant(userId: string, tenantId: string) {
    // Internal auth lookup: intentionally returns password_hash for verification.
    return this.client.localAuthCredential.findUnique({
      where: {
        tenant_id_user_id: {
          tenant_id: tenantId,
          user_id: userId,
        },
      },
    });
  }

  updatePassword(userId: string, tenantId: string, data: UpdateLocalAuthPasswordData) {
    return this.client.localAuthCredential.update({
      where: {
        tenant_id_user_id: {
          tenant_id: tenantId,
          user_id: userId,
        },
      },
      data: {
        password_hash: data.password_hash,
        password_algorithm: data.password_algorithm,
        password_updated_at: new Date(),
        failed_attempts: 0,
        locked_until: null,
      },
    });
  }

  incrementFailedAttempts(id: string, tenantId: string) {
    return this.client.localAuthCredential.updateMany({
      where: {
        id,
        tenant_id: tenantId,
      },
      data: {
        failed_attempts: {
          increment: 1,
        },
      },
    });
  }

  resetFailedAttempts(id: string, tenantId: string) {
    return this.client.localAuthCredential.updateMany({
      where: {
        id,
        tenant_id: tenantId,
      },
      data: {
        failed_attempts: 0,
        locked_until: null,
      },
    });
  }

  markSuccessfulLogin(id: string, tenantId: string) {
    return this.client.localAuthCredential.updateMany({
      where: {
        id,
        tenant_id: tenantId,
      },
      data: {
        failed_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
      },
    });
  }
}

export function normalizeCredentialEmail(email: string): string {
  return email.trim().toLowerCase();
}
