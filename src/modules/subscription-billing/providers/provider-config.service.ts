// B-ASS-05 · F3 — o serviço da configuração dos provedores (plano §4.5, R-VLT-8 e R-VLT-12; contrato §3.5).
//
//  - GET devolve a configuração SEM segredo, mais os resumos das credenciais (do cofre), os itens pendentes de
//    homologação e se os dados fiscais estão completos (`fiscalDataComplete`, `missing[]`).
//  - PUT grava ambiente e `settings`. Dados fiscais incompletos são aceitos como rascunho; inválidos → 400.
//    "Completo" é POR PROVEDOR (`requiredFiscalFields` do catálogo).
//  - Segredo nunca entra em `settings` (`secret_in_settings`): só pelo cofre.
//  - Trocar o ambiente com o provedor ligado → 422 `disable_first` (G14).

import { BillingProfileError, normalizeDocument } from "../billing-profile/billing-profile.js";
import type { CredentialKind } from "../vault/vault.repository.js";
import { getProviderCatalogEntry, PROVIDER_IDS, type ProviderCatalogEntry, type ProviderId } from "./provider.catalog.js";
import type { ProviderConfig, ProviderConfigRepository, ProviderEnvironment, ProviderSettings } from "./provider-config.repository.js";

export type { CredentialKind };

export type CredentialSummary = {
  readonly kind: CredentialKind;
  readonly fingerprint: string;
  readonly last4: string;
  readonly createdAt: Date;
  readonly keyVersion: number;
};

/** A porta pela qual a configuração enxerga as credenciais, sem decifrar nada. O cofre (`VaultService`) a implementa. */
export interface ProviderCredentialSummaries {
  list(provider: string, environment: ProviderEnvironment): Promise<readonly CredentialSummary[]>;
  readability?(provider: string, environment: ProviderEnvironment): Promise<{ readonly configured: boolean; readonly readable: boolean }>;
}

export class ProviderConfigError extends Error {
  readonly code = "SUBSCRIPTION_BILLING_PROVIDER";

  constructor(
    readonly statusCode: number,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "ProviderConfigError";
  }

  get status(): number {
    return this.statusCode;
  }
}

export type ProviderConfigView = {
  readonly provider: ProviderId;
  readonly label: string;
  readonly kind: ProviderCatalogEntry["kind"];
  readonly environment: ProviderEnvironment;
  readonly enabled: boolean;
  readonly configured: boolean;
  readonly settings: ProviderSettings;
  readonly fiscalDataComplete: boolean;
  readonly missing: readonly string[];
  readonly credentials: readonly { readonly kind: CredentialKind; readonly fingerprint: string; readonly last4: string; readonly createdAt: string }[];
  readonly credentialsReadable: boolean | null;
  readonly pendingHomologation: readonly string[];
  readonly lastTest: { readonly at: string; readonly ok: boolean | null; readonly environment: ProviderEnvironment | null } | null;
};

const ENVIRONMENTS: readonly ProviderEnvironment[] = ["sandbox", "production"];
const NFSE_ROUTES = ["nacional", "municipal"] as const;
// Chaves que NUNCA podem estar em `settings`: o segredo só entra pelo cofre.
const SECRET_LIKE = /(secret|token|password|passwd|senha|api_?key|pfx|certificate|certificado|private_?key)/i;
const SETTING_KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const MAX_SETTINGS = 40;
const MAX_TEXT = 200;

function fail(status: number, reason: string, message: string): never {
  throw new ProviderConfigError(status, reason, message);
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > MAX_TEXT) fail(400, "invalid_fiscal_field", `${field} must be non-empty text.`);
  return value.trim();
}

/** Valida e normaliza os campos fiscais conhecidos; os outros campos passam como estão (texto, número ou booleano). */
function normalizeSettings(raw: unknown): ProviderSettings {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) fail(400, "invalid_settings", "settings must be an object.");
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > MAX_SETTINGS) fail(400, "invalid_settings", "settings has too many fields.");
  const output: Record<string, string | number | boolean> = {};
  for (const [key, value] of entries) {
    if (SECRET_LIKE.test(key)) fail(400, "secret_in_settings", "Secrets go to the credentials endpoint, never to settings.");
    if (!SETTING_KEY.test(key)) fail(400, "invalid_settings", "settings has an invalid field name.");
    if (value === null || value === undefined || value === "") continue;
    switch (key) {
      case "cnpj": {
        let document: string | null;
        try {
          document = normalizeDocument(value);
        } catch (error) {
          if (error instanceof BillingProfileError) fail(400, "invalid_fiscal_field", "cnpj must be a valid CNPJ (14, numeric or alphanumeric).");
          throw error;
        }
        if (!document || document.length !== 14) fail(400, "invalid_fiscal_field", "cnpj must be a valid CNPJ (14, numeric or alphanumeric).");
        output.cnpj = document;
        break;
      }
      case "municipioIbge":
        if (typeof value !== "string" || !/^\d{7}$/.test(value.trim())) fail(400, "invalid_fiscal_field", "municipioIbge must have 7 digits.");
        output.municipioIbge = value.trim();
        break;
      case "cTribNac":
        if (typeof value !== "string" || !/^\d{6}$/.test(value.trim())) fail(400, "invalid_fiscal_field", "cTribNac must have 6 digits.");
        output.cTribNac = value.trim();
        break;
      case "regimeTributario":
        output.regimeTributario = text(value, "regimeTributario");
        break;
      case "nfseRoute":
        if (typeof value !== "string" || !(NFSE_ROUTES as readonly string[]).includes(value)) fail(400, "invalid_fiscal_field", "nfseRoute must be nacional or municipal.");
        output.nfseRoute = value;
        break;
      default:
        if (typeof value === "string") {
          if (value.length > MAX_TEXT) fail(400, "invalid_settings", `${key} is too long.`);
          output[key] = value.trim();
        } else if (typeof value === "number" && Number.isFinite(value)) {
          output[key] = value;
        } else if (typeof value === "boolean") {
          output[key] = value;
        } else {
          fail(400, "invalid_settings", `${key} must be text, number or boolean.`);
        }
    }
  }
  return output;
}

function present(settings: ProviderSettings, field: string): boolean {
  const value = settings[field];
  return value !== undefined && value !== "";
}

/** O que falta para a nota sair por ESTE provedor. `municipalTaxStatus` do NFE.io só conta como `Active`. */
export function missingFiscalFields(entry: ProviderCatalogEntry, settings: ProviderSettings): string[] {
  return entry.requiredFiscalFields.filter((field) => {
    if (field === "municipalTaxStatus") return settings.municipalTaxStatus !== "Active";
    return !present(settings, field);
  });
}

function withDefaults(entry: ProviderCatalogEntry, settings: ProviderSettings): ProviderSettings {
  return entry.kind === "invoice" && settings.nfseRoute === undefined ? { ...settings, nfseRoute: "nacional" } : settings;
}

// B-ASS-08 · F9 — PRECONDIÇÕES DE HABILITAÇÃO (G14, R-CFG-1), fail-closed. Ligar um provedor exige TODAS as condições
// abaixo; qualquer falta recusa com `enable_preconditions_failed` e a lista do que falta. "Ligar em produção é ato do
// dono na tela"; NENHUM caminho de código/seed/migração grava `enabled = true` fora deste arquivo (R-CFG-2, guard de
// texto). A persistência do liga/desliga e o `test-connection`/`register-webhook`/`emitter`/`metrics` pareiam com a M5
// (repositório Prisma) e a montagem das rotas — fora desta execução (dublê).

export const ENABLE_LAST_TEST_MAX_AGE_MS = 30 * 60 * 1000;

export type EnablePreconditionState = {
  readonly provider: string;
  readonly kind: ProviderCatalogEntry["kind"];
  readonly environment: ProviderEnvironment;
  /** `BILLING_PROVIDERS_ENABLED` do ambiente. */
  readonly channelEnabledByEnv: boolean;
  readonly apiTokenReadable: boolean;
  readonly lastTestOk: boolean | null;
  readonly lastTestAt: Date | null;
  readonly lastTestEnvironment: ProviderEnvironment | null;
  readonly webhookRegistrationMode: "api" | "manual";
  readonly webhookRegisteredEnvironment: ProviderEnvironment | null;
  /** Para o modo manual (Mercado Pago): a *secret signature* colada como `webhook_secret`. */
  readonly webhookSecretPresent: boolean;
  /** Só `kind = invoice`: dados fiscais completos. */
  readonly fiscalComplete: boolean;
  /** Já existe OUTRO provedor do mesmo `kind` ligado (UNIQUE parcial — G14). */
  readonly otherProviderEnabledForKind: boolean;
  readonly confirm: string | null;
  readonly now: Date;
  /** B-ASS-08c-wh (P23): `NODE_ENV` do processo. O chamador (que nasce no B-ASS-08c3) passa o do ambiente. */
  readonly nodeEnv?: string;
  /** B-ASS-08c-wh (P23): `BILLING_WEBHOOK_TRUSTED_PROXY_HOPS`. Ausente conta como 0 (fail-closed em produção). */
  readonly webhookTrustedProxyHops?: number;
};

export type EnableDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "enable_preconditions_failed"; readonly failed: readonly string[] };

/** Avalia as precondições de `enable` (G14), fail-closed. Pura e testável — não grava nada. */
export function evaluateEnablePreconditions(state: EnablePreconditionState): EnableDecision {
  const failed: string[] = [];
  if (!state.channelEnabledByEnv) failed.push("channel_disabled_by_env");
  if (!state.apiTokenReadable) failed.push("api_token_not_readable");
  if (!state.lastTestOk) failed.push("last_test_required");
  else if (state.lastTestEnvironment !== state.environment) failed.push("last_test_environment_mismatch");
  else if (!state.lastTestAt || state.now.getTime() - state.lastTestAt.getTime() > ENABLE_LAST_TEST_MAX_AGE_MS) failed.push("last_test_expired");
  if (state.webhookRegistrationMode === "api") {
    if (state.webhookRegisteredEnvironment !== state.environment) failed.push("webhook_not_registered_for_environment");
  } else if (!state.webhookSecretPresent) {
    failed.push("webhook_secret_required");
  }
  if (state.kind === "invoice" && !state.fiscalComplete) failed.push("fiscal_data_incomplete");
  if (state.otherProviderEnabledForKind) failed.push("another_provider_enabled_for_kind");
  if (state.confirm !== `${state.provider}:${state.environment}`) failed.push("confirm_mismatch");
  // B-ASS-08c-wh (P23): em produção, sem saltos de proxy medidos o IP do webhook seria o do balanceador → recusa ligar.
  if (state.nodeEnv === "production" && !((state.webhookTrustedProxyHops ?? 0) >= 1)) failed.push("webhook_proxy_hops_unset");
  return failed.length === 0 ? { ok: true } : { ok: false, reason: "enable_preconditions_failed", failed };
}

export class ProviderConfigService {
  constructor(
    private readonly repository: ProviderConfigRepository,
    private readonly credentials: ProviderCredentialSummaries,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async list(): Promise<readonly ProviderConfigView[]> {
    const rows = new Map((await this.repository.list()).map((row) => [row.provider, row]));
    return Promise.all(PROVIDER_IDS.map((id) => this.#view(getProviderCatalogEntry(id)!, rows.get(id) ?? null)));
  }

  async get(provider: string): Promise<ProviderConfigView> {
    const entry = this.#entry(provider);
    return this.#view(entry, await this.repository.get(entry.id));
  }

  async updateSettings(provider: string, input: { readonly environment?: unknown; readonly settings?: unknown }): Promise<ProviderConfigView> {
    const entry = this.#entry(provider);
    const current = await this.repository.get(entry.id);
    const environment = input.environment === undefined ? (current?.environment ?? "sandbox") : input.environment;
    if (typeof environment !== "string" || !(ENVIRONMENTS as readonly string[]).includes(environment)) {
      fail(400, "invalid_environment", "environment must be sandbox or production.");
    }
    if (current?.enabled && environment !== current.environment) {
      fail(422, "disable_first", "Disable the provider before changing its environment.");
    }
    const settings = withDefaults(entry, input.settings === undefined ? (current?.settings ?? {}) : normalizeSettings(input.settings));
    const saved = await this.repository.upsert({ provider: entry.id, kind: entry.kind, environment: environment as ProviderEnvironment, settings }, this.clock());
    return this.#view(entry, saved);
  }

  #entry(provider: string): ProviderCatalogEntry {
    const entry = getProviderCatalogEntry(provider);
    if (!entry) fail(404, "provider_not_found", "Unknown billing provider.");
    return entry;
  }

  async #view(entry: ProviderCatalogEntry, row: ProviderConfig | null): Promise<ProviderConfigView> {
    const environment = row?.environment ?? "sandbox";
    const settings = withDefaults(entry, row?.settings ?? {});
    const missing = missingFiscalFields(entry, settings);
    const summaries = await this.credentials.list(entry.id, environment);
    const readability = this.credentials.readability ? await this.credentials.readability(entry.id, environment) : null;
    return {
      provider: entry.id,
      label: entry.label,
      kind: entry.kind,
      environment,
      enabled: row?.enabled ?? false,
      configured: row !== null,
      settings,
      fiscalDataComplete: missing.length === 0,
      missing,
      credentials: summaries.map((summary) => ({ kind: summary.kind, fingerprint: summary.fingerprint, last4: summary.last4, createdAt: summary.createdAt.toISOString() })),
      credentialsReadable: readability && readability.configured ? readability.readable : null,
      pendingHomologation: entry.pendingHomologation,
      lastTest: row?.lastTestAt ? { at: row.lastTestAt.toISOString(), ok: row.lastTestOk, environment: row.lastTestEnvironment } : null,
    };
  }
}
