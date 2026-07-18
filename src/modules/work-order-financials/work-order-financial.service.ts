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
import type { FinancialTitle } from "../financial-titles/financial-title.types.js";
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
    // os demais precisam coincidir (422 currency_mismatch), mantendo o agregado single-currency SOB ACESSO
    // SEQUENCIAL. Ressalva (critico J-Ω3F-3A, C1): é um read-then-write não-transacional — dois POST
    // concorrentes numa OS vazia podem ambos ver length===0 e inserir moedas distintas. Janela TOCTOU sem
    // backstop de banco (a moeda não tem constraint como a idempotência tem o unique parcial); limitação
    // conhecida, dano restrito ao rótulo do agregado — ver P-Ω3F3A-MOEDA-AGREGADO (follow-up: CHECK/trigger).
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
    // Ω4-3 (D-Ω4-C1) — trava anti-refaturamento: item já faturado é IMUTÁVEL (o valor já virou Título).
    assertItemNotInvoiced(current);

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
    // Ω4-3 (D-Ω4-C1) — trava anti-refaturamento: item já faturado não pode ser removido do extrato.
    assertItemNotInvoiced(current);
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

// Ω4-3 (D-Ω4-C1) — item já faturado (invoiced_at != null) é imutável: PATCH/DELETE → 422 item_invoiced.
function assertItemNotInvoiced(item: WorkOrderFinancialItem): void {
  if (item.invoicedAt != null) {
    throw new WorkOrderFinancialError(
      422,
      "WORK_ORDER_FINANCIAL_UNPROCESSABLE",
      "item_invoiced",
      "This financial item was already invoiced and can no longer be changed or removed.",
    );
  }
}

// Ω4-3 (D-Ω4-C2) — 409 do faturamento: a OS já tem título ATIVO (idempotência anti-refaturamento).
function alreadyInvoicedError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    409,
    "WORK_ORDER_FINANCIAL_CONFLICT",
    "already_invoiced",
    "This work order has already been invoiced.",
  );
}

// Ω4-3 (D-Ω4-C1/C2) — FATURAMENTO OS→Título. Vive no módulo work-order-financials porque (a) lê e carimba
// os itens do Financeiro da OS e (b) a trava item_invoiced também mora aqui. Depende do WorkOrderService e
// do FinancialTitleService por DYNAMIC import (espelho do approve→OS do Ω3F-4b) — nunca import estático,
// para não acoplar/ciclar módulos. NÃO relê tarifa: o Título usa a Σ CONGELADA dos itens.
export type WorkOrderInvoiceResult = {
  readonly title: FinancialTitle;
  readonly totalAmount: number;
  readonly currency: string;
  readonly invoicedItemCount: number;
};

export class WorkOrderInvoicingService {
  constructor(private readonly repository: WorkOrderFinancialItemRepository) {}

  async invoice(
    actor: WorkOrderFinancialActorContext,
    workOrderId: string,
    body: RawRecord,
  ): Promise<WorkOrderInvoiceResult> {
    const workOrder = await this.resolveWorkOrder(actor, workOrderId);

    // DYNAMIC import — evita acoplar/ciclar com financial-titles (item 5 do comando / D-Ω3F-4B).
    const { createDefaultFinancialTitleService } = await import("../financial-titles/financial-title.service.js");
    const titleService = await createDefaultFinancialTitleService();

    // PRE-CHECK de idempotência (D-Ω4-C2) ANTES do agregado: se a OS já tem título receivable ATIVO, é
    // 409 already_invoiced — mesmo que todos os itens já estejam carimbados (senão o 2º faturamento cairia
    // em nothing_to_invoice e mascararia a idempotência). `nothing_to_invoice` fica para a OS sem título
    // ativo E sem itens faturáveis (ex.: título cancelado/removido, itens já carimbados).
    if (await titleService.findActiveByWorkOrder(actor, workOrder.id, "receivable")) {
      throw alreadyInvoicedError();
    }

    // Agregado CONGELADO dos itens ativos e AINDA NÃO faturados (invoiced_at IS NULL). Σ no backend.
    const items = await this.repository.listInvoiceableByWorkOrder(actor.tenantId, workOrder.id);
    const totalAmount = roundMoney(items.reduce((sum, item) => sum + item.totalAmount, 0));
    if (items.length === 0 || totalAmount <= 0) {
      throw new WorkOrderFinancialError(
        422,
        "WORK_ORDER_FINANCIAL_UNPROCESSABLE",
        "nothing_to_invoice",
        "This work order has no invoiceable financial items.",
      );
    }
    const currency = items[0].currency;
    const dueDate = parseInvoiceDueDate(body.due_date ?? body.dueDate);
    const now = new Date();

    let title: FinancialTitle;
    try {
      title = await titleService.createForWorkOrder(actor, {
        workOrderId: workOrder.id,
        direction: "receivable",
        partyType: "customer",
        // Cliente do Título = snapshot da OS. Sem nome (OS antiga/rascunho) → rótulo neutro (NÃO 422).
        partyName: optionalString(workOrder.customerName) ?? "Cliente não informado",
        partyId: workOrder.customerId,
        amount: totalAmount, // Σ CONGELADA — nunca relê tarifa.
        currency,
        issueDate: now, // competencia derivada disto no titleService.
        dueDate,
      });
    } catch (error) {
      // Rede da constraint parcial (corrida que passou o pre-check): 409 do título → already_invoiced.
      if (isConflictError(error)) {
        throw alreadyInvoicedError();
      }
      throw error;
    }

    // CARIMBO (D-Ω4-C1): sequencial (título → itens). Se o carimbo falhar, o título já existe e a
    // idempotência barra o replay — ver pendência P-Ω4-3-REFATURAR-DELTA.
    const invoicedItemCount = await this.repository.markInvoiced({
      tenantId: actor.tenantId,
      workOrderId: workOrder.id,
      itemIds: items.map((item) => item.id),
      titleId: title.id,
      invoicedAt: now,
      updatedBy: actor.userId,
    });

    return { title, totalAmount, currency, invoicedItemCount };
  }

  private async resolveWorkOrder(actor: WorkOrderFinancialActorContext, workOrderId: string) {
    const workOrders = await createDefaultWorkOrderService();
    try {
      return await workOrders.get(actor, workOrderId);
    } catch (error) {
      if (error instanceof WorkOrderError && error.statusCode === 404) {
        throw new WorkOrderFinancialError(404, "WORK_ORDER_NOT_FOUND", "work_order_not_found", "Work order was not found.");
      }
      throw error;
    }
  }
}

// due_date OPCIONAL no corpo: default = server now + 30 dias (UTC). Data inválida → 400 invalid_due_date.
function parseInvoiceDueDate(value: unknown): Date {
  if (value === undefined || value === null || value === "") {
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 30);
    return due;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new WorkOrderFinancialError(400, "WORK_ORDER_FINANCIAL_INVALID", "invalid_due_date", "due_date must be a valid ISO date.");
  }
  return date;
}

// Duck-type do 409 vindo do titleService (evita import estático de FinancialTitleError — só dynamic).
function isConflictError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "statusCode" in error && (error as { readonly statusCode?: unknown }).statusCode === 409;
}

const memoryRepository = new InMemoryWorkOrderFinancialItemRepository();
let defaultServicePromise: Promise<WorkOrderFinancialService> | undefined;
let defaultInvoicingServicePromise: Promise<WorkOrderInvoicingService> | undefined;

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

// Ω4-3 — o serviço de faturamento COMPARTILHA o singleton InMemory de itens (mesma fonte que o
// WorkOrderFinancialService), então itens criados/faturados são mutuamente visíveis nos testes memory.
export function createMemoryWorkOrderInvoicingService(): WorkOrderInvoicingService {
  return new WorkOrderInvoicingService(memoryRepository);
}

export async function createDefaultWorkOrderInvoicingService(): Promise<WorkOrderInvoicingService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryWorkOrderInvoicingService();
  }
  defaultInvoicingServicePromise ??= createPrismaWorkOrderInvoicingService();
  return defaultInvoicingServicePromise;
}

export function resetWorkOrderFinancialRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
  defaultInvoicingServicePromise = undefined;
}

async function createPrismaWorkOrderFinancialService(): Promise<WorkOrderFinancialService> {
  const { createPrismaWorkOrderFinancialItemRepository } = await import("./work-order-financial-prisma.repository.js");
  const repository = await createPrismaWorkOrderFinancialItemRepository();
  const workOrderService = await createDefaultWorkOrderService();
  return new WorkOrderFinancialService(repository, workOrderService, await createPrismaApplicableTariffResolver());
}

async function createPrismaWorkOrderInvoicingService(): Promise<WorkOrderInvoicingService> {
  const { createPrismaWorkOrderFinancialItemRepository } = await import("./work-order-financial-prisma.repository.js");
  const repository = await createPrismaWorkOrderFinancialItemRepository();
  return new WorkOrderInvoicingService(repository);
}
