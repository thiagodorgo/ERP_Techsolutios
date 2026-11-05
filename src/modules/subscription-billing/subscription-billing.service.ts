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

export function createMemoryPlansService(): PlansService {
  return new PlansService(memoryPlans);
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
  return createMemoryPlansService();
}

export async function createDefaultSubscriptionsService(): Promise<SubscriptionsService> {
  return createMemorySubscriptionsService();
}

export function resetSubscriptionBillingRuntimeForTests(): void {
  defaultPlansServicePromise = undefined;
  defaultSubscriptionsServicePromise = undefined;
}
