import { randomUUID } from "node:crypto";

import type {
  Tariff,
  CreateTariffInput,
  ListTariffInput,
  ListTariffResult,
  UpdateTariffInput,
} from "./tariff.types.js";
import { TariffError } from "./tariff.types.js";

export interface TariffRepository {
  create(input: CreateTariffInput): Promise<Tariff>;
  list(input: ListTariffInput): Promise<ListTariffResult>;
  findById(tenantId: string, tariffId: string): Promise<Tariff | undefined>;
  update(input: UpdateTariffInput): Promise<Tariff | undefined>;
  reset?(): void;
}

export class InMemoryTariffRepository implements TariffRepository {
  private readonly tariffs = new Map<string, Tariff>();

  async create(input: CreateTariffInput): Promise<Tariff> {
    if (this.hasNaturalKey(input)) {
      throw new TariffError(409, "TARIFF_CONFLICT", "duplicate_tariff", "A tariff with this natural key already exists.");
    }

    const now = new Date();
    const tariff: Tariff = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.tariffs.set(tariff.id, tariff);
    return tariff;
  }

  async list(input: ListTariffInput): Promise<ListTariffResult> {
    const filtered = this.sorted()
      .filter((tariff) => tariff.tenantId === input.tenantId)
      .filter((tariff) => input.priceTableId === undefined || tariff.priceTableId === input.priceTableId)
      .filter((tariff) => input.isActive === undefined || tariff.isActive === input.isActive)
      .filter((tariff) => matchesSearch(tariff, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, tariffId: string): Promise<Tariff | undefined> {
    const tariff = this.tariffs.get(tariffId);
    return tariff?.tenantId === tenantId ? tariff : undefined;
  }

  async update(input: UpdateTariffInput): Promise<Tariff | undefined> {
    const current = await this.findById(input.tenantId, input.tariffId);
    if (!current) return undefined;

    const updated: Tariff = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.tariffs.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.tariffs.clear();
  }

  // A1 (crítico) — espelha o índice único do Postgres, onde NULLs são distintos: só colide quando os
  // 4 campos são iguais E service_catalog_id/customer_id NÃO são nulos. Se algum for null, não colide —
  // por isso tarifa padrão (customer NULL) e por-cliente coexistem para o mesmo serviço.
  private hasNaturalKey(input: CreateTariffInput): boolean {
    if (input.serviceCatalogId === undefined || input.customerId === undefined) {
      return false;
    }
    return [...this.tariffs.values()].some(
      (tariff) =>
        tariff.tenantId === input.tenantId &&
        tariff.priceTableId === input.priceTableId &&
        tariff.serviceCatalogId === input.serviceCatalogId &&
        tariff.customerId === input.customerId,
    );
  }

  private sorted(): Tariff[] {
    return [...this.tariffs.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(tariff: Tariff, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [tariff.name, tariff.origin].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
