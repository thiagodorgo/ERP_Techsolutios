import { env } from "../../config/env.js";
import type { OccupancyService } from "../yard/yard.service.js";
import { getMemoryYardRepositoryForTests } from "../yard/yard.service.js";
import { verifyChain, type VerifyChainResult } from "./impound.hashchain.js";
import {
  intakeCompletenessGaps,
  isIntakeComplete,
  resolveRequiredPhotoSets,
} from "./impound.intake.js";
import type { InspectionPhoto, IntakeInspection } from "./impound.intake.types.js";
import {
  parseFileUrl,
  parseInspectedAt,
  parseNullableDate,
  parseNullableOdometer,
  parsePhotoSetCode,
  parseSignatureStatus,
} from "./impound.intake.validators.js";
import { InMemoryImpoundRepository, type ImpoundRepository } from "./impound.repository.js";
import { resolveTransition } from "./impound.transitions.js";
import type {
  CustodyEvent,
  ImpoundActorContext,
  ImpoundProcess,
  ImpoundStatus,
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

export type InspectionView = {
  readonly inspection: IntakeInspection;
  readonly photos: readonly InspectionPhoto[];
  readonly requiredSets: readonly string[];
  readonly complete: boolean;
};

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

  // Ω5P PR-16 — READ-PORT do owner-portal (BFF público, ator de SISTEMA escopado ao tenant vinculado; SEM RBAC
  // HTTP, SEM attachAuthenticatedActor). Resolve o processo pelo 1º fator (placa normalizada). O 2º fator
  // (Renavam) é confrontado em TEMPO CONSTANTE na camada de segurança do portal — NÃO aqui e NÃO no banco: assim
  // o banco não vira oráculo de Renavam e o log I10 distingue NOT_FOUND×FACTOR_MISMATCH sem vazar na resposta.
  async findByIdentity(tenantId: string, plate: string): Promise<ImpoundProcess | undefined> {
    const normalized = parsePlate(plate);
    if (!normalized) return undefined;
    return this.repository.findLatestByPlate(tenantId, normalized);
  }

  // Ω5P PR-17 — READ-PORT do owner-portal (dossiê): resolve o processo pelo ID que veio da SESSÃO JWE verificada
  // (nunca do corpo). Escopado ao tenant VINCULADO ao deploy — o RLS garante que uma sessão de A jamais lê B
  // (findProcessById filtra tenant_id). undefined = processo inexistente NAQUELE tenant (cross-tenant ou removido).
  async findByIdForPortal(tenantId: string, processId: string): Promise<ImpoundProcess | undefined> {
    return this.repository.findProcessById(tenantId, processId);
  }

  // Ω5P PR-17 — READ-PORT do owner-portal (dossiê, card de fotos): SÓ a CONTAGEM de conjuntos de fotos com ≥1
  // imagem armazenada — NENHUM byte de foto, NENHUM storage_key/fileUrl (§2.8). É o "placeholder honesto"
  // (PD-Ω5P-FOTOS / CORTE PR-17b): o proprietário vê QUANTOS conjuntos existem, não as imagens. 0 se não há vistoria.
  async countAvailablePhotoSets(tenantId: string, processId: string): Promise<number> {
    const state = await this.repository.getIntakeState(tenantId, processId);
    return state?.storedSets.length ?? 0;
  }

  async get(actor: ImpoundActorContext, processId: string): Promise<ImpoundProcess> {
    const process = await this.repository.findProcessById(actor.tenantId, parseRequiredUuid(processId, "processId"));
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    return process;
  }

  // PR-06 (D-Ω5P-REC-03) — abertura de custódia pelo SWEEP (ator = SISTEMA, fora do RBAC HTTP). Cria o processo
  // (IN_REMOVAL, identidade a confirmar pela vistoria — D-Ω5P-REC-10) e transiciona a RECEPÇÃO com occurredAt =
  // OS.completed_at ⇒ entered_at = t0 = chegada (art. 21 §1º). IDEMPOTENTE: 409 duplicate_service_order (índice
  // PARCIAL único) é ENGOLIDO — 2º tick / criação-manual concorrente não duplicam.
  async openFromRemoval(input: {
    readonly tenantId: string;
    readonly serviceOrderId: string;
    readonly profileId: string;
    readonly originAuthority: string;
    readonly completedAt: Date;
  }): Promise<{ readonly opened: boolean; readonly processId?: string }> {
    // F-1 — abertura ATÔMICA (create + abertura + RECEPTION numa ÚNICA tx): nenhum half-open pode nascer.
    try {
      const process = await this.repository.openFromRemovalAtomic({
        tenantId: input.tenantId,
        serviceOrderId: input.serviceOrderId,
        profileId: input.profileId,
        originAuthority: input.originAuthority,
        unidentifiedReason: "Aguardando vistoria de recepção",
        completedAt: input.completedAt,
        actorId: undefined,
      });
      return { opened: true, processId: process.id };
    } catch (error) {
      if (error instanceof ImpoundError && error.reason === "duplicate_service_order") {
        return { opened: false };
      }
      throw error;
    }
  }

  // F-1(b) — CURA de half-open pré-existente: processo preso em IN_REMOVAL sem entered_at (herança do gatilho
  // não-atômico anterior) → transiciona a RECEPÇÃO com entered_at=OS.completed_at (t0). Idempotente/race-safe:
  // se já saiu de IN_REMOVAL ou já tem entered_at, no-op; corrida concorrente é engolida.
  async cureHalfOpenRemoval(tenantId: string, processId: string, completedAt: Date): Promise<boolean> {
    const process = await this.repository.findProcessById(tenantId, processId);
    if (!process || process.status !== "IN_REMOVAL" || process.enteredAt !== undefined) {
      return false;
    }
    try {
      await this.transitionSystem(tenantId, processId, "RECEPTION", completedAt);
      return true;
    } catch (error) {
      if (
        error instanceof ImpoundError &&
        (error.reason === "concurrent_custody_append" || error.reason === "invalid_transition")
      ) {
        return false; // outra passada/ator já curou — não é erro
      }
      throw error;
    }
  }

  // Transição dirigida pelo SISTEMA (sem actor de usuário) com occurredAt explícito (t0 = completed_at). Passa
  // pela MESMA legalidade/guarda da FSM (resolveTransition) — RECEPTION não tem guarda I3 (essa é de ACTIVE_CUSTODY).
  private async transitionSystem(tenantId: string, processId: string, to: ImpoundStatus, occurredAt: Date): Promise<ImpoundProcess> {
    const process = await this.repository.findProcessById(tenantId, processId);
    if (!process) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    if (process.status === to) return process; // no-op idempotente (já em RECEPÇÃO+)
    const decision = resolveTransition(process, to);
    return this.repository.applyTransition({
      tenantId,
      processId,
      expectedFrom: decision.from,
      to: decision.to,
      setEnteredAt: decision.setEnteredAt,
      setFrozenAt: decision.setFrozenAt,
      event: {
        type: "STATUS_CHANGE",
        payload: { from: decision.from, to: decision.to, reason: decision.reason ?? null },
        occurredAt,
        actorId: undefined,
      },
    });
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

    // F2 (I3 REAL) — a guarda RECEPTION→ACTIVE_CUSTODY lê a VISTORIA de recepção REAL do processo, NÃO um flag do
    // cliente. `body.inspection_complete` foi REMOVIDO/ignorado: forjá-lo NÃO burla a guarda. Para as demais
    // arestas o valor é irrelevante (só a guarda I3 o consulta).
    const inspectionComplete = to === "ACTIVE_CUSTODY" ? await this.resolveInspectionComplete(process) : undefined;

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

  // ── PR-06: vistoria de recepção (I3 / art. 9º I / art. 14) ────────────────────────────────────────────────
  // I3 REAL: computa a completude da vistoria do processo (dados mínimos + completed_at marcado + todos os
  // conjuntos obrigatórios do PERFIL com ≥1 foto). Fonte única da guarda RECEPTION→ACTIVE_CUSTODY.
  private async resolveInspectionComplete(process: ImpoundProcess): Promise<boolean> {
    const state = await this.repository.getIntakeState(process.tenantId, process.id);
    if (!state) return false;
    const requiredSets = resolveRequiredPhotoSets(state.profileRequiredSets);
    return isIntakeComplete(state.inspection, state.storedSets, requiredSets);
  }

  async getInspection(actor: ImpoundActorContext, processId: string): Promise<InspectionView> {
    const process = await this.get(actor, processId);
    const state = await this.repository.getIntakeState(actor.tenantId, process.id);
    if (!state?.inspection) {
      throw new ImpoundError(404, "IMPOUND_INSPECTION_NOT_FOUND", "inspection_not_found", "No intake inspection registered for this process.");
    }
    const photos = await this.repository.listInspectionPhotos(actor.tenantId, state.inspection.id);
    const requiredSets = resolveRequiredPhotoSets(state.profileRequiredSets);
    return {
      inspection: state.inspection,
      photos,
      requiredSets,
      complete: isIntakeComplete(state.inspection, state.storedSets, requiredSets),
    };
  }

  // Registra/atualiza a vistoria (dados mínimos art. 14 §1º). Idempotente por processo (@@unique tenant+process).
  async saveInspection(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<IntakeInspection> {
    const process = await this.get(actor, processId);
    const inspectedAtRaw = body.inspected_at ?? body.inspectedAt;
    const inspectedAt =
      inspectedAtRaw === undefined || inspectedAtRaw === null || inspectedAtRaw === "" ? undefined : parseInspectedAt(inspectedAtRaw);
    return this.repository.upsertInspection({
      tenantId: actor.tenantId,
      processId: process.id,
      inspectedAt,
      agentName: nullableString(body.agent_name ?? body.agentName, 160),
      bodyworkState: nullableString(body.bodywork_state ?? body.bodyworkState, 500),
      paintState: nullableString(body.paint_state ?? body.paintState, 500),
      tiresState: nullableString(body.tires_state ?? body.tiresState, 500),
      internalObjects: nullableString(body.internal_objects ?? body.internalObjects, 2000),
      missingEquipment: nullableString(body.missing_equipment ?? body.missingEquipment, 2000),
      odometerKm: parseNullableOdometer(body.odometer_km ?? body.odometerKm),
      observations: nullableString(body.observations, 2000),
      signerName: nullableString(body.signer_name ?? body.signerName, 160),
      signatureStatus: parseSignatureStatus(body.signature_status ?? body.signatureStatus),
      signedAt: parseNullableDate(body.signed_at ?? body.signedAt, "signed_at"),
      actorId: actor.userId,
    });
  }

  // Anexa 1 foto (conjunto SET) à vistoria → cria Attachment (status=stored) + encadeia PHOTO_SET (prova hash).
  async addInspectionPhoto(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<InspectionPhoto> {
    const process = await this.get(actor, processId);
    const inspection = await this.repository.findInspectionByProcess(actor.tenantId, process.id);
    if (!inspection) {
      throw new ImpoundError(409, "IMPOUND_INSPECTION_REQUIRED", "inspection_required", "Register the intake inspection before attaching photos.");
    }
    const { photo } = await this.repository.addInspectionPhoto({
      tenantId: actor.tenantId,
      processId: process.id,
      inspectionId: inspection.id,
      set: parsePhotoSetCode(body.set),
      fileUrl: parseFileUrl(body.file_url ?? body.fileUrl),
      fileName: optionalString(body.file_name ?? body.fileName, 260),
      contentType: optionalString(body.content_type ?? body.contentType, 160),
      checksumSha256: optionalString(body.checksum_sha256 ?? body.checksumSha256, 128),
      storageProvider: optionalString(body.storage_provider ?? body.storageProvider, 80),
      storageKey: optionalString(body.storage_key ?? body.storageKey, 512),
      actorId: actor.userId,
      occurredAt: new Date(),
    });
    return photo;
  }

  // Marca a vistoria completa → valida completude (dados mínimos + conjuntos obrigatórios) ANTES + encadeia
  // INSPECTION. Depois disto a guarda I3 (RECEPTION→ACTIVE_CUSTODY) passa (defense-in-depth: a guarda re-checa).
  async completeInspection(actor: ImpoundActorContext, processId: string): Promise<IntakeInspection> {
    const process = await this.get(actor, processId);
    const state = await this.repository.getIntakeState(actor.tenantId, process.id);
    if (!state?.inspection) {
      throw new ImpoundError(404, "IMPOUND_INSPECTION_NOT_FOUND", "inspection_not_found", "No intake inspection registered for this process.");
    }
    const requiredSets = resolveRequiredPhotoSets(state.profileRequiredSets);
    const gaps = intakeCompletenessGaps(state.inspection, state.storedSets, requiredSets);
    if (gaps.length > 0) {
      throw new ImpoundError(
        409,
        "IMPOUND_GUARD_FAILED",
        "reception_inspection_incomplete",
        `Reception inspection is incomplete: ${gaps.join(", ")}.`,
      );
    }
    const { inspection } = await this.repository.completeInspection({
      tenantId: actor.tenantId,
      processId: process.id,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
    return inspection;
  }

  // ── PR-06: ocupação ATÔMICA (I1 real, 1 tx cross-módulo) ──────────────────────────────────────────────────
  // assignSpot — aloca a vaga + seta yard_id + encadeia SPOT_ASSIGNED numa ÚNICA tx (repositório). Falha de
  // qualquer passo → rollback de tudo (sem vaga órfã; elimina o vacate compensatório do PR-05).
  async assignSpot(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<ImpoundProcess> {
    const process = await this.get(actor, processId);
    const spotId = parseRequiredUuid(body.spot_id ?? body.spotId, "spotId");
    return this.repository.assignSpotAtomic({
      tenantId: actor.tenantId,
      processId: process.id,
      spotId,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  async vacateSpot(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<ImpoundProcess> {
    const process = await this.get(actor, processId);
    const spotId = parseRequiredUuid(body.spot_id ?? body.spotId, "spotId");
    return this.repository.vacateSpotAtomic({
      tenantId: actor.tenantId,
      processId: process.id,
      spotId,
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  async moveSpot(actor: ImpoundActorContext, processId: string, body: RawRecord): Promise<ImpoundProcess> {
    const process = await this.get(actor, processId);
    return this.repository.moveSpotAtomic({
      tenantId: actor.tenantId,
      processId: process.id,
      fromSpotId: parseRequiredUuid(body.from_spot_id ?? body.fromSpotId, "fromSpotId"),
      toSpotId: parseRequiredUuid(body.to_spot_id ?? body.toSpotId, "toSpotId"),
      actorId: actor.userId,
      occurredAt: new Date(),
    });
  }

  // Verificação da cadeia (I2) — GET /impound-processes/:id/verify. Lê head/events/anchors num ÚNICO snapshot
  // REPEATABLE READ (verify-snapshot D-Ω5P-REC-07) → sem count_/cross_anchor_mismatch transitório sob append
  // concorrente. Recomputa do GENESIS, confronta a âncora do agregado E reconcilia o cross-anchor do audit_logs.
  async verify(actor: ImpoundActorContext, processId: string): Promise<VerifyChainResult> {
    const normalizedId = parseRequiredUuid(processId, "processId");
    const snapshot = await this.repository.readChainSnapshot(actor.tenantId, normalizedId);
    if (!snapshot) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    return verifyChain({
      tenantId: actor.tenantId,
      processId: normalizedId,
      events: snapshot.events,
      head: snapshot.head,
      crossAnchors: snapshot.crossAnchors,
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
// O repo de memória recebe o repo de PÁTIO de memória (mesmo singleton do OccupancyService de memória) → a
// alocação atômica (assignSpotAtomic) compõe yard+impound de forma consistente nos testes InMemory.
const memoryRepository = new InMemoryImpoundRepository(getMemoryYardRepositoryForTests());
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
