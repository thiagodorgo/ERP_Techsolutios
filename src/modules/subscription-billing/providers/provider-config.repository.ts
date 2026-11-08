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
  readonly settings: ProviderSettings;
  readonly lastTestAt: Date | null;
  readonly lastTestOk: boolean | null;
  readonly lastTestEnvironment: ProviderEnvironment | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type ProviderConfigUpsert = {
  readonly provider: string;
  readonly kind: ProviderKind;
  readonly environment: ProviderEnvironment;
  readonly settings: ProviderSettings;
};

export interface ProviderConfigRepository {
  get(provider: string): Promise<ProviderConfig | null>;
  list(): Promise<readonly ProviderConfig[]>;
  /** Cria (desligado, padrão `sandbox`) ou atualiza ambiente e `settings`. Não mexe em `enabled` nem no último teste. */
  upsert(input: ProviderConfigUpsert, now: Date): Promise<ProviderConfig>;
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
          settings: { ...input.settings },
          lastTestAt: null,
          lastTestOk: null,
          lastTestEnvironment: null,
          createdAt: now,
          updatedAt: now,
        };
    this.#rows.set(input.provider, row);
    return row;
  }

  /** Só para testes: liga o provedor (o `enable` de verdade é do B-ASS-08). */
  setEnabledForTests(provider: string, enabled: boolean): void {
    const row = this.#rows.get(provider);
    if (!row) throw new Error(`provider ${provider} not configured`);
    this.#rows.set(provider, { ...row, enabled, enabledEnvironment: enabled ? row.environment : null });
  }
}
