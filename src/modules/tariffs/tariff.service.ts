import { env } from "../../config/env.js";
import {
  InMemoryTariffRepository,
  type TariffRepository,
} from "./tariff.repository.js";
import type {
  Tariff,
  TariffActorContext,
  ListTariffInput,
  ListTariffResult,
  UpdateTariffInput,
} from "./tariff.types.js";
import { TariffError } from "./tariff.types.js";
import {
  parseCurrency,
  parseLimit,
  parseOffset,
  parseOptionalDate,
  parseOptionalName,
  parseOptionalRule,
  parseOptionalSearch,
  parseOptionalStatus,
  parseOptionalUnitPrice,
  parseOptionalUuid,
  parseOrigin,
  parseRequiredUuid,
  parseUnitPrice,
  readOptionalBoolean,
} from "./tariff.validators.js";

type RawRecord = Record<string, unknown>;

export class TariffService {
  constructor(private readonly repository: TariffRepository) {}

  async list(actor: TariffActorContext, query: RawRecord): Promise<ListTariffResult> {
    const input: ListTariffInput = {
      tenantId: actor.tenantId,
      priceTableId: parseOptionalUuid(query.price_table_id ?? query.priceTableId, "priceTableId"),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: TariffActorContext, body: RawRecord): Promise<Tariff> {
    return this.repository.create({
      tenantId: actor.tenantId,
      priceTableId: parseRequiredUuid(body.price_table_id ?? body.priceTableId, "priceTableId"),
      serviceCatalogId: parseOptionalUuid(body.service_catalog_id ?? body.serviceCatalogId, "serviceCatalogId"),
      customerId: parseOptionalUuid(body.customer_id ?? body.customerId, "customerId"),
      name: parseOptionalName(body.name),
      unitPrice: parseUnitPrice(body.unit_price ?? body.unitPrice),
      currency: parseCurrency(body.currency),
      origin: parseOrigin(body.origin),
      rule: parseOptionalRule(body.rule),
      validFrom: parseOptionalDate(body.valid_from ?? body.validFrom, "validFrom"),
      validTo: parseOptionalDate(body.valid_to ?? body.validTo, "validTo"),
      // Sem máquina de estado (RN-CAD-009): status é campo livre; default "active".
      status: parseOptionalStatus(body.status) ?? "active",
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: TariffActorContext, tariffId: string): Promise<Tariff> {
    const tariff = await this.repository.findById(actor.tenantId, parseRequiredUuid(tariffId, "tariffId"));
    if (!tariff) {
      throw new TariffError(404, "TARIFF_NOT_FOUND", "not_found", "Tariff was not found.");
    }
    return tariff;
  }

  async update(actor: TariffActorContext, tariffId: string, body: RawRecord): Promise<Tariff> {
    await this.get(actor, tariffId);

    const input: UpdateTariffInput = {
      tenantId: actor.tenantId,
      tariffId: parseRequiredUuid(tariffId, "tariffId"),
      name: body.name === undefined ? undefined : parseOptionalName(body.name),
      unitPrice: parseOptionalUnitPrice(body.unit_price ?? body.unitPrice),
      currency: body.currency === undefined ? undefined : parseCurrency(body.currency),
      origin: body.origin === undefined ? undefined : parseOrigin(body.origin),
      rule: parseOptionalRule(body.rule),
      validFrom: parseOptionalDate(body.valid_from ?? body.validFrom, "validFrom"),
      validTo: parseOptionalDate(body.valid_to ?? body.validTo, "validTo"),
      status: parseOptionalStatus(body.status),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw new TariffError(404, "TARIFF_NOT_FOUND", "not_found", "Tariff was not found.");
    }
    return updated;
  }
}

const memoryRepository = new InMemoryTariffRepository();
let defaultServicePromise: Promise<TariffService> | undefined;

export function createMemoryTariffService(): TariffService {
  return new TariffService(memoryRepository);
}

export function getMemoryTariffRepositoryForTests(): InMemoryTariffRepository {
  return memoryRepository;
}

export async function createDefaultTariffService(): Promise<TariffService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryTariffService();
  }
  defaultServicePromise ??= createPrismaTariffService();
  return defaultServicePromise;
}

export function resetTariffRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaTariffService(): Promise<TariffService> {
  const { createPrismaTariffRepository } = await import("./tariff-prisma.repository.js");
  const repository = await createPrismaTariffRepository();
  return new TariffService(repository);
}
