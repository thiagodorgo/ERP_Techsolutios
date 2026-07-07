export type ServiceItem = {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string | null;
  readonly estimatedDurationMinutes: number | null;
  readonly basePrice: number | null;
  readonly status: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type ServiceCatalogPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type ServiceCatalogSource = "api" | "mock" | "fallback";

export type ServiceCatalogData = {
  readonly items: ServiceItem[];
  readonly pagination: ServiceCatalogPagination;
  readonly source: ServiceCatalogSource;
  readonly fallbackReason?: string;
};

export type ServiceCatalogStatusFilter = "all" | "active" | "inactive";

export type ServiceCatalogFilters = {
  readonly search: string;
  readonly isActive: ServiceCatalogStatusFilter;
};

export type ServiceCatalogApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type ServiceItemCreatePayload = {
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
  readonly estimatedDurationMinutes?: number;
  readonly basePrice?: number;
  readonly status?: string;
  readonly isActive?: boolean;
};

export type ServiceItemUpdatePayload = Partial<ServiceItemCreatePayload>;

export type ServiceItemField = keyof ServiceItemCreatePayload;

export type ServiceItemFieldError = {
  readonly field: ServiceItemField;
  readonly message: string;
};
