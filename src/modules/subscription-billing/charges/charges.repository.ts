// B-ASS-08 · F7 — porta + dublê em memória de `subscription_statement_charges` (G11). UNIQUE (provider, external_charge_id)
// e UNIQUE parcial (statement_id) WHERE status = 'pending' (uma cobrança viva por demonstrativo) nascem no banco (M5/F11).

import { randomUUID } from "node:crypto";

import type { ChargeStatus } from "../statements/statement.types.js";
import { CHARGE_RULES } from "./charge-rules.js";
import type { NewStatementCharge, SubscriptionStatementCharge } from "./charges.types.js";

export interface StatementChargeRepository {
  insert(input: NewStatementCharge, now: Date): Promise<SubscriptionStatementCharge>;
  listByStatement(tenantId: string, statementId: string): Promise<readonly SubscriptionStatementCharge[]>;
  /** A cobrança VIVA (`pending`/`confirmed`) do demonstrativo, se houver. */
  findLive(tenantId: string, statementId: string): Promise<SubscriptionStatementCharge | undefined>;
  // Tenant-scoped (FORCE RLS): no Prisma rodam em `withTenantRls(tenantId)`. O dublê valida o tenant como o RLS faria.
  setStatus(tenantId: string, id: string, status: ChargeStatus, now: Date): Promise<void>;
  cancel(tenantId: string, id: string, now: Date): Promise<void>;
}

export class InMemoryStatementChargeRepository implements StatementChargeRepository {
  readonly #rows = new Map<string, SubscriptionStatementCharge>();

  async insert(input: NewStatementCharge, now: Date): Promise<SubscriptionStatementCharge> {
    const row: SubscriptionStatementCharge = {
      id: randomUUID(),
      tenantId: input.tenantId,
      statementId: input.statementId,
      provider: input.provider,
      externalChargeId: input.externalChargeId,
      status: input.status,
      payUrl: input.payUrl ?? null,
      pixCopyPaste: input.pixCopyPaste ?? null,
      boletoLine: input.boletoLine ?? null,
      boletoUrl: input.boletoUrl ?? null,
      dueDate: input.dueDate ?? null,
      createdAt: now,
      cancelledAt: null,
    };
    this.#rows.set(row.id, row);
    return row;
  }

  async listByStatement(tenantId: string, statementId: string): Promise<readonly SubscriptionStatementCharge[]> {
    return [...this.#rows.values()]
      .filter((row) => row.tenantId === tenantId && row.statementId === statementId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async findLive(tenantId: string, statementId: string): Promise<SubscriptionStatementCharge | undefined> {
    return [...this.#rows.values()].find(
      (row) => row.tenantId === tenantId && row.statementId === statementId && CHARGE_RULES[row.status].occupiesSlot,
    );
  }

  async setStatus(tenantId: string, id: string, status: ChargeStatus, now: Date): Promise<void> {
    const row = this.#rows.get(id);
    if (row && row.tenantId === tenantId) this.#rows.set(id, { ...row, status, createdAt: row.createdAt, cancelledAt: status === "cancelled" ? now : row.cancelledAt });
  }

  async cancel(tenantId: string, id: string, now: Date): Promise<void> {
    const row = this.#rows.get(id);
    if (row && row.tenantId === tenantId) this.#rows.set(id, { ...row, status: "cancelled", cancelledAt: now });
  }

  /** B-ASS-08c1c (R2-03): o espelho do `syncCharge` do Prisma — as cobranças do demonstrativo pelo id no provedor (ou, na
   * disputa, num estado) passam ao `status` dado; `cancelled_at` só se `cancelled`. Zero linhas é normal. */
  async syncByStatement(
    tenantId: string,
    statementId: string,
    match: { readonly externalChargeId: string } | { readonly status: ChargeStatus },
    status: ChargeStatus,
    now: Date,
  ): Promise<void> {
    for (const row of this.#rows.values()) {
      if (row.tenantId !== tenantId || row.statementId !== statementId) continue;
      if ("externalChargeId" in match ? row.externalChargeId !== match.externalChargeId : row.status !== match.status) continue;
      this.#rows.set(row.id, { ...row, status, cancelledAt: status === "cancelled" ? (row.cancelledAt ?? now) : row.cancelledAt });
    }
  }
}
