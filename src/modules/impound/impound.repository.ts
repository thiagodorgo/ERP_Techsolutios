import { randomUUID } from "node:crypto";

import type { YardRepository } from "../yard/yard.repository.js";
import { computeEventHash, genesisHash, type CrossAnchor } from "./impound.hashchain.js";
import type {
  AddInspectionPhotoInput,
  CompleteInspectionInput,
  InspectionPhoto,
  InspectionPhotoAttachment,
  IntakeInspection,
  IntakeState,
  UpsertIntakeInspectionInput,
} from "./impound.intake.types.js";
import type {
  AppendEventInput,
  AppendEventResult,
  ApplyTransitionInput,
  AssignSpotAtomicInput,
  CreateImpoundProcessInput,
  CustodyEvent,
  CustodyEventDraft,
  ImpoundProcess,
  ListImpoundProcessInput,
  ListImpoundProcessResult,
  MoveSpotAtomicInput,
  OpenFromRemovalInput,
  UpdateImpoundProcessInput,
  VacateSpotAtomicInput,
} from "./impound.types.js";
import { ImpoundError } from "./impound.types.js";

// Snapshot íntegro da cadeia (I2) lido num ÚNICO ponto consistente (Prisma: REPEATABLE READ) → o verifyChain
// nunca vê head/events/anchors de instantes diferentes sob append concorrente (verify-snapshot, D-Ω5P-REC-07).
export type ChainSnapshot = {
  readonly head: { readonly seq: number; readonly hash: string | null };
  readonly events: readonly CustodyEvent[];
  readonly crossAnchors: readonly CrossAnchor[];
};

// Resultado de uma escrita de vistoria que TAMBÉM encadeia um CustodyEvent (PHOTO_SET / INSPECTION).
export type AddInspectionPhotoResult = {
  readonly photo: InspectionPhoto;
  readonly process: ImpoundProcess;
};
export type CompleteInspectionResult = {
  readonly inspection: IntakeInspection;
  readonly process: ImpoundProcess;
};

// Cross-anchor (I2): registro em store INDEPENDENTE na MESMA operação do append (no Prisma = audit_logs). No
// InMemory é uma lista própria — exposta p/ teste, sem PII (só tenantId/processId/seq/hash).
export type CustodyAuditAnchor = {
  readonly tenantId: string;
  readonly processId: string;
  readonly seq: number;
  readonly hash: string;
};

export interface ImpoundRepository {
  createProcess(input: CreateImpoundProcessInput): Promise<ImpoundProcess>;
  listProcesses(input: ListImpoundProcessInput): Promise<ListImpoundProcessResult>;
  findProcessById(tenantId: string, processId: string): Promise<ImpoundProcess | undefined>;
  // Ω5P PR-16 — read-port do owner-portal: o processo MAIS RECENTE por placa normalizada (1º fator). O 2º fator
  // (Renavam) é confrontado em TEMPO CONSTANTE na CAMADA DE SEGURANÇA do portal (não no banco) — assim o banco
  // nunca vira oráculo de Renavam e a distinção interna NOT_FOUND×FACTOR_MISMATCH (I10) é preservada.
  findLatestByPlate(tenantId: string, plate: string): Promise<ImpoundProcess | undefined>;
  updateProcess(input: UpdateImpoundProcessInput): Promise<ImpoundProcess | undefined>;
  listEvents(tenantId: string, processId: string): Promise<readonly CustodyEvent[]>;
  // Trilha do cross-anchor (audit_logs / lista InMemory) para a reconciliação do verifyChain (I2). Só seq/hash.
  listAuditAnchors(tenantId: string, processId: string): Promise<readonly CrossAnchor[]>;

  // Transição atômica (lock FOR UPDATE + guarda de expectedFrom + update de status/efeitos + append do
  // STATUS_CHANGE + cross-anchor) — a legalidade/guarda de negócio é decidida ANTES pelo serviço.
  applyTransition(input: ApplyTransitionInput): Promise<ImpoundProcess>;
  // Append de evento não-transição (ex. SPOT_ASSIGNED), atômico com o head e o cross-anchor.
  appendEvent(input: AppendEventInput): Promise<AppendEventResult>;
  // PR-06 (F-1) — abertura do SWEEP em UMA tx: create + abertura + RECEPTION (entered_at=completedAt). Sem half-open.
  openFromRemovalAtomic(input: OpenFromRemovalInput): Promise<ImpoundProcess>;

  // ── PR-06: vistoria de recepção (I3) ──────────────────────────────────────────────────────────────────────
  findInspectionByProcess(tenantId: string, processId: string): Promise<IntakeInspection | undefined>;
  upsertInspection(input: UpsertIntakeInspectionInput): Promise<IntakeInspection>;
  addInspectionPhoto(input: AddInspectionPhotoInput): Promise<AddInspectionPhotoResult>;
  listInspectionPhotos(tenantId: string, inspectionId: string): Promise<readonly InspectionPhoto[]>;
  // Ω5P PR-17b — leitura ESTREITA de TODAS as fotos de vistoria do PROCESSO (não de 1 inspectionId isolada) —
  // usada para RECOMPUTAR o opaqueRef contra o CONJUNTO COMPLETO (requisito C4: sem early-return). Nenhum
  // storage_key/fileUrl aqui (é o mesmo InspectionPhoto público, minimizado).
  listInspectionPhotosByProcess(tenantId: string, processId: string): Promise<readonly InspectionPhoto[]>;
  // Ω5P PR-17b — leitura ESTREITA do Attachment BRUTO de UMA foto (storage_key/provider) — SÓ chamada DEPOIS que
  // o opaqueRef do cliente já foi validado por HMAC. undefined = não encontrada/removida/fora do processo.
  getInspectionPhotoAttachment(tenantId: string, processId: string, attachmentId: string): Promise<InspectionPhotoAttachment | undefined>;
  completeInspection(input: CompleteInspectionInput): Promise<CompleteInspectionResult>;
  // Estado bruto para a guarda I3 (inspeção + conjuntos armazenados + conjuntos obrigatórios configurados).
  getIntakeState(tenantId: string, processId: string): Promise<IntakeState | undefined>;

  // ── PR-06: ocupação ATÔMICA (I1 real, 1 tx cross-módulo) ──────────────────────────────────────────────────
  assignSpotAtomic(input: AssignSpotAtomicInput): Promise<ImpoundProcess>;
  vacateSpotAtomic(input: VacateSpotAtomicInput): Promise<ImpoundProcess>;
  moveSpotAtomic(input: MoveSpotAtomicInput): Promise<ImpoundProcess>;

  // ── PR-06: verify-snapshot (I2, leitura consistente num só ponto) ─────────────────────────────────────────
  readChainSnapshot(tenantId: string, processId: string): Promise<ChainSnapshot | undefined>;

  reset?(): void;
}

// Ω5P PR-17b — carrega TAMBÉM fileName/contentType/storageProvider/storageKey (nunca no InspectionPhoto público
// — §2.8) para alimentar getInspectionPhotoAttachment (leitura estreita pós-HMAC do owner-portal).
type StoredInspectionPhoto = InspectionPhoto & {
  readonly tenantId: string;
  readonly inspectionId: string;
  readonly fileName?: string;
  readonly contentType?: string;
  readonly storageProvider?: string;
  readonly storageKey?: string;
};

export class InMemoryImpoundRepository implements ImpoundRepository {
  private readonly processes = new Map<string, ImpoundProcess>();
  private readonly events: CustodyEvent[] = [];
  private readonly anchors: CustodyAuditAnchor[] = [];
  private readonly inspections = new Map<string, IntakeInspection>(); // keyed by processId (1 por processo)
  private readonly photos: StoredInspectionPhoto[] = [];
  private readonly profileRequiredSets = new Map<string, readonly string[] | null>();

  // yardRepository OPCIONAL: habilita a alocação atômica cross-módulo (I1). Em memória a "atomicidade" é
  // single-thread; a corrida/rollback REAL (1 tx Postgres) roda no teste DB-gated.
  constructor(private readonly yardRepository?: YardRepository) {}

  async createProcess(input: CreateImpoundProcessInput): Promise<ImpoundProcess> {
    // Idempotência OS→custódia (D-Ω5P-RECON-B) — espelha o índice PARCIAL único (tenant, service_order).
    if (input.serviceOrderId) {
      const clash = [...this.processes.values()].some(
        (process) => process.tenantId === input.tenantId && process.serviceOrderId === input.serviceOrderId,
      );
      if (clash) {
        throw new ImpoundError(409, "IMPOUND_CONFLICT", "duplicate_service_order", "A custody process already exists for this service order.");
      }
    }

    const now = new Date();
    const base: ImpoundProcess = {
      id: randomUUID(),
      tenantId: input.tenantId,
      vehiclePlate: input.vehiclePlate,
      vehicleChassis: input.vehicleChassis,
      vehicleRenavam: input.vehicleRenavam,
      vehicleBrand: input.vehicleBrand,
      vehicleModel: input.vehicleModel,
      vehicleColor: input.vehicleColor,
      vehicleYear: input.vehicleYear,
      vehicleUnidentified: input.vehicleUnidentified,
      unidentifiedReason: input.unidentifiedReason,
      yardId: input.yardId,
      profileId: input.profileId,
      status: "IN_REMOVAL",
      enteredAt: undefined,
      frozenAt: undefined,
      originAuthority: input.originAuthority,
      originAgentName: input.originAgentName,
      authorityCaseNumber: input.authorityCaseNumber,
      incidentReportNumber: input.incidentReportNumber,
      legalBasis: input.legalBasis,
      serviceOrderId: input.serviceOrderId,
      custodySeqHead: 0,
      custodyHashHead: undefined,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.processes.set(base.id, base);
    // Evento de abertura (seq=1) na MESMA operação.
    const { process } = this.appendInternal(base, input.openingEvent);
    return process;
  }

  // PR-06 (F-1) — abertura ATÔMICA do sweep: create (IN_REMOVAL) + abertura + RECEPTION (entered_at=completedAt),
  // tudo numa operação (single-thread InMemory / 1 tx no Prisma). Nenhum half-open pode nascer.
  // Ω-VID PR-05 — a semeadura da identidade agregadora e o AUTO-link de checklist são DB-gated (o InMemory não
  // injeta os repositórios de vehicle-identity/checklist): aqui os hints de veículo do input são OPCIONAIS e
  // ignorados (a prova autoritativa — identity_id setado, FK/CHECK, links AUTO — roda contra o Postgres vivo).
  async openFromRemovalAtomic(input: OpenFromRemovalInput): Promise<ImpoundProcess> {
    if (input.serviceOrderId) {
      const clash = [...this.processes.values()].some(
        (process) => process.tenantId === input.tenantId && process.serviceOrderId === input.serviceOrderId,
      );
      if (clash) {
        throw new ImpoundError(409, "IMPOUND_CONFLICT", "duplicate_service_order", "A custody process already exists for this service order.");
      }
    }
    const now = new Date();
    const base: ImpoundProcess = {
      id: randomUUID(),
      tenantId: input.tenantId,
      vehicleUnidentified: true,
      unidentifiedReason: input.unidentifiedReason,
      profileId: input.profileId,
      status: "IN_REMOVAL",
      enteredAt: undefined,
      frozenAt: undefined,
      originAuthority: input.originAuthority,
      serviceOrderId: input.serviceOrderId,
      custodySeqHead: 0,
      custodyHashHead: undefined,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    this.processes.set(base.id, base);
    const opened = this.appendInternal(base, {
      type: "STATUS_CHANGE",
      payload: { from: null, to: "IN_REMOVAL", reason: "process_opened" },
      occurredAt: input.completedAt,
      actorId: input.actorId,
    });
    const receiving: ImpoundProcess = { ...opened.process, status: "RECEPTION", enteredAt: input.completedAt };
    this.processes.set(receiving.id, receiving);
    const received = this.appendInternal(receiving, {
      type: "STATUS_CHANGE",
      payload: { from: "IN_REMOVAL", to: "RECEPTION", reason: "removal_reconciled" },
      occurredAt: input.completedAt,
      actorId: input.actorId,
    });
    return received.process;
  }

  async listProcesses(input: ListImpoundProcessInput): Promise<ListImpoundProcessResult> {
    const filtered = [...this.processes.values()]
      .filter((process) => process.tenantId === input.tenantId)
      .filter((process) => input.status === undefined || process.status === input.status)
      .filter((process) => input.yardId === undefined || process.yardId === input.yardId)
      .filter((process) => input.profileId === undefined || process.profileId === input.profileId)
      .filter((process) => input.plate === undefined || (process.vehiclePlate ?? "").toUpperCase() === input.plate.toUpperCase())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findProcessById(tenantId: string, processId: string): Promise<ImpoundProcess | undefined> {
    const process = this.processes.get(processId);
    return process?.tenantId === tenantId ? process : undefined;
  }

  async findLatestByPlate(tenantId: string, plate: string): Promise<ImpoundProcess | undefined> {
    const target = plate.toUpperCase();
    return [...this.processes.values()]
      .filter((process) => process.tenantId === tenantId && (process.vehiclePlate ?? "").toUpperCase() === target)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  async updateProcess(input: UpdateImpoundProcessInput): Promise<ImpoundProcess | undefined> {
    const current = await this.findProcessById(input.tenantId, input.processId);
    if (!current) return undefined;
    const apply = (field: string | undefined, patch: string | null | undefined): string | undefined =>
      patch === undefined ? field : patch ?? undefined;
    const updated: ImpoundProcess = {
      ...current,
      vehiclePlate: apply(current.vehiclePlate, input.vehiclePlate),
      vehicleChassis: apply(current.vehicleChassis, input.vehicleChassis),
      vehicleRenavam: apply(current.vehicleRenavam, input.vehicleRenavam),
      vehicleBrand: apply(current.vehicleBrand, input.vehicleBrand),
      vehicleModel: apply(current.vehicleModel, input.vehicleModel),
      vehicleColor: apply(current.vehicleColor, input.vehicleColor),
      vehicleYear: input.vehicleYear === undefined ? current.vehicleYear : input.vehicleYear ?? undefined,
      originAgentName: apply(current.originAgentName, input.originAgentName),
      authorityCaseNumber: apply(current.authorityCaseNumber, input.authorityCaseNumber),
      incidentReportNumber: apply(current.incidentReportNumber, input.incidentReportNumber),
      legalBasis: apply(current.legalBasis, input.legalBasis),
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.processes.set(updated.id, updated);
    return updated;
  }

  async listEvents(tenantId: string, processId: string): Promise<readonly CustodyEvent[]> {
    return this.events
      .filter((event) => event.tenantId === tenantId && event.processId === processId)
      .sort((left, right) => left.seq - right.seq);
  }

  async listAuditAnchors(tenantId: string, processId: string): Promise<readonly CrossAnchor[]> {
    return this.anchors
      .filter((anchor) => anchor.tenantId === tenantId && anchor.processId === processId)
      .map((anchor) => ({ seq: anchor.seq, hash: anchor.hash }));
  }

  async applyTransition(input: ApplyTransitionInput): Promise<ImpoundProcess> {
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    // Anti-corrida (single-thread InMemory prova a LÓGICA; a corrida real = teste DB-gated).
    if (process.status !== input.expectedFrom) {
      throw new ImpoundError(409, "IMPOUND_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    const patched: ImpoundProcess = {
      ...process,
      status: input.to,
      enteredAt: input.setEnteredAt ? process.enteredAt ?? input.event.occurredAt : process.enteredAt,
      frozenAt: input.setFrozenAt ? process.frozenAt ?? input.event.occurredAt : process.frozenAt,
    };
    this.processes.set(patched.id, patched);
    const { process: withHead } = this.appendInternal(patched, input.event);
    return withHead;
  }

  async appendEvent(input: AppendEventInput): Promise<AppendEventResult> {
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    return this.appendInternal(process, input.event);
  }

  // ── PR-06: vistoria (I3) ────────────────────────────────────────────────────────────────────────────────
  async findInspectionByProcess(tenantId: string, processId: string): Promise<IntakeInspection | undefined> {
    const inspection = this.inspections.get(processId);
    return inspection?.tenantId === tenantId ? inspection : undefined;
  }

  // Ω-VID PR-05 FIX-JUNTA — input.confirmedPlateKey (reconciliação de identity_id na vistoria) é OPCIONAL e
  // IGNORADO aqui: o módulo vehicle-identities não é injetado no InMemory e ImpoundProcess de memória nem carrega
  // identity_id. A prova autoritativa do SPLIT da colisão-por-reuso (identity_id re-apontado, CONFIRMED) é
  // DB-gated (mesma política do openFromRemovalAtomic InMemory, que também ignora a semeadura).
  async upsertInspection(input: UpsertIntakeInspectionInput): Promise<IntakeInspection> {
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    const now = new Date();
    const current = await this.findInspectionByProcess(input.tenantId, input.processId);
    const apply = (field: string | undefined, patch: string | null | undefined): string | undefined =>
      patch === undefined ? field : patch ?? undefined;
    const applyDate = (field: Date | undefined, patch: Date | null | undefined): Date | undefined =>
      patch === undefined ? field : patch ?? undefined;
    const base: IntakeInspection = current ?? {
      id: randomUUID(),
      tenantId: input.tenantId,
      processId: input.processId,
      inspectedAt: input.inspectedAt ?? now,
      signatureStatus: "ABSENT",
      completedAt: undefined,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    const updated: IntakeInspection = {
      ...base,
      inspectedAt: input.inspectedAt ?? base.inspectedAt,
      agentName: apply(base.agentName, input.agentName),
      bodyworkState: apply(base.bodyworkState, input.bodyworkState),
      paintState: apply(base.paintState, input.paintState),
      tiresState: apply(base.tiresState, input.tiresState),
      internalObjects: apply(base.internalObjects, input.internalObjects),
      missingEquipment: apply(base.missingEquipment, input.missingEquipment),
      odometerKm: apply(base.odometerKm, input.odometerKm),
      observations: apply(base.observations, input.observations),
      signerName: apply(base.signerName, input.signerName),
      signatureStatus: input.signatureStatus ?? base.signatureStatus,
      signedAt: applyDate(base.signedAt, input.signedAt),
      updatedBy: input.actorId ?? base.updatedBy,
      updatedAt: now,
    };
    this.inspections.set(input.processId, updated);
    return updated;
  }

  async addInspectionPhoto(input: AddInspectionPhotoInput): Promise<AddInspectionPhotoResult> {
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    const inspection = await this.findInspectionByProcess(input.tenantId, input.processId);
    if (!inspection || inspection.id !== input.inspectionId) {
      throw new ImpoundError(404, "IMPOUND_INSPECTION_NOT_FOUND", "inspection_not_found", "Intake inspection was not found for this process.");
    }
    const photo: StoredInspectionPhoto = {
      id: randomUUID(),
      tenantId: input.tenantId,
      inspectionId: input.inspectionId,
      set: input.set,
      fileUrl: input.fileUrl,
      status: "stored",
      createdAt: new Date(),
      // Ω5P PR-17b — persistidos SÓ p/ alimentar getInspectionPhotoAttachment (nunca no InspectionPhoto público).
      fileName: input.fileName,
      contentType: input.contentType,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
    };
    this.photos.push(photo);
    // PHOTO_SET encadeado (prova hash) — {set, attachmentId}.
    const { process: withEvent } = this.appendInternal(process, {
      type: "PHOTO_SET",
      payload: { set: input.set, attachmentId: photo.id },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    const publicPhoto: InspectionPhoto = { id: photo.id, set: photo.set, fileUrl: photo.fileUrl, status: photo.status, createdAt: photo.createdAt };
    return { photo: publicPhoto, process: withEvent };
  }

  async listInspectionPhotos(tenantId: string, inspectionId: string): Promise<readonly InspectionPhoto[]> {
    return this.photos
      .filter((photo) => photo.tenantId === tenantId && photo.inspectionId === inspectionId && photo.status === "stored")
      .map((photo) => ({ id: photo.id, set: photo.set, fileUrl: photo.fileUrl, status: photo.status, createdAt: photo.createdAt }));
  }

  // Ω5P PR-17b — leitura ESTREITA de TODAS as fotos do PROCESSO (via a inspeção única do processo). [] se não há
  // vistoria ainda (nunca lança — o chamador decide o desfecho anti-oráculo).
  async listInspectionPhotosByProcess(tenantId: string, processId: string): Promise<readonly InspectionPhoto[]> {
    const inspection = await this.findInspectionByProcess(tenantId, processId);
    if (!inspection) return [];
    return this.listInspectionPhotos(tenantId, inspection.id);
  }

  // Ω5P PR-17b — Attachment BRUTO de UMA foto — SÓ chamado pelo owner-portal DEPOIS do opaqueRef já validado.
  async getInspectionPhotoAttachment(tenantId: string, processId: string, attachmentId: string): Promise<InspectionPhotoAttachment | undefined> {
    const inspection = await this.findInspectionByProcess(tenantId, processId);
    if (!inspection) return undefined;
    const photo = this.photos.find(
      (candidate) =>
        candidate.tenantId === tenantId &&
        candidate.inspectionId === inspection.id &&
        candidate.id === attachmentId &&
        candidate.status === "stored",
    );
    if (!photo) return undefined;
    return {
      attachmentId: photo.id,
      fileName: photo.fileName,
      contentType: photo.contentType,
      storageProvider: photo.storageProvider,
      storageKey: photo.storageKey,
      status: photo.status,
    };
  }

  async completeInspection(input: CompleteInspectionInput): Promise<CompleteInspectionResult> {
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    const inspection = await this.findInspectionByProcess(input.tenantId, input.processId);
    if (!inspection) {
      throw new ImpoundError(404, "IMPOUND_INSPECTION_NOT_FOUND", "inspection_not_found", "Intake inspection was not found for this process.");
    }
    const completed: IntakeInspection = {
      ...inspection,
      completedAt: input.occurredAt,
      completedBy: input.actorId,
      updatedBy: input.actorId ?? inspection.updatedBy,
      updatedAt: new Date(),
    };
    this.inspections.set(input.processId, completed);
    // INSPECTION encadeado (marcação de vistoria concluída).
    const { process: withEvent } = this.appendInternal(process, {
      type: "INSPECTION",
      payload: { inspectionId: inspection.id },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return { inspection: completed, process: withEvent };
  }

  async getIntakeState(tenantId: string, processId: string): Promise<IntakeState | undefined> {
    const process = await this.findProcessById(tenantId, processId);
    if (!process) return undefined;
    const inspection = await this.findInspectionByProcess(tenantId, processId);
    const storedSets = inspection
      ? [...new Set((await this.listInspectionPhotos(tenantId, inspection.id)).map((photo) => photo.set))]
      : [];
    const profileRequiredSets = this.profileRequiredSets.get(`${tenantId}:${process.profileId}`) ?? null;
    return { inspection, storedSets, profileRequiredSets };
  }

  // ── PR-06: ocupação atômica (I1) ────────────────────────────────────────────────────────────────────────
  async assignSpotAtomic(input: AssignSpotAtomicInput): Promise<ImpoundProcess> {
    const yard = this.requireYardRepository();
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    const yardId = await this.resolveSpotYardId(input.tenantId, input.spotId);
    // Alocação PRIMEIRO (I1a/I1b): erro aqui NÃO deixa evento órfão (nem entra no append).
    await yard.allocate({ tenantId: input.tenantId, spotId: input.spotId, processId: input.processId, actorId: input.actorId });
    try {
      const withYard: ImpoundProcess = { ...process, yardId, updatedAt: new Date() };
      this.processes.set(withYard.id, withYard);
      const { process: withEvent } = this.appendInternal(withYard, {
        type: "SPOT_ASSIGNED",
        payload: { spotId: input.spotId },
        occurredAt: input.occurredAt,
        actorId: input.actorId,
      });
      return withEvent;
    } catch (error) {
      // Compensa (memória não tem tx real; a atomicidade REAL = 1 tx Postgres no teste DB-gated).
      await yard.vacate({ tenantId: input.tenantId, spotId: input.spotId, actorId: input.actorId }).catch(() => undefined);
      throw error;
    }
  }

  async vacateSpotAtomic(input: VacateSpotAtomicInput): Promise<ImpoundProcess> {
    const yard = this.requireYardRepository();
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    await yard.vacate({ tenantId: input.tenantId, spotId: input.spotId, actorId: input.actorId });
    const { process: withEvent } = this.appendInternal(process, {
      type: "SPOT_MOVED",
      payload: { from: input.spotId, to: null },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return withEvent;
  }

  async moveSpotAtomic(input: MoveSpotAtomicInput): Promise<ImpoundProcess> {
    const yard = this.requireYardRepository();
    const process = await this.findProcessById(input.tenantId, input.processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    const fromYardId = await this.resolveSpotYardId(input.tenantId, input.fromSpotId);
    const toYardId = await this.resolveSpotYardId(input.tenantId, input.toSpotId);
    await yard.move({ tenantId: input.tenantId, fromSpotId: input.fromSpotId, toSpotId: input.toSpotId, actorId: input.actorId });
    const crossYard = fromYardId !== undefined && toYardId !== undefined && fromYardId !== toYardId;
    const moved: ImpoundProcess = crossYard ? { ...process, yardId: toYardId, updatedAt: new Date() } : process;
    if (crossYard) this.processes.set(moved.id, moved);
    const { process: withEvent } = this.appendInternal(moved, {
      type: crossYard ? "YARD_TRANSFER" : "SPOT_MOVED",
      payload: { from: input.fromSpotId, to: input.toSpotId },
      occurredAt: input.occurredAt,
      actorId: input.actorId,
    });
    return withEvent;
  }

  async readChainSnapshot(tenantId: string, processId: string): Promise<ChainSnapshot | undefined> {
    const process = await this.findProcessById(tenantId, processId);
    if (!process) return undefined;
    const events = await this.listEvents(tenantId, processId);
    const crossAnchors = await this.listAuditAnchors(tenantId, processId);
    return { head: { seq: process.custodySeqHead, hash: process.custodyHashHead ?? null }, events, crossAnchors };
  }

  private requireYardRepository(): YardRepository {
    if (!this.yardRepository) {
      throw new ImpoundError(501, "IMPOUND_NOT_ENABLED", "occupancy_not_wired", "Spot occupancy is not wired in this runtime.");
    }
    return this.yardRepository;
  }

  private async resolveSpotYardId(tenantId: string, spotId: string): Promise<string | undefined> {
    const yard = this.requireYardRepository();
    const spot = await yard.findSpotById(tenantId, spotId);
    if (!spot) return undefined;
    const area = await yard.findAreaById(tenantId, spot.areaId);
    return area?.yardId;
  }

  // Registro de conjuntos obrigatórios por perfil (espelha JurisdictionProfile.required_photo_sets no Prisma).
  setProfileRequiredSetsForTests(tenantId: string, profileId: string, sets: readonly string[] | null): void {
    this.profileRequiredSets.set(`${tenantId}:${profileId}`, sets);
  }

  async findProfileRequiredSets(tenantId: string, profileId: string): Promise<readonly string[] | null> {
    return this.profileRequiredSets.get(`${tenantId}:${profileId}`) ?? null;
  }

  reset(): void {
    this.processes.clear();
    this.events.length = 0;
    this.anchors.length = 0;
    this.inspections.clear();
    this.photos.length = 0;
    this.profileRequiredSets.clear();
  }

  getAuditAnchorsForTests(): readonly CustodyAuditAnchor[] {
    return [...this.anchors];
  }

  // O NÚCLEO do append (I2): seq contíguo, prev = head ?? GENESIS, hash do preimage endurecido, atualiza a
  // âncora (custody_seq_head/custody_hash_head) e grava o cross-anchor — tudo na MESMA operação (atômico no
  // Prisma via tx; aqui via single-thread). O evento entra append-only: nunca é mutado/removido pela API.
  private appendInternal(process: ImpoundProcess, draft: CustodyEventDraft): AppendEventResult {
    const seq = process.custodySeqHead + 1;
    const prevHash = process.custodyHashHead ?? genesisHash(process.tenantId, process.id);
    const hash = computeEventHash({
      prevHash,
      seq,
      type: draft.type,
      payload: draft.payload,
      occurredAt: draft.occurredAt,
      actorId: draft.actorId ?? null,
    });
    const event: CustodyEvent = {
      id: randomUUID(),
      tenantId: process.tenantId,
      processId: process.id,
      seq,
      type: draft.type,
      payload: draft.payload,
      occurredAt: draft.occurredAt,
      actorId: draft.actorId,
      prevHash,
      hash,
      createdAt: new Date(),
    };
    this.events.push(event);
    const updatedProcess: ImpoundProcess = {
      ...process,
      custodySeqHead: seq,
      custodyHashHead: hash,
      updatedAt: new Date(),
    };
    this.processes.set(updatedProcess.id, updatedProcess);
    this.anchors.push({ tenantId: process.tenantId, processId: process.id, seq, hash });
    return { process: updatedProcess, event };
  }
}
