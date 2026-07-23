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

  // Ω4C PR-11 (D-Ω4C-SESS-NOMIG) — sessões ATIVAS do tenant (revoked_at IS NULL AND expires_at > now),
  // opcionalmente filtradas por usuário. tenant_id é o 1º campo do where (isolamento multi-tenant); a
  // ordenação por created_at DESC dá a lista "mais recente primeiro" das sessões vivas. Sem tocar prisma/**.
  listActiveByTenant(tenantId: string, filters: { readonly userId?: string } = {}) {
    return this.client.authSession.findMany({
      where: {
        tenant_id: tenantId,
        revoked_at: null,
        expires_at: {
          gt: new Date(),
        },
        ...(filters.userId ? { user_id: filters.userId } : {}),
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  // Ω4C PR-11 (D-Ω4C-SESS-REVOKE-REAL) — revogação ADMINISTRATIVA por id, SEM exigir o refresh token da
  // vítima (diferente de revokeById, usado no logout do dono). Marca revoked_at=now onde id+tenant_id casam
  // e a sessão ainda está ativa. tenant_id no where => impossível revogar sessão de outro tenant (count=0).
  // O efeito é REAL: refreshSession() já barra revoked_at (auth-session.service.ts) => próximo refresh falha.
  revokeByIdForTenant(sessionId: string, tenantId: string) {
    return this.client.authSession.updateMany({
      where: {
        id: sessionId,
        tenant_id: tenantId,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }

  // Ω4C PR-11 (D-Ω4C-ACESSO-SOURCE) — "Acessos"/último login por usuário derivado de auth_sessions.created_at
  // (cada login cria uma sessão). Agrega MAX(created_at) por usuário, tenant-scoped. Sem tabela nova.
  lastAccessByTenant(
    tenantId: string,
    filters: { readonly userId?: string; readonly from?: Date; readonly to?: Date } = {},
  ) {
    const createdAt =
      filters.from || filters.to
        ? {
            created_at: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {};

    return this.client.authSession.groupBy({
      by: ["user_id"],
      where: {
        tenant_id: tenantId,
        ...(filters.userId ? { user_id: filters.userId } : {}),
        ...createdAt,
      },
      _max: {
        created_at: true,
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
