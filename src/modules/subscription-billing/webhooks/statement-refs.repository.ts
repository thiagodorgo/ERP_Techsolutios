// B-ASS-08 · F2/F5 — porta de `billing_statement_refs` + dublê em memória (plano §3.2, S8/G8). Índice GLOBAL de ids
// (statement_id → tenant_id) gravado NA MESMA transação do fechamento. É o que leva do `externalReference` recebido no
// webhook ao `tenant_id` SEM varrer N organizações sob RLS — a organização NUNCA vem do corpo do webhook (R-WH-5).

export type BillingStatementRef = {
  readonly statementId: string;
  readonly tenantId: string;
  readonly provider: string | null;
  readonly externalChargeId: string | null;
  readonly createdAt: Date;
};

export interface StatementRefRepository {
  /** Grava (idempotente) o índice de um demonstrativo. */
  put(ref: { statementId: string; tenantId: string; provider?: string | null; externalChargeId?: string | null }, now: Date): Promise<BillingStatementRef>;
  /** Resolve o `tenant_id` pelo NOSSO `statement_id` (nunca pelo payload). */
  resolve(statementId: string): Promise<BillingStatementRef | undefined>;
  setExternalChargeId(statementId: string, externalChargeId: string, now: Date): Promise<void>;
}

export class InMemoryStatementRefRepository implements StatementRefRepository {
  readonly #rows = new Map<string, BillingStatementRef>();

  async put(
    ref: { statementId: string; tenantId: string; provider?: string | null; externalChargeId?: string | null },
    now: Date,
  ): Promise<BillingStatementRef> {
    const existing = this.#rows.get(ref.statementId);
    const row: BillingStatementRef = {
      statementId: ref.statementId,
      tenantId: ref.tenantId,
      provider: ref.provider ?? existing?.provider ?? null,
      externalChargeId: ref.externalChargeId ?? existing?.externalChargeId ?? null,
      createdAt: existing?.createdAt ?? now,
    };
    this.#rows.set(ref.statementId, row);
    return row;
  }

  async resolve(statementId: string): Promise<BillingStatementRef | undefined> {
    return this.#rows.get(statementId);
  }

  /** Só atualiza (igual ao Prisma): o índice nasce no fechamento com a organização certa; sem linha → nada a fazer. */
  async setExternalChargeId(statementId: string, externalChargeId: string, _now: Date): Promise<void> {
    const existing = this.#rows.get(statementId);
    if (existing) this.#rows.set(statementId, { ...existing, externalChargeId, createdAt: existing.createdAt });
  }
}
