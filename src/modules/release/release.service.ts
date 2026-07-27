import { env } from "../../config/env.js";
import { createMemoryChargeService } from "../charging/charge.service.js";
import type { ReleaseChargeState } from "../charging/charge.types.js";
import type { ImpoundRepository } from "../impound/impound.repository.js";
import { getMemoryImpoundRepositoryForTests } from "../impound/impound.service.js";
import { resolveTransition } from "../impound/impound.transitions.js";
import type { CanonicalValue } from "../impound/impound.types.js";
import { getMemoryYardRepositoryForTests } from "../yard/yard.service.js";
import { InMemoryReleaseRepository, type ReleaseRepository } from "./release.repository.js";
import {
  ReleaseError,
  type ImpoundRelease,
  type ReleaseRequirementCheck,
  type ReleaseView,
} from "./release.types.js";
import {
  maskAuthorityReference,
  optionalString,
  parseAuthorityReference,
  parseOptionalUuid,
  parseRecipientDocument,
  parseRecipientName,
  parseRecipientRelationship,
  parseRequiredUuid,
  parseRequirementCode,
  parseSatisfied,
} from "./release.validators.js";

type RawRecord = Record<string, unknown>;

// Port do estado do ledger p/ o gate I5 (dono = charging). Injetado no runtime; testável por DI.
export type ReleaseChargeStatePort = (tenantId: string, processId: string) => Promise<ReleaseChargeState | undefined>;

export class ReleaseService {
  constructor(
    private readonly repository: ReleaseRepository,
    private readonly impound: Pick<ImpoundRepository, "findProcessById">,
    private readonly chargeState: ReleaseChargeStatePort,
  ) {}

  // GET /impound-processes/:id/release — a liberação EM CURSO + checklist (impound:read).
  async get(actor: { tenantId: string }, processId: string): Promise<ReleaseView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const view = await this.repository.getActiveReleaseView(actor.tenantId, normalizedId);
    if (!view) {
      throw new ReleaseError(404, "RELEASE_NOT_FOUND", "release_not_found", "No release in progress for this process.");
    }
    return view;
  }

  // POST /impound-processes/:id/release/start — SALTO A (release:process): abre a liberação + freeze T_stop.
  // Snapshot dos requisitos do perfil (I9). Gate-start: sem liberação em curso + freeze NÃO-retroativo.
  async start(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<ReleaseView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Checagem app do anti-dupla-liberação ANTES da FSM (o partial-unique é o backstop de DB sob corrida). Fica
    // aqui — e não só na guarda — porque, aberta uma liberação, o processo já é RELEASE_IN_PROGRESS e o portão 1
    // (legalidade) barraria com invalid_transition antes da guarda ver o alreadyInProgress. Reason correto p/ a UI.
    const alreadyInProgress = await this.repository.hasActiveRelease(actor.tenantId, normalizedId);
    if (alreadyInProgress) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_already_in_progress", "A release is already in progress for this process.");
    }
    const chargeState = await this.chargeState(actor.tenantId, normalizedId);
    // freeze-retroactive: congelar em now estranharia DAILYs já acumuladas cujo período termina depois de now.
    const freezeRetroactive = chargeState ? chargeState.nDueNow < chargeState.persistedDailyCount : false;

    // resolveTransition = portão 1 (legalidade ACTIVE_CUSTODY→RELEASE_IN_PROGRESS) + guardReleaseStart (PURA).
    const decision = resolveTransition(process, "RELEASE_IN_PROGRESS", {
      releaseStart: { alreadyInProgress, freezeRetroactive },
    });

    const requirements = (await this.repository.loadReleaseRequirements(actor.tenantId, normalizedId)) ?? [];
    return this.repository.startReleaseAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      expectedFrom: decision.from,
      kind: "STANDARD", // PR-10a: caminho padrão. FOR_REPAIR = PR-10b.
      requirements,
      recipientName: parseRecipientName(body.recipient_name ?? body.recipientName),
      recipientDocument: parseRecipientDocument(body.recipient_document ?? body.recipientDocument),
      recipientRelationship: parseRecipientRelationship(body.recipient_relationship ?? body.recipientRelationship),
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // POST /impound-processes/:id/release/recipient — quem retira (release:process).
  async setRecipient(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<ImpoundRelease> {
    const view = await this.get(actor, processId);
    return this.repository.setRecipient({
      tenantId: actor.tenantId,
      releaseId: view.release.id,
      recipientName: parseRecipientName(body.recipient_name ?? body.recipientName),
      recipientDocument: parseRecipientDocument(body.recipient_document ?? body.recipientDocument),
      recipientRelationship: parseRecipientRelationship(body.recipient_relationship ?? body.recipientRelationship),
      actorId: actor.userId,
    });
  }

  // POST /impound-processes/:id/release/checks — marca UM requisito do checklist (release:process).
  async setRequirement(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<ReleaseRequirementCheck> {
    const view = await this.get(actor, processId);
    return this.repository.setRequirementCheck({
      tenantId: actor.tenantId,
      releaseId: view.release.id,
      code: parseRequirementCode(body.code),
      satisfied: parseSatisfied(body.satisfied),
      note: optionalString(body.note, 500),
      attachmentId: parseOptionalUuid(body.attachment_id ?? body.attachmentId, "attachmentId"),
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // POST /impound-processes/:id/release/approve — ATO DA AUTORIDADE (release:approve, D-Ω5P-12). Idempotente.
  async approve(actor: { tenantId: string; userId?: string }, processId: string, body: RawRecord): Promise<ImpoundRelease> {
    const view = await this.get(actor, processId);
    return this.repository.approve({
      tenantId: actor.tenantId,
      releaseId: view.release.id,
      authorityReference: parseAuthorityReference(body.authority_reference ?? body.authorityReference),
      authorityNote: optionalString(body.authority_note ?? body.authorityNote, 500),
      actorId: actor.userId,
    });
  }

  // POST /impound-processes/:id/release/consume — SALTO B (impound:transition): consuma a liberação (I5 real).
  // As 5 pré-condições viram flags; resolveTransition (guardReleaseGate PURA) lança o 409 DISTINTO; a consumação
  // RE-VERIFICA sob lock e aplica o efeito atômico (RELEASE + release COMPLETED + vacate).
  async consume(actor: { tenantId: string; userId?: string }, processId: string): Promise<ReleaseView> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const process = await this.impound.findProcessById(actor.tenantId, normalizedId);
    if (!process) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    const view = await this.repository.getActiveReleaseView(actor.tenantId, normalizedId);
    if (!view) {
      throw new ReleaseError(404, "RELEASE_NOT_FOUND", "release_not_found", "No release in progress for this process.");
    }
    const chargeState = await this.chargeState(actor.tenantId, normalizedId);

    const debtsUnsettled = chargeState ? !chargeState.debtsSettled : false;
    const reconciliationPending = chargeState ? !chargeState.reconciliationConsistent : false;
    const requirementUnmet = view.checks.some((check) => check.required && !check.satisfied);
    const authorityMissing = view.release.authorityApprovedAt === undefined;
    const recipientMissing = !view.release.recipientName;

    // resolveTransition = portão 1 (RELEASE_IN_PROGRESS→RELEASED) + guardReleaseGate (PURA; 5 reasons distintos).
    const decision = resolveTransition(process, "RELEASED", {
      releaseGate: { debtsUnsettled, reconciliationPending, requirementUnmet, authorityMissing, recipientMissing },
    });

    const occurredAt = new Date();
    const settledTotal = chargeState?.settledTotal ?? "0.00";
    // Snapshot RELEASE §2.8: só refs/hashes/valores-string. ZERO CPF/nome/token do proprietário.
    const eventPayload: CanonicalValue = {
      event: "RELEASE",
      releaseId: view.release.id,
      authorityApprovalRef: maskAuthorityReference(view.release.authorityReference),
      settledTotal,
      requirementCodes: view.checks.filter((check) => check.required).map((check) => check.code).sort(),
      enteredAt: process.enteredAt ? process.enteredAt.toISOString() : null,
      releasedAt: occurredAt.toISOString(),
    };
    return this.repository.consumeReleaseAtomic({
      tenantId: actor.tenantId,
      processId: normalizedId,
      releaseId: view.release.id,
      expectedFrom: decision.from,
      settledTotal,
      overAccruedDailyIds: chargeState?.overAccruedDailyIds ?? [],
      eventPayload,
      actorId: actor.userId,
      occurredAt,
    });
  }
}

// ── runtime (env-gate memory×prisma), espelha charge.service.ts / impound.notifications.service.ts ──────────────
const memoryReleaseRepository = new InMemoryReleaseRepository(getMemoryImpoundRepositoryForTests(), getMemoryYardRepositoryForTests());
const memoryChargeService = createMemoryChargeService();
let defaultReleaseServicePromise: Promise<ReleaseService> | undefined;

export function createMemoryReleaseService(): ReleaseService {
  return new ReleaseService(
    memoryReleaseRepository,
    getMemoryImpoundRepositoryForTests(),
    (tenantId, processId) => memoryChargeService.getReleaseChargeState(tenantId, processId),
  );
}

export function getMemoryReleaseRepositoryForTests(): InMemoryReleaseRepository {
  return memoryReleaseRepository;
}

export async function createDefaultReleaseService(): Promise<ReleaseService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryReleaseService();
  }
  defaultReleaseServicePromise ??= createPrismaReleaseService();
  return defaultReleaseServicePromise;
}

export function resetReleaseRuntimeForTests(): void {
  memoryReleaseRepository.reset();
  defaultReleaseServicePromise = undefined;
}

async function createPrismaReleaseService(): Promise<ReleaseService> {
  const { createPrismaReleaseRepository } = await import("./release-prisma.repository.js");
  const { createPrismaImpoundRepository } = await import("../impound/impound-prisma.repository.js");
  const { createDefaultChargeService } = await import("../charging/charge.service.js");
  const [repository, impound, chargeService] = await Promise.all([
    createPrismaReleaseRepository(),
    createPrismaImpoundRepository(),
    createDefaultChargeService(),
  ]);
  return new ReleaseService(repository, impound, (tenantId, processId) => chargeService.getReleaseChargeState(tenantId, processId));
}
