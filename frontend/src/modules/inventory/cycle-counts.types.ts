// F7b Estoque avançado — contagem cíclica (R7.6).
// DTO camelCase de /cycle-counts. A sessão fotografa o saldo do sistema por item
// (`systemQuantity`), o operador informa o `countedQuantity`, e o fechamento gera
// movimentos de AJUSTE para as variâncias (relatório de variância).
import type { InventoryAbcClass, InventoryPagination, InventorySource } from "./inventory.types";

export type CycleCountStatus = "aberta" | "concluida" | "cancelada";

export type CycleCountEntry = {
  readonly id: string;
  readonly itemId: string;
  // Saldo fotografado na abertura da sessão (não muda enquanto a contagem existe).
  readonly systemQuantity: number;
  // Quantidade contada pelo operador — null até ser informada.
  readonly countedQuantity: number | null;
  // Variância = contado − sistema (computada; null enquanto não houver contagem).
  readonly variance: number | null;
  // Movimento de ajuste gerado no fechamento (quando houve variância).
  readonly adjustmentMovementId: string | null;
};

export type CycleCount = {
  readonly id: string;
  // Classe escolhida ao abrir (null = Todas as classes).
  readonly abcClass: InventoryAbcClass | null;
  readonly status: CycleCountStatus;
  readonly notes: string | null;
  // Entradas só vêm no detalhe (GET /:id) — vazio na listagem.
  readonly entries: CycleCountEntry[];
  // Progresso "contados/total" (derivado das entradas ou dos contadores do servidor).
  readonly countedCount: number;
  readonly totalCount: number;
  readonly createdAt: string;
};

export type CycleCountsData = {
  readonly items: CycleCount[];
  readonly pagination: InventoryPagination;
  readonly source: InventorySource;
  readonly fallbackReason?: string;
};

export type CycleCountStatusFilter = "all" | CycleCountStatus;
export type CycleCountClassFilter = "all" | InventoryAbcClass;

export type CycleCountsFilters = {
  readonly status?: CycleCountStatusFilter;
  readonly abcClass?: CycleCountClassFilter;
  readonly limit?: number;
  readonly offset?: number;
};

// Corpo de abertura: classe opcional (ausente = Todas).
export type OpenCycleCountPayload = {
  readonly abcClass?: InventoryAbcClass;
};

// ── Relatório de variância (gerado no fechamento) ────────────────────────────
export type VarianceLine = {
  readonly entryId: string;
  readonly itemId: string;
  readonly systemQuantity: number;
  readonly countedQuantity: number | null;
  readonly variance: number;
};

export type VarianceReport = {
  readonly lines: VarianceLine[];
  readonly totalVariance: number;
  readonly adjustmentsGenerated: number;
};

export type CycleCountCloseResult = {
  readonly cycleCount: CycleCount;
  readonly report: VarianceReport;
};

export type CycleCountSubmitFeedback = {
  readonly reason?: string;
  readonly message: string;
};
