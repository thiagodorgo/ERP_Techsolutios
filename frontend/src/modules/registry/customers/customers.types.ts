export type Customer = {
  readonly id: string;
  readonly name: string;
  readonly document: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly zipCode: string | null;
  readonly isActive: boolean;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CustomersPagination = {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
};

export type CustomersSource = "api" | "mock" | "fallback";

export type CustomersData = {
  readonly items: Customer[];
  readonly pagination: CustomersPagination;
  readonly source: CustomersSource;
  readonly fallbackReason?: string;
};

export type CustomersStatusFilter = "all" | "active" | "inactive";

export type CustomersFilters = {
  readonly search: string;
  readonly isActive: CustomersStatusFilter;
};

export type CustomersApiContext = {
  readonly token?: string;
  readonly tenantId?: string;
  readonly branchId?: string;
  readonly role?: string;
  readonly permissions?: string[];
};

export type CustomerCreatePayload = {
  readonly name: string;
  readonly document?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly zipCode?: string;
  readonly notes?: string;
  readonly isActive?: boolean;
};

export type CustomerUpdatePayload = Partial<CustomerCreatePayload>;

export type CustomerField = keyof CustomerCreatePayload;

export type CustomerFieldError = {
  readonly field: CustomerField;
  readonly message: string;
};
