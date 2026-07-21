import {
  formatLastSeen,
  getFieldLocationStatusLabel,
  getFieldLocationStatusTone,
} from "../operations/map/operations-map.adapter";
import type { FieldLocationItem, FieldLocationStatus } from "../operations/map/operations-map.types";
import type { FieldOperatorRow } from "./field-operators.types";

// PR-SCALE-4 — adapta as localizações reais (FieldLocationItem, mesma fonte do Mapa) para as linhas da
// tela "Operadores de Campo". REUSA os helpers do Mapa (formatLastSeen / getFieldLocationStatusLabel /
// getFieldLocationStatusTone) para não duplicar lógica. LGPD §12: a linha NUNCA carrega latitude/
// longitude — só nome, equipe, OS atual, frescor da posição e status. D-007: só mapeia o que veio.

// Ordem operacional (triagem do despacho): disponível primeiro (pronto para receber chamado), depois
// engajado (a caminho / no local / atendendo), pausa e, por fim, fora de operação (bloqueado/offline/
// desconhecido). Empate → posição mais recente primeiro (frescor).
const STATUS_ORDER: Record<FieldLocationStatus, number> = {
  available: 0,
  on_route: 1,
  on_site: 2,
  in_service: 3,
  paused: 4,
  blocked: 5,
  offline: 6,
  unknown: 7,
};

export function adaptFieldOperators(
  locations: readonly FieldLocationItem[],
  now: Date = new Date(),
): FieldOperatorRow[] {
  return [...locations]
    .sort((left, right) => {
      const orderDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (orderDelta !== 0) return orderDelta;
      return Date.parse(right.capturedAt) - Date.parse(left.capturedAt);
    })
    .map((location) => toFieldOperatorRow(location, now));
}

function toFieldOperatorRow(location: FieldLocationItem, now: Date): FieldOperatorRow {
  // LGPD §12: seleção EXPLÍCITA de campos — latitude/longitude (presentes no FieldLocationItem) NUNCA
  // entram na linha. Nada de spread do location para não vazar coordenada por acidente.
  return {
    id: location.id,
    name: location.displayName,
    team: location.teamName?.trim() || "Sem equipe",
    currentOs: currentOsCode(location),
    lastSeen: formatLastSeen(location.capturedAt, now),
    statusLabel: getFieldLocationStatusLabel(location.status),
    statusTone: getFieldLocationStatusTone(location.status, location.isStale),
    status: location.status,
  };
}

// OS atual = código humano da OS vinculada ("OS-2891"). O despacho atual (currentDispatch) carrega só o
// workOrderId opaco — nunca um código humano — então não é renderizado como "OS atual" (§2.8/honestidade);
// sem OS vinculada → "—".
function currentOsCode(location: FieldLocationItem): string {
  return location.currentWorkOrder?.code ?? "—";
}

// ————— KPIs honestos: contagem por categoria REAL do enum FieldLocationStatus (nada fabricado) —————

export type FieldOperatorStatusSummary = {
  readonly total: number;
  readonly available: number; // available
  readonly engaged: number; // on_route + on_site + in_service (a caminho / no local / atendendo)
  readonly paused: number; // paused
  readonly offDuty: number; // offline + blocked + unknown (sem sinal / bloqueado / desconhecido)
};

// Partição das 8 categorias reais do enum em 4 baldes operacionais. Cada número é uma contagem
// verificável sobre a MESMA lista exibida — nunca um valor inventado (D-007). unknown entra em
// "fora de operação" porque, sem status conhecido, o operador não é despachável.
export function summarizeFieldOperatorStatuses(
  operators: readonly Pick<FieldOperatorRow, "status">[],
): FieldOperatorStatusSummary {
  const summary = { total: operators.length, available: 0, engaged: 0, paused: 0, offDuty: 0 };
  for (const operator of operators) {
    switch (operator.status) {
      case "available":
        summary.available += 1;
        break;
      case "on_route":
      case "on_site":
      case "in_service":
        summary.engaged += 1;
        break;
      case "paused":
        summary.paused += 1;
        break;
      case "offline":
      case "blocked":
      case "unknown":
        summary.offDuty += 1;
        break;
    }
  }
  return summary;
}
