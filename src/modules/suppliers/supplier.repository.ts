import { randomUUID } from "node:crypto";

import type {
  Supplier,
  CreateSupplierInput,
  ListSupplierInput,
  ListSupplierResult,
  UpdateSupplierInput,
} from "./supplier.types.js";
import { SupplierError } from "./supplier.types.js";

export interface SupplierRepository {
  create(input: CreateSupplierInput): Promise<Supplier>;
  list(input: ListSupplierInput): Promise<ListSupplierResult>;
  findById(tenantId: string, supplierId: string): Promise<Supplier | undefined>;
  update(input: UpdateSupplierInput): Promise<Supplier | undefined>;
  reset?(): void;
}

export class InMemorySupplierRepository implements SupplierRepository {
  private readonly suppliers = new Map<string, Supplier>();

  async create(input: CreateSupplierInput): Promise<Supplier> {
    if (this.hasName(input.tenantId, input.name)) {
      throw new SupplierError(409, "SUPPLIER_CONFLICT", "duplicate_name", "A supplier with this name already exists.");
    }

    const now = new Date();
    const supplier: Supplier = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  async list(input: ListSupplierInput): Promise<ListSupplierResult> {
    const filtered = this.sorted()
      .filter((supplier) => supplier.tenantId === input.tenantId)
      .filter((supplier) => input.isActive === undefined || supplier.isActive === input.isActive)
      .filter((supplier) => matchesSearch(supplier, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, supplierId: string): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(supplierId);
    return supplier?.tenantId === tenantId ? supplier : undefined;
  }

  async update(input: UpdateSupplierInput): Promise<Supplier | undefined> {
    const current = await this.findById(input.tenantId, input.supplierId);
    if (!current) return undefined;

    if (input.name !== undefined && input.name !== current.name && this.hasName(input.tenantId, input.name)) {
      throw new SupplierError(409, "SUPPLIER_CONFLICT", "duplicate_name", "A supplier with this name already exists.");
    }

    const updated: Supplier = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.suppliers.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.suppliers.clear();
  }

  private hasName(tenantId: string, name: string): boolean {
    return [...this.suppliers.values()].some((supplier) => supplier.tenantId === tenantId && supplier.name === name);
  }

  private sorted(): Supplier[] {
    return [...this.suppliers.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(supplier: Supplier, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [supplier.name, supplier.document, supplier.category]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
