import { getTelemetryRefusals } from "./telemetry.service";
import type { TelemetryPeriod } from "./telemetry.types";
import { useTelemetryResource } from "./useTelemetryResource";

// Ω4C PR-14 — Recusas de serviço (GET /telemetry/refusals, gate telemetry:read). Exige profissional selecionado.
export function useTelemetryRefusals(professionalId: string, period: TelemetryPeriod) {
  return useTelemetryResource({ loader: getTelemetryRefusals, period, professionalId, requiresProfessional: true });
}
