import { randomUUID } from "node:crypto";

import type { MemoryWorkOrderScope, WorkOrderWriteScope } from "../work-orders/work-order-scope.js";
import type {
  ServiceQuote,
  ServiceQuoteApprovalResult,
  CreateServiceQuoteInput,
  ListServiceQuoteInput,
  ListServiceQuoteResult,
  UpdateServiceQuoteInput,
} from "./service-quote.types.js";
import { ServiceQuoteError } from "./service-quote.types.js";

// B-O6R-09 · fatia 6 (item fundido pelo dono; emenda 1 §1.4) — o que a aprovação pede ao repositório: reservar o
// orçamento, criar a OS pelo escopo de escrita recebido e gravar o vínculo, numa transação só.
export type ApproveWithWorkOrderInput = {
  readonly tenantId: string;
  readonly serviceQuoteId: string;
  readonly updatedBy: string;
};

export type CreateWorkOrderInScope = (scope: WorkOrderWriteScope) => Promise<{ readonly id: string }>;

export interface ServiceQuoteRepository {
  create(input: CreateServiceQuoteInput): Promise<ServiceQuote>;
  list(input: ListServiceQuoteInput): Promise<ListServiceQuoteResult>;
  findById(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined>;
  update(input: UpdateServiceQuoteInput): Promise<ServiceQuote | undefined>;
  // Ω3F-4b (condição critico J-Ω3F-4B) — CAS: reserva o orçamento p/ aprovação (draft→approved) de forma
  // ATÔMICA, só se ainda draft E sem OS gerada. Fecha a janela TOCTOU (dois approve concorrentes criariam
  // 2 OSs). Retorna o orçamento reservado (vencedor) ou undefined (perdedor → 409, sem criar OS).
  claimForApproval(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined>;
  /**
   * B-O6R-09 · fatia 6 — a reserva (`draft→approved`, CAS), a OS (pelo escopo recebido) e o vínculo
   * `created_work_order_id`, juntos. Qualquer falha no meio desfaz tudo: sem OS, orçamento em `draft`. O perdedor de uma
   * corrida espera o vencedor terminar e recebe `not_claimed` (ou reserva, se o vencedor desfez). `openMemoryScope` só é
   * usado pela memória (o Prisma usa o `tx` da própria transação).
   */
  approveWithWorkOrder(
    input: ApproveWithWorkOrderInput,
    createWorkOrder: CreateWorkOrderInScope,
    openMemoryScope: () => MemoryWorkOrderScope,
  ): Promise<ServiceQuoteApprovalResult>;
  reset?(): void;
}

export class InMemoryServiceQuoteRepository implements ServiceQuoteRepository {
  private readonly quotes = new Map<string, ServiceQuote>();
  // EM1-01 (emenda 1.1) — as aprovações em voo, por orçamento. A reserva e o registro acontecem no MESMO passo síncrono,
  // antes do 1º `await`; quem não reserva espera a promessa e tenta de novo. A promessa resolve, nunca rejeita.
  private readonly approvalsInFlight = new Map<string, Promise<void>>();

  async approveWithWorkOrder(
    input: ApproveWithWorkOrderInput,
    createWorkOrder: CreateWorkOrderInScope,
    openMemoryScope: () => MemoryWorkOrderScope,
  ): Promise<ServiceQuoteApprovalResult> {
    for (;;) {
      const before = this.claimSync(input.tenantId, input.serviceQuoteId);
      if (before) {
        const gate = { release: () => {} };
        const inFlight = new Promise<void>((resolve) => {
          gate.release = resolve;
        });
        this.approvalsInFlight.set(input.serviceQuoteId, inFlight);
        const scope = openMemoryScope();
        try {
          const workOrder = await createWorkOrder(scope);
          const linked = this.linkCreatedWorkOrderSync(input.tenantId, input.serviceQuoteId, workOrder.id, input.updatedBy);
          scope.commitStaged();
          return { kind: "approved", quote: linked, workOrderId: workOrder.id };
        } catch (error) {
          scope.discardStaged();
          this.unclaimSync(before);
          throw error;
        } finally {
          if (this.approvalsInFlight.get(input.serviceQuoteId) === inFlight) this.approvalsInFlight.delete(input.serviceQuoteId);
          gate.release();
        }
      }
      const pending = this.approvalsInFlight.get(input.serviceQuoteId);
      if (!pending) return { kind: "not_claimed" };
      await pending;
    }
  }

  // A reserva síncrona (o mesmo CAS de `claimForApproval`), devolvendo o orçamento como era ANTES dela.
  private claimSync(tenantId: string, serviceQuoteId: string): ServiceQuote | undefined {
    const current = this.quotes.get(serviceQuoteId);
    if (!current || current.tenantId !== tenantId) return undefined;
    if (current.status !== "draft" || current.createdWorkOrderId) return undefined;
    this.quotes.set(current.id, { ...current, status: "approved", updatedAt: new Date() });
    return current;
  }

  // O vínculo condicional: só um orçamento ainda `approved` e sem OS recebe o id. Síncrono.
  private linkCreatedWorkOrderSync(tenantId: string, serviceQuoteId: string, workOrderId: string, updatedBy: string): ServiceQuote {
    const current = this.quotes.get(serviceQuoteId);
    if (!current || current.tenantId !== tenantId || current.status !== "approved" || current.createdWorkOrderId) {
      throw new ServiceQuoteError(409, "SERVICE_QUOTE_CONFLICT", "quote_link_lost", "The quote changed while it was being approved.");
    }
    const linked: ServiceQuote = { ...current, createdWorkOrderId: workOrderId, updatedBy, updatedAt: new Date() };
    this.quotes.set(linked.id, linked);
    return linked;
  }

  // Desfaz a reserva: o orçamento volta ao estado de antes dela (draft, sem OS).
  private unclaimSync(before: ServiceQuote): void {
    const current = this.quotes.get(before.id);
    if (!current) return;
    this.quotes.set(before.id, { ...current, status: before.status, createdWorkOrderId: before.createdWorkOrderId, updatedAt: new Date() });
  }

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

  // CAS atômico (JS single-thread: sem `await` entre o read e o write → duas chamadas concorrentes
  // NÃO se intercalam aqui). Só o 1º vencedor transita draft→approved; os demais veem status já
  // mudado e recebem undefined.
  async claimForApproval(tenantId: string, serviceQuoteId: string): Promise<ServiceQuote | undefined> {
    const current = this.quotes.get(serviceQuoteId);
    if (!current || current.tenantId !== tenantId) return undefined;
    if (current.status !== "draft" || current.createdWorkOrderId) return undefined;
    const claimed: ServiceQuote = { ...current, status: "approved", updatedAt: new Date() };
    this.quotes.set(claimed.id, claimed);
    return claimed;
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
        number: input.number,
        issuedAt: input.issuedAt,
        validUntil: input.validUntil,
        createdWorkOrderId: input.createdWorkOrderId,
        shareToken: input.shareToken,
        updatedBy: input.updatedBy,
      }),
      updatedAt: new Date(),
    };
    this.quotes.set(updated.id, updated);
    return updated;
  }

  reset(): void {
    this.quotes.clear();
    this.approvalsInFlight.clear();
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
