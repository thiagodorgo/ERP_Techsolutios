export type Vehicle = {
  readonly id: string;
  readonly plate: string;
  readonly model: string;
  readonly type: string | null;
  readonly year: number | null;
  readonly status: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type VehiclesPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type VehiclesSource = "api" | "mock" | "fallback";

export type VehiclesData = {
  readonly items: Vehicle[];
  readonly pagination: VehiclesPagination;
  readonly source: VehiclesSource;
  readonly fallbackReason?: string;
};

export type VehiclesStatusFilter = "all" | "active" | "inactive";

export type VehiclesFilters = {
  readonly search: string;
  readonly isActive: VehiclesStatusFilter;
  // Janela de busca (parâmetro `limit` do backend); ordenação/paginação são client-side.
  readonly limit?: number;
};

export type VehiclesApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type VehicleCreatePayload = {
  readonly plate: string;
  readonly model: string;
  readonly type?: string;
  readonly year?: number;
  readonly status?: string;
  readonly notes?: string;
  readonly isActive?: boolean;
};

export type VehicleUpdatePayload = Partial<VehicleCreatePayload>;

export type VehicleField = keyof VehicleCreatePayload;

export type VehicleFieldError = {
  readonly field: VehicleField;
  readonly message: string;
};
