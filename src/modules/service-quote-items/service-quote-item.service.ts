import { env } from "../../config/env.js";
import {
  createDefaultServiceQuoteService,
  createMemoryServiceQuoteService,
  createMemoryApplicableTariffResolver,
  createPrismaApplicableTariffResolver,
  type ApplicableTariffResolver,
  type ServiceQuoteService,
} from "../service-quotes/service-quote.service.js";
import { ServiceQuoteError } from "../service-quotes/service-quote.types.js";
import {
  InMemoryServiceQuoteItemRepository,
  duplicateQuoteItemError,
  type ServiceQuoteItemRepository,
} from "./service-quote-item.repository.js";
import type {
  ListServiceQuoteItemResult,
  ServiceQuoteItemActorContext,
  ServiceQuoteItem,
} from "./service-quote-item.types.js";
import { ServiceQuoteItemError } from "./service-quote-item.types.js";
import {
  assertMoneyInRange,
  optionalString,
  parseCurrency,
  parseOptionalClientActionId,
  parseOptionalDescription,
  parseOptionalNotes,
  parsePriceSource,
  parseQuantity,
  parseRequiredDescription,
  parseRequiredUuid,
  parseUnitPrice,
  roundMoney,
} from "./service-quote-item.validators.js";

type RawRecord = Record<string, unknown>;

export class ServiceQuoteItemService {
  constructor(
    private readonly repository: ServiceQuoteItemRepository,
    private readonly serviceQuoteService: ServiceQuoteService,
    private readonly resolveApplicableTariff: ApplicableTariffResolver,
  ) {}

  async list(actor: ServiceQuoteItemActorContext, serviceQuoteId: string): Promise<ListServiceQuoteItemResult> {
    const quote = await this.assertQuote(actor, serviceQuoteId);
    const items = await this.repository.listByQuote(actor.tenantId, quote.id);
    // B1 (lição recorrente) — o total agregado é SOMADO AQUI (backend), só de itens não-deletados
    // (o repositório já os exclui). O front nunca soma.
    const totalAmount = roundMoney(items.reduce((sum, item) => sum + item.totalAmount, 0));
    return { items, totalAmount, currency: items[0]?.currency ?? "BRL" };
  }

  async create(actor: ServiceQuoteItemActorContext, serviceQuoteId: string, body: RawRecord): Promise<ServiceQuoteItem> {
    const quote = await this.assertQuote(actor, serviceQuoteId);
    this.assertEditable(quote);
    const source = parsePriceSource(body.source ?? body.price_source ?? body.priceSource);
    const quantity = assertMoneyInRange(parseQuantity(body.quantity), "quantity");
    const notes = parseOptionalNotes(body.notes);
    const clientActionId = parseOptionalClientActionId(body.client_action_id ?? body.clientActionId);

    // Idempotência tenant-scoped (§6): replay do mesmo client_action_id → 409 ANTES de resolver a
    // tarifa (não gasta resolução num retry já resolvido — padrão work-order-financial.service).
    // O unique PARCIAL do Postgres é a rede de segurança contra corrida.
    if (clientActionId) {
      const existing = await this.repository.findActiveByClientActionId(actor.tenantId, quote.id, clientActionId);
      if (existing) {
        throw duplicateQuoteItemError();
      }
    }

    // Congelamento (anti-refaturamento): o snapshot vem de UMA única leitura da fonte; nada é
    // relido depois — espelho de service-quote.service.create.
    let description: string;
    let unitAmount: number;
    let currency: string;
    let tariffId: string | undefined;
    let priceTableId: string | undefined;

    if (source === "manual") {
      // Item manual (ex.: pedágio): description obrigatória + unit_amount do corpo.
      description = parseRequiredDescription(body.description);
      unitAmount = roundMoney(parseUnitPrice(body.unit_amount ?? body.unitAmount));
      currency = parseCurrency(body.currency);
      tariffId = undefined;
      priceTableId = undefined;
    } else {
      const serviceCatalogId = parseRequiredUuid(body.service_catalog_id ?? body.serviceCatalogId, "serviceCatalogId");
      // A resolução é TENANT-SCOPED (tenant vem das claims do ator): tarifa de outra organização é
      // invisível — sem tarifa aplicável no tenant → 422 (nunca vaza existência cross-tenant).
      // O cliente do orçamento participa da resolução (tarifa por-cliente vence a padrão, mesma
      // regra do Financeiro da OS).
      const tariff = await this.resolveApplicableTariff(actor.tenantId, serviceCatalogId, quote.customerId);
      if (!tariff) {
        throw new ServiceQuoteItemError(
          422,
          "SERVICE_QUOTE_ITEM_UNPROCESSABLE",
          "tariff_not_found_for_service",
          "No applicable published tariff was found for this service; a quote item cannot be frozen without a price base.",
        );
      }
      const bodyDescription = parseOptionalDescription(body.description);
      const tariffName = optionalString(tariff.name);
      if (bodyDescription === undefined && tariffName === undefined) {
        throw new ServiceQuoteItemError(
          400,
          "SERVICE_QUOTE_ITEM_INVALID",
          "required_description",
          "description is required when the applicable tariff has no name.",
        );
      }
      description = bodyDescription ?? (tariffName as string);
      // A1 (crítico) — arredonda no ponto de congelamento (paridade InMemory×Prisma).
      unitAmount = roundMoney(tariff.unitPrice);
      currency = tariff.currency;
      tariffId = tariff.id;
      priceTableId = tariff.priceTableId;
    }

    // Homogeneidade de moeda por orçamento (achado do validador-mestre J-Ω3F-3A): o total agregado do
    // GET soma valores — misturar moedas no mesmo orçamento produziria um total sem sentido. O 1º item
    // fixa a moeda do orçamento; os demais precisam coincidir (422 currency_mismatch), mantendo o
    // agregado single-currency SOB ACESSO SEQUENCIAL. Ressalva (critico J-Ω3F-3A, C1): é um
    // read-then-write não-transacional — dois POST concorrentes num orçamento vazio podem ambos ver
    // length===0 e inserir moedas distintas. Janela TOCTOU sem backstop de banco (a moeda não tem
    // constraint como a idempotência tem o unique parcial); limitação conhecida, dano restrito ao
    // rótulo do agregado — ver P-Ω3F3A-MOEDA-AGREGADO (follow-up: CHECK/trigger).
    const currentItems = await this.repository.listByQuote(actor.tenantId, quote.id);
    if (currentItems.length > 0 && currentItems[0].currency !== currency) {
      throw new ServiceQuoteItemError(
        422,
        "SERVICE_QUOTE_ITEM_UNPROCESSABLE",
        "currency_mismatch",
        `All items on this service quote must use the same currency (${currentItems[0].currency}).`,
      );
    }

    assertMoneyInRange(unitAmount, "unitAmount");
    const totalAmount = assertMoneyInRange(roundMoney(unitAmount * quantity), "totalAmount");

    return this.repository.create({
      tenantId: actor.tenantId,
      serviceQuoteId: quote.id,
      tariffId,
      priceTableId,
      description,
      quantity,
      unitAmount,
      totalAmount,
      currency,
      source,
      notes,
      clientActionId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  // PATCH — edição inline de quantity/notes/description (+ unitAmount SÓ para source=manual).
  // Recomputa o total do preço JÁ CONGELADO, JAMAIS relê a tarifa (espelho service-quote.update).
  async update(
    actor: ServiceQuoteItemActorContext,
    serviceQuoteId: string,
    itemId: string,
    body: RawRecord,
  ): Promise<ServiceQuoteItem> {
    const current = await this.getItem(actor, serviceQuoteId, itemId);

    const description = body.description === undefined ? undefined : parseRequiredDescription(body.description);

    let unitAmount: number | undefined;
    const rawUnitAmount = body.unit_amount ?? body.unitAmount;
    if (rawUnitAmount !== undefined) {
      // Preço de tarifa é CONGELADO (anti-refaturamento): só item manual aceita editar unit_amount.
      if (current.source !== "manual") {
        throw new ServiceQuoteItemError(
          422,
          "SERVICE_QUOTE_ITEM_UNPROCESSABLE",
          "unit_amount_not_editable",
          "unit_amount can only be edited on manual items; tariff-sourced amounts are frozen.",
        );
      }
      unitAmount = assertMoneyInRange(roundMoney(parseUnitPrice(rawUnitAmount)), "unitAmount");
    }

    let quantity: number | undefined;
    if (body.quantity !== undefined) {
      quantity = assertMoneyInRange(parseQuantity(body.quantity), "quantity");
    }

    let totalAmount: number | undefined;
    if (quantity !== undefined || unitAmount !== undefined) {
      const effectiveUnit = unitAmount ?? current.unitAmount;
      const effectiveQuantity = quantity ?? current.quantity;
      totalAmount = assertMoneyInRange(roundMoney(effectiveUnit * effectiveQuantity), "totalAmount");
    }

    const notes = body.notes === undefined ? undefined : parseOptionalNotes(body.notes);

    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      serviceQuoteId: current.serviceQuoteId,
      itemId: current.id,
      description,
      quantity,
      unitAmount,
      totalAmount,
      notes,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw quoteItemNotFoundError();
    }
    return updated;
  }

  // DELETE lógico: carimba deleted_at; o item some da lista e do total agregado. Re-delete → 404.
  async delete(actor: ServiceQuoteItemActorContext, serviceQuoteId: string, itemId: string): Promise<ServiceQuoteItem> {
    const current = await this.getItem(actor, serviceQuoteId, itemId);
    const removed = await this.repository.softDelete(actor.tenantId, current.serviceQuoteId, current.id, actor.userId);
    if (!removed) {
      throw quoteItemNotFoundError();
    }
    return removed;
  }

  // Orçamento in-tenant? senão 404 (não vaza cross-tenant). Reusa o ServiceQuoteService — o get já
  // lança SERVICE_QUOTE_NOT_FOUND (padrão espelhado do assertWorkOrder do Financeiro da OS).
  private async assertQuote(actor: ServiceQuoteItemActorContext, serviceQuoteId: string) {
    try {
      return await this.serviceQuoteService.get(actor, serviceQuoteId);
    } catch (error) {
      if (error instanceof ServiceQuoteError && error.statusCode === 404) {
        throw new ServiceQuoteItemError(404, "SERVICE_QUOTE_NOT_FOUND", "quote_not_found", "Service quote was not found.");
      }
      throw error;
    }
  }

  // REGRA NOVA (não existe no Financeiro da OS): itens só podem ser criados/editados/deletados
  // enquanto o orçamento-pai está `draft`. Espelha a regra de edição do próprio ServiceQuote
  // (service-quote.service.update só em draft — anti-refaturamento do cabeçalho aprovado/rejeitado).
  private assertEditable(quote: { readonly status: string }): void {
    if (quote.status !== "draft") {
      throw new ServiceQuoteItemError(
        422,
        "SERVICE_QUOTE_ITEM_UNPROCESSABLE",
        "quote_not_editable",
        "O orçamento não está editável (não está em rascunho).",
      );
    }
  }

  private async getItem(
    actor: ServiceQuoteItemActorContext,
    serviceQuoteId: string,
    itemId: string,
  ): Promise<ServiceQuoteItem> {
    const quote = await this.assertQuote(actor, serviceQuoteId);
    this.assertEditable(quote);
    const item = await this.repository.findById(actor.tenantId, quote.id, parseRequiredUuid(itemId, "itemId"));
    if (!item) {
      throw quoteItemNotFoundError();
    }
    return item;
  }
}

function quoteItemNotFoundError(): ServiceQuoteItemError {
  return new ServiceQuoteItemError(
    404,
    "SERVICE_QUOTE_ITEM_NOT_FOUND",
    "quote_item_not_found",
    "Service quote item was not found.",
  );
}

const memoryRepository = new InMemoryServiceQuoteItemRepository();
let defaultServicePromise: Promise<ServiceQuoteItemService> | undefined;

export function createMemoryServiceQuoteItemService(): ServiceQuoteItemService {
  return new ServiceQuoteItemService(memoryRepository, createMemoryServiceQuoteService(), createMemoryApplicableTariffResolver());
}

export function getMemoryServiceQuoteItemRepositoryForTests(): InMemoryServiceQuoteItemRepository {
  return memoryRepository;
}

export async function createDefaultServiceQuoteItemService(): Promise<ServiceQuoteItemService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryServiceQuoteItemService();
  }
  defaultServicePromise ??= createPrismaServiceQuoteItemService();
  return defaultServicePromise;
}

export function resetServiceQuoteItemRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaServiceQuoteItemService(): Promise<ServiceQuoteItemService> {
  const { createPrismaServiceQuoteItemRepository } = await import("./service-quote-item-prisma.repository.js");
  const repository = await createPrismaServiceQuoteItemRepository();
  const serviceQuoteService = await createDefaultServiceQuoteService();
  return new ServiceQuoteItemService(repository, serviceQuoteService, await createPrismaApplicableTariffResolver());
}
