import { mapTenantModuleFlags } from "./platform-modules.service.js";
import type {
  PlatformTenantDetail,
  PlatformTenantDetailUser,
} from "./platform-tenant-detail.types.js";

export interface PlatformTenantDetailRepository {
  // Org inexistente → null (a rota traduz para 404, sem confirmar existência de terceiros).
  getDetail(tenantId: string): Promise<PlatformTenantDetail | null>;
}

// Seed do usuário para dev/teste do caminho memória. `roles` são TÉCNICOS (o DTO deriva o rótulo).
export type InMemoryPlatformTenantDetailUserSeed = {
  readonly name: string;
  readonly email: string;
  readonly roles?: readonly string[];
  readonly status?: string;
};

// Seed da org: os `users` são SEMPRE os da própria org — o teste de isolamento prova que getDetail(A)
// nunca devolve usuário de B (isolamento por construção, espelhando o withTenantRls do caminho Prisma).
export type InMemoryPlatformTenantDetailSeed = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly status: string;
  readonly modules?: readonly string[];
  readonly createdAt?: Date | string;
  readonly users?: readonly InMemoryPlatformTenantDetailUserSeed[];
};

// Caminho memória/teste: SEM Postgres. Sem seed → qualquer id devolve null (honesto → 404). Com seed →
// mesma semântica do caminho Prisma (catálogo de módulos com flags + usuários só da própria org).
export class InMemoryPlatformTenantDetailRepository implements PlatformTenantDetailRepository {
  constructor(private readonly seeds: readonly InMemoryPlatformTenantDetailSeed[] = []) {}

  async getDetail(tenantId: string): Promise<PlatformTenantDetail | null> {
    const seed = this.seeds.find((item) => item.id === tenantId);

    if (!seed) {
      return null;
    }

    const modules = mapTenantModuleFlags(seed.modules ?? []);
    const users: PlatformTenantDetailUser[] = (seed.users ?? []).map((user) => ({
      name: user.name,
      email: user.email,
      roles: user.roles ?? [],
      status: user.status ?? "active",
    }));

    return {
      id: seed.id,
      name: seed.name,
      ...(seed.slug ? { slug: seed.slug } : {}),
      status: seed.status,
      createdAt: toIso(seed.createdAt),
      moduleCount: modules.filter((module) => module.enabled).length,
      modules,
      users,
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
