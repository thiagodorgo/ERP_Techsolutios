import { env } from "../../config/env.js";
import type { OccupancyService } from "../yard/yard.service.js";
import { verifyChain, type VerifyChainResult } from "./impound.hashchain.js";
import { InMemoryImpoundRepository, type ImpoundRepository } from "./impound.repository.js";
import { resolveTransition } from "./impound.transitions.js";
import type {
  CustodyEvent,
  ImpoundActorContext,
  ImpoundProcess,
  ListImpoundProcessResult,
} from "./impound.types.js";
import { ImpoundError } from "./impound.types.js";
import {
  assertIdentity,
  assertNonEmptyString,
  nullableString,
  nullableYear,
  optionalString,
  parseLimit,
  parseOffset,
  parseOptionalReason,
  parseOptionalStatus,
  parseOptionalUuid,
  parsePlate,
  parseRequiredUuid,
  parseStatus,
  readOptionalBoolean,
} from "./impound.validators.js";

type RawRecord = Record<string, unknown>;

export class ImpoundService {
  // occupancy é OPCIONAL: em PR-05 assignSpot é exercitado por teste com o OccupancyService de memória; o wire
  // HTTP (autoridade/impound dirige a alocação) é PR-06.
  constructor(
    private readonly repository: ImpoundRepository,
    private readonly occupancy?: OccupancyService,
  ) {}

  async list(actor: ImpoundActorContext, query: RawRecord): Promise<ListImpoundProcessResult> {
    return this.repository.listProcesses({
      tenantId: actor.tenantId,
      status: parseOptionalStatus(query.status),
      yardId: parseOptionalUuid(query.yard_id ?? query.yardId, "yardId"),
      profileId: parseOptionalUuid(query.profile_id ?? query.profileId, "profileId"),
      plate: parsePlate(query.plate ?? query.vehicle_plate),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    });
  }

  async create(actor: ImpoundActorContext, body: RawRecord): Promise<ImpoundProcess> {
    const vehicleUnidentified = readOptionalBoolean(body.vehicle_unidentified ?? body.vehicleUnidentified) ?? false;
    const vehiclePlate = parsePlate(body.vehicle_plate ?? body.vehiclePlate);
    const vehicleChassis = optionalString(body.vehicle_chassis ?? body.vehicleChassis, 40);
    const vehicleRenavam = optionalString(body.vehicle_renavam ?? body.vehicleRenavam, 40);
    const unidentifiedReason = optionalString(body.unidentified_reason ?? body.unidentifiedReason, 500);

    // D-Ω5P-09 / CHECK identity (app-level; belt-and-suspenders com o CHECK do banco).
    assertIdentity({ vehiclePlate, vehicleChassis, vehicleRenavam, vehicleUnidentified, unidentifiedReason });

    const now = new Date();
    return this.repository.createProcess({
      tenantId: actor.tenantId,
      vehiclePlate,
      vehicleChassis,
      vehicleRenavam,
      vehicleBrand: optionalString(body.vehicle_brand ?? body.vehicleBrand, 80),
      vehicleModel: optionalString(body.vehicle_model ?? body.vehicleModel, 80),
      vehicleColor: optionalString(body.vehicle_color ?? body.vehicleColor, 40),
      vehicleYear: nullableYear(body.vehicle_year ?? body.vehicleYear) ?? undefined,
      vehicleUnidentified,
      unidentifiedReason,
      yardId: parseOptionalUuid(body.yard_id ?? body.yardId, "yardId"),
      profileId: parseRequiredUuid(body.profile_id ?? body.profileId, "profileId"),
      originAuthority: assertNonEmptyString(body.origin_authority ?? body.originAuthority, "originAuthority", 200),
      originAgentName: optionalString(body.origin_agent_name ?? body.originAgentName, 160),
      authorityCaseNumber: optionalString(body.authority_case_number ?? body.authorityCaseNumber, 80),
      incidentReportNumber: optionalString(body.incident_report_number ?? body.incidentReportNumber, 80),
      legalBasis: optionalString(body.legal_basis ?? body.legalBasis, 240),
      serviceOrderId: parseOptionalUuid(body.service_order_id ?? body.serviceOrderId, "serviceOrderId"),
      createdBy: actor.userId,
      updatedBy: actor.userId,
      // Evento de abertura da cadeia (I2): STATUS_CHANGE null→IN_REMOVAL.
      openingEvent: {
        type: "STATUS_CHANGE",
        payload: { from: null, to: "IN_REMOVAL", reason: "process_opened" },
        occurredAt: now,
        actorId: actor.userId,
      },
    });
  }

  async get(actor: ImpoundActorContext, processId: string): Promise<ImpoundProcess> {
    const process = await this.repository.findProcessById(actor.tenantId, parseRequiredUuid(processId, "processId"));
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    return process;
  }

  async update(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<ImpoundProcess> {
    await this.get(actor, processId);
    // Metadado do bem/origem — NUNCA status (a FSM é o único caminho de status).
    const updated = await this.repository.updateProcess({
      tenantId: actor.tenantId,
      processId: parseRequiredUuid(processId, "processId"),
      vehiclePlate: normalizePlatePatch(body.vehicle_plate ?? body.vehiclePlate),
      vehicleChassis: nullableString(body.vehicle_chassis ?? body.vehicleChassis, 40),
      vehicleRenavam: nullableString(body.vehicle_renavam ?? body.vehicleRenavam, 40),
      vehicleBrand: nullableString(body.vehicle_brand ?? body.vehicleBrand, 80),
      vehicleModel: nullableString(body.vehicle_model ?? body.vehicleModel, 80),
      vehicleColor: nullableString(body.vehicle_color ?? body.vehicleColor, 40),
      vehicleYear: nullableYear(body.vehicle_year ?? body.vehicleYear),
      originAgentName: nullableString(body.origin_agent_name ?? body.originAgentName, 160),
      authorityCaseNumber: nullableString(body.authority_case_number ?? body.authorityCaseNumber, 80),
      incidentReportNumber: nullableString(body.incident_report_number ?? body.incidentReportNumber, 80),
      legalBasis: nullableString(body.legal_basis ?? body.legalBasis, 240),
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    return updated;
  }

  async listEvents(actor: ImpoundActorContext, processId: string): Promise<readonly CustodyEvent[]> {
    await this.get(actor, processId);
    return this.repository.listEvents(actor.tenantId, parseRequiredUuid(processId, "processId"));
  }

  // Serviço ÚNICO da FSM (RN-CUS-03). resolveTransition = portão 1 (legalidade) + portão 2 (guarda); o repo
  // aplica a decisão sob lock na MESMA tx do append do STATUS_CHANGE.
  async transition(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<ImpoundProcess> {
    const process = await this.get(actor, processId);
    const to = parseStatus(body.to);
    const reason = parseOptionalReason(body.reason);
    const inspectionComplete = readOptionalBoolean(body.inspection_complete ?? body.inspectionComplete);

    const decision = resolveTransition(process, to, { reason, inspectionComplete });
    const now = new Date();
    return this.repository.applyTransition({
      tenantId: actor.tenantId,
      processId: process.id,
      expectedFrom: decision.from,
      to: decision.to,
      setEnteredAt: decision.setEnteredAt,
      setFrozenAt: decision.setFrozenAt,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: decision.from, to: decision.to, reason: decision.reason ?? null },
        occurredAt: now,
        actorId: actor.userId,
      },
    });
  }

  // assignSpot — prova que o processo REAL aloca a vaga via o OccupancyService de PR-01, emitindo SPOT_ASSIGNED.
  // PR-05: exercitado por teste (memória); o wire HTTP é PR-06. NÃO-amplificador: se o append falhar após a
  // alocação, desfaz a alocação (vacate best-effort) — a atomicidade cross-módulo real (uma tx) é PR-06.
  async assignSpot(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<ImpoundProcess> {
    const process = await this.get(actor, processId);
    if (!this.occupancy) {
      throw new ImpoundError(501, "IMPOUND_NOT_ENABLED", "occupancy_not_wired", "Spot assignment HTTP wiring is delivered in PR-06.");
    }
    const spotId = parseRequiredUuid(body.spot_id ?? body.spotId, "spotId");
    await this.occupancy.allocate(actor, { spotId, processId: process.id });
    try {
      const { process: withEvent } = await this.repository.appendEvent({
        tenantId: actor.tenantId,
        processId: process.id,
        event: {
          type: "SPOT_ASSIGNED",
          payload: { spotId },
          occurredAt: new Date(),
          actorId: actor.userId,
        },
      });
      return withEvent;
    } catch (error) {
      // Compensa a alocação órfã (não-amplificador). PR-06 fecha isto numa única tx.
      await this.occupancy.vacate(actor, { spotId }).catch(() => undefined);
      throw error;
    }
  }

  // Verificação da cadeia (I2) — GET /impound-processes/:id/verify. Recomputa do GENESIS, confronta a âncora do
  // agregado E reconcilia o cross-anchor do audit_logs (store independente) — pega tip-truncation-com-âncora-
  // ajustada, que a âncora do agregado sozinha não pega. §allowlist: só seq/hash cruzam a fronteira.
  async verify(actor: ImpoundActorContext, processId: string): Promise<VerifyChainResult> {
    const process = await this.get(actor, processId);
    const events = await this.repository.listEvents(actor.tenantId, process.id);
    const crossAnchors = await this.repository.listAuditAnchors(actor.tenantId, process.id);
    return verifyChain({
      tenantId: actor.tenantId,
      processId: process.id,
      events,
      head: { seq: process.custodySeqHead, hash: process.custodyHashHead ?? null },
      crossAnchors,
    });
  }
}

// Type-only usage of a parser to satisfy lint on rare code paths (plate patch normalization).
function normalizePlatePatch(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return parsePlate(value) ?? null;
}

// ── runtime (env-gate memory×prisma), espelha yard/jurisdiction ─────────────────────────────────────────────
const memoryRepository = new InMemoryImpoundRepository();
let defaultImpoundServicePromise: Promise<ImpoundService> | undefined;

export function createMemoryImpoundService(occupancy?: OccupancyService): ImpoundService {
  return new ImpoundService(memoryRepository, occupancy);
}

export function getMemoryImpoundRepositoryForTests(): InMemoryImpoundRepository {
  return memoryRepository;
}

export async function createDefaultImpoundService(): Promise<ImpoundService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryImpoundService();
  }
  defaultImpoundServicePromise ??= createPrismaImpoundService();
  return defaultImpoundServicePromise;
}

export function resetImpoundRuntimeForTests(): void {
  memoryRepository.reset();
  defaultImpoundServicePromise = undefined;
}

async function createPrismaImpoundService(): Promise<ImpoundService> {
  const { createPrismaImpoundRepository } = await import("./impound-prisma.repository.js");
  return new ImpoundService(await createPrismaImpoundRepository());
}
