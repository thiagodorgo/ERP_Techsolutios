import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export type CreateAuthSessionData = {
  readonly id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly refresh_token_hash: string;
  readonly user_agent?: string;
  readonly ip_address?: string;
  readonly expires_at: Date;
};

export class AuthSessionRepository {
  constructor(private readonly client: PrismaExecutor) {}

  create(data: CreateAuthSessionData) {
    return this.client.authSession.create({
      data: {
        id: data.id,
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        refresh_token_hash: data.refresh_token_hash,
        user_agent: data.user_agent,
        ip_address: data.ip_address,
        expires_at: data.expires_at,
      },
    });
  }

  findByIdForTenant(sessionId: string, tenantId: string) {
    return this.client.authSession.findFirst({
      where: {
        id: sessionId,
        tenant_id: tenantId,
      },
    });
  }

  rotateRefreshToken(sessionId: string, tenantId: string, refreshTokenHash: string, expiresAt: Date) {
    return this.client.authSession.updateMany({
      where: {
        id: sessionId,
        tenant_id: tenantId,
        revoked_at: null,
      },
      data: {
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
      },
    });
  }

  revokeById(sessionId: string, tenantId: string, refreshTokenHash: string) {
    return this.client.authSession.updateMany({
      where: {
        id: sessionId,
        tenant_id: tenantId,
        refresh_token_hash: refreshTokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }
}
