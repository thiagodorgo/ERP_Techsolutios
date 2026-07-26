import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { computeEventHash, genesisHash, type CrossAnchor } from "./impound.hashchain.js";
import type { ImpoundRepository } from "./impound.repository.js";
import type {
  AppendEventInput,
  AppendEventResult,
  ApplyTransitionInput,
  CanonicalValue,
  CreateImpoundProcessInput,
  CustodyEvent,
  CustodyEventDraft,
  CustodyEventType,
  ImpoundProcess,
  ImpoundStatus,
  ListImpoundProcessInput,
  ListImpoundProcessResult,
  UpdateImpoundProcessInput,
} from "./impound.types.js";
import { ImpoundError } from "./impound.types.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

type LockedProcessRow = {
  readonly status: string;
  readonly entered_at: Date | null;
  readonly custody_seq_head: number;
  readonly custody_hash_head: string | null;
};

// Repositório de baixo nível sobre um executor de transação. Os appends usam FOR UPDATE + inserção do evento +
// atualização da âncora + cross-anchor em audit_logs — SEMPRE dentro de uma tx (garantido pelo wrapper RLS).
export class PrismaImpoundRepository implements ImpoundRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async createProcess(input: CreateImpoundProcessInput): Promise<ImpoundProcess> {
    let created;
    try {
      created = await this.client.impoundProcess.create({
        data: {
          tenant_id: input.tenantId,
          vehicle_plate: input.vehiclePlate ?? null,
          vehicle_chassis: input.vehicleChassis ?? null,
          vehicle_renavam: input.vehicleRenavam ?? null,
          vehicle_brand: input.vehicleBrand ?? null,
          vehicle_model: input.vehicleModel ?? null,
          vehicle_color: input.vehicleColor ?? null,
          vehicle_year: input.vehicleYear ?? null,
          vehicle_unidentified: input.vehicleUnidentified,
          unidentified_reason: input.unidentifiedReason ?? null,
          yard_id: input.yardId ?? null,
          profile_id: input.profileId,
          status: "IN_REMOVAL",
          origin_authority: input.originAuthority,
          origin_agent_name: input.originAgentName ?? null,
          authority_case_number: input.authorityCaseNumber ?? null,
          incident_report_number: input.incidentReportNumber ?? null,
          legal_basis: input.legalBasis ?? null,
          service_order_id: input.serviceOrderId ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
    } catch (error) {
      throw translateImpoundError(error);
    }
    // Evento de abertura (seq=1) na MESMA tx. O processo recém-criado tem head 0/null → prev = GENESIS.
    const opening = await this.insertEventTx(input.tenantId, created.id, 0, null, input.openingEvent);
    return opening.process;
  }

  async listProcesses(input: ListImpoundProcessInput): Promise<ListImpoundProcessResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.impoundProcess.findMany({ where, orderBy: [{ created_at: "desc" }], take: input.limit, skip: input.offset }),
      this.client.impoundProcess.count({ where }),
    ]);
    return { items: items.map(mapProcess), total, limit: input.limit, offset: input.offset };
  }

  async findProcessById(tenantId: string, processId: string): Promise<ImpoundProcess | undefined> {
    const process = await this.client.impoundProcess.findFirst({ where: { tenant_id: tenantId, id: processId } });
    return process ? mapProcess(process) : undefined;
  }

  async updateProcess(input: UpdateImpoundProcessInput): Promise<ImpoundProcess | undefined> {
    try {
      const updated = await this.client.impoundProcess.updateManyAndReturn({
        where: { tenant_id: input.tenantId, id: input.processId },
        data: compact({
          vehicle_plate: input.vehiclePlate,
          vehicle_chassis: input.vehicleChassis,
          vehicle_renavam: input.vehicleRenavam,
          vehicle_brand: input.vehicleBrand,
          vehicle_model: input.vehicleModel,
          vehicle_color: input.vehicleColor,
          vehicle_year: input.vehicleYear,
          origin_agent_name: input.originAgentName,
          authority_case_number: input.authorityCaseNumber,
          incident_report_number: input.incidentReportNumber,
          legal_basis: input.legalBasis,
          updated_by: input.updatedBy,
        }),
      });
      return updated[0] ? mapProcess(updated[0]) : undefined;
    } catch (error) {
      throw translateImpoundError(error);
    }
  }

  async listEvents(tenantId: string, processId: string): Promise<readonly CustodyEvent[]> {
    const rows = await this.client.custodyEvent.findMany({
      where: { tenant_id: tenantId, process_id: processId },
      orderBy: [{ seq: "asc" }],
    });
    return rows.map(mapEvent);
  }

  // Trilha do cross-anchor no store INDEPENDENTE audit_logs (§allowlist: só seq/hash do metadata — sem PII). O
  // filtro por action+entity+processId isola os anchors de append deste processo. Reconciliado no verifyChain.
  async listAuditAnchors(tenantId: string, processId: string): Promise<readonly CrossAnchor[]> {
    const rows = await this.client.$queryRaw<Array<{ seq: number; hash: string }>>`
      SELECT (metadata->>'seq')::int AS seq, metadata->>'hash' AS hash
      FROM audit_logs
      WHERE tenant_id = ${tenantId}::uuid
        AND action = 'impound.custody_event.appended'
        AND entity = 'custody_event'
        AND metadata->>'processId' = ${processId}
      ORDER BY (metadata->>'seq')::int ASC
    `;
    return rows.map((row) => ({ seq: Number(row.seq), hash: row.hash }));
  }

  async applyTransition(input: ApplyTransitionInput): Promise<ImpoundProcess> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    // Anti-corrida REAL: sob FOR UPDATE, o estado tem de ser AINDA o esperado. Se outra tx já transicionou o
    // processo, o status mudou → 409 concurrent_custody_append (a @@unique(tenant,process,seq) é o backstop).
    if (locked.status !== input.expectedFrom) {
      throw new ImpoundError(409, "IMPOUND_CONFLICT", "concurrent_custody_append", "The custody process changed concurrently; retry.");
    }
    await this.client.impoundProcess.update({
      where: { id: input.processId },
      data: compact({
        status: input.to,
        entered_at: input.setEnteredAt && !locked.entered_at ? input.event.occurredAt : undefined,
        frozen_at: input.setFrozenAt ? input.event.occurredAt : undefined,
      }),
    });
    const result = await this.insertEventTx(
      input.tenantId,
      input.processId,
      locked.custody_seq_head,
      locked.custody_hash_head,
      input.event,
    );
    return result.process;
  }

  async appendEvent(input: AppendEventInput): Promise<AppendEventResult> {
    const locked = await this.lockProcess(input.tenantId, input.processId);
    if (!locked) {
      throw new ImpoundError(404, "IMPOUND_NOT_FOUND", "not_found", "Custody process was not found.");
    }
    return this.insertEventTx(input.tenantId, input.processId, locked.custody_seq_head, locked.custody_hash_head, input.event);
  }

  // SELECT ... FOR UPDATE do processo — serializa appends concorrentes no MESMO processo (anti-corrida da FSM).
  private async lockProcess(tenantId: string, processId: string): Promise<LockedProcessRow | undefined> {
    const rows = await this.client.$queryRaw<LockedProcessRow[]>`
      SELECT status, entered_at, custody_seq_head, custody_hash_head
      FROM impound_processes
      WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }

  // O NÚCLEO transacional do append (I2): computa seq/prev/hash, INSERE o evento (P2002 no seq → 409), atualiza
  // a âncora custody_seq_head/custody_hash_head e grava o cross-anchor em audit_logs (store INDEPENDENTE) —
  // tudo na MESMA tx. Pressupõe que o processo já está travado (createProcess acaba de criar; append/transition
  // já rodaram lockProcess).
  private async insertEventTx(
    tenantId: string,
    processId: string,
    headSeq: number,
    headHash: string | null,
    draft: CustodyEventDraft,
  ): Promise<AppendEventResult> {
    const seq = headSeq + 1;
    const prevHash = headHash ?? genesisHash(tenantId, processId);
    const hash = computeEventHash({
      prevHash,
      seq,
      type: draft.type,
      payload: draft.payload,
      occurredAt: draft.occurredAt,
      actorId: draft.actorId ?? null,
    });

    let eventRow;
    try {
      eventRow = await this.client.custodyEvent.create({
        data: {
          tenant_id: tenantId,
          process_id: processId,
          seq,
          type: draft.type,
          payload: draft.payload as Prisma.InputJsonValue,
          occurred_at: draft.occurredAt,
          actor_id: draft.actorId ?? null,
          prev_hash: prevHash,
          hash,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ImpoundError(409, "IMPOUND_CONFLICT", "concurrent_custody_append", "A concurrent custody append raced this one; retry.");
      }
      throw translateImpoundError(error);
    }

    const updated = await this.client.impoundProcess.update({
      where: { id: processId },
      data: { custody_seq_head: seq, custody_hash_head: hash },
    });

    // Cross-anchor (I2): store append-only INDEPENDENTE. Sem PII (só processId/seq/hash) — forjar passa a exigir
    // adulterar DOIS stores auditados na mesma janela.
    await this.client.auditLog.create({
      data: {
        tenant_id: tenantId,
        actor_user_id: draft.actorId ?? null,
        action: "impound.custody_event.appended",
        entity: "custody_event",
        entity_id: eventRow.id,
        metadata: { processId, seq, hash },
      },
    });

    return { process: mapProcess(updated), event: mapEvent(eventRow) };
  }
}

// Wrapper RLS: cada método abre uma transação com app.current_tenant_id (setTenantRlsContext). Os appends
// rodam TODO o fluxo (FOR UPDATE + insert + head + cross-anchor) numa só tx.
export class RlsPrismaImpoundRepository implements ImpoundRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  createProcess(input: CreateImpoundProcessInput): Promise<ImpoundProcess> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaImpoundRepository(tx).createProcess(input));
  }

  listProcesses(input: ListImpoundProcessInput): Promise<ListImpoundProcessResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaImpoundRepository(tx).listProcesses(input));
  }

  findProcessById(tenantId: string, processId: string): Promise<ImpoundProcess | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundRepository(tx).findProcessById(tenantId, processId));
  }

  updateProcess(input: UpdateImpoundProcessInput): Promise<ImpoundProcess | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaImpoundRepository(tx).updateProcess(input));
  }

  listEvents(tenantId: string, processId: string): Promise<readonly CustodyEvent[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundRepository(tx).listEvents(tenantId, processId));
  }

  listAuditAnchors(tenantId: string, processId: string): Promise<readonly CrossAnchor[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundRepository(tx).listAuditAnchors(tenantId, processId));
  }

  applyTransition(input: ApplyTransitionInput): Promise<ImpoundProcess> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaImpoundRepository(tx).applyTransition(input));
  }

  appendEvent(input: AppendEventInput): Promise<AppendEventResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaImpoundRepository(tx).appendEvent(input));
  }
}

export async function createPrismaImpoundRepository(): Promise<RlsPrismaImpoundRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaImpoundRepository(prisma);
}

function buildWhere(input: ListImpoundProcessInput): Prisma.ImpoundProcessWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.yardId !== undefined ? { yard_id: input.yardId } : {}),
    ...(input.profileId !== undefined ? { profile_id: input.profileId } : {}),
    ...(input.plate !== undefined ? { vehicle_plate: input.plate } : {}),
  };
}

type ProcessRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly vehicle_plate: string | null;
  readonly vehicle_chassis: string | null;
  readonly vehicle_renavam: string | null;
  readonly vehicle_brand: string | null;
  readonly vehicle_model: string | null;
  readonly vehicle_color: string | null;
  readonly vehicle_year: number | null;
  readonly vehicle_unidentified: boolean;
  readonly unidentified_reason: string | null;
  readonly yard_id: string | null;
  readonly profile_id: string;
  readonly status: string;
  readonly entered_at: Date | null;
  readonly frozen_at: Date | null;
  readonly origin_authority: string;
  readonly origin_agent_name: string | null;
  readonly authority_case_number: string | null;
  readonly incident_report_number: string | null;
  readonly legal_basis: string | null;
  readonly service_order_id: string | null;
  readonly custody_seq_head: number;
  readonly custody_hash_head: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapProcess(record: ProcessRecord): ImpoundProcess {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    vehiclePlate: record.vehicle_plate ?? undefined,
    vehicleChassis: record.vehicle_chassis ?? undefined,
    vehicleRenavam: record.vehicle_renavam ?? undefined,
    vehicleBrand: record.vehicle_brand ?? undefined,
    vehicleModel: record.vehicle_model ?? undefined,
    vehicleColor: record.vehicle_color ?? undefined,
    vehicleYear: record.vehicle_year ?? undefined,
    vehicleUnidentified: record.vehicle_unidentified,
    unidentifiedReason: record.unidentified_reason ?? undefined,
    yardId: record.yard_id ?? undefined,
    profileId: record.profile_id,
    status: record.status as ImpoundStatus,
    enteredAt: record.entered_at ?? undefined,
    frozenAt: record.frozen_at ?? undefined,
    originAuthority: record.origin_authority,
    originAgentName: record.origin_agent_name ?? undefined,
    authorityCaseNumber: record.authority_case_number ?? undefined,
    incidentReportNumber: record.incident_report_number ?? undefined,
    legalBasis: record.legal_basis ?? undefined,
    serviceOrderId: record.service_order_id ?? undefined,
    custodySeqHead: record.custody_seq_head,
    custodyHashHead: record.custody_hash_head ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

type EventRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly seq: number;
  readonly type: string;
  readonly payload: unknown;
  readonly occurred_at: Date;
  readonly actor_id: string | null;
  readonly prev_hash: string;
  readonly hash: string;
  readonly created_at: Date;
};

function mapEvent(record: EventRecord): CustodyEvent {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    processId: record.process_id,
    seq: record.seq,
    type: record.type as CustodyEventType,
    payload: record.payload as CanonicalValue,
    occurredAt: record.occurred_at,
    actorId: record.actor_id ?? undefined,
    prevHash: record.prev_hash,
    hash: record.hash,
    createdAt: record.created_at,
  };
}

// P2002 (unique) → 409 conforme a chave; P2003 (FK) → 400 com a referência inválida.
function translateImpoundError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    const target = errorTarget(error);
    if (target.includes("service_order")) {
      return new ImpoundError(409, "IMPOUND_CONFLICT", "duplicate_service_order", "A custody process already exists for this service order.");
    }
    if (target.includes("seq")) {
      return new ImpoundError(409, "IMPOUND_CONFLICT", "concurrent_custody_append", "A concurrent custody append raced this one; retry.");
    }
    return new ImpoundError(409, "IMPOUND_CONFLICT", "duplicate", "A record with this natural key already exists.");
  }
  if (isPrismaError(error, "P2003")) {
    const target = errorTarget(error);
    if (target.includes("profile")) {
      return new ImpoundError(400, "IMPOUND_INVALID", "invalid_profile_reference", "The referenced jurisdiction profile does not exist for this tenant.");
    }
    if (target.includes("yard")) {
      return new ImpoundError(400, "IMPOUND_INVALID", "invalid_yard_reference", "The referenced yard does not exist for this tenant.");
    }
    if (target.includes("service_order")) {
      return new ImpoundError(400, "IMPOUND_INVALID", "invalid_service_order_reference", "The referenced service order does not exist for this tenant.");
    }
    if (target.includes("actor")) {
      return new ImpoundError(400, "IMPOUND_INVALID", "invalid_actor_reference", "The referenced actor does not exist for this tenant.");
    }
    return new ImpoundError(400, "IMPOUND_INVALID", "invalid_reference", "A referenced record does not exist for this tenant.");
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

// Detecção ampla da violação de UNIQUE no INSERT do evento (pg 23505 → P2002; ou o índice cru).
function isUniqueViolation(error: unknown): boolean {
  if (isPrismaError(error, "P2002")) return true;
  if (typeof error !== "object" || error === null) return false;
  const record = error as { readonly code?: unknown; readonly meta?: Record<string, unknown>; readonly message?: unknown };
  const haystack = `${String(record.code ?? "")} ${String(record.meta?.code ?? "")} ${String(record.meta?.message ?? "")} ${String(record.message ?? "")}`.toLowerCase();
  return haystack.includes("23505") || haystack.includes("custody_events_tenant_id_process_id_seq_key");
}

function errorTarget(error: unknown): string {
  const meta = (error as { readonly meta?: Record<string, unknown> }).meta ?? {};
  return Object.values(meta).map((value) => String(value)).join(" ").toLowerCase();
}

function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
