import { randomUUID } from "node:crypto";

import type {
  CloudCostImport,
  CloudCostImportFilters,
  CloudCostLineItem,
  CloudCostLineItemFilters,
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
    return this.lineItems
      .filter((item) => !filters.importId || item.importId === filters.importId)
      .filter((item) => !filters.periodStart || item.billingPeriodEnd >= filters.periodStart)
      .filter((item) => !filters.periodEnd || item.billingPeriodStart <= filters.periodEnd)
      .filter((item) => !filters.serviceCode || item.serviceCode === filters.serviceCode)
      .filter((item) => !filters.usageType || item.usageType === filters.usageType)
      .filter((item) => !filters.region || item.region === filters.region)
      .filter((item) => !filters.tenantTag || item.tenantTag === filters.tenantTag)
      .sort((a, b) => a.billingPeriodStart.getTime() - b.billingPeriodStart.getTime())
      .slice(0, limit);
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
