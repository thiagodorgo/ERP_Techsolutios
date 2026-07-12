import { env } from "../../config/env.js";
import {
  InMemorySupplierRepository,
  type SupplierRepository,
} from "./supplier.repository.js";
import type {
  Supplier,
  SupplierActorContext,
  ListSupplierInput,
  ListSupplierResult,
  UpdateSupplierInput,
} from "./supplier.types.js";
import { SupplierError } from "./supplier.types.js";
import {
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalAddress,
  parseOptionalCategory,
  parseOptionalDocument,
  parseOptionalEmail,
  parseOptionalNotes,
  parseOptionalPhone,
  parseOptionalSearch,
  parseOptionalStatus,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./supplier.validators.js";

type RawRecord = Record<string, unknown>;

export class SupplierService {
  constructor(private readonly repository: SupplierRepository) {}

  async list(actor: SupplierActorContext, query: RawRecord): Promise<ListSupplierResult> {
    const input: ListSupplierInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: SupplierActorContext, body: RawRecord): Promise<Supplier> {
    // Tenant vem SEMPRE do ator autenticado; tenant_id no body é ignorado.
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      document: parseOptionalDocument(body.document),
      email: parseOptionalEmail(body.email),
      phone: parseOptionalPhone(body.phone),
      address: parseOptionalAddress(body.address),
      category: parseOptionalCategory(body.category),
      notes: parseOptionalNotes(body.notes),
      status: parseOptionalStatus(body.status) ?? "active",
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: SupplierActorContext, supplierId: string): Promise<Supplier> {
    const supplier = await this.repository.findById(actor.tenantId, parseRequiredUuid(supplierId, "supplierId"));
    if (!supplier) {
      throw new SupplierError(404, "SUPPLIER_NOT_FOUND", "not_found", "Supplier was not found.");
    }
    return supplier;
  }

  async update(actor: SupplierActorContext, supplierId: string, body: RawRecord): Promise<Supplier> {
    const input: UpdateSupplierInput = {
      tenantId: actor.tenantId,
      supplierId: parseRequiredUuid(supplierId, "supplierId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      document: parseOptionalDocument(body.document),
      email: parseOptionalEmail(body.email),
      phone: parseOptionalPhone(body.phone),
      address: parseOptionalAddress(body.address),
      category: parseOptionalCategory(body.category),
      notes: parseOptionalNotes(body.notes),
      status: parseOptionalStatus(body.status),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw new SupplierError(404, "SUPPLIER_NOT_FOUND", "not_found", "Supplier was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemorySupplierRepository();
let defaultServicePromise: Promise<SupplierService> | undefined;

export function createMemorySupplierService(): SupplierService {
  return new SupplierService(memoryRepository);
}

export function getMemorySupplierRepositoryForTests(): InMemorySupplierRepository {
  return memoryRepository;
}

export async function createDefaultSupplierService(): Promise<SupplierService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemorySupplierService();
  }
  defaultServicePromise ??= createPrismaSupplierService();
  return defaultServicePromise;
}

export function resetSupplierRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaSupplierService(): Promise<SupplierService> {
  const { createPrismaSupplierRepository } = await import("./supplier-prisma.repository.js");
  const repository = await createPrismaSupplierRepository();
  return new SupplierService(repository);
}
