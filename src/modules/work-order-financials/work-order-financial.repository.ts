import { randomUUID } from "node:crypto";

import type {
  CreateWorkOrderFinancialItemInput,
  MarkWorkOrderFinancialItemsInvoicedInput,
  UpdateWorkOrderFinancialItemInput,
  WorkOrderFinancialItem,
} from "./work-order-financial.types.js";
import { WorkOrderFinancialError } from "./work-order-financial.types.js";

export interface WorkOrderFinancialItemRepository {
  create(input: CreateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem>;
  listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]>;
  // Ω4-3 — itens FATURÁVEIS: ativos (deleted_at NULL) E ainda não faturados (invoiced_at NULL). Fonte do
  // agregado congelado que vira o Título (nunca relê tarifa).
  listInvoiceableByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]>;
  // B-SAN3-02 (D1/D2) — os MESMOS itens faturáveis, TRAVADOS: no Prisma é `SELECT … ORDER BY created_at, id FOR UPDATE`
  // dentro da transação corrente (a unidade de faturamento); a Σ do título sai deste conjunto travado. A ordem total
  // (created_at, id) é a de TODO escritor multi-linha de itens (também o softDeleteAllByWorkOrder). Fora de uma
  // transação, a trava vale só até o commit imediato — o uso real é via a porta UoW. No InMemory é idêntico ao
  // listInvoiceableByWorkOrder (o mutex por tenant da unidade de memória serializa as unidades entre si).
  listInvoiceableByWorkOrderForUpdate(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]>;
  findById(tenantId: string, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem | undefined>;
  findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderFinancialItem | undefined>;
  // B-SAN3-02 (D2, P2) — update/softDelete são CAS: só escrevem item ativo E AINDA NÃO FATURADO (invoiced_at NULL no
  // WHERE). undefined = 0 linhas (inexistente, deletado OU carimbado); o serviço relê para distinguir 404 de 422.
  update(input: UpdateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem | undefined>;
  softDelete(tenantId: string, workOrderId: string, itemId: string, deletedBy?: string): Promise<WorkOrderFinancialItem | undefined>;
  // P-Ω3F6-ZERO-ATOMICIDADE — soft-delete ATÔMICO de TODOS os itens ATIVOS e NÃO-FATURADOS de uma OS (o `zero`
  // do cancelamento). Sem parcialidade nem N+1. NÃO toca invoiced_at != null (lastro de Título, D-Ω4-C1). Retorna a
  // contagem removida. B-SAN3-02 (D2, A4) — no Postgres trava na MESMA ordem total (created_at, id) do faturamento
  // (`SELECT … FOR UPDATE` → `UPDATE … WHERE id = ANY`), o que remove o ciclo conhecido fatura × zero.
  softDeleteAllByWorkOrder(tenantId: string, workOrderId: string, deletedBy?: string): Promise<number>;
  // Ω4-3 (D-Ω4-C1) — carimba invoiced_at+title_id nos itens incluídos no faturamento (idempotente: só
  // itens ainda não-faturados/não-deletados). Retorna a contagem carimbada.
  markInvoiced(input: MarkWorkOrderFinancialItemsInvoicedInput): Promise<number>;
  reset?(): void;
}

export class InMemoryWorkOrderFinancialItemRepository implements WorkOrderFinancialItemRepository {
  private readonly items = new Map<string, WorkOrderFinancialItem>();

  async create(input: CreateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem> {
    // Idempotência tenant-scoped (§6): duplicado ATIVO com o mesmo client_action_id → 409.
    // Espelha o unique PARCIAL do Postgres (rede extra do pre-check do service).
    if (input.clientActionId && (await this.findActiveByClientActionId(input.tenantId, input.workOrderId, input.clientActionId))) {
      throw duplicateFinancialItemError();
    }

    const now = new Date();
    const item: WorkOrderFinancialItem = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  async listByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    // Extrato lê na ordem de lançamento (asc); o total agregado fecha embaixo. Deletados (lógico)
    // NUNCA aparecem.
    return [...this.items.values()]
      .filter((item) => item.tenantId === tenantId && item.workOrderId === workOrderId && !item.deletedAt)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async listInvoiceableByWorkOrder(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    return (await this.listByWorkOrder(tenantId, workOrderId)).filter((item) => item.invoicedAt == null);
  }

  async listInvoiceableByWorkOrderForUpdate(tenantId: string, workOrderId: string): Promise<readonly WorkOrderFinancialItem[]> {
    return this.listInvoiceableByWorkOrder(tenantId, workOrderId);
  }

  async findById(tenantId: string, workOrderId: string, itemId: string): Promise<WorkOrderFinancialItem | undefined> {
    const item = this.items.get(itemId);
    return item && item.tenantId === tenantId && item.workOrderId === workOrderId && !item.deletedAt ? item : undefined;
  }

  async findActiveByClientActionId(tenantId: string, workOrderId: string, clientActionId: string): Promise<WorkOrderFinancialItem | undefined> {
    return [...this.items.values()].find(
      (item) =>
        item.tenantId === tenantId &&
        item.workOrderId === workOrderId &&
        item.clientActionId === clientActionId &&
        !item.deletedAt,
    );
  }

  async update(input: UpdateWorkOrderFinancialItemInput): Promise<WorkOrderFinancialItem | undefined> {
    const current = await this.findById(input.tenantId, input.workOrderId, input.itemId);
    // B-SAN3-02 (D2) — espelho do CAS do Postgres (`AND invoiced_at IS NULL`): item carimbado não se escreve.
    if (!current || current.invoicedAt != null) return undefined;

    const updated: WorkOrderFinancialItem = {
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

  async softDelete(tenantId: string, workOrderId: string, itemId: string, deletedBy?: string): Promise<WorkOrderFinancialItem | undefined> {
    const current = await this.findById(tenantId, workOrderId, itemId);
    // B-SAN3-02 (D2) — espelho do CAS do Postgres (`AND invoiced_at IS NULL`): item carimbado não se apaga.
    if (!current || current.invoicedAt != null) return undefined;
    // Delete LÓGICO: carimba deletedAt; some da lista e do total agregado.
    const removed: WorkOrderFinancialItem = {
      ...current,
      ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
      updatedAt: new Date(),
      deletedAt: new Date(),
    };
    this.items.set(removed.id, removed);
    return removed;
  }

  // Espelho síncrono do updateMany atômico do Postgres: carimba deleted_at em todos os itens ATIVOS e
  // NÃO-FATURADOS da OS de uma vez (sem loop de service.delete → sem parcialidade/N+1; não toca faturados).
  async softDeleteAllByWorkOrder(tenantId: string, workOrderId: string, deletedBy?: string): Promise<number> {
    const now = new Date();
    let removed = 0;
    for (const item of this.items.values()) {
      if (item.tenantId !== tenantId || item.workOrderId !== workOrderId || item.deletedAt != null || item.invoicedAt != null) {
        continue;
      }
      this.items.set(item.id, {
        ...item,
        ...(deletedBy !== undefined ? { updatedBy: deletedBy } : {}),
        updatedAt: now,
        deletedAt: now,
      });
      removed += 1;
    }
    return removed;
  }

  async markInvoiced(input: MarkWorkOrderFinancialItemsInvoicedInput): Promise<number> {
    const wanted = new Set(input.itemIds);
    let stamped = 0;
    for (const item of this.items.values()) {
      if (
        item.tenantId !== input.tenantId ||
        item.workOrderId !== input.workOrderId ||
        !wanted.has(item.id) ||
        item.deletedAt != null ||
        item.invoicedAt != null // idempotente: item já faturado não é re-carimbado
      ) {
        continue;
      }
      this.items.set(item.id, {
        ...item,
        invoicedAt: input.invoicedAt,
        titleId: input.titleId,
        ...(input.updatedBy !== undefined ? { updatedBy: input.updatedBy } : {}),
        updatedAt: new Date(),
      });
      stamped += 1;
    }
    return stamped;
  }

  reset(): void {
    this.items.clear();
  }

  // B-SAN3-02 (D4) — par snapshot/restore do UNDO-LOG do runner de memória (financial-uow), cópia do de títulos.
  // Dublê honesto: NÃO é evidência de atomicidade (a prova real é a suíte -db contra Postgres). Escopo por tenant,
  // cópia rasa por linha (os writers InMemory sempre fazem `set` de objeto novo). Inclui linhas deletadas.
  snapshotTenantForUow(tenantId: string): WorkOrderFinancialItem[] {
    return [...this.items.values()].filter((item) => item.tenantId === tenantId).map((item) => ({ ...item }));
  }

  restoreTenantForUow(tenantId: string, rows: readonly WorkOrderFinancialItem[]): void {
    for (const [id, item] of [...this.items]) {
      if (item.tenantId === tenantId) this.items.delete(id);
    }
    for (const row of rows) this.items.set(row.id, { ...row });
  }
}

export function duplicateFinancialItemError(): WorkOrderFinancialError {
  return new WorkOrderFinancialError(
    409,
    "WORK_ORDER_FINANCIAL_CONFLICT",
    "duplicate_financial_item",
    "A financial item with this client_action_id already exists for this work order.",
  );
}

function definedFields<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
