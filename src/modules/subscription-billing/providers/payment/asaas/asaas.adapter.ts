// B-ASS-06 · F2 — o adaptador Asaas (plano §4.6). Toda a rede passa pelo `BillingHttpClient`; o segredo
// só vem de `readSecret` (o cofre do B-ASS-05, via `readSecretForProvider`) e nunca entra em log, erro,
// query string ou corpo de resposta.
//
//  - headers: `access_token` + `User-Agent: erp-techsolutions/1.0`.
//  - `POST /customers` (localiza antes por `cpfCnpj`; `notificationDisabled: false`).
//  - `POST /payments`: `value` em reais, `externalReference` = statement_id; `invoiceUrl` → payUrl,
//    `bankSlipUrl` → boletoUrl; PIX/BOLETO buscam `pixQrCode`/`identificationField` em seguida.
//  - débito (R-PAY-7b): `billingType: UNDEFINED` (o pagador escolhe débito na invoiceUrl).
//  - `POST /webhooks`: `authToken` = segredo nosso, `sendType: SEQUENTIALLY`.

import { createHash, timingSafeEqual } from "node:crypto";

import {
  ProviderNotConfiguredError,
  ProviderRateLimitedError,
  ProviderUnavailableError,
  ProviderValidationError,
} from "../../http/billing-errors.js";
import type { BillingHttpClient, BillingHttpRequest, BillingHttpResponse } from "../../http/billing-http.client.js";
import { PROVIDER_CATALOG } from "../../provider.catalog.js";
import { fromCents, toCents } from "../payment-money.js";
import type {
  ChargeLookup,
  ChargeResult,
  ChargeStatus,
  CreateChargeInput,
  CustomerProfile,
  PaymentMethod,
  PaymentProviderPort,
  ExternalChargeCandidate,
  ProviderDescription,
  RegisterWebhookInput,
  RegisterWebhookResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "../payment-provider.port.js";
import { ProviderListIncompleteError } from "../payment-errors.js";
import { asaasStatusToOurs } from "./asaas.state-map.js";

export type AsaasSecretKind = "api_token" | "webhook_secret";
export type AsaasSecretReader = (kind: AsaasSecretKind) => Promise<string | null>;

type AsaasPayment = {
  readonly id: string;
  readonly status?: string;
  readonly deleted?: boolean;
  readonly invoiceUrl?: string;
  readonly bankSlipUrl?: string;
  readonly value?: number;
  readonly confirmedDate?: string;
  readonly paymentDate?: string;
  readonly clientPaymentDate?: string;
  readonly externalReference?: string;
  readonly dateCreated?: string;
  readonly dueDate?: string;
};

/** A página crua da listagem do Asaas v3 (`GET /payments`). */
type AsaasPaymentPage = {
  readonly data?: readonly AsaasPayment[];
  readonly hasMore?: boolean;
  readonly totalCount?: number;
};

type AsaasErrorBody = {
  readonly errors?: readonly { readonly code?: string; readonly description?: string }[];
};

const USER_AGENT = "erp-techsolutions/1.0";

function billingTypeFor(method: PaymentMethod): string {
  switch (method) {
    case "pix":
      return "PIX";
    case "credit_card":
      return "CREDIT_CARD";
    case "boleto":
      return "BOLETO";
    case "debit_card":
      // R-PAY-7b: não há DEBIT_CARD por API; o pagador escolhe débito na invoiceUrl.
      return "UNDEFINED";
  }
}

/** Todo id de recurso no caminho é codificado; id com `/`, `..` ou `?` é recusado ANTES da rede (A8). */
function pathId(id: string): string {
  if (!id || id.includes("/") || id.includes("..") || id.includes("?")) {
    throw new ProviderValidationError("Invalid provider resource id.");
  }
  return encodeURIComponent(id);
}

/**
 * D-2.1 (Emenda 2.1 do B-ASS-08c1a) — SÓ para a lista por referência: a cobrança removida no Asaas e sem nenhuma data de
 * pagamento não recebe dinheiro, e é a única que deixa de bloquear uma criação nova. Removida COM data de pagamento
 * recebeu dinheiro: segue o mapa e bloqueia. O webhook, os polls e o `getCharge` continuam lendo `DELETED` como `unknown`.
 */
function listedRemovedWithoutPayment(payment: AsaasPayment): boolean {
  const removed = (payment.deleted === true || payment.status === "DELETED") && !payment.paymentDate && !payment.confirmedDate && !payment.clientPaymentDate; // [LIST-REMOVED]
  return removed;
}

function headerOf(headers: VerifyWebhookInput["headers"], name: string): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export class AsaasPaymentAdapter implements PaymentProviderPort {
  constructor(
    private readonly client: BillingHttpClient,
    private readonly readSecret: AsaasSecretReader,
  ) {}

  async ensureCustomer(profile: CustomerProfile): Promise<{ readonly customerId: string }> {
    const headers = await this.authHeaders();
    const search = await this.call<{ readonly data?: readonly { readonly id: string }[] }>({
      op: "ensureCustomer.search",
      method: "GET",
      path: `/customers?cpfCnpj=${encodeURIComponent(profile.document)}`,
      headers,
    });
    if (search.data && search.data.length > 0) {
      return { customerId: search.data[0]!.id };
    }
    const created = await this.call<{ readonly id: string }>({
      op: "ensureCustomer.create",
      method: "POST",
      path: "/customers",
      headers,
      body: {
        name: profile.name,
        cpfCnpj: profile.document,
        email: profile.email,
        phone: profile.phone,
        notificationDisabled: false,
      },
    });
    return { customerId: created.id };
  }

  async createCharge(input: CreateChargeInput): Promise<ChargeResult> {
    const headers = await this.authHeaders();
    const payment = await this.call<AsaasPayment>({
      op: "createCharge",
      method: "POST",
      path: "/payments",
      headers,
      body: {
        customer: input.customerId,
        billingType: billingTypeFor(input.method),
        value: fromCents(input.amountCents),
        dueDate: input.dueDate,
        description: input.description ?? "",
        externalReference: input.externalReference,
      },
      cardTimeout: input.method === "credit_card",
    });
    let pixCopyPaste: string | undefined;
    let boletoLine: string | undefined;
    if (input.method === "pix") {
      const qr = await this.call<{ readonly payload?: string }>({
        op: "createCharge.pixQrCode",
        method: "GET",
        path: `/payments/${pathId(payment.id)}/pixQrCode`,
        headers,
      });
      pixCopyPaste = qr.payload;
    } else if (input.method === "boleto") {
      const field = await this.call<{ readonly identificationField?: string }>({
        op: "createCharge.identificationField",
        method: "GET",
        path: `/payments/${pathId(payment.id)}/identificationField`,
        headers,
      });
      boletoLine = field.identificationField;
    }
    return {
      chargeId: payment.id,
      status: asaasStatusToOurs(payment.status ?? "").status,
      payUrl: payment.invoiceUrl,
      pixCopyPaste,
      boletoLine,
      boletoUrl: payment.bankSlipUrl,
    };
  }

  async getCharge(chargeId: string): Promise<ChargeLookup> {
    const safeId = pathId(chargeId);
    const payment = await this.call<AsaasPayment>({
      op: "getCharge",
      method: "GET",
      path: `/payments/${safeId}`,
      headers: await this.authHeaders(),
    });
    const state = asaasStatusToOurs(payment.status ?? "");
    return {
      status: state.status,
      payUrl: payment.invoiceUrl,
      boletoUrl: payment.bankSlipUrl,
      dueDate: payment.dueDate,
      disputeWonPending: state.disputeWonPending,
      paidAt: payment.confirmedDate ?? payment.paymentDate,
      paidCents: state.status === "paid" && typeof payment.value === "number" ? toCents(payment.value) : undefined,
      raw: payment as unknown as Readonly<Record<string, unknown>>,
    };
  }

  /**
   * B-ASS-08c1a — toda cobrança do Asaas para a referência, com valor, dia e estado (a régua de adoção é do despacho).
   *  - D-2′: a lista só vale com prova POSITIVA de que está completa, lida na página CRUA (antes do filtro local):
   *    `hasMore === false` e `totalCount` inteiro igual ao tamanho de `data`. Sem a prova → `provider_list_incomplete`.
   *  - D-2.1: a cobrança REMOVIDA no Asaas (`deleted: true` ou `status: "DELETED"`) e SEM nenhuma data de pagamento vira
   *    `cancelled` só aqui, na lista; com pagamento, segue o mapa (`unknown`) e bloqueia. O `asaas.state-map.ts` não muda.
   */
  async listChargesByExternalReference(ref: string): Promise<readonly ExternalChargeCandidate[]> {
    const page = await this.call<AsaasPaymentPage>({
      op: "listChargesByExternalReference",
      method: "GET",
      path: `/payments?externalReference=${encodeURIComponent(ref)}&offset=0&limit=100`,
      headers: await this.authHeaders(),
    });
    if (!(page.hasMore === false && Array.isArray(page.data) && Number.isSafeInteger(page.totalCount) && page.totalCount === page.data.length)) throw new ProviderListIncompleteError(); // [LIST-COMPLETE]
    return (page.data ?? [])
      .filter((payment) => payment.externalReference === ref)
      .map((payment) => ({
        chargeId: payment.id,
        status: listedRemovedWithoutPayment(payment) ? "cancelled" : asaasStatusToOurs(payment.status ?? "").status,
        amountCents: typeof payment.value === "number" ? toCents(payment.value) : Number.NaN,
        createdAt: payment.dateCreated ?? "",
      }));
  }

  async cancelCharge(chargeId: string): Promise<{ readonly chargeId: string; readonly status: ChargeStatus }> {
    const safeId = pathId(chargeId);
    await this.call({
      op: "cancelCharge",
      method: "DELETE",
      path: `/payments/${safeId}`,
      headers: await this.authHeaders(),
    });
    return { chargeId, status: "cancelled" };
  }

  async refund(chargeId: string, amountCents?: number): Promise<{ readonly chargeId: string; readonly status: ChargeStatus }> {
    const safeId = pathId(chargeId);
    const payment = await this.call<AsaasPayment>({
      op: "refund",
      method: "POST",
      path: `/payments/${safeId}/refund`,
      headers: await this.authHeaders(),
      body: amountCents === undefined ? {} : { value: fromCents(amountCents) },
    });
    return { chargeId, status: asaasStatusToOurs(payment.status ?? "").status };
  }

  async registerWebhook(input: RegisterWebhookInput): Promise<RegisterWebhookResult> {
    const secret = await this.readSecret("webhook_secret");
    if (!secret) throw new ProviderNotConfiguredError("asaas");
    const created = await this.call<{ readonly id: string }>({
      op: "registerWebhook",
      method: "POST",
      path: "/webhooks",
      headers: await this.authHeaders(),
      body: {
        url: input.url,
        authToken: secret,
        events: input.events,
        sendType: "SEQUENTIALLY",
      },
    });
    return { externalId: created.id };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const secret = await this.readSecret("webhook_secret");
    if (!secret) return { ok: false };
    const token = headerOf(input.headers, "asaas-access-token");
    if (!token || !timingSafeEqual(sha256(token), sha256(secret))) return { ok: false };
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(input.rawBody) as Record<string, unknown>;
    } catch {
      return { ok: false };
    }
    const payment = (body.payment ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      eventId: typeof body.id === "string" ? body.id : undefined,
      chargeId: typeof payment.id === "string" ? payment.id : undefined,
      externalReference: typeof payment.externalReference === "string" ? payment.externalReference : undefined,
      kind: typeof body.event === "string" ? body.event : undefined,
    };
  }

  supportedMethods(): readonly PaymentMethod[] {
    return ["pix", "credit_card", "debit_card", "boleto"];
  }

  describe(): ProviderDescription {
    return {
      provider: "asaas",
      supportedMethods: this.supportedMethods(),
      pendingHomologation: PROVIDER_CATALOG.asaas.pendingHomologation,
      webhookRegistration: "api",
    };
  }

  private async authHeaders(): Promise<Readonly<Record<string, string>>> {
    const token = await this.readSecret("api_token");
    if (!token) throw new ProviderNotConfiguredError("asaas");
    return { access_token: token, "User-Agent": USER_AGENT };
  }

  private async call<T>(request: BillingHttpRequest): Promise<T> {
    const response = await this.client.request(request);
    if (response.status >= 200 && response.status < 300) {
      return response.json<T>();
    }
    if (response.status === 400 || response.status === 422) {
      const token = await this.readSecret("api_token");
      throw new ProviderValidationError(await this.sanitizedMessage(response, token ? [token] : []));
    }
    if (response.status === 429) {
      throw new ProviderRateLimitedError(response.retryAfterMs ?? 0);
    }
    throw new ProviderUnavailableError(`The provider returned HTTP ${response.status}.`);
  }

  /** 400/422 do Asaas: `{ errors: [{ code, description }] }` → mensagem legível, com o segredo redigido. */
  private async sanitizedMessage(response: BillingHttpResponse, secrets: readonly string[]): Promise<string> {
    let message = "The provider rejected the request.";
    try {
      const body = await response.json<AsaasErrorBody>();
      const parts = (body.errors ?? []).map((entry) => entry.description ?? entry.code ?? "").filter((entry) => entry !== "");
      if (parts.length > 0) message = parts.join("; ");
    } catch {
      // corpo não-JSON: fica na mensagem genérica
    }
    for (const secret of secrets) {
      if (secret !== "") message = message.split(secret).join("[redacted]");
    }
    return message;
  }
}
