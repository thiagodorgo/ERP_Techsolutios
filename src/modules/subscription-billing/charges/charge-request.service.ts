// B-ASS-08 — conserto J-522 (C3-01 / R-CHG-2, D1; e C3-02 / R-PRF-1): o ENFILEIRAMENTO GUARDADO de `charge_create` e o
// resolver canônico de cliente do dispatcher.
//
//   - `requestChargeCreate` é o ÚNICO caminho de produção para pôr uma `charge_create` na outbox. 2º conserto do #522
//     (E8): é UMA transação numa UMA conexão, pela porta `ChargeIntentRepository` — `enqueueChargeCreateInTx` trava o
//     demonstrativo (`lockStatement` = o `FOR UPDATE` do D1, a 1ª instrução depois dos `set_config`), lê a cobrança viva e
//     as linhas da fila DEPOIS da concessão, aplica `chargeCreateEligibility`, calcula o `seq` SOB a trava
//     (1 + o maior `seq` já usado no demonstrativo) e SÓ ENTÃO grava `billing_statement_refs` + a linha. Reprovou →
//     `StatementError` 422 e NADA enfileirado. Dois pedidos concorrentes se serializam na trava: o 2º lê a linha do 1º
//     e sai 422 `charge_already_exists`. `created = false` no enfileiramento é impossível sob a trava e, se acontecer,
//     falha fechado com 409 `charge_intent_conflict` — nunca devolve "ok" sem linha nova. A rota HTTP `POST …/charge`
//     (08b) DEVE chamar este serviço, nunca `outbox.enqueue` direto; o fechamento (08b) chama `enqueueChargeCreateInTx`
//     sobre o `tx` do PRÓPRIO fechamento (pendência `P-ASS08-OBX5-EAGER-E-CANCEL`).
//     (A nota do 1º conserto dizia que o `enqueue` em transação própria era coberto "em profundidade" pelos UNIQUE e pelo
//     verdict do claim: a medição do diagnóstico ci522 desmentiu — o pedido se auto-bloqueava em P2028 e duas vivas do
//     mesmo demonstrativo davam 2 `createCharge`. Por isso a transação é uma só.)
//   - `profileCustomerResolver` (R-PRF-1): o `customerId` vem do PERFIL via `ensureCustomer` do provedor — nunca do
//     payload. Incompleto → `{ ok: false, missing }` (o dispatcher marca `NEEDS_REVIEW billing_profile_missing:<campos>`
//     sem nenhuma chamada ao provedor). O `ensureCustomer` é rede e roda no dispatcher, FORA de transação (R-OBX-1).
//     A persistência do `<provedor>_customer_id` no perfil (G12) é da 08b (pendência §7) — declarado.

import type { BillingProfileInput } from "../billing-profile/billing-profile.js";
import type { CustomerResolution } from "../outbox/outbox.dispatcher.js";
import type { BillingOutboxRow } from "../outbox/outbox.types.js";
import { StatementError } from "../statements/statement.types.js";
import { chargeCreateEligibility, chargeProfileGate } from "./charge-eligibility.js";
import type { ChargeIntentRepository, ChargeIntentTx } from "./charge-intent.repository.js";

export type ChargeRequestDeps = {
  readonly intents: ChargeIntentRepository;
};

export type ChargeRequestInput = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly provider: string;
  /** Nunca carrega `customerId` — o cliente é resolvido pelo PERFIL no dispatcher (R-PRF-1); a chave é descartada. */
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly now: Date;
};

export function requestChargeCreate(deps: ChargeRequestDeps, input: ChargeRequestInput): Promise<BillingOutboxRow> {
  return deps.intents.transaction(input.tenantId, (tx) => enqueueChargeCreateInTx(tx, input));
}

/**
 * O pedido sobre um `tx` JÁ ABERTO: a rota usa `requestChargeCreate`; o fechamento da 08b chama esta função sobre o `tx`
 * do próprio fechamento (nunca `requestChargeCreate` de dentro dele — seria outra conexão).
 */
export async function enqueueChargeCreateInTx(tx: ChargeIntentTx, input: ChargeRequestInput): Promise<BillingOutboxRow> {
  const statement = await tx.lockStatement(input.statementId);
  if (!statement) throw new StatementError(404, "statement_not_found", "Statement not found.");
  const liveCharge = await tx.findLiveCharge(input.statementId);
  const lines = await tx.listChargeLines(input.statementId);
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
  const seq = 1 + maxChargeCreateSeq(lines);
  // R-PRF-1: o payload gravado NÃO carrega `customerId` — por construção (a chave, se vier, é descartada).
  const { customerId: _droppedCustomerId, ...payload } = (input.payload ?? {}) as Record<string, unknown>;
  await tx.putRef({ statementId: statement.id, tenantId: input.tenantId, provider: input.provider }, input.now);
  const { row, created } = await tx.enqueue(
    { tenantId: input.tenantId, statementId: statement.id, kind: "charge_create", provider: input.provider, seq, payload },
    input.now,
  );
  if (!created) throw new StatementError(409, "charge_intent_conflict", "The charge intent key is already in use.");
  return row;
}

/**
 * O maior `seq` já usado pelas `charge_create` do demonstrativo (0 se nenhuma), lido da chave
 * `charge_create:<statement_id>:<seq>`. Chave fora desse formato é invariante quebrado: falha fechado (nada é gravado).
 */
export function maxChargeCreateSeq(lines: readonly BillingOutboxRow[]): number {
  let max = 0;
  for (const line of lines) {
    if (line.kind !== "charge_create") continue;
    const [kind, statementId, seqText, ...rest] = line.idempotencyKey.split(":");
    const seq = Number(seqText);
    if (kind !== "charge_create" || statementId !== line.statementId || rest.length > 0 || !/^[1-9][0-9]*$/.test(seqText ?? "") || !Number.isSafeInteger(seq)) {
      throw new Error(`billing_outbox: idempotency_key fora do formato charge_create:<statement_id>:<seq> (linha ${line.id}).`);
    }
    if (seq > max) max = seq;
  }
  return max;
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
