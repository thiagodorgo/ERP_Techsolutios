import { env } from "../../config/env.js";
import type { ICoreSaasService } from "../core-saas/services/core-saas-service.interface.js";
import {
  InMemoryPlatformTenantDetailRepository,
  type PlatformTenantDetailRepository,
} from "./platform-tenant-detail.repository.js";
import type { PlatformTenantDetail } from "./platform-tenant-detail.types.js";
import type { PlatformTenantDetailSubscription } from "./platform-tenant-detail.types.js";

export type PlatformTenantSubscriptionResolver = (
  tenantId: string,
) => Promise<PlatformTenantDetailSubscription | null>;

export class PlatformTenantDetailService {
  constructor(
    private readonly repository: PlatformTenantDetailRepository,
    private readonly resolveSubscription: PlatformTenantSubscriptionResolver = async () => null,
  ) {}

  async getDetail(tenantId: string): Promise<PlatformTenantDetail | null> {
    const detail = await this.repository.getDetail(tenantId);
    if (!detail) return null;
    const subscription = await this.resolveSubscription(tenantId);
    return {
      ...detail,
      subscription: subscription
        ? {
            ...subscription,
            modules: detail.modules.filter((module) => module.enabled).map((module) => module.key),
          }
        : null,
    };
  }
}

export type PlatformTenantDetailServiceResolver = () => Promise<PlatformTenantDetailService>;

// Store de memória vazio → detalhe honesto (qualquer id → null → 404) em dev/teste sem Postgres.
const memoryRepository = new InMemoryPlatformTenantDetailRepository();
let defaultServicePromise: Promise<PlatformTenantDetailService> | undefined;

export function createMemoryPlatformTenantDetailService(): PlatformTenantDetailService {
  return new PlatformTenantDetailService(memoryRepository);
}

// Persistence-aware, espelhando o overview: memória em dev/teste; Prisma real (org por id + usuários
// da org sob RLS) só quando persistence=prisma. O caminho Prisma NUNCA é incondicional (não subiria o
// app sem Postgres no teste).
export async function createDefaultPlatformTenantDetailService(
  coreSaasService?: ICoreSaasService,
): Promise<PlatformTenantDetailService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPlatformTenantDetailService();
  }

  defaultServicePromise ??= createPrismaPlatformTenantDetailService(coreSaasService);

  return defaultServicePromise;
}

// O InMemory é stateless; só o cache do service Prisma precisa ser limpo entre testes.
export function resetPlatformTenantDetailRuntimeForTests(): void {
  defaultServicePromise = undefined;
}

async function createPrismaPlatformTenantDetailService(
  coreSaasService?: ICoreSaasService,
): Promise<PlatformTenantDetailService> {
  const { createPrismaPlatformTenantDetailRepository } = await import(
    "./platform-tenant-detail-prisma.repository.js"
  );

  const [{ createDefaultSubscriptionsService }, { centsToMoney, storageGbToDecimal }] =
    await Promise.all([
      import("../subscription-billing/subscription-billing.service.js"),
      import("../subscription-billing/plans/plan-money.js"),
    ]);
  const subscriptions = await createDefaultSubscriptionsService();

  return new PlatformTenantDetailService(
    await createPrismaPlatformTenantDetailRepository(coreSaasService),
    async (tenantId) => {
      const view = await subscriptions.getSubscription(tenantId);
      if (!view) return null;
      const current = view.subscription;
      return {
        planCode: view.plan.code,
        planName: view.plan.name,
        validFrom: current.validFrom.toISOString(),
        overrides: {
          monthlyPrice:
            current.monthlyPriceOverrideCents === null
              ? null
              : centsToMoney(current.monthlyPriceOverrideCents),
          includedUsers: current.includedUsersOverride,
          includedStorageGb:
            current.includedStorageGbOverride === null
              ? null
              : storageGbToDecimal(current.includedStorageGbOverride),
          extraUserPrice:
            current.extraUserPriceOverrideCents === null
              ? null
              : centsToMoney(current.extraUserPriceOverrideCents),
          extraGbPrice:
            current.extraGbPriceOverrideCents === null
              ? null
              : centsToMoney(current.extraGbPriceOverrideCents),
        },
        addons: view.addons.map((addon) => ({
          planCode: addon.plan.code,
          planName: addon.plan.name,
          validFrom: addon.validFrom.toISOString(),
          perVehiclePriceOverride:
            addon.perVehiclePriceOverrideCents === null
              ? null
              : centsToMoney(addon.perVehiclePriceOverrideCents),
        })),
        modules: [],
      };
    },
  );
}
