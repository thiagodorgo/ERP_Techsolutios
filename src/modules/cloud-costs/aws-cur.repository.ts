import { randomUUID } from "node:crypto";

import type {
  CloudCostImport,
  CloudCostImportFilters,
  CloudCostLineItem,
  CloudCostLineItemFilters,
  CloudCostSummaryRows,
  CompleteCloudCostImportInput,
  CreateCloudCostImportInput,
  ParsedAwsCurLineItem,
} from "./aws-cur.types.js";

export type CloudCostRepository = {
  createImport(input: CreateCloudCostImportInput): Promise<CloudCostImport>;
  updateImport(importId: string, input: CompleteCloudCostImportInput): Promise<CloudCostImport>;
  getImport(importId: string): Promise<CloudCostImport | undefined>;
  listImports(filters?: CloudCostImportFilters): Promise<readonly CloudCostImport[]>;
  createLineItems(importId: string, lines: readonly ParsedAwsCurLineItem[]): Promise<readonly CloudCostLineItem[]>;
  listLineItems(filters?: CloudCostLineItemFilters): Promise<readonly CloudCostLineItem[]>;
  // B-O6R-06 (Omega6R-DIN-007) — SOMA NO BANCO, sem `take`. Antes o resumo lia no maximo 10.000 linhas
  // (`normalizeSummaryFilters` cravava `limit: 10_000`) e reduzia o array em ponto flutuante: a 10.001a
  // linha simplesmente NAO ENTRAVA no total, e o consumidor nao tinha como saber. `listLineItems`
  // continua paginado (detalhe, <= 500) e com o mesmo `where` — extraido para nao divergirem.
  summarizeLineItems(filters?: CloudCostLineItemFilters): Promise<CloudCostSummaryRows>;
};

export class InMemoryCloudCostRepository implements CloudCostRepository {
  private imports: CloudCostImport[] = [];
  private lineItems: CloudCostLineItem[] = [];

  async createImport(input: CreateCloudCostImportInput): Promise<CloudCostImport> {
    const now = new Date();
    const record: CloudCostImport = {
      id: randomUUID(),
      provider: input.provider,
      sourceType: input.sourceType,
      sourceUri: input.sourceUri,
      status: input.status,
      importedBy: input.importedBy,
      rowCount: 0,
      totalUnblendedCost: 0,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.imports.push(record);
    return record;
  }

  async updateImport(importId: string, input: CompleteCloudCostImportInput): Promise<CloudCostImport> {
    const existing = await this.getRequiredImport(importId);
    const updated: CloudCostImport = {
      ...existing,
      status: input.status,
      periodStart: input.periodStart ?? existing.periodStart,
      periodEnd: input.periodEnd ?? existing.periodEnd,
      importedAt: input.importedAt ?? existing.importedAt,
      rowCount: input.rowCount ?? existing.rowCount,
      totalUnblendedCost: input.totalUnblendedCost ?? existing.totalUnblendedCost,
      currency: input.currency ?? existing.currency,
      errorMessage: input.errorMessage,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: new Date(),
    };

    this.imports = this.imports.map((item) => (item.id === importId ? updated : item));
    return updated;
  }

  async getImport(importId: string): Promise<CloudCostImport | undefined> {
    return this.imports.find((item) => item.id === importId);
  }

  async listImports(filters: CloudCostImportFilters = {}): Promise<readonly CloudCostImport[]> {
    return this.imports
      .filter((item) => !filters.status || item.status === filters.status)
      .filter((item) => !filters.sourceType || item.sourceType === filters.sourceType)
      .filter((item) => !filters.periodStart || !item.periodEnd || item.periodEnd >= filters.periodStart)
      .filter((item) => !filters.periodEnd || !item.periodStart || item.periodStart <= filters.periodEnd)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createLineItems(importId: string, lines: readonly ParsedAwsCurLineItem[]): Promise<readonly CloudCostLineItem[]> {
    await this.getRequiredImport(importId);
    const created: CloudCostLineItem[] = [];
    const existingHashes = new Set(
      this.lineItems.filter((item) => item.importId === importId).map((item) => item.rawLineHash),
    );

    for (const line of lines) {
      if (existingHashes.has(line.rawLineHash)) continue;
      existingHashes.add(line.rawLineHash);
      const record: CloudCostLineItem = {
        ...line,
        id: randomUUID(),
        importId,
        createdAt: new Date(),
      };
      this.lineItems.push(record);
      created.push(record);
    }

    return created;
  }

  async listLineItems(filters: CloudCostLineItemFilters = {}): Promise<readonly CloudCostLineItem[]> {
    const limit = filters.limit ?? 200;
    return this.matchLineItems(filters)
      .sort((a, b) => a.billingPeriodStart.getTime() - b.billingPeriodStart.getTime())
      .slice(0, limit);
  }

  // B-O6R-06 — o duble soma SEM LIMITE e em MICRO-UNIDADES INTEIRAS (`BigInt`), nunca em float. O
  // repositorio em memoria guarda `unblendedCost` como `number`; reduzir com `+` traria de volta
  // exatamente a acumulacao em ponto flutuante que este bloco esta tirando do caminho do resumo, e a
  // suite em memoria passaria a divergir do Postgres justo no numero que o achado nomeia.
  async summarizeLineItems(filters: CloudCostLineItemFilters = {}): Promise<CloudCostSummaryRows> {
    const matched = this.matchLineItems(filters);

    if (matched.length === 0) {
      return { total: null, lineItemCount: 0, byServiceCurrency: [], currencies: [] };
    }

    const groups = new Map<string, { serviceCode: string; currency: string; micros: bigint; count: number }>();
    let totalMicros = 0n;

    for (const item of matched) {
      const micros = toMicros(item.unblendedCost);
      totalMicros += micros;
      const key = `${item.serviceCode}|${item.currency}`;
      const existing = groups.get(key);
      groups.set(key, {
        serviceCode: item.serviceCode,
        currency: item.currency,
        micros: (existing?.micros ?? 0n) + micros,
        count: (existing?.count ?? 0) + 1,
      });
    }

    return {
      total: fromMicros(totalMicros),
      lineItemCount: matched.length,
      byServiceCurrency: [...groups.values()]
        .map((group) => ({
          serviceCode: group.serviceCode,
          currency: group.currency,
          unblendedCost: fromMicros(group.micros),
          lineItemCount: group.count,
        }))
        .sort((a, b) => a.serviceCode.localeCompare(b.serviceCode) || a.currency.localeCompare(b.currency)),
      currencies: [...new Set(matched.map((item) => item.currency))].sort(),
    };
  }

  private matchLineItems(filters: CloudCostLineItemFilters): CloudCostLineItem[] {
    return this.lineItems
      .filter((item) => !filters.importId || item.importId === filters.importId)
      .filter((item) => !filters.periodStart || item.billingPeriodEnd >= filters.periodStart)
      .filter((item) => !filters.periodEnd || item.billingPeriodStart <= filters.periodEnd)
      .filter((item) => !filters.serviceCode || item.serviceCode === filters.serviceCode)
      .filter((item) => !filters.usageType || item.usageType === filters.usageType)
      .filter((item) => !filters.region || item.region === filters.region)
      .filter((item) => !filters.tenantTag || item.tenantTag === filters.tenantTag);
  }

  reset(): void {
    this.imports = [];
    this.lineItems = [];
  }

  private async getRequiredImport(importId: string): Promise<CloudCostImport> {
    const record = await this.getImport(importId);
    if (!record) throw new Error(`Cloud cost import not found: ${importId}`);
    return record;
  }
}

/** `numeric(20,6)` -> inteiro de micro-unidades. `Math.round` fecha o erro de representacao do literal. */
function toMicros(value: number): bigint {
  return BigInt(Math.round(value * 1_000_000));
}

/** Micro-unidades -> string decimal com 6 casas, no MESMO formato que o `numeric(20,6)` do Postgres. */
function fromMicros(micros: bigint): string {
  const negative = micros < 0n;
  const absolute = negative ? -micros : micros;
  const units = absolute / 1_000_000n;
  const fraction = (absolute % 1_000_000n).toString().padStart(6, "0");
  return `${negative ? "-" : ""}${units}.${fraction}`;
}
