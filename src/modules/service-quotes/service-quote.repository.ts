import { randomUUID } from "node:crypto";

import type {
  ServiceQuote,
  CreateServiceQuoteInput,
  ListServiceQuoteInput,
  ListServiceQuoteResult,
  UpdateServiceQuoteInput,
} from "./service-quote.types.js";
import { ServiceQuoteError } from "./service-quote.types.js";

export interface ServiceQuoteRepository {
  create(input: CreateServiceQuoteInput): Promise<ServiceQuote>;
  list(input: ListServiceQuoteInput): Promise<ListServiceQuoteResult>;
  findById(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined>;
  update(input: UpdateServiceQuoteInput): Promise<ServiceQuote | undefined>;
  reset?(): void;
}

export class InMemoryServiceQuoteRepository implements ServiceQuoteRepository {
  private readonly quotes = new Map<string, ServiceQuote>();

  async create(input: CreateServiceQuoteInput): Promise<ServiceQuote> {
    if (this.hasActiveNaturalKey(input)) {
      throw new ServiceQuoteError(
        409,
        "SERVICE_QUOTE_CONFLICT",
        "duplicate_quote_for_service",
        "An active quote already exists for this work order and service.",
      );
    }

    const now = new Date();
    const quote: ServiceQuote = {
      ...input,
      id: randomUUID(),
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.quotes.set(quote.id, quote);
    return quote;
  }

  async list(input: ListServiceQuoteInput): Promise<ListServiceQuoteResult> {
    const filtered = this.sorted()
      .filter((quote) => quote.tenantId === input.tenantId)
      .filter((quote) => input.workOrderId === undefined || quote.workOrderId === input.workOrderId)
      .filter((quote) => input.status === undefined || quote.status === input.status)
      .filter((quote) => input.isActive === undefined || quote.isActive === input.isActive)
      .filter((quote) => matchesSearch(quote, input.search));

    return {
      items: filtered.slice(input.offset, input.offset + input.limit),
      total: filtered.length,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined> {
    const quote = this.quotes.get(serviceQuoteId);
    return quote?.tenantId === tenantId ? quote : undefined;
  }

  async update(input: UpdateServiceQuoteInput): Promise<ServiceQuote | undefined> {
    const current = await this.findById(input.tenantId, input.serviceQuoteId);
    if (!current) return undefined;

    const updated: ServiceQuote = {
      ...current,
      ...definedFields({
        quantity: input.quantity,
        frozenTotal: input.frozenTotal,
        notes: input.notes,
        status: input.status,
        isActive: input.isActive,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.quotes.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.quotes.clear();
  }

  // C2 (crítico) — o predicado da chave natural é mais estrito que o da Tarifa: só colide com um quote
  // ATIVO (is_active=true E status<>'void') do mesmo (tenant, work_order_id, service_catalog_id).
  // work_order_id NULL (orçamento avulso) NÃO colide (NULLs distintos, espelha o índice PARCIAL do
  // Postgres). void → recriar deve passar; 2 ativos duplicados → 409. Espelho de InMemory×Prisma.
  private hasActiveNaturalKey(input: CreateServiceQuoteInput): boolean {
    if (input.workOrderId === undefined) {
      return false;
    }
    return [...this.quotes.values()].some(
      (quote) =>
        quote.tenantId === input.tenantId &&
        quote.workOrderId === input.workOrderId &&
        quote.serviceCatalogId === input.serviceCatalogId &&
        quote.isActive &&
        quote.status !== "void",
    );
  }

  private sorted(): ServiceQuote[] {
    return [...this.quotes.values()].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  }
}

function matchesSearch(quote: ServiceQuote, search: string | undefined): boolean {
  if (!search) return true;
  const normalized = search.toLowerCase();
  return [quote.notes, quote.status, quote.priceSource]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
