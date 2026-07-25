import { getTelemetryDevices } from "./telemetry.service";
import type { TelemetryPeriod } from "./telemetry.types";
import { useTelemetryResource } from "./useTelemetryResource";

// Ω4C PR-14 — Dispositivos (GET /telemetry/devices, gate telemetry:read). NÃO exige profissional (lista do
// tenant inteiro) — o backend deriva do último app_connect por profissional.
export function useTelemetryDevices(period: TelemetryPeriod) {
  return useTelemetryResource({ loader: getTelemetryDevices, period, requiresProfessional: false });
}
