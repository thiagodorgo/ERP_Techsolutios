import { randomUUID } from "node:crypto";
import type { PlatformOrganizationRecord, UpdateTenantStatusDto } from "./platform.types.js";

export type CreateOrganizationRecord = { readonly name: string; readonly groupId: string | null; readonly actorUserId: string };
export interface PlatformOrganizationsRepository {
  list(): Promise<readonly PlatformOrganizationRecord[]>;
  findById(id: string): Promise<PlatformOrganizationRecord | null>;
  create(input: CreateOrganizationRecord): Promise<PlatformOrganizationRecord>;
  rename(id: string, name: string, groupId: string | null, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
  changeStatus(id: string, input: UpdateTenantStatusDto, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
}
export class OrganizationNameConflictError extends Error { readonly code = "organization_name_conflict"; }

export class InMemoryPlatformOrganizationsRepository implements PlatformOrganizationsRepository {
  private readonly rows = new Map<string, PlatformOrganizationRecord>();
  async list(): Promise<readonly PlatformOrganizationRecord[]> { return [...this.rows.values()].sort((a, b) => a.name.localeCompare(b.name)); }
  async findById(id: string): Promise<PlatformOrganizationRecord | null> { return this.rows.get(id) ?? null; }
  async create(input: CreateOrganizationRecord): Promise<PlatformOrganizationRecord> {
    const now = new Date();
    const row = { id: randomUUID(), name: input.name, slug: `${normalizedOrganizationName(input.name).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "tenant"}-${randomUUID().slice(0, 8)}`, status: "active", modules: [], createdAt: now, updatedAt: now } satisfies PlatformOrganizationRecord;
    this.rows.set(row.id, row); return row;
  }
  async rename(id: string, name: string): Promise<PlatformOrganizationRecord | null> {
    const row = this.rows.get(id); if (!row) return null;
    const updated = { ...row, name, updatedAt: new Date() }; this.rows.set(id, updated); return updated;
  }
  async changeStatus(id: string, input: UpdateTenantStatusDto): Promise<PlatformOrganizationRecord | null> {
    const row = this.rows.get(id); if (!row) return null;
    const updated = { ...row, status: input.status, updatedAt: new Date() }; this.rows.set(id, updated); return updated;
  }
}

export function normalizedOrganizationName(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
