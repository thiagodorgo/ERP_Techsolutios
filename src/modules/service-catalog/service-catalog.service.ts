import { env } from "../../config/env.js";
import {
  InMemoryServiceCatalogRepository,
  type ServiceCatalogRepository,
} from "./service-catalog.repository.js";
import type {
  ServiceCatalog,
  ServiceCatalogActorContext,
  ListServiceCatalogInput,
  ListServiceCatalogResult,
  UpdateServiceCatalogInput,
} from "./service-catalog.types.js";
import { ServiceCatalogError } from "./service-catalog.types.js";
import {
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalBasePrice,
  parseOptionalCategory,
  parseOptionalDescription,
  parseOptionalDurationMinutes,
  parseOptionalSearch,
  parseOptionalServiceType,
  parseOptionalStatus,
  parseRequiredUuid,
  parseRequiresDestination,
  readOptionalBoolean,
} from "./service-catalog.validators.js";

type RawRecord = Record<string, unknown>;

export class ServiceCatalogService {
  constructor(private readonly repository: ServiceCatalogRepository) {}

  async list(actor: ServiceCatalogActorContext, query: RawRecord): Promise<ListServiceCatalogResult> {
    const input: ListServiceCatalogInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: ServiceCatalogActorContext, body: RawRecord): Promise<ServiceCatalog> {
    const service = await this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      description: parseOptionalDescription(body.description),
      category: parseOptionalCategory(body.category),
      serviceType: parseOptionalServiceType(body.service_type ?? body.serviceType),
      requiresDestination: parseRequiresDestination(body.requires_destination ?? body.requiresDestination) ?? false,
      estimatedDurationMinutes: parseOptionalDurationMinutes(body.estimated_duration_minutes ?? body.estimatedDurationMinutes),
      basePrice: parseOptionalBasePrice(body.base_price ?? body.basePrice),
      status: parseOptionalStatus(body.status) ?? "active",
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    return service;
  }

  async get(actor: ServiceCatalogActorContext, serviceId: string): Promise<ServiceCatalog> {
    const service = await this.repository.findById(actor.tenantId, parseRequiredUuid(serviceId, "serviceId"));

    if (!service) {
      throw new ServiceCatalogError(404, "SERVICE_CATALOG_NOT_FOUND", "not_found", "Service was not found.");
    }

    return service;
  }

  async update(actor: ServiceCatalogActorContext, serviceId: string, body: RawRecord): Promise<ServiceCatalog> {
    await this.get(actor, serviceId);
    const input: UpdateServiceCatalogInput = {
      tenantId: actor.tenantId,
      serviceId: parseRequiredUuid(serviceId, "serviceId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      description: parseOptionalDescription(body.description),
      category: parseOptionalCategory(body.category),
      serviceType: parseOptionalServiceType(body.service_type ?? body.serviceType),
      requiresDestination: parseRequiresDestination(body.requires_destination ?? body.requiresDestination),
      estimatedDurationMinutes: parseOptionalDurationMinutes(body.estimated_duration_minutes ?? body.estimatedDurationMinutes),
      basePrice: parseOptionalBasePrice(body.base_price ?? body.basePrice),
      status: parseOptionalStatus(body.status),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new ServiceCatalogError(404, "SERVICE_CATALOG_NOT_FOUND", "not_found", "Service was not found.");
    }

    return updated;
  }
}

const memoryRepository = new InMemoryServiceCatalogRepository();
let defaultServicePromise: Promise<ServiceCatalogService> | undefined;

export function createMemoryServiceCatalogService(): ServiceCatalogService {
  return new ServiceCatalogService(memoryRepository);
}

export function getMemoryServiceCatalogRepositoryForTests(): InMemoryServiceCatalogRepository {
  return memoryRepository;
}

export async function createDefaultServiceCatalogService(): Promise<ServiceCatalogService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryServiceCatalogService();
  }

  defaultServicePromise ??= createPrismaServiceCatalogService();

  return defaultServicePromise;
}

export function resetServiceCatalogRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaServiceCatalogService(): Promise<ServiceCatalogService> {
  const { createPrismaServiceCatalogRepository } = await import("./service-catalog-prisma.repository.js");
  const repository = await createPrismaServiceCatalogRepository();

  return new ServiceCatalogService(repository);
}
