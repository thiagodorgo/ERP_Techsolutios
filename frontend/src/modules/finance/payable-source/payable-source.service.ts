import { isMockMode } from "../../../config/env";
import { ApiError, apiRequest } from "../../../services/api/client";
import type {
  PayableLaunchBody,
  PayableSourceApiContext,
  PayableSourceData,
  PayableSourceModule,
  PayableTitleView,
} from "./payable-source.types";
import { emptyPayableSource } from "./payable-source.types";

// Ω4C PR-02 — service frontend do "Contas a Pagar por origem" (endpoints per-módulo, montados no router
// da fonte). Base /api/v1: `/:module/:id/payable` com :module ∈ {fuel-logs, maintenance-orders,
// insurance-policies} e :id = id da entidade-fonte. Permissão HERDA o RBAC financeiro
// (financial_titles:read/create/update) — o backend é a autoridade final; a UI só molda/esconde.
// D-007: mock → estado "não lançado" honesto (nada fabricado); 403 → forbidden; erro real → fallback.

// GET /:module/:id/payable → { data: TitleDTO | null }. data==null ⇒ fonte SEM título ativo (não lançado).
export async function getPayableForSource(
  context: PayableSourceApiContext,
  module: PayableSourceModule,
  id: string,
): Promise<PayableSourceData> {
  if (isMockMode()) return emptyPayableSource("mock"); // D-007: sem título fabricado em mock
  if (!id) return emptyPayableSource("api"); // registro ainda sem id (create) → sem consulta

  try {
    const raw = await apiRequest<unknown>(`/${module}/${encodeURIComponent(id)}/payable`, context);
    return { title: adaptPayableTitle(readData(raw)), source: "api", forbidden: false };
  } catch (err) {
    // 403 = gate RBAC financeiro → "acesso não permitido" (não é falha de sistema).
    if (err instanceof ApiError && err.status === 403) {
      return { ...emptyPayableSource("fallback"), forbidden: true };
    }
    return emptyPayableSource("fallback"); // erro real → "não lançado" honesto; NUNCA inventa título
  }
}

// POST /:module/:id/payable → 201 { data: TitleDTO }. 409 source_already_launched · 422 period_closed ·
// 400 validação · 404 posse. Erros propagam (ApiError) — o componente traduz para feedback inline.
export async function launchPayable(
  context: PayableSourceApiContext,
  module: PayableSourceModule,
  id: string,
  body: PayableLaunchBody,
): Promise<PayableTitleView | null> {
  const raw = await apiRequest<unknown>(`/${module}/${encodeURIComponent(id)}/payable`, {
    ...context,
    method: "POST",
    body: toRequestBody(body),
  });
  return adaptPayableTitle(readData(raw));
}

// DELETE /:module/:id/payable → 200 { data: TitleDTO } (soft-delete reversível; active=false). 404 se não
// há título ativo · 422 period_closed. O componente refaz o GET depois (o badge some por dado real).
export async function removePayable(
  context: PayableSourceApiContext,
  module: PayableSourceModule,
  id: string,
): Promise<PayableTitleView | null> {
  const raw = await apiRequest<unknown>(`/${module}/${encodeURIComponent(id)}/payable`, {
    ...context,
    method: "DELETE",
  });
  return adaptPayableTitle(readData(raw));
}

// Tradução camelCase → contrato snake_case do backend, com defaults de negócio (fornecedor / BRL).
function toRequestBody(body: PayableLaunchBody): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    party_type: body.partyType ?? "supplier",
    party_name: body.partyName,
    amount: body.amount,
    due_date: body.dueDate,
    currency: body.currency ?? "BRL",
  };
  if (body.issueDate) payload.issue_date = body.issueDate;
  if (body.partyId) payload.party_id = body.partyId;
  if (body.description) payload.description = body.description;
  return payload;
}

// Normalização DEFENSIVA do TitleDTO → PayableTitleView. NUNCA fabrica título (D-007): sem `id` string →
// null (a fonte fica "não lançada"). §2.8: só lê a projeção mínima — tenant_id sequer existe no DTO.
export function adaptPayableTitle(raw: unknown): PayableTitleView | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const id = typeof row.id === "string" && row.id.trim().length > 0 ? row.id : null;
  if (!id) return null; // sem identidade honesta → descartado

  const amountRaw = row.amount;
  const amount = typeof amountRaw === "number" && Number.isFinite(amountRaw) ? amountRaw : Number(amountRaw);

  return {
    id,
    status: typeof row.status === "string" && row.status.trim().length > 0 ? row.status : "open",
    amount: Number.isFinite(amount) ? amount : 0,
    currency: typeof row.currency === "string" && row.currency.trim().length > 0 ? row.currency : "BRL",
    dueDate: readDate(row.dueDate ?? row.due_date),
    active: row.active === false ? false : true,
  };
}

function readDate(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value : "";
}

// GET/POST/DELETE envelopam em { data }. Desembrulha de forma defensiva (data pode ser null).
function readData(response: unknown): unknown {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data?: unknown }).data;
  }
  return response;
}
