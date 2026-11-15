import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls, withTenantRlsBudget } from "../../database/rls.js";
import type {
  FieldLocationStoredSource,
  FieldOperatorLocation,
  ListFieldLocationHistoryInput,
  ListLatestFieldLocationsInput,
  RecordFieldLocationInput,
} from "./field-location.types.js";
import { fieldLocationBusyError, isBusyDatabaseFailure } from "./field-location.types.js";
import {
  assertTrackingConsentForWrite,
  HolderWriteGate,
  type FieldLocationRepository,
  type FieldLocationWriteGuard,
} from "./field-location.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// Gancho de teste (como o `afterBindingLocked` da ingestão do Traccar): roda dentro da transação da escrita, depois do
// `FOR NO KEY UPDATE` da linha do perfil e antes do INSERT. Em produção não há gancho.
export type FieldLocationWriteHooks = {
  readonly afterConsentLocked?: () => Promise<void>;
  // Emenda 1.7 (C16-05): avisa quando uma escrita guardada fica na fila do titular, fora do pool (só para teste).
  readonly onHolderGateWait?: () => void;
  // Emenda 1.8 (E17-07): o prazo da fila do titular, trocado só no teste (o padrão é HOLDER_GATE_MAX_WAIT_MS).
  readonly holderGateMaxWaitMs?: number;
};

export class PrismaFieldLocationRepository implements FieldLocationRepository {
  constructor(
    private readonly client: PrismaExecutor,
    private readonly hooks: FieldLocationWriteHooks = {},
  ) {}

  // B-SAN3-17 (Emenda 1.5, CX3-568-01; Emenda 1.6, CX3-568-03): com a guarda, a linha do perfil do titular é lida com
  // `FOR NO KEY UPDATE` na MESMA transação do INSERT (o executor TEM de ser a transação: o `RlsPrismaFieldLocationRepository`
  // a abre). Sem linha, ou sem consentimento, nada é inserido. A trava conflita consigo mesma e com o UPDATE da revogação:
  // a posição que chega com a revogação já na fila espera atrás dela e relê a linha nova (a trava compartilhada deixava
  // furar a fila). Não conflita com o `FOR KEY SHARE` das FKs que apontam para o perfil.
  async record(input: RecordFieldLocationInput, guard?: FieldLocationWriteGuard): Promise<FieldOperatorLocation> {
    if (guard?.requireTrackingConsent) {
      const rows = await this.client.$queryRaw<Array<{ tracking_consent: boolean }>>`
        SELECT tracking_consent FROM operator_profiles
         WHERE tenant_id = ${input.tenantId}::uuid AND user_id = ${input.operatorUserId}::uuid
           FOR NO KEY UPDATE`;
      assertTrackingConsentForWrite(rows.length === 0 ? undefined : rows[0]!.tracking_consent === true);
      await this.hooks.afterConsentLocked?.();
    }
    const location = await this.client.fieldOperatorLocation.create({
      data: {
        tenant_id: input.tenantId,
        operator_user_id: input.operatorUserId,
        source: input.source ?? "mobile",
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy_meters: input.accuracyMeters ?? null,
        heading_degrees: input.headingDegrees ?? null,
        speed_meters_per_second: input.speedMetersPerSecond ?? null,
        battery_level: input.batteryLevel ?? null,
        recorded_at: input.recordedAt ?? new Date(),
        metadata: toJsonObject(input.metadata ?? {}),
      },
      include: {
        operator_user: true,
      },
    });

    return mapFieldLocationRecord(location);
  }

  async listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]> {
    const candidates = await this.client.fieldOperatorLocation.findMany({
      where: {
        tenant_id: input.tenantId,
        ...(input.since ? { recorded_at: { gte: input.since } } : {}),
      },
      orderBy: [
        { recorded_at: "desc" },
        { received_at: "desc" },
      ],
      include: {
        operator_user: true,
      },
      take: Math.min((input.limit ?? 100) * 5, 1000),
    });
    const latestByOperator = new Map<string, FieldOperatorLocation>();

    for (const candidate of candidates) {
      if (latestByOperator.has(candidate.operator_user_id)) continue;

      latestByOperator.set(candidate.operator_user_id, mapFieldLocationRecord(candidate));
      if (latestByOperator.size >= (input.limit ?? 100)) break;
    }

    return [...latestByOperator.values()];
  }

  async listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]> {
    const locations = await this.client.fieldOperatorLocation.findMany({
      where: {
        tenant_id: input.tenantId,
        operator_user_id: input.operatorUserId,
        ...(input.sources ? { source: { in: [...input.sources] } } : {}),
        ...(input.from || input.to
          ? {
              recorded_at: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: [
        { recorded_at: "desc" },
        { received_at: "desc" },
      ],
      include: {
        operator_user: true,
      },
      take: input.limit ?? 100,
    });

    return locations.map(mapFieldLocationRecord);
  }
}

export class RlsPrismaFieldLocationRepository implements FieldLocationRepository {
  constructor(
    private readonly prismaClient: PrismaClient,
    private readonly hooks: FieldLocationWriteHooks = {},
  ) {}

  private readonly holderGate = new HolderWriteGate(HOLDER_WRITE_SLOTS);

  record(input: RecordFieldLocationInput, guard?: FieldLocationWriteGuard): Promise<FieldOperatorLocation> {
    if (!guard?.requireTrackingConsent) {
      return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFieldLocationRepository(tx, this.hooks).record(input, guard));
    }
    // Emenda 1.8 (E17-07): a escrita guardada tem orçamento (GUARDED_WRITE_BUDGET). Somado ao prazo da fila do titular,
    // a resposta sai antes dos 15 s em que o app desiste; o que estoura vira 503 e nada é gravado.
    const write = () =>
      withTenantRlsBudget(this.prismaClient, input.tenantId, GUARDED_WRITE_BUDGET, (tx) =>
        new PrismaFieldLocationRepository(tx, this.hooks).record(input, guard),
      ).catch((error: unknown) => {
        throw isBusyDatabaseFailure(error) ? fieldLocationBusyError() : error;
      });
    return this.holderGate.run(`${input.tenantId}:${input.operatorUserId}`, write, {
      onWait: this.hooks.onHolderGateWait,
      maxWaitMs: this.hooks.holderGateMaxWaitMs,
    });
  }

  listLatest(input: ListLatestFieldLocationsInput): Promise<readonly FieldOperatorLocation[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaFieldLocationRepository(tx).listLatest(input),
    );
  }

  listHistory(input: ListFieldLocationHistoryInput): Promise<readonly FieldOperatorLocation[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) =>
      new PrismaFieldLocationRepository(tx).listHistory(input),
    );
  }
}

// B-SAN3-17 (Emenda 1.7, C16-05): no máximo HOLDER_WRITE_SLOTS escritas guardadas do MESMO titular seguram conexão ao
// mesmo tempo, por processo (a fila é a `HolderWriteGate`, em `field-location.repository.ts`). Até HOLDER_WRITE_SLOTS
// simultâneas (o app manda uma por vez), elas esperam na fila da linha no Postgres, atrás da revogação.
export const HOLDER_WRITE_SLOTS = 3;

// Emenda 1.8 (E17-07): o orçamento da escrita guardada. Pool em 2 s, transação em 5 s, trava em 3 s, cada comando em 4 s.
const GUARDED_WRITE_BUDGET = { maxWait: 2_000, timeout: 5_000, lockTimeoutMs: 3_000, statementTimeoutMs: 4_000 } as const;

export async function createPrismaFieldLocationRepository(): Promise<RlsPrismaFieldLocationRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaFieldLocationRepository(prisma);
}

function mapFieldLocationRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly operator_user_id: string;
  readonly source: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy_meters: number | null;
  readonly heading_degrees: number | null;
  readonly speed_meters_per_second: number | null;
  readonly battery_level: number | null;
  readonly recorded_at: Date;
  readonly received_at: Date;
  readonly metadata: unknown;
  readonly operator_user?: {
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly status: string;
  };
}): FieldOperatorLocation {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    operatorUserId: record.operator_user_id,
    source: record.source as FieldLocationStoredSource,
    latitude: record.latitude,
    longitude: record.longitude,
    accuracyMeters: record.accuracy_meters ?? undefined,
    headingDegrees: record.heading_degrees ?? undefined,
    speedMetersPerSecond: record.speed_meters_per_second ?? undefined,
    batteryLevel: record.battery_level ?? undefined,
    recordedAt: record.recorded_at,
    receivedAt: record.received_at,
    metadata: isRecord(record.metadata) ? record.metadata : {},
    operator: record.operator_user
      ? {
          userId: record.operator_user.id,
          name: record.operator_user.name,
          email: record.operator_user.email,
          status: record.operator_user.status,
        }
      : undefined,
  };
}

function toJsonObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  return input as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
