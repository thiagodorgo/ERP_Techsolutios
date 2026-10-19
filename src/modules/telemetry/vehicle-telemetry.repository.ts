// B-TRC-02 · porta do repositório da telemetria VEICULAR (plano v2 §6.6; emenda v2.1 R1-1, R1-3). Sem rota: as leituras
// (`latestDeviceStatus`, `latestIgnition`, `listByVehicle`) são portas internas para o B-TRC-04, que decide o que exibir
// (P-TRC02-LGPD-TELEMETRIA-SEM-DESPACHO). A aplicação nunca faz UPDATE/DELETE nesta tabela (fato imutável).
// Toda operação recebe o executor da TRANSAÇÃO de quem chama (o `tx` de `withTenantRlsBudget`, já sob o GUC da organização):
// a linha nasce na mesma transação do recibo e cai junto com ela.

import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  VehicleDeviceStatusKind,
  VehicleIgnitionKind,
  VehicleTelemetryEventInsert,
  VehicleTelemetryRow,
  VehicleTelemetrySampleInsert,
} from "./vehicle-telemetry.types.js";

export type VehicleTelemetryExecutor = PrismaClient | Prisma.TransactionClient;

export interface VehicleTelemetryRepository {
  /** A linha de um evento do `event.forward` (uma por recibo). Devolve o id. */
  insertEvent(tx: VehicleTelemetryExecutor, row: VehicleTelemetryEventInsert): Promise<string>;
  /**
   * A amostra (`kind='sample'`). `ON CONFLICT (tenant_id, fix_key) WHERE kind = 'sample' DO NOTHING RETURNING id`:
   * `undefined` = 0 linhas = o fix já tem amostra NESTA organização (um fix → uma amostra; nunca lança por isso).
   */
  insertSample(tx: VehicleTelemetryExecutor, sample: VehicleTelemetrySampleInsert): Promise<string | undefined>;
  /** O status derivado: maior `occurred_at` entre os 3 kinds; empate → offline > unknown > online. Nunca `received_at`. */
  latestDeviceStatus(tx: VehicleTelemetryExecutor, tenantId: string, vehicleId: string): Promise<VehicleDeviceStatusKind | undefined>;
  /** A última ignição por `occurred_at`; empate → `ignition_off`. Nunca `received_at`. */
  latestIgnition(tx: VehicleTelemetryExecutor, tenantId: string, vehicleId: string): Promise<VehicleIgnitionKind | undefined>;
  listByVehicle(tx: VehicleTelemetryExecutor, tenantId: string, vehicleId: string, limit: number): Promise<VehicleTelemetryRow[]>;
}
