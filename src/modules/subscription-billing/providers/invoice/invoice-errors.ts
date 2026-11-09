export type InvoiceProviderErrorCode =
  | "fiscal_data_incomplete"
  | "ibs_cbs_incomplete"
  | "municipal_route_not_allowed_for_simples"
  | "already_issued"
  | "invoice_not_ready";

export class InvoiceProviderError extends Error {
  readonly code: InvoiceProviderErrorCode;
  readonly statusCode: number;
  readonly missing: readonly string[];
  readonly existingId?: string;

  constructor(code: InvoiceProviderErrorCode, message: string, options?: { readonly missing?: readonly string[]; readonly existingId?: string }) {
    super(message);
    this.name = "InvoiceProviderError";
    this.code = code;
    this.statusCode = code === "already_issued" ? 409 : 422;
    this.missing = options?.missing ?? [];
    this.existingId = options?.existingId;
  }
}
