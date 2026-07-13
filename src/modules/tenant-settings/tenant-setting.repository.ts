import { randomUUID } from "node:crypto";

import type {
  TenantSetting,
  ListTenantSettingInput,
  ListTenantSettingResult,
  UpsertTenantSettingInput,
} from "./tenant-setting.types.js";

export interface TenantSettingRepository {
  list(input: ListTenantSettingInput): Promise<ListTenantSettingResult>;
  findByKey(tenantId: string, key: string): Promise<TenantSetting | undefined>;
  upsert(input: UpsertTenantSettingInput): Promise<TenantSetting>;
  reset?(): void;
}

export class InMemoryTenantSettingRepository implements TenantSettingRepository {
  private readonly settings = new Map<string, TenantSetting>();

  async list(input: ListTenantSettingInput): Promise<ListTenantSettingResult> {
    const filtered = this.sorted()
      .filter((setting) => setting.tenantId === input.tenantId)
      .filter((setting) => input.category === undefined || setting.category === input.category);

    return { items: filtered, total: filtered.length };
  }

  async findByKey(tenantId: string, key: string): Promise<TenantSetting | undefined> {
    return [...this.settings.values()].find((setting) => setting.tenantId === tenantId && setting.key === key);
  }

  async upsert(input: UpsertTenantSettingInput): Promise<TenantSetting> {
    const existing = await this.findByKey(input.tenantId, input.key);
    const now = new Date();

    if (existing) {
      // Merge: value sempre atualiza; category/description só quando presentes no corpo.
      const updated: TenantSetting = {
        ...existing,
        value: input.value,
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        updatedBy: input.updatedBy,
        updatedAt: now,
      };
      this.settings.set(updated.id, updated);
      return updated;
    }

    const created: TenantSetting = {
      id: randomUUID(),
      tenantId: input.tenantId,
      key: input.key,
      value: input.value,
      category: input.category,
      description: input.description,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.settings.set(created.id, created);
    return created;
  }

  reset(): void {
    this.settings.clear();
  }

  private sorted(): TenantSetting[] {
    return [...this.settings.values()].sort((left, right) => left.key.localeCompare(right.key));
  }
}
