import { randomUUID } from "node:crypto";

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
  optionalString,
  parseCurrency,
  parseLimit,
  parseOffset,
  parseOptionalDate,
  parseOptionalNotes,
  parseOptionalQuoteNumber,
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
    // Ω3F-4a — cabeçalho opcional editável no create (number/issued_at/valid_until).
    const number = parseOptionalQuoteNumber(body.number);
    const issuedAt = parseOptionalDate(body.issued_at ?? body.issuedAt, "issuedAt");
    const validUntil = parseOptionalDate(body.valid_until ?? body.validUntil, "validUntil");

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
      number,
      issuedAt,
      validUntil,
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
    // Ω3F-4a — cabeçalho editável enquanto draft. `in`-check para permitir edição por-campo.
    const number = body.number === undefined ? undefined : parseOptionalQuoteNumber(body.number);
    const issuedAt =
      "issued_at" in body || "issuedAt" in body ? parseOptionalDate(body.issued_at ?? body.issuedAt, "issuedAt") : undefined;
    const validUntil =
      "valid_until" in body || "validUntil" in body
        ? parseOptionalDate(body.valid_until ?? body.validUntil, "validUntil")
        : undefined;

    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      serviceQuoteId: parseRequiredUuid(serviceQuoteId, "serviceQuoteId"),
      quantity,
      frozenTotal,
      notes,
      number,
      issuedAt,
      validUntil,
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

  // Ω3F-4b (D-Ω3F-4B) — aprovar orçamento → cria OS. Operação composta IDEMPOTENTE ancorada em
  // `created_work_order_id` (um orçamento gera no MÁX. uma OS). Passa customer+serviço ao
  // WorkOrderService.create com skipApplicableTariffCheck=true (a OS derivada já é precificada pelo
  // preço CONGELADO — anti-refaturamento). O `activation_mode` (GAP 2) mora em service_details da OS.
  async approve(
    actor: ServiceQuoteActorContext,
    serviceQuoteId: string,
    body: RawRecord,
  ): Promise<{ readonly quote: ServiceQuote; readonly workOrderId: string }> {
    const quote = await this.get(actor, serviceQuoteId);

    // Replay: um orçamento já aprovado (com OS gerada) não gera outra OS.
    if (quote.createdWorkOrderId) {
      throw new ServiceQuoteError(
        409,
        "SERVICE_QUOTE_CONFLICT",
        "quote_already_approved",
        "This quote has already been approved and generated a work order.",
      );
    }
    if (quote.status !== "draft") {
      throw new ServiceQuoteError(
        409,
        "SERVICE_QUOTE_CONFLICT",
        "quote_not_approvable",
        `A ${quote.status} quote cannot be approved.`,
      );
    }
    if (quote.validUntil && quote.validUntil.getTime() < Date.now()) {
      throw new ServiceQuoteError(422, "SERVICE_QUOTE_UNPROCESSABLE", "quote_expired", "This quote is past its valid_until date.");
    }
    if (quote.frozenTotal <= 0) {
      throw new ServiceQuoteError(422, "SERVICE_QUOTE_UNPROCESSABLE", "quote_empty", "This quote has no billable total to approve.");
    }

    // CAS reserve-before-create (condição critico J-Ω3F-4B): reserva o orçamento (draft→approved) de
    // forma ATÔMICA ANTES de criar a OS. As checagens acima são fast-fail de UX; a guarda REAL contra
    // duplo-faturamento sob concorrência é esta. O perdedor recebe undefined → 409 e NÃO cria OS.
    const reserved = await this.repository.claimForApproval(actor.tenantId, quote.id);
    if (!reserved) {
      throw new ServiceQuoteError(
        409,
        "SERVICE_QUOTE_CONFLICT",
        "quote_already_approved",
        "This quote has already been approved and generated a work order.",
      );
    }

    const activationMode = optionalString(body.activation_mode ?? body.activationMode)?.slice(0, 120);
    const title = optionalString(body.title) ?? `OS do orçamento ${quote.number ?? quote.id}`;

    let workOrder: { readonly id: string };
    try {
      // DYNAMIC import — evita o ciclo (work-orders JÁ importa este módulo estaticamente para o resolver
      // de tarifa). NÃO adicionar import estático de work-orders no topo. Ver item 5 / D-Ω3F-4B.
      const { createDefaultWorkOrderService } = await import("../work-orders/work-order.service.js");
      const workOrders = await createDefaultWorkOrderService();
      workOrder = await workOrders.create(
        actor,
        {
          title,
          customer_id: quote.customerId,
          service_catalog_id: quote.serviceCatalogId,
          // Origem (ponto de coleta) — encaminhada junto do destino (condição fid-avaliador J-Ω3F-4B).
          serviceAddress: body.serviceAddress,
          serviceCity: body.serviceCity,
          serviceState: body.serviceState,
          serviceZipCode: body.serviceZipCode,
          serviceLatitude: body.serviceLatitude,
          serviceLongitude: body.serviceLongitude,
          destinationAddress: body.destinationAddress,
          destinationCity: body.destinationCity,
          destinationState: body.destinationState,
          destinationZipCode: body.destinationZipCode,
          destinationLatitude: body.destinationLatitude,
          destinationLongitude: body.destinationLongitude,
          service_details: { ...(activationMode ? { activation_mode: activationMode } : {}) },
          priority: optionalString(body.priority) ?? "medium",
        },
        { skipApplicableTariffCheck: true },
      );
    } catch (error) {
      // Compensação: a OS falhou após a reserva → devolve o orçamento a draft para permitir nova tentativa
      // (senão ficaria approved sem OS, irrecuperável pela máquina de estado).
      await this.repository.update({
        tenantId: actor.tenantId,
        serviceQuoteId: quote.id,
        status: "draft",
        updatedBy: actor.userId,
      });
      throw error;
    }

    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      serviceQuoteId: quote.id,
      createdWorkOrderId: workOrder.id,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw new ServiceQuoteError(404, "SERVICE_QUOTE_NOT_FOUND", "not_found", "Service quote was not found.");
    }
    return { quote: updated, workOrderId: workOrder.id };
  }

  // Ω3F-4b (D-Ω3F-4B-SHARE) — gera (ou reusa, idempotente) o token de compartilhamento e devolve o link
  // ao dono AUTENTICADO. O token NUNCA entra em auditoria nem no DTO normal (§2.8). Orçamento anulado
  // não é compartilhável. Endpoint público de leitura-por-token fica ADIADO (fatia secops).
  async share(
    actor: ServiceQuoteActorContext,
    serviceQuoteId: string,
  ): Promise<{ readonly shareToken: string; readonly sharePath: string }> {
    const quote = await this.get(actor, serviceQuoteId);
    if (quote.status === "void") {
      throw new ServiceQuoteError(422, "SERVICE_QUOTE_UNPROCESSABLE", "quote_not_shareable", "A void quote cannot be shared.");
    }

    let shareToken = quote.shareToken;
    if (!shareToken) {
      shareToken = randomUUID();
      const updated = await this.repository.update({
        tenantId: actor.tenantId,
        serviceQuoteId: quote.id,
        shareToken,
        updatedBy: actor.userId,
      });
      if (!updated) {
        throw new ServiceQuoteError(404, "SERVICE_QUOTE_NOT_FOUND", "not_found", "Service quote was not found.");
      }
    }
    return { shareToken, sharePath: `/orcamentos/compartilhado/${shareToken}` };
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
