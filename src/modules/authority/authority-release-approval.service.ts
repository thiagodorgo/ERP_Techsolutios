import {
  ipHash,
  sessionRateKey,
  type AntiAbuse,
  type PortalAccessLogRepository,
  type PortalOutcome,
} from "../portal-shared/index.js";
import type { AuthorityCredentialConsumptionReader } from "./authority-removal.repository.js";
import { resolveAuthoritySession } from "./authority-portal.session.js";
import type { AuthorityReleaseApprovalRepository, PendingApproval } from "./authority-release-approval.types.js";
import type { DecideRequestBody } from "./authority-release-approval.validators.js";

// Ω5P PR-19 — BFF do authority-portal: LISTAR fila de aprovações pendentes + DECIDIR (APPROVE/REJECT), só nos
// processos que a PRÓPRIA credencial originou (D-08). Reusa o padrão exato do PR-18b: resolveSession → rate-limit
// (sessão+IP) → CONSUMO sob RLS (status ACTIVE re-checado — D-07: credencial revogada com JWE ainda válida NÃO
// decide) → vinculação D-08 (404 UNIFORME p/ "não é seu" ≡ "não existe" — anti-enumeração de processId) → escrita.

export type AuthorityReleaseApprovalDeps = {
  readonly tenantId: string; // BINDING de deploy (PORTAL_TENANT_ID), mesmo padrão do 18b
  readonly credentials: AuthorityCredentialConsumptionReader; // subset ESTREITO (status/nome) — reusado do 18b
  readonly approvals: AuthorityReleaseApprovalRepository;
  readonly accessLog: PortalAccessLogRepository;
  readonly antiAbuse: AntiAbuse;
  readonly logSecret: string;
  readonly sessionSecret: string;
  readonly minLatencyMs: number;
  readonly now?: () => number;
};

export type ListApprovalsResult =
  | { readonly kind: "ok"; readonly items: readonly PendingApproval[] }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "rate_limited" };

export type DecideResult =
  | { readonly kind: "approved" }
  | { readonly kind: "rejected" }
  | { readonly kind: "not_found" } // 404 UNIFORME (sem vínculo D-08 OU sem release ativa) — anti-enumeração
  | { readonly kind: "conflict" } // REJECT sobre uma release JÁ aprovada (estado, não é oráculo de vínculo)
  | { readonly kind: "session_invalid" }
  | { readonly kind: "rate_limited" };

function truncateUa(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;
  return userAgent.slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AuthorityReleaseApprovalService {
  private readonly clock: () => number;

  constructor(private readonly deps: AuthorityReleaseApprovalDeps) {
    this.clock = deps.now ?? (() => Date.now());
  }

  // GET /portal/v1/authority/approvals — fila pendente vinculada à credencial da sessão.
  async listApprovals(ctx: { authorization?: string; ip: string; userAgent?: string }): Promise<ListApprovalsResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    const session = await resolveAuthoritySession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      return this.settle(startMs, { kind: "session_invalid" }); // sem log: leitura da fila não é um ATO (18b/17 mesmo espírito)
    }

    const credKey = sessionRateKey(this.deps.logSecret, session.credentialId);
    if (this.deps.antiAbuse.checkReadRate(credKey, ip, nowMs).limited) {
      return this.settle(startMs, { kind: "rate_limited" });
    }

    const credential = await this.deps.credentials.findById(this.deps.tenantId, session.credentialId);
    if (!credential || credential.status !== "ACTIVE") {
      return this.settle(startMs, { kind: "session_invalid" });
    }

    const items = await this.deps.approvals.listPendingApprovals(this.deps.tenantId, session.credentialId);
    return this.settle(startMs, { kind: "ok", items });
  }

  // POST /portal/v1/authority/approvals/:processId/decide — APPROVE|REJECT. body JÁ validado pelo controller.
  async decide(ctx: {
    authorization?: string;
    processId: string;
    body: DecideRequestBody;
    ip: string;
    userAgent?: string;
  }): Promise<DecideResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    const session = await resolveAuthoritySession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      await this.log("SESSION_INVALID", undefined, { ip, ua });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    const credKey = sessionRateKey(this.deps.logSecret, session.credentialId);
    if (this.deps.antiAbuse.checkReadRate(credKey, ip, nowMs).limited) {
      await this.log("RATE_LIMITED", undefined, { ip, ua, credKey });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // CONSUMO sob RLS (D-07): credencial inexistente/cross-tenant OU não-ACTIVE → 401 UNIFORME, nada escrito.
    const credential = await this.deps.credentials.findById(this.deps.tenantId, session.credentialId);
    if (!credential || credential.status !== "ACTIVE") {
      await this.log("SESSION_INVALID", undefined, { ip, ua, credKey });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    // Vinculação D-08: sem vínculo OU sem release ATIVA → 404 UNIFORME (não distingue "não existe" de "não é seu").
    // processId NUNCA logado aqui (undefined): o valor vem CRU da URL — logá-lo quebraria a FK composta
    // tenant-first RESTRICT de portal_access_logs (23503) para um id inexistente/de outro tenant (espelha o
    // owner-portal: process_id só entra no log quando o desfecho CONFIRMA o vínculo — nunca em NOT_FOUND).
    const linked = await this.deps.approvals.findLinkedRelease(this.deps.tenantId, session.credentialId, ctx.processId);
    if (!linked) {
      await this.log("NOT_FOUND", undefined, { ip, ua, credKey });
      return this.settle(startMs, { kind: "not_found" });
    }

    if (ctx.body.decision === "REJECT") {
      // REJECT sobre uma release JÁ aprovada (pelo stand-in OU pelo portal) é conflito de estado — o vínculo já foi
      // provado (não é enumeração); a FSM não regride de AUTHORIZED (D-10).
      if (linked.alreadyApproved) {
        await this.log("REJECTED", ctx.processId, { ip, ua, credKey }); // outcome de tentativa; conflito não é sucesso
        return this.settle(startMs, { kind: "conflict" });
      }
      await this.deps.approvals.recordRejection({
        tenantId: this.deps.tenantId,
        releaseId: linked.releaseId,
        credentialId: session.credentialId,
        note: ctx.body.note as string, // validado no controller (REJECT exige nota)
        occurredAt: new Date(),
      });
      await this.log("REJECTED", ctx.processId, { ip, ua, credKey });
      return this.settle(startMs, { kind: "rejected" });
    }

    // APPROVE — idempotente: se JÁ aprovada, NÃO insere nova linha no ledger append-only (release_authority_decisions
    // é o ato jurídico formal — reaprovar não pode poluí-lo com N linhas divergentes de reference/note). Só o
    // primeiro APPROVE grava; chamadas seguintes retornam sucesso sem escrita (espelha a disciplina do REJECT/409
    // acima, mas aqui o desfecho continua "approved" pois não é conflito de estado — é o mesmo estado já alcançado).
    if (!linked.alreadyApproved) {
      await this.deps.approvals.recordApproval({
        tenantId: this.deps.tenantId,
        releaseId: linked.releaseId,
        credentialId: session.credentialId,
        reference: ctx.body.reference,
        note: ctx.body.note,
        occurredAt: new Date(),
      });
    }
    await this.log("APPROVED", ctx.processId, { ip, ua, credKey });
    return this.settle(startMs, { kind: "approved" });
  }

  // 1 linha no PortalAccessLog (I10). §2.8: NUNCA reference/note/plate — só outcome + processId (FK composta
  // tenant-first RESTRICT já existente) + ip_hash/ua truncada + credKey (HMAC do credentialId).
  private async log(
    outcome: PortalOutcome,
    processId: string | undefined,
    ctx: { ip: string; ua?: string; credKey?: string },
  ): Promise<void> {
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "AUTHORITY",
      action: "RELEASE_DECIDED",
      outcome,
      processId,
      queryFingerprint: ctx.credKey,
      ipHash: ctx.ip,
      userAgent: ctx.ua,
      occurredAt: new Date(),
    });
  }

  // Piso de latência CONSTANTE em TODOS os desfechos — nenhuma via é oráculo de timing.
  private async settle<T>(startMs: number, result: T): Promise<T> {
    const elapsed = this.clock() - startMs;
    if (elapsed < this.deps.minLatencyMs) {
      await sleep(this.deps.minLatencyMs - elapsed);
    }
    return result;
  }
}
