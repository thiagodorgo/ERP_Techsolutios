import { randomUUID } from "node:crypto";

import type {
  ServiceCatalog,
  CreateServiceCatalogInput,
  ListServiceCatalogInput,
  ListServiceCatalogResult,
  UpdateServiceCatalogInput,
} from "./service-catalog.types.js";
import { ServiceCatalogError } from "./service-catalog.types.js";

export interface ServiceCatalogRepository {
  create(input: CreateServiceCatalogInput): Promise<ServiceCatalog>;
  list(input: ListServiceCatalogInput): Promise<ListServiceCatalogResult>;
  findById(tenantId: string, serviceId: string): Promise<ServiceCatalog | undefined>;
  update(input: UpdateServiceCatalogInput): Promise<ServiceCatalog | undefined>;
  reset?(): void;
}

export class InMemoryServiceCatalogRepository implements ServiceCatalogRepository {
  private readonly services = new Map<string, ServiceCatalog>();

  async create(input: CreateServiceCatalogInput): Promise<ServiceCatalog> {
    if (this.hasName(input.tenantId, input.name)) {
      throw new ServiceCatalogError(409, "SERVICE_CATALOG_CONFLICT", "duplicate_name", "A service with this name already exists.");
    }

    const now = new Date();
    const service: ServiceCatalog = {
      ...input,
      id: randomUUID(),
      status: input.status || "active",
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.services.set(service.id, service);

    return service;
  }

  async list(input: ListServiceCatalogInput): Promise<ListServiceCatalogResult> {
    const filtered = this.sortedServices()
      .filter((service) => service.tenantId === input.tenantId)
      .filter((service) => input.isActive === undefined || service.isActive === input.isActive)
      .filter((service) => matchesSearch(service, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, serviceId: string): Promise<ServiceCatalog | undefined> {
    const service = this.services.get(serviceId);
    return service?.tenantId === tenantId ? service : undefined;
  }

  async update(input: UpdateServiceCatalogInput): Promise<ServiceCatalog | undefined> {
    const current = await this.findById(input.tenantId, input.serviceId);
    if (!current) return undefined;

    const updated: ServiceCatalog = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.services.set(updated.id, updated);

    return updated;
  }

  reset(): void {
    this.services.clear();
  }

  private hasName(tenantId: string, name: string): boolean {
    return [...this.services.values()].some(
      (service) => service.tenantId === tenantId && service.name === name,
    );
  }

  private sortedServices(): ServiceCatalog[] {
    return [...this.services.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(service: ServiceCatalog, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();

  return [service.name, service.category, service.description]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
