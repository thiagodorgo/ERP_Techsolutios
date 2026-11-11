// B-ASS-08b · (c2) — porta + dublê em memória da nota do demonstrativo (`subscription_statement_invoices`, FORCE RLS no
// Prisma). `beginIssue` reserva o número da DPS e grava a linha `pending` NA MESMA transação (R-H: rollback não consome
// número) e é idempotente por (provider, external_ref) — a retentativa do dispatcher reusa a linha. Toda mudança de estado
// espelha `subscription_statements.invoice_status`, que é o que as regras do demonstrativo leem (reabrir/cancelar com nota
// viva → 422 `invoice_outstanding`; estorno total com nota autorizada → `invoice_cancel` — G9).

import { randomUUID } from "node:crypto";

import { InvoiceProviderError } from "../providers/invoice/invoice-errors.js";
import type { StatementRepository } from "../statements/statement.repository.js";
import { invoiceExternalRef, LIVE_INVOICE_STATUSES, type StatementInvoiceStatus, type SubscriptionStatementInvoice } from "./invoices.types.js";

/** Conserto da J-530 (A): o `beginIssue` recusa abrir nota NOVA sobre demonstrativo que não está `paid` (lido sob a trava).
 * Classe própria, e não `InvoiceProviderError`: a lista de códigos do provedor é fechada e não é deste bloco. */
export class StatementNotPaidError extends Error {
  readonly code = "statement_not_paid" as const;
  constructor() {
    super("The statement is not paid.");
    this.name = "StatementNotPaidError";
  }
}

export type BeginIssueInput = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly seq: number;
  readonly provider: string;
  /** Ambiente do provedor (`sandbox`/`production`) — a numeração é por (provedor, ambiente, série). */
  readonly environment: string;
  readonly serie: number;
};

export type AuthorizedPatch = {
  readonly number?: string;
  readonly verificationCode?: string;
  readonly pdfUrl?: string;
  readonly xmlUrl?: string;
  readonly pdfSource: "public_url" | "provider_fetch";
};

export interface StatementInvoiceRepository {
  /** Idempotente por (provider, `<statement_id>:<seq>`): existente → `created: false`, SEM novo número. Outra nota VIVA do
   * demonstrativo → `InvoiceProviderError("invoice_already_live")` (no banco, o UNIQUE parcial é a última palavra).
   * Conserto da J-530 (A): `statementPaid` é o status do demonstrativo lido sob a trava; nota NOVA sobre demonstrativo que não
   * está `paid` → `InvoiceProviderError("statement_not_paid")` (a existente volta, com `statementPaid`, para quem chamou decidir). */
  beginIssue(input: BeginIssueInput, now: Date): Promise<{ readonly invoice: SubscriptionStatementInvoice; readonly created: boolean; readonly statementPaid: boolean }>;
  findByRef(tenantId: string, provider: string, externalRef: string): Promise<SubscriptionStatementInvoice | undefined>;
  /** A nota VIVA (`pending`/`authorized`/`cancel_pending`) do demonstrativo, se houver. */
  findLive(tenantId: string, statementId: string): Promise<SubscriptionStatementInvoice | undefined>;
  listByStatement(tenantId: string, statementId: string): Promise<readonly SubscriptionStatementInvoice[]>;
  /** A emissão chegou ao provedor (2xx = `processing`, NUNCA autorizada — R-NF-2): guarda o id dele; segue `pending`. */
  markIssued(tenantId: string, id: string, providerInvoiceId: string | null, now: Date): Promise<void>;
  markAuthorized(tenantId: string, id: string, patch: AuthorizedPatch, now: Date): Promise<void>;
  markRejected(tenantId: string, id: string, error: string | null, now: Date): Promise<void>;
  /** Intenção de cancelar gravada ANTES da chamada ao provedor (R-D), com o motivo e o código. */
  markCancelPending(tenantId: string, id: string, cancel: { readonly reason: string; readonly code: string }, now: Date): Promise<void>;
  /** O provedor recusou o cancelamento (Focus: erro de negócio em 200): a nota volta a `authorized`, com o erro visível. */
  markCancelFailed(tenantId: string, id: string, error: string | null, now: Date): Promise<void>;
  markCancelled(tenantId: string, id: string, now: Date): Promise<void>;
}

export class InMemoryStatementInvoiceRepository implements StatementInvoiceRepository {
  readonly #rows = new Map<string, SubscriptionStatementInvoice>();
  readonly #numbers = new Map<string, number>();

  /** Com o repositório de demonstrativos, espelha `invoiceStatus` como o Prisma faz na mesma transação. */
  constructor(private readonly statements?: StatementRepository) {}

  async beginIssue(input: BeginIssueInput, now: Date): Promise<{ readonly invoice: SubscriptionStatementInvoice; readonly created: boolean; readonly statementPaid: boolean }> {
    // O portão (A) só vale com o repositório de demonstrativos: o dublê SEM demonstrativos não o aplica (statementPaid = true).
    const statementPaid = this.statements ? (await this.statements.findStatement(input.tenantId, input.statementId))?.status === "paid" : true;
    const externalRef = invoiceExternalRef(input.statementId, input.seq);
    const existing = await this.findByRef(input.tenantId, input.provider, externalRef);
    if (existing) return { invoice: existing, created: false, statementPaid };
    if (!statementPaid) throw new StatementNotPaidError();
    const live = await this.findLive(input.tenantId, input.statementId);
    if (live) throw new InvoiceProviderError("invoice_already_live", "The statement already has a live invoice.", { existingId: live.externalRef });
    const key = `${input.provider}:${input.environment}:${input.serie}`;
    const numeroDps = this.#numbers.get(key) ?? 1;
    this.#numbers.set(key, numeroDps + 1);
    const row: SubscriptionStatementInvoice = {
      id: randomUUID(),
      tenantId: input.tenantId,
      statementId: input.statementId,
      seq: input.seq,
      provider: input.provider,
      externalRef,
      providerInvoiceId: null,
      serieDps: input.serie,
      numeroDps,
      status: "pending",
      number: null,
      verificationCode: null,
      pdfUrl: null,
      xmlUrl: null,
      pdfSource: null,
      issuedAt: null,
      cancelledAt: null,
      cancelReason: null,
      cancelCode: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    this.#rows.set(row.id, row);
    await this.#mirror(input.tenantId, input.statementId, "pending");
    return { invoice: row, created: true, statementPaid };
  }

  async findByRef(tenantId: string, provider: string, externalRef: string): Promise<SubscriptionStatementInvoice | undefined> {
    return [...this.#rows.values()].find((row) => row.tenantId === tenantId && row.provider === provider && row.externalRef === externalRef);
  }

  async findLive(tenantId: string, statementId: string): Promise<SubscriptionStatementInvoice | undefined> {
    return [...this.#rows.values()].find((row) => row.tenantId === tenantId && row.statementId === statementId && LIVE_INVOICE_STATUSES.includes(row.status));
  }

  async listByStatement(tenantId: string, statementId: string): Promise<readonly SubscriptionStatementInvoice[]> {
    return [...this.#rows.values()]
      .filter((row) => row.tenantId === tenantId && row.statementId === statementId)
      .sort((a, b) => a.seq - b.seq);
  }

  async markIssued(tenantId: string, id: string, providerInvoiceId: string | null, now: Date): Promise<void> {
    const row = this.#get(tenantId, id);
    if (!row) return;
    await this.#patch(row, { providerInvoiceId: providerInvoiceId ?? row.providerInvoiceId, issuedAt: row.issuedAt ?? now }, now, "pending");
  }

  async markAuthorized(tenantId: string, id: string, patch: AuthorizedPatch, now: Date): Promise<void> {
    const row = this.#get(tenantId, id);
    if (!row) return;
    await this.#patch(
      row,
      { status: "authorized", number: patch.number ?? null, verificationCode: patch.verificationCode ?? null, pdfUrl: patch.pdfUrl ?? null, xmlUrl: patch.xmlUrl ?? null, pdfSource: patch.pdfSource, error: null },
      now,
      "authorized",
    );
  }

  async markRejected(tenantId: string, id: string, error: string | null, now: Date): Promise<void> {
    const row = this.#get(tenantId, id);
    if (!row || row.status !== "pending") return;
    await this.#patch(row, { status: "rejected", error }, now, "rejected");
  }

  async markCancelPending(tenantId: string, id: string, cancel: { readonly reason: string; readonly code: string }, now: Date): Promise<void> {
    const row = this.#get(tenantId, id);
    if (!row) return;
    await this.#patch(row, { status: "cancel_pending", cancelReason: cancel.reason, cancelCode: cancel.code }, now, "cancel_pending");
  }

  async markCancelFailed(tenantId: string, id: string, error: string | null, now: Date): Promise<void> {
    const row = this.#get(tenantId, id);
    if (!row || row.status !== "cancel_pending") return;
    await this.#patch(row, { status: "authorized", error }, now, "authorized");
  }

  async markCancelled(tenantId: string, id: string, now: Date): Promise<void> {
    const row = this.#get(tenantId, id);
    if (!row) return;
    await this.#patch(row, { status: "cancelled", cancelledAt: now }, now, "cancelled");
  }

  #get(tenantId: string, id: string): SubscriptionStatementInvoice | undefined {
    const row = this.#rows.get(id);
    return row && row.tenantId === tenantId ? row : undefined; // linha de outra organização = inexistente (como o RLS)
  }

  async #patch(row: SubscriptionStatementInvoice, patch: Partial<SubscriptionStatementInvoice>, now: Date, mirror: StatementInvoiceStatus): Promise<void> {
    this.#rows.set(row.id, { ...row, ...patch, updatedAt: now });
    await this.#mirror(row.tenantId, row.statementId, mirror);
  }

  async #mirror(tenantId: string, statementId: string, status: StatementInvoiceStatus): Promise<void> {
    if (!this.statements) return;
    await this.statements.transaction(tenantId, async (tx) => {
      const statement = await tx.lockById(statementId);
      if (statement && statement.invoiceStatus !== status) await tx.saveStatement({ ...statement, invoiceStatus: status });
    });
  }
}
