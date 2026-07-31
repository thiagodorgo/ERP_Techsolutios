import { randomUUID } from "node:crypto";

import type {
  CreateVehicleIdentityInput,
  ListVehicleIdentityInput,
  ListVehicleIdentityResult,
  UpdateVehicleIdentityInput,
  VehicleIdentity,
} from "./vehicle-identity.types.js";

export interface VehicleIdentityRepository {
  createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity>;
  listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult>;
  findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined>;
  updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined>;

  reset?(): void;
}

export class InMemoryVehicleIdentityRepository implements VehicleIdentityRepository {
  private readonly identities = new Map<string, VehicleIdentity>();

  async createIdentity(input: CreateVehicleIdentityInput): Promise<VehicleIdentity> {
    const now = new Date();
    const identity: VehicleIdentity = {
      id: randomUUID(),
      tenantId: input.tenantId,
      plateRaw: input.plateRaw,
      plateKey: input.plateKey,
      chassis: input.chassis,
      renavamKey: input.renavamKey,
      brand: input.brand,
      model: input.model,
      color: input.color,
      year: input.year,
      unidentified: input.unidentified,
      unidentifiedReason: input.unidentifiedReason,
      confidence: input.confidence ?? "PROVISIONAL",
      canonicalIdentityId: undefined,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    };
    this.identities.set(identity.id, identity);
    return identity;
  }

  async listIdentities(input: ListVehicleIdentityInput): Promise<ListVehicleIdentityResult> {
    const filtered = [...this.identities.values()]
      .filter((identity) => identity.tenantId === input.tenantId)
      .filter((identity) => input.confidence === undefined || identity.confidence === input.confidence)
      .filter((identity) => input.plateKey === undefined || identity.plateKey === input.plateKey)
      .filter((identity) => matchesSearch(identity, input.search))
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findIdentityById(tenantId: string, identityId: string): Promise<VehicleIdentity | undefined> {
    const identity = this.identities.get(identityId);
    return identity?.tenantId === tenantId ? identity : undefined;
  }

  async updateIdentity(input: UpdateVehicleIdentityInput): Promise<VehicleIdentity | undefined> {
    const current = await this.findIdentityById(input.tenantId, input.identityId);
    if (!current) return undefined;

    const updated: VehicleIdentity = {
      ...current,
      plateRaw: applyNullable(input.plateRaw, current.plateRaw),
      plateKey: applyNullable(input.plateKey, current.plateKey),
      chassis: applyNullable(input.chassis, current.chassis),
      renavamKey: applyNullable(input.renavamKey, current.renavamKey),
      brand: applyNullable(input.brand, current.brand),
      model: applyNullable(input.model, current.model),
      color: applyNullable(input.color, current.color),
      year: applyNullable(input.year, current.year),
      unidentified: input.unidentified ?? current.unidentified,
      unidentifiedReason: applyNullable(input.unidentifiedReason, current.unidentifiedReason),
      confidence: input.confidence ?? current.confidence,
      updatedBy: input.updatedBy ?? current.updatedBy,
      updatedAt: new Date(),
    };
    this.identities.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.identities.clear();
  }
}

// undefined = campo não veio (preserva o atual); null = veio explicitamente para limpar.
function applyNullable<T>(value: T | null | undefined, current: T | undefined): T | undefined {
  if (value === undefined) return current;
  if (value === null) return undefined;
  return value;
}

function matchesSearch(identity: VehicleIdentity, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [identity.plateRaw ?? "", identity.chassis ?? "", identity.brand ?? "", identity.model ?? ""].some((value) =>
    value.toLowerCase().includes(normalized),
  );
}
