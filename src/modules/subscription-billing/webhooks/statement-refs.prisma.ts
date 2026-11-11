// B-ASS-08 · F11 — repositório Prisma de `billing_statement_refs` (tabela GLOBAL de ids, sem RLS; S8/G8). Leva do
// `externalReference` recebido no webhook ao `tenant_id` SEM varrer N organizações sob RLS. Gravada na transação do
// fechamento. Nenhum dado de negócio — só ids.

import type { PrismaClient } from "@prisma/client";

import type { BillingStatementRef, StatementRefRepository } from "./statement-refs.repository.js";

type Row = { statement_id: string; tenant_id: string; provider: string | null; external_charge_id: string | null; created_at: Date };

function toDomain(row: Row): BillingStatementRef {
  return { statementId: row.statement_id, tenantId: row.tenant_id, provider: row.provider, externalChargeId: row.external_charge_id, createdAt: row.created_at };
}

/** O UPSERT do índice sobre o cliente OU um `tx` JÁ ABERTO (extraído de `put`, comportamento idêntico). O pedido de
 * cobrança o grava no MESMO `tx` da trava do demonstrativo (E8): a tabela é GLOBAL (sem RLS), só ids. */
export async function putRefInTx(
  tx: Pick<PrismaClient, "$queryRawUnsafe">,
  ref: { statementId: string; tenantId: string; provider?: string | null; externalChargeId?: string | null },
  now: Date,
): Promise<BillingStatementRef> {
  const rows = (await tx.$queryRawUnsafe(
    `INSERT INTO billing_statement_refs (statement_id, tenant_id, provider, external_charge_id, created_at)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5)
     ON CONFLICT (statement_id) DO UPDATE
       SET provider = COALESCE(EXCLUDED.provider, billing_statement_refs.provider),
           external_charge_id = COALESCE(EXCLUDED.external_charge_id, billing_statement_refs.external_charge_id)
     RETURNING *`,
    ref.statementId,
    ref.tenantId,
    ref.provider ?? null,
    ref.externalChargeId ?? null,
    now,
  )) as Row[];
  return toDomain(rows[0]!);
}

export class PrismaStatementRefRepository implements StatementRefRepository {
  constructor(private readonly client: PrismaClient) {}

  async put(ref: { statementId: string; tenantId: string; provider?: string | null; externalChargeId?: string | null }, now: Date): Promise<BillingStatementRef> {
    return putRefInTx(this.client, ref, now);
  }

  async resolve(statementId: string): Promise<BillingStatementRef | undefined> {
    const rows = (await this.client.$queryRawUnsafe(`SELECT * FROM billing_statement_refs WHERE statement_id = $1::uuid`, statementId)) as Row[];
    return rows.length > 0 ? toDomain(rows[0]!) : undefined;
  }

  /** Só ATUALIZA: o índice nasce SEMPRE no fechamento (N1), com a organização certa. Nunca cria linha aqui — criar sem a
   * organização certa geraria um índice falso (ou violaria a FK para `tenants`). Sem linha → nada a fazer. */
  async setExternalChargeId(statementId: string, externalChargeId: string, _now: Date): Promise<void> {
    await this.client.$executeRawUnsafe(
      `UPDATE billing_statement_refs SET external_charge_id = $2 WHERE statement_id = $1::uuid`,
      statementId,
      externalChargeId,
    );
  }
}
