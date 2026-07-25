import { getTelemetryAccess } from "./telemetry.service";
import type { TelemetryPeriod } from "./telemetry.types";
import { useTelemetryResource } from "./useTelemetryResource";

// Ω4C PR-14 — Acessos do app (GET /telemetry/access, gate telemetry:read). Exige profissional selecionado.
export function useTelemetryAccess(professionalId: string, period: TelemetryPeriod) {
  return useTelemetryResource({ loader: getTelemetryAccess, period, professionalId, requiresProfessional: true });
}
