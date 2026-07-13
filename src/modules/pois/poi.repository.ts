import { randomUUID } from "node:crypto";

import type {
  Poi,
  CreatePoiInput,
  ListPoiInput,
  ListPoiResult,
  UpdatePoiInput,
} from "./poi.types.js";
import { PoiError } from "./poi.types.js";

export interface PoiRepository {
  create(input: CreatePoiInput): Promise<Poi>;
  list(input: ListPoiInput): Promise<ListPoiResult>;
  findById(tenantId: string, poiId: string): Promise<Poi | undefined>;
  update(input: UpdatePoiInput): Promise<Poi | undefined>;
  reset?(): void;
}

export class InMemoryPoiRepository implements PoiRepository {
  private readonly pois = new Map<string, Poi>();

  async create(input: CreatePoiInput): Promise<Poi> {
    if (this.hasName(input.tenantId, input.name)) {
      throw new PoiError(409, "POI_CONFLICT", "duplicate_name", "A point of interest with this name already exists.");
    }

    const now = new Date();
    const poi: Poi = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.pois.set(poi.id, poi);
    return poi;
  }

  async list(input: ListPoiInput): Promise<ListPoiResult> {
    const filtered = this.sorted()
      .filter((poi) => poi.tenantId === input.tenantId)
      .filter((poi) => input.isActive === undefined || poi.isActive === input.isActive)
      .filter((poi) => matchesSearch(poi, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, poiId: string): Promise<Poi | undefined> {
    const poi = this.pois.get(poiId);
    return poi?.tenantId === tenantId ? poi : undefined;
  }

  async update(input: UpdatePoiInput): Promise<Poi | undefined> {
    const current = await this.findById(input.tenantId, input.poiId);
    if (!current) return undefined;

    if (input.name !== undefined && input.name !== current.name && this.hasName(input.tenantId, input.name)) {
      throw new PoiError(409, "POI_CONFLICT", "duplicate_name", "A point of interest with this name already exists.");
    }

    const updated: Poi = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.pois.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.pois.clear();
  }

  private hasName(tenantId: string, name: string): boolean {
    return [...this.pois.values()].some((poi) => poi.tenantId === tenantId && poi.name === name);
  }

  private sorted(): Poi[] {
    return [...this.pois.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(poi: Poi, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [poi.name, poi.category, poi.address]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
