// B-ASS-08 — 2º conserto do #522 (E8, plano `B-ASS-08-conserto-c2.md` §2.4): a porta do pedido de cobrança no Prisma.
// UMA transação `withTenantRlsBudget` da organização e UMA conexão: o `lockStatement` é a 1ª instrução depois dos
// `set_config` (GUC da organização, `lock_timeout`, `statement_timeout`), e todas as outras operações recebem o MESMO
// `tx` (as funções `*InTx` extraídas dos repositórios, uma fonte só de SQL).
//
// Regra de ordem das travas (§2.1, escrita aqui e em `outbox.prisma.ts`, provada pelo T-LOCK-1a/T-LOCK-2): quem trava o
// demonstrativo trava-o PRIMEIRO e só depois as linhas da fila ou as cobranças. O claim trava o demonstrativo e a linha da
// fila numa instrução só, o demonstrativo primeiro, as duas com SKIP LOCKED (nunca espera). Nenhuma transação segura uma
// linha da fila e espera o demonstrativo.
//
// Orçamento: `lock_timeout` (5 s) MENOR que o `timeout` da transação (15 s) — uma espera longa vira 55P03 com rollback
// limpo (→ 409 `statement_busy`, que a rota da 08b trata como repetível), nunca P2028 com transação expirada.

import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRlsBudget } from "../../../database/rls.js";
import { enqueueInTx, listByStatementInTx, postgresErrorCode } from "../outbox/outbox.prisma.js";
import { StatementError, type StatementStatus } from "../statements/statement.types.js";
import { putRefInTx } from "../webhooks/statement-refs.prisma.js";
import type { ChargeIntentRepository, ChargeIntentTx } from "./charge-intent.repository.js";
import { findLiveInTx } from "./charges.prisma.js";

export const CHARGE_INTENT_BUDGET = { maxWait: 5_000, timeout: 15_000, lockTimeoutMs: 5_000, statementTimeoutMs: 10_000 } as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** As operações do pedido sobre um `tx` JÁ ABERTO sob o GUC da organização — exportado para o fechamento da 08b, que o
 * monta sobre o `tx` do PRÓPRIO fechamento (a trava do demonstrativo já está com ele: o `FOR UPDATE` reentra sem esperar). */
export function prismaChargeIntentTx(tx: Prisma.TransactionClient, tenantId: string): ChargeIntentTx {
  return {
    async lockStatement(statementId) {
      // Id que não é UUID responde "não existe" sem ir ao banco (o cast falharia com 22P02), como o `lockById`.
      if (!UUID.test(statementId)) return undefined;
      const rows = (await tx.$queryRawUnsafe(
        `SELECT id, status FROM subscription_statements WHERE id = $1::uuid AND tenant_id = $2::uuid FOR UPDATE`,
        statementId,
        tenantId,
      )) as Array<{ id: string; status: string }>;
      const row = rows[0];
      return row ? { id: row.id, status: row.status as StatementStatus } : undefined;
    },
    findLiveCharge: (statementId) => findLiveInTx(tx, statementId),
    listChargeLines: (statementId) => listByStatementInTx(tx, statementId),
    async putRef(ref, now) {
      await putRefInTx(tx, ref, now);
    },
    enqueue: (input, now) => enqueueInTx(tx, input, now),
  };
}

export class PrismaChargeIntentRepository implements ChargeIntentRepository {
  constructor(private readonly client: PrismaClient) {}

  async transaction<T>(tenantId: string, work: (tx: ChargeIntentTx) => Promise<T>): Promise<T> {
    try {
      return await withTenantRlsBudget(this.client, tenantId, CHARGE_INTENT_BUDGET, (tx) => work(prismaChargeIntentTx(tx, tenantId)));
    } catch (error) {
      // 55P03 = `lock_timeout`: o demonstrativo está travado por outra transação além do orçamento → repetível.
      if (postgresErrorCode(error) === "55P03") throw new StatementError(409, "statement_busy", "The statement is busy; try again.");
      throw error;
    }
  }
}
