import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import type {
  WorkOrderFinancialApiContext,
  WorkOrderFinancialItem,
  WorkOrderFinancialList,
  WorkOrderFinancialManualInput,
  WorkOrderFinancialPatchInput,
  WorkOrderFinancialSource,
  WorkOrderInvoiceBody,
  WorkOrderInvoiceResult,
  WorkOrderInvoiceTitle,
  WorkOrderInvoiceTitleStatus,
} from "./financials.types";

// O formatador de dinheiro mora no modelo puro do faturamento (os testes da raiz o importam sem o cliente HTTP); este
// serviço o reexporta para quem já o importava daqui.
export { formatMoney } from "./work-order-invoice.model";

// Ω3F-3b — camada de dados da aba Financeiro. Contrato:
//   GET/POST  /work-orders/:id/financial-items
//   PATCH/DELETE /work-orders/:id/financial-items/:itemId (delete = lógico → 204).
//   B-SAN3-25: POST /work-orders/:id/invoice (fatura) e GET /financial-titles/:id (o quadro "Títulos desta OS").
// Leitura DEFENSIVA (o backend pode evoluir campos): cada linha é normalizada; o TOTAL vem do
// agregado do backend — o front nunca soma.

function basePath(workOrderId: string): string {
  return `/work-orders/${encodeURIComponent(workOrderId)}/financial-items`;
}

export async function listWorkOrderFinancials(
  context: WorkOrderFinancialApiContext,
  workOrderId: string,
): Promise<WorkOrderFinancialList> {
  if (isMockMode()) return { items: [], totalAmount: 0, currency: "BRL" };

  const response = await apiRequest<unknown>(basePath(workOrderId), context);
  return adaptList(response);
}

export async function createManualFinancialItem(
  context: WorkOrderFinancialApiContext,
  workOrderId: string,
  input: WorkOrderFinancialManualInput,
): Promise<WorkOrderFinancialItem> {
  const response = await apiRequest<unknown>(basePath(workOrderId), {
    ...context,
    method: "POST",
    body: {
      source: "manual",
      description: input.description.trim(),
      unit_amount: input.unitAmount,
      quantity: input.quantity ?? 1,
      notes: input.notes?.trim() || undefined,
    },
  });
  return adaptItemOrThrow(readData(response));
}

export async function createTariffFinancialItem(
  context: WorkOrderFinancialApiContext,
  workOrderId: string,
  input: { readonly serviceCatalogId: string; readonly quantity?: number; readonly notes?: string },
): Promise<WorkOrderFinancialItem> {
  const response = await apiRequest<unknown>(basePath(workOrderId), {
    ...context,
    method: "POST",
    body: {
      source: "tariff",
      service_catalog_id: input.serviceCatalogId,
      quantity: input.quantity ?? 1,
      notes: input.notes?.trim() || undefined,
    },
  });
  return adaptItemOrThrow(readData(response));
}

export async function patchFinancialItem(
  context: WorkOrderFinancialApiContext,
  workOrderId: string,
  itemId: string,
  input: WorkOrderFinancialPatchInput,
): Promise<WorkOrderFinancialItem> {
  const body: Record<string, unknown> = {};
  if (input.unitAmount !== undefined) body.unit_amount = input.unitAmount;
  if (input.quantity !== undefined) body.quantity = input.quantity;
  if (input.notes !== undefined) body.notes = input.notes.trim();
  if (input.description !== undefined) body.description = input.description.trim();

  const response = await apiRequest<unknown>(`${basePath(workOrderId)}/${encodeURIComponent(itemId)}`, {
    ...context,
    method: "PATCH",
    body,
  });
  return adaptItemOrThrow(readData(response));
}

export async function deleteFinancialItem(
  context: WorkOrderFinancialApiContext,
  workOrderId: string,
  itemId: string,
): Promise<void> {
  await apiRequest<unknown>(`${basePath(workOrderId)}/${encodeURIComponent(itemId)}`, {
    ...context,
    method: "DELETE",
  });
}

// B-SAN3-25 — a ÚNICA função da web que monta a rota de faturamento da OS ([G-INVOICE], plano v2 §4.3 A7); só o diálogo
// a chama, pelo submetedor com trava de envio duplo. Sem ramo de demonstração: o erro propaga com `status` e `reason`
// (`ApiError`), e quem decide a frase é `invoiceOutcome` no modelo.
export async function invoiceWorkOrder(
  context: WorkOrderFinancialApiContext,
  workOrderId: string,
  body: WorkOrderInvoiceBody,
): Promise<WorkOrderInvoiceResult> {
  const response = await apiRequest<unknown>(`/work-orders/${encodeURIComponent(workOrderId)}/invoice`, {
    ...context,
    method: "POST",
    body,
  });
  return adaptInvoiceResultOrThrow(response);
}

// B-SAN3-25 — um título da OS para o quadro "Títulos desta OS" (`financial_titles:read`). O 404 propaga: a aba mostra
// "Título removido". Não há filtro por OS na lista de títulos (`P-SAN3-25-TITULOS-POR-OS-SEM-FILTRO`).
export async function getWorkOrderInvoiceTitle(
  context: WorkOrderFinancialApiContext,
  titleId: string,
): Promise<WorkOrderInvoiceTitle> {
  const response = await apiRequest<unknown>(`/financial-titles/${encodeURIComponent(titleId)}`, context);
  return adaptInvoiceTitleOrThrow(readData(response));
}

// ---------- adapters (leitura defensiva) ----------

function adaptList(response: unknown): WorkOrderFinancialList {
  const record = asRecord(response);
  const rawItems = Array.isArray(record.items) ? record.items : Array.isArray(record.data) ? record.data : [];
  const items = rawItems.map((item) => adaptItem(item)).filter((item): item is WorkOrderFinancialItem => item !== null);
  return {
    items,
    // O total vem do backend; nunca somado no front. Fallback 0 quando ausente.
    totalAmount: readNumber(record.totalAmount ?? record.total_amount) ?? 0,
    currency: readString(record.currency) ?? items[0]?.currency ?? "BRL",
  };
}

function adaptItem(value: unknown): WorkOrderFinancialItem | null {
  const item = asRecord(value);
  const id = readString(item.id);
  const workOrderId = readString(item.workOrderId ?? item.work_order_id);
  if (!id || !workOrderId) return null;
  const source: WorkOrderFinancialSource = item.source === "tariff" ? "tariff" : "manual";
  return {
    id,
    workOrderId,
    tariffId: readString(item.tariffId ?? item.tariff_id) ?? null,
    priceTableId: readString(item.priceTableId ?? item.price_table_id) ?? null,
    description: readString(item.description) ?? "—",
    quantity: readNumber(item.quantity) ?? 0,
    unitAmount: readNumber(item.unitAmount ?? item.unit_amount) ?? 0,
    totalAmount: readNumber(item.totalAmount ?? item.total_amount) ?? 0,
    currency: readString(item.currency) ?? "BRL",
    source,
    notes: readString(item.notes) ?? null,
    // B-SAN3-25 — faturado se o servidor disser `invoiced: true` OU trouxer a data do carimbo (fail-closed: na dúvida, o
    // item não ganha editar nem excluir, que o servidor recusaria com 422 item_invoiced).
    invoiced: item.invoiced === true || readString(item.invoicedAt ?? item.invoiced_at) !== undefined,
    invoicedAt: readString(item.invoicedAt ?? item.invoiced_at) ?? null,
    titleId: readString(item.titleId ?? item.title_id) ?? null,
    createdAt: readString(item.createdAt ?? item.created_at) ?? "",
    updatedAt: readString(item.updatedAt ?? item.updated_at) ?? "",
  };
}

// Resposta de mutação (POST/PATCH): o backend sempre devolve um item válido; shape inesperado é erro.
function adaptItemOrThrow(value: unknown): WorkOrderFinancialItem {
  const item = adaptItem(value);
  if (!item) throw new Error("invalid_financial_item_response");
  return item;
}

const TITLE_STATUSES: ReadonlySet<string> = new Set<WorkOrderInvoiceTitleStatus>(["open", "scheduled", "partially_paid", "paid", "in_dispute", "cancelled"]);

// O título do `toFinancialTitleDto`. Sem id ou sem valor é resposta inesperada: erro (a tela não inventa título).
function adaptInvoiceTitleOrThrow(value: unknown): WorkOrderInvoiceTitle {
  const title = asRecord(value);
  const id = readString(title.id);
  const amount = readNumber(title.amount);
  if (!id || amount === undefined) throw new Error("invalid_financial_title_response");
  const status = readString(title.status);
  return {
    id,
    amount,
    currency: readString(title.currency) ?? "BRL",
    status: status && TITLE_STATUSES.has(status) ? (status as WorkOrderInvoiceTitleStatus) : null,
    dueDate: readString(title.dueDate ?? title.due_date) ?? null,
    parentTitleId: readString(title.parentTitleId ?? title.parent_title_id) ?? null,
    overdue: title.overdue === true,
  };
}

// O 201 do faturamento: `{ data: título, invoicedTotal, currency, invoicedItemCount }`. Forma inesperada é erro, e o erro
// vira a frase genérica (que não afirma que nada foi faturado) com releitura da lista.
function adaptInvoiceResultOrThrow(response: unknown): WorkOrderInvoiceResult {
  const record = asRecord(response);
  const invoicedTotal = readNumber(record.invoicedTotal ?? record.invoiced_total);
  const invoicedItemCount = readNumber(record.invoicedItemCount ?? record.invoiced_item_count);
  if (invoicedTotal === undefined || invoicedItemCount === undefined) throw new Error("invalid_invoice_response");
  const title = adaptInvoiceTitleOrThrow(record.data);
  return {
    title,
    invoicedTotal,
    currency: readString(record.currency) ?? title.currency,
    invoicedItemCount,
  };
}

function readData(response: unknown): unknown {
  const record = asRecord(response);
  return "data" in record ? record.data : response;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}
