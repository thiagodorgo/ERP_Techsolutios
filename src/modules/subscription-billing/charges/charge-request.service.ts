// B-ASS-08 — conserto J-522 (C3-01 / R-CHG-2, D1; e C3-02 / R-PRF-1): o ENFILEIRAMENTO GUARDADO de `charge_create` e o
// resolver canônico de cliente do dispatcher.
//
//   - `requestChargeCreate` é o ÚNICO caminho de produção para pôr uma `charge_create` na outbox: dentro de
//     `statements.transaction` ele TRAVA o demonstrativo (`lockById` = o `FOR UPDATE` do D1), lê a cobrança viva e as
//     linhas da fila, aplica `chargeCreateEligibility` e SÓ ENTÃO grava `billing_statement_refs` + a linha. Reprovou →
//     `StatementError` 422 e NADA enfileirado. A rota HTTP `POST …/charge` (08b) DEVE chamar este serviço, nunca
//     `outbox.enqueue` direto (pendência `P-ASS08-OBX5-EAGER-E-CANCEL`).
//     Nota declarada (plano do conserto §8.1): no Prisma o `enqueue` roda em transação própria logo após a travada; a
//     janela residual é coberta em profundidade pelo UNIQUE `idempotency_key`, pelo UNIQUE parcial `pending`-por-
//     demonstrativo da M5 e pelo verdict do claim (R-OBX-5), que devolve `NEEDS_REVIEW charge_already_exists` DEPOIS.
//   - `profileCustomerResolver` (R-PRF-1): o `customerId` vem do PERFIL via `ensureCustomer` do provedor — nunca do
//     payload. Incompleto → `{ ok: false, missing }` (o dispatcher marca `NEEDS_REVIEW billing_profile_missing:<campos>`
//     sem nenhuma chamada ao provedor). O `ensureCustomer` é rede e roda no dispatcher, FORA de transação (R-OBX-1).
//     A persistência do `<provedor>_customer_id` no perfil (G12) é da 08b (pendência §7) — declarado.

import type { BillingProfileInput } from "../billing-profile/billing-profile.js";
import type { CustomerResolution } from "../outbox/outbox.dispatcher.js";
import type { OutboxRepository } from "../outbox/outbox.repository.js";
import type { BillingOutboxRow } from "../outbox/outbox.types.js";
import type { StatementRepository } from "../statements/statement.repository.js";
import { StatementError } from "../statements/statement.types.js";
import type { StatementRefRepository } from "../webhooks/statement-refs.repository.js";
import { chargeCreateEligibility, chargeProfileGate } from "./charge-eligibility.js";
import type { StatementChargeRepository } from "./charges.repository.js";

export type ChargeRequestDeps = {
  readonly statements: StatementRepository;
  readonly charges: StatementChargeRepository;
  readonly outbox: OutboxRepository;
  readonly refs: StatementRefRepository;
};

export type ChargeRequestInput = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly provider: string;
  readonly seq: number;
  /** Nunca carrega `customerId` — o cliente é resolvido pelo PERFIL no dispatcher (R-PRF-1); a chave é descartada. */
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly now: Date;
};

export async function requestChargeCreate(deps: ChargeRequestDeps, input: ChargeRequestInput): Promise<BillingOutboxRow> {
  return deps.statements.transaction(input.tenantId, async (tx) => {
    const statement = await tx.lockById(input.statementId);
    if (!statement) throw new StatementError(404, "statement_not_found", "Statement not found.");
    const liveCharge = await deps.charges.findLive(input.tenantId, input.statementId);
    const lines = await deps.outbox.listByStatement(input.tenantId, input.statementId);
    const eligibility = chargeCreateEligibility(statement, liveCharge, lines);
    if (!eligibility.ok) {
      throw new StatementError(
        422,
        eligibility.reason,
        eligibility.reason === "statement_not_closed"
          ? "Charges are requested only on closed statements."
          : "The statement already has a live charge or charge intent.",
      );
    }
    // R-PRF-1: o payload gravado NÃO carrega `customerId` — por construção (a chave, se vier, é descartada).
    const { customerId: _droppedCustomerId, ...payload } = (input.payload ?? {}) as Record<string, unknown>;
    await deps.refs.put({ statementId: statement.id, tenantId: input.tenantId, provider: input.provider }, input.now);
    const { row } = await deps.outbox.enqueue(
      { tenantId: input.tenantId, statementId: statement.id, kind: "charge_create", provider: input.provider, seq: input.seq, payload },
      input.now,
    );
    return row;
  });
}

/**
 * O resolver canônico do `DispatcherDeps.resolveCustomer` (R-PRF-1): lê o perfil, aplica o gate e, completo, pede o
 * `customerId` ao provedor (`ensureCustomer` — rede, fora de transação). Incompleto → `missing[]` visível, 0 rede.
 */
export function profileCustomerResolver(
  readProfile: (tenantId: string) => Promise<BillingProfileInput | null>,
): (row: BillingOutboxRow, port: { ensureCustomer(profile: { readonly name: string; readonly document: string; readonly email?: string }): Promise<{ readonly customerId: string }> }) => Promise<CustomerResolution> {
  return async (row, port) => {
    const profile = await readProfile(row.tenantId);
    const gate = chargeProfileGate(profile);
    if (!gate.ok) return { ok: false, missing: gate.missing };
    // gate ok ⇒ `missingFields` vazio ⇒ perfil presente com `legalName`/`document` preenchidos (a narração é do gate).
    const complete = profile!;
    const { customerId } = await port.ensureCustomer({
      name: complete.legalName!,
      document: complete.document!,
      email: complete.email ?? undefined,
    });
    return { ok: true, customerId };
  };
}
