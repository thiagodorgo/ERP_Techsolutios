// B-ASS-07 · porta comum de nota fiscal. O outbox do B-ASS-08 conhece apenas este contrato.
// Emissão é sempre assíncrona: um 2xx inicial só pode resultar em `processing`.

export type NfseRoute = "nacional" | "municipal";
export type InvoiceStatus = "processing" | "authorized" | "rejected" | "cancelled" | "unknown";
export type InvoiceCancelStatus = "processing" | "cancelled" | "error";

export type IbsCbsFields = {
  readonly enviar?: boolean;
  readonly cst?: string;
  readonly cClassTrib?: string;
  readonly indicadorDestinatario?: string;
  readonly finalidadeEmissao?: string;
};

export type InvoiceTaxProfile = {
  readonly nfseRoute?: NfseRoute;
  /** Campo fornecido pela configuração fiscal; nunca inferido pelo adaptador. */
  readonly regimeTributario?: string;
  readonly codigoOpcaoSimplesNacional?: string;
  readonly regimeEspecialTributacao?: string;
  readonly tributacaoIss?: string;
  readonly municipioIbge?: string;
  readonly cTribNac?: string;
  readonly codigoNbs?: string;
  readonly serieDps?: number;
  readonly issAliquota?: string;
  readonly ibsCbs?: IbsCbsFields;
};

export type InvoiceEmitter = {
  readonly cnpj: string;
  readonly legalName?: string;
  readonly municipalRegistration?: string;
};

export type InvoiceBorrower = {
  readonly document: string;
  readonly name: string;
  readonly email?: string;
  readonly municipalityCode?: string;
};

export type IssueInvoiceInput = {
  /** `<statement_id>:<seq>`. */
  readonly externalRef: string;
  readonly dpsNumber: number;
  readonly emitter: InvoiceEmitter;
  readonly borrower: InvoiceBorrower;
  readonly serviceDescription: string;
  readonly amountCents: number;
  readonly competenceDate: string;
  readonly taxProfile: InvoiceTaxProfile;
};

export type IssueInvoiceResult = {
  readonly providerInvoiceId?: string;
  readonly status: "processing";
  readonly alreadyIssued?: boolean;
};

export type InvoiceLookup = {
  readonly status: InvoiceStatus;
  readonly number?: string;
  readonly verificationCode?: string;
  readonly pdfUrl?: string;
  readonly xmlUrl?: string;
  readonly errors?: readonly string[];
};

export type RegisterInvoiceWebhookInput = {
  readonly url: string;
  readonly secret: string;
};

export type InvoiceProviderDescription = {
  readonly provider: string;
  readonly pdfSource: "public_url" | "provider_fetch";
  readonly pendingHomologation: readonly string[];
};

export type VerifyInvoiceWebhookInput = {
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly rawBody: string;
};

export type VerifyInvoiceWebhookResult = {
  readonly ok: boolean;
  readonly eventId?: string;
  readonly externalRef?: string;
  readonly kind?: string;
};

export interface InvoiceProviderPort {
  issue(input: IssueInvoiceInput): Promise<IssueInvoiceResult>;
  getInvoice(ref: string): Promise<InvoiceLookup>;
  cancel(ref: string, reason: string, code?: string): Promise<{ readonly status: InvoiceCancelStatus }>;
  registerEmitter(settings: Readonly<Record<string, unknown>>, certificate: Readonly<Record<string, string>>): Promise<{ readonly externalId?: string }>;
  registerWebhook(input: RegisterInvoiceWebhookInput): Promise<{ readonly externalId: string }>;
  getInvoicePdf(ref: string): Promise<{ readonly source: "public_url"; readonly url: string } | { readonly source: "provider_fetch"; readonly bytes: Uint8Array }>;
  verifyWebhook(input: VerifyInvoiceWebhookInput): Promise<VerifyInvoiceWebhookResult>;
  describe(): InvoiceProviderDescription;
}
