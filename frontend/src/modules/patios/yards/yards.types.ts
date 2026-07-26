// Ω5P PR-04 — Pátios (console do operador). Cadastro físico do pátio: áreas hierárquicas (Quadra→Corredor→
// Fileira) e vagas. Espelho de registry/branches (cadastro denso, multi-tenant). Consome os endpoints do módulo
// backend `yard` (PR-01). Neutralidade white-label: "Pátio/Área/Vaga", NUNCA termo técnico nem público-alvo.
// §allowlist: tenant_id NUNCA é dado renderizado (resolvido pelo ator autenticado).

// Enums (inglês no código/claims; rótulo PT-BR vem do backend em *Label). App-validados; sem enum-CHECK no banco.
export type YardAreaKind = "BLOCK" | "CORRIDOR" | "ROW";
export type YardVehicleClass = "ANY" | "MOTORCYCLE" | "HEAVY";
export type YardSpotStatus = "FREE" | "OCCUPIED" | "BLOCKED";
// Status editável na UI (bloqueio operacional): OCCUPIED é READ-ONLY (alocação por processo = PR-06/08).
export type YardSpotOperationalStatus = "FREE" | "BLOCKED";

export type YardItem = {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly capacityHint: number | null;
  readonly timezone: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type YardAreaItem = {
  readonly id: string;
  readonly yardId: string;
  readonly parentId: string | null;
  readonly kind: YardAreaKind;
  readonly kindLabel: string;
  readonly name: string;
  readonly covered: boolean;
  readonly vehicleClass: YardVehicleClass;
  readonly vehicleClassLabel: string;
};

export type YardSpotItem = {
  readonly id: string;
  readonly areaId: string;
  readonly code: string;
  readonly covered: boolean;
  readonly vehicleClass: YardVehicleClass;
  readonly vehicleClassLabel: string;
  readonly status: YardSpotStatus;
  readonly statusLabel: string;
};

// Resumo de ocupação (read-only): total/livres/ocupadas/bloqueadas. Mapa por processo = PR-08 (proibido aqui).
export type YardOccupancySummary = {
  readonly total: number;
  readonly free: number;
  readonly occupied: number;
  readonly blocked: number;
};

export type YardsPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type YardsSource = "api" | "mock" | "fallback";

export type YardsData = {
  readonly items: YardItem[];
  readonly pagination: YardsPagination;
  readonly source: YardsSource;
  readonly fallbackReason?: string;
};

// Situação de cadastro (active) — vocabulário da dense-list ("all"/"active"/"inactive").
export type YardActiveFilter = "all" | "active" | "inactive";

export type YardsFilters = {
  readonly search: string;
  readonly isActive: YardActiveFilter;
  readonly limit?: number;
};

export type YardsApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// Criação/edição do Pátio — timezone default America/Sao_Paulo (foundation de diárias DST-safe, I4).
export type YardCreatePayload = {
  readonly name: string;
  readonly address: string;
  readonly timezone?: string;
  readonly capacityHint?: number;
};

export type YardUpdatePayload = {
  readonly name?: string;
  readonly address?: string;
  readonly timezone?: string;
  readonly capacityHint?: number | null;
  readonly active?: boolean;
};

export type YardField = "name" | "address" | "timezone" | "capacityHint";

export type YardFieldError = {
  readonly field: YardField;
  readonly message: string;
};

// Área — quadra/corredor/fileira (árvore por parentId).
export type YardAreaCreatePayload = {
  readonly name: string;
  readonly kind: YardAreaKind;
  readonly covered?: boolean;
  readonly vehicleClass?: YardVehicleClass;
  readonly parentId?: string;
};

export type YardAreaUpdatePayload = {
  readonly name?: string;
  readonly covered?: boolean;
  readonly vehicleClass?: YardVehicleClass;
};

// Vaga — unidade de ocupação. Status editável só FREE⇄BLOCKED (OCCUPIED read-only, alocação = PR-06/08).
export type YardSpotCreatePayload = {
  readonly code: string;
  readonly covered?: boolean;
  readonly vehicleClass?: YardVehicleClass;
};

export type YardSpotUpdatePayload = {
  readonly code?: string;
  readonly covered?: boolean;
  readonly vehicleClass?: YardVehicleClass;
  readonly status?: YardSpotOperationalStatus;
};
