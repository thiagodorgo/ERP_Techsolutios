// B-TRC-02 · telemetria VEICULAR do Traccar (plano v2 §6.1; emenda v2.1). Tipos do módulo — sem rota, sem leitura pública.
// Separada de `telemetry_events` (app de campo): aqui o sujeito é a VIATURA, nunca uma pessoa.

/** Os `kind` da tabela `vehicle_telemetry_events` — a mesma lista do CHECK `vehicle_telemetry_events_kind_check`. */
export const VEHICLE_TELEMETRY_EVENT_KINDS = [
  "device_online",
  "device_unknown",
  "device_offline",
  "device_moving",
  "device_stopped",
  "device_overspeed",
  "ignition_on",
  "ignition_off",
  "alarm",
] as const;

export type VehicleTelemetryEventKind = (typeof VEHICLE_TELEMETRY_EVENT_KINDS)[number];
export type VehicleTelemetryKind = "sample" | VehicleTelemetryEventKind;
export type VehicleTelemetrySource = "forward" | "reconciliation";
export type VehicleDeviceStatusKind = "device_online" | "device_unknown" | "device_offline";
export type VehicleIgnitionKind = "ignition_on" | "ignition_off";

/** Os atributos veiculares allowlisted de UMA posição, já normalizados para a unidade da coluna (§6.3). */
export type VehicleTelemetrySample = {
  readonly ignition?: boolean;
  readonly motion?: boolean;
  readonly odometerM?: number;
  readonly totalDistanceM?: number;
  readonly engineHoursS?: number;
  readonly powerMv?: number;
  readonly batteryLevelPct?: number;
};

/** A linha `kind='sample'`: a amostra pendurada no recibo da posição ACEITA (Q1 = NÃO). */
export type VehicleTelemetrySampleInsert = VehicleTelemetrySample & {
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly bindingId: string;
  readonly receiptId: string;
  readonly occurredAt: Date;
  readonly source?: VehicleTelemetrySource;
  readonly traccarPositionId?: string;
};

/** A linha de um evento do `event.forward` (sem medida; `alarm_code` só em `kind='alarm'`). */
export type VehicleTelemetryEventInsert = {
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly bindingId: string;
  readonly receiptId: string;
  readonly kind: VehicleTelemetryEventKind;
  readonly alarmCode?: string;
  readonly occurredAt: Date;
  readonly source: VehicleTelemetrySource;
  readonly traccarEventId?: string;
  readonly traccarPositionId?: string;
};

export type VehicleTelemetryRow = {
  readonly id: string;
  readonly tenantId: string;
  readonly vehicleId: string;
  readonly kind: VehicleTelemetryKind;
  readonly alarmCode: string | null;
  readonly occurredAt: Date;
};
