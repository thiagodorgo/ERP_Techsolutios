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
   * `operator`, é só o corpo cru do pedido, e nenhuma chave dele é gravada (o marcador CHARGE-PAYLOAD). */
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

/** B-ASS-08c1b (P9a): os estados de um `charge_cancel` VIVO (o o marcador CANCEL-ONE: nunca dois para a mesma cobrança). */
export const LIVE_CHARGE_CANCEL_STATUSES: ReadonlySet<BillingOutboxRow["status"]> = new Set(["PENDING", "PROCESSING", "NEEDS_REVIEW"]);

export type ChargeCancelInput = {
  readonly tenantId: string;
  readonly statementId: string;
  /** O motivo do operador (10 caracteres ou mais, validado na rota); vai só para a trilha. */
  readonly reason: string;
  readonly actorId: string | null;
  readonly now: Date;
};

export type ChargeCancelOutcome = { readonly result: "skipped" | "cancel_enqueued"; readonly row: BillingOutboxRow };

/**
 * B-ASS-08c1b (P9a, abertura §4.3) — o `charge/cancel` do operador: UMA transação, o demonstrativo travado PRIMEIRO
 * (o marcador CANCEL-LOCK), e vale a 1ª regra que casar:
 *   1. `charge_create` PROCESSING → 409 `charge_in_flight` (a chamada em voo pode estar criando a cobrança);
 *   2. `charge_cancel` vivo para a MESMA cobrança → 409 `charge_cancel_in_progress` (o marcador CANCEL-ONE);
 *   3. `charge_create` PENDING → SKIPPED (`skip_reason` NULL, `last_error = charge_cancel_requested`), 0 rede; 0 linhas →
 *      409 `charge_in_flight`;
 *   4. `charge_create` SENT com a cobrança `pending` NA TABELA → enfileira `charge_cancel` (`seq` = 1 + o maior
 *      `charge_cancel` do demonstrativo; payload `{ chargeId, chargeCreateId }`; o provedor da linha SENT);
 *   5. só `charge_create` em NEEDS_REVIEW → 422 `outbox_needs_review` (a saída é o `/resolve`);
 *   6. nada disso → 422 `no_live_charge`.
 * A rota não fala com o provedor; quem cancela é o despacho. A trilha vai no MESMO `tx`.
 */
export function requestChargeCancel(deps: ChargeRequestDeps, input: ChargeCancelInput): Promise<ChargeCancelOutcome> {
  return deps.intents.transaction(input.tenantId, async (tx) => {
    const statement = await tx.lockStatement(input.statementId); // [CANCEL-LOCK]
    if (!statement) throw new StatementError(404, "statement_not_found", "Statement not found.");
    const lines = await tx.listChargeLines(input.statementId);
    const creates = lines.filter((line) => line.kind === "charge_create");
    if (creates.some((line) => line.status === "PROCESSING")) throw new StatementError(409, "charge_in_flight", "A charge request is in flight; try again.");
    const charges = await tx.listCharges(input.statementId);
    const target = creates.find(
      (line) =>
        line.status === "SENT" &&
        line.externalId !== null &&
        charges.some((charge) => charge.provider === line.provider && charge.externalChargeId === line.externalId && charge.status === "pending"),
    );
    if (target && lines.some((line) => line.kind === "charge_cancel" && LIVE_CHARGE_CANCEL_STATUSES.has(line.status) && line.payload.chargeId === target.externalId)) throw new StatementError(409, "charge_cancel_in_progress", "A cancellation for this charge is already in progress."); // [CANCEL-ONE]
    const pending = creates.find((line) => line.status === "PENDING");
    let outcome: ChargeCancelOutcome;
    if (pending) {
      const skipped = await tx.skipPendingChargeCreate(pending.id, "charge_cancel_requested", input.now);
      if (!skipped) throw new StatementError(409, "charge_in_flight", "A charge request is in flight; try again.");
      outcome = { result: "skipped", row: skipped };
    } else if (target) {
      const seq = 1 + maxOutboxSeq(lines, "charge_cancel");
      const { row, created } = await tx.enqueue(
        { tenantId: input.tenantId, statementId: statement.id, kind: "charge_cancel", provider: target.provider, seq, payload: { chargeId: target.externalId, chargeCreateId: target.id } },
        input.now,
      );
      if (!created) throw new StatementError(409, "charge_intent_conflict", "The charge intent key is already in use.");
      outcome = { result: "cancel_enqueued", row };
    } else if (creates.some((line) => line.status === "NEEDS_REVIEW")) {
      throw new StatementError(422, "outbox_needs_review", "The charge intent is awaiting review; resolve it first.");
    } else {
      throw new StatementError(422, "no_live_charge", "The statement has no live charge to cancel.");
    }
    await tx.recordAudit({
      actorId: input.actorId,
      action: "billing_outbox.charge_cancel_requested",
      entityId: outcome.row.id,
      metadata: { statementId: statement.id, kind: outcome.row.kind, code: outcome.result, reason: input.reason },
    });
    return outcome;
  });
}

export type UnknownChargeCancelInput = ChargeCancelInput & {
  /** O id da cobrança NO PROVEDOR, que o operador viu lá e o sistema não conhece (forma validada na rota). */
  readonly chargeId: string;
};

/**
 * B-ASS-08c1b (F7, abertura §4.7) — o `cancel-unknown` do operador: a saída da cobrança que existe no provedor com a
 * referência deste demonstrativo e que o sistema não conhece (a recobrança cuja resposta se perdeu). UMA transação, o
 * demonstrativo travado PRIMEIRO, e vale a 1ª regra que casar:
 *   1. o `chargeId` é CONHECIDO (o `external_id` de uma linha do demonstrativo, ou uma cobrança da tabela) → 422
 *      `charge_is_known`: o caminho dele é o `charge/cancel`;
 *   2. `charge_create` PROCESSING → 409 `charge_in_flight` (a chamada em voo pode estar criando justamente essa cobrança);
 *   3. `charge_cancel` vivo para o MESMO `chargeId` → 409 `charge_cancel_in_progress`;
 *   4. o demonstrativo nunca teve pedido de cobrança → 422 `no_live_charge` (não há cobrança nossa a cancelar, nem provedor);
 *   5. senão, enfileira `charge_cancel` com `{ chargeId, chargeCreateId: null, unknown: true }`, no provedor da última
 *      `charge_create` do demonstrativo, e a trilha `billing_outbox.unknown_charge_cancel_requested` no MESMO `tx`.
 * A rota não fala com o provedor: quem confere que a cobrança é da referência deste demonstrativo é o despacho (a lista do
 * provedor tem de trazê-la; senão, conferência e 0 DELETE).
 */
export function requestUnknownChargeCancel(deps: ChargeRequestDeps, input: UnknownChargeCancelInput): Promise<ChargeCancelOutcome> {
  return deps.intents.transaction(input.tenantId, async (tx) => {
    const statement = await tx.lockStatement(input.statementId);
    if (!statement) throw new StatementError(404, "statement_not_found", "Statement not found.");
    const lines = await tx.listChargeLines(input.statementId);
    const charges = await tx.listCharges(input.statementId);
    const known = lines.some((line) => line.externalId === input.chargeId) || charges.some((charge) => charge.externalChargeId === input.chargeId);
    if (known) throw new StatementError(422, "charge_is_known", "The charge is known to the system; use charge/cancel.");
    const creates = lines.filter((line) => line.kind === "charge_create");
    if (creates.some((line) => line.status === "PROCESSING")) throw new StatementError(409, "charge_in_flight", "A charge request is in flight; try again.");
    if (lines.some((line) => line.kind === "charge_cancel" && LIVE_CHARGE_CANCEL_STATUSES.has(line.status) && line.payload.chargeId === input.chargeId)) {
      throw new StatementError(409, "charge_cancel_in_progress", "A cancellation for this charge is already in progress.");
    }
    const latest = creates.at(-1);
    if (!latest) throw new StatementError(422, "no_live_charge", "The statement never had a charge request; there is no charge of ours to cancel.");
    const { row, created } = await tx.enqueue(
      {
        tenantId: input.tenantId,
        statementId: statement.id,
        kind: "charge_cancel",
        provider: latest.provider,
        seq: 1 + maxOutboxSeq(lines, "charge_cancel"),
        payload: { chargeId: input.chargeId, chargeCreateId: null, unknown: true },
      },
      input.now,
    );
    if (!created) throw new StatementError(409, "charge_intent_conflict", "The charge intent key is already in use.");
    await tx.recordAudit({
      actorId: input.actorId,
      action: "billing_outbox.unknown_charge_cancel_requested",
      entityId: row.id,
      metadata: { statementId: statement.id, kind: row.kind, code: "cancel_enqueued", chargeId: input.chargeId, reason: input.reason },
    });
    return { result: "cancel_enqueued", row };
  });
}

/**
 * B-ASS-08c1b: o maior `seq` já usado pelas linhas `kind` do demonstrativo (0 se nenhuma), lido da chave
 * `<kind>:<statement_id>:<seq>`. Chave fora desse formato é invariante quebrado: falha fechado (nada é gravado).
 */
export function maxOutboxSeq(lines: readonly BillingOutboxRow[], kind: BillingOutboxRow["kind"]): number {
  let max = 0;
  for (const line of lines) {
    if (line.kind !== kind) continue;
    const [lineKind, statementId, seqText, ...rest] = line.idempotencyKey.split(":");
    const seq = Number(seqText);
    if (lineKind !== kind || statementId !== line.statementId || rest.length > 0 || !/^[1-9][0-9]*$/.test(seqText ?? "") || !Number.isSafeInteger(seq)) {
      throw new Error(`billing_outbox: idempotency_key fora do formato ${kind}:<statement_id>:<seq> (linha ${line.id}).`);
    }
    if (seq > max) max = seq;
  }
  return max;
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
