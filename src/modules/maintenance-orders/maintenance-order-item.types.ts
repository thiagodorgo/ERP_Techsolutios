// Ω4C PR-06 (D-Ω4C-MANUT-ITEMS) — grade de itens (linhas) de uma manutenção. Enums em INGLÊS no código/schema;
// labels PT-BR (SERVIÇO/PRODUTO/ESTOQUE) só na fronteira de apresentação. O total da LINHA (unit_value ×
// quantity) e os totais do cabeçalho (Σ) são DERIVADOS server-side, NUNCA persistidos.

export const MAINTENANCE_ITEM_TYPES = ["service", "product", "stock"] as const;

export type MaintenanceItemType = (typeof MAINTENANCE_ITEM_TYPES)[number];

export type MaintenanceOrderItem = {
  readonly id: string;
  readonly tenantId: string;
  readonly maintenanceOrderId: string;
  readonly itemType: MaintenanceItemType;
  readonly description: string;
  readonly unitValue: number;
  readonly quantity: number;
  // Ω4C PR-08b — item de estoque baixado quando item_type='stock' (nullable; service/product/legado ficam NULL).
  // A baixa é EFEITO DE DOMÍNIO (stock_movements type=`saida`, custódia BASE) disparado pelo seam — sem saldo aqui.
  readonly stockItemId?: string;
  readonly notes?: string;
  readonly isActive: boolean;
  readonly createdBy?: string;
  readonly updatedBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
};

export type CreateMaintenanceOrderItemInput = {
  // Ω4C PR-08b — id PRÉ-GERADO (EXIT-first): a baixa (source_id = este id) é postada ANTES de persistir a linha.
  readonly id?: string;
  readonly tenantId: string;
  readonly maintenanceOrderId: string;
  readonly itemType: MaintenanceItemType;
  readonly description: string;
  readonly unitValue: number;
  readonly quantity: number;
  readonly stockItemId?: string;
  readonly notes?: string;
  readonly createdBy?: string;
  readonly updatedBy?: string;
};

export type UpdateMaintenanceOrderItemInput = {
  readonly tenantId: string;
  readonly itemId: string;
  readonly itemType?: MaintenanceItemType;
  readonly description?: string;
  readonly unitValue?: number;
  readonly quantity?: number;
  // Ω4C PR-08b — `null` = limpar o item de estoque; `undefined` = manter.
  readonly stockItemId?: string | null;
  readonly notes?: string;
  readonly updatedBy?: string;
};

// Totais DERIVADOS server-side (D-Ω4C-MANUT-TOTALS-DERIVED). ESTOQUE cai no bucket Produtos (peça física).
export type MaintenanceOrderTotals = {
  readonly totalServices: number;
  readonly totalProducts: number;
  readonly total: number;
  readonly itemCount: number;
};
