import { randomUUID } from "node:crypto";

import type {
  Customer,
  CreateCustomerInput,
  ListCustomersInput,
  ListCustomersResult,
  UpdateCustomerInput,
} from "./customer.types.js";
import { CustomerError } from "./customer.types.js";

export interface CustomerRepository {
  create(input: CreateCustomerInput): Promise<Customer>;
  list(input: ListCustomersInput): Promise<ListCustomersResult>;
  findById(tenantId: string, customerId: string): Promise<Customer | undefined>;
  update(input: UpdateCustomerInput): Promise<Customer | undefined>;
  reset?(): void;
}

export class InMemoryCustomerRepository implements CustomerRepository {
  private readonly customers = new Map<string, Customer>();

  async create(input: CreateCustomerInput): Promise<Customer> {
    if (input.document && this.hasDocument(input.tenantId, input.document)) {
      throw new CustomerError(409, "CUSTOMER_CONFLICT", "duplicate_document", "A customer with this document already exists.");
    }

    const now = new Date();
    const customer: Customer = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.customers.set(customer.id, customer);

    return customer;
  }

  async list(input: ListCustomersInput): Promise<ListCustomersResult> {
    const filtered = this.sortedCustomers()
      .filter((customer) => customer.tenantId === input.tenantId)
      .filter((customer) => input.isActive === undefined || customer.isActive === input.isActive)
      .filter((customer) => matchesSearch(customer, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, customerId: string): Promise<Customer | undefined> {
    const customer = this.customers.get(customerId);
    return customer?.tenantId === tenantId ? customer : undefined;
  }

  async update(input: UpdateCustomerInput): Promise<Customer | undefined> {
    const current = await this.findById(input.tenantId, input.customerId);
    if (!current) return undefined;

    const updated: Customer = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.customers.set(updated.id, updated);

    return updated;
  }

  reset(): void {
    this.customers.clear();
  }

  private hasDocument(tenantId: string, document: string): boolean {
    return [...this.customers.values()].some(
      (customer) => customer.tenantId === tenantId && customer.document === document,
    );
  }

  private sortedCustomers(): Customer[] {
    return [...this.customers.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(customer: Customer, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [customer.name, customer.document, customer.phone, customer.email, customer.city]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
