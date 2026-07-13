import { env } from "../../config/env.js";
import {
  InMemoryTenantSettingRepository,
  type TenantSettingRepository,
} from "./tenant-setting.repository.js";
import type {
  TenantSetting,
  TenantSettingActorContext,
  ListTenantSettingResult,
} from "./tenant-setting.types.js";
import { TenantSettingError } from "./tenant-setting.types.js";
import {
  parseKey,
  parseOptionalCategory,
  parseOptionalCategoryFilter,
  parseOptionalDescription,
  parseValue,
} from "./tenant-setting.validators.js";

type RawRecord = Record<string, unknown>;

export class TenantSettingService {
  constructor(private readonly repository: TenantSettingRepository) {}

  async list(actor: TenantSettingActorContext, query: RawRecord): Promise<ListTenantSettingResult> {
    return this.repository.list({
      tenantId: actor.tenantId,
      category: parseOptionalCategoryFilter(query.category),
    });
  }

  async get(actor: TenantSettingActorContext, key: string): Promise<TenantSetting> {
    const setting = await this.repository.findByKey(actor.tenantId, parseKey(key));
    if (!setting) {
      throw new TenantSettingError(404, "TENANT_SETTING_NOT_FOUND", "not_found", "Tenant setting was not found.");
    }
    return setting;
  }

  async upsert(actor: TenantSettingActorContext, key: string, body: RawRecord): Promise<TenantSetting> {
    // Tenant vem SEMPRE do ator autenticado; upsert só alcança o tenant da claim.
    return this.repository.upsert({
      tenantId: actor.tenantId,
      key: parseKey(key),
      value: parseValue(body.value),
      category: parseOptionalCategory(body.category),
      description: parseOptionalDescription(body.description),
      updatedBy: actor.userId,
    });
  }
}

const memoryRepository = new InMemoryTenantSettingRepository();
let defaultServicePromise: Promise<TenantSettingService> | undefined;

export function createMemoryTenantSettingService(): TenantSettingService {
  return new TenantSettingService(memoryRepository);
}

export function getMemoryTenantSettingRepositoryForTests(): InMemoryTenantSettingRepository {
  return memoryRepository;
}

export async function createDefaultTenantSettingService(): Promise<TenantSettingService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryTenantSettingService();
  }
  defaultServicePromise ??= createPrismaTenantSettingService();
  return defaultServicePromise;
}

export function resetTenantSettingRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaTenantSettingService(): Promise<TenantSettingService> {
  const { createPrismaTenantSettingRepository } = await import("./tenant-setting-prisma.repository.js");
  const repository = await createPrismaTenantSettingRepository();
  return new TenantSettingService(repository);
}
