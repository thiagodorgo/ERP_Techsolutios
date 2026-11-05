// B-ASS-02 — factories persistence-aware (padrão cloud-cost-allocation). Em memória (dev/teste);
// Prisma quando CORE_SAAS_PERSISTENCE=prisma (chega na F4).

import { env } from "../../config/env.js";
import { InMemoryPlansRepository, type PlansRepository } from "./plans/plans.repository.js";
import { PlansService } from "./plans/plans.service.js";
import {
  InMemorySubscriptionsRepository,
  type SubscriptionsRepository,
} from "./plans/subscriptions.repository.js";
import {
  SubscriptionsService,
  type TenantLookup,
  type TenantRef,
} from "./plans/subscriptions.service.js";
import {
  RecordingTenantModulesWriter,
  type TenantModulesWriter,
} from "./plans/tenant-modules.sync.js";
import { RecordingPlatformAuditWriter } from "./plans/platform-audit.js";

export class InMemoryTenantLookup implements TenantLookup {
  private readonly tenants = new Map<string, TenantRef>();

  constructor(seed: readonly TenantRef[] = []) {
    for (const tenant of seed) {
      this.tenants.set(tenant.id, tenant);
    }
  }

  async getTenantById(id: string): Promise<TenantRef | null> {
    return this.tenants.get(id) ?? null;
  }

  upsert(tenant: TenantRef): void {
    this.tenants.set(tenant.id, tenant);
  }
}

const memoryPlans = new InMemoryPlansRepository();
const memorySubscriptions = new InMemorySubscriptionsRepository();
const memoryTenants = new InMemoryTenantLookup();
const memoryModulesWriter = new RecordingTenantModulesWriter();
const memoryPlatformAudit = new RecordingPlatformAuditWriter();

export function getMemoryPlansRepositoryForTests(): InMemoryPlansRepository {
  return memoryPlans;
}

export function getMemorySubscriptionsRepositoryForTests(): InMemorySubscriptionsRepository {
  return memorySubscriptions;
}

export function getMemoryTenantLookupForTests(): InMemoryTenantLookup {
  return memoryTenants;
}

export function getMemoryTenantModulesWriterForTests(): RecordingTenantModulesWriter {
  return memoryModulesWriter;
}

export function getMemoryPlatformAuditWriterForTests(): RecordingPlatformAuditWriter {
  return memoryPlatformAudit;
}

export function createMemoryPlansService(): PlansService {
  return new PlansService(memoryPlans, undefined, undefined, memoryPlatformAudit);
}

export function createMemorySubscriptionsService(): SubscriptionsService {
  return new SubscriptionsService(
    memorySubscriptions,
    memoryPlans,
    memoryTenants,
    memoryModulesWriter,
  );
}

let defaultPlansServicePromise: Promise<PlansService> | undefined;
let defaultSubscriptionsServicePromise: Promise<SubscriptionsService> | undefined;

export async function createDefaultPlansService(): Promise<PlansService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryPlansService();
  }

  defaultPlansServicePromise ??= createPrismaPlansService();
  return defaultPlansServicePromise;
}

export async function createDefaultSubscriptionsService(): Promise<SubscriptionsService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemorySubscriptionsService();
  }

  defaultSubscriptionsServicePromise ??= createPrismaSubscriptionsService();
  return defaultSubscriptionsServicePromise;
}

export function resetSubscriptionBillingRuntimeForTests(): void {
  defaultPlansServicePromise = undefined;
  defaultSubscriptionsServicePromise = undefined;
}

async function createPrismaPlansService(): Promise<PlansService> {
  const [plansModule, subscriptionsModule, modulesWriterModule, synchronizerModule] =
    await Promise.all([
      import("./plans/plans-prisma.repository.js"),
      import("./plans/subscriptions-prisma.repository.js"),
      import("./plans/tenant-modules.prisma.js"),
      import("./plans/tenant-modules.sync.js"),
    ]);
  const { prisma } = await import("../../database/prisma.js");
  const plans = new plansModule.PrismaPlansRepository(prisma);
  const subscriptions = new subscriptionsModule.PrismaSubscriptionsRepository(prisma);
  const writer = new modulesWriterModule.PrismaTenantModulesWriter(prisma);
  return new PlansService(
    plans,
    undefined,
    new synchronizerModule.TenantModulesSynchronizer(subscriptions, plans, writer),
    // B-ASS-05 (M4) troca pela gravação real em platform_audit_logs; até lá, em memória.
    new RecordingPlatformAuditWriter(),
  );
}

async function createPrismaSubscriptionsService(): Promise<SubscriptionsService> {
  const [subscriptionsModule, plansModule, tenantModule, modulesWriterModule] = await Promise.all([
    import("./plans/subscriptions-prisma.repository.js"),
    import("./plans/plans-prisma.repository.js"),
    import("./plans/tenant-lookup.prisma.js"),
    import("./plans/tenant-modules.prisma.js"),
  ]);
  const { prisma } = await import("../../database/prisma.js");

  return new SubscriptionsService(
    new subscriptionsModule.PrismaSubscriptionsRepository(prisma),
    new plansModule.PrismaPlansRepository(prisma),
    new tenantModule.PrismaTenantLookup(prisma),
    new modulesWriterModule.PrismaTenantModulesWriter(prisma),
  );
}
