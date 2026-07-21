import type { FieldLocationStatus, OperationsMapSource } from "../operations/map/operations-map.types";

// PR-SCALE-4 — projeção da tela "Operadores de Campo". A tela consome a MESMA fonte real do Mapa
// (getLatestFieldLocations); esta projeção carrega só o que a lista mostra. LGPD §12: NUNCA inclui
// latitude/longitude — coordenada não trafega para a tabela nem para o CSV. §2.8: sem tenant_id/token.
// D-007: o front nunca fabrica operador — vazio vira estado honesto.

// Tonalidade do chip de status (espelha o retorno de getFieldLocationStatusTone do Mapa).
export type FieldOperatorStatusTone = "success" | "info" | "warning" | "danger" | "pending" | "default";

export type FieldOperatorRow = {
  readonly id: string;
  readonly name: string;
  // Equipe/função da operação de campo (teamName real ou "Sem equipe"); nunca um valor inventado.
  readonly team: string;
  // Código da OS atual vinculada (ex.: "OS-2891") ou "—" quando o operador não está em atendimento.
  readonly currentOs: string;
  // Frescor da última posição ("há X min") — NUNCA a coordenada em si (LGPD §12).
  readonly lastSeen: string;
  readonly statusLabel: string;
  readonly statusTone: FieldOperatorStatusTone;
  // Status bruto do enum real — usado só para derivar os KPIs honestos por categoria (não é PII;
  // já é exibido como rótulo). Mantido fora do que a UI renderiza como coordenada.
  readonly status: FieldLocationStatus;
};

export type FieldOperatorsData = {
  readonly operators: readonly FieldOperatorRow[];
  readonly source: OperationsMapSource;
  readonly fallbackReason?: string;
};

// Lista VAZIA honesta (mock/erro): sem inventar operador (D-007). A UI mostra o estado honesto.
export function emptyFieldOperators(source: OperationsMapSource): FieldOperatorsData {
  return { operators: [], source };
}
