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
import type { PaymentMethod } from "../providers/payment/payment-provider.port.js";
import { StatementError } from "../statements/statement.types.js";
import { chargeCreateEligibility, chargeProfileGate } from "./charge-eligibility.js";
import type { ChargeIntentRepository, ChargeIntentTx } from "./charge-intent.repository.js";

export type ChargeRequestDeps = {
  readonly intents: ChargeIntentRepository;
};

/** B-ASS-08c1b (P4): o pedido do OPERADOR pela rota `/charge` — método e vencimento já validados na forma
 * (`parseOperatorChargeMethod`, `parseOperatorDueDate`). Com ele, o servidor monta o payload com o demonstrativo travado. */
export type OperatorChargeRequest = { readonly method: PaymentMethod; readonly dueDate?: string };

export type ChargeRequestInput = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly provider: string;
  /** Nunca carrega `customerId` — o cliente é resolvido pelo PERFIL no dispatcher (R-PRF-1); a chave é descartada. Com
   * `operator`, é só o corpo cru do pedido, e nenhuma chave dele é gravada (`[CHARGE-PAYLOAD]`). */
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly operator?: OperatorChargeRequest;
  readonly now: Date;
};

/** B-ASS-08c1b (P4): os métodos que o operador pode pedir; outro valor → 400. */
export const OPERATOR_CHARGE_METHODS: readonly PaymentMethod[] = ["pix", "boleto", "credit_card", "debit_card"];

const SAO_PAULO_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** O dia civil de America/Sao_Paulo do relógio dado (`Intl`, `en-CA`) — nunca a data UTC. */
export function saoPauloDay(at: Date): string {
  return SAO_PAULO_DAY.format(at);
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** B-ASS-08c1b (P4): `method` do corpo; ausente → `pix`; fora da lista → 400 `invalid_method`. */
export function parseOperatorChargeMethod(value: unknown): PaymentMethod {
  if (value === undefined || value === null) return "pix";
  if (typeof value === "string" && OPERATOR_CHARGE_METHODS.includes(value as PaymentMethod)) return value as PaymentMethod;
  throw new StatementError(400, "invalid_method", "method must be pix, boleto, credit_card or debit_card.");
}

/** B-ASS-08c1b (P4; Emenda 1 §3.6): o vencimento informado pelo operador — `AAAA-MM-DD`, um dia que existe, de hoje a hoje +
 * 60 dias (dia civil de São Paulo). Ausente → `undefined`; fora da forma ou da faixa → 400 `invalid_due_date`. */
export function parseOperatorDueDate(value: unknown, now: Date): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = typeof value === "string" ? value.trim() : "";
  const today = saoPauloDay(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || addDays(text, 0) !== text || text < today || text > addDays(today, 60)) {
    throw new StatementError(400, "invalid_due_date", "dueDate must be YYYY-MM-DD, from today to today + 60 days (America/Sao_Paulo).");
  }
  return text;
}

/**
 * B-ASS-08c1b (P4; Emenda 1 §3.6): o vencimento da cobrança pedida pelo operador. O do demonstrativo, se ainda não venceu (dia
 * civil de São Paulo); vencido ou nulo (a coluna aceita nulo), o informado, sem o qual → 422 `due_date_required` — o sistema
 * não inventa prazo para conta antiga (Q1). Informado com o do demonstrativo ainda valendo → 422 `due_date_not_past` (a data
 * não é ignorada em silêncio, como no `/retry`).
 */
export function operatorChargeDueDate(statementDueDate: string | null, informed: string | undefined, now: Date): string {
  const today = saoPauloDay(now);
  if (statementDueDate === null || statementDueDate < today) {
    if (!informed) throw new StatementError(422, "due_date_required", "The statement due date has passed; inform dueDate.");
    return informed;
  }
  if (informed) throw new StatementError(422, "due_date_not_past", "The statement due date has not passed; dueDate is not accepted.");
  return statementDueDate;
}

const ELIGIBILITY_MESSAGES = {
  statement_not_closed: "Charges are requested only on closed statements.",
  charge_already_exists: "The statement already has a live charge or charge intent.",
  statement_partially_paid: "The statement has a partial payment; a full-amount charge is refused.",
} as const;

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
  if (!eligibility.ok) throw new StatementError(422, eligibility.reason, ELIGIBILITY_MESSAGES[eligibility.reason]);
  const seq = 1 + maxChargeCreateSeq(lines);
  // R-PRF-1: o payload gravado NÃO carrega `customerId` — por construção (a chave, se vier, é descartada).
  const { customerId: _droppedCustomerId, ...requested } = (input.payload ?? {}) as Record<string, unknown>;
  // B-ASS-08c1b (P4): no pedido do OPERADOR o servidor monta o payload com o demonstrativo TRAVADO — o valor é o total (a
  // régua V exige o total) e o corpo (`requested`) nunca decide valor nenhum: chave de valor no corpo é ignorada.
  const payload = input.operator
    ? {
        amountCents: statement.totalCents, // [CHARGE-PAYLOAD]
        dueDate: operatorChargeDueDate(statement.dueDate, input.operator.dueDate, input.now),
        method: input.operator.method,
      }
    : requested;
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
