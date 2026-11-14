// B-ASS-09 (F5) — grupo econômico e vínculo de organização a grupo no Prisma (caminho de produção).
//
// `economic_groups` é GLOBAL: sem GUC. `economic_group_members` é DA ORGANIZAÇÃO, sob RLS FORCE: toda leitura e escrita
// passa por `forEachTenantRls` (`src/database/rls.ts`), que troca o GUC `app.current_tenant_id` como 1ª instrução de cada
// volta, numa transação só. Sob o papel de runtime NOSUPERUSER NOBYPASSRLS, sem o GUC a política devolve zero linhas e
// recusa a escrita; a leitura ainda passa pelo canário `assertRowsBelongToTenant`.
//
// Uma troca de vínculos (`applyMembershipChanges`) é uma transação: os fechamentos antes das aberturas, organização por
// organização. A exclusão da M6 é a última palavra sobre "dois grupos no mesmo dia": o SQLSTATE 23P01 vira
// `MembershipConflictError` (a rota responde 409 `membership_conflict`) e a transação inteira volta. O dublê em memória
// (`economic-groups.repository.ts`) lança os mesmos erros para as mesmas entradas.

import type { PrismaClient } from "@prisma/client";

import { assertRowsBelongToTenant, forEachTenantRls } from "../../../database/rls.js";
import {
  GroupNameCheckError,
  GroupNameTakenError,
  MembershipConflictError,
  MembershipNotFoundError,
  MembershipRangeError,
  type CloseMembershipRecord,
  type CreateGroupRecord,
  type EconomicGroup,
  type EconomicGroupMembership,
  type EconomicGroupsRepository,
  type MembershipChanges,
  type MembershipChangesResult,
  type OpenMembershipRecord,
  type UpdateGroupRecord,
} from "./economic-groups.repository.js";

const MEMBERS_TABLE = "economic_group_members";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GroupRow = {
  readonly id: string;
  readonly name: string;
  readonly notes: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
};

type MembershipRow = {
  readonly id: string;
  readonly tenant_id: string;
  readonly group_id: string;
  readonly valid_from: Date;
  readonly valid_to: Date | null;
  readonly created_by: string | null;
  readonly closed_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

export class PrismaEconomicGroupsRepository implements EconomicGroupsRepository {
  constructor(private readonly client: PrismaClient) {}

  async createGroup(input: CreateGroupRecord): Promise<EconomicGroup> {
    try {
      const row = await this.client.economicGroup.create({
        data: { name: input.name, notes: input.notes, created_by: actorColumn(input.createdBy), updated_by: actorColumn(input.createdBy) },
      });
      return mapGroup(row);
    } catch (error) {
      throw mapGroupError(error);
    }
  }

  async getGroup(id: string): Promise<EconomicGroup | null> {
    if (!UUID_PATTERN.test(id)) return null;
    const row = await this.client.economicGroup.findUnique({ where: { id } });
    return row ? mapGroup(row) : null;
  }

  async listGroups(): Promise<EconomicGroup[]> {
    const rows = await this.client.economicGroup.findMany({ where: { deleted_at: null }, orderBy: { name: "asc" } });
    return rows.map(mapGroup);
  }

  async updateGroup(id: string, patch: UpdateGroupRecord): Promise<EconomicGroup | null> {
    if (!UUID_PATTERN.test(id)) return null;
    const existing = await this.client.economicGroup.findUnique({ where: { id } });
    if (!existing) return null;
    try {
      const row = await this.client.economicGroup.update({
        where: { id },
        data: {
          ...(patch.name === undefined ? {} : { name: patch.name }),
          ...(patch.notes === undefined ? {} : { notes: patch.notes }),
          updated_by: actorColumn(patch.updatedBy),
        },
      });
      return mapGroup(row);
    } catch (error) {
      throw mapGroupError(error);
    }
  }

  async softDeleteGroup(id: string, actorId: string | null, at: Date): Promise<EconomicGroup | null> {
    if (!UUID_PATTERN.test(id)) return null;
    const existing = await this.client.economicGroup.findUnique({ where: { id } });
    if (!existing) return null;
    const row = await this.client.economicGroup.update({
      where: { id },
      data: { deleted_at: existing.deleted_at ?? at, updated_by: actorColumn(actorId) },
    });
    return mapGroup(row);
  }

  async listMembershipsOfTenants(tenantIds: readonly string[]): Promise<EconomicGroupMembership[]> {
    return forEachTenantRls(this.client, uniqueSorted(tenantIds), async (tx, tenantId) => {
      const rows = await tx.economicGroupMember.findMany({ where: { tenant_id: tenantId }, orderBy: { valid_from: "asc" } });
      const memberships = rows.map(mapMembership);
      assertRowsBelongToTenant(memberships, tenantId, MEMBERS_TABLE);
      return memberships;
    });
  }

  async applyMembershipChanges(changes: MembershipChanges): Promise<MembershipChangesResult> {
    const tenants = uniqueSorted([...changes.closes.map((c) => c.tenantId), ...changes.opens.map((o) => o.tenantId)]);
    type Applied = { readonly kind: "closed" | "opened"; readonly index: number; readonly row: EconomicGroupMembership };
    let applied: Applied[];
    try {
      applied = await forEachTenantRls(this.client, tenants, async (tx, tenantId) => {
        const out: Applied[] = [];
        try {
          for (const [index, close] of indexed(changes.closes, tenantId)) {
            const updated = await tx.economicGroupMember.updateMany({
              where: { id: close.membershipId, tenant_id: tenantId },
              data: { valid_to: dateColumn(close.validTo), closed_by: actorColumn(close.closedBy) },
            });
            if (updated.count !== 1) throw new MembershipNotFoundError(close.membershipId);
            const row = await tx.economicGroupMember.findFirst({ where: { id: close.membershipId, tenant_id: tenantId } });
            out.push({ kind: "closed", index, row: mapMembership(row!) });
          }
          for (const [index, open] of indexed(changes.opens, tenantId)) {
            const row = await tx.economicGroupMember.create({
              data: {
                tenant_id: tenantId,
                group_id: open.groupId,
                valid_from: dateColumn(open.validFrom),
                created_by: actorColumn(open.createdBy),
              },
            });
            out.push({ kind: "opened", index, row: mapMembership(row) });
          }
        } catch (error) {
          throw mapMembershipError(error, tenantId);
        }
        assertRowsBelongToTenant(out.map((item) => item.row), tenantId, MEMBERS_TABLE);
        return out;
      });
    } catch (error) {
      throw mapMembershipError(error, null);
    }
    const pick = (kind: Applied["kind"]): EconomicGroupMembership[] =>
      applied
        .filter((item) => item.kind === kind)
        .sort((a, b) => a.index - b.index)
        .map((item) => item.row);
    return { closed: pick("closed"), opened: pick("opened") };
  }
}

/** O SQLSTATE do Postgres por baixo do erro do Prisma 7 com `@prisma/adapter-pg` (forma medida no cluster do bloco). */
export function sqlStateOf(error: unknown): string | null {
  const e = error as {
    code?: unknown;
    cause?: { originalCode?: unknown };
    meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } };
  } | null;
  const fromCause = e?.cause?.originalCode ?? e?.meta?.driverAdapterError?.cause?.originalCode;
  if (typeof fromCause === "string") return fromCause;
  if (e?.code === "P2002") return "23505";
  return null;
}

function errorText(error: unknown): string {
  const e = error as { message?: unknown; meta?: { driverAdapterError?: { cause?: { originalMessage?: unknown } } } } | null;
  return `${String(e?.message ?? "")} ${String(e?.meta?.driverAdapterError?.cause?.originalMessage ?? "")}`;
}

function mapGroupError(error: unknown): unknown {
  const state = sqlStateOf(error);
  if (state === "23505" && errorText(error).includes("economic_groups_name_active_key")) return new GroupNameTakenError();
  if (state === "23505" && (error as { code?: unknown })?.code === "P2002") return new GroupNameTakenError();
  if (state === "23514" && errorText(error).includes("economic_groups_name_check")) return new GroupNameCheckError();
  return error;
}

function mapMembershipError(error: unknown, tenantId: string | null): unknown {
  if (
    error instanceof MembershipConflictError ||
    error instanceof MembershipRangeError ||
    error instanceof MembershipNotFoundError
  ) {
    return error;
  }
  const state = sqlStateOf(error);
  if (state === "23P01") return new MembershipConflictError(tenantId);
  if (state === "23514" && errorText(error).includes("economic_group_members_valid_to_check")) return new MembershipRangeError();
  return error;
}

function* indexed<T extends CloseMembershipRecord | OpenMembershipRecord>(
  items: readonly T[],
  tenantId: string,
): Generator<[number, T]> {
  for (let index = 0; index < items.length; index += 1) {
    if (items[index]!.tenantId === tenantId) yield [index, items[index]!];
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

/** As colunas de ator são `uuid`: ator que não é UUID (o de teste em memória) grava `NULL`, como no demonstrativo. */
function actorColumn(value: string | null): string | null {
  return value !== null && UUID_PATTERN.test(value) ? value : null;
}

/** `AAAA-MM-DD` (data de negócio) → o `Date` que o Prisma grava numa coluna `date` sem deslocar o dia. */
function dateColumn(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function dayOf(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function mapGroup(row: GroupRow): EconomicGroup {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function mapMembership(row: MembershipRow): EconomicGroupMembership {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    groupId: row.group_id,
    validFrom: dayOf(row.valid_from),
    validTo: row.valid_to === null ? null : dayOf(row.valid_to),
    createdBy: row.created_by,
    closedBy: row.closed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
