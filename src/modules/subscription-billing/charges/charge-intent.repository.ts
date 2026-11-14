// B-ASS-08 — 2º conserto do #522 (E8, plano `B-ASS-08-conserto-c2.md` §2.4): a PORTA do pedido de cobrança. Uma
// transação só, numa conexão só: trava o demonstrativo (o `FOR UPDATE` do D1), lê a cobrança viva e as linhas da fila
// DEPOIS da concessão, grava o índice de ids e a linha. Quem decide é o serviço (`enqueueChargeCreateInTx`); a porta só
// executa, sempre sobre o MESMO `tx`.
//
// Por que uma porta própria: o pedido do 1º conserto travava o demonstrativo numa conexão (`statements.transaction`) e
// enfileirava por outra (`outbox.enqueue` abria a sua própria transação). No Prisma, o INSERT da 2ª conexão esperava a 1ª
// no KEY SHARE da FK e a transação interativa estourava em P2028 (diagnóstico ci522, fato F4).
//
// O dublê compõe os dublês em memória e é TIPADO com eles, de propósito: compor um repositório Prisma nele reabriria a
// janela de duas conexões. A trava do dublê é a fila serializada de `InMemoryStatementRepository.transaction`.

import type { InMemoryOutboxRepository } from "../outbox/outbox.repository.js";
import type { BillingOutboxRow, NewOutboxRow } from "../outbox/outbox.types.js";
import type { InMemoryStatementRepository } from "../statements/statement.repository.js";
import type { SubscriptionStatement } from "../statements/statement.types.js";
import type { InMemoryStatementRefRepository } from "../webhooks/statement-refs.repository.js";
import type { InMemoryStatementChargeRepository } from "./charges.repository.js";
import type { SubscriptionStatementCharge } from "./charges.types.js";

/** O que a trava devolve: o que a elegibilidade lê e, B-ASS-08c1b (P4, `[CHARGE-PAYLOAD]`), o que o servidor usa para montar
 * o payload com o demonstrativo travado (o total, o já pago e o vencimento). */
export type LockedStatement = Pick<SubscriptionStatement, "id" | "status" | "totalCents" | "paidCents" | "dueDate">;

/** As operações do pedido, todas na MESMA transação e na MESMA conexão da organização. */
export type ChargeIntentTx = {
  /** `SELECT … FOR UPDATE` do demonstrativo: a 1ª instrução depois dos `set_config`. `undefined` se não existe. */
  lockStatement(statementId: string): Promise<LockedStatement | undefined>;
  /** A cobrança VIVA (`pending`/`confirmed`), lida DEPOIS da concessão da trava. */
  findLiveCharge(statementId: string): Promise<SubscriptionStatementCharge | undefined>;
  /** Todas as linhas da fila do demonstrativo, lidas DEPOIS da concessão da trava (a elegibilidade filtra o tipo). */
  listChargeLines(statementId: string): Promise<readonly BillingOutboxRow[]>;
  /** O índice GLOBAL de ids (`billing_statement_refs`), idempotente. */
  putRef(ref: { readonly statementId: string; readonly tenantId: string; readonly provider: string }, now: Date): Promise<void>;
  /** `INSERT … ON CONFLICT (idempotency_key) DO NOTHING`; `created = false` se a chave já existia. */
  enqueue(input: NewOutboxRow, now: Date): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }>;
  /** B-ASS-08c1b (P9a): as cobranças do demonstrativo NA TABELA, lidas DEPOIS da trava (qualquer status). */
  listCharges(statementId: string): Promise<readonly SubscriptionStatementCharge[]>;
  /** B-ASS-08c1b (P9a): a `charge_create` PENDING vira SKIPPED (`skip_reason` NULL, `last_error` = o motivo) SÓ se ainda está
   * PENDING; `undefined` se não estava (o claim a pegou primeiro). */
  skipPendingChargeCreate(outboxId: string, lastError: string, now: Date): Promise<BillingOutboxRow | undefined>;
  /** B-ASS-08c1b (P9a, F7): a trilha da ação do operador, NA MESMA transação; só ids, `kind`, código e o motivo. */
  recordAudit(event: ChargeIntentAuditEvent): Promise<void>;
};

/** B-ASS-08c1b: a trilha das ações de cancelamento do operador (gravada em `audit_logs` da organização, no `tx` da ação). */
export type ChargeIntentAuditEvent = {
  readonly actorId: string | null;
  readonly action: "billing_outbox.charge_cancel_requested" | "billing_outbox.unknown_charge_cancel_requested";
  readonly entityId: string;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
};

export interface ChargeIntentRepository {
  transaction<T>(tenantId: string, work: (tx: ChargeIntentTx) => Promise<T>): Promise<T>;
}

export type InMemoryChargeIntentDeps = {
  readonly statements: InMemoryStatementRepository;
  readonly charges: InMemoryStatementChargeRepository;
  readonly outbox: InMemoryOutboxRepository;
  readonly refs: InMemoryStatementRefRepository;
};

export class InMemoryChargeIntentRepository implements ChargeIntentRepository {
  /** A trilha do dublê (o Prisma grava em `audit_logs`). Só as ações que terminaram sem erro. */
  readonly audits: Array<ChargeIntentAuditEvent & { readonly tenantId: string }> = [];

  constructor(private readonly deps: InMemoryChargeIntentDeps) {}

  transaction<T>(tenantId: string, work: (tx: ChargeIntentTx) => Promise<T>): Promise<T> {
    const { statements, charges, outbox, refs } = this.deps;
    const audits = this.audits;
    return statements.transaction(tenantId, (stx) =>
      work({
        async lockStatement(statementId) {
          const statement = await stx.lockById(statementId);
          return statement && { id: statement.id, status: statement.status, totalCents: statement.totalCents, paidCents: statement.paidCents, dueDate: statement.dueDate };
        },
        findLiveCharge: (statementId) => charges.findLive(tenantId, statementId),
        listChargeLines: (statementId) => outbox.listByStatement(tenantId, statementId),
        async putRef(ref, now) {
          await refs.put(ref, now);
        },
        enqueue: (input, now) => outbox.enqueue(input, now),
        listCharges: (statementId) => charges.listByStatement(tenantId, statementId),
        skipPendingChargeCreate: (outboxId, lastError, now) => outbox.skipPendingChargeCreate(tenantId, outboxId, lastError, now),
        async recordAudit(event) {
          audits.push({ ...event, tenantId });
        },
      }),
    );
  }
}
