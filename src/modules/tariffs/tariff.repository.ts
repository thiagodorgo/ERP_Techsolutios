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
  // Ω3-a — resolve a Tarifa aplicável para congelar num orçamento. Recebe o conjunto de tabelas
  // PUBLICADAS (resolvido pelo consumidor) para não acoplar este repo ao de PriceTable. Método
  // aditivo e inerte sem consumidor. Retorna a MELHOR tarifa por ordem determinística (A2 do crítico).
  findApplicable(
    tenantId: string,
    serviceCatalogId: string,
    customerId: string | undefined,
    publishedPriceTableIds: ReadonlySet<string>,
  ): Promise<Tariff | undefined>;
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

  async findApplicable(
    tenantId: string,
    serviceCatalogId: string,
    customerId: string | undefined,
    publishedPriceTableIds: ReadonlySet<string>,
  ): Promise<Tariff | undefined> {
    const now = new Date();
    const candidates = [...this.tariffs.values()].filter((tariff) =>
      isApplicableCandidate(tariff, tenantId, serviceCatalogId, customerId, publishedPriceTableIds, now),
    );
    return pickApplicableTariff(candidates, customerId);
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

// Ω3-a — candidato aplicável: ativo, tabela publicada, serviço exato, cliente-específico OU padrão
// (customer NULL), e vigência cobrindo hoje (bordas ausentes = aberto). Compartilhado InMemory×Prisma.
export function isApplicableCandidate(
  tariff: Tariff,
  tenantId: string,
  serviceCatalogId: string,
  customerId: string | undefined,
  publishedPriceTableIds: ReadonlySet<string>,
  now: Date,
): boolean {
  if (tariff.tenantId !== tenantId) return false;
  if (!tariff.isActive) return false;
  if (!publishedPriceTableIds.has(tariff.priceTableId)) return false;
  if (tariff.serviceCatalogId !== serviceCatalogId) return false;
  if (tariff.customerId !== undefined && tariff.customerId !== customerId) return false;
  if (tariff.validFrom && tariff.validFrom.getTime() > now.getTime()) return false;
  if (tariff.validTo && tariff.validTo.getTime() < now.getTime()) return false;
  return true;
}

// A2 (crítico) — ordem TOTAL determinística entre tarifas concorrentes, para o congelamento ser
// reproduzível (não depender da ordem de linhas do banco):
//   1) cliente-específico vence tarifa padrão (customer NULL);
//   2) maior valid_from (mais recente/vigente); ausência de valid_from = mais antigo;
//   3) mais recente created_at;
//   4) id ascendente (desempate final estável).
// Compartilhado InMemory×Prisma para paridade exata.
export function pickApplicableTariff(candidates: readonly Tariff[], customerId: string | undefined): Tariff | undefined {
  if (candidates.length === 0) return undefined;
  return [...candidates].sort((left, right) => {
    const leftSpecific = left.customerId === customerId && customerId !== undefined ? 0 : 1;
    const rightSpecific = right.customerId === customerId && customerId !== undefined ? 0 : 1;
    if (leftSpecific !== rightSpecific) return leftSpecific - rightSpecific;

    const leftFrom = left.validFrom ? left.validFrom.getTime() : Number.NEGATIVE_INFINITY;
    const rightFrom = right.validFrom ? right.validFrom.getTime() : Number.NEGATIVE_INFINITY;
    if (leftFrom !== rightFrom) return rightFrom - leftFrom;

    const leftCreated = left.createdAt.getTime();
    const rightCreated = right.createdAt.getTime();
    if (leftCreated !== rightCreated) return rightCreated - leftCreated;

    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  })[0];
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
