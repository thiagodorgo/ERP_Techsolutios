import { createHash, createHmac, hkdfSync, randomUUID, timingSafeEqual } from "node:crypto";

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
import { resolveAccessTokenScope } from "./access-token-scope.js";

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

// B-APP-SESSAO-RENOVA (S4, S5) — o antecessor imediato do token vigente, reapresentado dentro da janela e com o
// sucessor ainda sem uso, recebe o MESMO sucessor (a resposta que se perdeu, a corrida de renovações em voo).
export const REFRESH_REPLAY_WINDOW_SECONDS = 60; // o reenvio com prova de posse: a resposta que se perdeu
export const REFRESH_RACE_WINDOW_SECONDS = 10; // o reenvio sem prova: só a corrida de renovações em voo

type AuthSessionServiceOptions = { readonly replayWindowSeconds?: number; readonly raceWindowSeconds?: number };

// O vínculo do 1º envio (`renewalCommit`, o SHA-256 de um segredo do aparelho) e a prova dos reenvios
// (`renewalProof`, o próprio segredo). Nenhum dos dois é guardado: o sucessor é refeito a partir deles.
export type RenewalBinding = { readonly commit?: string; readonly proof?: string };

export class AuthSessionService {
  constructor(
    private readonly runWithTenantContext: PrismaTenantContextRunner,
    private readonly createAuditLogRepository?: AuditLogRepositoryFactory,
    private readonly options: AuthSessionServiceOptions = {}, // as janelas, para os testes
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

  async refreshSession(refreshToken: string, binding: RenewalBinding = {}): Promise<RefreshSessionResult> {
    const payload = await parseRefreshToken(refreshToken);

    if (!payload) {
      return { ok: false, reason: "invalid" };
    }

    return this.runWithTenantContext(payload.tenant_id, async (tx) => {
      const repository = new AuthSessionRepository(tx);
      const session = await repository.findByIdForTenant(payload.session_id, payload.tenant_id);
      const refreshTokenHash = hashRefreshToken(refreshToken);

      // S6 — os candidatos de reenvio, cada um com a sua janela. O domínio (`commit:`/`proof:`) diz QUAL envio fez a
      // troca; o vazio é o cliente sem vínculo (web, app antigo), só na janela curta.
      const openedCommit = binding.proof ? proofCommit(binding.proof) : ""; // só a prova abre o reenvio longo
      const longWindow = this.options.replayWindowSeconds ?? REFRESH_REPLAY_WINDOW_SECONDS;
      const shortWindow = this.options.raceWindowSeconds ?? REFRESH_RACE_WINDOW_SECONDS;
      const candidates: ReplayCandidate[] = [];
      if (openedCommit) candidates.push({ binding: `commit:${openedCommit}`, windowSeconds: longWindow }); // S33B
      if (openedCommit) candidates.push({ binding: `proof:${openedCommit}`, windowSeconds: longWindow }); // S33C
      if (!openedCommit && binding.commit) candidates.push({ binding: `proof:${binding.commit}`, windowSeconds: longWindow }); // S33D
      if (!openedCommit) candidates.push({ binding: "", windowSeconds: shortWindow }); // S33E
      let replay = await successorReplay(session, payload, refreshToken, refreshTokenHash, candidates); // o antecessor imediato, dentro da janela do candidato

      if (!session || (!replay && (session.user_id !== payload.user_id || !safeEqual(session.refresh_token_hash, refreshTokenHash)))) {
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
      // B-USERS-ACESSO-SEG (P-SESSAO-RESTRITA) — o refresh é assinador: relê a marca do PAR na mesma
      // transação, sob o GUC do par. Par sem linha de credencial conta como NÃO marcado (RQ-3).
      const credential = await tx.localAuthCredential.findFirst({
        where: {
          tenant_id: payload.tenant_id,
          user_id: payload.user_id,
        },
        select: {
          must_change_password: true,
        },
      });
      const linhas = credential ? [credential] : [];
      const tokenScope = resolveAccessTokenScope(
        linhas.some((linha) => linha.must_change_password === true),
        roleKeys,
      );
      const accessTokenExpiresIn = getAccessTokenExpiresInSeconds();
      // B-O6R-01 (§3.5) — o refresh é o segundo assinador: relê o vínculo do PAR (tenant GUC já
      // posto pela transação) e inclui o claim identity_id como DICA. Falha na leitura (ex.:
      // arnês de teste sem $queryRaw) = claim omitido — o token sem claim resolve por par.
      let identityId: string | null = null;

      try {
        const { resolveIdentityIdForPair } = await import("./identity-resolver.js");

        identityId = await resolveIdentityIdForPair(tx, payload.tenant_id, payload.user_id);
      } catch {
        identityId = null;
      }

      // B-USERS-SEG-DESATIVADO (P-SESSAO-VIVA) — o refresh é o terceiro assinador: o token novo carrega a MESMA
      // sessão que acabou de ser renovada.
      const refreshedSessionId = payload.session_id;
      const accessToken = await signAccessToken({
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        roles: tokenScope.roles,
        ...(tokenScope.scope ? { scope: tokenScope.scope } : {}),
        ...(identityId ? { identity_id: identityId } : {}),
        session_id: refreshedSessionId,
      });
      const refreshTokenExpiresIn = getRefreshTokenExpiresInSeconds();
      let refreshTokenExpiresAt: Date;
      let nextRefreshToken: string;
      let updated = { count: 1 };
      if (replay) {
        nextRefreshToken = replay.token; // o MESMO sucessor; nada troca
        refreshTokenExpiresAt = replay.expiresAt;
      } else {
        const rotatedAtMs = Date.now();
        refreshTokenExpiresAt = new Date(rotatedAtMs + refreshTokenExpiresIn * 1000); // o instante da troca, em ms, fica recuperável
        const rotationBinding = binding.commit ? `commit:${binding.commit}` : openedCommit ? `proof:${openedCommit}` : ""; // S33A: qual envio trocou primeiro
        nextRefreshToken = await deriveSuccessor(payload, refreshToken, rotationBinding, Math.floor(rotatedAtMs / 1000)); // o sucessor é refeito, nunca guardado
        updated = await repository.rotateRefreshToken(payload.session_id, payload.tenant_id, refreshTokenHash, hashRefreshToken(nextRefreshToken), refreshTokenExpiresAt); // troca condicional
        if (updated.count !== 1) {
          const current = await repository.findByIdForTenant(payload.session_id, payload.tenant_id);
          replay = await successorReplay(current, payload, refreshToken, refreshTokenHash, candidates); // outra renovação trocou primeiro: o mesmo sucessor
          if (replay) {
            nextRefreshToken = replay.token;
            refreshTokenExpiresAt = replay.expiresAt;
            updated = { count: 1 };
          }
        }
      }

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
          ...(replay ? { reason: "retry_within_window" } : {}),
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

    // B-APP-SESSAO-RENOVA (S2) — o token assinado prova a sessão (`session_id` e usuário do payload): o "Sair" revoga
    // a SESSÃO inteira, mesmo que o token já tenha sido trocado, conferindo que ela é do mesmo usuário.
    await this.runWithTenantContext(payload.tenant_id, async (tx) => {
      const repository = new AuthSessionRepository(tx);
      const owned = await repository.findByIdForTenant(payload.session_id, payload.tenant_id);
      const revoked =
        owned && owned.user_id === payload.user_id
          ? await repository.revokeByIdForTenant(payload.session_id, payload.tenant_id) // a sessão inteira, mesmo com o token já trocado
          : { count: 0 };
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

// O sucessor de um token é DETERMINÍSTICO (S4) e PRESO AO VÍNCULO (S5, S6): jti = HMAC(chave do sucessor, token
// apresentado + domínio e vínculo); iat = o instante da troca, que se recupera de expires_at. Nada novo é guardado.
const successorKey = hkdfSync("sha256", env.JWT_REFRESH_SECRET, "", "erp-refresh-sucessor-v1", 32); // chave só para o sucessor

export function proofCommit(proof: string): string {
  return createHash("sha256").update(Buffer.from(proof, "base64url")).digest("base64url"); // o compromisso que a prova abre
}

function deriveSuccessor(
  payload: { session_id: string; tenant_id: string; user_id: string },
  presentedToken: string,
  binding: string,
  issuedAt: number,
): Promise<string> {
  const jti = createHmac("sha256", Buffer.from(successorKey)).update(presentedToken + "\n" + binding).digest("hex"); // o jti do sucessor, preso à prova
  return signRefreshToken({ session_id: payload.session_id, tenant_id: payload.tenant_id, user_id: payload.user_id }, { jti, issuedAt });
}

type SessionRow = { user_id: string; revoked_at: Date | null; refresh_token_hash: string; expires_at: Date } | null;
type ReplayCandidate = { readonly binding: string; readonly windowSeconds: number };

async function successorReplay(
  row: SessionRow,
  payload: { session_id: string; tenant_id: string; user_id: string },
  presentedToken: string,
  presentedHash: string,
  candidates: readonly ReplayCandidate[],
): Promise<{ token: string; expiresAt: Date } | null> {
  if (!row || row.user_id !== payload.user_id || row.revoked_at || safeEqual(row.refresh_token_hash, presentedHash)) return null; // só o antecessor, numa sessão viva do mesmo usuário
  const rotatedAtMs = row.expires_at.getTime() - getRefreshTokenExpiresInSeconds() * 1000; // o instante da última troca, em ms
  for (const item of candidates) {
    if (Date.now() - rotatedAtMs > item.windowSeconds * 1000) continue; // S33F: borda exata por candidato
    const candidate = await deriveSuccessor(payload, presentedToken, item.binding, Math.floor(rotatedAtMs / 1000));
    if (safeEqual(row.refresh_token_hash, hashRefreshToken(candidate))) return { token: candidate, expiresAt: row.expires_at }; // o sucessor ainda não foi usado
  }
  return null; // nenhum candidato: reuso
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
