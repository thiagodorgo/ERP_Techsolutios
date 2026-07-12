import { env } from "../../config/env.js";
import {
  InMemoryPriceTableRepository,
  type PriceTableRepository,
} from "./price-table.repository.js";
import type {
  PriceTable,
  PriceTableActorContext,
  ListPriceTableInput,
  ListPriceTableResult,
  UpdatePriceTableInput,
} from "./price-table.types.js";
import { PRICE_TABLE_STATUS_TRANSITIONS, PriceTableError } from "./price-table.types.js";
import {
  parseCurrency,
  parseLimit,
  parseName,
  parseOffset,
  parseOptionalDate,
  parseOptionalDescription,
  parseOptionalSearch,
  parseOptionalStatus,
  parseOptionalVersion,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./price-table.validators.js";

type RawRecord = Record<string, unknown>;

export class PriceTableService {
  constructor(private readonly repository: PriceTableRepository) {}

  async list(actor: PriceTableActorContext, query: RawRecord): Promise<ListPriceTableResult> {
    const input: ListPriceTableInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      status: parseOptionalStatus(query.status),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: PriceTableActorContext, body: RawRecord): Promise<PriceTable> {
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      description: parseOptionalDescription(body.description),
      currency: parseCurrency(body.currency),
      version: parseOptionalVersion(body.version) ?? 1,
      validFrom: parseOptionalDate(body.valid_from ?? body.validFrom, "validFrom"),
      validTo: parseOptionalDate(body.valid_to ?? body.validTo, "validTo"),
      // Nova tabela sempre nasce em rascunho (RN-CAD-008); publica-se depois via PATCH status.
      status: "draft",
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: PriceTableActorContext, priceTableId: string): Promise<PriceTable> {
    const table = await this.repository.findById(actor.tenantId, parseRequiredUuid(priceTableId, "priceTableId"));
    if (!table) {
      throw new PriceTableError(404, "PRICE_TABLE_NOT_FOUND", "not_found", "Price table was not found.");
    }
    return table;
  }

  async update(actor: PriceTableActorContext, priceTableId: string, body: RawRecord): Promise<PriceTable> {
    const current = await this.get(actor, priceTableId);

    // RN-CAD-008 — máquina de estado: só transições permitidas; senão 422.
    const nextStatus = parseOptionalStatus(body.status);
    if (nextStatus !== undefined && nextStatus !== current.status) {
      if (!PRICE_TABLE_STATUS_TRANSITIONS[current.status].includes(nextStatus)) {
        throw new PriceTableError(
          422,
          "PRICE_TABLE_INVALID",
          "invalid_status_transition",
          `Cannot change status from ${current.status} to ${nextStatus}.`,
        );
      }
    }

    const input: UpdatePriceTableInput = {
      tenantId: actor.tenantId,
      priceTableId: parseRequiredUuid(priceTableId, "priceTableId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      description: parseOptionalDescription(body.description),
      currency: body.currency === undefined ? undefined : parseCurrency(body.currency),
      version: parseOptionalVersion(body.version),
      validFrom: parseOptionalDate(body.valid_from ?? body.validFrom, "validFrom"),
      validTo: parseOptionalDate(body.valid_to ?? body.validTo, "validTo"),
      status: nextStatus,
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw new PriceTableError(404, "PRICE_TABLE_NOT_FOUND", "not_found", "Price table was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemoryPriceTableRepository();
let defaultServicePromise: Promise<PriceTableService> | undefined;

export function createMemoryPriceTableService(): PriceTableService {
  return new PriceTableService(memoryRepository);
}

export function getMemoryPriceTableRepositoryForTests(): InMemoryPriceTableRepository {
  return memoryRepository;
}

export async function createDefaultPriceTableService(): Promise<PriceTableService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPriceTableService();
  }
  defaultServicePromise ??= createPrismaPriceTableService();
  return defaultServicePromise;
}

export function resetPriceTableRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaPriceTableService(): Promise<PriceTableService> {
  const { createPrismaPriceTableRepository } = await import("./price-table-prisma.repository.js");
  const repository = await createPrismaPriceTableRepository();
  return new PriceTableService(repository);
}
