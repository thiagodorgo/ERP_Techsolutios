import { randomUUID } from "node:crypto";

import type { ImpoundRepository } from "../impound/impound.repository.js";
import type { YardRepository } from "../yard/yard.repository.js";
import {
  ReleaseError,
  type ApproveReleaseInput,
  type ConsumeReleaseInput,
  type ExitForRepairInput,
  type ImpoundRelease,
  type ReleaseRequirementCheck,
  type ReleaseView,
  type RequirementSnapshot,
  type ReturnFromRepairInput,
  type SetRecipientInput,
  type SetRequirementCheckInput,
  type StartForRepairInput,
  type StartReleaseInput,
} from "./release.types.js";

// Deps compostas (release DEPENDE de impound+yard; jamais o contrário). Só os métodos usados — sem acoplar o resto.
export type ReleaseImpoundDep = Pick<ImpoundRepository, "findProcessById" | "applyTransition">;
export type ReleaseYardDep = Pick<YardRepository, "listSpotsByYard" | "vacate">;

export interface ReleaseRepository {
  // Requisitos do perfil (para o SNAPSHOT no start — I9). Prisma lê jurisdiction_profiles; InMemory injeta por teste.
  loadReleaseRequirements(tenantId: string, processId: string): Promise<readonly RequirementSnapshot[] | undefined>;
  // Liberação EM CURSO (IN_PROGRESS|AUTHORIZED) do processo + seus checks.
  getActiveReleaseView(tenantId: string, processId: string): Promise<ReleaseView | undefined>;
  hasActiveRelease(tenantId: string, processId: string): Promise<boolean>;
  findReleaseById(tenantId: string, releaseId: string): Promise<ImpoundRelease | undefined>;
  // Salto A ATÔMICO: cria a liberação (IN_PROGRESS) + snapshot dos checks + transiciona o processo
  // (ACTIVE_CUSTODY→RELEASE_IN_PROGRESS, setFrozenAt=T_stop) + STATUS_CHANGE na cadeia — tudo numa operação.
  startReleaseAtomic(input: StartReleaseInput): Promise<ReleaseView>;
  setRecipient(input: SetRecipientInput): Promise<ImpoundRelease>;
  setRequirementCheck(input: SetRequirementCheckInput): Promise<ReleaseRequirementCheck>;
  approve(input: ApproveReleaseInput): Promise<ImpoundRelease>;
  // Salto B ATÔMICO: RE-VERIFICA o gate I5 sob lock + append RELEASE + status=RELEASED + release COMPLETED + vacate.
  consumeReleaseAtomic(input: ConsumeReleaseInput): Promise<ReleaseView>;
  // Ω5P PR-10b — SAÍDA p/ reparo (art. 271 §2º). Cria o dossiê FOR_REPAIR (IN_PROGRESS) SEM transicionar (montar).
  startForRepairDossier(input: StartForRepairInput): Promise<ReleaseView>;
  // Ω5P PR-10b — SAÍDA atômica: lock + re-verifica (aprovação+recipient+deadline) + status=RELEASED_FOR_REPAIR
  // (frozen_at INTACTO — D-Ω5P-REL-07) + STATUS_CHANGE + vacate. Dossiê permanece AUTHORIZED (ativo até o retorno).
  exitForRepairAtomic(input: ExitForRepairInput): Promise<ReleaseView>;
  // Ω5P PR-10b — RETORNO atômico: lock + status=ACTIVE_CUSTODY (não congela) + STATUS_CHANGE + dossiê→RETURNED.
  returnFromRepairAtomic(input: ReturnFromRepairInput): Promise<ReleaseView>;
  reset?(): void;
}

const ACTIVE_STATUSES = new Set(["IN_PROGRESS", "AUTHORIZED"]);

// InMemory (espelha a lógica do Prisma repo 1:1; a corrida/atomicidade REAL roda no teste DB-gated). Compõe o
// impound repo de MEMÓRIA (ler o processo + transicionar/encadear a cadeia) e o yard repo de MEMÓRIA (vacate da
// vaga na consumação). Perfis/requisitos são injetados por teste.
export class InMemoryReleaseRepository implements ReleaseRepository {
  private readonly releases: ImpoundRelease[] = [];
  private readonly checks: ReleaseRequirementCheck[] = [];
  private readonly profileRequirements = new Map<string, readonly RequirementSnapshot[]>();

  constructor(
    private readonly impound: ReleaseImpoundDep,
    private readonly yard: ReleaseYardDep,
  ) {}

  async loadReleaseRequirements(tenantId: string, processId: string): Promise<readonly RequirementSnapshot[] | undefined> {
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process) return undefined;
    return this.profileRequirements.get(`${tenantId}:${process.profileId}`) ?? [];
  }

  async getActiveReleaseView(tenantId: string, processId: string): Promise<ReleaseView | undefined> {
    const release = this.releases.find(
      (item) => item.tenantId === tenantId && item.processId === processId && ACTIVE_STATUSES.has(item.status),
    );
    if (!release) return undefined;
    return { release, checks: this.checksFor(tenantId, release.id) };
  }

  async hasActiveRelease(tenantId: string, processId: string): Promise<boolean> {
    return (await this.getActiveReleaseView(tenantId, processId)) !== undefined;
  }

  async findReleaseById(tenantId: string, releaseId: string): Promise<ImpoundRelease | undefined> {
    return this.releases.find((item) => item.tenantId === tenantId && item.id === releaseId);
  }

  async startReleaseAtomic(input: StartReleaseInput): Promise<ReleaseView> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    // Anti-dupla-liberação (backstop app; o partial-unique é o backstop de DB no Prisma).
    if (await this.hasActiveRelease(input.tenantId, input.processId)) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_already_in_progress", "A release is already in progress for this process.");
    }
    const now = new Date();
    const release: ImpoundRelease = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      kind: input.kind,
      status: "IN_PROGRESS",
      recipientName: input.recipientName,
      recipientDocument: input.recipientDocument,
      recipientRelationship: input.recipientRelationship,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.releases.push(release);
    for (const requirement of input.requirements) {
      this.checks.push({
        id: randomUUID(),
        tenantId: input.tenantId,
        releaseId: release.id,
        code: requirement.code,
        label: requirement.label,
        required: requirement.required,
        satisfied: false,
        createdAt: now,
        updatedAt: now,
      });
    }
    // Salto A: freeze T_stop + STATUS_CHANGE na cadeia (single-thread ⇒ atômico; a atomicidade REAL = 1 tx Postgres).
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "RELEASE_IN_PROGRESS",
      setEnteredAt: false,
      setFrozenAt: true,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: input.expectedFrom, to: "RELEASE_IN_PROGRESS", reason: "release_started" },
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      },
    });
    return { release, checks: this.checksFor(input.tenantId, release.id) };
  }

  async setRecipient(input: SetRecipientInput): Promise<ImpoundRelease> {
    const index = this.requireActiveIndex(input.tenantId, input.releaseId);
    const current = this.releases[index];
    const apply = (field: string | undefined, patch: string | undefined): string | undefined =>
      patch === undefined ? field : patch;
    const updated: ImpoundRelease = {
      ...current,
      recipientName: apply(current.recipientName, input.recipientName),
      recipientDocument: apply(current.recipientDocument, input.recipientDocument),
      recipientRelationship: input.recipientRelationship ?? current.recipientRelationship,
      updatedBy: input.actorId ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.releases[index] = updated;
    return updated;
  }

  async setRequirementCheck(input: SetRequirementCheckInput): Promise<ReleaseRequirementCheck> {
    this.requireActiveIndex(input.tenantId, input.releaseId); // 404/409 se não existe/consumada
    const index = this.checks.findIndex(
      (check) => check.tenantId === input.tenantId && check.releaseId === input.releaseId && check.code === input.code,
    );
    if (index < 0) {
      throw new ReleaseError(404, "RELEASE_REQUIREMENT_NOT_FOUND", "requirement_not_found", "The requirement was not found in this release checklist.");
    }
    const updated: ReleaseRequirementCheck = {
      ...this.checks[index],
      satisfied: input.satisfied,
      note: input.note ?? this.checks[index].note,
      attachmentId: input.attachmentId ?? this.checks[index].attachmentId,
      checkedBy: input.actorId,
      checkedAt: input.satisfied ? input.occurredAt : undefined,
      updatedAt: new Date(),
    };
    this.checks[index] = updated;
    return updated;
  }

  async approve(input: ApproveReleaseInput): Promise<ImpoundRelease> {
    const index = this.requireActiveIndex(input.tenantId, input.releaseId);
    const current = this.releases[index];
    // Idempotência (2ª aprovação = no-op): mantém authorityApprovedAt/By ORIGINAIS (não sobrescreve, não duplica).
    if (current.authorityApprovedAt) {
      return current;
    }
    const updated: ImpoundRelease = {
      ...current,
      status: "AUTHORIZED",
      authorityApprovedBy: input.actorId,
      authorityApprovedAt: new Date(),
      authorityReference: input.authorityReference ?? current.authorityReference,
      authorityNote: input.authorityNote ?? current.authorityNote,
      updatedBy: input.actorId ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.releases[index] = updated;
    return updated;
  }

  async consumeReleaseAtomic(input: ConsumeReleaseInput): Promise<ReleaseView> {
    const index = this.requireActiveIndex(input.tenantId, input.releaseId);
    const release = this.releases[index];
    // RE-VERIFICAÇÃO do gate I5 sob "lock" (single-thread). O charging-side (débitos/reconciliação) foi checado
    // pelo serviço via resolveTransition imediatamente antes (single-thread ⇒ sem TOCTOU; a re-verificação
    // DB-authoritative do charging-side vive no Prisma repo). Aqui re-checa o release-side (autoridade/quem-retira/
    // requisitos) do próprio store.
    if (!release.authorityApprovedAt) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_authority_missing", "The authority release must be registered before release.");
    }
    if (!release.recipientName) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_recipient_missing", "The person receiving the vehicle must be identified before release.");
    }
    const unmet = this.checksFor(input.tenantId, release.id).some((check) => check.required && !check.satisfied);
    if (unmet) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_requirement_unmet", "All required release checklist items must be satisfied.");
    }
    // Efeito atômico (single-thread): append RELEASE + status=RELEASED (via applyTransition com event RELEASE) +
    // release COMPLETED + vacate da vaga.
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "RELEASED",
      setEnteredAt: false,
      setFrozenAt: false,
      event: { type: "RELEASE", payload: input.eventPayload, occurredAt: input.occurredAt, actorId: input.actorId },
    });
    const completed: ImpoundRelease = {
      ...release,
      status: "COMPLETED",
      releasedAt: input.occurredAt,
      settledTotal: input.settledTotal,
      updatedBy: input.actorId ?? release.updatedBy,
      updatedAt: new Date(),
    };
    this.releases[index] = completed;
    await this.vacateProcessSpot(input.tenantId, input.processId, input.actorId);
    return { release: completed, checks: this.checksFor(input.tenantId, release.id) };
  }

  // Ω5P PR-10b — MONTAR o dossiê FOR_REPAIR (IN_PROGRESS) sem transicionar. Sem checklist (FOR_REPAIR não exige
  // requisitos). O partial-unique (Prisma) barra 2 liberações em curso; aqui o backstop app é hasActiveRelease.
  async startForRepairDossier(input: StartForRepairInput): Promise<ReleaseView> {
    const process = await this.impound.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ReleaseError(404, "RELEASE_PROCESS_NOT_FOUND", "process_not_found", "Custody process was not found.");
    }
    if (await this.hasActiveRelease(input.tenantId, input.processId)) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_already_in_progress", "A release is already in progress for this process.");
    }
    const now = new Date();
    const release: ImpoundRelease = {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      kind: "FOR_REPAIR",
      status: "IN_PROGRESS",
      recipientName: input.recipientName,
      recipientDocument: input.recipientDocument,
      recipientRelationship: input.recipientRelationship,
      repairDeadline: input.repairDeadline,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.releases.push(release);
    return { release, checks: [] };
  }

  // Ω5P PR-10b — SAÍDA p/ reparo (I5 parcial, art. 271 §2º). RE-VERIFICA (aprovação+recipient+deadline) sob "lock"
  // single-thread + transiciona ACTIVE_CUSTODY→RELEASED_FOR_REPAIR SEM congelar (setFrozenAt=false — D-Ω5P-REL-07:
  // a diária SEGUE correndo) + STATUS_CHANGE + vacate. NÃO exige débitos/reconciliação/checklist (diferidos ao §1º).
  async exitForRepairAtomic(input: ExitForRepairInput): Promise<ReleaseView> {
    const index = this.requireActiveIndex(input.tenantId, input.releaseId);
    const release = this.releases[index];
    if (release.kind !== "FOR_REPAIR") {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_kind_mismatch", "This release is not a for-repair release.");
    }
    if (!release.repairDeadline) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "repair_deadline_invalid", "A valid repair deadline is required to release the vehicle for repair.");
    }
    if (!release.authorityApprovedAt) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_authority_missing", "The authority release must be registered before releasing the vehicle for repair.");
    }
    if (!release.recipientName) {
      throw new ReleaseError(409, "RELEASE_GUARD_FAILED", "release_recipient_missing", "The person transporting the vehicle must be identified before releasing it for repair.");
    }
    // Transição SEM congelamento (setFrozenAt=false). O dossiê permanece AUTHORIZED (ativo até o retorno).
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "RELEASED_FOR_REPAIR",
      setEnteredAt: false,
      setFrozenAt: false,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: input.expectedFrom, to: "RELEASED_FOR_REPAIR", reason: "released_for_repair" },
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      },
    });
    const updated: ImpoundRelease = { ...release, updatedBy: input.actorId ?? release.updatedBy, updatedAt: new Date() };
    this.releases[index] = updated;
    await this.vacateProcessSpot(input.tenantId, input.processId, input.actorId);
    return { release: updated, checks: this.checksFor(input.tenantId, release.id) };
  }

  // Ω5P PR-10b — RETORNO do reparo. Transiciona RELEASED_FOR_REPAIR→ACTIVE_CUSTODY SEM congelar + STATUS_CHANGE +
  // dossiê→RETURNED (libera o partial-unique p/ a restituição definitiva via caminho padrão). Realocação de vaga =
  // endpoint EXISTENTE (não é desta transição).
  async returnFromRepairAtomic(input: ReturnFromRepairInput): Promise<ReleaseView> {
    const index = this.requireActiveIndex(input.tenantId, input.releaseId);
    const release = this.releases[index];
    if (release.kind !== "FOR_REPAIR") {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_kind_mismatch", "This release is not a for-repair release.");
    }
    await this.impound.applyTransition({
      tenantId: input.tenantId,
      processId: input.processId,
      expectedFrom: input.expectedFrom,
      to: "ACTIVE_CUSTODY",
      setEnteredAt: false,
      setFrozenAt: false,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: input.expectedFrom, to: "ACTIVE_CUSTODY", reason: "returned_from_repair" },
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      },
    });
    const returned: ImpoundRelease = { ...release, status: "RETURNED", updatedBy: input.actorId ?? release.updatedBy, updatedAt: new Date() };
    this.releases[index] = returned;
    return { release: returned, checks: this.checksFor(input.tenantId, release.id) };
  }

  // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────────
  private checksFor(tenantId: string, releaseId: string): readonly ReleaseRequirementCheck[] {
    return this.checks
      .filter((check) => check.tenantId === tenantId && check.releaseId === releaseId)
      .sort((left, right) => left.code.localeCompare(right.code));
  }

  private requireActiveIndex(tenantId: string, releaseId: string): number {
    const index = this.releases.findIndex((item) => item.tenantId === tenantId && item.id === releaseId);
    if (index < 0) {
      throw new ReleaseError(404, "RELEASE_NOT_FOUND", "release_not_found", "The release was not found for this tenant.");
    }
    if (!ACTIVE_STATUSES.has(this.releases[index].status)) {
      throw new ReleaseError(409, "RELEASE_CONFLICT", "release_not_active", "The release is no longer in progress.");
    }
    return index;
  }

  private async vacateProcessSpot(tenantId: string, processId: string, actorId?: string): Promise<void> {
    const process = await this.impound.findProcessById(tenantId, processId);
    if (!process?.yardId) return;
    const spots = await this.yard.listSpotsByYard({ tenantId, yardId: process.yardId });
    const parked = spots.find((spot) => spot.currentProcessId === processId);
    if (parked) {
      await this.yard.vacate({ tenantId, spotId: parked.id, actorId });
    }
  }

  // ── setters de teste ──────────────────────────────────────────────────────────────────────────────────────
  setProfileRequirementsForTests(tenantId: string, profileId: string, requirements: readonly RequirementSnapshot[]): void {
    this.profileRequirements.set(`${tenantId}:${profileId}`, requirements);
  }

  reset(): void {
    this.releases.length = 0;
    this.checks.length = 0;
    this.profileRequirements.clear();
  }
}
