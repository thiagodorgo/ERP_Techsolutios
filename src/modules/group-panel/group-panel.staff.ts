// B-GRUPO-GESTOR (1a, F3) — contagens de funcionários, em funções puras.
//
// A identidade é usada somente como chave interna de deduplicação. Nenhuma identidade, nome ou e-mail sai no DTO.

export const STAFF_IN_SERVICE_STATUSES = ["on_route", "on_site", "in_progress"] as const;

export type GroupPanelStaffRow = {
  readonly userId: string;
  /** Chave da mesma pessoa entre pátios. Nula só para usuário legado ainda sem vínculo normalizado. */
  readonly identityId: string | null;
  /** Fallback tenant-scoped (`tenantId:userId`), que nunca une pessoas por e-mail. */
  readonly localKey: string;
  readonly active: boolean;
  readonly profiles: readonly string[];
};

export type GroupPanelStaff = {
  readonly activeUsers: number;
  readonly byProfile: readonly { readonly profile: string; readonly count: number }[];
  readonly inServiceNow: number;
};

/** Chaves internas necessárias para a consolidação distinta do grupo. Nunca saem no DTO. */
export type GroupPanelStaffComputed = GroupPanelStaff & {
  readonly people: readonly { readonly key: string; readonly profiles: readonly string[] }[];
  readonly inServicePeople: readonly string[];
};

export function computeStaff(rows: readonly GroupPanelStaffRow[], inServiceUserIds: readonly string[]): GroupPanelStaffComputed {
  const active = rows.filter((row) => row.active);
  const people = new Map<string, Set<string>>();
  const personByUser = new Map<string, string>();

  for (const row of active) {
    const personKey = row.identityId ?? row.localKey;
    personByUser.set(row.userId, personKey);
    const profiles = people.get(personKey) ?? new Set<string>();
    for (const profile of row.profiles) profiles.add(profile);
    people.set(personKey, profiles);
  }

  const inServicePeople = new Set<string>();
  for (const userId of inServiceUserIds) {
    const personKey = personByUser.get(userId);
    if (personKey) inServicePeople.add(personKey);
  }

  return buildStaff(people, inServicePeople);
}

export function consolidateStaff(blocks: readonly GroupPanelStaffComputed[]): GroupPanelStaffComputed {
  const people = new Map<string, Set<string>>();
  const inServicePeople = new Set<string>();

  for (const block of blocks) {
    for (const person of block.people) {
      const profiles = people.get(person.key) ?? new Set<string>();
      for (const profile of person.profiles) profiles.add(profile);
      people.set(person.key, profiles);
    }
    for (const key of block.inServicePeople) inServicePeople.add(key);
  }

  return buildStaff(people, inServicePeople);
}

export function publicStaff(value: GroupPanelStaffComputed): GroupPanelStaff {
  const { people: _people, inServicePeople: _inService, ...result } = value;
  return result;
}

function buildStaff(people: ReadonlyMap<string, ReadonlySet<string>>, inServicePeople: ReadonlySet<string>): GroupPanelStaffComputed {
  const byProfile = new Map<string, number>();
  for (const profiles of people.values()) {
    for (const profile of profiles) byProfile.set(profile, (byProfile.get(profile) ?? 0) + 1);
  }

  return {
    activeUsers: people.size,
    byProfile: [...byProfile.entries()]
      .sort(([left], [right]) => left.localeCompare(right, "pt-BR"))
      .map(([profile, count]) => ({ profile, count })),
    inServiceNow: inServicePeople.size,
    people: [...people.entries()].map(([key, profiles]) => ({ key, profiles: [...profiles].sort() })),
    inServicePeople: [...inServicePeople].sort(),
  };
}
