import type { ImpoundProcess } from "../impound/impound.types.js";
import {
  AntiAbuse,
  constantTimeEqual,
  ipHash,
  issueChallenge,
  normalizeRenavamKey,
  plateRateKey,
  queryFingerprint,
  sessionRateKey,
  signOwnerSession,
  verifySolution,
  type ChallengeStore,
  type PortalAccessLogRepository,
  type PowChallenge,
} from "../portal-shared/index.js";
import { toOwnerDossierDto, toOwnerPortalProcessDto, type OwnerDossierDto, type OwnerPortalProcessDto } from "./owner-portal.dto.js";
import { resolveOwnerSession } from "./owner-portal.session.js";
import type { PortalReleaseRequestRepository } from "./portal-release-request.types.js";
import type { LookupRequest } from "./owner-portal.validators.js";

// Ω5P PR-16 — read-ports ESTREITOS que o BFF consome IN-PROCESS (D-Ω5P-PORTAL-03) — nunca loopback HTTP, nunca
// JWT/AuthSession do ERP. Cada porta recebe o tenantId do BINDING de deploy; o RLS na camada de repositório
// garante que o portal jamais lê o processo de OUTRO tenant.
export interface OwnerPortalImpoundPort {
  findByIdentity(tenantId: string, plate: string): Promise<ImpoundProcess | undefined>;
  // Ω5P PR-17 — resolve o processo pelo ID da SESSÃO JWE (nunca do corpo); RLS garante isolamento cross-tenant.
  findByIdForPortal(tenantId: string, processId: string): Promise<ImpoundProcess | undefined>;
  // Ω5P PR-17 — contagem de conjuntos de foto (placeholder honesto; NENHUM byte de foto — CORTE PR-17b).
  countAvailablePhotoSets(tenantId: string, processId: string): Promise<number>;
}
export interface OwnerPortalChargePort {
  getPublicSummary(tenantId: string, processId: string): Promise<{ totalDueCents: number; currency: string }>;
  // Ω5P PR-17 — débitos ITEMIZADOS por kind (§2.8: sem tariffId/unitAmount/periodSeq/id de linha).
  getPublicItemizedSummary(
    tenantId: string,
    processId: string,
  ): Promise<{
    readonly currency: string;
    readonly items: ReadonlyArray<{ readonly kind: "REMOVAL" | "DAILY" | "ADDITIONAL"; readonly subtotalCents: number; readonly count: number }>;
    readonly capReached: boolean;
    readonly totalDueCents: number;
  }>;
}
export interface OwnerPortalYardPort {
  getPublicYard(tenantId: string, yardId: string): Promise<{ name: string; address: string } | undefined>;
}
// Ω5P PR-17 — prazos legais (offsets do t0) + exigências de liberação (§2.8: só {label, required}; nunca satisfied).
export interface OwnerPortalJurisdictionPort {
  getPortalProfile(
    tenantId: string,
    profileId: string,
  ): Promise<
    | {
        readonly ownerNotifDays: number;
        readonly noticeEdictDay: number;
        readonly auctionEligibleDay: number;
        readonly requirements: ReadonlyArray<{ readonly label: string; readonly required: boolean }>;
      }
    | undefined
  >;
}

export type OwnerPortalDeps = {
  readonly tenantId: string; // BINDING de deploy (PORTAL_TENANT_ID / host→tenant)
  readonly impound: OwnerPortalImpoundPort;
  readonly charge: OwnerPortalChargePort;
  readonly yard: OwnerPortalYardPort;
  readonly jurisdiction: OwnerPortalJurisdictionPort; // Ω5P PR-17 — prazos/exigências do dossiê
  readonly releaseRequests: PortalReleaseRequestRepository; // Ω5P PR-17 — intenção de liberação
  readonly accessLog: PortalAccessLogRepository;
  readonly antiAbuse: AntiAbuse;
  readonly challengeStore: ChallengeStore;
  readonly logSecret: string;
  readonly sessionSecret: string;
  readonly minLatencyMs: number; // atraso mínimo constante (normaliza timing anti-enumeração)
  readonly challengeTtlMs: number;
  readonly now?: () => number; // relógio em ms (injetável em teste)
};

// Retornado ao controller. A RESPOSTA das 3 negativas (não-encontrado × Renavam-errado × não-autorizado) é
// UNIFORME (kind:'not_found' → mesmo shape/status/latência); só 'found' difere (é o desfecho legítimo distinto).
export type OwnerLookupResult =
  | { readonly kind: "found"; readonly process: OwnerPortalProcessDto; readonly session: string }
  | { readonly kind: "not_found" }
  | { readonly kind: "rate_limited" }
  | { readonly kind: "challenge_failed" };

// Desfecho do /challenge: emitido OU barrado por rate-limit (HIGH-1). O flood anônimo de desafios não pode
// crescer o challenge store nem a trilha de log sem teto — o balde por IP corta ANTES de emitir/logar.
export type OwnerChallengeResult =
  | { readonly kind: "issued"; readonly challenge: PowChallenge }
  | { readonly kind: "rate_limited" };

// Ω5P PR-17 — desfecho do /dossier. `session_invalid` (401) é UNIFORME p/ ausente/expirada/forjada/audience-errada
// (sem oráculo). `not_found` (cross-tenant/removido) NÃO devolve o processo. Só `ok` traz o agregado minimizado.
export type OwnerDossierResult =
  | { readonly kind: "ok"; readonly dossier: OwnerDossierDto }
  | { readonly kind: "session_invalid" }
  | { readonly kind: "not_found" }
  | { readonly kind: "rate_limited" };

// Ω5P PR-17 — desfecho do /release-request. `ok` = intenção REGISTRADA (ou já havia uma aberta — idempotente); a
// resposta ao cliente é SEMPRE genérica ({received:true}) — não confirma/nega existência do processo (anti-oráculo).
export type OwnerReleaseRequestResult =
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

export class OwnerPortalService {
  private readonly clock: () => number;

  constructor(private readonly deps: OwnerPortalDeps) {
    this.clock = deps.now ?? (() => Date.now());
  }

  // POST /portal/v1/owner/challenge — emite o desafio PoW (dificuldade progressiva pelas falhas do IP) e loga
  // CHALLENGE_ISSUED (I10). NÃO consome rate-limit de consulta (é só o "pré-flight" anti-bot).
  async challenge(ctx: { ip: string; userAgent?: string }): Promise<OwnerChallengeResult> {
    const nowMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    // (0) Rate-limit BARATO do /challenge por IP (HIGH-1). Um flood anônimo é barrado ANTES de emitir o desafio e
    // ANTES de gravar 1 linha de log → o balde limita simultaneamente o crescimento do challenge store e a taxa de
    // escrita no PortalAccessLog. Sem log/emissão no caminho barrado (é o próprio ponto de conter a exaustão).
    if (this.deps.antiAbuse.checkChallengeRate(ip, nowMs).limited) {
      return { kind: "rate_limited" };
    }
    const difficulty = this.deps.antiAbuse.difficultyFor(ip, nowMs);
    const challenge = issueChallenge(this.deps.challengeStore, difficulty, this.deps.challengeTtlMs, nowMs);
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "OWNER",
      action: "CHALLENGE_ISSUED",
      outcome: "ISSUED",
      ipHash: ip,
      userAgent: truncateUa(ctx.userAgent),
      occurredAt: new Date(),
    });
    return { kind: "issued", challenge };
  }

  // POST /portal/v1/owner/lookup — o CORAÇÃO de segurança: PoW → rate-limit → 2 fatores (Renavam em tempo
  // constante) → resposta UNIFORME. TODA tentativa vira 1 linha no PortalAccessLog; o `outcome` interno
  // (FACTOR_MISMATCH×NOT_FOUND) NUNCA vai para a resposta.
  async lookup(input: LookupRequest & { ip: string; userAgent?: string }): Promise<OwnerLookupResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, input.ip);
    const fingerprint = queryFingerprint(this.deps.logSecret, input.plate, input.renavam);
    const ua = truncateUa(input.userAgent);
    const nowMs = this.clock();

    // (1) PoW obrigatório. Inválida/expirada/reusada → falha genérica + CHALLENGE_FAILED + sobe a dificuldade.
    const pow = verifySolution(
      this.deps.challengeStore,
      { challengeId: input.challengeId, solution: input.solution },
      nowMs,
    );
    if (!pow.ok) {
      this.deps.antiAbuse.registerFailure(ip, nowMs);
      await this.deps.accessLog.append({
        tenantId: this.deps.tenantId,
        portal: "OWNER",
        action: "LOOKUP",
        outcome: "CHALLENGE_FAILED",
        queryFingerprint: fingerprint,
        ipHash: ip,
        userAgent: ua,
        occurredAt: new Date(),
      });
      return this.settle(startMs, { kind: "challenge_failed" });
    }

    // (2) Rate-limit por IP E por placa (o mais restritivo vence) → 429 genérico + RATE_LIMITED.
    const rate = this.deps.antiAbuse.checkRate(ip, plateRateKey(this.deps.logSecret, input.plate), nowMs);
    if (rate.limited) {
      await this.deps.accessLog.append({
        tenantId: this.deps.tenantId,
        portal: "OWNER",
        action: "LOOKUP",
        outcome: "RATE_LIMITED",
        queryFingerprint: fingerprint,
        ipHash: ip,
        userAgent: ua,
        occurredAt: new Date(),
      });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // (3) 2 fatores. 1º = placa (resolve o processo, escopo=tenant vinculado sob RLS). 2º = Renavam em TEMPO
    // CONSTANTE. NOT_FOUND × FACTOR_MISMATCH → resposta IDÊNTICA; o outcome interno fica só no log (I10).
    const process = await this.deps.impound.findByIdentity(this.deps.tenantId, input.plate);
    const provided = normalizeRenavamKey(input.renavam);
    const stored = process?.vehicleRenavam ? normalizeRenavamKey(process.vehicleRenavam) : null;
    // Compara SEMPRE (mesmo com stored ausente) para não abrir fast-path de timing; força false se não há Renavam.
    const rawMatch = constantTimeEqual(this.deps.logSecret, stored ?? "", provided);
    // CRÍTICO-1 (bypass do 2º fator por normalização vazia): `constantTimeEqual("","")` é true — um registro sem
    // Renavam-dígito ("N/A", "-") normalizaria stored→"" e um lookup com Renavam sem dígito daria provided→"",
    // degradando 2 fatores em 1 (placa só). A guarda de comprimento é um AND booleano sobre valores JÁ computados
    // (rawMatch continua rodando incondicionalmente → tempo-constante preservado): Renavam vazio NUNCA autentica e
    // um registro sem Renavam-dígito fica não-consultável, exatamente como o caso `null` já seguro.
    const matched =
      process !== undefined && stored !== null && provided.length > 0 && stored.length > 0 && rawMatch;

    if (!process || !matched) {
      await this.deps.accessLog.append({
        tenantId: this.deps.tenantId,
        portal: "OWNER",
        action: "LOOKUP",
        outcome: process ? "FACTOR_MISMATCH" : "NOT_FOUND",
        queryFingerprint: fingerprint,
        ipHash: ip,
        userAgent: ua,
        occurredAt: new Date(),
      });
      return this.settle(startMs, { kind: "not_found" });
    }

    const due = await this.deps.charge.getPublicSummary(this.deps.tenantId, process.id);
    const yard = process.yardId ? await this.deps.yard.getPublicYard(this.deps.tenantId, process.yardId) : undefined;
    const dto = toOwnerPortalProcessDto(process, yard, due);
    const session = await signOwnerSession({ processId: process.id }, { secret: this.deps.sessionSecret });
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "OWNER",
      action: "LOOKUP",
      outcome: "FOUND",
      processId: process.id,
      queryFingerprint: fingerprint,
      ipHash: ip,
      userAgent: ua,
      occurredAt: new Date(),
    });
    return this.settle(startMs, { kind: "found", process: dto, session });
  }

  // GET /portal/v1/owner/dossier — dossiê detalhado MINIMIZADO (§2.8). A SESSÃO É A AUTORIZAÇÃO: o processId vem
  // SEMPRE da JWE verificada (nunca do corpo). Rejeição uniforme p/ sessão ausente/expirada/forjada/audience-errada.
  async dossier(ctx: { authorization?: string; ip: string; userAgent?: string }): Promise<OwnerDossierResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    const session = await resolveOwnerSession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      // Sessão inválida = vetor de DoS BARATO (JWE forjada). Rate-limit por IP ANTES de logar → o flood de tokens
      // ruins não cresce a trilha sem teto (mesmo espírito do /challenge). Barrado → 429 SEM log.
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      await this.logPortal("DOSSIER_VIEWED", "SESSION_INVALID", { ip, ua });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    // Sessão VÁLIDA (já custou um PoW no lookup) → rate-limit por sessão+IP (balde dedicado; sem PoW nos reads).
    const readKey = sessionRateKey(this.deps.logSecret, session.processId);
    if (this.deps.antiAbuse.checkReadRate(readKey, ip, nowMs).limited) {
      await this.logPortal("DOSSIER_VIEWED", "RATE_LIMITED", { ip, ua });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // processId DA SESSÃO — RLS garante que uma sessão de A jamais lê B (findByIdForPortal filtra tenant vinculado).
    const process = await this.deps.impound.findByIdForPortal(this.deps.tenantId, session.processId);
    if (!process) {
      await this.logPortal("DOSSIER_VIEWED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "not_found" });
    }

    const [charges, plan, photoSetsCount] = await Promise.all([
      this.deps.charge.getPublicItemizedSummary(this.deps.tenantId, process.id),
      this.deps.jurisdiction.getPortalProfile(this.deps.tenantId, process.profileId),
      this.deps.impound.countAvailablePhotoSets(this.deps.tenantId, process.id),
    ]);
    const yard = process.yardId ? await this.deps.yard.getPublicYard(this.deps.tenantId, process.yardId) : undefined;
    const dossier = toOwnerDossierDto({ process, yard, charges, plan, photoSetsCount, now: new Date() });
    await this.logPortal("DOSSIER_VIEWED", "AUTHORIZED", { ip, ua, processId: process.id });
    return this.settle(startMs, { kind: "ok", dossier });
  }

  // POST /portal/v1/owner/release-request — registra a INTENÇÃO de liberação (nota curta opcional; SEM upload). O
  // processId vem da SESSÃO. Idempotente (1 aberta por processo via partial-unique). Resposta SEMPRE genérica.
  async releaseRequest(ctx: { authorization?: string; note?: string; ip: string; userAgent?: string }): Promise<OwnerReleaseRequestResult> {
    const startMs = this.clock();
    const ip = ipHash(this.deps.logSecret, ctx.ip);
    const ua = truncateUa(ctx.userAgent);
    const nowMs = this.clock();

    const session = await resolveOwnerSession(ctx.authorization, this.deps.sessionSecret);
    if (!session) {
      if (this.deps.antiAbuse.checkReadRate("anon", ip, nowMs).limited) {
        return this.settle(startMs, { kind: "rate_limited" });
      }
      await this.logPortal("RELEASE_REQUESTED", "SESSION_INVALID", { ip, ua });
      return this.settle(startMs, { kind: "session_invalid" });
    }

    const readKey = sessionRateKey(this.deps.logSecret, session.processId);
    if (this.deps.antiAbuse.checkReadRate(readKey, ip, nowMs).limited) {
      await this.logPortal("RELEASE_REQUESTED", "RATE_LIMITED", { ip, ua });
      return this.settle(startMs, { kind: "rate_limited" });
    }

    // Resolve o processo pelo id da sessão ANTES de inserir (evita FK-violation cross-tenant; resposta genérica).
    const process = await this.deps.impound.findByIdForPortal(this.deps.tenantId, session.processId);
    if (!process) {
      await this.logPortal("RELEASE_REQUESTED", "NOT_FOUND", { ip, ua });
      return this.settle(startMs, { kind: "ok" }); // genérica: não revela que o processo não existe neste tenant
    }

    await this.deps.releaseRequests.createIfNoneOpen({
      tenantId: this.deps.tenantId,
      processId: process.id,
      note: ctx.note,
      sessionRef: sessionRateKey(this.deps.logSecret, process.id).slice(0, 24), // ref OPACA (HMAC truncado); nunca a JWE
      requestedAt: new Date(),
    });
    // `created` é interno (idempotência); a resposta é genérica em ambos os casos → sem oráculo.
    await this.logPortal("RELEASE_REQUESTED", "AUTHORIZED", { ip, ua, processId: process.id });
    return this.settle(startMs, { kind: "ok" });
  }

  // 1 linha no PortalAccessLog (I10) para as ações autorizadas por sessão. Sem PII (só ip_hash/ua truncada;
  // processId só quando o desfecho amarra o bem — AUTHORIZED, coerente com o CHECK process_found alargado).
  private async logPortal(
    action: "DOSSIER_VIEWED" | "RELEASE_REQUESTED",
    outcome: "AUTHORIZED" | "SESSION_INVALID" | "RATE_LIMITED" | "NOT_FOUND",
    ctx: { ip: string; ua?: string; processId?: string },
  ): Promise<void> {
    await this.deps.accessLog.append({
      tenantId: this.deps.tenantId,
      portal: "OWNER",
      action,
      outcome,
      processId: ctx.processId,
      ipHash: ctx.ip,
      userAgent: ctx.ua,
      occurredAt: new Date(),
    });
  }

  // Atraso mínimo CONSTANTE — normaliza a latência (a via com mais trabalho vs a via curta; a curta "espera" até o
  // piso). Aplicado a TODOS os desfechos → nenhuma via é um oráculo de timing. Genérico (lookup/dossier/release).
  private async settle<T>(startMs: number, result: T): Promise<T> {
    const elapsed = this.clock() - startMs;
    if (elapsed < this.deps.minLatencyMs) {
      await sleep(this.deps.minLatencyMs - elapsed);
    }
    return result;
  }
}
