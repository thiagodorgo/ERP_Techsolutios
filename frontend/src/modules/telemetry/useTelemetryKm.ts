import { getTelemetryKm } from "./telemetry.service";
import type { TelemetryPeriod } from "./telemetry.types";
import { useTelemetryResource } from "./useTelemetryResource";

// Ω4C PR-14 — Quilometragem (GET /telemetry/km, gate telemetry:read). Exige profissional selecionado.
export function useTelemetryKm(professionalId: string, period: TelemetryPeriod) {
  return useTelemetryResource({ loader: getTelemetryKm, period, professionalId, requiresProfessional: true });
}
