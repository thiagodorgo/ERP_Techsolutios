import { env } from "../../config/env.js";
import type { AccrueProcessResult, ReleaseChargeState } from "../charging/charge.types.js";
import { createMemoryChargeService } from "../charging/charge.service.js";
import { verifyChain, type VerifyChainResult } from "../impound/impound.hashchain.js";
import { isNotificationTrailComplete } from "../impound/impound.notifications.js";
import type { ProcessNotification } from "../impound/impound.notifications.types.js";
import { getMemoryNotificationRepositoryForTests } from "../impound/impound.notifications.service.js";
import type { ImpoundRepository } from "../impound/impound.repository.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import { isIntakeComplete } from "../impound/impound.intake.js";
import { resolveTransition } from "../impound/impound.transitions.js";
import { AUCTION_MAX_ATTEMPTS } from "../jurisdiction/jurisdiction.defaults.js";
import { getMemoryReleaseRepositoryForTests } from "../release/release.service.js";
import type { ReleaseChargeBasis } from "../release/release.types.js";
import { isAuctionDeadlineReached, isOwnerInitialSatisfied } from "./auction.eligibility.js";
import { evaluateScrapEdictGate, findActiveSoldRound, isEdictComplete, isResalePending, isRoundNotNew, InMemoryAuctionRepository, type AuctionRepository } from "./auction.repository.js";
import { custodyDocumentationGap as resolveCustodyDocumentationGap } from "./auction.custody-documentation.js";
import {
  AuctionError,
  RECYCLABLE_CLASSIFICATIONS,
  type AuctionClassification,
  type AuctionEdict,
  type AuctionProfile,
  type AuctionStateSnapshot,
  type AuctionView,
  type RecordAttemptResult,
  type RecordSaleResult,
  type RegisterEdictResult,
} from "./auction.types.js";
import {
  isBelowMinBid,
  isPositiveMoney,
  parseBusinessDays,
  parseClassification,
  parseCustodySeq,
  parseNotes,
  parseOptionalLabel,
  parseOptionalMoney,
  parsePublishedAt,
  parseRequiredEdictReference,
  parseRequiredUuid,
  parseRoundNumber,
} from "./auction.validators.js";

type RawRecord = Record<string, unknown>;

// Ports injetados (testáveis por DI; espelha ReleaseChargeStatePort). O serviço ORQUESTRA a leitura das 4 fontes
// (perfil / trilha I6 / cadeia I2 / liberação em curso), computa as 6 flags e as injeta em TransitionInputs; as
// guardas de impound.transitions são PURAS.
export type AuctionProfilePort = (tenantId: string, processId: string) => Promise<AuctionProfile | undefined>;
export type AuctionNotificationsPort = (tenantId: string, processId: string) => Promise<readonly ProcessNotification[]>;
export type AuctionVerifyChainPort = (tenantId: string, processId: string) => Promise<VerifyChainResult | undefined>;
export type AuctionActiveReleasePort = (tenantId: string, processId: string) => Promise<boolean>;
export type AuctionCloseDailiesPort = (tenantId: string, processId: string, now: Date, actorId?: string) => Promise<AccrueProcessResult>;
export type AuctionChargeStatePort = (tenantId: string, processId: string, now: Date) => Promise<ReleaseChargeState | undefined>;
export type AuctionInspectionCompletePort = (tenantId: string, processId: string) => Promise<boolean>;
export type AuctionRemovalPostedPort = (tenantId: string, processId: string) => Promise<boolean>;

export class AuctionService {
  constructor(
    private readonly repository: AuctionRepository,
    private readonly impound: Pick<ImpoundRepository, "findProcessById" | "getIntakeState">,
    private readonly profile: AuctionProfilePort,
    private readonly notifications: AuctionNotificationsPort,
    private readonly verifyChainPort: AuctionVerifyChainPort,
    private readonly hasActiveRelease: AuctionActiveReleasePort,
    private readonly closeDailies: AuctionCloseDailiesPort,
    private readonly chargeState: AuctionChargeStatePort,
    private readonly inspectionComplete: AuctionInspectionCompletePort,
    private readonly removalPosted: AuctionRemovalPostedPort,
  ) {}

  // GET /impound-processes/:id/auction — tentativas + strikeCount derivado + editais designados (impound:read).
  async get(actor: { tenantId: string }, processId: string): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const snapshot = await this.repository.getState(actor.tenantId, normalizedId);
    if (!snapshot) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    return this.toView(snapshot);
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
    const eligibilityCustodyGap = await this.custodyDocumentationGap(actor.tenantId, process);
    if (eligibilityCustodyGap) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", eligibilityCustodyGap, "Custody documentation is incomplete for auction eligibility.");
    }
    await this.assertDebtsNotSettled(actor.tenantId, normalizedId, "auction_debts_settled", actor.userId);
    const eligibilityClosing = await this.closeDailies(actor.tenantId, normalizedId, now, actor.userId);
    if (eligibilityClosing.errors > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_unpostable", "Daily charges could not be posted for this process.");
    }
    const eligibilityChargeState = await this.chargeState(actor.tenantId, normalizedId, now);
    if (!eligibilityChargeState) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_gate_unresolved", "Charge state could not be resolved for this process; retry.");
    }
    if (eligibilityChargeState.dailyShortfall > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_missing", "Daily charges are still missing for this process; retry.");
    }
    const snapshot = await this.repository.markEligibleAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      actorId: actor.userId,
      occurredAt: now,
    });
    return this.toView(snapshot);
  }

  // POST /impound-processes/:id/auction/edicts — REGISTRO do edital da rodada (impound:transition). INSERT
  // auction_edicts + AUCTION_LOTTED na cadeia (PURO: NÃO transiciona; o edital é registrado com o processo em
  // AUCTION_ELIGIBLE). Idempotente por round_number. Em 13a NÃO aceita appraisal/min_bid (sigilosos art. 28 — 13b).
  async registerEdict(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<RegisterEdictResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    return this.repository.registerEdictAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      roundNumber: parseRoundNumber(body.round_number ?? body.roundNumber),
      classification: parseClassification(body.classification),
      // MÉDIO-A: edict_reference OBRIGATÓRIA (piso mínimo de designação REAL — barra o edital vazio/round nu).
      edictReference: parseRequiredEdictReference(body.edict_reference ?? body.edictReference),
      edictPlatform: parseOptionalLabel(body.edict_platform ?? body.edictPlatform, "edict_platform"),
      publishedAt: parsePublishedAt(body.published_at ?? body.publishedAt),
      auctioneerRef: parseOptionalLabel(body.auctioneer_ref ?? body.auctioneerRef, "auctioneer_ref"),
      pncpUrl: parseOptionalLabel(body.pncp_url ?? body.pncpUrl, "pncp_url", 500),
      businessDays: parseBusinessDays(body.business_days ?? body.businessDays),
      notes: parseNotes(body.notes),
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // POST /impound-processes/:id/auction/reclassify-scrap — RECICLAGEM por 2 strikes edict-backed (impound:transition).
  // ATO EXPLÍCITO (nunca efeito colateral do recordAttempt — R-omega5p-pr12-ciclo1; a sucata é IRREVERSÍVEL). O serviço
  // computa as 3 flags REAIS (COUNT strikes / edital-por-rodada / cadeia I2), chama resolveTransition (guardAuction
  // Reclassify PURA, 3 reasons 409 DISTINTOS) e, se passam, aciona reclassifyScrapAtomic (re-verifica sob FOR UPDATE,
  // expectedFrom=AUCTION_ELIGIBLE). setFrozenAt=true (T_stop §5). AUCTION_ELIGIBLE→DIRECT_RECYCLING.
  async reclassifyScrap(actor: { tenantId: string; userId?: string }, processId: string): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const [state, chain] = await Promise.all([
      this.repository.getState(actor.tenantId, normalizedId),
      this.verifyChainPort(actor.tenantId, normalizedId),
    ]);
    const desertedRounds = (state?.attempts ?? [])
      .filter((attempt) => attempt.outcome === "DESERTED")
      .map((attempt) => attempt.roundNumber);
    // MÉDIO-A: rodadas 1..maxAttempts SEQUENCIAIS com strike DESERTED + edital COMPLETO (ref+published_at+business_days>=15).
    const scrap = evaluateScrapEdictGate(desertedRounds, state?.edicts ?? [], AUCTION_MAX_ATTEMPTS);
    const gate = {
      strikesInsufficient: scrap.strikesInsufficient,
      edictMissingForRound: scrap.edictMissingForRound,
      edictIncompleteForRound: scrap.edictIncompleteForRound,
      chainBroken: !(chain?.valid === true),
    };
    const now = new Date();
    const decision = resolveTransition(process, "DIRECT_RECYCLING", { auctionReclassify: gate });
    const scrapThawed = await this.repository.thawLegacyFreezeAtomic(actor.tenantId, normalizedId);
    const scrapChargeBasis = await this.freezeChargeBasis(actor.tenantId, normalizedId, now, actor.userId);
    const snapshot = await this.repository.reclassifyScrapAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      maxAttempts: AUCTION_MAX_ATTEMPTS,
      chargeBasis: scrapChargeBasis,
      actorId: actor.userId,
      occurredAt: now,
    });
    return this.toView(snapshot);
  }

  // POST /impound-processes/:id/auction/reclassify-unrecoverable — RECICLAGEM por INSERVIBILIDADE (impound:transition,
  // §§16-18). ATO EXPLÍCITO. Guarda: classification ∈ {SCRAP, UNRECOVERABLE} (do body OU de um edital registrado) +
  // reason (fundamento) + sem liberação em curso. ACTIVE_CUSTODY→DIRECT_RECYCLING; setFrozenAt=true. O reason
  // (fundamento) é EXIGIDO pela guarda (reason_required) mas NÃO entra no payload da cadeia (§2.8 — a cadeia carrega
  // só o reason CODIFICADO unrecoverable_direct); vai ao audit best-effort (trilha interna do ato).
  async reclassifyUnrecoverable(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Classificação: do body OU de um edital registrado (art. §§16-18: "registrada"). reason parseado leniente (a
    // ORDEM dos 409 — classificação antes de reason — é decidida pela guarda PURA, não pelo parse).
    const bodyClassification = parseClassification(body.classification);
    const [classification, releaseInProgress, chain] = await Promise.all([
      bodyClassification !== undefined
        ? Promise.resolve(bodyClassification)
        : this.resolveRecyclableEdictClassification(actor.tenantId, normalizedId),
      this.hasActiveRelease(actor.tenantId, normalizedId),
      this.verifyChainPort(actor.tenantId, normalizedId),
    ]);
    const reason = parseNotes(body.reason);
    // MÉDIO-B: o inservível TAMBÉM re-verifica a cadeia I2 (o bem destruído precisa da prova íntegra, como a sucata).
    const gate = {
      classificationMissing: classification === undefined || !RECYCLABLE_CLASSIFICATIONS.includes(classification),
      releaseInProgress,
      chainBroken: !(chain?.valid === true),
    };
    const now = new Date();
    const decision = resolveTransition(process, "DIRECT_RECYCLING", { unrecoverable: gate, reason });
    const unrecoverableThawed = await this.repository.thawLegacyFreezeAtomic(actor.tenantId, normalizedId);
    const unrecoverableChargeBasis = await this.freezeChargeBasis(actor.tenantId, normalizedId, now, actor.userId);
    const snapshot = await this.repository.reclassifyUnrecoverableAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      chargeBasis: unrecoverableChargeBasis,
      actorId: actor.userId,
      occurredAt: now,
    });
    return this.toView(snapshot);
  }

  // Classificação recyclável (SCRAP/UNRECOVERABLE) resolvida a partir de um edital registrado (fallback quando não
  // vem no body). Devolve a primeira classificação recyclável encontrada, senão undefined.
  private async resolveRecyclableEdictClassification(tenantId: string, processId: string): Promise<AuctionClassification | undefined> {
    const edicts = await this.repository.listEdicts(tenantId, processId);
    return edicts
      .map((edict) => edict.classification)
      .find((classification): classification is AuctionClassification => classification !== undefined && RECYCLABLE_CLASSIFICATIONS.includes(classification));
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
    const roundNumber = parseRoundNumber(body.round_number ?? body.roundNumber);
    // Ω5P PR-13a — EDICT-GATE (fecha R-omega5p-pr12-ciclo1): um strike só conta com um certame REAL designado (edital
    // registrado) p/ a rodada. Pré-check early (409 claro p/ a UI); o repo RE-VERIFICA sob FOR UPDATE antes do INSERT.
    const edicts = await this.repository.listEdicts(actor.tenantId, normalizedId);
    if (!edicts.some((edict) => edict.roundNumber === roundNumber)) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_edict_missing", "An auction edict must be registered for this round before recording a deserted attempt.");
    }
    return this.repository.recordAttemptAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: "AUCTION_ELIGIBLE",
      roundNumber,
      notes: parseNotes(body.notes),
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // ── Ω5P PR-13b — máquina de VENDA ────────────────────────────────────────────────────────────────────────────
  // POST /impound-processes/:id/auction/appraisal (auction:appraise — SIGILO art. 28). Registra a AVALIAÇÃO +
  // min_bid na designação da rodada (UPDATE do edital; NUNCA na cadeia). Exige o edital registrado (404). Os valores
  // sigilosos só são LIDOS/gravados por quem tem auction:appraise (o guard da rota); o DTO os OMITE aos demais.
  async setAppraisal(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<AuctionEdict> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    return this.repository.setAppraisalAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      roundNumber: parseRoundNumber(body.round_number ?? body.roundNumber),
      appraisalAmount: parseOptionalMoney(body.appraisal_amount ?? body.appraisalAmount, "appraisal_amount"),
      minBidAmount: parseOptionalMoney(body.min_bid_amount ?? body.minBidAmount, "min_bid_amount"),
      actorId: actor.userId,
    });
  }

  // POST .../auction/prep (impound:transition). AUCTION_ELIGIBLE→AUCTION_PREP. Gate: classification=CONSERVED E
  // appraisal>0 (sigilosa, lida do edital da rodada). O serviço computa as flags e chama resolveTransition (guardAuctionPrep).
  async prepareForAuction(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const roundNumber = parseRoundNumber(body.round_number ?? body.roundNumber);
    const edict = await this.readRoundEdict(actor.tenantId, normalizedId, roundNumber);
    const gate = {
      classificationNotConserved: edict?.classification !== "CONSERVED",
      appraisalMissing: !isPositiveMoney(edict?.appraisalAmount),
    };
    const decision = resolveTransition(process, "AUCTION_PREP", { auctionPrep: gate });
    await this.assertDebtsNotSettled(actor.tenantId, normalizedId, "auction_debts_settled", actor.userId);
    const snapshot = await this.repository.prepareAuctionAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      roundNumber,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
    return this.toView(snapshot);
  }

  // POST .../auction/lot (impound:transition). AUCTION_PREP→LOTTED. Gate: edital COMPLETO da rodada (ref+published_at+
  // business_days>=15) E min_bid>0 (sigiloso).
  async lotForAuction(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const roundNumber = parseRoundNumber(body.round_number ?? body.roundNumber);
    const edict = await this.readRoundEdict(actor.tenantId, normalizedId, roundNumber);
    const gate = {
      edictIncomplete: edict === undefined || !isEdictComplete(edict),
      minBidMissing: !isPositiveMoney(edict?.minBidAmount),
    };
    const decision = resolveTransition(process, "LOTTED", { auctionLot: gate });
    const lotCustodyGap = await this.custodyDocumentationGap(actor.tenantId, process);
    if (lotCustodyGap) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", lotCustodyGap, "Custody documentation is incomplete for auction lotting.");
    }
    await this.assertDebtsNotSettled(actor.tenantId, normalizedId, "auction_debts_settled", actor.userId);
    const snapshot = await this.repository.lotAuctionAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      roundNumber,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
    return this.toView(snapshot);
  }

  // POST .../auction/sale (impound:transition). LOTTED→AUCTIONED (ARREMATE sem congelar; o congelamento é no fechamento). Gate: winner_ref
  // presente E sold_amount>=min_bid (piso r1>=avaliação/r2>=50% encodado no min_bid pelo avaliador) E nota presente.
  // Grava a linha SOLD (winner/soldAmount/noteRef) + AUCTION_SOLD na cadeia (soldAmount string). Idempotente por round.
  async recordSale(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<RecordSaleResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const roundNumber = parseRoundNumber(body.round_number ?? body.roundNumber);
    // Idempotência (evita o self-loop AUCTIONED→AUCTIONED numa reentrega): se a rodada já arrematou, devolve-a.
    if (process.status !== "LOTTED") {
      const state = await this.repository.getState(actor.tenantId, normalizedId);
      const existing = state?.attempts.find((attempt) => attempt.roundNumber === roundNumber);
      if (existing?.outcome === "SOLD") {
        return { attempt: existing, created: false, status: state?.status ?? process.status };
      }
    }
    const winnerRef = parseOptionalLabel(body.winner_ref ?? body.winnerRef, "winner_ref");
    const soldAmount = parseOptionalMoney(body.sold_amount ?? body.soldAmount, "sold_amount");
    const saleNoteReference = parseOptionalLabel(body.sale_note_reference ?? body.saleNoteReference, "sale_note_reference");
    const edict = await this.readRoundEdict(actor.tenantId, normalizedId, roundNumber);
    // CRÍTICO-1: as flags amarram a venda à rodada LOTADA e repetem PREP+LOT dessa rodada (o repo RE-VERIFICA sob lock).
    const gate = {
      winnerMissing: winnerRef === undefined,
      roundNotLotted: edict?.status !== "LOTTED",
      roundNotConserved: edict?.classification !== "CONSERVED",
      roundEdictIncomplete: edict === undefined || !isEdictComplete(edict),
      belowMinBid: isBelowMinBid(soldAmount, edict?.minBidAmount),
      noteMissing: saleNoteReference === undefined,
    };
    const decision = resolveTransition(process, "AUCTIONED", { auctionSale: gate });
    const saleCustodyGap = await this.custodyDocumentationGap(actor.tenantId, process);
    if (saleCustodyGap) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", saleCustodyGap, "Custody documentation is incomplete for auction sale.");
    }
    const saleThawed = await this.repository.thawLegacyFreezeAtomic(actor.tenantId, normalizedId);
    void saleThawed;
    const saleOccurredAt = new Date();
    const saleClosing = await this.closeDailies(actor.tenantId, normalizedId, saleOccurredAt, actor.userId);
    if (saleClosing.errors > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_unpostable", "Daily charges could not be posted for this process.");
    }
    const saleChargeState = await this.chargeState(actor.tenantId, normalizedId, saleOccurredAt);
    if (!saleChargeState) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_gate_unresolved", "Charge state could not be resolved for this process; retry.");
    }
    if (saleChargeState.dailyShortfall > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_missing", "Daily charges are still missing for this process; retry.");
    }
    return this.repository.recordSaleAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      roundNumber,
      winnerRef,
      soldAmount,
      saleNoteReference,
      actorId: actor.userId,
      occurredAt: saleOccurredAt,
    });
  }

  // POST .../auction/close (impound:transition). AUCTIONED→AUCTION_CLOSED (consumação: pagamento ≤3d + nota, art. 34).
  // A confirmação de pagamento é uma asserção do operador (payment_confirmed) — o pagamento é manual/externo (PD-SIGN).
  async closeAuction(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const roundNumber = parseRoundNumber(body.round_number ?? body.roundNumber);
    const paymentConfirmed = body.payment_confirmed === true || body.paymentConfirmed === true;
    const closeOccurredAt = new Date();
    const decision = resolveTransition(process, "AUCTION_CLOSED", { auctionClose: { paymentUnconfirmed: !paymentConfirmed } });
    const closeThawed = await this.repository.thawLegacyFreezeAtomic(actor.tenantId, normalizedId);
    const closeChargeBasis = await this.freezeChargeBasis(actor.tenantId, normalizedId, closeOccurredAt, actor.userId);
    const snapshot = await this.repository.closeAuctionAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      roundNumber,
      chargeBasis: closeChargeBasis,
      actorId: actor.userId,
      occurredAt: closeOccurredAt,
    });
    return this.toView(snapshot);
  }

  // POST .../auction/default (impound:transition). AUCTIONED→LOTTED (inadimplência art. 42). Limpa congelamento legado antes da reintegração. Registra
  // NO_PAYMENT (rodada de reintegração; a linha SOLD original permanece imutável) + STATUS_CHANGE default_reintegrated.
  async defaultAuction(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<RecordSaleResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const roundNumber = parseRoundNumber(body.round_number ?? body.roundNumber);
    // Idempotência: se a rodada de reintegração já tem NO_PAYMENT, devolve-a (evita o self-loop numa reentrega).
    if (process.status !== "AUCTIONED") {
      const state = await this.repository.getState(actor.tenantId, normalizedId);
      const existing = state?.attempts.find((attempt) => attempt.roundNumber === roundNumber);
      if (existing?.outcome === "NO_PAYMENT") {
        return { attempt: existing, created: false, status: state?.status ?? process.status };
      }
    }
    // MÉDIO-3: só inadimple se há uma SOLD EFETIVA (não já superada). O repo re-computa/vincula sob o lock.
    const state = await this.repository.getState(actor.tenantId, normalizedId);
    const gate = { saleMissing: findActiveSoldRound(state?.attempts ?? []) === undefined };
    const decision = resolveTransition(process, "LOTTED", { auctionDefault: gate });
    return this.repository.defaultAuctionAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      roundNumber,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // POST .../auction/reclaim (impound:transition). LOTTED→ACTIVE_CUSTODY (reclamado art. 26 §1º, antes da consumação).
  // reason (fundamento) obrigatório; reabre a liberação (PR-10). O reason livre vai ao audit; a cadeia leva o CODIFICADO.
  async reclaim(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const reason = parseNotes(body.reason);
    const reclaimExpectedSeq = parseCustodySeq(body.custody_seq ?? body.custodySeq);
    const reclaimReadingFresh = process.custodySeqHead === reclaimExpectedSeq;
    if (!reclaimReadingFresh) throw new AuctionError(409, "AUCTION_CONFLICT", "auction_reading_stale", "The auction reading is stale; reload and retry.");
    const decision = resolveTransition(process, "ACTIVE_CUSTODY", { auctionReclaim: { reasonMissing: reason === undefined }, reason });
    const snapshot = await this.repository.reclaimAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      expectedCustodySeq: reclaimExpectedSeq,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
    return this.toView(snapshot);
  }

  async relotForResale(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    const roundNumber = parseRoundNumber(body.round_number ?? body.roundNumber);
    const relotExpectedSeq = parseCustodySeq(body.custody_seq ?? body.custodySeq);
    const state = await this.repository.getState(actor.tenantId, normalizedId);
    if (!state) throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    const relotReadingFresh = state.custodySeqHead === relotExpectedSeq;
    if (!relotReadingFresh) throw new AuctionError(409, "AUCTION_CONFLICT", "auction_reading_stale", "The auction reading is stale; reload and retry.");
    // E1.3/E2.1.6 passo 3: a guarda da revenda pendente vem ANTES de qualquer gravação (descongelar, fechar diárias).
    const relotPending = isResalePending(state.status, state.attempts, state.edicts);
    if (!relotPending) {
      throw new AuctionError(409, "AUCTION_CONFLICT", "resale_not_pending", "This vehicle is not pending resale.");
    }
    const edict = state.edicts.find((candidate) => candidate.roundNumber === roundNumber);
    if (!edict || !isEdictComplete(edict)) throw new AuctionError(409, "AUCTION_GUARD_FAILED", "lot_edict_incomplete", "Lotting requires a complete round edict.");
    if (edict.classification !== "CONSERVED") throw new AuctionError(409, "AUCTION_GUARD_FAILED", "prep_classification_not_conserved", "Lotting requires a conserved vehicle.");
    if (!isPositiveMoney(edict.appraisalAmount)) throw new AuctionError(409, "AUCTION_GUARD_FAILED", "prep_appraisal_missing", "Lotting requires an appraisal.");
    if (!isPositiveMoney(edict.minBidAmount)) throw new AuctionError(409, "AUCTION_GUARD_FAILED", "lot_min_bid_missing", "Lotting requires a minimum bid.");
    if (isRoundNotNew(state.attempts, roundNumber)) throw new AuctionError(409, "AUCTION_CONFLICT", "resale_round_not_new", "A resale must use a round newer than every recorded outcome.");
    const relotCustodyGap = await this.custodyDocumentationGap(actor.tenantId, process);
    if (relotCustodyGap) throw new AuctionError(409, "AUCTION_GUARD_FAILED", relotCustodyGap, "Custody documentation is incomplete for auction relotting.");
    const relotOccurredAt = new Date();
    const thawed = await this.repository.thawLegacyFreezeAtomic(actor.tenantId, normalizedId);
    void thawed;
    const relotClosing = await this.closeDailies(actor.tenantId, normalizedId, relotOccurredAt, actor.userId);
    if (relotClosing.errors > 0) throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_unpostable", "Daily charges could not be posted for this process.");
    const chargeState = await this.chargeState(actor.tenantId, normalizedId, relotOccurredAt);
    if (!chargeState) throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_gate_unresolved", "Charge state could not be resolved for this process; retry.");
    if (chargeState.dailyShortfall > 0) throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_missing", "Daily charges are still missing for this process; retry.");
    if (chargeState.debtsSettled) throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_debts_settled", "Auction flow is blocked while debts are fully settled.");
    const snapshot = await this.repository.relotAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: "LOTTED",
      roundNumber,
      expectedCustodySeq: relotExpectedSeq + relotClosing.accrued,
      actorId: actor.userId,
      occurredAt: relotOccurredAt,
    });
    return this.toView(snapshot);
  }

  async withdrawSettled(actor: { tenantId: string; userId?: string }, processId: string, _body: RawRecord): Promise<AuctionView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new AuctionError(404, "AUCTION_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (process.status !== "AUCTION_ELIGIBLE" && process.status !== "AUCTION_PREP") {
      throw new AuctionError(409, "AUCTION_CONFLICT", "invalid_transition", "The requested transition is not allowed for the current state.");
    }
    await this.assertDebtsSettled(actor.tenantId, normalizedId);
    const snapshot = await this.repository.withdrawSettledAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: process.status,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
    return this.toView(snapshot);
  }

  private async assertDebtsNotSettled(tenantId: string, processId: string, reason: string, actorId?: string): Promise<void> {
    const now = new Date();
    const closing = await this.closeDailies(tenantId, processId, now, actorId);
    if (closing.errors > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_unpostable", "Daily charges could not be posted for this process.");
    }
    const state = await this.chargeState(tenantId, processId, now);
    if (!state) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_gate_unresolved", "Charge state could not be resolved for this process; retry.");
    }
    if (state.dailyShortfall > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_missing", "Daily charges are still missing for this process; retry.");
    }
    if (state.debtsSettled) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", reason, "Auction flow is blocked while debts are fully settled.");
    }
  }

  private async assertDebtsSettled(tenantId: string, processId: string): Promise<void> {
    const state = await this.chargeState(tenantId, processId, new Date());
    if (!state) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_gate_unresolved", "Charge state could not be resolved for this process; retry.");
    }
    if (!state.debtsSettled) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_withdraw_not_settled", "Auction withdrawal requires all custody debts settled.");
    }
  }

  private async custodyDocumentationGap(
    tenantId: string,
    process: { readonly id: string; readonly yardId?: string },
  ): Promise<string | undefined> {
    const [inspectionComplete, removalPosted] = await Promise.all([
      this.inspectionComplete(tenantId, process.id),
      this.removalPosted(tenantId, process.id),
    ]);
    return resolveCustodyDocumentationGap({
      inspectionComplete,
      yardAssigned: process.yardId !== undefined,
      removalPosted,
    });
  }

  private async freezeChargeBasis(
    tenantId: string,
    processId: string,
    occurredAt: Date,
    actorId?: string,
  ): Promise<ReleaseChargeBasis> {
    const freezeClosing = await this.closeDailies(tenantId, processId, occurredAt, actorId);
    if (freezeClosing.errors > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_unpostable", "Daily charges could not be posted for this process.");
    }
    const freezeChargeState = await this.chargeState(tenantId, processId, occurredAt);
    if (!freezeChargeState) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_gate_unresolved", "Charge state could not be resolved for this process; retry.");
    }
    if (freezeChargeState.dailyShortfall > 0) {
      throw new AuctionError(409, "AUCTION_GUARD_FAILED", "auction_daily_charges_missing", "Daily charges are still missing for this process; retry.");
    }
    return {
      expectedDailyCount: freezeChargeState.nAccrueAtFreeze,
      enteredAt: freezeChargeState.enteredAt ?? null,
      frozenAt: occurredAt,
    };
  }

  // O edital de uma rodada (metadados + SIGILOSOS appraisal/min_bid) p/ o gate da venda. undefined se ausente.
  private async readRoundEdict(tenantId: string, processId: string, roundNumber: number): Promise<AuctionEdict | undefined> {
    const edicts = await this.repository.listEdicts(tenantId, processId);
    return edicts.find((edict) => edict.roundNumber === roundNumber);
  }

  private toView(snapshot: AuctionStateSnapshot): AuctionView {
    return {
      attempts: snapshot.attempts,
      edicts: snapshot.edicts,
      strikeCount: snapshot.attempts.filter((attempt) => attempt.outcome === "DESERTED").length,
      maxAttempts: AUCTION_MAX_ATTEMPTS,
      status: snapshot.status,
      resalePending: isResalePending(snapshot.status, snapshot.attempts, snapshot.edicts),
      custodySeq: snapshot.custodySeqHead,
    };
  }
}

// ── runtime (env-gate memory×prisma), espelha release.service.ts / impound.notifications.service.ts ─────────────
const memoryAuctionRepository = new InMemoryAuctionRepository(
  getMemoryImpoundRepositoryForTests(),
  (tenantId, processId) => getMemoryReleaseRepositoryForTests().hasActiveRelease(tenantId, processId),
);
const memoryChargeService = createMemoryChargeService();
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
    (tenantId, processId, now, actorId) => memoryChargeService.accrueProcess(tenantId, processId, now, actorId),
    (tenantId, processId, now) => memoryChargeService.getReleaseChargeState(tenantId, processId, now),
    async (tenantId, processId) => {
      const state = await getMemoryImpoundRepositoryForTests().getIntakeState(tenantId, processId);
      if (!state) return false;
      return isIntakeComplete(state.inspection, state.storedSets, state.profileRequiredSets ?? []);
    },
    async (tenantId, processId) => {
      const statement = await memoryChargeService.getStatement({ tenantId, userId: "system", roles: [], permissions: [] }, processId);
      return statement.lines.some((line) => line.kind === "REMOVAL");
    },
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
  const { createDefaultChargeService } = await import("../charging/charge.service.js");
  const [repository, impound, ports, charge] = await Promise.all([
    createPrismaAuctionRepository(),
    createPrismaImpoundRepository(),
    createPrismaAuctionPorts(),
    createDefaultChargeService(),
  ]);
  return new AuctionService(
    repository,
    impound,
    ports.profile,
    ports.notifications,
    ports.verifyChain,
    ports.hasActiveRelease,
    (tenantId, processId, now, actorId) => charge.accrueProcess(tenantId, processId, now, actorId),
    (tenantId, processId, now) => charge.getReleaseChargeState(tenantId, processId, now),
    ports.inspectionComplete,
    ports.removalPosted,
  );
}
