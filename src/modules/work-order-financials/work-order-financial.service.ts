import { env } from "../../config/env.js";
import {
  createMemoryApplicableTariffResolver,
  createPrismaApplicableTariffResolver,
  type ApplicableTariffResolver,
} from "../service-quotes/service-quote.service.js";
import {
  createDefaultWorkOrderService,
  createMemoryWorkOrderService,
  type WorkOrderService,
} from "../work-orders/work-order.service.js";
import { WorkOrderError } from "../work-orders/work-order.types.js";
import {
  InMemoryWorkOrderFinancialItemRepository,
  duplicateFinancialItemError,
  type WorkOrderFinancialItemRepository,
} from "./work-order-financial.repository.js";
import type {
  ListWorkOrderFinancialResult,
  WorkOrderFinancialActorContext,
  WorkOrderFinancialItem,
} from "./work-order-financial.types.js";
import { WorkOrderFinancialError } from "./work-order-financial.types.js";
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
} from "./work-order-financial.validators.js";

type RawRecord = Record<string, unknown>;

export class WorkOrderFinancialService {
  constructor(
    private readonly repository: WorkOrderFinancialItemRepository,
    private readonly workOrderService: WorkOrderService,
    private readonly resolveApplicableTariff: ApplicableTariffResolver,
  ) {}

  async list(actor: WorkOrderFinancialActorContext, workOrderId: string): Promise<ListWorkOrderFinancialResult> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const items = await this.repository.listByWorkOrder(actor.tenantId, workOrder.id);
    // B1 (lição recorrente) — o total agregado é SOMADO AQUI (backend), só de itens não-deletados
    // (o repositório já os exclui). O front nunca soma.
    const totalAmount = roundMoney(items.reduce((sum, item) => sum + item.totalAmount, 0));
    return { items, totalAmount, currency: items[0]?.currency ?? "BRL" };
  }

  async create(actor: WorkOrderFinancialActorContext, workOrderId: string, body: RawRecord): Promise<WorkOrderFinancialItem> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const source = parsePriceSource(body.source ?? body.price_source ?? body.priceSource);
    const quantity = assertMoneyInRange(parseQuantity(body.quantity), "quantity");
    const notes = parseOptionalNotes(body.notes);
    const clientActionId = parseOptionalClientActionId(body.client_action_id ?? body.clientActionId);

    // Idempotência tenant-scoped (§6): replay do mesmo client_action_id → 409 ANTES de resolver a
    // tarifa (não gasta resolução num retry já resolvido — padrão work-order-attachment.service).
    // O unique PARCIAL do Postgres é a rede de segurança contra corrida.
    if (clientActionId) {
      const existing = await this.repository.findActiveByClientActionId(actor.tenantId, workOrder.id, clientActionId);
      if (existing) {
        throw duplicateFinancialItemError();
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
      // O cliente da OS participa da resolução (tarifa por-cliente vence a padrão, mesma regra do
      // orçamento).
      const tariff = await this.resolveApplicableTariff(actor.tenantId, serviceCatalogId, workOrder.customerId);
      if (!tariff) {
        throw new WorkOrderFinancialError(
          422,
          "WORK_ORDER_FINANCIAL_UNPROCESSABLE",
          "tariff_not_found_for_service",
          "No applicable published tariff was found for this service; a financial item cannot be frozen without a price base.",
        );
      }
      const bodyDescription = parseOptionalDescription(body.description);
      const tariffName = optionalString(tariff.name);
      if (bodyDescription === undefined && tariffName === undefined) {
        throw new WorkOrderFinancialError(
          400,
          "WORK_ORDER_FINANCIAL_INVALID",
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

    // Homogeneidade de moeda por OS (achado do validador-mestre J-Ω3F-3A): o total agregado do GET soma
    // valores — misturar moedas na mesma OS produziria um total sem sentido. O 1º item fixa a moeda da OS;
    // os demais precisam coincidir (422 currency_mismatch). Assim o agregado é SEMPRE single-currency.
    const currentItems = await this.repository.listByWorkOrder(actor.tenantId, workOrder.id);
    if (currentItems.length > 0 && currentItems[0].currency !== currency) {
      throw new WorkOrderFinancialError(
        422,
        "WORK_ORDER_FINANCIAL_UNPROCESSABLE",
        "currency_mismatch",
        `All financial items on this work order must use the same currency (${currentItems[0].currency}).`,
      );
    }

    assertMoneyInRange(unitAmount, "unitAmount");
    const totalAmount = assertMoneyInRange(roundMoney(unitAmount * quantity), "totalAmount");

    return this.repository.create({
      tenantId: actor.tenantId,
      workOrderId: workOrder.id,
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
    actor: WorkOrderFinancialActorContext,
    workOrderId: string,
    itemId: string,
    body: RawRecord,
  ): Promise<WorkOrderFinancialItem> {
    const current = await this.getItem(actor, workOrderId, itemId);

    const description = body.description === undefined ? undefined : parseRequiredDescription(body.description);

    let unitAmount: number | undefined;
    const rawUnitAmount = body.unit_amount ?? body.unitAmount;
    if (rawUnitAmount !== undefined) {
      // Preço de tarifa é CONGELADO (anti-refaturamento): só item manual aceita editar unit_amount.
      if (current.source !== "manual") {
        throw new WorkOrderFinancialError(
          422,
          "WORK_ORDER_FINANCIAL_UNPROCESSABLE",
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
      workOrderId: current.workOrderId,
      itemId: current.id,
      description,
      quantity,
      unitAmount,
      totalAmount,
      notes,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw financialItemNotFoundError();
    }
    return updated;
  }

  // DELETE lógico: carimba deleted_at; o item some da lista e do total agregado. Re-delete → 404.
  async delete(actor: WorkOrderFinancialActorContext, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem> {
    const current = await this.getItem(actor, workOrderId, itemId);
    const removed = await this.repository.softDelete(actor.tenantId, current.workOrderId, current.id, actor.userId);
    if (!removed) {
      throw financialItemNotFoundError();
    }
    return removed;
  }

  // OS in-tenant? senão 404 (não vaza cross-tenant). Reusa o WorkOrderService — padrão
  // work-order-attachment.service.
  private async assertWorkOrder(actor: WorkOrderFinancialActorContext, workOrderId: string) {
    try {
      return await this.workOrderService.get(actor, workOrderId);
    } catch (error) {
      if (error instanceof WorkOrderError && error.statusCode === 404) {
        throw new WorkOrderFinancialError(404, "WORK_ORDER_NOT_FOUND", "work_order_not_found", "Work order was not found.");
      }
      throw error;
    }
  }

  private async getItem(
    actor: WorkOrderFinancialActorContext,
    workOrderId: string,
    itemId: string,
  ): Promise<WorkOrderFinancialItem> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const item = await this.repository.findById(actor.tenantId, workOrder.id, parseRequiredUuid(itemId, "itemId"));
    if (!item) {
      throw financialItemNotFoundError();
    }
    return item;
  }
}

function financialItemNotFoundError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    404,
    "WORK_ORDER_FINANCIAL_NOT_FOUND",
    "financial_item_not_found",
    "Work order financial item was not found.",
  );
}

const memoryRepository = new InMemoryWorkOrderFinancialItemRepository();
let defaultServicePromise: Promise<WorkOrderFinancialService> | undefined;

export function createMemoryWorkOrderFinancialService(): WorkOrderFinancialService {
  return new WorkOrderFinancialService(memoryRepository, createMemoryWorkOrderService(), createMemoryApplicableTariffResolver());
}

export function getMemoryWorkOrderFinancialRepositoryForTests(): InMemoryWorkOrderFinancialItemRepository {
  return memoryRepository;
}

export async function createDefaultWorkOrderFinancialService(): Promise<WorkOrderFinancialService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderFinancialService();
  }
  defaultServicePromise ??= createPrismaWorkOrderFinancialService();
  return defaultServicePromise;
}

export function resetWorkOrderFinancialRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaWorkOrderFinancialService(): Promise<WorkOrderFinancialService> {
  const { createPrismaWorkOrderFinancialItemRepository } = await import("./work-order-financial-prisma.repository.js");
  const repository = await createPrismaWorkOrderFinancialItemRepository();
  const workOrderService = await createDefaultWorkOrderService();
  return new WorkOrderFinancialService(repository, workOrderService, await createPrismaApplicableTariffResolver());
}
