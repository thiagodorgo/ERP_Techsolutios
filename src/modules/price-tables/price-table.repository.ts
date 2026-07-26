import { randomUUID } from "node:crypto";

import type {
  PriceTable,
  CreatePriceTableInput,
  ListPriceTableInput,
  ListPriceTableResult,
  UpdatePriceTableInput,
} from "./price-table.types.js";
import { PriceTableError } from "./price-table.types.js";

export interface PriceTableRepository {
  create(input: CreatePriceTableInput): Promise<PriceTable>;
  list(input: ListPriceTableInput): Promise<ListPriceTableResult>;
  findById(tenantId: string, priceTableId: string): Promise<PriceTable | undefined>;
  update(input: UpdatePriceTableInput): Promise<PriceTable | undefined>;
  // Ω5P PR-03 (F4) — busca SERVIDOR-SIDE das tabelas PUBLICADAS+ativas do BUCKET EXATO (scope/vehicle_category,
  // NULL casa NULL) cuja janela [valid_from, valid_to] SE SOBREPÕE a [from, to] (NULL = aberto ±∞). SEM teto de
  // página: o invariante de cobrança (resolveTariff + RN-TAR-01) NÃO pode depender do limit:100. Para "cobre a
  // data D" use from=to=D. Aditivo/inerte.
  findPublishedInBucket(input: FindPublishedInBucketInput): Promise<PriceTable[]>;
  reset?(): void;
}

export type FindPublishedInBucketInput = {
  readonly tenantId: string;
  readonly scope: string | null;
  readonly vehicleCategory: string | null;
  readonly from: Date | null;
  readonly to: Date | null;
};

export function rangesOverlap(aFrom: Date | null, aTo: Date | null, bFrom: Date | null, bTo: Date | null): boolean {
  const af = aFrom ? aFrom.getTime() : Number.NEGATIVE_INFINITY;
  const at = aTo ? aTo.getTime() : Number.POSITIVE_INFINITY;
  const bf = bFrom ? bFrom.getTime() : Number.NEGATIVE_INFINITY;
  const bt = bTo ? bTo.getTime() : Number.POSITIVE_INFINITY;
  return af <= bt && bf <= at; // intervalos fechados sobrepõem-se.
}

export class InMemoryPriceTableRepository implements PriceTableRepository {
  private readonly tables = new Map<string, PriceTable>();

  async create(input: CreatePriceTableInput): Promise<PriceTable> {
    if (this.hasName(input.tenantId, input.name)) {
      throw new PriceTableError(409, "PRICE_TABLE_CONFLICT", "duplicate_name", "A price table with this name already exists.");
    }

    const now = new Date();
    const table: PriceTable = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.tables.set(table.id, table);
    return table;
  }

  async list(input: ListPriceTableInput): Promise<ListPriceTableResult> {
    const filtered = this.sorted()
      .filter((table) => table.tenantId === input.tenantId)
      .filter((table) => input.isActive === undefined || table.isActive === input.isActive)
      .filter((table) => input.status === undefined || table.status === input.status)
      .filter((table) => matchesSearch(table, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, priceTableId: string): Promise<PriceTable | undefined> {
    const table = this.tables.get(priceTableId);
    return table?.tenantId === tenantId ? table : undefined;
  }

  async findPublishedInBucket(input: FindPublishedInBucketInput): Promise<PriceTable[]> {
    // Varre TODA a coleção do tenant (InMemory não pagina → sem teto). Paridade com o WHERE server-side do Prisma.
    return [...this.tables.values()].filter(
      (table) =>
        table.tenantId === input.tenantId &&
        table.status === "published" &&
        table.isActive &&
        (table.scope ?? null) === input.scope &&
        (table.vehicleCategory ?? null) === input.vehicleCategory &&
        rangesOverlap(table.validFrom ?? null, table.validTo ?? null, input.from, input.to),
    );
  }

  async update(input: UpdatePriceTableInput): Promise<PriceTable | undefined> {
    const current = await this.findById(input.tenantId, input.priceTableId);
    if (!current) return undefined;

    if (input.name !== undefined && input.name !== current.name && this.hasName(input.tenantId, input.name)) {
      throw new PriceTableError(409, "PRICE_TABLE_CONFLICT", "duplicate_name", "A price table with this name already exists.");
    }

    const updated: PriceTable = {
      ...current,
      ...definedFields(input),
      updatedAt: new Date(),
    };
    this.tables.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.tables.clear();
  }

  private hasName(tenantId: string, name: string): boolean {
    return [...this.tables.values()].some((table) => table.tenantId === tenantId && table.name === name);
  }

  private sorted(): PriceTable[] {
    return [...this.tables.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(table: PriceTable, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [table.name, table.description].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
