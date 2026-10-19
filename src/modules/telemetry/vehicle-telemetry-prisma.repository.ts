// B-TRC-02 · SQL da telemetria VEICULAR (plano v2 §6.6; emenda v2.1 R1-1, R1-3, R4-1, R4-2). Todo SQL é `$queryRaw` com
// TEMPLATE (cada valor vira parâmetro). O executor é o `tx` de quem chama — sob o GUC da organização (ENABLE + FORCE RLS).
//
// `withSampleSavepoint` é o ÚNICO emissor de SAVEPOINT/RELEASE/ROLLBACK TO fora de `identity-resolver.ts` (R4-1), com um nome
// só (`vehicle_sample`) para os dois caminhos da amostra (posição aceita; [Q1=SIM] quarentena por operador) — eles nunca se
// aninham. Só o DOMÍNIO é descartável (R4-2): CHECK violado (23514) ou número fora da faixa (22003) → ROLLBACK TO + aviso
// `sample_discarded` + segue. QUALQUER outro erro (FK de isolamento 23503, RLS 42501, unicidade 23505, contenção 55P03/57014,
// transação abortada 25P02, erro de programação) → ROLLBACK TO + RELANÇA: a fase 2 inteira volta e a entrega responde 503.
// Amostra recusada por FK ou RLS é sinal de defeito de isolamento — e sinal de isolamento não vira `warn`.

import type {
  VehicleTelemetryExecutor,
  VehicleTelemetryRepository,
} from "./vehicle-telemetry.repository.js";
import type {
  VehicleDeviceStatusKind,
  VehicleIgnitionKind,
  VehicleTelemetryEventInsert,
  VehicleTelemetryRow,
  VehicleTelemetrySampleInsert,
} from "./vehicle-telemetry.types.js";

/** A lista FECHADA do que vira `sample_discarded` (R4-2): só domínio. */
export const SAMPLE_DISCARD_SQLSTATES: ReadonlySet<string> = new Set(["23514", "22003"]);

export type SampleWork =
  | { readonly kind: "inserted" }
  | { readonly kind: "noop" }
  | { readonly kind: "divert"; readonly outcome: unknown }
  | { readonly kind: "skip"; readonly reason: "fix_already_sampled" };

export type SampleSavepointLogger = {
  info(object: Record<string, unknown>, message: string): void;
  warn(object: Record<string, unknown>, message: string): void;
};

/**
 * SAVEPOINT vehicle_sample → work() → `inserted`/`noop`/`divert` ⇒ RELEASE; `skip` ⇒ ROLLBACK TO (desfaz o que o work
 * gravou, ex.: o recibo `position_sample` cuja amostra deu 0 linhas — R1-3) + log `sample_skipped`; exceção ⇒ ROLLBACK TO +
 * classificação pelo SQLSTATE (R4-2). Devolve `undefined` só quando a amostra foi DESCARTADA por domínio.
 */
export async function withSampleSavepoint<T extends SampleWork>(
  tx: VehicleTelemetryExecutor,
  logger: SampleSavepointLogger | undefined,
  errorCode: (error: unknown) => string,
  work: () => Promise<T>,
): Promise<T | undefined> {
  await tx.$executeRaw`SAVEPOINT vehicle_sample`;
  let result: T;
  try {
    result = await work();
  } catch (error) {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT vehicle_sample`; // erro: desfaz e classifica
    if (!SAMPLE_DISCARD_SQLSTATES.has(errorCode(error))) throw error;
    logger?.warn({ outcome: "sample_discarded", code: errorCode(error) }, "Traccar ingestion discarded a vehicle sample");
    return undefined;
  }
  if (result.kind === "skip") {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT vehicle_sample`; // skip: desfaz o recibo
    logger?.info({ outcome: "sample_skipped", reason: result.reason }, "Traccar ingestion skipped a vehicle sample");
    return result;
  }
  await tx.$executeRaw`RELEASE SAVEPOINT vehicle_sample`;
  return result;
}

type NullableSample = {
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly bindingId: string;
  readonly receiptId: string;
  readonly occurredAt: Date;
  readonly fixKey: string;
  readonly source: string;
  readonly traccarPositionId: string | null;
  readonly ignition: boolean | null;
  readonly motion: boolean | null;
  readonly odometerM: number | null;
  readonly totalDistanceM: number | null;
  readonly engineHoursS: number | null;
  readonly powerMv: number | null;
  readonly batteryLevelPct: number | null;
};

function withNulls(input: VehicleTelemetrySampleInsert): NullableSample {
  return {
    tenantId: input.tenantId,
    vehicleId: input.vehicleId,
    bindingId: input.bindingId,
    receiptId: input.receiptId,
    occurredAt: input.occurredAt,
    fixKey: input.fixKey,
    source: input.source ?? "forward",
    traccarPositionId: input.traccarPositionId ?? null,
    ignition: input.ignition ?? null,
    motion: input.motion ?? null,
    odometerM: input.odometerM ?? null,
    totalDistanceM: input.totalDistanceM ?? null,
    engineHoursS: input.engineHoursS ?? null,
    powerMv: input.powerMv ?? null,
    batteryLevelPct: input.batteryLevelPct ?? null,
  };
}

/** Inteiro de até 2^53 − 1 como TEXTO para o parâmetro BIGINT: nunca passa por int4 nem por ponto flutuante no driver. */
const bigintText = (value: number | null): string | null => (value === null ? null : String(value));

export class PrismaVehicleTelemetryRepository implements VehicleTelemetryRepository {
  async insertEvent(tx: VehicleTelemetryExecutor, row: VehicleTelemetryEventInsert): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO vehicle_telemetry_events
        (tenant_id, vehicle_id, binding_id, receipt_id, kind, alarm_code, source, occurred_at, traccar_event_id, traccar_position_id)
      VALUES (${row.tenantId}::uuid, ${row.vehicleId}::uuid, ${row.bindingId}::uuid, ${row.receiptId}::uuid, ${row.kind},
              ${row.alarmCode ?? null}, ${row.source}, ${row.occurredAt}, ${row.traccarEventId ?? null}::bigint,
              ${row.traccarPositionId ?? null}::bigint)
      RETURNING id::text AS "id"`;
    return rows[0]!.id;
  }

  async insertSample(tx: VehicleTelemetryExecutor, input: VehicleTelemetrySampleInsert): Promise<string | undefined> {
    const sample = withNulls(input);
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO vehicle_telemetry_events
        (tenant_id, vehicle_id, binding_id, receipt_id, kind, source, occurred_at, traccar_position_id, fix_key,
         ignition, motion, odometer_m, total_distance_m, engine_hours_s, power_mv, battery_level_pct)
      VALUES (${sample.tenantId}::uuid, ${sample.vehicleId}::uuid, ${sample.bindingId}::uuid, ${sample.receiptId}::uuid, 'sample',
              ${sample.source}, ${sample.occurredAt}, ${sample.traccarPositionId}::bigint, ${sample.fixKey},
              ${sample.ignition}::boolean, ${sample.motion}::boolean, ${bigintText(sample.odometerM)}::bigint,
              ${bigintText(sample.totalDistanceM)}::bigint, ${bigintText(sample.engineHoursS)}::bigint, ${sample.powerMv},
              ${sample.batteryLevelPct})
      ON CONFLICT ("tenant_id", "fix_key") WHERE "kind" = 'sample' DO NOTHING
      RETURNING id::text AS "id"`;
    return rows[0]?.id;
  }

  async latestDeviceStatus(tx: VehicleTelemetryExecutor, tenantId: string, vehicleId: string): Promise<VehicleDeviceStatusKind | undefined> {
    const rows = await tx.$queryRaw<Array<{ kind: VehicleDeviceStatusKind }>>`
      SELECT kind FROM vehicle_telemetry_events
       WHERE tenant_id = ${tenantId}::uuid AND vehicle_id = ${vehicleId}::uuid
         AND kind IN ('device_online', 'device_unknown', 'device_offline')
       ORDER BY "occurred_at" DESC, CASE kind WHEN 'device_offline' THEN 0 WHEN 'device_unknown' THEN 1 ELSE 2 END ASC
       LIMIT 1`;
    return rows[0]?.kind;
  }

  async latestIgnition(tx: VehicleTelemetryExecutor, tenantId: string, vehicleId: string): Promise<VehicleIgnitionKind | undefined> {
    const rows = await tx.$queryRaw<Array<{ kind: VehicleIgnitionKind }>>`
      SELECT kind FROM vehicle_telemetry_events
       WHERE tenant_id = ${tenantId}::uuid AND vehicle_id = ${vehicleId}::uuid AND kind IN ('ignition_on', 'ignition_off')
       ORDER BY occurred_at DESC, CASE kind WHEN 'ignition_off' THEN 0 ELSE 1 END ASC
       LIMIT 1`;
    return rows[0]?.kind;
  }

  async listByVehicle(tx: VehicleTelemetryExecutor, tenantId: string, vehicleId: string, limit: number): Promise<VehicleTelemetryRow[]> {
    return tx.$queryRaw<VehicleTelemetryRow[]>`
      SELECT id::text AS "id", tenant_id::text AS "tenantId", vehicle_id::text AS "vehicleId", kind,
             alarm_code AS "alarmCode", occurred_at AS "occurredAt"
        FROM vehicle_telemetry_events
       WHERE tenant_id = ${tenantId}::uuid AND vehicle_id = ${vehicleId}::uuid
       ORDER BY "occurred_at" DESC, id
       LIMIT ${Math.max(1, Math.min(limit, 500))}`;
  }
}
