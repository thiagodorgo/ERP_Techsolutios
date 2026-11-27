import { randomUUID } from "node:crypto";
import type { PlatformOrganizationRecord, UpdateTenantStatusDto } from "./platform.types.js";

export type OrganizationGroupInput = { readonly id: string } | { readonly name: string };
export type OrganizationGroupRef = { readonly id: string; readonly name: string };
export type CreateOrganizationRecord = {
  readonly name: string;
  readonly group: OrganizationGroupInput;
  readonly actorUserId: string;
};
export type CreatedOrganizationRecord = {
  readonly organization: PlatformOrganizationRecord;
  readonly group: OrganizationGroupRef | null;
};
export interface PlatformOrganizationsRepository {
  list(): Promise<readonly PlatformOrganizationRecord[]>;
  findById(id: string): Promise<PlatformOrganizationRecord | null>;
  create(input: CreateOrganizationRecord): Promise<CreatedOrganizationRecord>;
  rename(id: string, name: string, groupId: string | null, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
  changeStatus(id: string, input: UpdateTenantStatusDto, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
}
export class OrganizationNameConflictError extends Error { readonly code = "organization_name_conflict"; }
export class OrganizationGroupNotFoundError extends Error { readonly code = "group_not_found"; }
export class OrganizationGroupNameInvalidError extends Error { readonly code = "name_invalid"; }
export class OrganizationGroupNameTakenError extends Error { readonly code = "group_name_exists"; }
export class OrganizationGroupTooManyMembersError extends Error { readonly code = "too_many_members"; }

export class InMemoryPlatformOrganizationsRepository implements PlatformOrganizationsRepository {
  private readonly rows = new Map<string, PlatformOrganizationRecord>();
  async list(): Promise<readonly PlatformOrganizationRecord[]> { return [...this.rows.values()].sort((a, b) => a.name.localeCompare(b.name)); }
  async findById(id: string): Promise<PlatformOrganizationRecord | null> { return this.rows.get(id) ?? null; }
  async create(input: CreateOrganizationRecord): Promise<CreatedOrganizationRecord> {
    const now = new Date();
    const row = { id: randomUUID(), name: input.name, slug: `${normalizedOrganizationName(input.name).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "tenant"}-${randomUUID().slice(0, 8)}`, status: "active", modules: [], createdAt: now, updatedAt: now } satisfies PlatformOrganizationRecord;
    this.rows.set(row.id, row); return { organization: row, group: null };
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

// B-PLANOS-MODULOS — "assinatura em vigor" para a porta de módulos: `valid_to` nulo, ou `valid_to` no futuro (a
// cancelada que ainda não terminou continua mandando). Uma regra só, para o serviço e para a transação.
export function subscriptionInForce(validTo: Date | null, now: Date): boolean {
  return validTo === null || validTo.getTime() > now.getTime();
}

export function normalizedOrganizationName(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
