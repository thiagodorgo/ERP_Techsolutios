import type { Prisma, PrismaClient } from "@prisma/client";

import {
  LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS,
  LOGIN_LOCKOUT_MINUTES,
} from "../anonymous-login.constants.js";

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

  // B-O6R-01 (§6.4.1 do plano) — o contador direcionado ARMA o lockout de verdade, num ÚNICO
  // UPDATE atômico (sem read-modify-write: duas falhas concorrentes não perdem incremento):
  // incrementa failed_attempts e, quando o total alcança LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS (5),
  // grava locked_until = now() + 15 min. Antes deste bloco o incremento existia mas
  // locked_until nunca era escrito — o lockout era decorativo.
  incrementFailedAttempts(id: string, tenantId: string) {
    return this.client.$executeRaw`
      UPDATE local_auth_credentials
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE
            WHEN failed_attempts + 1 >= ${LOGIN_LOCKOUT_MAX_FAILED_ATTEMPTS}
              THEN now() + make_interval(mins => ${LOGIN_LOCKOUT_MINUTES})
            ELSE locked_until
          END
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
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
