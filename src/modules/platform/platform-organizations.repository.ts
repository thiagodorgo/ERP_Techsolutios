import { randomUUID } from "node:crypto";
import { CANONICAL_MODULE_KEYS, normalizeModuleKeys } from "./platform-modules.service.js";
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
// B-PLANOS-MODULOS — o resultado da troca de módulos de UMA organização, em 4 casos: não achada; assinatura em vigor
// (quem manda é o plano, nada é escrito); sem mudança (a mesma lista, comparada como conjunto: nada é escrito, nem a
// trilha); e mudou.
export type ReplaceModulesResult =
  | { readonly kind: "not_found" }
  | { readonly kind: "subscription_in_force" }
  | { readonly kind: "unchanged"; readonly organization: PlatformOrganizationRecord }
  | { readonly kind: "changed"; readonly organization: PlatformOrganizationRecord };
// A diferença entre a lista atual e a nova. `added` e `removed` só com chaves do catálogo, na ordem do catálogo;
// `removedOther` conta as chaves antigas fora do catálogo que saíram, sem o texto delas.
export type ModuleChange = {
  readonly next: readonly string[];
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly removedOther: number;
};
export interface PlatformOrganizationsRepository {
  list(): Promise<readonly PlatformOrganizationRecord[]>;
  findById(id: string): Promise<PlatformOrganizationRecord | null>;
  create(input: CreateOrganizationRecord): Promise<CreatedOrganizationRecord>;
  rename(id: string, name: string, groupId: string | null, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
  changeStatus(id: string, input: UpdateTenantStatusDto, actorUserId: string): Promise<PlatformOrganizationRecord | null>;
  // `modules` chega validada (só chaves do catálogo, sem repetição, na ordem do catálogo) e é o estado FINAL.
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
  // Em memória não há assinatura neste armazém nem trilha: a recusa por assinatura é a do serviço, e a trilha é só do
  // caminho Prisma (L3 do plano: em memória o console e o gate usam armazéns diferentes).
  async replaceModules(id: string, modules: readonly string[], _actorUserId: string, now: Date): Promise<ReplaceModulesResult> {
    const row = this.rows.get(id); if (!row) return { kind: "not_found" };
    const change = planModuleChange(row.modules, modules);
    if (!change) return { kind: "unchanged", organization: row };
    const updated = { ...row, modules: [...change.next], updatedAt: now }; this.rows.set(id, updated); return { kind: "changed", organization: updated };
  }
}

// B-PLANOS-MODULOS — "assinatura em vigor" para a porta de módulos: `valid_to` nulo, ou `valid_to` no futuro (a
// cancelada que ainda não terminou continua mandando). Uma regra só, para o serviço e para a transação.
export function subscriptionInForce(validTo: Date | null, now: Date): boolean {
  return validTo === null || validTo.getTime() > now.getTime();
}

// B-PLANOS-MODULOS — compara a lista atual (normalizada como o gate a lê) com a nova como CONJUNTO. Igual: `null` (o
// atalho de "sem mudança", nada se escreve). Diferente: a lista nova e a diferença para a trilha.
export function planModuleChange(currentModules: readonly string[], nextModules: readonly string[]): ModuleChange | null {
  const current = new Set(normalizeModuleKeys(currentModules));
  const wanted = new Set(nextModules);
  if (wanted.size === current.size && [...wanted].every((key) => current.has(key))) return null;
  const catalog = new Set(CANONICAL_MODULE_KEYS);
  return {
    next: CANONICAL_MODULE_KEYS.filter((key) => wanted.has(key)),
    added: CANONICAL_MODULE_KEYS.filter((key) => wanted.has(key) && !current.has(key)),
    removed: CANONICAL_MODULE_KEYS.filter((key) => current.has(key) && !wanted.has(key)),
    removedOther: [...current].filter((key) => !catalog.has(key) && !wanted.has(key)).length,
  };
}

export function normalizedOrganizationName(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
