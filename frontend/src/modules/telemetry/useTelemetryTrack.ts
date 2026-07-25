import { getTelemetryTrack } from "./telemetry.service";
import type { TelemetryPeriod } from "./telemetry.types";
import { useTelemetryResource } from "./useTelemetryResource";

// Ω4C PR-15 (Junta de Mapas J-MAPAS-9) — Rastreamento (GET /telemetry/track, gate telemetry:read + consent na
// origem). EXIGE profissional selecionado: sem seleção o loader compartilhado para em needs_professional e o
// endpoint NÃO é chamado (D-007, não fabrica trajeto). Reusa o mesmo carregador das 4 telas do PR-14.
export function useTelemetryTrack(professionalId: string, period: TelemetryPeriod) {
  return useTelemetryResource({ loader: getTelemetryTrack, period, professionalId, requiresProfessional: true });
}
