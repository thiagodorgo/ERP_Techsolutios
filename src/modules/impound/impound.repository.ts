import { randomUUID } from "node:crypto";

import { computeEventHash, genesisHash, type CrossAnchor } from "./impound.hashchain.js";
import type {
  AppendEventInput,
  AppendEventResult,
  ApplyTransitionInput,
  CreateImpoundProcessInput,
  CustodyEvent,
  CustodyEventDraft,
  ImpoundProcess,
  ListImpoundProcessInput,
  ListImpoundProcessResult,
  UpdateImpoundProcessInput,
} from "./impound.types.js";
import { ImpoundError } from "./impound.types.js";

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
  updateProcess(input: UpdateImpoundProcessInput): Promise<ImpoundProcess | undefined>;
  listEvents(tenantId: string, processId: string): Promise<readonly CustodyEvent[]>;
  // Trilha do cross-anchor (audit_logs / lista InMemory) para a reconciliação do verifyChain (I2). Só seq/hash.
  listAuditAnchors(tenantId: string, processId: string): Promise<readonly CrossAnchor[]>;

  // Transição atômica (lock FOR UPDATE + guarda de expectedFrom + update de status/efeitos + append do
  // STATUS_CHANGE + cross-anchor) — a legalidade/guarda de negócio é decidida ANTES pelo serviço.
  applyTransition(input: ApplyTransitionInput): Promise<ImpoundProcess>;
  // Append de evento não-transição (ex. SPOT_ASSIGNED), atômico com o head e o cross-anchor.
  appendEvent(input: AppendEventInput): Promise<AppendEventResult>;

  reset?(): void;
}

export class InMemoryImpoundRepository implements ImpoundRepository {
  private readonly processes = new Map<string, ImpoundProcess>();
  private readonly events: CustodyEvent[] = [];
  private readonly anchors: CustodyAuditAnchor[] = [];

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

  reset(): void {
    this.processes.clear();
    this.events.length = 0;
    this.anchors.length = 0;
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
