import type { PlatformOverview, PlatformOverviewOrg } from "./platform-overview.types.js";

export interface PlatformOverviewRepository {
  getOverview(): Promise<PlatformOverview>;
}

// Seed para dev/teste do caminho memória. `userIds` são os usuários DAQUELA organização — a contagem
// é DERIVADA (nunca fabricada). Isso permite provar, no teste de isolamento, que userCount de uma org
// conta SÓ os usuários dela e que totalUsers = Σ das orgs (sem contaminação cruzada).
export type InMemoryPlatformOverviewSeed = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly modules?: readonly string[];
  readonly createdAt?: Date | string;
  readonly userIds?: readonly string[];
};

// Caminho memória/teste: SEM Postgres. Sem seed → agregado vazio honesto (orgs: [], contagens 0).
// Com seed → agrega por organização, exatamente como o caminho Prisma (mesma semântica).
export class InMemoryPlatformOverviewRepository implements PlatformOverviewRepository {
  constructor(private readonly seeds: readonly InMemoryPlatformOverviewSeed[] = []) {}

  async getOverview(): Promise<PlatformOverview> {
    let totalUsers = 0;
    let activeOrgs = 0;

    const orgs: PlatformOverviewOrg[] = this.seeds.map((seed) => {
      // Conta APENAS os usuários da própria organização — isolamento por construção.
      const userCount = seed.userIds?.length ?? 0;
      totalUsers += userCount;

      if (seed.status === "active") {
        activeOrgs += 1;
      }

      return {
        id: seed.id,
        name: seed.name,
        ...(seed.slug ? { slug: seed.slug } : {}),
        status: seed.status,
        moduleCount: seed.modules?.length ?? 0,
        userCount,
        createdAt: toIso(seed.createdAt),
      };
    });

    return {
      activeOrgs,
      totalOrgs: this.seeds.length,
      totalUsers,
      orgs,
    };
  }
}

function toIso(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return new Date(0).toISOString();
}
