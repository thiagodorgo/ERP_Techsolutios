// B-ASS-09 (F5) — grupo econômico e vínculo de organização a grupo: tipos, porta do repositório e dublê em memória.
//
// `economic_groups` é GLOBAL (o grupo não pertence a organização nenhuma); `economic_group_members` é DA ORGANIZAÇÃO, sob
// RLS FORCE. O caminho Prisma está em `economic-groups.prisma.ts`. As regras de vigência (quem pode entrar, sair, quando)
// são do serviço e de `membership.rules.ts`; este arquivo só guarda e devolve, e o DUBLÊ ESPELHA AS RESTRIÇÕES DO BANCO
// (M6), lançando o mesmo erro de domínio que o caminho Prisma lança para o SQLSTATE correspondente:
//   - `MembershipConflictError`  ⇐ 23P01, `EXCLUDE USING gist (tenant_id WITH =, daterange(valid_from, valid_to, '[)') WITH &&)`;
//   - `MembershipRangeError`     ⇐ 23514, `CHECK (valid_to IS NULL OR valid_to > valid_from)`;
//   - `GroupNameTakenError`      ⇐ 23505, índice único `lower(btrim(name)) WHERE deleted_at IS NULL`;
//   - `GroupNameCheckError`      ⇐ 23514, `CHECK (char_length(btrim(name)) BETWEEN 1 AND 120)`.
// Uma troca de vínculos (`applyMembershipChanges`) é tudo ou nada, nos dois caminhos.
//
// Datas de vigência são datas de negócio (São Paulo) no formato `AAAA-MM-DD`; o intervalo é `[validFrom, validTo)` e
// `validTo` nulo é aberto (infinito).

import { randomUUID } from "node:crypto";

export type EconomicGroup = {
  readonly id: string;
  readonly name: string;
  readonly notes: string | null;
  readonly createdBy: string | null;
  readonly updatedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt: Date | null;
};

export type EconomicGroupMembership = {
  readonly id: string;
  readonly tenantId: string;
  readonly groupId: string;
  /** `AAAA-MM-DD`, inclusivo. */
  readonly validFrom: string;
  /** `AAAA-MM-DD`, exclusivo; `null` = aberto. */
  readonly validTo: string | null;
  readonly createdBy: string | null;
  readonly closedBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type CreateGroupRecord = {
  readonly name: string;
  readonly notes: string | null;
  readonly createdBy: string | null;
};

export type UpdateGroupRecord = {
  readonly name?: string;
  readonly notes?: string | null;
  readonly updatedBy: string | null;
};

export type OpenMembershipRecord = {
  readonly tenantId: string;
  readonly groupId: string;
  readonly validFrom: string;
  readonly createdBy: string | null;
};

export type CloseMembershipRecord = {
  readonly tenantId: string;
  readonly membershipId: string;
  readonly validTo: string;
  readonly closedBy: string | null;
};

export type MembershipChanges = {
  /** Aplicados ANTES das aberturas: fechar o vínculo antigo e abrir o novo no mesmo dia é uma troca válida. */
  readonly closes: readonly CloseMembershipRecord[];
  readonly opens: readonly OpenMembershipRecord[];
};

export type MembershipChangesResult = {
  readonly closed: readonly EconomicGroupMembership[];
  readonly opened: readonly EconomicGroupMembership[];
};

export interface EconomicGroupsRepository {
  createGroup(input: CreateGroupRecord): Promise<EconomicGroup>;
  /** O grupo pelo id, inclusive o excluído (o serviço decide o que fazer com `deletedAt`). */
  getGroup(id: string): Promise<EconomicGroup | null>;
  /** Os grupos não excluídos, por nome. */
  listGroups(): Promise<EconomicGroup[]>;
  updateGroup(id: string, patch: UpdateGroupRecord): Promise<EconomicGroup | null>;
  softDeleteGroup(id: string, actorId: string | null, at: Date): Promise<EconomicGroup | null>;
  /** Todos os vínculos (abertos, fechados e agendados) das organizações pedidas, por organização e início. */
  listMembershipsOfTenants(tenantIds: readonly string[]): Promise<EconomicGroupMembership[]>;
  /** Fecha e abre vínculos numa unidade só: ou tudo vale, ou nada muda. */
  applyMembershipChanges(changes: MembershipChanges): Promise<MembershipChangesResult>;
}

/** 23P01 — a organização ficaria com dois vínculos no mesmo dia. A rota responde 409 `membership_conflict`. */
export class MembershipConflictError extends Error {
  readonly code = "membership_conflict";

  constructor(readonly tenantId: string | null) {
    super("membership_conflict: a organização já tem um vínculo de grupo que cruza esse período.");
    this.name = "MembershipConflictError";
  }
}

/** 23514 — vínculo com fim igual ou anterior ao início. */
export class MembershipRangeError extends Error {
  readonly code = "membership_range_invalid";

  constructor() {
    super("membership_range_invalid: o fim do vínculo tem de ser depois do início.");
    this.name = "MembershipRangeError";
  }
}

/** O vínculo a fechar não existe para aquela organização. */
export class MembershipNotFoundError extends Error {
  readonly code = "membership_not_found";

  constructor(readonly membershipId: string) {
    super("membership_not_found: vínculo de grupo não encontrado para a organização.");
    this.name = "MembershipNotFoundError";
  }
}

/** 23505 no índice único do nome entre os grupos não excluídos. A rota responde 409 `group_name_exists`. */
export class GroupNameTakenError extends Error {
  readonly code = "group_name_exists";

  constructor() {
    super("group_name_exists: já existe um grupo com esse nome.");
    this.name = "GroupNameTakenError";
  }
}

/** 23514 no CHECK do nome (1 a 120 caracteres depois do `btrim`). */
export class GroupNameCheckError extends Error {
  readonly code = "name_invalid";

  constructor() {
    super("name_invalid: o nome do grupo tem de ter de 1 a 120 caracteres.");
    this.name = "GroupNameCheckError";
  }
}

/** Espelho do `btrim(name)` do Postgres: tira só ESPAÇOS das pontas (não tabulação nem quebra de linha). */
export function btrimSpaces(name: string): string {
  return name.replace(/^ +/, "").replace(/ +$/, "");
}

/** Espelho do `lower(btrim(name))` do índice único da M6 (nomes ASCII; `lower` fora do ASCII depende do locale do banco). */
export function groupNameKey(name: string): string {
  return btrimSpaces(name).toLowerCase();
}

/** Espelho do `CHECK (char_length(btrim(name)) BETWEEN 1 AND 120)` da M6 (conta caracteres, não bytes). */
export function groupNameFitsCheck(name: string): boolean {
  const length = [...btrimSpaces(name)].length;
  return length >= 1 && length <= 120;
}

/** Espelho do `daterange(a.from, a.to, '[)') && daterange(b.from, b.to, '[)')`: limite superior nulo é infinito. */
export function rangesOverlap(
  a: { readonly validFrom: string; readonly validTo: string | null },
  b: { readonly validFrom: string; readonly validTo: string | null },
): boolean {
  return (b.validTo === null || a.validFrom < b.validTo) && (a.validTo === null || b.validFrom < a.validTo);
}

export class InMemoryEconomicGroupsRepository implements EconomicGroupsRepository {
  private readonly groups = new Map<string, EconomicGroup>();
  private memberships: EconomicGroupMembership[] = [];

  async createGroup(input: CreateGroupRecord): Promise<EconomicGroup> {
    this.assertNameFitsCheck(input.name);
    this.assertNameUnique(input.name, null);
    const now = new Date();
    const group: EconomicGroup = {
      id: randomUUID(),
      name: input.name,
      notes: input.notes,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.groups.set(group.id, group);
    return group;
  }

  async getGroup(id: string): Promise<EconomicGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listGroups(): Promise<EconomicGroup[]> {
    return [...this.groups.values()]
      .filter((group) => group.deletedAt === null)
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  }

  async updateGroup(id: string, patch: UpdateGroupRecord): Promise<EconomicGroup | null> {
    const existing = this.groups.get(id);
    if (!existing) return null;
    if (patch.name !== undefined) {
      this.assertNameFitsCheck(patch.name);
      if (existing.deletedAt === null) this.assertNameUnique(patch.name, id);
    }
    const updated: EconomicGroup = {
      ...existing,
      name: patch.name ?? existing.name,
      notes: patch.notes === undefined ? existing.notes : patch.notes,
      updatedBy: patch.updatedBy,
      updatedAt: new Date(),
    };
    this.groups.set(id, updated);
    return updated;
  }

  async softDeleteGroup(id: string, actorId: string | null, at: Date): Promise<EconomicGroup | null> {
    const existing = this.groups.get(id);
    if (!existing) return null;
    const deleted: EconomicGroup = { ...existing, deletedAt: existing.deletedAt ?? at, updatedBy: actorId, updatedAt: at };
    this.groups.set(id, deleted);
    return deleted;
  }

  async listMembershipsOfTenants(tenantIds: readonly string[]): Promise<EconomicGroupMembership[]> {
    const wanted = new Set(tenantIds);
    return this.memberships
      .filter((row) => wanted.has(row.tenantId))
      .sort((a, b) => (a.tenantId !== b.tenantId ? (a.tenantId < b.tenantId ? -1 : 1) : a.validFrom < b.validFrom ? -1 : a.validFrom > b.validFrom ? 1 : 0));
  }

  async applyMembershipChanges(changes: MembershipChanges): Promise<MembershipChangesResult> {
    // Tudo ou nada: aplica numa cópia e só troca o estado no fim, como a transação do caminho Prisma.
    const staged = [...this.memberships];
    const now = new Date();
    const closed: EconomicGroupMembership[] = [];
    for (const close of changes.closes) {
      const index = staged.findIndex((row) => row.id === close.membershipId && row.tenantId === close.tenantId);
      if (index < 0) throw new MembershipNotFoundError(close.membershipId);
      const updated: EconomicGroupMembership = { ...staged[index]!, validTo: close.validTo, closedBy: close.closedBy, updatedAt: now };
      this.assertRowConstraints(updated, staged.filter((_, i) => i !== index));
      staged[index] = updated;
      closed.push(updated);
    }
    const opened: EconomicGroupMembership[] = [];
    for (const open of changes.opens) {
      const row: EconomicGroupMembership = {
        id: randomUUID(),
        tenantId: open.tenantId,
        groupId: open.groupId,
        validFrom: open.validFrom,
        validTo: null,
        createdBy: open.createdBy,
        closedBy: null,
        createdAt: now,
        updatedAt: now,
      };
      this.assertRowConstraints(row, staged);
      staged.push(row);
      opened.push(row);
    }
    this.memberships = staged;
    return { closed, opened };
  }

  /** O CHECK e a exclusão da M6, contra as demais linhas. */
  private assertRowConstraints(row: EconomicGroupMembership, others: readonly EconomicGroupMembership[]): void {
    if (row.validTo !== null && !(row.validTo > row.validFrom)) {
      throw new MembershipRangeError();
    }
    if (others.some((other) => other.tenantId === row.tenantId && rangesOverlap(other, row))) {
      throw new MembershipConflictError(row.tenantId);
    }
  }

  private assertNameFitsCheck(name: string): void {
    if (!groupNameFitsCheck(name)) {
      throw new GroupNameCheckError();
    }
  }

  private assertNameUnique(name: string, exceptId: string | null): void {
    const key = groupNameKey(name);
    for (const group of this.groups.values()) {
      if (group.id !== exceptId && group.deletedAt === null && groupNameKey(group.name) === key) {
        throw new GroupNameTakenError();
      }
    }
  }
}
