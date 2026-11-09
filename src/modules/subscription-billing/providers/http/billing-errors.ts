// B-ASS-06 · F1 — erros do canal de provedores (plano §4.6, R-PAY-3/4/5).
//
//  - `channel_disabled`: canal desligado por ambiente (`BILLING_PROVIDERS_ENABLED=false`) → sem rede.
//  - `host_not_allowed`: host fora do catálogo (ou 127.0.0.1 sem a flag de test).
//  - `provider_validation`: 400 do provedor, mensagem sanitizada (nunca ecoa token).
//  - `provider_timeout`: estouro do `AbortSignal.timeout`, SEM repetição automática.
//  - `provider_rate_limited`: 429, com `retryAfterMs` lido de Retry-After/RateLimit-Reset.
//  - `provider_not_configured`: credencial do provedor ausente no cofre.
//  - `provider_unavailable`: falha genérica do provedor (5xx etc.).

export type BillingHttpErrorCode =
  | "channel_disabled"
  | "host_not_allowed"
  | "provider_validation"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_not_configured"
  | "provider_unavailable";

export class BillingHttpError extends Error {
  readonly code: BillingHttpErrorCode;
  readonly statusCode: number;

  constructor(code: BillingHttpErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "BillingHttpError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class BillingChannelDisabledError extends BillingHttpError {
  constructor() {
    super("channel_disabled", "Billing providers are disabled.", 503);
    this.name = "BillingChannelDisabledError";
  }
}

export class BillingHostNotAllowedError extends BillingHttpError {
  constructor(host: string) {
    super("host_not_allowed", `Host not allowed: ${host}.`, 502);
    this.name = "BillingHostNotAllowedError";
  }
}

export class ProviderValidationError extends BillingHttpError {
  constructor(message: string) {
    super("provider_validation", message, 400);
    this.name = "ProviderValidationError";
  }
}

export class ProviderTimeoutError extends BillingHttpError {
  constructor(op: string) {
    super("provider_timeout", `The provider timed out during ${op}.`, 504);
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderRateLimitedError extends BillingHttpError {
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("provider_rate_limited", "The provider rate-limited the request.", 429);
    this.name = "ProviderRateLimitedError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class ProviderNotConfiguredError extends BillingHttpError {
  constructor(provider: string) {
    super("provider_not_configured", `The ${provider} credential is not configured.`, 503);
    this.name = "ProviderNotConfiguredError";
  }
}

export class ProviderUnavailableError extends BillingHttpError {
  constructor(message: string) {
    super("provider_unavailable", message, 502);
    this.name = "ProviderUnavailableError";
  }
}
