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
  ProviderDescription,
  RegisterWebhookInput,
  RegisterWebhookResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from "../payment-provider.port.js";
import { asaasStatusToOurs } from "./asaas.state-map.js";

export type AsaasSecretKind = "api_token" | "webhook_secret";
export type AsaasSecretReader = (kind: AsaasSecretKind) => Promise<string | null>;

type AsaasPayment = {
  readonly id: string;
  readonly status?: string;
  readonly invoiceUrl?: string;
  readonly bankSlipUrl?: string;
  readonly value?: number;
  readonly confirmedDate?: string;
  readonly paymentDate?: string;
  readonly externalReference?: string;
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

function headerOf(headers: VerifyWebhookInput["headers"], name: string): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
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
        path: `/payments/${payment.id}/pixQrCode`,
        headers,
      });
      pixCopyPaste = qr.payload;
    } else if (input.method === "boleto") {
      const field = await this.call<{ readonly identificationField?: string }>({
        op: "createCharge.identificationField",
        method: "GET",
        path: `/payments/${payment.id}/identificationField`,
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
    const payment = await this.call<AsaasPayment>({
      op: "getCharge",
      method: "GET",
      path: `/payments/${chargeId}`,
      headers: await this.authHeaders(),
    });
    const state = asaasStatusToOurs(payment.status ?? "");
    return {
      status: state.status,
      disputeWonPending: state.disputeWonPending,
      paidAt: payment.confirmedDate ?? payment.paymentDate,
      paidCents: state.status === "paid" && typeof payment.value === "number" ? toCents(payment.value) : undefined,
      raw: payment as unknown as Readonly<Record<string, unknown>>,
    };
  }

  async findChargeByExternalReference(ref: string): Promise<{ readonly chargeId: string; readonly status: ChargeStatus } | null> {
    const list = await this.call<{ readonly data?: readonly AsaasPayment[] }>({
      op: "findChargeByExternalReference",
      method: "GET",
      path: `/payments?externalReference=${encodeURIComponent(ref)}`,
      headers: await this.authHeaders(),
    });
    const found = list.data?.find((payment) => payment.externalReference === ref);
    if (!found) return null;
    return { chargeId: found.id, status: asaasStatusToOurs(found.status ?? "").status };
  }

  async cancelCharge(chargeId: string): Promise<{ readonly chargeId: string; readonly status: ChargeStatus }> {
    await this.call({
      op: "cancelCharge",
      method: "DELETE",
      path: `/payments/${chargeId}`,
      headers: await this.authHeaders(),
    });
    return { chargeId, status: "cancelled" };
  }

  async refund(chargeId: string, amountCents?: number): Promise<{ readonly chargeId: string; readonly status: ChargeStatus }> {
    const payment = await this.call<AsaasPayment>({
      op: "refund",
      method: "POST",
      path: `/payments/${chargeId}/refund`,
      headers: await this.authHeaders(),
      body: amountCents === undefined ? {} : { value: fromCents(amountCents) },
    });
    return { chargeId, status: asaasStatusToOurs(payment.status ?? "").status };
  }

  async registerWebhook(input: RegisterWebhookInput): Promise<RegisterWebhookResult> {
    const created = await this.call<{ readonly id: string }>({
      op: "registerWebhook",
      method: "POST",
      path: "/webhooks",
      headers: await this.authHeaders(),
      body: {
        url: input.url,
        authToken: input.secret,
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
    if (!token || token !== secret) return { ok: false };
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
      throw new ProviderValidationError(await this.sanitizedMessage(response));
    }
    if (response.status === 429) {
      throw new ProviderRateLimitedError(response.retryAfterMs ?? 0);
    }
    throw new ProviderUnavailableError(`The provider returned HTTP ${response.status}.`);
  }

  /** 400/422 do Asaas: `{ errors: [{ code, description }] }` → mensagem legível, sem eco de token. */
  private async sanitizedMessage(response: BillingHttpResponse): Promise<string> {
    try {
      const body = await response.json<AsaasErrorBody>();
      const parts = (body.errors ?? []).map((entry) => entry.description ?? entry.code ?? "").filter((entry) => entry !== "");
      if (parts.length > 0) return parts.join("; ");
    } catch {
      // corpo não-JSON: cai na mensagem genérica abaixo
    }
    return "The provider rejected the request.";
  }
}
