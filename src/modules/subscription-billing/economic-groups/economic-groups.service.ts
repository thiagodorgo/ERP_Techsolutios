// B-ASS-09 (F5b) — serviço do grupo econômico: cadastro do grupo e vínculo de organizações por vigência (plano v2 §4.1
// R4–R10 e P9; Emenda 2 §1.4, §2.1 e §2.4; Emenda 2.1 §5). Sem HTTP: a rota (F6) só traduz o `SubscriptionBillingError`.
//
// As regras de vigência vêm de `membership.rules.ts` (F2) e NÃO se reescrevem aqui: `todayBusinessDate` (hoje em SP),
// `overlaps` (o vínculo cruza `[validFrom, ∞)`), `assertNotBeforeToday` e `assertCanClose` (P9). O serviço confere por
// intervalo; a corrida que passar pela conferência bate na exclusão da M6 (23P01), que o repositório devolve como
// `MembershipConflictError` → 409 `membership_conflict`. O CHECK do fim (23514) volta como `MembershipRangeError` → 422
// `membership_range_invalid`.
//
// `economic_group_members` está sob RLS FORCE: os vínculos de um grupo só se leem organização por organização. Por isso o
// serviço recebe a lista de organizações (`GroupTenantDirectory`, montada pela rota) e lê os vínculos de todas, numa
// transação, pelo repositório (`forEachTenantRls`). A trilha (`audit_logs` da organização) entra na MESMA transação da troca:
// o conteúdo vem montado de fora (`MembershipAuditBuilder`, F6, já pela allowlist) e o repositório só o grava.

import { SubscriptionBillingError } from "../plans/plan-types.js";
import {
  GroupNameCheckError,
  GroupNameTakenError,
  MembershipConflictError,
  MembershipNotFoundError,
  MembershipRangeError,
  type CloseMembershipRecord,
  type EconomicGroup,
  type EconomicGroupMembership,
  type EconomicGroupsRepository,
  type MembershipAuditEvent,
  type OpenMembershipRecord,
} from "./economic-groups.repository.js";
import {
  assertCanClose,
  assertNotBeforeToday,
  isMemberOn,
  MembershipRuleError,
  overlaps,
  todayBusinessDate,
} from "./membership.rules.js";

export const GROUP_NAME_MAX_LENGTH = 120;
export const GROUP_MEMBERS_MAX = 500;
export const PLATFORM_ORGANIZATION_SLUG = "platform";

const BUSINESS_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export type GroupTenantRef = { readonly id: string; readonly slug: string; readonly name: string };

/** As organizações que a rota conhece. `listTenantIds` alimenta a leitura dos vínculos sob RLS (organização por organização). */
export interface GroupTenantDirectory {
  getTenant(id: string): Promise<GroupTenantRef | null>;
  listTenantIds(): Promise<readonly string[]>;
}

export type MembershipAuditChange = {
  readonly kind: "joined" | "left";
  readonly tenantId: string;
  readonly groupId: string;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly actorId: string | null;
};

/** Monta o evento de trilha de uma entrada ou saída (a rota, F6, pela allowlist). Sem ele, a troca vai sem trilha. */
export type MembershipAuditBuilder = (change: MembershipAuditChange) => MembershipAuditEvent;

export type GroupView = {
  readonly id: string;
  readonly name: string;
  readonly notes: string | null;
  readonly memberCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type GroupMemberView = {
  readonly tenantId: string;
  readonly tenantName: string | null;
  readonly validFrom: string;
  readonly validTo: string | null;
  /** `true` quando o vínculo ainda não começou (`validFrom` depois de hoje, em SP). */
  readonly scheduled: boolean;
};

export type GroupDetail = GroupView & { readonly members: readonly GroupMemberView[] };

export type PutMembersInput = {
  readonly tenantIds: readonly string[];
  readonly validFrom?: string;
  readonly actorId: string | null;
};

export class EconomicGroupsService {
  constructor(
    private readonly repository: EconomicGroupsRepository,
    private readonly tenants: GroupTenantDirectory,
    private readonly clock: () => Date = () => new Date(),
    private readonly auditBuilder?: MembershipAuditBuilder,
  ) {}

  /** R4: os grupos não excluídos, com a contagem de membros vigentes hoje. */
  async listGroups(): Promise<GroupView[]> {
    const groups = await this.repository.listGroups();
    const memberships = await this.allMemberships();
    const today = todayBusinessDate(this.clock());
    return groups.map((group) => viewOf(group, memberships, today));
  }

  /** R5: 201; 409 `group_name_exists`; 422 `name_invalid`. */
  async createGroup(input: { readonly name: string; readonly notes?: string | null; readonly actorId: string | null }): Promise<GroupView> {
    const name = normalizeName(input.name);
    try {
      const group = await this.repository.createGroup({ name, notes: normalizeNotes(input.notes), createdBy: input.actorId });
      return viewOf(group, [], todayBusinessDate(this.clock()));
    } catch (error) {
      throw translateGroupError(error);
    }
  }

  /** R6: o grupo e os membros vigentes hoje e os já agendados; 404 `group_not_found`. */
  async getGroup(groupId: string): Promise<GroupDetail> {
    const group = await this.requireGroup(groupId);
    const memberships = await this.allMemberships();
    const today = todayBusinessDate(this.clock());
    const members = memberships.filter(
      (row) => row.groupId === group.id && (isMemberOn(row, today) || row.validFrom > today),
    );
    const names = await this.tenantNames(members.map((row) => row.tenantId));
    return {
      ...viewOf(group, memberships, today),
      members: members.map((row) => ({
        tenantId: row.tenantId,
        tenantName: names.get(row.tenantId) ?? null,
        validFrom: row.validFrom,
        validTo: row.validTo,
        scheduled: row.validFrom > today,
      })),
    };
  }

  /** R7: 404; 409 `group_name_exists`; 422 `name_invalid`. */
  async patchGroup(
    groupId: string,
    patch: { readonly name?: string; readonly notes?: string | null; readonly actorId: string | null },
  ): Promise<GroupView> {
    await this.requireGroup(groupId);
    try {
      const updated = await this.repository.updateGroup(groupId, {
        ...(patch.name === undefined ? {} : { name: normalizeName(patch.name) }),
        ...(patch.notes === undefined ? {} : { notes: normalizeNotes(patch.notes) }),
        updatedBy: patch.actorId,
      });
      if (!updated) throw groupNotFound();
      return viewOf(updated, await this.allMemberships(), todayBusinessDate(this.clock()));
    } catch (error) {
      throw translateGroupError(error);
    }
  }

  /** R8: exclusão lógica; 404; 422 `group_has_members` (membro vigente ou agendado). */
  async deleteGroup(groupId: string, actorId: string | null): Promise<GroupView> {
    const group = await this.requireGroup(groupId);
    const memberships = await this.allMemberships();
    const today = todayBusinessDate(this.clock());
    if (memberships.some((row) => row.groupId === group.id && overlaps(row, today))) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "group_has_members",
        "O grupo tem organização vigente ou agendada: tire-a antes de excluir.",
      );
    }
    const deleted = await this.repository.softDeleteGroup(group.id, actorId, this.clock());
    if (!deleted) throw groupNotFound();
    return viewOf(deleted, memberships, today);
  }

  /**
   * R9 (P9): o conjunto de membros do grupo passa a ser exatamente `tenantIds` a partir de `validFrom` (padrão: hoje em SP).
   * Abre vínculo para quem entra e fecha (`valid_to = validFrom`) quem sai; o mesmo conjunto não muda nada.
   * 404 `group_not_found`, `tenant_not_found`; 422 `tenant_in_another_group`, `membership_retroactive`,
   * `platform_organization`, `too_many_members`, `membership_range_invalid`; 409 `membership_conflict`.
   */
  async putMembers(groupId: string, input: PutMembersInput): Promise<GroupDetail> {
    const group = await this.requireGroup(groupId);
    const desired = [...new Set(input.tenantIds)];
    if (desired.length > GROUP_MEMBERS_MAX) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "too_many_members",
        `Um grupo tem no máximo ${GROUP_MEMBERS_MAX} organizações.`,
      );
    }
    for (const tenantId of desired) {
      const tenant = await this.tenants.getTenant(tenantId);
      if (!tenant) {
        throw new SubscriptionBillingError(404, "NOT_FOUND", "tenant_not_found", "Organização não encontrada.");
      }
      if (tenant.slug === PLATFORM_ORGANIZATION_SLUG) {
        throw new SubscriptionBillingError(
          422,
          "SUBSCRIPTION_BILLING_INVALID",
          "platform_organization",
          "A organização da plataforma não entra em grupo.",
        );
      }
    }
    const today = todayBusinessDate(this.clock());
    const validFrom = input.validFrom ?? today;
    if (typeof validFrom !== "string" || !BUSINESS_DATE_PATTERN.test(validFrom)) {
      throw new SubscriptionBillingError(400, "SUBSCRIPTION_BILLING_INVALID", "invalid_valid_from", "Data inválida: use AAAA-MM-DD.");
    }

    try {
      assertNotBeforeToday(validFrom, today);
      const memberships = await this.allMemberships();
      const wanted = new Set(desired);
      const inGroup = memberships.filter((row) => row.groupId === group.id && overlaps(row, validFrom));

      // Quem sai: o vínculo deste grupo que ainda vale em `validFrom` ou depois fecha em `validFrom` (P9).
      const closes: CloseMembershipRecord[] = [];
      for (const row of inGroup.filter((r) => !wanted.has(r.tenantId))) {
        assertCanClose(row, validFrom);
        closes.push({ tenantId: row.tenantId, membershipId: row.id, validTo: validFrom, closedBy: input.actorId });
      }

      // Quem entra: só se NENHUM vínculo dele em outro grupo cruzar `[validFrom, ∞)`, inclusive os fechados no futuro.
      const entering = desired.filter((tenantId) => !inGroup.some((row) => row.tenantId === tenantId && row.validTo === null));
      const inAnotherGroup = entering.filter((tenantId) =>
        memberships.some((row) => row.tenantId === tenantId && row.groupId !== group.id && overlaps(row, validFrom)),
      );
      if (inAnotherGroup.length > 0) throw tenantInAnotherGroup(inAnotherGroup);
      const opens: OpenMembershipRecord[] = entering.map((tenantId) => ({
        tenantId,
        groupId: group.id,
        // Já é membro com saída agendada: o vínculo continua a partir da saída, sem buraco e sem cruzar (leitura do dev).
        validFrom: continuationStart(inGroup, tenantId) ?? validFrom,
        createdBy: input.actorId,
      }));

      if (closes.length > 0 || opens.length > 0) {
        await this.repository.applyMembershipChanges({ closes, opens, audit: this.auditOf(group.id, closes, opens, input.actorId) });
      }
    } catch (error) {
      if (error instanceof MembershipConflictError) throw membershipConflict();
      if (error instanceof MembershipRangeError) throw rangeInvalid();
      if (error instanceof MembershipNotFoundError) throw membershipConflict();
      if (error instanceof MembershipRuleError) throw ruleError(error);
      throw error;
    }
    return this.getGroup(group.id);
  }

  /** R10: todas as linhas do grupo, inclusive as fechadas e as agendadas, por início. */
  async history(groupId: string): Promise<GroupMemberView[]> {
    const group = await this.requireGroup(groupId);
    const today = todayBusinessDate(this.clock());
    const rows = (await this.allMemberships())
      .filter((row) => row.groupId === group.id)
      .sort((a, b) => (a.validFrom !== b.validFrom ? (a.validFrom < b.validFrom ? -1 : 1) : a.tenantId < b.tenantId ? -1 : 1));
    const names = await this.tenantNames(rows.map((row) => row.tenantId));
    return rows.map((row) => ({
      tenantId: row.tenantId,
      tenantName: names.get(row.tenantId) ?? null,
      validFrom: row.validFrom,
      validTo: row.validTo,
      scheduled: row.validFrom > today,
    }));
  }

  private async requireGroup(groupId: string): Promise<EconomicGroup> {
    const group = await this.repository.getGroup(groupId);
    if (!group || group.deletedAt !== null) throw groupNotFound();
    return group;
  }

  private async allMemberships(): Promise<EconomicGroupMembership[]> {
    return this.repository.listMembershipsOfTenants(await this.tenants.listTenantIds());
  }

  private async tenantNames(tenantIds: readonly string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    for (const tenantId of new Set(tenantIds)) {
      const tenant = await this.tenants.getTenant(tenantId);
      if (tenant) names.set(tenantId, tenant.name);
    }
    return names;
  }

  private auditOf(
    groupId: string,
    closes: readonly CloseMembershipRecord[],
    opens: readonly OpenMembershipRecord[],
    actorId: string | null,
  ): MembershipAuditEvent[] | undefined {
    const build = this.auditBuilder;
    if (!build) return undefined;
    return [
      ...closes.map((close) =>
        build({ kind: "left", tenantId: close.tenantId, groupId, validFrom: close.validTo, validTo: close.validTo, actorId }),
      ),
      ...opens.map((open) => build({ kind: "joined", tenantId: open.tenantId, groupId, validFrom: open.validFrom, validTo: null, actorId })),
    ];
  }
}

/** O vínculo deste grupo que termina no futuro (saída agendada): o novo começa no fim dele. */
function continuationStart(inGroup: readonly EconomicGroupMembership[], tenantId: string): string | null {
  const scheduledExit = inGroup.find((row) => row.tenantId === tenantId && row.validTo !== null);
  return scheduledExit?.validTo ?? null;
}

function viewOf(group: EconomicGroup, memberships: readonly EconomicGroupMembership[], today: string): GroupView {
  return {
    id: group.id,
    name: group.name,
    notes: group.notes,
    memberCount: memberships.filter((row) => row.groupId === group.id && isMemberOn(row, today)).length,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function normalizeName(raw: string): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  if ([...name].length < 1 || [...name].length > GROUP_NAME_MAX_LENGTH) throw nameInvalid();
  return name;
}

function normalizeNotes(raw: string | null | undefined): string | null {
  if (raw === undefined || raw === null) return null;
  const notes = String(raw).trim();
  return notes.length > 0 ? notes : null;
}

function translateGroupError(error: unknown): unknown {
  if (error instanceof GroupNameTakenError) {
    return new SubscriptionBillingError(409, "CONFLICT", "group_name_exists", "Já existe um grupo com esse nome.");
  }
  if (error instanceof GroupNameCheckError) return nameInvalid();
  return error;
}

function nameInvalid(): SubscriptionBillingError {
  return new SubscriptionBillingError(
    422,
    "SUBSCRIPTION_BILLING_INVALID",
    "name_invalid",
    `O nome do grupo tem de ter de 1 a ${GROUP_NAME_MAX_LENGTH} caracteres.`,
  );
}

function groupNotFound(): SubscriptionBillingError {
  return new SubscriptionBillingError(404, "NOT_FOUND", "group_not_found", "Grupo não encontrado.");
}

function tenantInAnotherGroup(tenantIds: readonly string[]): SubscriptionBillingError {
  const error = new SubscriptionBillingError(
    422,
    "SUBSCRIPTION_BILLING_INVALID",
    "tenant_in_another_group",
    "Uma ou mais organizações já estão em outro grupo nesse período.",
  );
  return Object.assign(error, { tenantIds: [...tenantIds] });
}

function membershipConflict(): SubscriptionBillingError {
  return new SubscriptionBillingError(
    409,
    "CONFLICT",
    "membership_conflict",
    "Outra troca de grupo da mesma organização chegou antes: leia de novo e repita.",
  );
}

function rangeInvalid(): SubscriptionBillingError {
  return new SubscriptionBillingError(
    422,
    "SUBSCRIPTION_BILLING_INVALID",
    "membership_range_invalid",
    "O fim do vínculo tem de ser depois do início.",
  );
}

function ruleError(error: MembershipRuleError): SubscriptionBillingError {
  return new SubscriptionBillingError(422, "SUBSCRIPTION_BILLING_INVALID", error.reason, error.message);
}
