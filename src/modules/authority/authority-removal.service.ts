import {
  ipHash,
  sessionRateKey,
  type AntiAbuse,
  type PortalAccessLogRepository,
} from "../portal-shared/index.js";
import { resolveAuthoritySession } from "./authority-portal.session.js";
import type {
  AuthorityRemovalConsumptionPort,
  AuthorityRemovalRepository,
} from "./authority-removal.types.js";
import type { RemovalRequestBody } from "./authority-removal.validators.js";

// Ω5P PR-18b — BFF do authority-portal: SOLICITAR REMOÇÃO. A SESSÃO JWE (audience authority) é a ÚNICA autorização:
// o credentialId vem SEMPRE dela (nunca do corpo — anti-spoof do órgão). Pipeline: resolve sessão → rate-limit
// (sessão+IP) → CONSUMO sob RLS (status ACTIVE re-checado — D-Ω5P-AUTH-07: uma credencial revogada com JWE ainda
// válida NÃO origina) → escrita ATÔMICA (INSERT solicitação OPEN [partial-unique anti-spam] + catálogo resolvido →
// origina OS(open) SISTEMA na MESMA tx). Resposta SEMPRE genérica ({received:true}) p/ {originada, enfileirada,
// duplicada} — anti-oráculo/§2.8. SoD: a OS nasce 'open'; a custódia só abre na CONCLUSÃO pelo operador de campo.

export type AuthorityRemovalDeps = {
  readonly tenantId: string; // BINDING de deploy (PORTAL_TENANT_ID / host→tenant)
  readonly consumption: AuthorityRemovalConsumptionPort;
  readonly removals: AuthorityRemovalRepository;
  readonly accessLog: PortalAccessLogRepository;
  readonly antiAbuse: AntiAbuse;
  readonly logSecret: string;
  readonly sessionSecret: string; // PORTAL_AUTHORITY_SESSION_SECRET (≠ owner ≠ ERP)
  readonly minLatencyMs: number; // piso constante — normaliza timing
  readonly now?: () => number;
};

// `ok` = solicitação processada (originada | enfileirada | duplicada — todas genéricas). session_invalid (401) é
// UNIFORME p/ ausente/expirada/forjada/audience-errada E p/ credencial não-ACTIVE (sem oráculo de revogação).
export type AuthorityRemovalResult =
  | { readonly kind: "ok" }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "rate_limited" };

function truncateUa(userAgent: string | undefined): string | undefined {
  if (!userAgent) return undefined;
  return userAgent.slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class AuthorityRemovalService {
  private readonly clock: () => number;

  constructor(private readonly deps: AuthorityRemovalDeps) {
    this.clock = deps.now ?? (() => Date.now());
  }

  // POST /portal/v1/authority/removals — o body JÁ vem validado/normalizado (o controller parseia e trata 400).
  async requestRemoval(ctx: {
    authorization?: string;
    body: RemovalRequestBody;
    ip: string;
    userAgent?: string;
  }): Promise<AuthorityRemovalResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    // (1) A sessão é a autorização. Ausente/expirada/forjada/audience-errada → rejeição UNIFORME. Rate-limit por IP
    // ANTES de logar (o flood de JWE forjada não cresce a trilha sem teto — mesmo espírito do owner-portal).
    const session = await resolveAuthoritySession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      await this.log("SESSION_INVALID", { ip, ua });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    // (2) Rate-limit por SESSÃO+IP (balde dedicado; sem PoW — a sessão já custou um login). credKey = HMAC do
    // credentialId (opaco): correlaciona/limita a mesma credencial sem NUNCA guardá-lo cru (§2.8).
    const credKey = sessionRateKey(this.deps.logSecret, session.credentialId);
    if (this.deps.antiAbuse.checkReadRate(credKey, ip, nowMs).limited) {
      await this.log("RATE_LIMITED", { ip, ua, credKey });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // (3) CONSUMO sob RLS (D-Ω5P-AUTH-07): recarrega a credencial pelo id DA SESSÃO e EXIGE status ACTIVE. Uma
    // credencial inexistente (cross-tenant/removida) OU não-ACTIVE (suspensa/revogada) → 401 UNIFORME, nada criado.
    const consumption = await this.deps.consumption.findConsumptionContext(this.deps.tenantId, session.credentialId);
    if (!consumption || consumption.status !== "ACTIVE") {
      await this.log("SESSION_INVALID", { ip, ua, credKey });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    // (4) Escrita ATÔMICA: INSERT solicitação OPEN [partial-unique = anti-spam] + (catálogo resolvido → origina a
    // OS(open) SISTEMA na MESMA tx; senão → enfileirada, work_order_id NULL). created/originated são INTERNOS.
    await this.deps.removals.createRemoval({
      tenantId: this.deps.tenantId,
      credentialId: session.credentialId, // da SESSÃO, nunca do corpo
      plate: ctx.body.plate,
      legalBasis: ctx.body.legalBasis,
      locationNote: ctx.body.locationNote,
      sessionRef: credKey.slice(0, 24), // ref OPACA (HMAC truncado); nunca a JWE
      removalServiceCatalogId: consumption.removalServiceCatalogId, // resolvido server-side (D-06)
      requestedAt: new Date(),
    });
    // Resposta genérica em TODOS os desfechos (originada/enfileirada/duplicada) → sem oráculo.
    await this.log("AUTHORIZED", { ip, ua, credKey });
    return this.settle(startMs, { kind: "ok" });
  }

  // 1 linha no PortalAccessLog (I10). §2.8: só ip_hash + ua truncada + credKey (HMAC do credentialId) — NUNCA a
  // placa/legalBasis/credentialId/tenant_id/OS id. process_id sempre ausente (a solicitação não amarra um processo).
  private async log(
    outcome: "AUTHORIZED" | "SESSION_INVALID" | "RATE_LIMITED",
    ctx: { ip: string; ua?: string; credKey?: string },
  ): Promise<void> {
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "AUTHORITY",
      action: "REMOVAL_REQUESTED",
      outcome,
      queryFingerprint: ctx.credKey,
      ipHash: ctx.ip,
      userAgent: ctx.ua,
      occurredAt: new Date(),
    });
  }

  // Piso de latência CONSTANTE em TODOS os desfechos — nenhuma via é oráculo de timing (revogada vs válida, etc.).
  private async settle<T>(startMs: number, result: T): Promise<T> {
    const elapsed = this.clock() - startMs;
    if (elapsed < this.deps.minLatencyMs) {
      await sleep(this.deps.minLatencyMs - elapsed);
    }
    return result;
  }
}
