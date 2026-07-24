import { haversineMeters } from "./haversine.js";

// Ω4C PR-12 (D-Ω4C-TELE-PRECISION) — thresholds DECLARADOS (não escondidos). Override opcional por env,
// default honesto. accuracy_m acima do teto → ponto persistido cru mas EXCLUÍDO do km; segmento cuja
// velocidade implícita passe do teto (salto de GPS) → descartado do somatório.
export const TELEMETRY_ACCURACY_MAX_M = readPositiveEnv("TELEMETRY_ACCURACY_MAX_M", 100);
export const TELEMETRY_SPEED_MAX_KMH = readPositiveEnv("TELEMETRY_SPEED_MAX_KMH", 200);

// Janela default do rastreamento/km em horas + teto configurável (D-Ω4C-RECON-06).
export const TELEMETRY_WINDOW_DEFAULT_HOURS = readPositiveEnv("TELEMETRY_WINDOW_DEFAULT_HOURS", 24);
export const TELEMETRY_WINDOW_MAX_HOURS = readPositiveEnv("TELEMETRY_WINDOW_MAX_HOURS", 168);

export type KmPoint = {
  readonly lat: number;
  readonly lng: number;
  readonly capturedAt: Date;
  readonly accuracyM?: number;
};

export type KmSummary = {
  readonly kmTotal: number;
  readonly pointsUsed: number;
};

export type KmThresholds = {
  readonly accuracyMaxM: number;
  readonly speedMaxKmh: number;
};

// Σ haversine dos pontos CONSECUTIVOS (ordenados por captured_at) com filtro de precisão/velocidade.
// Sem pontos (ou 0/1 ponto elegível) → km 0 HONESTO (RN-TELE-03; nunca fabricado).
export function sumDailyKm(
  points: readonly KmPoint[],
  thresholds: KmThresholds = { accuracyMaxM: TELEMETRY_ACCURACY_MAX_M, speedMaxKmh: TELEMETRY_SPEED_MAX_KMH },
): KmSummary {
  // Precisão: descarta pontos com accuracy pior que o teto (RN-TELE-08). accuracy ausente = aceito.
  const eligible = [...points]
    .filter((point) => point.accuracyM === undefined || point.accuracyM <= thresholds.accuracyMaxM)
    .sort((left, right) => left.capturedAt.getTime() - right.capturedAt.getTime());

  if (eligible.length < 2) {
    return { kmTotal: 0, pointsUsed: eligible.length };
  }

  let meters = 0;
  for (let index = 1; index < eligible.length; index += 1) {
    const previous = eligible[index - 1];
    const current = eligible[index];
    const segmentMeters = haversineMeters(previous, current);
    // Velocidade irreal (salto de GPS) → descarta o SEGMENTO do somatório (RN-TELE-08). O ponto de destino
    // segue elegível para o próximo segmento (a âncora avança normalmente na iteração).
    if (impliesUnrealisticSpeed(segmentMeters, previous.capturedAt, current.capturedAt, thresholds.speedMaxKmh)) {
      continue;
    }
    meters += segmentMeters;
  }

  return { kmTotal: roundKm(meters / 1000), pointsUsed: eligible.length };
}

function impliesUnrealisticSpeed(meters: number, from: Date, to: Date, speedMaxKmh: number): boolean {
  const seconds = (to.getTime() - from.getTime()) / 1000;
  if (seconds <= 0) {
    // Sem avanço de tempo mas com deslocamento → salto instantâneo, descarta.
    return meters > 0;
  }
  const kmh = (meters / 1000 / seconds) * 3600;
  return kmh > speedMaxKmh;
}

// km = Decimal(10,1) → 1 casa decimal (formatação on-read, sem coluna).
function roundKm(km: number): number {
  return Math.round(km * 10) / 10;
}

function readPositiveEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
