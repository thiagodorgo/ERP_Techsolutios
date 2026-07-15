import { randomUUID } from "node:crypto";

import type {
  CreateServiceQuoteItemInput,
  UpdateServiceQuoteItemInput,
  ServiceQuoteItem,
} from "./service-quote-item.types.js";
import { ServiceQuoteItemError } from "./service-quote-item.types.js";

export interface ServiceQuoteItemRepository {
  create(input: CreateServiceQuoteItemInput): Promise<ServiceQuoteItem>;
  listByQuote(tenantId: string, serviceQuoteId: string): Promise<readonly ServiceQuoteItem[]>;
  findById(tenantId: string, serviceQuoteId: string, itemId: string): Promise<ServiceQuoteItem | undefined>;
  findActiveByClientActionId(tenantId: string, serviceQuoteId: string, clientActionId: string): Promise<ServiceQuoteItem | undefined>;
  update(input: UpdateServiceQuoteItemInput): Promise<ServiceQuoteItem | undefined>;
  softDelete(tenantId: string, serviceQuoteId: string, itemId: string, deletedBy?: string): Promise<ServiceQuoteItem | undefined>;
  reset?(): void;
}

export class InMemoryServiceQuoteItemRepository implements ServiceQuoteItemRepository {
  private readonly items = new Map<string, ServiceQuoteItem>();

  async create(input: CreateServiceQuoteItemInput): Promise<ServiceQuoteItem> {
    // Idempotência tenant-scoped (§6): duplicado ATIVO com o mesmo client_action_id → 409.
    // Espelha o unique PARCIAL do Postgres (rede extra do pre-check do service).
    if (input.clientActionId && (await this.findActiveByClientActionId(input.tenantId, input.serviceQuoteId, input.clientActionId))) {
      throw duplicateQuoteItemError();
    }

    const now = new Date();
    const item: ServiceQuoteItem = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  async listByQuote(tenantId: string, serviceQuoteId: string): Promise<readonly ServiceQuoteItem[]> {
    // Extrato lê na ordem de lançamento (asc); o total agregado fecha embaixo. Deletados (lógico)
    // NUNCA aparecem.
    return [...this.items.values()]
      .filter((item) => item.tenantId === tenantId && item.serviceQuoteId === serviceQuoteId && !item.deletedAt)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async findById(tenantId: string, serviceQuoteId: string, itemId: string): Promise<ServiceQuoteItem | undefined> {
    const item = this.items.get(itemId);
    return item && item.tenantId === tenantId && item.serviceQuoteId === serviceQuoteId && !item.deletedAt ? item : undefined;
  }

  async findActiveByClientActionId(tenantId: string, serviceQuoteId: string, clientActionId: string): Promise<ServiceQuoteItem | undefined> {
    return [...this.items.values()].find(
      (item) =>
        item.tenantId === tenantId &&
        item.serviceQuoteId === serviceQuoteId &&
        item.clientActionId === clientActionId &&
        !item.deletedAt,
    );
  }

  async update(input: UpdateServiceQuoteItemInput): Promise<ServiceQuoteItem | undefined> {
    const current = await this.findById(input.tenantId, input.serviceQuoteId, input.itemId);
    if (!current) return undefined;

    const updated: ServiceQuoteItem = {
      ...current,
      ...definedFields({
        description: input.description,
        quantity: input.quantity,
        unitAmount: input.unitAmount,
        totalAmount: input.totalAmount,
        notes: input.notes,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.items.set(updated.id, updated);
    return updated;
  }

  async softDelete(tenantId: string, serviceQuoteId: string, itemId: string, deletedBy?: string): Promise<ServiceQuoteItem | undefined> {
    const current = await this.findById(tenantId, serviceQuoteId, itemId);
    if (!current) return undefined;
    // Delete LÓGICO: carimba deletedAt; some da lista e do total agregado.
    const removed: ServiceQuoteItem = {
      ...current,
      ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };
    this.items.set(removed.id, removed);
    return removed;
  }

  reset(): void {
    this.items.clear();
  }
}

export function duplicateQuoteItemError(): ServiceQuoteItemError {
  return new ServiceQuoteItemError(
    409,
    "SERVICE_QUOTE_ITEM_CONFLICT",
    "duplicate_quote_item",
    "A quote item with this client_action_id already exists for this service quote.",
  );
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
