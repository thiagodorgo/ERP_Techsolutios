import { apiRequest } from "../../../services/api/client";
import { asMoney } from "./billing-ops.money";
import {
  BACKLOG_CATEGORIES,
  CHARGE_STATUSES,
  CREDENTIAL_KINDS,
  ENVIRONMENTS,
  INVOICE_STATUSES,
  PROVIDER_KINDS,
  QUEUE_KINDS,
  STATEMENT_STATUSES,
  type BacklogLine,
  type BillingProfileSummary,
  type Charge,
  type ChargeMethod,
  type ChargesView,
  type CredentialKind,
  type Credit,
  type Environment,
  type HistoryEntry,
  type Payment,
  type Provider,
  type ProviderCredential,
  type QueueLine,
  type QueueStatus,
  type Statement,
  type StatementDetail,
} from "./billing-ops.types";

// B-ASS-10c-OPERACAO — TODAS as requisições da tela de operação da cobrança (`/api/v1/platform/billing/*`, §3 do plano).
// Toda leitura passa `{ method: "GET" }` LITERAL ao `apiRequest` (a mesma régua do T5: chamada sem esse literal conta como
// escrita). O dinheiro é marcado AQUI, na entrada (`asMoney`): número, vazio e lixo viram `null` ("—"), nunca zero. As
// escritas mandam EXATAMENTE as chaves da §3.2 (R-CORPO); a de cobrança nunca leva valor (quem monta é o servidor).
// O `tenantId` vai no corpo das escritas e na consulta das leituras (o servidor exige: as tabelas têm FORCE RLS); a
// resposta nunca é lida para descobrir a organização (R-ORG).

type ApiResponse<T> = { readonly data: T };
type Json = Record<string, unknown>;

const BASE = "/platform/billing";
const enc = encodeURIComponent;

function readApi<T>(path: string): Promise<T> {
  return apiRequest<ApiResponse<T>>(path, { method: "GET" }).then((response) => response.data);
}

function write<T>(path: string, method: "POST" | "PUT", body: Json): Promise<T> {
  return apiRequest<ApiResponse<T>>(path, { method, body }).then((response) => response.data);
}

// ---- leituras -------------------------------------------------------------------------------------------------------
export function listStatementsFromApi(tenantId: string): Promise<Statement[]> {
  return readApi<unknown>(`${BASE}/statements?tenantId=${enc(tenantId)}`).then((data) => readArray(data).map(mapStatement).filter((item) => item.id));
}

export function getStatementFromApi(tenantId: string, statementId: string): Promise<StatementDetail> {
  return readApi<unknown>(`${BASE}/statements/${enc(statementId)}?tenantId=${enc(tenantId)}`).then((data) => mapStatementDetail(isRecord(data) ? data : {}));
}

export function getChargesFromApi(tenantId: string, statementId: string): Promise<ChargesView> {
  return readApi<unknown>(`${BASE}/statements/${enc(statementId)}/charges?tenantId=${enc(tenantId)}`).then((data) => {
    const record = isRecord(data) ? data : {};
    return { charges: readArray(record.charges).map(mapCharge), fullAmountChargeOpen: record.notice === "full_amount_charge_open" };
  });
}

export function listQueueFromApi(tenantId: string, status: QueueStatus): Promise<QueueLine[]> {
  return readApi<unknown>(`${BASE}/outbox?tenantId=${enc(tenantId)}&status=${status}`).then((data) => readArray(data).map((item) => mapQueueLine(item, status)).filter((item) => item.id));
}

export function listInvoiceBacklogFromApi(tenantId: string): Promise<BacklogLine[]> {
  return readApi<unknown>(`${BASE}/invoices/backlog?tenantId=${enc(tenantId)}`).then((data) =>
    readArray(data).flatMap((item) => {
      const category = readEnum(item.category, BACKLOG_CATEGORIES, null);
      const statementId = readString(item.statementId);
      return category && statementId ? [{ statementId, period: readString(item.period) ?? "", category }] : [];
    }),
  );
}

export function getBillingProfileFromApi(tenantId: string): Promise<BillingProfileSummary> {
  return readApi<unknown>(`${BASE}/tenants/${enc(tenantId)}/billing-profile`).then((data) => {
    const record = isRecord(data) ? data : {};
    // Só o que a tela usa: completo ou não, e QUAIS campos faltam (nunca documento, e-mail nem endereço).
    return { complete: record.complete === true, missing: readStringArray(record.missing) };
  });
}

export function listProvidersFromApi(): Promise<Provider[]> {
  return readApi<unknown>(`${BASE}/providers`).then((data) => readArray(data).map(mapProvider).filter((item): item is Provider => item !== null));
}

// ---- escritas (só `useBillingOpsActions` chama; cada uma é UMA requisição) -------------------------------------------
export function requestChargeFromApi(tenantId: string, statementId: string, input: { readonly method: ChargeMethod; readonly dueDate?: string }): Promise<unknown> {
  return write(`${BASE}/statements/${enc(statementId)}/charge`, "POST", { tenantId, method: input.method, ...(input.dueDate ? { dueDate: input.dueDate } : {}) });
}

export function cancelChargeFromApi(tenantId: string, statementId: string, reason: string): Promise<unknown> {
  return write(`${BASE}/statements/${enc(statementId)}/charge/cancel`, "POST", { tenantId, reason });
}

export function cancelUnknownChargeFromApi(tenantId: string, statementId: string, chargeId: string, reason: string): Promise<unknown> {
  return write(`${BASE}/statements/${enc(statementId)}/charge/cancel-unknown`, "POST", { tenantId, chargeId, reason });
}

export function confirmCancelledFromApi(tenantId: string, lineId: string, chargeId: string, reason: string): Promise<unknown> {
  return write(`${BASE}/outbox/${enc(lineId)}/confirm-cancelled`, "POST", { tenantId, chargeId, reason });
}

export type PaymentRecorded = { readonly fullAmountChargeOpen: boolean };
export function registerPaymentFromApi(tenantId: string, statementId: string, input: { readonly amount: string; readonly method?: string; readonly note?: string }): Promise<PaymentRecorded> {
  return write<unknown>(`${BASE}/statements/${enc(statementId)}/payments`, "POST", {
    tenantId,
    amount: input.amount,
    ...(input.method ? { method: input.method } : {}),
    ...(input.note ? { note: input.note } : {}),
  }).then((data) => ({ fullAmountChargeOpen: isRecord(data) && data.notice === "full_amount_charge_open" }));
}

export type PaymentReversed = { readonly invoiceCancelling: boolean };
export function reversePaymentFromApi(tenantId: string, statementId: string, paymentId: string, input: { readonly reason: string; readonly confirmInvoiceCancel?: true }): Promise<PaymentReversed> {
  return write<unknown>(`${BASE}/statements/${enc(statementId)}/payments/${enc(paymentId)}/reverse`, "POST", {
    tenantId,
    reason: input.reason,
    ...(input.confirmInvoiceCancel ? { confirmInvoiceCancel: true } : {}),
  }).then((data) => ({ invoiceCancelling: isRecord(data) && (data.invoice === "cancel_requested" || data.invoice === "cancel_in_progress") }));
}

export type InvoiceRequested = { readonly providerDisabled: boolean };
export function requestInvoiceFromApi(tenantId: string, statementId: string): Promise<InvoiceRequested> {
  return write<unknown>(`${BASE}/statements/${enc(statementId)}/invoice`, "POST", { tenantId }).then((data) => ({ providerDisabled: isRecord(data) && data.providerDisabled === true }));
}

export function resolveQueueLineFromApi(tenantId: string, lineId: string, reason: string): Promise<unknown> {
  return write(`${BASE}/outbox/${enc(lineId)}/resolve`, "POST", { tenantId, reason });
}

export type QueueRetried = { readonly dueDateOnlyIfCreated: boolean };
export function retryQueueLineFromApi(tenantId: string, lineId: string, dueDate?: string): Promise<QueueRetried> {
  return write<unknown>(`${BASE}/outbox/${enc(lineId)}/retry`, "POST", { tenantId, ...(dueDate ? { dueDate } : {}) }).then((data) => ({
    dueDateOnlyIfCreated: isRecord(data) && data.notice === "due_date_applies_only_if_created",
  }));
}

export function saveProviderSettingsFromApi(provider: string, input: { readonly environment: Environment; readonly settings: Readonly<Record<string, string | number | boolean>> }): Promise<unknown> {
  return write(`${BASE}/providers/${enc(provider)}`, "PUT", { environment: input.environment, settings: { ...input.settings } });
}

export type CredentialInput =
  | { readonly kind: "api_token"; readonly secret: string }
  | { readonly kind: "webhook_secret"; readonly secret: string }
  | { readonly kind: "certificate"; readonly pfxBase64: string; readonly password: string };

export function saveCredentialFromApi(provider: string, credential: CredentialInput): Promise<unknown> {
  // O corpo é montado aqui e não sobrevive à chamada: nada do segredo volta (a resposta é só o resumo mascarado).
  const body: Json = credential.kind === "certificate" ? { kind: credential.kind, pfxBase64: credential.pfxBase64, password: credential.password } : { kind: credential.kind, secret: credential.secret };
  return write(`${BASE}/providers/${enc(provider)}/credentials`, "PUT", body).then(() => undefined);
}

export type ConnectionTested = { readonly ok: boolean; readonly code: string | null; readonly at: string | null };
export function testConnectionFromApi(provider: string): Promise<ConnectionTested> {
  return write<unknown>(`${BASE}/providers/${enc(provider)}/test-connection`, "POST", {}).then((data) => {
    const record = isRecord(data) ? data : {};
    return { ok: record.ok === true, code: readString(record.code) ?? null, at: readString(record.at) ?? null };
  });
}

export type WebhookRegistered = { readonly registeredAt: string | null; readonly alreadyRegistered: boolean };
export function registerWebhookFromApi(provider: string): Promise<WebhookRegistered> {
  return write<unknown>(`${BASE}/providers/${enc(provider)}/register-webhook`, "POST", {}).then((data) => {
    const record = isRecord(data) ? data : {};
    return { registeredAt: readString(record.registeredAt) ?? null, alreadyRegistered: record.alreadyRegistered === true };
  });
}

export function enableProviderFromApi(provider: string, confirm: string): Promise<unknown> {
  return write(`${BASE}/providers/${enc(provider)}/enable`, "POST", { confirm });
}

/** A tela não lê campo nenhum da resposta do desligar (E9 do plano: contrato × código divergem no #608); ela relê. */
export function disableProviderFromApi(provider: string): Promise<unknown> {
  return write(`${BASE}/providers/${enc(provider)}/disable`, "POST", {}).then(() => undefined);
}

// ---- leitura das respostas ------------------------------------------------------------------------------------------
function mapHistory(value: unknown): HistoryEntry[] {
  return readArray(value).map((item) => ({ at: readString(item.at) ?? "", event: readString(item.event) ?? "", note: readString(item.note) ?? null }));
}

export function mapStatement(data: Json): Statement {
  return {
    id: readString(data.id) ?? "",
    period: readString(data.period) ?? "",
    status: readEnum(data.status, STATEMENT_STATUSES, "unknown"),
    chargeStatus: readEnum(data.chargeStatus, CHARGE_STATUSES, "unknown"),
    invoiceStatus: readEnum(data.invoiceStatus, INVOICE_STATUSES, "unknown"),
    baseAmount: asMoney(data.baseAmount),
    usersExtra: readInteger(data.usersExtra),
    usersExtraAmount: asMoney(data.usersExtraAmount),
    storageExtraAmount: asMoney(data.storageExtraAmount),
    trackingAmount: asMoney(data.trackingAmount),
    trackingBilledVehicles: readInteger(data.trackingBilledVehicles),
    adjustmentsAmount: asMoney(data.adjustmentsAmount),
    creditsAppliedAmount: asMoney(data.creditsAppliedAmount),
    totalAmount: asMoney(data.totalAmount),
    paidAmount: asMoney(data.paidAmount),
    balance: asMoney(data.balance),
    dueDate: readString(data.dueDate) ?? null,
    history: mapHistory(data.history),
  };
}

function mapPayment(data: Json): Payment {
  const reversedAmount = asMoney(data.reversedAmount);
  return {
    id: readString(data.id) ?? "",
    source: data.source === "manual" ? "manual" : "provider",
    amount: asMoney(data.amount),
    reversedAmount,
    reversed: reversedAmount !== null && /[1-9]/.test(reversedAmount),
    paidAt: readString(data.paidAt) ?? null,
    method: readString(data.method) ?? null,
    note: readString(data.note) ?? null,
  };
}

function mapCredit(data: Json): Credit {
  return { id: readString(data.id) ?? "", amount: asMoney(data.amount), reason: readString(data.reason) ?? "", status: readString(data.status) ?? "" };
}

export function mapStatementDetail(data: Json): StatementDetail {
  return { ...mapStatement(data), payments: readArray(data.payments).map(mapPayment).filter((item) => item.id), credits: readArray(data.credits).map(mapCredit).filter((item) => item.id) };
}

function mapCharge(data: Json): Charge {
  return {
    id: readString(data.id) ?? "",
    status: readString(data.status) ?? "",
    payUrl: readHttpUrl(data.payUrl),
    dueDate: readString(data.dueDate) ?? null,
    createdAt: readString(data.createdAt) ?? null,
    cancelledAt: readString(data.cancelledAt) ?? null,
  };
}

function mapQueueLine(data: Json, status: QueueStatus): QueueLine {
  return {
    id: readString(data.id) ?? "",
    statementId: readString(data.statementId) ?? "",
    kind: readEnum(data.kind, QUEUE_KINDS, "unknown"),
    // A linha é da situação que a leitura PEDIU (a rota filtra pela situação).
    status,
    attempts: readInteger(data.attempts),
    lastError: readString(data.lastError) ?? null,
    occurredAt: readString(data.occurredAt) ?? null,
    updatedAt: readString(data.updatedAt) ?? null,
  };
}

function mapProvider(data: Json): Provider | null {
  const provider = readString(data.provider);
  const kind = readEnum(data.kind, PROVIDER_KINDS, null);
  if (!provider || !kind) return null;
  const settings: Record<string, string | number | boolean> = {};
  if (isRecord(data.settings)) {
    for (const [key, value] of Object.entries(data.settings)) {
      if (typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) settings[key] = value;
    }
  }
  const credentials: ProviderCredential[] = readArray(data.credentials).flatMap((item) => {
    const credentialKind = readEnum<CredentialKind, null>(item.kind, CREDENTIAL_KINDS, null);
    return credentialKind ? [{ kind: credentialKind, last4: readString(item.last4) ?? "", createdAt: readString(item.createdAt) ?? null }] : [];
  });
  const lastTest = isRecord(data.lastTest)
    ? { at: readString(data.lastTest.at) ?? "", ok: typeof data.lastTest.ok === "boolean" ? data.lastTest.ok : null, environment: readEnum<Environment, null>(data.lastTest.environment, ENVIRONMENTS, null) }
    : null;
  return {
    provider,
    label: readString(data.label) ?? provider,
    kind,
    environment: readEnum(data.environment, ENVIRONMENTS, "sandbox"),
    enabled: data.enabled === true,
    configured: data.configured === true,
    settings,
    fiscalDataComplete: data.fiscalDataComplete === true,
    missing: readStringArray(data.missing),
    credentials,
    credentialsReadable: typeof data.credentialsReadable === "boolean" ? data.credentialsReadable : null,
    pendingHomologationCount: readStringArray(data.pendingHomologation).length,
    lastTest,
  };
}

// ---- utilidades de leitura ------------------------------------------------------------------------------------------
function readArray(value: unknown): Json[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
function readInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}
/** Só link `https:` (ou `http:` em sandbox local) vira link na tela; qualquer outro esquema é descartado. */
function readHttpUrl(value: unknown): string | null {
  const text = readString(value);
  return text && /^https?:\/\//i.test(text) ? text : null;
}
function readEnum<T extends string, F extends string | null>(value: unknown, allowed: readonly T[], fallback: F): T | F {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
