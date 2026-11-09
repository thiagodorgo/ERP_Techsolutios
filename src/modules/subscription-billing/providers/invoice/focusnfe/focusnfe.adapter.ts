import { createHash, timingSafeEqual } from "node:crypto";

import {
  ProviderNotConfiguredError,
  ProviderRateLimitedError,
  ProviderUnavailableError,
  ProviderValidationError,
} from "../../http/billing-errors.js";
import type { BillingHttpClient, BillingHttpRequest, BillingHttpResponse } from "../../http/billing-http.client.js";
import { PROVIDER_CATALOG } from "../../provider.catalog.js";
import { ibsCbsPayloadFor } from "../../tax/ibs-cbs.rules.js";
import { validateTaxProfileBeforeNetwork } from "../../tax/nfse-route.rules.js";
import { InvoiceProviderError } from "../invoice-errors.js";
import type {
  InvoiceLookup,
  InvoiceProviderPort,
  IssueInvoiceInput,
  IssueInvoiceResult,
  RegisterInvoiceWebhookInput,
  VerifyInvoiceWebhookInput,
  VerifyInvoiceWebhookResult,
} from "../invoice-provider.port.js";

export type FocusNfeSecretKind = "api_token" | "webhook_secret" | "certificate";
export type FocusNfeSecretReader = (kind: FocusNfeSecretKind) => Promise<string | null>;

type FocusBody = Readonly<Record<string, unknown>> & {
  readonly id?: string;
  readonly status?: string;
  readonly numero?: string;
  readonly codigo_verificacao?: string;
  readonly url_danfse?: string;
  readonly url_xml?: string;
  readonly ref?: string;
  readonly erros?: readonly { readonly mensagem?: string }[];
  readonly mensagem?: string;
};

const FOCUS_REQUIRED_FIELDS = [
  "regimeTributario",
  "municipioIbge",
  "cTribNac",
  "tributacaoIss",
  "regimeEspecialTributacao",
  "codigoOpcaoSimplesNacional",
  "serieDps",
] as const;

function basicToken(token: string): string {
  return `Basic ${Buffer.from(`${token}:`, "utf8").toString("base64")}`;
}

function hash(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function headerOf(headers: VerifyInvoiceWebhookInput["headers"], name: string): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function moneyFromCents(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new ProviderValidationError("Invalid invoice amount.");
  return value / 100;
}

function missingFocusFields(input: IssueInvoiceInput): string[] {
  const values: Readonly<Record<string, unknown>> = input.taxProfile as Readonly<Record<string, unknown>>;
  return FOCUS_REQUIRED_FIELDS.filter((field) => values[field] === undefined || values[field] === null || values[field] === "");
}

function safeRef(ref: string): string {
  if (!ref || ref.includes("/") || ref.includes("..") || ref.includes("?")) throw new ProviderValidationError("Invalid invoice reference.");
  return encodeURIComponent(ref);
}

function lookupFromFocus(body: FocusBody): InvoiceLookup {
  switch (body.status) {
    case "processando_autorizacao":
    case "processando_cancelamento":
      return { status: "processing" };
    case "autorizado":
      return {
        status: "authorized",
        number: body.numero,
        verificationCode: body.codigo_verificacao,
        pdfUrl: body.url_danfse,
        xmlUrl: body.url_xml,
      };
    case "erro_autorizacao":
      return { status: "rejected", errors: body.erros?.map((item) => item.mensagem ?? "provider_error") };
    case "cancelado":
      return { status: "cancelled" };
    default:
      return { status: "unknown" };
  }
}

export class FocusNfeInvoiceAdapter implements InvoiceProviderPort {
  constructor(
    private readonly client: BillingHttpClient,
    private readonly readSecret: FocusNfeSecretReader,
  ) {}

  async issue(input: IssueInvoiceInput): Promise<IssueInvoiceResult> {
    const { route, regimeTributario } = validateTaxProfileBeforeNetwork(input.taxProfile, input.competenceDate);
    const missing = missingFocusFields(input);
    if (!input.emitter.cnpj) missing.unshift("cnpj");
    if (missing.length > 0) throw new InvoiceProviderError("fiscal_data_incomplete", "Fiscal data is incomplete.", { missing });
    const ibsCbs = ibsCbsPayloadFor({ competenceDate: input.competenceDate, regimeTributario, ibsCbs: input.taxProfile.ibsCbs });
    const response = await this.client.request({
      op: "invoice.issue",
      method: "POST",
      path: `/${route === "nacional" ? "nfsen" : "nfse"}?ref=${encodeURIComponent(input.externalRef)}`,
      headers: await this.authHeaders(),
      body: {
        data_emissao: input.competenceDate,
        data_competencia: input.competenceDate,
        serie_dps: input.taxProfile.serieDps,
        numero_dps: input.dpsNumber,
        emitente_dps: 1,
        codigo_municipio_emissora: input.taxProfile.municipioIbge,
        cnpj_prestador: input.emitter.cnpj,
        codigo_opcao_simples_nacional: input.taxProfile.codigoOpcaoSimplesNacional,
        regime_especial_tributacao: input.taxProfile.regimeEspecialTributacao,
        cnpj_tomador: input.borrower.document,
        codigo_municipio_prestacao: input.borrower.municipalityCode ?? input.taxProfile.municipioIbge,
        codigo_tributacao_nacional_iss: input.taxProfile.cTribNac,
        descricao_servico: input.serviceDescription,
        valor_servico: moneyFromCents(input.amountCents),
        tributacao_iss: input.taxProfile.tributacaoIss,
        ...(ibsCbs === undefined
          ? {}
          : {
              ibs_cbs: {
                cst: ibsCbs.cst,
                c_class_trib: ibsCbs.cClassTrib,
                indicador_destinatario: ibsCbs.indicadorDestinatario,
                finalidade_emissao: ibsCbs.finalidadeEmissao,
              },
            }),
      },
    });
    if (response.status === 422) {
      const body = await this.readBody(response);
      if (/já existe|ja existe|referência|referencia/i.test(body.mensagem ?? "")) {
        throw new InvoiceProviderError("already_issued", "Invoice reference already exists.", { existingId: body.id });
      }
      throw new ProviderValidationError(await this.sanitizedErrorMessage(body));
    }
    if (response.status === 429) throw new ProviderRateLimitedError(response.retryAfterMs ?? 0);
    if (response.status < 200 || response.status >= 300) throw new ProviderUnavailableError(`The provider returned HTTP ${response.status}.`);
    const body = await this.readBody(response);
    return { providerInvoiceId: body.id, status: "processing" };
  }

  async getInvoice(ref: string): Promise<InvoiceLookup> {
    const body = await this.call({ op: "invoice.get", method: "GET", path: `/nfsen/${safeRef(ref)}`, headers: await this.authHeaders() });
    return lookupFromFocus(body);
  }

  async cancel(ref: string, reason: string, _code?: string): Promise<{ readonly status: "processing" | "cancelled" | "error" }> {
    const body = await this.call({
      op: "invoice.cancel",
      method: "DELETE",
      path: `/nfsen/${safeRef(ref)}`,
      headers: await this.authHeaders(),
      body: { justificativa: reason },
    });
    if (body.status === "erro_cancelamento") return { status: "error" };
    if (body.status === "cancelado") return { status: "cancelled" };
    return { status: "processing" };
  }

  async registerEmitter(settings: Readonly<Record<string, unknown>>): Promise<{ readonly externalId?: string }> {
    const certificateRaw = await this.readSecret("certificate");
    if (!certificateRaw) throw new ProviderNotConfiguredError("focusnfe");
    let certificate: Readonly<Record<string, string>>;
    try {
      certificate = JSON.parse(certificateRaw) as Readonly<Record<string, string>>;
    } catch {
      throw new ProviderValidationError("Invalid certificate credential.");
    }
    const body = await this.call({
      op: "invoice.registerEmitter",
      method: "POST",
      path: "/empresas",
      headers: await this.authHeaders(),
      body: { ...settings, certificado: certificate.pfxBase64, senha_certificado: certificate.password },
    });
    return { externalId: body.id };
  }

  async registerWebhook(input: RegisterInvoiceWebhookInput): Promise<{ readonly externalId: string }> {
    const secret = await this.readSecret("webhook_secret");
    if (!secret) throw new ProviderNotConfiguredError("focusnfe");
    const body = await this.call({
      op: "invoice.registerWebhook",
      method: "POST",
      path: "/hooks",
      headers: await this.authHeaders(),
      body: { url: input.url, authorization: secret, authorization_header: "X-Webhook-Token" },
    });
    if (!body.id) throw new ProviderUnavailableError("The provider did not return a webhook id.");
    return { externalId: body.id };
  }

  async getInvoicePdf(ref: string): Promise<{ readonly source: "public_url"; readonly url: string }> {
    const invoice = await this.getInvoice(ref);
    if (invoice.status !== "authorized" || !invoice.pdfUrl) throw new InvoiceProviderError("invoice_not_ready", "Invoice PDF is not ready.");
    return { source: "public_url", url: invoice.pdfUrl };
  }

  async verifyWebhook(input: VerifyInvoiceWebhookInput): Promise<VerifyInvoiceWebhookResult> {
    const secret = await this.readSecret("webhook_secret");
    const received = headerOf(input.headers, "x-webhook-token");
    if (!secret || !received || !timingSafeEqual(hash(secret), hash(received))) return { ok: false };
    try {
      const body = JSON.parse(input.rawBody) as Readonly<Record<string, unknown>>;
      return {
        ok: true,
        eventId: typeof body.id === "string" ? body.id : undefined,
        externalRef: typeof body.ref === "string" ? body.ref : undefined,
        kind: typeof body.status === "string" ? body.status : undefined,
      };
    } catch {
      return { ok: false };
    }
  }

  describe() {
    return { provider: "focusnfe", pdfSource: "public_url" as const, pendingHomologation: PROVIDER_CATALOG.focusnfe.pendingHomologation };
  }

  private async authHeaders(): Promise<Readonly<Record<string, string>>> {
    const token = await this.readSecret("api_token");
    if (!token) throw new ProviderNotConfiguredError("focusnfe");
    return { Authorization: basicToken(token) };
  }

  private async call(request: BillingHttpRequest): Promise<FocusBody> {
    const response = await this.client.request(request);
    if (response.status === 429) throw new ProviderRateLimitedError(response.retryAfterMs ?? 0);
    const body = await this.readBody(response);
    if (response.status === 400 || response.status === 422) throw new ProviderValidationError(await this.sanitizedErrorMessage(body));
    if (response.status < 200 || response.status >= 300) throw new ProviderUnavailableError(`The provider returned HTTP ${response.status}.`);
    return body;
  }

  private async readBody(response: BillingHttpResponse): Promise<FocusBody> {
    try {
      return await response.json<FocusBody>();
    } catch {
      return {};
    }
  }

  private errorMessage(body: FocusBody): string {
    const messages = body.erros?.map((item) => item.mensagem).filter((item): item is string => Boolean(item)) ?? [];
    return messages[0] ?? body.mensagem ?? "The provider rejected the request.";
  }

  private async sanitizedErrorMessage(body: FocusBody): Promise<string> {
    let message = this.errorMessage(body);
    const secrets = await Promise.all([this.readSecret("api_token"), this.readSecret("webhook_secret"), this.readSecret("certificate")]);
    for (const secret of secrets) {
      if (secret) {
        message = message.split(secret).join("[redacted]");
        message = message.split(basicToken(secret)).join("[redacted]");
      }
    }
    return message;
  }
}
