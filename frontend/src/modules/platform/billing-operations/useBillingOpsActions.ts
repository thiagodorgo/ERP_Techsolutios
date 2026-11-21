import { useMemo } from "react";

import { ApiError } from "../../../services/api/client";
import type { BillingOpsAccess } from "./billing-ops.access";
import type { ConnectionTested, CredentialInput, InvoiceRequested, PaymentRecorded, PaymentReversed, QueueRetried, WebhookRegistered } from "./billing-ops.adapter";
import {
  cancelCharge,
  cancelUnknownCharge,
  confirmCancelled,
  disableProvider,
  enableProvider,
  registerPayment as registerPaymentRequest,
  registerWebhook,
  requestCharge as requestChargeRequest,
  requestInvoice,
  resolveQueueLine as resolveQueueLineRequest,
  retryQueueLine,
  reversePayment,
  saveCredential,
  saveProviderSettings,
  testConnection,
} from "./billing-ops.service";
import type { ChargeMethod, Environment, QueueLine } from "./billing-ops.types";

// B-ASS-10c-OPERACAO — as escritas da tela (§3.2 do plano). Cada função confere a PRÓPRIA permissão antes de chamar
// (R-PERM: sem a chave, nenhuma requisição) e faz UMA requisição (R-UMA). O `tenantId` do corpo é SEMPRE o da organização
// da linha aberta (R-ORG), que a janela passa. O resultado traz o motivo do servidor (`reason`) para a janela escolher o
// texto da lista fechada; nada aqui "prevê" valor: depois do sucesso, a tela relê (R-RELE).

export type ActionResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string; readonly failed?: readonly string[] };

/** Sem a permissão, a ação nem chama o servidor. */
export const FORBIDDEN = { ok: false, reason: "sem_permissao" } as const;

/** A lista `details.failed[]` da recusa de Ligar, se o erro a trouxer (o cliente de API de hoje não a repassa; ver diário). */
function failedListOf(error: ApiError): readonly string[] | undefined {
  const details = (error as ApiError & { readonly details?: unknown }).details;
  if (typeof details !== "object" || details === null) return undefined;
  const failed = (details as { readonly failed?: unknown }).failed;
  return Array.isArray(failed) ? failed.filter((item): item is string => typeof item === "string") : undefined;
}

async function attempt<T>(call: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    if (error instanceof ApiError) {
      const failed = failedListOf(error);
      return { ok: false, reason: error.reason ?? `http_${error.status}`, ...(failed ? { failed } : {}) };
    }
    return { ok: false, reason: "falha_de_rede" };
  }
}

/** A linha que a janela operou: a organização dela é a que vai no corpo. */
export type StatementRef = { readonly tenantId: string; readonly statementId: string };

export type BillingOpsActions = {
  readonly requestCharge: (ref: StatementRef, input: { readonly method: ChargeMethod; readonly dueDate?: string }) => Promise<ActionResult<unknown>>;
  readonly cancelCharge: (ref: StatementRef, reason: string) => Promise<ActionResult<unknown>>;
  readonly cancelUnknownCharge: (ref: StatementRef, chargeId: string, reason: string) => Promise<ActionResult<unknown>>;
  readonly confirmCancelled: (line: QueueLine & { readonly tenantId: string }, chargeId: string, reason: string) => Promise<ActionResult<unknown>>;
  readonly registerPayment: (ref: StatementRef, input: { readonly amount: string; readonly method?: string; readonly note?: string }) => Promise<ActionResult<PaymentRecorded>>;
  readonly reversePayment: (ref: StatementRef, paymentId: string, input: { readonly reason: string; readonly confirmInvoiceCancel?: true }) => Promise<ActionResult<PaymentReversed>>;
  readonly requestInvoice: (ref: StatementRef) => Promise<ActionResult<InvoiceRequested>>;
  readonly resolveQueueLine: (line: QueueLine & { readonly tenantId: string }, reason: string) => Promise<ActionResult<unknown>>;
  readonly retryQueueLine: (line: QueueLine & { readonly tenantId: string }, dueDate?: string) => Promise<ActionResult<QueueRetried>>;
  readonly saveProviderSettings: (provider: string, input: { readonly environment: Environment; readonly settings: Readonly<Record<string, string | number | boolean>> }) => Promise<ActionResult<unknown>>;
  readonly saveCredential: (provider: string, credential: CredentialInput) => Promise<ActionResult<unknown>>;
  readonly testConnection: (provider: string) => Promise<ActionResult<ConnectionTested>>;
  readonly registerWebhook: (provider: string) => Promise<ActionResult<WebhookRegistered>>;
  readonly enableProvider: (provider: string, confirm: string) => Promise<ActionResult<unknown>>;
  readonly disableProvider: (provider: string) => Promise<ActionResult<unknown>>;
};

export function billingOpsActions(access: BillingOpsAccess): BillingOpsActions {
  return {
    requestCharge: async (ref, input) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => requestChargeRequest(ref.tenantId, ref.statementId, input));
    },
    cancelCharge: async (ref, reason) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => cancelCharge(ref.tenantId, ref.statementId, reason));
    },
    cancelUnknownCharge: async (ref, chargeId, reason) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => cancelUnknownCharge(ref.tenantId, ref.statementId, chargeId, reason));
    },
    confirmCancelled: async (line, chargeId, reason) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => confirmCancelled(line.tenantId, line.id, chargeId, reason));
    },
    registerPayment: async (ref, input) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => registerPaymentRequest(ref.tenantId, ref.statementId, input));
    },
    reversePayment: async (ref, paymentId, input) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => reversePayment(ref.tenantId, ref.statementId, paymentId, input));
    },
    requestInvoice: async (ref) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => requestInvoice(ref.tenantId, ref.statementId));
    },
    resolveQueueLine: async (line, reason) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => resolveQueueLineRequest(line.tenantId, line.id, reason));
    },
    retryQueueLine: async (line, dueDate) => {
      if (!access.settle) return FORBIDDEN;
      return attempt(() => retryQueueLine(line.tenantId, line.id, dueDate));
    },
    saveProviderSettings: async (provider, input) => (access.manageProviders ? attempt(() => saveProviderSettings(provider, input)) : FORBIDDEN),
    saveCredential: async (provider, credential) => (access.manageProviders ? attempt(() => saveCredential(provider, credential)) : FORBIDDEN),
    testConnection: async (provider) => (access.manageProviders ? attempt(() => testConnection(provider)) : FORBIDDEN),
    registerWebhook: async (provider) => (access.manageProviders ? attempt(() => registerWebhook(provider)) : FORBIDDEN),
    enableProvider: async (provider, confirm) => (access.manageProviders ? attempt(() => enableProvider(provider, confirm)) : FORBIDDEN),
    disableProvider: async (provider) => (access.manageProviders ? attempt(() => disableProvider(provider)) : FORBIDDEN),
  };
}

export function useBillingOpsActions(access: BillingOpsAccess): BillingOpsActions {
  return useMemo(() => billingOpsActions(access), [access.settle, access.manageProviders]);
}
