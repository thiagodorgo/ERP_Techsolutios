// F7a Estoque core — tipos do módulo de Inventário (InventoryItem + StockMovement).
// DTO camelCase do backend /inventory-items e /stock-movements.
// `saldo` e `belowMin` são COMPUTADOS pelo servidor (R7.1 — saldo nunca é coluna editável);
// `abcClass` só é populada pelo F7b (renderiza "—" enquanto null).
// Movimentações são IMUTÁVEIS: não existe edição/exclusão na UI (apenas POST).

export type InventoryAbcClass = "A" | "B" | "C";

// Ω4C PR-08 — o razão ganha os movimentos de custódia LINK/UNLINK (par irmão de transferência
// BASE↔custódia). Continua imutável: só POST (sem edição/exclusão); correção = estorno compensatório.
export type StockMovementType = "entrada" | "saida" | "consumo" | "ajuste" | "link" | "unlink";

// Ω4C PR-08 — custódia de um movimento (enum-app; rótulos Base/Profissional/Viatura na fronteira PT-BR).
export type StockCustodyType = "base" | "professional" | "vehicle";

// Ω4C PR-08 — tipo do item (rótulos Produto/Equipamento). EQUIPAMENTO oculta Compra/Venda no front.
export type InventoryItemType = "product" | "equipment";

// Ω4C PR-08 — "Tipo de Saída" de uma saída (allowlist v1; só "Venda direta" visto em frame limpo).
export type StockExitReason = "direct_sale";

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
  // F7b — ponto de pedido (R7.5): uso_medio_diario × lead_time + estoque_seguranca.
  // `reorderPoint` é COMPUTADO no servidor ("—" enquanto null); `needsReorder` = saldo ≤ ponto.
  readonly reorderPoint: number | null;
  readonly needsReorder: boolean;
  // Computados no servidor a cada listagem (Σ quantidade_sinalizada / saldo < mínimo).
  readonly saldo: number;
  readonly belowMin: boolean;
  // Ω4C PR-08 — campos AutEM do item (aditivos). `isFuel` habilita o item no Abastecimento interno;
  // `itemType` EQUIPAMENTO oculta compra/venda; preços em Decimal(12,2) (null quando não informados).
  readonly isFuel: boolean;
  readonly itemType: InventoryItemType;
  readonly purchasePrice: number | null;
  readonly salePrice: number | null;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// F7b — resumo do recálculo ABC (Pareto por valor de consumo 12m — R7.4).
export type AbcRecalculateSummary = {
  readonly A: number;
  readonly B: number;
  readonly C: number;
  readonly recalculatedAt: string | null;
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
  // Ω4C PR-08 — custódia do movimento (default "base"), par de transferência e vínculo do estorno.
  // Só ID do custodiante (§2.8/LGPD: nome/placa vêm do custody-summary como rótulo — nunca CNH).
  readonly custodyType: StockCustodyType;
  readonly custodyOperatorProfileId: string | null;
  readonly custodyVehicleId: string | null;
  readonly transferGroupId: string | null;
  readonly reversesMovementId: string | null;
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
  // F7b — toggle "Precisa repor" — vira `needs_reorder=true` no servidor.
  readonly needsReorder?: boolean;
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
  // Ω4C PR-08 — campos AutEM do item.
  readonly isFuel?: boolean;
  readonly itemType?: InventoryItemType;
  readonly purchasePrice?: number;
  readonly salePrice?: number;
  readonly description?: string;
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
  // Ω4C PR-08 — campos AutEM do item (preços aceitam null p/ limpar).
  readonly isFuel?: boolean;
  readonly itemType?: InventoryItemType;
  readonly purchasePrice?: number | null;
  readonly salePrice?: number | null;
  readonly description?: string | null;
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

// ── Ω4C PR-08 — custódia: Entrada / Vincular-Desvincular / Saída (quantidade sempre positiva) ──
// A quantidade digitada é SEMPRE positiva (magnitude); o backend aplica o sinal pelo tipo.

// Entrada (ENTRY) — SEMPRE para a BASE; exige custo unitário (custo médio móvel).
export type StockEntryPayload = {
  readonly itemId: string;
  readonly quantidade: number;
  readonly unitCost: number;
  readonly reason?: string;
};

// Vincular (LINK, BASE→custódia) / Desvincular (UNLINK, custódia→BASE): destino Profissional ou Viatura.
export type StockTransferPayload = {
  readonly itemId: string;
  readonly type: "link" | "unlink";
  readonly quantidade: number;
  readonly custodyType: "professional" | "vehicle";
  readonly custodyOperatorProfileId?: string;
  readonly custodyVehicleId?: string;
  readonly reason?: string;
};

// Saída (EXIT) — origem por custódia (Base/Profissional/Viatura) + Tipo de Saída (exit_reason).
export type StockExitPayload = {
  readonly itemId: string;
  readonly quantidade: number;
  readonly custodyType: StockCustodyType;
  readonly custodyOperatorProfileId?: string;
  readonly custodyVehicleId?: string;
  readonly exitReason?: StockExitReason;
  readonly unitCost?: number;
  readonly reason?: string;
};

// Rascunho compartilhado dos sub-modais de custódia (campos-alvo do erro de validação/servidor).
export type CustodyMovementField =
  | "quantidade"
  | "unitCost"
  | "custodyType"
  | "custodyOperatorProfileId"
  | "custodyVehicleId"
  | "exitReason"
  | "reason";

export type CustodyMovementFieldError = {
  readonly field: CustodyMovementField;
  readonly message: string;
};

// Resumo por custódia (GET /inventory-items/:id/custody-summary) — rótulos: nome do profissional /
// placa da viatura (§2.8/LGPD — NUNCA CNH). Qtd. Base/Profissional/Viatura são DERIVADAS no servidor.
export type CustodySummaryProfessional = {
  readonly operatorProfileId: string;
  readonly name: string | null;
  readonly qty: number;
};

export type CustodySummaryVehicle = {
  readonly vehicleId: string;
  readonly plate: string | null;
  readonly qty: number;
};

export type CustodySummary = {
  readonly itemId: string;
  readonly baseQty: number;
  readonly professionalTotalQty: number;
  readonly vehicleTotalQty: number;
  readonly total: number;
  readonly professionals: readonly CustodySummaryProfessional[];
  readonly vehicles: readonly CustodySummaryVehicle[];
};

// Opção de custodiante para os selects dos sub-modais (rótulo = nome/placa — NUNCA CNH).
export type CustodyOption = {
  readonly id: string;
  readonly label: string;
};
