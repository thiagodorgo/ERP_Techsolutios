import type { Prisma } from "@prisma/client";

import { EnterpriseAuditLogService, type AuditLogWriter } from "../../core-saas/audit/audit-log.service.js";
import { AuthSessionRepository } from "../repositories/auth-session.repository.js";

// -----------------------------------------------------------------------------
// Ω4C PR-11 — Serviço ADMINISTRATIVO de sessões (Controle > Usuários > Sessões).
// ESTENDE a infra real de auth_sessions (D-Ω4C-SESS-NOMIG: ZERO migração). Entrega:
//  - listActiveSessions  → sessões vivas do tenant (projeção §2.8, nunca refresh_token_hash/ip cru).
//  - revokeSession       → revogação REAL por id sem o token da vítima (D-Ω4C-SESS-REVOKE-REAL);
//                          refreshSession() já barra revoked_at => o próximo refresh FALHA de verdade.
//  - accessHistory       → último login por usuário derivado de auth_sessions.created_at (D-Ω4C-ACESSO-SOURCE).
// Wiring espelha AuthSessionService: runner withTenantRls injetado + factory de AuditLogRepository.
// -----------------------------------------------------------------------------

type PrismaTenantContextRunner = <T>(
  tenantId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
) => Promise<T>;

type AuditLogRepositoryFactory = (tx: Prisma.TransactionClient) => AuditLogWriter;

export type SessionAdminActor = {
  readonly tenantId: string;
  readonly userId: string;
};

// SessionView (§2.8 / D-Ω4C-AUD-ALLOWLIST-2.8): SÓ o que a tela mostra. PROIBIDO refresh_token_hash,
// ip_address cru, tenant_id, user_id externo. O IP é OMITIDO (não mascarado); o user_agent vira um
// rótulo grosseiro ("Chrome · Windows"), nunca a string crua.
export type SessionView = {
  readonly id: string;
  readonly userLabel: string;
  readonly loginAt: Date;
  readonly lastActivityAt: Date;
  readonly deviceLabel: string;
  readonly status: "active" | "revoked" | "expired";
};

// AccessView (§2.8): último acesso por usuário. Sem ip cru, sem tenant_id.
export type AccessView = {
  readonly userLabel: string;
  readonly lastAccessAt: Date;
};

export type SessionAdminError = {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
};

type ActiveSessionRow = {
  readonly id: string;
  readonly user_id: string;
  readonly user_agent: string | null;
  readonly ip_address: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly revoked_at: Date | null;
  readonly expires_at: Date;
};

export class SessionAdminService {
  constructor(
    private readonly runWithTenantContext: PrismaTenantContextRunner,
    private readonly createAuditLogRepository?: AuditLogRepositoryFactory,
  ) {}

  async listActiveSessions(
    actor: SessionAdminActor,
    filters: { readonly userId?: string } = {},
  ): Promise<SessionView[]> {
    return this.runWithTenantContext(actor.tenantId, async (tx) => {
      const rows = (await new AuthSessionRepository(tx).listActiveByTenant(
        actor.tenantId,
        filters,
      )) as ActiveSessionRow[];

      const labels = await this.resolveUserLabels(
        tx,
        actor.tenantId,
        rows.map((row) => row.user_id),
      );

      return rows.map((row) => toSessionView(row, labels.get(row.user_id)));
    });
  }

  async revokeSession(actor: SessionAdminActor, sessionId: string): Promise<{ readonly revoked: true }> {
    return this.runWithTenantContext(actor.tenantId, async (tx) => {
      const repository = new AuthSessionRepository(tx);
      // tenant_id no where => sessão de OUTRO tenant nunca casa (RLS + escopo) => 404 honesto,
      // sem vazar a existência cross-tenant.
      const existing = await repository.findByIdForTenant(sessionId, actor.tenantId);

      if (!existing) {
        throw sessionNotFound();
      }

      // Idempotente: se já revogada, updateMany count=0, mas o estado terminal é o mesmo => 200 revoked:true
      // (D-Ω4C: revogar 2× não é conflito). A revogação NOVA (count=1) grava a trilha auth.session.revoked.
      const result = await repository.revokeByIdForTenant(sessionId, actor.tenantId);

      if (result.count === 1) {
        await this.recordAudit(tx, {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          action: "auth.session.revoked",
          resourceType: "auth_session",
          resourceId: sessionId,
          outcome: "success",
          severity: "info",
          metadata: {
            // §2.8: só ids internos do MESMO tenant (não PII, não token, não ip). O alvo é a sessão/usuário.
            targetUserId: existing.user_id,
            administrative: true,
          },
        });
      }

      return { revoked: true };
    });
  }

  async accessHistory(
    actor: SessionAdminActor,
    filters: { readonly userId?: string; readonly from?: Date; readonly to?: Date } = {},
  ): Promise<AccessView[]> {
    return this.runWithTenantContext(actor.tenantId, async (tx) => {
      const grouped = (await new AuthSessionRepository(tx).lastAccessByTenant(
        actor.tenantId,
        filters,
      )) as Array<{ readonly user_id: string; readonly _max: { readonly created_at: Date | null } }>;

      const labels = await this.resolveUserLabels(
        tx,
        actor.tenantId,
        grouped.map((row) => row.user_id),
      );

      return grouped
        .map((row) => ({
          userLabel: labels.get(row.user_id) ?? "Usuário",
          lastAccessAt: row._max.created_at,
        }))
        .filter((row): row is AccessView => row.lastAccessAt instanceof Date)
        .sort((left, right) => right.lastAccessAt.getTime() - left.lastAccessAt.getTime());
    });
  }

  private async resolveUserLabels(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userIds: readonly string[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];

    if (unique.length === 0) {
      return new Map();
    }

    const users = await tx.user.findMany({
      where: {
        tenant_id: tenantId,
        id: {
          in: unique,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const labels = new Map<string, string>();

    for (const user of users) {
      labels.set(user.id, user.email || user.name || "Usuário");
    }

    return labels;
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

// Rótulo grosseiro do device a partir do user agent — NUNCA a UA crua (§2.8). Puro e testável.
export function deviceLabelFromUserAgent(userAgent: string | null | undefined): string {
  const ua = userAgent?.trim();

  if (!ua) {
    return "Dispositivo desconhecido";
  }

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";

  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod|iOS/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";

  return os ? `${browser} · ${os}` : browser;
}

// Projeção §2.8: constrói a SessionView SÓ com a allowlist. refresh_token_hash / ip_address / tenant_id /
// user_id NUNCA entram no objeto retornado. Pura => testável em memória sem banco.
export function toSessionView(row: ActiveSessionRow, userLabel: string | undefined): SessionView {
  return {
    id: row.id,
    userLabel: userLabel ?? "Usuário",
    loginAt: row.created_at,
    lastActivityAt: row.updated_at,
    deviceLabel: deviceLabelFromUserAgent(row.user_agent),
    status: statusFor(row),
  };
}

function statusFor(row: Pick<ActiveSessionRow, "revoked_at" | "expires_at">): SessionView["status"] {
  if (row.revoked_at) {
    return "revoked";
  }

  if (row.expires_at.getTime() <= Date.now()) {
    return "expired";
  }

  return "active";
}

function sessionNotFound(): SessionAdminError {
  return {
    statusCode: 404,
    code: "NOT_FOUND",
    reason: "session_not_found",
    message: "Session not found.",
  };
}

// -----------------------------------------------------------------------------
// Runtime (lazy): só importa o Prisma quando uma rota REALMENTE precisa do serviço. Assim as rotas
// montam em memória (os testes de RBAC 403 curto-circuitam no requirePermission antes do handler) sem
// exigir DATABASE_URL. Espelha createAuthSessionService (auth-runtime.ts).
// -----------------------------------------------------------------------------
let sessionAdminServicePromise: Promise<SessionAdminService> | undefined;

export function getSessionAdminService(): Promise<SessionAdminService> {
  sessionAdminServicePromise ??= createSessionAdminService();

  return sessionAdminServicePromise;
}

async function createSessionAdminService(): Promise<SessionAdminService> {
  const [{ prisma }, { withTenantRls }, { AuditLogRepository }] = await Promise.all([
    import("../../../database/prisma.js"),
    import("../../../database/rls.js"),
    import("../../core-saas/repositories/index.js"),
  ]);

  return new SessionAdminService(
    (tenantId, work) => withTenantRls(prisma, tenantId, work),
    (tx) => new AuditLogRepository(tx),
  );
}
