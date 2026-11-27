import { randomUUID } from "node:crypto";
import { canonicalModuleList, sameModuleSet } from "./platform-modules.service.js";
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
// B-PLANOS-MODULOS (§5.5, item 2) — os 4 desfechos da escrita de módulos. `not_found` e `subscription_in_force`
// não carregam a organização porque nada foi lido para devolver; `unchanged` devolve a linha como estava (o atalho
// de "sem mudança" não escreve nem trilha) e `changed` devolve a linha já gravada.
export type ReplaceModulesResult =
  | { readonly kind: "not_found" }
  | { readonly kind: "subscription_in_force" }
  | { readonly kind: "unchanged"; readonly organization: PlatformOrganizationRecord }
  | { readonly kind: "changed"; readonly organization: PlatformOrganizationRecord };
export interface PlatformOrganizationsRepository {
  list(): Promise<readonly PlatformOrganizationRecord[]>;
  findById(id: string): Promise<PlatformOrganizationRecord | null>;
  create(input: CreateOrganizationRecord): Promise<CreatedOrganizationRecord>;
  rename(id: string, name: string, groupId: string | null, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
  changeStatus(id: string, input: UpdateTenantStatusDto, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
  replaceModules(id: string, modules: readonly string[], actorUserId: string, now: Date): Promise<ReplaceModulesResult>;
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
  // L3 do plano: o armazém em memória NÃO conhece assinatura, então nunca devolve `subscription_in_force` — em modo
  // memória o 409 vem da checagem do serviço (§5.5, item 4), que vale nos dois modos.
  async replaceModules(id: string, modules: readonly string[], _actorUserId: string, now: Date): Promise<ReplaceModulesResult> {
    const row = this.rows.get(id); if (!row) return { kind: "not_found" };
    const next = canonicalModuleList(modules);
    if (sameModuleSet(row.modules, next)) return { kind: "unchanged", organization: row };
    const updated = { ...row, modules: next, updatedAt: now }; this.rows.set(id, updated);
    return { kind: "changed", organization: updated };
  }
}

export function normalizedOrganizationName(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
