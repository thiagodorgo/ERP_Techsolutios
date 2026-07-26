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

// Ω5P PR-03 (RN-TAR-01 ponto ii) — guarda de não-sobreposição ao inserir/alterar Tarifa numa tabela já
// PUBLICADA (a tabela publicada segue editável, D-OMEGA2A). OPCIONAL: `new TariffService(repo)` (usos de teste
// legados) segue sem guarda; as factories injetam. Read-only/só-recusa → não-amplificador.
export type TariffMutationOverlapCheck = (input: {
  readonly tenantId: string;
  readonly priceTableId: string;
  readonly incomingServiceCatalogId?: string;
  readonly incomingCustomerId?: string;
}) => Promise<boolean>;

export class TariffService {
  constructor(
    private readonly repository: TariffRepository,
    private readonly overlapCheck?: TariffMutationOverlapCheck,
  ) {}

  private async assertNoOverlap(
    tenantId: string,
    priceTableId: string,
    incomingServiceCatalogId?: string,
    incomingCustomerId?: string,
  ): Promise<void> {
    if (!this.overlapCheck) return;
    const overlap = await this.overlapCheck({ tenantId, priceTableId, incomingServiceCatalogId, incomingCustomerId });
    if (overlap) {
      throw new TariffError(
        409,
        "TARIFF_OVERLAP",
        "tariff_overlap",
        "Another published price table with the same scope and vehicle category has an overlapping validity window and shares this service.",
      );
    }
  }

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
    const priceTableId = parseRequiredUuid(body.price_table_id ?? body.priceTableId, "priceTableId");
    const serviceCatalogId = parseOptionalUuid(body.service_catalog_id ?? body.serviceCatalogId, "serviceCatalogId");
    const customerId = parseOptionalUuid(body.customer_id ?? body.customerId, "customerId");
    // RN-TAR-01 ponto (ii) — antes de persistir: inserir este (serviço,cliente) na tabela (se publicada) não pode
    // criar sobreposição com outra tabela publicada do mesmo bucket. Inerte se a tabela é rascunho/inexistente.
    await this.assertNoOverlap(actor.tenantId, priceTableId, serviceCatalogId, customerId);
    return this.repository.create({
      tenantId: actor.tenantId,
      priceTableId,
      serviceCatalogId,
      customerId,
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
    const current = await this.get(actor, tariffId);

    // RN-TAR-01 ponto (ii) — reativar/ajustar uma tarifa numa tabela publicada revalida a não-sobreposição
    // (serviço/cliente são imutáveis no update, então usa os da tarifa atual). Inerte se a tabela não publicada.
    await this.assertNoOverlap(actor.tenantId, current.priceTableId, current.serviceCatalogId, current.customerId);

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

// Checker de mutação composto com import DINÂMICO do price-tables → sem import estático (evita ciclo
// tariff.service ⇄ price-table.service). Inerte quando a tabela-alvo não está publicada.
function createMemoryTariffMutationOverlapCheck(): TariffMutationOverlapCheck {
  return async (input) => {
    const [{ buildTariffMutationOverlapChecker }, { getMemoryPriceTableRepositoryForTests }] = await Promise.all([
      import("../price-tables/price-table-resolution.js"),
      import("../price-tables/price-table.service.js"),
    ]);
    return buildTariffMutationOverlapChecker(getMemoryPriceTableRepositoryForTests(), memoryRepository)(input);
  };
}

export function createMemoryTariffService(): TariffService {
  return new TariffService(memoryRepository, createMemoryTariffMutationOverlapCheck());
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
  const { createPrismaPriceTableRepository } = await import("../price-tables/price-table-prisma.repository.js");
  const { buildTariffMutationOverlapChecker } = await import("../price-tables/price-table-resolution.js");
  const repository = await createPrismaTariffRepository();
  const priceRepository = await createPrismaPriceTableRepository();
  const overlapCheck = buildTariffMutationOverlapChecker(priceRepository, repository);
  return new TariffService(repository, overlapCheck);
}
