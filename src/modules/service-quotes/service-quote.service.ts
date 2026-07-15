import { env } from "../../config/env.js";
import { getMemoryPriceTableRepositoryForTests } from "../price-tables/price-table.service.js";
import type { PriceTableRepository } from "../price-tables/price-table.repository.js";
import { getMemoryTariffRepositoryForTests } from "../tariffs/tariff.service.js";
import type { Tariff } from "../tariffs/tariff.types.js";
import {
  InMemoryServiceQuoteRepository,
  type ServiceQuoteRepository,
} from "./service-quote.repository.js";
import type {
  ServiceQuote,
  ServiceQuoteActorContext,
  ListServiceQuoteInput,
  ListServiceQuoteResult,
} from "./service-quote.types.js";
import { SERVICE_QUOTE_STATUS_TRANSITIONS, ServiceQuoteError } from "./service-quote.types.js";
import {
  assertMoneyInRange,
  parseCurrency,
  parseLimit,
  parseOffset,
  parseOptionalNotes,
  parseOptionalSearch,
  parseOptionalStatusFilter,
  parseOptionalUuid,
  parsePriceSource,
  parseQuantity,
  parseRequiredUuid,
  parseStatus,
  parseUnitPrice,
  readOptionalBoolean,
  roundMoney,
} from "./service-quote.validators.js";

type RawRecord = Record<string, unknown>;

// Resolve a Tarifa aplicável (já filtrada por tabela PUBLICADA + vigência + cliente) para o
// congelamento. Injetado para desacoplar a máquina de preço da fonte (InMemory/Prisma).
export type ApplicableTariffResolver = (
  tenantId: string,
  serviceCatalogId: string,
  customerId: string | undefined,
) => Promise<Tariff | undefined>;

export class ServiceQuoteService {
  constructor(
    private readonly repository: ServiceQuoteRepository,
    private readonly resolveApplicableTariff: ApplicableTariffResolver,
  ) {}

  async list(actor: ServiceQuoteActorContext, query: RawRecord): Promise<ListServiceQuoteResult> {
    const input: ListServiceQuoteInput = {
      tenantId: actor.tenantId,
      workOrderId: parseOptionalUuid(query.work_order_id ?? query.workOrderId, "workOrderId"),
      status: parseOptionalStatusFilter(query.status),
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: ServiceQuoteActorContext, body: RawRecord): Promise<ServiceQuote> {
    const serviceCatalogId = parseRequiredUuid(body.service_catalog_id ?? body.serviceCatalogId, "serviceCatalogId");
    const workOrderId = parseOptionalUuid(body.work_order_id ?? body.workOrderId, "workOrderId");
    const customerId = parseOptionalUuid(body.customer_id ?? body.customerId, "customerId");
    // A3+ (achado validador-mestre): quantity é Decimal(12,2). Sem teto, uma quantidade absurda estoura
    // o numeric no Postgres (500) mesmo com o total dentro da faixa — e diverge do InMemory. Guard aqui
    // garante paridade e 422 em vez de 500.
    const quantity = assertMoneyInRange(parseQuantity(body.quantity), "quantity");
    const notes = parseOptionalNotes(body.notes);
    const priceSource = parsePriceSource(body.price_source ?? body.priceSource);

    // A5 (crítico) — o snapshot vem de UMA única leitura da fonte; nada é relido depois. Todos os
    // `frozen_*` derivam desta resolução atômica.
    let frozenUnitPrice: number;
    let frozenCurrency: string;
    let sourceTariffId: string | undefined;
    let sourcePriceTableId: string | undefined;

    if (priceSource === "manual") {
      frozenUnitPrice = roundMoney(parseUnitPrice(body.unit_price ?? body.unitPrice));
      frozenCurrency = parseCurrency(body.currency);
      sourceTariffId = undefined;
      sourcePriceTableId = undefined;
    } else {
      const tariff = await this.resolveApplicableTariff(actor.tenantId, serviceCatalogId, customerId);
      if (!tariff) {
        throw new ServiceQuoteError(
          422,
          "SERVICE_QUOTE_UNPROCESSABLE",
          "tariff_not_found_for_service",
          "No applicable published tariff was found for this service; a quote cannot be frozen without a price base.",
        );
      }
      // A1 (crítico) — arredonda no ponto de congelamento (paridade InMemory×Prisma).
      frozenUnitPrice = roundMoney(tariff.unitPrice);
      frozenCurrency = tariff.currency;
      sourceTariffId = tariff.id;
      sourcePriceTableId = tariff.priceTableId;
    }

    assertMoneyInRange(frozenUnitPrice, "frozenUnitPrice");
    const frozenTotal = assertMoneyInRange(roundMoney(frozenUnitPrice * quantity), "frozenTotal");

    return this.repository.create({
      tenantId: actor.tenantId,
      workOrderId,
      customerId,
      serviceCatalogId,
      sourceTariffId,
      sourcePriceTableId,
      frozenUnitPrice,
      frozenCurrency,
      quantity,
      frozenTotal,
      frozenAt: new Date(),
      priceSource,
      status: "draft",
      notes,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: ServiceQuoteActorContext, serviceQuoteId: string): Promise<ServiceQuote> {
    const quote = await this.repository.findById(actor.tenantId, parseRequiredUuid(serviceQuoteId, "serviceQuoteId"));
    if (!quote) {
      throw new ServiceQuoteError(404, "SERVICE_QUOTE_NOT_FOUND", "not_found", "Service quote was not found.");
    }
    return quote;
  }

  // PATCH /:id — só `quantity`/`notes` e SÓ enquanto `draft`. O `frozenTotal` é recomputado a partir
  // do `frozenUnitPrice` JÁ congelado (jamais relê a Tarifa). `approved`/`rejected`/`void` = imutável.
  async update(actor: ServiceQuoteActorContext, serviceQuoteId: string, body: RawRecord): Promise<ServiceQuote> {
    const current = await this.get(actor, serviceQuoteId);
    if (current.status !== "draft") {
      throw new ServiceQuoteError(
        422,
        "SERVICE_QUOTE_UNPROCESSABLE",
        "quote_not_editable",
        `A ${current.status} quote can no longer be edited (anti-refaturamento).`,
      );
    }

    let quantity: number | undefined;
    let frozenTotal: number | undefined;
    if (body.quantity !== undefined) {
      quantity = assertMoneyInRange(parseQuantity(body.quantity), "quantity");
      frozenTotal = assertMoneyInRange(roundMoney(current.frozenUnitPrice * quantity), "frozenTotal");
    }
    const notes = body.notes === undefined ? undefined : parseOptionalNotes(body.notes);

    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      serviceQuoteId: parseRequiredUuid(serviceQuoteId, "serviceQuoteId"),
      quantity,
      frozenTotal,
      notes,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new ServiceQuoteError(404, "SERVICE_QUOTE_NOT_FOUND", "not_found", "Service quote was not found.");
    }
    return updated;
  }

  async updateStatus(actor: ServiceQuoteActorContext, serviceQuoteId: string, body: RawRecord): Promise<ServiceQuote> {
    const current = await this.get(actor, serviceQuoteId);
    const nextStatus = parseStatus(body.status);
    const allowed = SERVICE_QUOTE_STATUS_TRANSITIONS[current.status] ?? [];
    if (nextStatus === current.status || !allowed.includes(nextStatus)) {
      throw new ServiceQuoteError(
        422,
        "SERVICE_QUOTE_UNPROCESSABLE",
        "invalid_status_transition",
        `Cannot change status from ${current.status} to ${nextStatus}.`,
      );
    }

    // `void` é delete lógico: libera a chave natural parcial (is_active=false).
    const isActive = nextStatus === "void" ? false : undefined;
    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      serviceQuoteId: parseRequiredUuid(serviceQuoteId, "serviceQuoteId"),
      status: nextStatus,
      isActive,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new ServiceQuoteError(404, "SERVICE_QUOTE_NOT_FOUND", "not_found", "Service quote was not found.");
    }
    return updated;
  }
}

// Resolve as tabelas de valores PUBLICADAS do tenant (só destas se congela preço). Baseado em list()
// para InMemory e Prisma seguirem o MESMO caminho lógico (paridade).
async function resolvePublishedPriceTableIds(repo: PriceTableRepository, tenantId: string): Promise<Set<string>> {
  const result = await repo.list({ tenantId, status: "published", isActive: true, limit: 100, offset: 0 });
  return new Set(result.items.map((table) => table.id));
}

// Ω3F-3a (C3) — factories do resolver EXPORTADAS: o módulo work-order-financials congela preço pela
// MESMA máquina de resolução de Tarifa aplicável do orçamento (tabela PUBLICADA + vigência +
// cliente). Extraídas da composição inline anterior SEM mudar comportamento.
export function createMemoryApplicableTariffResolver(): ApplicableTariffResolver {
  const tariffRepository = getMemoryTariffRepositoryForTests();
  const priceTableRepository = getMemoryPriceTableRepositoryForTests();
  return async (tenantId, serviceCatalogId, customerId) => {
    const publishedIds = await resolvePublishedPriceTableIds(priceTableRepository, tenantId);
    return tariffRepository.findApplicable(tenantId, serviceCatalogId, customerId, publishedIds);
  };
}

export async function createPrismaApplicableTariffResolver(): Promise<ApplicableTariffResolver> {
  const { createPrismaTariffRepository } = await import("../tariffs/tariff-prisma.repository.js");
  const { createPrismaPriceTableRepository } = await import("../price-tables/price-table-prisma.repository.js");
  const tariffRepository = await createPrismaTariffRepository();
  const priceTableRepository = await createPrismaPriceTableRepository();
  return async (tenantId, serviceCatalogId, customerId) => {
    const publishedIds = await resolvePublishedPriceTableIds(priceTableRepository, tenantId);
    return tariffRepository.findApplicable(tenantId, serviceCatalogId, customerId, publishedIds);
  };
}

export async function createApplicableTariffResolver(): Promise<ApplicableTariffResolver> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryApplicableTariffResolver();
  }
  return createPrismaApplicableTariffResolver();
}

const memoryRepository = new InMemoryServiceQuoteRepository();
let defaultServicePromise: Promise<ServiceQuoteService> | undefined;

export function createMemoryServiceQuoteService(): ServiceQuoteService {
  return new ServiceQuoteService(memoryRepository, createMemoryApplicableTariffResolver());
}

export function getMemoryServiceQuoteRepositoryForTests(): InMemoryServiceQuoteRepository {
  return memoryRepository;
}

export async function createDefaultServiceQuoteService(): Promise<ServiceQuoteService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryServiceQuoteService();
  }
  defaultServicePromise ??= createPrismaServiceQuoteService();
  return defaultServicePromise;
}

export function resetServiceQuoteRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaServiceQuoteService(): Promise<ServiceQuoteService> {
  const { createPrismaServiceQuoteRepository } = await import("./service-quote-prisma.repository.js");
  const repository = await createPrismaServiceQuoteRepository();
  return new ServiceQuoteService(repository, await createPrismaApplicableTariffResolver());
}
