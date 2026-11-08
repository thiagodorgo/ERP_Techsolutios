// B-ASS-06 · F1 — o cliente HTTP ÚNICO do módulo (plano §4.6). É o único ponto de `fetch` de
// `src/modules/subscription-billing/**` (guard R-PAY-6).
//
//  - allowlist de hosts do catálogo (`provider.catalog.ts`); 127.0.0.1 só com
//    `BILLING_PROVIDER_ALLOW_LOCAL_HOSTS` em `test` (R-PAY-5).
//  - canal desligado (`BILLING_PROVIDERS_ENABLED=false`) → `channel_disabled` ANTES de tocar a rede (R-PAY-4).
//  - `AbortSignal.timeout`: 60 s em cartão, 15 s no resto; timeout → `ProviderTimeoutError`, sem repetição (R-PAY-3).
//  - 429 → lê `Retry-After`/`RateLimit-Reset` e devolve `retryAfterMs` (R-PAY-3).
//  - log só com `provider`, `op`, `status`, `latencyMs` — nunca header sensível nem corpo (R-PAY-7).
//  - redirect nunca é seguido (A1): `redirect: "manual"` e 3xx vira erro sanitizado.

import { env } from "../../../../config/env.js";
import {
  PROVIDER_CATALOG,
  type ProviderId,
} from "../provider.catalog.js";
import type { ProviderEnvironment } from "../../vault/vault.repository.js";
import {
  BillingChannelDisabledError,
  BillingHostNotAllowedError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "./billing-errors.js";

export type BillingHttpLogEntry = {
  readonly provider: string;
  readonly op: string;
  readonly status: number;
  readonly latencyMs: number;
};

export type BillingHttpConfig = {
  readonly provider: ProviderId;
  readonly environment: ProviderEnvironment;
  readonly channelEnabled: boolean;
  readonly allowLocalHosts: boolean;
  readonly nodeEnv: "development" | "test" | "production";
  /** Override para os servidores FALSOS (127.0.0.1:0). Ausente → host do catálogo. */
  readonly baseUrl?: string;
  readonly cardTimeoutMs?: number;
  readonly timeoutMs?: number;
  readonly log?: (entry: BillingHttpLogEntry) => void;
};

export type BillingHttpRequest = {
  readonly op: string;
  readonly method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  readonly path: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  /** 60 s (cartão) em vez de 15 s (resto) — pesquisa P1. */
  readonly cardTimeout?: boolean;
};

export type BillingHttpResponse = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly retryAfterMs?: number;
  json<T>(): Promise<T>;
  text(): Promise<string>;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function headerValue(headers: Headers, name: string): string | undefined {
  return headers.get(name) ?? undefined;
}

function retryAfterFromHeaders(headers: Headers): number | undefined {
  const retryAfter = headerValue(headers, "retry-after");
  if (retryAfter !== undefined && /^\d+$/.test(retryAfter.trim())) {
    return Number(retryAfter.trim()) * 1000;
  }
  const rateLimitReset = headerValue(headers, "ratelimit-reset") ?? headerValue(headers, "x-ratelimit-reset");
  if (rateLimitReset !== undefined && /^\d+$/.test(rateLimitReset.trim())) {
    const resetEpochMs = Number(rateLimitReset.trim()) * 1000;
    const remaining = resetEpochMs - Date.now();
    return remaining > 0 ? remaining : 0;
  }
  return undefined;
}

export class BillingHttpClient {
  readonly #config: BillingHttpConfig;

  constructor(config: BillingHttpConfig) {
    this.#config = config;
  }

  get provider(): string {
    return this.#config.provider;
  }

  get environment(): string {
    return this.#config.environment;
  }

  baseUrl(): string {
    return this.#config.baseUrl ?? PROVIDER_CATALOG[this.#config.provider].hosts[this.#config.environment];
  }

  /** A allowlist POR provedor/ambiente (R-PAY-5, A4): host exato do catálogo, https e porta padrão; falso local só em test. */
  assertUrlAllowed(url: URL): void {
    const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
    if (LOCAL_HOSTS.has(host)) {
      if (this.#config.allowLocalHosts && this.#config.nodeEnv === "test") return;
      throw new BillingHostNotAllowedError(host);
    }
    const expected = new URL(PROVIDER_CATALOG[this.#config.provider].hosts[this.#config.environment]);
    if (host === expected.hostname && url.protocol === "https:" && (url.port === "" || url.port === "443")) return;
    throw new BillingHostNotAllowedError(host);
  }

  async request(input: BillingHttpRequest): Promise<BillingHttpResponse> {
    // Canal desligado: recusa ANTES de qualquer fetch (R-PAY-4) — o falso registra 0 requisições.
    if (!this.#config.channelEnabled) {
      throw new BillingChannelDisabledError();
    }

    const base = this.baseUrl().replace(/\/+$/, "");
    const path = input.path.startsWith("/") ? input.path : `/${input.path}`;
    const url = `${base}${path}`;
    const parsed = new URL(url);
    this.assertUrlAllowed(parsed);

    const timeoutMs = input.cardTimeout ? (this.#config.cardTimeoutMs ?? 60_000) : (this.#config.timeoutMs ?? 15_000);
    const headers = new Headers(input.headers ?? {});
    if (input.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const started = Date.now();
    let response: globalThis.Response;
    try {
      response = await fetch(url, {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      const reason = (error as { name?: string }).name;
      if (reason === "TimeoutError" || reason === "AbortError") {
        throw new ProviderTimeoutError(input.op);
      }
      throw error;
    }

    // A1: redirect nunca é seguido — 3xx vira erro sanitizado, sem reenviar para o destino.
    if (response.status >= 300 && response.status < 400) {
      throw new ProviderUnavailableError("The provider returned an unexpected redirect.");
    }

    this.#config.log?.({
      provider: this.#config.provider,
      op: input.op,
      status: response.status,
      latencyMs: Date.now() - started,
    });

    const outHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      outHeaders[key.toLowerCase()] = value;
    });

    const retryAfterMs = response.status === 429 ? retryAfterFromHeaders(response.headers) : undefined;
    let bodyCache: string | undefined;
    return {
      status: response.status,
      headers: outHeaders,
      retryAfterMs,
      async json<T>(): Promise<T> {
        const text = bodyCache ?? (bodyCache = await response.text());
        return JSON.parse(text) as T;
      },
      async text(): Promise<string> {
        return (bodyCache ??= await response.text());
      },
    };
  }
}

/** Fábrica a partir do ambiente (o que o B-ASS-08 vai usar). Só para o canal LIGADO no env. */
export function billingHttpClientFromEnv(provider: ProviderId, environment: ProviderEnvironment, baseUrl?: string): BillingHttpClient {
  return new BillingHttpClient({
    provider,
    environment,
    channelEnabled: env.BILLING_PROVIDERS_ENABLED,
    allowLocalHosts: env.BILLING_PROVIDER_ALLOW_LOCAL_HOSTS,
    nodeEnv: env.NODE_ENV,
    baseUrl,
  });
}
