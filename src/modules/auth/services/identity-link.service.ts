import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient } from "@prisma/client";

import { EnterpriseAuditLogService, type AuditLogWriter } from "../../core-saas/audit/audit-log.service.js";
import { setIdentityRlsContext, setTenantRlsContext } from "../../../database/rls.js";
import { AuthSessionRepository } from "../repositories/auth-session.repository.js";
import { LocalAuthCredentialRepository } from "../repositories/local-auth-credential.repository.js";
import {
  IdentityLinkRepository,
  insertAuthIdentity,
} from "../repositories/identity-link.repository.js";
import { IdentityLinkEventRepository } from "../repositories/identity-link-event.repository.js";
import { normalizePairIdentity } from "./identity-resolver.js";
import { verifyPassword } from "./password.service.js";
import type { AuthenticatedActor, LocalAuthLoginInput, LocalAuthLoginResult } from "../types/auth.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 (§5 do plano) — religação, listagem e desvínculo de vínculos de identidade.
//
// O INVARIANTE (§5.2, verdadeiro por construção): a religação transfere a titularidade de
// EXATAMENTE UMA conta — a que foi provada. O alcance do ator cresce só naquela organização, que
// a credencial já concedia via login direto. Os demais vínculos da origem não se movem, não se
// apagam e não se tornam alcançáveis.
//
// I3 — revogar revoga a RENOVAÇÃO: toda remoção de vínculo revoga, NA MESMA transação, todas as
// sessões ativas do par (tenant_id, user_id) do vínculo removido. A janela declarada: o access
// token em voo sobrevive até JWT_EXPIRES_IN (15m) — a revogação corta a renovação e as rotas de
// identidade, não a requisição de negócio em voo (API_CONTRACTS.md do DELETE).
//
// SEQUÊNCIA DO GUC (dba 1 — bloqueante, §5.4/§5.6): auth_sessions e auth_identity_links estão
// sob RLS de tenant; sob role real, GUC errado = zero linhas afetadas SEM ERRO. Por isso:
//   religação — GUC de tenant vai para a organização PROVADA antes do SELECT…FOR UPDATE;
//   desvínculo — GUC de tenant vai para a organização DO VÍNCULO antes do updateMany de sessões.
// Nenhum passo da religação usa GUC de identidade (§3.7); o desvínculo usa o setter apenas para
// ler os próprios vínculos pelo braço de identidade.
// -----------------------------------------------------------------------------------------------

type AuditLogRepositoryFactory = (tx: Prisma.TransactionClient) => AuditLogWriter;

type AuthenticateFn = (input: LocalAuthLoginInput) => Promise<LocalAuthLoginResult>;

export type IdentityLinkView = {
  readonly id: string;
  readonly tenant: {
    readonly id: string;
    readonly name: string;
    readonly status: string;
  };
  readonly attachedVia: string;
  readonly createdAt: Date;
};

export type RelinkResult =
  | { readonly status: "linked" }
  | { readonly status: "already_linked" };

export type UnlinkResult =
  | { readonly status: "removed"; readonly revokedSessions: number }
  | { readonly status: "already_standalone" };

export type PasswordChangeHookResult = {
  readonly unlinked: boolean;
  readonly revokedSessions: number;
};

export type IdentityLinkError = {
  readonly statusCode: number;
  readonly code: string;
  readonly reason: string;
  readonly message: string;
};

type LinkRow = {
  readonly id: string;
  readonly identity_id: string;
  readonly tenant_id: string;
  readonly user_id: string;
  readonly attached_via: string;
};

export class IdentityLinkService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly authenticate: AuthenticateFn,
    private readonly createAuditLogRepository?: AuditLogRepositoryFactory,
    private readonly verifyPasswordFn: typeof verifyPassword = verifyPassword,
  ) {}

  // GET /auth/identity-links — vínculos da própria identidade (transação nomeada do §3.7).
  // Resposta: id do vínculo + dados da organização + data — NUNCA identity_id (varredura por
  // valor no §7 prova).
  async listLinks(actor: AuthenticatedActor): Promise<IdentityLinkView[]> {
    return this.prisma.$transaction(async (tx) => {
      let identityId = await setIdentityRlsContext(tx, actor);

      if (!identityId) {
        await normalizePairIdentity(tx, actor.tenantId, actor.userId);
        identityId = await setIdentityRlsContext(tx, actor);
      }

      if (!identityId) {
        return [];
      }

      const links = await new IdentityLinkRepository(tx).listByIdentity(identityId);
      const views: IdentityLinkView[] = [];

      for (const link of links) {
        // `tenants` não tem RLS; o nome/status da organização é legível sem trocar o GUC.
        const tenant = await tx.tenant.findFirst({
          where: { id: link.tenant_id },
          select: { id: true, name: true, status: true },
        });

        if (!tenant) {
          continue;
        }

        views.push({
          id: link.id,
          tenant,
          attachedVia: link.attached_via,
          createdAt: link.created_at,
        });
      }

      return views;
    });
  }

  // POST /auth/identity-links — religação (§5.1/§5.6): credencial da organização B provada →
  // move EXATAMENTE o vínculo da organização provada para a identidade do ator.
  async relink(
    actor: AuthenticatedActor,
    input: {
      readonly tenantId: string;
      readonly email: string;
      readonly password: string;
      readonly requestId?: string;
      readonly ipAddress?: string;
      readonly userAgent?: string;
    },
  ): Promise<RelinkResult> {
    // 1. Prova da credencial — o MESMO serviço do login; conta como tentativa DIRECIONADA
    // (senha errada incrementa e pode trancar — 423).
    const login = await this.authenticate({
      tenant_id: input.tenantId,
      email: input.email,
      password: input.password,
      request_id: input.requestId,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
    });

    if (!login.ok) {
      if (login.reason === "locked") {
        throw identityLinkError(423, "LOCKED", "account_locked", "Account is locked.");
      }

      throw identityLinkError(401, "UNAUTHORIZED", "invalid_credentials", "Invalid credentials.");
    }

    // 2. Pós-prova: organização suspensa = 403 (§5.8 — o login direto em org suspensa não muda
    // neste bloco; a RELIGAÇÃO recusa).
    const provedTenant = await this.prisma.tenant.findFirst({
      where: { id: input.tenantId },
      select: { id: true, status: true },
    });

    if (!provedTenant || provedTenant.status !== "active") {
      throw identityLinkError(403, "FORBIDDEN", "tenant_suspended", "Organization is not active.");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 3. Identidade do ATOR pelo par do token (braço de tenant da org ativa; C8).
        await setTenantRlsContext(tx, actor.tenantId);
        const actorIdentityId = await normalizePairIdentity(tx, actor.tenantId, actor.userId);

        if (!actorIdentityId) {
          throw identityLinkError(403, "FORBIDDEN", "identity_unresolved", "Actor identity could not be resolved.");
        }

        // 4. GUC de tenant = organização PROVADA antes da trava (dba 1): o USING da política
        // precisa passar para a org B enquanto o contexto da requisição é a A.
        await setTenantRlsContext(tx, input.tenantId);

        let provedLink = await this.selectLinkOfPairForUpdate(tx, input.tenantId, login.user.id);

        if (!provedLink) {
          // Par provado ainda sem vínculo (fora do backfill): normaliza o PAR PROVADO — a
          // credencial dele acabou de ser provada — e trava.
          await normalizePairIdentity(tx, input.tenantId, login.user.id);
          provedLink = await this.selectLinkOfPairForUpdate(tx, input.tenantId, login.user.id);
        }

        if (!provedLink) {
          throw identityLinkError(403, "FORBIDDEN", "identity_unresolved", "Proved identity could not be resolved.");
        }

        // 5. Idempotência: mesma identidade → 200 already_linked, nada muda.
        if (provedLink.identity_id === actorIdentityId) {
          return { status: "already_linked" } satisfies RelinkResult;
        }

        // 6. Re-check do conflito DEPOIS da trava: o ator já tem vínculo naquela organização →
        // 409, nada muda.
        const conflicting = await new IdentityLinkRepository(tx).findByIdentityAndTenant(
          actorIdentityId,
          input.tenantId,
        );

        if (conflicting) {
          throw identityLinkError(
            409,
            "CONFLICT",
            "identity_link_conflict",
            "Actor already has a link in this organization.",
          );
        }

        // 7. Move EXATAMENTE o vínculo provado. A identidade de ORIGEM permanece viva com os
        // demais vínculos e NÃO é apagada quando fica vazia (id opaco, sem PII, referente da
        // trilha — C3; higiene = pendência). Sessões vivas do par movido NÃO são revogadas no
        // move (declarado, §5.3).
        const moved = await new IdentityLinkRepository(tx).moveToIdentity(
          provedLink.id,
          actorIdentityId,
          "religacao",
        );

        if (moved.count !== 1) {
          throw identityLinkError(409, "CONFLICT", "identity_link_conflict", "Link changed concurrently.");
        }

        // 8. Evento 'religacao' na trilha (from = origem, to = ator, com actor) — sem RETURNING.
        await new IdentityLinkEventRepository(tx).append({
          link_id: provedLink.id,
          from_identity_id: provedLink.identity_id,
          to_identity_id: actorIdentityId,
          event: "religacao",
          tenant_id: input.tenantId,
          user_id: login.user.id,
          actor_tenant_id: actor.tenantId,
          actor_user_id: actor.userId,
        });

        // 9. Auditoria NA ORIGEM (organização provada; GUC já está nela) — §12.9 ADOTADO:
        // actor_scope="linked_identity", actorId nulo (o ator não é usuário local) e ZERO
        // identificadores estrangeiros na metadata.
        await this.recordAudit(tx, {
          tenantId: input.tenantId,
          actorId: null,
          actorType: "user",
          action: "auth.identity_link.moved",
          resourceType: "auth_identity_link",
          resourceId: provedLink.id,
          outcome: "success",
          severity: "info",
          metadata: {
            actor_scope: "linked_identity",
            targetUserId: login.user.id,
          },
        });

        // 10. Auditoria local do ATOR (troca o GUC na mesma transação — §5.6).
        await setTenantRlsContext(tx, actor.tenantId);
        await this.recordAudit(tx, {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorType: "user",
          action: "auth.identity_link.attached",
          resourceType: "auth_identity_link",
          resourceId: provedLink.id,
          outcome: "success",
          severity: "info",
          metadata: {
            actor_scope: "same_org",
          },
        });

        return { status: "linked" } satisfies RelinkResult;
      });
    } catch (error) {
      // Corrida 23505 no unique (identity_id, tenant_id) → 409 com mapeamento PRÓPRIO (§5.6):
      // duas religações concorrentes terminam {201, 409|200}, nunca 500.
      if (isUniqueViolation(error)) {
        throw identityLinkError(
          409,
          "CONFLICT",
          "identity_link_conflict",
          "Actor already has a link in this organization.",
        );
      }

      throw error;
    }
  }

  // DELETE /auth/identity-links/:id — desvínculo em autosserviço (§5.4).
  async unlink(
    actor: AuthenticatedActor,
    linkId: string,
    input: {
      readonly password: string;
      readonly reauthTenantId?: string;
    },
  ): Promise<UnlinkResult> {
    // 1. Leitura sob o braço de identidade: vínculo alheio/inexistente → 404.
    const preRead = await this.prisma.$transaction(async (tx) => {
      let identityId = await setIdentityRlsContext(tx, actor);

      if (!identityId) {
        await normalizePairIdentity(tx, actor.tenantId, actor.userId);
        identityId = await setIdentityRlsContext(tx, actor);
      }

      if (!identityId) {
        return null;
      }

      const rows = await tx.$queryRaw<LinkRow[]>`
        SELECT id, identity_id, tenant_id, user_id, attached_via
        FROM auth_identity_links
        WHERE id = ${linkId}::uuid AND identity_id = ${identityId}::uuid
      `;
      const link = rows[0];

      if (!link) {
        return null;
      }

      const links = await new IdentityLinkRepository(tx).listByIdentity(identityId);

      return { identityId, link, linkCount: links.length };
    });

    if (!preRead) {
      throw identityLinkError(404, "NOT_FOUND", "identity_link_not_found", "Identity link not found.");
    }

    // 2. Único vínculo → 200 already_standalone; sessões INTACTAS (o teste prova revoked_at nulo).
    if (preRead.linkCount === 1) {
      return { status: "already_standalone" };
    }

    // 3. Reautenticação por senha de QUALQUER organização da identidade que tenha credencial —
    // JAMAIS a da organização cujo vínculo está sendo removido (S7). Conta como tentativa
    // direcionada. FORA da transação de escrita: o incremento de falha precisa sobreviver ao
    // abort do fluxo.
    await this.reauthenticate(actor, preRead.identityId, preRead.link, input);

    // 4. Transação de escrita.
    return this.prisma.$transaction(async (tx) => {
      const identityId = await setIdentityRlsContext(tx, actor);

      if (!identityId || identityId !== preRead.identityId) {
        throw identityLinkError(404, "NOT_FOUND", "identity_link_not_found", "Identity link not found.");
      }

      const rows = await tx.$queryRaw<LinkRow[]>`
        SELECT id, identity_id, tenant_id, user_id, attached_via
        FROM auth_identity_links
        WHERE id = ${linkId}::uuid AND identity_id = ${identityId}::uuid
        FOR UPDATE
      `;
      const link = rows[0];

      if (!link) {
        throw identityLinkError(404, "NOT_FOUND", "identity_link_not_found", "Identity link not found.");
      }

      const links = await new IdentityLinkRepository(tx).listByIdentity(identityId);

      if (links.length === 1) {
        return { status: "already_standalone" } satisfies UnlinkResult;
      }

      const result = await this.detachLink(tx, link, {
        actorTenantId: actor.tenantId,
        actorUserId: actor.userId,
        actorScope: link.tenant_id === actor.tenantId ? "same_org" : "linked_identity",
      });

      return { status: "removed", revokedSessions: result.revokedSessions } satisfies UnlinkResult;
    });
  }

  // Gancho da troca de senha (§5.5) — ARMADO E INERTE: não existe rota de troca/reset neste
  // bloco (pendência P-O6R-B01-TROCA-SENHA); o teste dirige o serviço diretamente. Na MESMA
  // transação: (opcional) aplica a troca de senha via `applyPasswordUpdate`; (a) se o vínculo do
  // par chegou por 'religacao' (LIDO DE auth_identity_links.attached_via sob o braço de tenant —
  // legível sob a role real; NUNCA da trilha, ilegível — terceira armadilha, opção A) e a
  // identidade tem 2+ vínculos, desvincula com a mecânica do §5.4; vínculo de casa ('backfill')
  // não desvincula; (b) em QUALQUER troca, revoga as sessões do par.
  async handlePasswordChange(
    actor: AuthenticatedActor,
    applyPasswordUpdate?: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<PasswordChangeHookResult> {
    return this.prisma.$transaction(async (tx) => {
      const identityId = await setIdentityRlsContext(tx, actor);

      if (applyPasswordUpdate) {
        await applyPasswordUpdate(tx);
      }

      let unlinked = false;
      let revokedByDetach = 0;

      if (identityId) {
        const rows = await tx.$queryRaw<LinkRow[]>`
          SELECT id, identity_id, tenant_id, user_id, attached_via
          FROM auth_identity_links
          WHERE tenant_id = ${actor.tenantId}::uuid AND user_id = ${actor.userId}::uuid
          FOR UPDATE
        `;
        const link = rows[0];

        if (link && link.attached_via === "religacao") {
          const links = await new IdentityLinkRepository(tx).listByIdentity(identityId);

          if (links.length >= 2) {
            const detached = await this.detachLink(tx, link, {
              actorTenantId: actor.tenantId,
              actorUserId: actor.userId,
              actorScope: "same_org",
            });

            unlinked = true;
            revokedByDetach = detached.revokedSessions;
          }
        }
      }

      // (b) — sessões do par revogadas em QUALQUER troca de senha. Quando o desvínculo do (a)
      // já revogou (o par do vínculo removido É o par da credencial trocada), este updateMany
      // encontra zero — o total reportado soma as duas etapas.
      await setTenantRlsContext(tx, actor.tenantId);
      const revoked = await new AuthSessionRepository(tx).revokeAllActiveByUserForTenant(
        actor.userId,
        actor.tenantId,
      );
      const revokedSessions = revokedByDetach + revoked.count;

      await this.recordAudit(tx, {
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorType: "user",
        action: "auth.password.sessions_revoked",
        resourceType: "auth_session",
        resourceId: actor.userId,
        outcome: "success",
        severity: "info",
        metadata: {
          actor_scope: "same_org",
          revoked_sessions: revokedSessions,
          unlinked,
        },
      });

      return { unlinked, revokedSessions };
    });
  }

  // Mecânica compartilhada do desvínculo (§5.4): identidade NOVA (INSERT sem RETURNING, com o
  // GUC de identidade ainda na ANTIGA), move do vínculo, revogação das sessões do par NA MESMA
  // transação (GUC de tenant trocado para a organização DO VÍNCULO antes do updateMany — dba 1),
  // evento 'desvinculo' e auditoria local com actor_scope + contagem.
  private async detachLink(
    tx: Prisma.TransactionClient,
    link: LinkRow,
    attribution: {
      readonly actorTenantId: string;
      readonly actorUserId: string;
      readonly actorScope: "same_org" | "linked_identity";
    },
  ): Promise<{ readonly revokedSessions: number }> {
    const newIdentityId = randomUUID();

    await insertAuthIdentity(tx, newIdentityId);

    await setTenantRlsContext(tx, link.tenant_id);

    const moved = await new IdentityLinkRepository(tx).moveToIdentity(
      link.id,
      newIdentityId,
      "desvinculo",
    );

    if (moved.count !== 1) {
      throw identityLinkError(409, "CONFLICT", "identity_link_conflict", "Link changed concurrently.");
    }

    const revoked = await new AuthSessionRepository(tx).revokeAllActiveByUserForTenant(
      link.user_id,
      link.tenant_id,
    );

    await new IdentityLinkEventRepository(tx).append({
      link_id: link.id,
      from_identity_id: link.identity_id,
      to_identity_id: newIdentityId,
      event: "desvinculo",
      tenant_id: link.tenant_id,
      user_id: link.user_id,
      actor_tenant_id: attribution.actorTenantId,
      actor_user_id: attribution.actorUserId,
    });

    await this.recordAudit(tx, {
      tenantId: link.tenant_id,
      actorId:
        attribution.actorScope === "same_org" ? attribution.actorUserId : null,
      actorType: "user",
      action: "auth.identity_link.removed",
      resourceType: "auth_identity_link",
      resourceId: link.id,
      outcome: "success",
      severity: "info",
      metadata: {
        actor_scope: attribution.actorScope,
        revoked_sessions: revoked.count,
        targetUserId: link.user_id,
      },
    });

    return { revokedSessions: revoked.count };
  }

  // Reautenticação do desvínculo (S7). Elegível: credencial de qualquer organização da própria
  // identidade EXCETO a do vínculo removido. Falha de senha incrementa o contador (tentativa
  // direcionada); lock ativo → 423.
  private async reauthenticate(
    actor: AuthenticatedActor,
    identityId: string,
    removedLink: LinkRow,
    input: { readonly password: string; readonly reauthTenantId?: string },
  ): Promise<void> {
    const reauthTenantId = input.reauthTenantId?.trim() || actor.tenantId;

    if (reauthTenantId === removedLink.tenant_id) {
      // A senha da organização do vínculo removido NÃO é elegível (S7): quem rouba a credencial
      // de B não pode usar B para destacar o próprio B.
      throw identityLinkError(
        403,
        "FORBIDDEN",
        "reauth_credential_unavailable",
        "Reauthentication must use a credential from another linked organization.",
      );
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      await setTenantRlsContext(tx, reauthTenantId);

      const rows = await tx.$queryRaw<Array<{ user_id: string }>>`
        SELECT user_id FROM auth_identity_links
        WHERE tenant_id = ${reauthTenantId}::uuid AND identity_id = ${identityId}::uuid
      `;
      const reauthUserId = rows[0]?.user_id;

      if (!reauthUserId) {
        return { kind: "unavailable" as const };
      }

      const credentials = new LocalAuthCredentialRepository(tx);
      const credential = await credentials.findByUserForTenant(reauthUserId, reauthTenantId);

      if (!credential) {
        return { kind: "unavailable" as const };
      }

      if (credential.locked_until && credential.locked_until > new Date()) {
        return { kind: "locked" as const };
      }

      const matches = await this.verifyPasswordFn(input.password, credential.password_hash);

      if (!matches) {
        await credentials.incrementFailedAttempts(credential.id, reauthTenantId);

        return { kind: "invalid" as const };
      }

      await credentials.resetFailedAttempts(credential.id, reauthTenantId);

      return { kind: "ok" as const };
    });

    if (outcome.kind === "unavailable") {
      throw identityLinkError(
        403,
        "FORBIDDEN",
        "reauth_credential_unavailable",
        "No eligible credential is available for reauthentication.",
      );
    }

    if (outcome.kind === "locked") {
      throw identityLinkError(423, "LOCKED", "account_locked", "Account is locked.");
    }

    if (outcome.kind === "invalid") {
      throw identityLinkError(401, "UNAUTHORIZED", "invalid_credentials", "Invalid credentials.");
    }
  }

  private async selectLinkOfPairForUpdate(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
  ): Promise<LinkRow | null> {
    const rows = await tx.$queryRaw<LinkRow[]>`
      SELECT id, identity_id, tenant_id, user_id, attached_via
      FROM auth_identity_links
      WHERE tenant_id = ${tenantId}::uuid AND user_id = ${userId}::uuid
      FOR UPDATE
    `;

    return rows[0] ?? null;
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

export function identityLinkError(
  statusCode: number,
  code: string,
  reason: string,
  message: string,
): IdentityLinkError {
  return { statusCode, code, reason, message };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { readonly code?: unknown };

  return candidate.code === "P2002" || candidate.code === "23505";
}

// Runtime lazy (espelho de getSessionAdminService): resolve Prisma + o serviço de login real.
let identityLinkServicePromise: Promise<IdentityLinkService> | undefined;

export function getIdentityLinkService(): Promise<IdentityLinkService> {
  identityLinkServicePromise ??= createIdentityLinkService();

  return identityLinkServicePromise;
}

async function createIdentityLinkService(): Promise<IdentityLinkService> {
  const [{ prisma }, { AuditLogRepository }, { getLocalAuthLoginService }] = await Promise.all([
    import("../../../database/prisma.js"),
    import("../../core-saas/repositories/index.js"),
    import("../auth-runtime.js"),
  ]);

  return new IdentityLinkService(
    prisma,
    async (input) => (await getLocalAuthLoginService()).authenticateLocalCredential(input),
    (tx) => new AuditLogRepository(tx),
  );
}
