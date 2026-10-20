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
import { createDefaultFinancialUnitOfWork, type FinancialUowResolver } from "../financial-uow/index.js";
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
    assertWorkOrderNotCancelled(workOrder); // P-Ω3F6-TERMINAL-GUARD: sem item novo em OS cancelada.
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
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    assertWorkOrderNotCancelled(workOrder); // P-Ω3F6-TERMINAL-GUARD: sem edição de item em OS cancelada.
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
      // B-SAN3-02 (D2) — o CAS (`invoiced_at IS NULL`) casou 0 linhas: o faturamento pode ter carimbado o item
      // DEPOIS do pré-check. Relê para responder o motivo real (422 item_invoiced), nunca um 404 cego.
      throw await this.casMissError(actor, current.workOrderId, current.id);
    }
    return updated;
  }

  // DELETE lógico: carimba deleted_at; o item some da lista e do total agregado. Re-delete → 404.
  async delete(actor: WorkOrderFinancialActorContext, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    assertWorkOrderNotCancelled(workOrder); // P-Ω3F6-TERMINAL-GUARD (o `zero` do cancel usa zeroActiveItems, não este).
    const current = await this.getItem(actor, workOrderId, itemId);
    // Ω4-3 (D-Ω4-C1) — trava anti-refaturamento: item já faturado não pode ser removido do extrato.
    assertItemNotInvoiced(current);
    const removed = await this.repository.softDelete(actor.tenantId, current.workOrderId, current.id, actor.userId);
    if (!removed) {
      // B-SAN3-02 (D2) — idem update: o CAS perdeu a corrida para o faturamento → 422 item_invoiced; senão 404.
      throw await this.casMissError(actor, current.workOrderId, current.id);
    }
    return removed;
  }

  // B-SAN3-02 (D2) — o CAS de update/softDelete casou 0 linhas: relê. Existe e está carimbado → 422 item_invoiced
  // (assertItemNotInvoiced); senão (sumiu/deletado) → 404, como antes.
  private async casMissError(actor: WorkOrderFinancialActorContext, workOrderId: string, itemId: string): Promise<Error> {
    const reread = await this.repository.findById(actor.tenantId, workOrderId, itemId);
    if (reread && reread.invoicedAt != null) {
      try {
        assertItemNotInvoiced(reread);
      } catch (error) {
        return error as Error;
      }
    }
    return financialItemNotFoundError();
  }

  // P-Ω3F6-STATUS-BYPASS (ataque, ALTA) — `zero` não pode destruir item FATURADO (lastro de Título, D-Ω4-C1).
  // Consumido pelo cancel(decision='zero') do WorkOrderService: se true → 422 has_invoiced_items (usar `keep`).
  async hasActiveInvoicedItems(actor: WorkOrderFinancialActorContext, workOrderId: string): Promise<boolean> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    const items = await this.repository.listByWorkOrder(actor.tenantId, workOrder.id);
    return items.some((item) => item.invoicedAt != null);
  }

  // P-Ω3F6-ZERO-ATOMICIDADE — zera o financeiro da OS numa ÚNICA operação atômica (softDeleteAll), excluindo os
  // FATURADOS (invoiced_at IS NULL). Substitui o loop de N deletes sequenciais sem transação (parcialidade + N+1).
  async zeroActiveItems(actor: WorkOrderFinancialActorContext, workOrderId: string): Promise<number> {
    const workOrder = await this.assertWorkOrder(actor, workOrderId);
    return this.repository.softDeleteAllByWorkOrder(actor.tenantId, workOrder.id, actor.userId);
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

// P-Ω3F6-TERMINAL-GUARD — nenhuma OBRIGAÇÃO financeira nova numa OS em estado TERMINAL (cancelled): create/
// update/delete de item e faturamento (invoice) recusam (422 work_order_cancelled). Sem isso, a invariante do
// cancelamento (decision=zero ⇒ total=0; OS morta sem cobrança nova) era furada lançando/faturando item depois.
function assertWorkOrderNotCancelled(workOrder: { readonly status: string }): void {
  if (workOrder.status === "cancelled") {
    throw new WorkOrderFinancialError(
      422,
      "WORK_ORDER_FINANCIAL_UNPROCESSABLE",
      "work_order_cancelled",
      "This work order is cancelled; financial items and invoicing are no longer allowed.",
    );
  }
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

// Ω4-3 (D-Ω4-C2) → B-SAN3-02 — 409 do faturamento: a OS já tem título ORIGINAL ATIVO e nada novo a faturar (replay sem
// delta), ou um 2º ORIGINAL bateu no índice dentro da unidade.
function alreadyInvoicedError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    409,
    "WORK_ORDER_FINANCIAL_CONFLICT",
    "already_invoiced",
    "This work order has already been invoiced.",
  );
}

function nothingToInvoiceError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    422,
    "WORK_ORDER_FINANCIAL_UNPROCESSABLE",
    "nothing_to_invoice",
    "This work order has no invoiceable financial items.",
  );
}

// B-SAN3-02 (D1 passo 7) — a contagem carimbada difere da selecionada. Inalcançável sob o FOR UPDATE dos itens;
// fail-closed (precedente cheque.service.ts:288): a unidade inteira desfaz. É a guarda que torna observável a
// falta do FOR UPDATE (M2): sem ela, o título sairia maior que o lastro carimbado.
function invoiceItemsChangedError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    409,
    "WORK_ORDER_FINANCIAL_CONFLICT",
    "invoice_items_changed",
    "The invoiceable items changed while invoicing; nothing was invoiced. Retry the operation.",
  );
}

// B-SAN3-02 (D1/D5, A4) — deadlock/serialização/trava indisponível detectados pelo Postgres, ou transação interativa
// expirada: a transação JÁ desfez (nada persistiu) e repetir é seguro (o carimbo impede faturar o mesmo item duas
// vezes). 503, a forma da casa para transitórios (03a/04a).
function invoiceTransientConflictError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    503,
    "WORK_ORDER_FINANCIAL_UNAVAILABLE",
    "invoice_transient_conflict",
    "Invoicing hit a transient database conflict and nothing was invoiced. Retry the operation.",
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
  // B-SAN3-02 — id do título ORIGINAL quando este faturamento gerou um COMPLEMENTAR (delta); undefined = original.
  readonly parentTitleId?: string;
};

// B-SAN3-02 (D1) — o faturamento roda DENTRO da unidade financeira (financial-uow): advisory SHARED do período →
// `SELECT … FOR UPDATE ORDER BY created_at, id` dos itens faturáveis → decisão original × complementar DEPOIS da
// trava → INSERT do título → carimbo dos itens, tudo na MESMA transação. Ou o título e exatamente o conjunto
// carimbado persistem, ou nada persiste (P1). Os itens lançados depois de um faturamento viram um título
// COMPLEMENTAR (`parentTitleId` = o original ativo), cobrando só os itens ainda sem carimbo (P3).
export class WorkOrderInvoicingService {
  constructor(
    private readonly repository: WorkOrderFinancialItemRepository,
    private readonly resolveUow: FinancialUowResolver = createDefaultFinancialUnitOfWork,
  ) {}

  async invoice(
    actor: WorkOrderFinancialActorContext,
    workOrderId: string,
    body: RawRecord,
  ): Promise<WorkOrderInvoiceResult> {
    const workOrder = await this.resolveWorkOrder(actor, workOrderId);
    // P-Ω3F6-TERMINAL-GUARD (ataque de desenho, MÉDIA) — faturar entrava por FORA do guard de create/update:
    // uma OS cancelada não pode cunhar Título NOVO (obrigação financeira nova sobre OS morta). 422.
    assertWorkOrderNotCancelled(workOrder);

    // DYNAMIC import — evita acoplar/ciclar com financial-titles (item 5 do comando / D-Ω3F-4B).
    // B-SAN3-02 — também o 422 period_closed e a competência vêm do módulo de títulos (o MESMO erro de hoje).
    const [{ createDefaultFinancialTitleService }, { periodClosedError }, { deriveCompetencia }] = await Promise.all([
      import("../financial-titles/financial-title.service.js"),
      import("../financial-titles/financial-title.repository.js"),
      import("../financial-titles/financial-title.validators.js"),
    ]);
    const titleService = await createDefaultFinancialTitleService();

    // PASSO 0 (A8) — PRÉ-CHECK fora da unidade, SEM trava: fast-fail e a precedência PÚBLICA de hoje (409/422
    // ANTES de período e de due_date). NÃO decide dinheiro: a unidade re-decide tudo sobre dado travado (H11).
    const preview = await this.repository.listInvoiceableByWorkOrder(actor.tenantId, workOrder.id);
    if (preview.length === 0 || roundMoney(preview.reduce((sum, item) => sum + item.totalAmount, 0)) <= 0) {
      throw (await titleService.findActiveByWorkOrder(actor, workOrder.id, "receivable"))
        ? alreadyInvoicedError()
        : nothingToInvoiceError();
    }
    const dueDate = parseInvoiceDueDate(body.due_date ?? body.dueDate); // 400 invalid_due_date — mesma posição de hoje
    const now = new Date();
    const competencia = deriveCompetencia(now);

    const uow = await this.resolveUow();
    try {
      return await uow.run(actor.tenantId, async (ctx) => {
        // 1) advisory SHARED do período ANTES de qualquer row lock (regra do lar único, financial-period-lock.ts).
        await ctx.assertPeriodOpenShared(competencia, periodClosedError);
        // 2) SELECT … FOR UPDATE ORDER BY created_at, id dos itens faturáveis: a Σ vem do conjunto TRAVADO.
        const items = await ctx.workOrderItems.listInvoiceableByWorkOrderForUpdate(actor.tenantId, workOrder.id);
        const totalAmount = roundMoney(items.reduce((sum, item) => sum + item.totalAmount, 0));
        // 3) re-decisão sobre dado TRAVADO: a corrida pode ter esvaziado o conjunto.
        if (items.length === 0 || totalAmount <= 0) {
          throw (await ctx.titles.findActiveByWorkOrder(actor.tenantId, workOrder.id, "receivable"))
            ? alreadyInvoicedError()
            : nothingToInvoiceError();
        }
        // 4) original × complementar DEPOIS da trava (A1): quem perdeu a trava para outro faturamento vê aqui o
        //    original que o vencedor acabou de commitar e cobra só o delta, como COMPLEMENTAR.
        const original = await ctx.titles.findActiveByWorkOrder(actor.tenantId, workOrder.id, "receivable");
        const currency = items[0].currency;
        // 5) INSERT do título na MESMA transação.
        const title = await titleService.createForWorkOrderInUnit(ctx, actor, {
          workOrderId: workOrder.id,
          direction: "receivable",
          partyType: "customer",
          // Cliente do Título = snapshot da OS. Sem nome (OS antiga/rascunho) → rótulo neutro (NÃO 422).
          partyName: optionalString(workOrder.customerName) ?? "Cliente não informado",
          partyId: workOrder.customerId,
          amount: totalAmount, // Σ CONGELADA do conjunto travado — nunca relê tarifa.
          currency,
          issueDate: now, // competencia derivada disto no titleService.
          dueDate,
          parentTitleId: original?.id, // undefined → ORIGINAL; id → COMPLEMENTAR
        });
        // 6) carimbo (D-Ω4-C1) na MESMA transação: só toca linhas que esta unidade travou.
        const invoicedItemCount = await ctx.workOrderItems.markInvoiced({
          tenantId: actor.tenantId,
          workOrderId: workOrder.id,
          itemIds: items.map((item) => item.id),
          titleId: title.id,
          invoicedAt: now,
          updatedBy: actor.userId,
        });
        // 7) fail-closed: carimbado ≠ selecionado → a unidade inteira desfaz (inalcançável sob FOR UPDATE).
        if (invoicedItemCount !== items.length) {
          throw invoiceItemsChangedError();
        }
        return { title, totalAmount, currency, invoicedItemCount, parentTitleId: original?.id };
      });
    } catch (error) {
      throw translateUnitFailure(error);
    }
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

// B-SAN3-02 (emenda v2.1, B1) — o que sai da unidade. TRADUZ SÓ o erro que o repositório de títulos produz para o
// índice de originais (409 work_order_already_invoiced → 409 already_invoiced). Qualquer outro 409 nascido na
// unidade (invoice_items_changed, source_already_launched, …) e o 400 invalid_parent_title_reference PROPAGAM
// INTACTOS — o duck-type antigo por `statusCode === 409` (isConflictError) saiu daqui. Falha transiente por CÓDIGO,
// em dois níveis (precedente checklist/inventory) → 503 invoice_transient_conflict (a transação já desfez).
function translateUnitFailure(error: unknown): unknown {
  if (isWorkOrderAlreadyInvoicedConflict(error)) {
    return alreadyInvoicedError();
  }
  if (isTransientInvoiceFailure(error)) {
    return invoiceTransientConflictError();
  }
  return error;
}

function isWorkOrderAlreadyInvoicedConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { readonly statusCode?: unknown; readonly reason?: unknown };
  return candidate.statusCode === 409 && candidate.reason === "work_order_already_invoiced";
}

// Lista FECHADA de códigos que o TEMPO resolve (nunca engolir erro determinístico); detecta pelo CÓDIGO, nunca pela
// mensagem. P2034 conflito/impasse (wrapper Prisma) · P2028 transação interativa expirada · 40P01 deadlock ·
// 40001 serialization_failure · 55P03 lock_not_available.
const TRANSIENT_INVOICE_DB_CODES: ReadonlySet<string> = new Set(["P2034", "P2028", "40P01", "40001", "55P03"]);

function isTransientInvoiceFailure(error: unknown): boolean {
  return invoiceDatabaseErrorCodes(error).some((code) => TRANSIENT_INVOICE_DB_CODES.has(code));
}

// Códigos candidatos nas formas medidas no Prisma 7 + adapter-pg (precedente inventory-prisma.repository.ts):
// `code`; `meta.code` (P2010 de query crua, forma dos checklists); `meta.driverAdapterError.cause.code|originalCode`;
// `cause.code|originalCode` (DriverAdapterError de query ORM).
function invoiceDatabaseErrorCodes(error: unknown): readonly string[] {
  if (typeof error !== "object" || error === null) return [];
  const codes: string[] = [];
  const push = (value: unknown): void => {
    if (typeof value === "string" && value !== "") codes.push(value);
  };
  const record = error as {
    readonly code?: unknown;
    readonly meta?: { readonly code?: unknown; readonly driverAdapterError?: { readonly cause?: { readonly code?: unknown; readonly originalCode?: unknown } } };
    readonly cause?: { readonly code?: unknown; readonly originalCode?: unknown };
  };
  push(record.code);
  push(record.meta?.code);
  push(record.meta?.driverAdapterError?.cause?.code);
  push(record.meta?.driverAdapterError?.cause?.originalCode);
  push(record.cause?.code);
  push(record.cause?.originalCode);
  return codes;
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
export function createMemoryWorkOrderInvoicingService(resolveUow?: FinancialUowResolver): WorkOrderInvoicingService {
  return new WorkOrderInvoicingService(memoryRepository, resolveUow);
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
