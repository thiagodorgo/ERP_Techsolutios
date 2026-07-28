import type { ImpoundProcess } from "../impound/impound.types.js";
import {
  AntiAbuse,
  constantTimeEqual,
  ipHash,
  issueChallenge,
  normalizeRenavamKey,
  plateRateKey,
  queryFingerprint,
  signOwnerSession,
  verifySolution,
  type ChallengeStore,
  type PortalAccessLogRepository,
  type PowChallenge,
} from "../portal-shared/index.js";
import { toOwnerPortalProcessDto, type OwnerPortalProcessDto } from "./owner-portal.dto.js";
import type { LookupRequest } from "./owner-portal.validators.js";

// Ω5P PR-16 — read-ports ESTREITOS que o BFF consome IN-PROCESS (D-Ω5P-PORTAL-03) — nunca loopback HTTP, nunca
// JWT/AuthSession do ERP. Cada porta recebe o tenantId do BINDING de deploy; o RLS na camada de repositório
// garante que o portal jamais lê o processo de OUTRO tenant.
export interface OwnerPortalImpoundPort {
  findByIdentity(tenantId: string, plate: string): Promise<ImpoundProcess | undefined>;
}
export interface OwnerPortalChargePort {
  getPublicSummary(tenantId: string, processId: string): Promise<{ totalDueCents: number; currency: string }>;
}
export interface OwnerPortalYardPort {
  getPublicYard(tenantId: string, yardId: string): Promise<{ name: string; address: string } | undefined>;
}

export type OwnerPortalDeps = {
  readonly tenantId: string; // BINDING de deploy (PORTAL_TENANT_ID / host→tenant)
  readonly impound: OwnerPortalImpoundPort;
  readonly charge: OwnerPortalChargePort;
  readonly yard: OwnerPortalYardPort;
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

  // Atraso mínimo CONSTANTE — normaliza a latência (a via FOUND faz mais trabalho; a via negativa "espera" até o
  // piso). Aplicado a TODOS os desfechos de lookup → nenhuma via é um oráculo de timing.
  private async settle(startMs: number, result: OwnerLookupResult): Promise<OwnerLookupResult> {
    const elapsed = this.clock() - startMs;
    if (elapsed < this.deps.minLatencyMs) {
      await sleep(this.deps.minLatencyMs - elapsed);
    }
    return result;
  }
}
