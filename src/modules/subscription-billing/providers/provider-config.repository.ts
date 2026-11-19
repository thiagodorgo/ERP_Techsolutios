// B-ASS-05 · F3 — a configuração de cada provedor (`billing_provider_configs`, plano §3.2), SEM segredo: ambiente,
// liga/desliga e os dados fiscais do emissor em `settings`. O segredo fica no cofre (`vault/`), nunca aqui.
// Tabela GLOBAL da plataforma (sem `tenant_id`). Aqui: o contrato e o dublê em memória; o Prisma nasce com a M4 (F6).

import type { ProviderKind } from "./provider.catalog.js";

export type ProviderEnvironment = "sandbox" | "production";
export type ProviderSettings = Readonly<Record<string, string | number | boolean>>;

export type ProviderConfig = {
  readonly provider: string;
  readonly kind: ProviderKind;
  readonly environment: ProviderEnvironment;
  readonly enabled: boolean;
  /** O ambiente em que foi ligado (G14); `null` enquanto desligado. */
  readonly enabledEnvironment: ProviderEnvironment | null;
  /** Quem ligou e quando (o ato de ligar do dono; B-ASS-08c3). */
  readonly enabledAt: Date | null;
  readonly enabledBy: string | null;
  readonly settings: ProviderSettings;
  readonly lastTestAt: Date | null;
  readonly lastTestOk: boolean | null;
  readonly lastTestEnvironment: ProviderEnvironment | null;
  /** Só o CÓDIGO do último teste falho (nunca o corpo do provedor). */
  readonly lastTestError: string | null;
  readonly webhookRegisteredAt: Date | null;
  readonly webhookRegisteredEnvironment: ProviderEnvironment | null;
  readonly webhookExternalId: string | null;
  readonly webhookPublicUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ProviderConfigUpsert = {
  readonly provider: string;
  readonly kind: ProviderKind;
  readonly environment: ProviderEnvironment;
  readonly settings: ProviderSettings;
};

export type ProviderTestRecord = {
  readonly ok: boolean;
  readonly errorCode: string | null;
  readonly environment: ProviderEnvironment;
};

export type ProviderWebhookRecord = {
  readonly environment: ProviderEnvironment;
  readonly externalId: string;
  readonly publicUrl: string;
};

export type ProviderEnableEffect = {
  readonly enabled: boolean;
  readonly environment: ProviderEnvironment | null;
  readonly actorId: string | null;
};

export interface ProviderConfigRepository {
  get(provider: string): Promise<ProviderConfig | null>;
  list(): Promise<readonly ProviderConfig[]>;
  /** Cria (desligado, padrão `sandbox`) ou atualiza ambiente e `settings`. Não mexe em `enabled` nem no último teste. */
  upsert(input: ProviderConfigUpsert, now: Date): Promise<ProviderConfig>;
  /** Grava o último teste de conexão (colunas `last_test_*`). Nunca toca `enabled`. */
  recordTest(provider: string, input: ProviderTestRecord, now: Date): Promise<ProviderConfig | null>;
  /** Grava o registro do webhook (colunas `webhook_*`). Nunca toca `enabled`. */
  recordWebhook(provider: string, input: ProviderWebhookRecord, now: Date): Promise<ProviderConfig | null>;
  /** O ÚNICO escritor de `enabled` em `src` (A5/EW2). */
  setEnabled(provider: string, input: ProviderEnableEffect, now: Date): Promise<ProviderConfig | null>;
  /** Liga sob trava ([ENABLE-TX]): lê a linha `FOR UPDATE`, chama `decide` com o estado travado e aplica o efeito, no MESMO tx. */
  enableLocked(
    provider: string,
    now: Date,
    decide: (locked: ProviderConfig | null, peers: readonly ProviderConfig[]) => ProviderEnableEffect | null,
  ): Promise<{ readonly locked: ProviderConfig | null; readonly updated: ProviderConfig | null }>;
}

export class InMemoryProviderConfigRepository implements ProviderConfigRepository {
  readonly #rows = new Map<string, ProviderConfig>();

  async get(provider: string): Promise<ProviderConfig | null> {
    return this.#rows.get(provider) ?? null;
  }

  async list(): Promise<readonly ProviderConfig[]> {
    return [...this.#rows.values()].sort((left, right) => left.provider.localeCompare(right.provider));
  }

  async upsert(input: ProviderConfigUpsert, now: Date): Promise<ProviderConfig> {
    const previous = this.#rows.get(input.provider);
    const row: ProviderConfig = previous
      ? { ...previous, environment: input.environment, settings: { ...input.settings }, updatedAt: now }
      : {
          provider: input.provider,
          kind: input.kind,
          environment: input.environment,
          enabled: false,
          enabledEnvironment: null,
          enabledAt: null,
          enabledBy: null,
          settings: { ...input.settings },
          lastTestAt: null,
          lastTestOk: null,
          lastTestEnvironment: null,
          lastTestError: null,
          webhookRegisteredAt: null,
          webhookRegisteredEnvironment: null,
          webhookExternalId: null,
          webhookPublicUrl: null,
          createdAt: now,
          updatedAt: now,
        };
    this.#rows.set(input.provider, row);
    return row;
  }

  async recordTest(provider: string, input: ProviderTestRecord, now: Date): Promise<ProviderConfig | null> {
    const row = this.#rows.get(provider);
    if (!row) return null;
    const updated: ProviderConfig = {
      ...row,
      lastTestAt: now,
      lastTestOk: input.ok,
      lastTestEnvironment: input.environment,
      lastTestError: input.ok ? null : input.errorCode,
      updatedAt: now,
    };
    this.#rows.set(provider, updated);
    return updated;
  }

  async recordWebhook(provider: string, input: ProviderWebhookRecord, now: Date): Promise<ProviderConfig | null> {
    const row = this.#rows.get(provider);
    if (!row) return null;
    const updated: ProviderConfig = {
      ...row,
      webhookRegisteredAt: now,
      webhookRegisteredEnvironment: input.environment,
      webhookExternalId: input.externalId,
      webhookPublicUrl: input.publicUrl,
      updatedAt: now,
    };
    this.#rows.set(provider, updated);
    return updated;
  }

  async setEnabled(provider: string, input: ProviderEnableEffect, now: Date): Promise<ProviderConfig | null> {
    const row = this.#rows.get(provider);
    if (!row) return null;
    const updated = this.#applyEnable(row, input, now);
    this.#rows.set(provider, updated);
    return updated;
  }

  async enableLocked(
    provider: string,
    now: Date,
    decide: (locked: ProviderConfig | null, peers: readonly ProviderConfig[]) => ProviderEnableEffect | null,
  ): Promise<{ readonly locked: ProviderConfig | null; readonly updated: ProviderConfig | null }> {
    const locked = this.#rows.get(provider) ?? null;
    const peers = [...this.#rows.values()];
    const effect = decide(locked, peers);
    if (!effect) return { locked, updated: null };
    const updated = await this.setEnabled(provider, effect, now);
    return { locked, updated };
  }

  #applyEnable(row: ProviderConfig, input: ProviderEnableEffect, now: Date): ProviderConfig {
    return {
      ...row,
      enabled: input.enabled,
      enabledEnvironment: input.enabled ? input.environment : null,
      enabledAt: input.enabled ? now : null,
      enabledBy: input.enabled ? input.actorId : null,
      updatedAt: now,
    };
  }

  /** Só para testes: liga o provedor (o `enable` de verdade é do B-ASS-08). */
  setEnabledForTests(provider: string, enabled: boolean): void {
    const row = this.#rows.get(provider);
    if (!row) throw new Error(`provider ${provider} not configured`);
    this.#rows.set(provider, { ...row, enabled, enabledEnvironment: enabled ? row.environment : null });
  }
}
