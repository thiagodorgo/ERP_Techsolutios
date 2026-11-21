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
  // B-APP-ORG-2S (1.8.3 §2.3) — a redefinição grava a MESMA hora em todos os pares da família.
  readonly password_updated_at?: Date;
};

export type UpdateLocalAuthPasswordData = {
  readonly password_hash: string;
  readonly password_algorithm: string;
};

export type ShareableLocalAuthCredential = {
  readonly email: string;
  readonly password_hash: string;
  readonly password_algorithm: string;
  readonly password_updated_at: Date;
  readonly must_change_password: boolean;
  readonly failed_attempts: number;
  readonly locked_until: Date | null;
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

  // B-USERS-ACESSO-SEG (S1/S2) — a senha PROVISÓRIA (criação do usuário e reset por administrador): grava
  // o hash com a marca "trocar a senha no próximo acesso" ligada (coluna da P1) e zera o contador. Só o
  // hash chega aqui; a provisória em claro nunca passa pelo repositório. O `select` devolve só o id: nada
  // de hash na volta.
  upsertTemporaryPassword(data: CreateLocalAuthCredentialData) {
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
        must_change_password: true,
        ...(data.password_updated_at ? { password_updated_at: data.password_updated_at } : {}),
      },
      update: {
        password_hash: data.password_hash,
        password_algorithm: data.password_algorithm,
        password_updated_at: data.password_updated_at ?? new Date(),
        must_change_password: true,
        failed_attempts: 0,
        locked_until: null,
      },
      select: { id: true },
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

  // B-APP-ORG-2S (S2a) — a credencial do par de origem para a COPIA da concessao, travada com FOR SHARE
  // na transacao da concessao (a troca de senha em voo termina antes; a copia sai com o hash que ficou).
  // Pre-condicao: o GUC de tenant do patio de origem ja esta posto (RLS, sem bypass).
  async findForShareByEmailForTenant(
    rawEmail: string,
    tenantId: string,
  ): Promise<ShareableLocalAuthCredential | null> {
    const email = normalizeCredentialEmail(rawEmail);
    const rows = await this.client.$queryRaw<Array<ShareableLocalAuthCredential>>`
      SELECT email, password_hash, password_algorithm, password_updated_at,
             must_change_password, failed_attempts, locked_until
      FROM local_auth_credentials
      WHERE tenant_id = ${tenantId}::uuid AND email = ${email} FOR SHARE
    `;

    return rows[0] ?? null;
  }

  insertCopy(
    tenantId: string,
    userId: string,
    origin: ShareableLocalAuthCredential,
  ) {
    return this.client.localAuthCredential.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        email: origin.email,
        password_hash: origin.password_hash,
        password_algorithm: origin.password_algorithm,
        password_updated_at: origin.password_updated_at,
        must_change_password: origin.must_change_password,
        failed_attempts: origin.failed_attempts,
        locked_until: origin.locked_until,
      },
      select: { id: true },
    });
  }

  // B-USERS-ACESSO-SEG (S7) — a troca pelo PRÓPRIO usuário apaga a marca "trocar a senha no próximo
  // acesso" (coluna da P1): quem escolheu a senha agora é o dono da conta.
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
        must_change_password: false,
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
