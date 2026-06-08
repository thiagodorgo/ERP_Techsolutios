import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { env } from "../../../config/env.js";
import { EnterpriseAuditLogService, type AuditLogWriter } from "../../core-saas/audit/audit-log.service.js";
import { AuthSessionRepository } from "../repositories/auth-session.repository.js";
import {
  getAccessTokenExpiresInSeconds,
  getRefreshTokenExpiresInSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./jwt.service.js";

type PrismaTenantContextRunner = <T>(
  tenantId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) => Promise<T>;

type AuditLogRepositoryFactory = (tx: Prisma.TransactionClient) => AuditLogWriter;

type CreateSessionInput = {
  readonly tenant_id: string;
  readonly user_id: string;
  readonly user_agent?: string;
  readonly ip_address?: string;
};

type AuthSessionTokenResult = {
  readonly sessionId: string;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date;
  readonly refreshTokenExpiresIn: number;
};

type RefreshSessionResult =
  | {
      readonly ok: true;
      readonly accessToken: string;
      readonly accessTokenExpiresIn: number;
      readonly refreshToken: string;
      readonly refreshTokenExpiresAt: Date;
      readonly refreshTokenExpiresIn: number;
      readonly sessionId: string;
    }
  | {
      readonly ok: false;
      readonly reason: "invalid" | "expired" | "revoked";
    };

type RoleAssignmentRecord = {
  readonly role: {
    readonly key: string;
  };
};

export class AuthSessionService {
  constructor(
    private readonly runWithTenantContext: PrismaTenantContextRunner,
    private readonly createAuditLogRepository?: AuditLogRepositoryFactory,
  ) {}

  async createSession(input: CreateSessionInput): Promise<AuthSessionTokenResult> {
    const sessionId = randomUUID();
    const refreshTokenExpiresIn = getRefreshTokenExpiresInSeconds();
    const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000);
    const refreshToken = await signRefreshToken({
      session_id: sessionId,
      tenant_id: input.tenant_id,
      user_id: input.user_id,
    });
    const refreshTokenHash = hashRefreshToken(refreshToken);

    await this.runWithTenantContext(input.tenant_id, async (tx) => {
      await new AuthSessionRepository(tx).create({
        id: sessionId,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        refresh_token_hash: refreshTokenHash,
        user_agent: trimOptional(input.user_agent, 512),
        ip_address: trimOptional(input.ip_address, 128),
        expires_at: refreshTokenExpiresAt,
      });
      await this.recordAudit(tx, {
        tenantId: input.tenant_id,
        actorId: input.user_id,
        action: "auth.session.created",
        resourceType: "auth_session",
        resourceId: sessionId,
        outcome: "success",
        severity: "info",
        ipAddress: input.ip_address,
        userAgent: input.user_agent,
        metadata: {
          expiresAt: refreshTokenExpiresAt,
        },
      });
    });

    return {
      sessionId,
      refreshToken,
      refreshTokenExpiresAt,
      refreshTokenExpiresIn,
    };
  }

  async refreshSession(refreshToken: string): Promise<RefreshSessionResult> {
    const payload = await parseRefreshToken(refreshToken);

    if (!payload) {
      return { ok: false, reason: "invalid" };
    }

    return this.runWithTenantContext(payload.tenant_id, async (tx) => {
      const repository = new AuthSessionRepository(tx);
      const session = await repository.findByIdForTenant(payload.session_id, payload.tenant_id);
      const refreshTokenHash = hashRefreshToken(refreshToken);

      if (!session || session.user_id !== payload.user_id || !safeEqual(session.refresh_token_hash, refreshTokenHash)) {
        await this.recordAudit(tx, {
          tenantId: payload.tenant_id,
          actorId: payload.user_id,
          action: "auth.refresh.failed",
          resourceType: "auth_session",
          resourceId: payload.session_id,
          outcome: "failure",
          severity: "warning",
          metadata: {
            reason: "invalid",
          },
        });
        return { ok: false, reason: "invalid" };
      }

      if (session.revoked_at) {
        await this.recordAudit(tx, {
          tenantId: payload.tenant_id,
          actorId: payload.user_id,
          action: "auth.refresh.failed",
          resourceType: "auth_session",
          resourceId: payload.session_id,
          outcome: "failure",
          severity: "warning",
          metadata: {
            reason: "revoked",
          },
        });
        return { ok: false, reason: "revoked" };
      }

      if (session.expires_at <= new Date()) {
        await this.recordAudit(tx, {
          tenantId: payload.tenant_id,
          actorId: payload.user_id,
          action: "auth.refresh.failed",
          resourceType: "auth_session",
          resourceId: payload.session_id,
          outcome: "failure",
          severity: "warning",
          metadata: {
            reason: "expired",
          },
        });
        return { ok: false, reason: "expired" };
      }

      const user = await tx.user.findFirst({
        where: {
          id: payload.user_id,
          tenant_id: payload.tenant_id,
          status: "active",
        },
        select: {
          id: true,
          tenant_id: true,
          email: true,
        },
      });

      if (!user) {
        await this.recordAudit(tx, {
          tenantId: payload.tenant_id,
          actorId: payload.user_id,
          action: "auth.refresh.failed",
          resourceType: "auth_session",
          resourceId: payload.session_id,
          outcome: "failure",
          severity: "warning",
          metadata: {
            reason: "inactive_user",
          },
        });
        return { ok: false, reason: "invalid" };
      }

      const roles = await tx.userRoleAssignment.findMany({
        where: {
          tenant_id: payload.tenant_id,
          user_id: payload.user_id,
        },
        select: {
          role: {
            select: {
              key: true,
            },
          },
        },
      });
      const roleKeys = mapRoleKeys(roles);
      const accessTokenExpiresIn = getAccessTokenExpiresInSeconds();
      const accessToken = await signAccessToken({
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        roles: roleKeys,
      });
      const refreshTokenExpiresIn = getRefreshTokenExpiresInSeconds();
      const refreshTokenExpiresAt = new Date(Date.now() + refreshTokenExpiresIn * 1000);
      const nextRefreshToken = await signRefreshToken({
        session_id: payload.session_id,
        tenant_id: payload.tenant_id,
        user_id: payload.user_id,
      });

      const updated = await repository.rotateRefreshToken(
        payload.session_id,
        payload.tenant_id,
        hashRefreshToken(nextRefreshToken),
        refreshTokenExpiresAt,
      );

      if (updated.count !== 1) {
        await this.recordAudit(tx, {
          tenantId: payload.tenant_id,
          actorId: payload.user_id,
          action: "auth.refresh.failed",
          resourceType: "auth_session",
          resourceId: payload.session_id,
          outcome: "failure",
          severity: "warning",
          metadata: {
            reason: "rotation_conflict",
          },
        });
        return { ok: false, reason: "invalid" };
      }

      await this.recordAudit(tx, {
        tenantId: payload.tenant_id,
        actorId: payload.user_id,
        actorEmail: user.email,
        action: "auth.refresh.success",
        resourceType: "auth_session",
        resourceId: payload.session_id,
        outcome: "success",
        severity: "info",
        metadata: {
          roleCount: roleKeys.length,
          expiresAt: refreshTokenExpiresAt,
        },
      });

      return {
        ok: true,
        accessToken,
        accessTokenExpiresIn,
        refreshToken: nextRefreshToken,
        refreshTokenExpiresAt,
        refreshTokenExpiresIn,
        sessionId: payload.session_id,
      };
    });
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await parseRefreshToken(refreshToken);

    if (!payload) {
      return;
    }

    await this.runWithTenantContext(payload.tenant_id, async (tx) => {
      const revoked = await new AuthSessionRepository(tx).revokeById(
        payload.session_id,
        payload.tenant_id,
        hashRefreshToken(refreshToken),
      );
      const outcome = revoked.count === 1 ? "success" : "failure";

      await this.recordAudit(tx, {
        tenantId: payload.tenant_id,
        actorId: payload.user_id,
        action: "auth.logout",
        resourceType: "auth_session",
        resourceId: payload.session_id,
        outcome,
        severity: outcome === "success" ? "info" : "warning",
        metadata: {
          revoked: revoked.count === 1,
        },
      });

      if (revoked.count === 1) {
        await this.recordAudit(tx, {
          tenantId: payload.tenant_id,
          actorId: payload.user_id,
          action: "auth.session.revoked",
          resourceType: "auth_session",
          resourceId: payload.session_id,
          outcome: "success",
          severity: "info",
        });
      }
    });
  }

  private async recordAudit(
    tx: Prisma.TransactionClient,
    input: Parameters<EnterpriseAuditLogService["record"]>[0],
  ): Promise<void> {
    if (!this.createAuditLogRepository) {
      return;
    }

    await new EnterpriseAuditLogService(this.createAuditLogRepository(tx)).record(input);
  }
}

export function hashRefreshToken(refreshToken: string): string {
  return createHmac("sha256", env.JWT_REFRESH_SECRET).update(refreshToken).digest("hex");
}

async function parseRefreshToken(refreshToken: string) {
  try {
    return await verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function trimOptional(value: string | undefined, maxLength: number): string | undefined {
  const normalized = value?.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

function mapRoleKeys(assignments: readonly RoleAssignmentRecord[]): string[] {
  return [...new Set(assignments.map((assignment) => assignment.role.key))];
}
