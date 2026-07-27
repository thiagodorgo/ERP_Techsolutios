import { env } from "../../config/env.js";
import { verifyChain, type VerifyChainResult } from "../impound/impound.hashchain.js";
import { isNotificationTrailComplete } from "../impound/impound.notifications.js";
import type { ProcessNotification } from "../impound/impound.notifications.types.js";
import { getMemoryNotificationRepositoryForTests } from "../impound/impound.notifications.service.js";
import type { ImpoundRepository } from "../impound/impound.repository.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import { resolveTransition } from "../impound/impound.transitions.js";
import { AUCTION_MAX_ATTEMPTS } from "../jurisdiction/jurisdiction.defaults.js";
import { getMemoryReleaseRepositoryForTests } from "../release/release.service.js";
import { isAuctionDeadlineReached, isOwnerInitialSatisfied } from "./auction.eligibility.js";
import { InMemoryAuctionRepository, type AuctionRepository } from "./auction.repository.js";
import {
  AuctionError,
  type AuctionProfile,
  type AuctionView,
  type RecordAttemptResult,
} from "./auction.types.js";
import { parseNotes, parseRequiredUuid, parseRoundNumber } from "./auction.validators.js";

type RawRecord = Record<string, unknown>;

// Ports injetados (testáveis por DI; espelha ReleaseChargeStatePort). O serviço ORQUESTRA a leitura das 4 fontes
// (perfil / trilha I6 / cadeia I2 / liberação em curso), computa as 6 flags e as injeta em TransitionInputs; as
// guardas de impound.transitions são PURAS.
export type AuctionProfilePort = (tenantId: string, processId: string) => Promise<AuctionProfile | undefined>;
export type AuctionNotificationsPort = (tenantId: string, processId: string) => Promise<readonly ProcessNotification[]>;
export type AuctionVerifyChainPort = (tenantId: string, processId: string) => Promise<VerifyChainResult | undefined>;
export type AuctionActiveReleasePort = (tenantId: string, processId: string) => Promise<boolean>;

export class AuctionService {
  constructor(
    private readonly repository: AuctionRepository,
    private readonly impound: Pick<ImpoundRepository, "findProcessById">,
    private readonly profile: AuctionProfilePort,
    private readonly notifications: AuctionNotificationsPort,
    private readonly verifyChainPort: AuctionVerifyChainPort,
    private readonly hasActiveRelease: AuctionActiveReleasePort,
  ) {}

  // GET /impound-processes/:id/auction — tentativas + strikeCount derivado (impound:read).
  async get(actor: { tenantId: string }, processId: string): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const snapshot = await this.repository.getState(actor.tenantId, normalizedId);
    if (!snapshot) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    return this.toView(snapshot.status, snapshot.attempts);
  }

  // POST /impound-processes/:id/auction/eligibility — GATE de elegibilidade (impound:transition). O serviço computa as
  // 6 pré-condições REAIS, chama resolveTransition (guardAuctionEligible PURA, 6 reasons 409 DISTINTOS) e, se todas
  // passam, aciona markEligibleAtomic (re-verifica sob FOR UPDATE, expectedFrom=ACTIVE_CUSTODY). Os DOIS PISOS
  // (deadline >= max(perfil,60) e OWNER_INITIAL emitido INDEPENDENTE do perfil) fecham os furos do PR-09.
  async markEligible(actor: { tenantId: string; userId?: string }, processId: string): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const [profile, notifications, chain, releaseInProgress] = await Promise.all([
      this.profile(actor.tenantId, normalizedId),
      this.notifications(actor.tenantId, normalizedId),
      this.verifyChainPort(actor.tenantId, normalizedId),
      this.hasActiveRelease(actor.tenantId, normalizedId),
    ]);
    const now = new Date();

    // As 6 flags (fail-closed: perfil ausente ⇒ scope/trilha bloqueiam). Cada uma vira um reason 409 DISTINTO na guarda.
    const gate = {
      scopeNotPublic: profile?.scope !== "PUBLIC_AGREEMENT",
      deadlineNotReached: !isAuctionDeadlineReached(process.enteredAt, profile?.auctionEligibleDay ?? 0, now),
      trailIncomplete: !(profile !== undefined && isNotificationTrailComplete({ ownerNotifDays: profile.ownerNotifDays, noticeEdictDay: profile.noticeEdictDay }, notifications)),
      ownerInitialMissing: !isOwnerInitialSatisfied(notifications),
      chainBroken: !(chain?.valid === true),
      releaseInProgress,
    };

    // resolveTransition = portão 1 (legalidade ACTIVE_CUSTODY→AUCTION_ELIGIBLE) + guardAuctionEligible (PURA; lança o
    // 409 DISTINTO da 1ª pré-condição faltante). Só chega a markEligibleAtomic se as 6 passarem.
    const decision = resolveTransition(process, "AUCTION_ELIGIBLE", { auctionEligible: gate });
    const snapshot = await this.repository.markEligibleAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      actorId: actor.userId,
      occurredAt: now,
    });
    return this.toView(snapshot.status, snapshot.attempts);
  }

  // POST /impound-processes/:id/auction/attempts — REGISTRO de rodada deserta (impound:transition). O processo deve
  // estar AUCTION_ELIGIBLE. recordAttemptAtomic SÓ registra a tentativa (DESERTED) + AUCTION_CLOSED na cadeia + conta o
  // strike sob lock; NÃO transiciona (D-Ω5P-AUC / R-omega5p-pr12-ciclo1: a reciclagem a sucata AUCTION_ELIGIBLE→
  // DIRECT_RECYCLING + o gate de edital por rodada [AUCTION_EDICT >= 15 d.u.] = PR-13). Idempotente por round_number.
  async recordAttempt(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<RecordAttemptResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Barra cedo (reason claro p/ a UI): o fecho de rodada exige o processo AUCTION_ELIGIBLE (o repo re-verifica sob
    // lock via expectedFrom).
    if (process.status !== "AUCTION_ELIGIBLE") {
      throw new AuctionError(409, "AUCTION_CONFLICT", "auction_not_eligible", "Only an auction-eligible process can record an auction attempt.");
    }
    return this.repository.recordAttemptAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: "AUCTION_ELIGIBLE",
      roundNumber: parseRoundNumber(body.round_number ?? body.roundNumber),
      notes: parseNotes(body.notes),
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  private toView(status: AuctionView["status"], attempts: AuctionView["attempts"]): AuctionView {
    return {
      attempts,
      strikeCount: attempts.filter((attempt) => attempt.outcome === "DESERTED").length,
      maxAttempts: AUCTION_MAX_ATTEMPTS,
      status,
    };
  }
}

// ── runtime (env-gate memory×prisma), espelha release.service.ts / impound.notifications.service.ts ─────────────
const memoryAuctionRepository = new InMemoryAuctionRepository(
  getMemoryImpoundRepositoryForTests(),
  (tenantId, processId) => getMemoryReleaseRepositoryForTests().hasActiveRelease(tenantId, processId),
);
let defaultAuctionServicePromise: Promise<AuctionService> | undefined;

async function memoryVerifyChain(tenantId: string, processId: string): Promise<VerifyChainResult | undefined> {
  const snapshot = await getMemoryImpoundRepositoryForTests().readChainSnapshot(tenantId, processId);
  if (!snapshot) return undefined;
  return verifyChain({ tenantId, processId, events: snapshot.events, head: snapshot.head, crossAnchors: snapshot.crossAnchors });
}

export function createMemoryAuctionService(): AuctionService {
  return new AuctionService(
    memoryAuctionRepository,
    getMemoryImpoundRepositoryForTests(),
    (tenantId, processId) => memoryAuctionRepository.getAuctionProfile(tenantId, processId),
    (tenantId, processId) => getMemoryNotificationRepositoryForTests().listNotifications({ tenantId, processId }),
    (tenantId, processId) => memoryVerifyChain(tenantId, processId),
    (tenantId, processId) => getMemoryReleaseRepositoryForTests().hasActiveRelease(tenantId, processId),
  );
}

export function getMemoryAuctionRepositoryForTests(): InMemoryAuctionRepository {
  return memoryAuctionRepository;
}

export async function createDefaultAuctionService(): Promise<AuctionService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryAuctionService();
  }
  defaultAuctionServicePromise ??= createPrismaAuctionService();
  return defaultAuctionServicePromise;
}

export function resetAuctionRuntimeForTests(): void {
  memoryAuctionRepository.reset();
  defaultAuctionServicePromise = undefined;
}

async function createPrismaAuctionService(): Promise<AuctionService> {
  const { createPrismaAuctionRepository, createPrismaAuctionPorts } = await import("./auction-prisma.repository.js");
  const { createPrismaImpoundRepository } = await import("../impound/impound-prisma.repository.js");
  const [repository, impound, ports] = await Promise.all([
    createPrismaAuctionRepository(),
    createPrismaImpoundRepository(),
    createPrismaAuctionPorts(),
  ]);
  return new AuctionService(repository, impound, ports.profile, ports.notifications, ports.verifyChain, ports.hasActiveRelease);
}
