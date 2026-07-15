import { isMockMode } from "../../config/env";
import { apiRequest } from "../../services/api/client";
import type {
  WorkOrderFinancialApiContext,
  WorkOrderFinancialItem,
  WorkOrderFinancialList,
  WorkOrderFinancialManualInput,
  WorkOrderFinancialPatchInput,
  WorkOrderFinancialSource,
} from "./financials.types";

// Ω3F-3b — camada de dados da aba Financeiro. Contrato:
//   GET/POST  /work-orders/:id/financial-items
//   PATCH/DELETE /work-orders/:id/financial-items/:itemId (delete = lógico → 204).
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

// Dinheiro SEMPRE com a moeda do item (não assume BRL). Fallback gracioso para valor cru.
export function formatMoney(value: number, currency: string): string {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL" }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
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
