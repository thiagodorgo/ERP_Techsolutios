// F7a Estoque core — tipos do módulo de Inventário (InventoryItem + StockMovement).
// DTO camelCase do backend /inventory-items e /stock-movements.
// `saldo` e `belowMin` são COMPUTADOS pelo servidor (R7.1 — saldo nunca é coluna editável);
// `abcClass` só é populada pelo F7b (renderiza "—" enquanto null).
// Movimentações são IMUTÁVEIS: não existe edição/exclusão na UI (apenas POST).

export type InventoryAbcClass = "A" | "B" | "C";

export type StockMovementType = "entrada" | "saida" | "consumo" | "ajuste";

export type InventoryItem = {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly minQuantity: number;
  readonly maxQuantity: number | null;
  readonly abcClass: InventoryAbcClass | null;
  readonly avgCost: number;
  readonly leadTimeDays: number | null;
  readonly safetyStock: number | null;
  // Computados no servidor a cada listagem (Σ quantidade_sinalizada / saldo < mínimo).
  readonly saldo: number;
  readonly belowMin: boolean;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type StockMovement = {
  readonly id: string;
  readonly itemId: string;
  readonly type: StockMovementType;
  // Sinalizada: entrada > 0; saída/consumo < 0; ajuste pode ter qualquer sinal.
  readonly quantidadeSinalizada: number;
  readonly unitCost: number | null;
  readonly workOrderId: string | null;
  readonly vehicleId: string | null;
  readonly reason: string | null;
  readonly createdAt: string;
  readonly createdBy: string | null;
};

export type InventoryPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type InventorySource = "api" | "mock" | "fallback";

export type InventoryItemsData = {
  readonly items: InventoryItem[];
  readonly pagination: InventoryPagination;
  readonly source: InventorySource;
  readonly fallbackReason?: string;
};

export type StockMovementsData = {
  readonly items: StockMovement[];
  readonly pagination: InventoryPagination;
  readonly source: InventorySource;
  readonly fallbackReason?: string;
};

// Filtro de situação lógica (compatível com a dense-list: all/active/inactive → is_active).
export type InventoryStatusFilter = "all" | "active" | "inactive";

export type InventoryItemsFilters = {
  readonly search: string;
  readonly isActive: InventoryStatusFilter;
  // Toggle "Abaixo do mínimo" — vira `below_min=true` no servidor.
  readonly belowMin?: boolean;
  // Janela de busca (`limit`); ordenação/paginação/filtros extras são client-side sobre ela.
  readonly limit?: number;
  readonly offset?: number;
};

export type StockMovementsFilters = {
  readonly itemId?: string;
  readonly type?: StockMovementType;
  readonly workOrderId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
  readonly offset?: number;
};

export type InventoryApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

// ── Item: rascunho/payloads (SEM saldo — derivado; SEM classe ABC — F7b) ─────
export type InventoryItemDraft = {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly minQuantity?: number;
  readonly maxQuantity?: number;
  readonly leadTimeDays?: number;
  readonly safetyStock?: number;
};

export type InventoryItemCreatePayload = {
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly minQuantity?: number;
  readonly maxQuantity?: number;
  readonly leadTimeDays?: number;
  readonly safetyStock?: number;
  readonly isActive?: boolean;
};

// PATCH único: edição de campos + desativação/reativação lógica.
export type InventoryItemUpdatePayload = Partial<InventoryItemCreatePayload>;

export type InventoryItemField = keyof InventoryItemDraft;

export type InventoryItemFieldError = {
  readonly field: InventoryItemField;
  readonly message: string;
};

// ── Movimento: rascunho/payload (quantidade sempre positiva no formulário;
//    o SINAL é derivado do tipo — e, no ajuste, da direção explícita) ─────────
export type StockMovementAjusteDirection = "entrada" | "saida";

export type StockMovementDraft = {
  readonly type: StockMovementType | "";
  readonly itemId: string;
  readonly quantidade?: number;
  readonly ajusteDirection?: StockMovementAjusteDirection | "";
  readonly unitCost?: number;
  readonly workOrderId?: string;
  readonly vehicleId?: string;
  readonly reason?: string;
};

export type StockMovementCreatePayload = {
  readonly itemId: string;
  readonly type: StockMovementType;
  readonly quantidadeSinalizada: number;
  readonly unitCost?: number;
  readonly workOrderId?: string;
  readonly vehicleId?: string;
  readonly reason?: string;
};

export type StockMovementField = keyof StockMovementDraft;

export type StockMovementFieldError = {
  readonly field: StockMovementField;
  readonly message: string;
};
