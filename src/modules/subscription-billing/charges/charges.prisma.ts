// B-ASS-08 · F11 — repositório Prisma de `subscription_statement_charges` (FORCE RLS). Toda operação roda sob
// `withTenantRls(tenantId)`. `due_date` é DATE de negócio (texto `YYYY-MM-DD`), convertido por `::date` no SQL.

import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../../database/rls.js";
import type { ChargeStatus } from "../statements/statement.types.js";
import type { StatementChargeRepository } from "./charges.repository.js";
import type { NewStatementCharge, SubscriptionStatementCharge } from "./charges.types.js";

type Row = {
  id: string;
  tenant_id: string;
  statement_id: string;
  provider: string;
  external_charge_id: string;
  status: string;
  pay_url: string | null;
  pix_copy_paste: string | null;
  boleto_line: string | null;
  boleto_url: string | null;
  due_date: Date | null;
  created_at: Date;
  cancelled_at: Date | null;
};

function toDomain(row: Row): SubscriptionStatementCharge {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    statementId: row.statement_id,
    provider: row.provider,
    externalChargeId: row.external_charge_id,
    status: row.status as ChargeStatus,
    payUrl: row.pay_url,
    pixCopyPaste: row.pix_copy_paste,
    boletoLine: row.boleto_line,
    boletoUrl: row.boleto_url,
    dueDate: row.due_date ? row.due_date.toISOString().slice(0, 10) : null,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

/** A cobrança VIVA do demonstrativo sobre um `tx` JÁ ABERTO sob o GUC da organização (extraído de `findLive`,
 * comportamento idêntico). O pedido de cobrança a lê no MESMO `tx` da trava do demonstrativo (E8). */
export async function findLiveInTx(tx: Pick<PrismaClient, "$queryRawUnsafe">, statementId: string): Promise<SubscriptionStatementCharge | undefined> {
  const rows = (await tx.$queryRawUnsafe(
    `SELECT * FROM subscription_statement_charges WHERE statement_id = $1::uuid AND status IN ('pending', 'confirmed') LIMIT 1`,
    statementId,
  )) as Row[];
  return rows.length > 0 ? toDomain(rows[0]!) : undefined;
}

export class PrismaStatementChargeRepository implements StatementChargeRepository {
  constructor(private readonly client: PrismaClient) {}

  async insert(input: NewStatementCharge, now: Date): Promise<SubscriptionStatementCharge> {
    return withTenantRls(this.client, input.tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `INSERT INTO subscription_statement_charges
           (tenant_id, statement_id, provider, external_charge_id, status, pay_url, pix_copy_paste, boleto_line, boleto_url, due_date, created_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::date, $11) RETURNING *`,
        input.tenantId,
        input.statementId,
        input.provider,
        input.externalChargeId,
        input.status,
        input.payUrl ?? null,
        input.pixCopyPaste ?? null,
        input.boletoLine ?? null,
        input.boletoUrl ?? null,
        input.dueDate ?? null,
        now,
      )) as Row[];
      return toDomain(rows[0]!);
    });
  }

  async listByStatement(tenantId: string, statementId: string): Promise<readonly SubscriptionStatementCharge[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT * FROM subscription_statement_charges WHERE statement_id = $1::uuid ORDER BY created_at ASC`,
        statementId,
      )) as Row[];
      return rows.map(toDomain);
    });
  }

  async findLive(tenantId: string, statementId: string): Promise<SubscriptionStatementCharge | undefined> {
    return withTenantRls(this.client, tenantId, (tx) => findLiveInTx(tx, statementId));
  }

  async setStatus(tenantId: string, id: string, status: ChargeStatus, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE subscription_statement_charges SET status = $2, cancelled_at = CASE WHEN $2 = 'cancelled' THEN $3 ELSE cancelled_at END WHERE id = $1::uuid`,
        id,
        status,
        now,
      );
    });
  }

  async cancel(tenantId: string, id: string, now: Date): Promise<void> {
    await withTenantRls(this.client, tenantId, async (tx) => {
      await tx.$executeRawUnsafe(`UPDATE subscription_statement_charges SET status = 'cancelled', cancelled_at = $2 WHERE id = $1::uuid`, id, now);
    });
  }
}
