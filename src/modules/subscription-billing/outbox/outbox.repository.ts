// B-ASS-08 · F1 — porta de persistência da outbox + dublê em memória. O Prisma (F10/F11) implementa a mesma porta:
// `claimNext` trava o demonstrativo e a linha numa instrução só (E5″, 2º conserto do #522), RELÊ o demonstrativo e aplica
// a política de elegibilidade (`ClaimParams.verdict`, R-OBX-5) na MESMA transação curta, e só então grava PROCESSING /
// SKIPPED / NEEDS_REVIEW. O dublê serializa os claims (uma fila global) para reproduzir o SKIP LOCKED sem corrida, e
// escolhe na MESMA ordem do Prisma (órfã, `charge_create`, outros tipos); ele não emula a trava do demonstrativo.

import { randomUUID } from "node:crypto";

import { StatementError, type StatementStatus } from "../statements/statement.types.js";
import type { ChargeLookup, ChargeResult, ChargeStatus as ProviderChargeStatus } from "../providers/payment/payment-provider.port.js";
import type { NewStatementCharge } from "../charges/charges.types.js";
import {
  idempotencyKeyOf,
  type BillingOutboxRow,
  type ClaimNeedsReviewCode,
  type ClaimVerdict,
  type NewOutboxRow,
  type OutboxSkipReason,
  type OutboxStatus,
  type StatementClaimSnapshot,
} from "./outbox.types.js";

/** A política de elegibilidade do claim (R-OBX-5): pura, decidida pelo dispatcher (`chargeCreateClaimVerdict`). */
export type ClaimVerdictFn = (row: BillingOutboxRow, statement: StatementClaimSnapshot | undefined) => ClaimVerdict;

export type ClaimParams = {
  readonly enabledProviders: readonly string[];
  readonly now: Date;
  readonly claimedBy: string;
  readonly orphanMs: number;
  /** R-OBX-5 (D2) — OBRIGATÓRIA: quem chama `claimNext` sem política não compila (fail-closed por construção). Aplicada
   * na transação do claim a toda PENDING `charge_create`, sobre o demonstrativo relido; a órfã (PROCESSING) não passa por
   * ela — só reconsulta por referência (E3). */
  readonly verdict: ClaimVerdictFn;
};

/** O que o claim devolve: a linha reclamada (PROCESSING), ou a linha que a política pulou / pôs em revisão — sem rede. */
export type ClaimResult =
  | { readonly kind: "claimed"; readonly row: BillingOutboxRow; readonly wasOrphan: boolean }
  | { readonly kind: "skipped"; readonly row: BillingOutboxRow; readonly skipReason: OutboxSkipReason }
  | { readonly kind: "needs_review"; readonly row: BillingOutboxRow; readonly code: ClaimNeedsReviewCode };

/** Identidade imutável da posse adquirida pelo claim. Toda escrita do despacho precisa apresentá-la. */
export type OutboxLease = {
  readonly claimedBy: string;
  readonly attemptStartedAt: Date;
};

export function leaseOf(row: BillingOutboxRow): OutboxLease {
  if (!row.claimedBy || !row.attemptStartedAt) throw new Error("claimed outbox row has no lease");
  return { claimedBy: row.claimedBy, attemptStartedAt: row.attemptStartedAt };
}

export type ChargeRecordOutcome =
  | { readonly kind: "created"; readonly result: ChargeResult }
  | { readonly kind: "adopted"; readonly chargeId: string; readonly lookup: ChargeLookup };

export type ChargeOutcomeSink = (charge: NewStatementCharge, now: Date) => Promise<void>;
/** B-ASS-08c1b: o cancelamento da cobrança da tabela (provedor + id externo) no dublê em memória. */
export type ChargeCancelSink = (charge: { readonly tenantId: string; readonly provider: string; readonly externalChargeId: string }, now: Date) => Promise<void>;

export function recordedChargeStatus(kind: ChargeRecordOutcome["kind"], status: ProviderChargeStatus): NewStatementCharge["status"] {
  if (kind === "created") return "pending";
  switch (status) {
    case "pending":
    case "overdue":
      return "pending";
    case "paid":
    case "partially_paid":
      return "confirmed";
    case "cancelled":
    case "refunded":
    case "partially_refunded":
    case "chargeback_disputed":
    case "charged_back":
      return status;
    case "unknown":
      return "needs_review";
  }
}

export interface OutboxRepository {
  /** `INSERT … ON CONFLICT (idempotency_key) DO NOTHING` — devolve a existente se já houver. */
  enqueue(input: NewOutboxRow, now: Date): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }>;
  /** Transação curta do claim: escolhe a linha mais antiga elegível (PROCESSING órfã primeiro, depois PENDING
   * `charge_create` vencida de provedor ligado cujo demonstrativo NÃO está travado — pula, sem esperar, a de demonstrativo
   * ocupado (E5″) —, depois os outros tipos). Órfã → PROCESSING (só reconsulta). PENDING → relê o demonstrativo e aplica `params.verdict`:
   * `eligible` → PROCESSING; `skip` → SKIPPED + `skip_reason` (sem `attempts`, sem `claimed_*`); `needs_review` →
   * NEEDS_REVIEW + `last_error`. `null` se nada elegível. NUNCA faz rede. */
  claimNext(params: ClaimParams): Promise<ClaimResult | null>;
  // Mutações por id: tenant-scoped. Sob FORCE RLS, o registro roda em `withTenantRlsBudget(tenantId)` (transação curta
  // própria, separada do claim e do fetch — G8). O dublê valida o tenant como o RLS faria (linha de outra organização =
  // inexistente). O chamador (dispatcher) tem o `tenantId` da linha reclamada.
  markSent(tenantId: string, id: string, externalId: string | null, now: Date, lease: OutboxLease): Promise<boolean>;
  /** Volta a PENDING com nova janela (retry de erro transitório / 429). */
  /** Volta a PENDING em `nextAttemptAt`. `refundAttempt` (conserto da J-530, C): devolve a tentativa que o claim somou —
   * a espera de uma nota pendente não é falha. */
  reschedule(tenantId: string, id: string, nextAttemptAt: Date, lastError: string | null, now: Date, lease: OutboxLease, options?: { readonly refundAttempt?: boolean }): Promise<boolean>;
  markFailed(tenantId: string, id: string, lastError: string | null, now: Date, lease: OutboxLease): Promise<boolean>;
  markNeedsReview(tenantId: string, id: string, lastError: string | null, now: Date, lease: OutboxLease): Promise<boolean>;
  markSkipped(tenantId: string, id: string, skipReason: OutboxSkipReason, now: Date, lease: OutboxLease): Promise<boolean>;
  /** Confirma a posse sob `FOR UPDATE` numa transação curta, imediatamente antes da criação remota (marcador LEASE-02 no despacho). */
  confirmLease(tenantId: string, id: string, lease: OutboxLease): Promise<boolean>;
  /** SENT + cobrança + ref, atômicos no Prisma (marcador REG-TX em `outbox.prisma.ts`). `false` significa lease perdida e nenhuma escrita. */
  recordChargeOutcome(tenantId: string, row: BillingOutboxRow, lease: OutboxLease, outcome: ChargeRecordOutcome, now: Date): Promise<boolean>;
  /** B-ASS-08c1b (P9b, o marcador CANCEL-TX em `outbox.prisma.ts`) — o registro do cancelamento numa transação: o
   * demonstrativo PRIMEIRO, a linha `charge_cancel` → SENT com a posse no predicado, a cobrança da tabela → `cancelled` (só se
   * `pending`) e a `charge_create` alvo (`payload.chargeCreateId`) SENT → SKIPPED (`skip_reason` NULL, `last_error =
   * charge_cancelled`), MANTENDO o `external_id`. `false` = posse perdida e nenhuma escrita. */
  recordChargeCancelOutcome(tenantId: string, row: BillingOutboxRow, lease: OutboxLease, chargeId: string, now: Date): Promise<boolean>;
  /** Só o dublê em memória usa esta composição para espelhar as tabelas separadas. */
  configureChargeOutcomeSink?(sink: ChargeOutcomeSink): void;
  /** B-ASS-08c1b: o espelho do cancelamento da cobrança da tabela no dublê em memória (o Prisma o faz na transação). */
  configureChargeCancelSink?(sink: ChargeCancelSink): void;
  /** Visibilidade (D5/R-OBX-4): marca `skip_reason = provider_disabled` nas PENDING de provedor desligado, SEM rede e
   * SEM mudar o status. Escrita de PLATAFORMA sobre tabela FORCE → `forEachTenantRls` no Prisma. Devolve quantas marcou. */
  markDisabledProvidersVisible(enabledProviders: readonly string[], now: Date): Promise<number>;
  /** `retry` reabre uma FAILED → PENDING (attempts zerado; `last_error` MANTIDO, a evidência de que a linha já foi
   * tentada). O retry revalida a intenção viva sob a trava (E9: o demonstrativo `FOR UPDATE` primeiro; outra
   * `charge_create` viva → 422 `charge_already_exists`; 55P03 → 409 `statement_busy`) e o claim revalida o demonstrativo
   * (R-OBX-5): toda PENDING passa por `ClaimParams.verdict` antes de virar PROCESSING. */
  retry(tenantId: string, id: string, now: Date): Promise<BillingOutboxRow | undefined>;
  /** B-ASS-08c1b (P10; Emenda 1 §3.3-§3.6; Emenda 2 §3): o `/retry` do OPERADOR, sobre o MESMO núcleo do `retry`, com o
   * resultado discriminado (404 × 422) e as travas novas: o marcador RETRY-CANCEL-ONE, o marcador RETRY-PARTIAL e o vencimento (a data
   * nova é regravada no payload na MESMA transação). Não toca em `last_error` nem em `occurred_at`. */
  retryByOperator(tenantId: string, id: string, now: Date, input: RetryByOperatorInput): Promise<RetryByOperatorOutcome>;
  /** B-ASS-08c1b (P10): o `/resolve` do operador — o demonstrativo travado PRIMEIRO (o marcador RESOLVE-LOCK), e `NEEDS_REVIEW` →
   * `FAILED` com o `last_error` MANTIDO; a trilha `billing_outbox.resolved` (ids, `kind`, o código anterior e o motivo) vai
   * na MESMA transação. Vale para todos os `kind`. */
  resolve(tenantId: string, id: string, input: ResolveInput): Promise<ResolveOutcome>;
  /** B-ASS-08c1b (P10, o marcador OUTBOX-TENANT): a fila de UMA organização, sob o GUC dela e com `tenant_id` no predicado. */
  listForTenant(tenantId: string, filter: OutboxListFilter): Promise<readonly BillingOutboxRow[]>;
  findById(tenantId: string, id: string): Promise<BillingOutboxRow | undefined>;
  /** Leitura de PLATAFORMA (tela de outbox) sobre tabela FORCE → `forEachTenantRls` no Prisma. */
  listByStatus(status?: OutboxStatus, provider?: string): Promise<readonly BillingOutboxRow[]>;
  listByStatement(tenantId: string, statementId: string): Promise<readonly BillingOutboxRow[]>;
  /** E6′/E7′ (2º conserto do #522) — os fatos da ADOÇÃO, lidos só quando a reconsulta ACHA cobrança: numa leitura só, sob
   * o GUC da organização, sem trava e fora do `fetch`. `undefined` se o demonstrativo não existe (ou é de outra
   * organização). */
  adoptionFacts(tenantId: string, statementId: string, rowId: string): Promise<AdoptionFacts | undefined>;
}

/** E6′/E7′ (§13.1.2): os fatos que a adoção usa. Nenhum deles se apaga: nenhum código apaga linha da fila (T-OBX-NODEL), e
 * o total de um demonstrativo fechado só muda com reabertura. */
export type AdoptionFacts = {
  /** Outras linhas `charge_create` do demonstrativo, em QUALQUER status (U). */
  readonly otherIntents: number;
  readonly status: StatementStatus;
  readonly reopenedAt: Date | null;
  /** O total atual, em centavos (V); `null` quando o leitor não o traz — então V é falso e a linha vai a revisão. */
  readonly totalCents: number | null;
};

/** O que o dublê lê do demonstrativo no claim (R-OBX-5). `hasLiveCharge` opcional: o dublê OR-a com a própria fila.
 * `totalCents` é o V da adoção (E6′/E7′): sem ele, o dublê falha fechado (a cobrança achada vai a revisão).
 * `paidCents` (B-ASS-08c1b, Emenda 2 §4): o já pago, para o o marcador RETRY-PARTIAL; leitor sem ele conta como "sem pagamento". */
export type StatementClaimReadResult = {
  readonly status: StatementStatus;
  readonly reopenedAt: Date | null;
  readonly hasLiveCharge?: boolean;
  readonly totalCents?: number;
  readonly paidCents?: number;
};

/** B-ASS-08c1b (P10): a entrada e os desfechos das ações do operador sobre a fila. */
export type OutboxListFilter = { readonly status?: OutboxStatus; readonly provider?: string };
export type ResolveInput = { readonly reason: string; readonly actorId: string | null; readonly now: Date };
export type ResolveOutcome =
  | { readonly kind: "not_found" }
  | { readonly kind: "not_in_review" }
  | { readonly kind: "resolved"; readonly row: BillingOutboxRow; readonly previousCode: string | null };
export type RetryByOperatorInput = { readonly dueDate?: string };
export type RetryByOperatorOutcome =
  | { readonly kind: "not_found" }
  | { readonly kind: "not_failed" }
  | { readonly kind: "reopened"; readonly row: BillingOutboxRow; readonly dueDateRewritten: boolean };

/** Os estados de uma linha da fila VIVA (o conjunto do D1). */
const LIVE_STATUSES: ReadonlySet<OutboxStatus> = new Set(["PENDING", "PROCESSING", "SENT", "NEEDS_REVIEW"]);
/** Os estados de um `charge_cancel` VIVO (o o marcador CANCEL-ONE da rota e o o marcador RETRY-CANCEL-ONE do núcleo). */
export const LIVE_CANCEL_STATUSES: ReadonlySet<OutboxStatus> = new Set(["PENDING", "PROCESSING", "NEEDS_REVIEW"]);

/**
 * B-ASS-08c1b (Emenda 1 §3.4, o marcador RETRY-CANCEL-ONE): reabrir `row` conflita com algum `charge_cancel` vivo do demonstrativo?
 * Um `charge_cancel` conflita com outro vivo para o MESMO `payload.chargeId`; uma `charge_create` conflita com QUALQUER
 * `charge_cancel` vivo. PURA.
 */
export function retryCancelConflict(
  row: Pick<BillingOutboxRow, "id" | "kind" | "payload">,
  liveCancels: readonly Pick<BillingOutboxRow, "id" | "payload">[],
): boolean {
  const others = liveCancels.filter((cancel) => cancel.id !== row.id);
  if (row.kind === "charge_cancel") return others.some((cancel) => cancel.payload.chargeId === row.payload.chargeId);
  if (row.kind === "charge_create") return others.length > 0;
  return false;
}

const SAO_PAULO_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * B-ASS-08c1b (Emenda 1 §3.6.3): o vencimento de uma `charge_create` reaberta pelo operador. "Hoje" é o dia civil de São
 * Paulo do relógio dado. Gravado passado, ausente ou fora da forma → exige a data nova (sem ela, 422 `due_date_past`) e a
 * devolve para regravar; gravado ainda valendo → a data nova é recusada (422 `due_date_not_past`) e nada se regrava. PURA.
 */
export function retryDueDate(payloadDueDate: unknown, informed: string | undefined, now: Date): string | undefined {
  const today = SAO_PAULO_DAY.format(now);
  const current = typeof payloadDueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payloadDueDate) ? payloadDueDate : null;
  if (current === null || current < today) {
    if (!informed) throw new StatementError(422, "due_date_past", "The charge due date has passed; inform dueDate.");
    return informed;
  }
  if (informed) throw new StatementError(422, "due_date_not_past", "The charge due date has not passed; dueDate is not accepted.");
  return undefined;
}
export type StatementClaimReader = (tenantId: string, statementId: string) => Promise<StatementClaimReadResult | undefined>;

export type InMemoryOutboxOptions = {
  /** OBRIGATÓRIO (R-OBX-5): sem leitor do demonstrativo o dublê não nasce. Um default "sempre closed" esconderia exatamente
   * a classe de defeito do J-522 (C2-01); testes que não medem R-OBX-5 ligam um stub EXPLÍCITO. */
  readonly readStatement: StatementClaimReader;
  readonly clock?: () => Date;
};

export class InMemoryOutboxRepository implements OutboxRepository {
  readonly #rows = new Map<string, BillingOutboxRow>();
  readonly #byKey = new Map<string, string>();
  #claimGate: Promise<unknown> = Promise.resolve();
  private readonly clock: () => Date;
  private readonly readStatement: StatementClaimReader;
  private chargeOutcomeSink: ChargeOutcomeSink | undefined;
  private chargeCancelSink: ChargeCancelSink | undefined;

  constructor(options: InMemoryOutboxOptions) {
    this.readStatement = options.readStatement;
    this.clock = options.clock ?? (() => new Date());
  }

  async enqueue(input: NewOutboxRow, now: Date): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }> {
    const key = idempotencyKeyOf(input.kind, input.statementId, input.seq);
    const existingId = this.#byKey.get(key);
    if (existingId) {
      return { row: this.#rows.get(existingId)!, created: false };
    }
    const row: BillingOutboxRow = {
      id: randomUUID(),
      tenantId: input.tenantId,
      statementId: input.statementId,
      kind: input.kind,
      provider: input.provider,
      idempotencyKey: key,
      providerIdempotencyKey: input.providerIdempotencyKey ?? randomUUID(),
      payload: { ...(input.payload ?? {}) },
      status: "PENDING",
      skipReason: input.skipReason ?? null,
      claimedAt: null,
      claimedBy: null,
      attemptStartedAt: null,
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      externalId: null,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.#rows.set(row.id, row);
    this.#byKey.set(key, row.id);
    return { row, created: true };
  }

  async claimNext(params: ClaimParams): Promise<ClaimResult | null> {
    // Serializa os claims para emular `FOR UPDATE SKIP LOCKED` sem dois claims pegarem a mesma linha.
    const previous = this.#claimGate;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    this.#claimGate = previous.then(() => gate);
    await previous.catch(() => undefined);
    try {
      return await this.#claimLocked(params);
    } finally {
      release();
    }
  }

  async #claimLocked(params: ClaimParams): Promise<ClaimResult | null> {
    const enabled = new Set(params.enabledProviders);
    const nowMs = params.now.getTime();
    const candidates = [...this.#rows.values()]
      .filter((row) => enabled.has(row.provider))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const orphanCutoff = nowMs - params.orphanMs;
    // (1) Órfã primeiro (crash entre chamada e registro): PROCESSING parada além do limite.
    const orphan = candidates.find(
      (row) => row.status === "PROCESSING" && (row.attemptStartedAt?.getTime() ?? 0) <= orphanCutoff,
    );
    if (orphan) {
      // Órfã: NÃO aplica a política — a recuperação só reconsulta por referência e nunca cria cobrança (E3).
      return { kind: "claimed", row: this.#toProcessing(orphan, params), wasOrphan: true };
    }
    // (2) A MESMA ordem do Prisma (E5″): PENDING `charge_create` primeiro, depois os outros tipos; em cada grupo, a mais
    //     antiga. O dublê não emula a trava do demonstrativo (já serializa os claims); a prova dela está nos `-db`.
    const due = (row: BillingOutboxRow) => row.status === "PENDING" && (row.nextAttemptAt === null || row.nextAttemptAt.getTime() <= nowMs);
    const target = candidates.find((row) => row.kind === "charge_create" && due(row)) ?? candidates.find((row) => row.kind !== "charge_create" && due(row));
    if (!target) return null;

    // PENDING: relê o demonstrativo NA MESMA seção crítica do claim e aplica a política (R-OBX-5).
    const snapshot = target.kind === "charge_create" ? await this.#readSnapshot(target) : undefined;
    const verdict = params.verdict(target, snapshot);
    if (verdict.kind === "skip") {
      // Sem `attempts`, sem `claimed_*`: a linha não foi tentada — foi descartada pela política.
      const skipped: BillingOutboxRow = { ...target, status: "SKIPPED", skipReason: verdict.skipReason, nextAttemptAt: null, updatedAt: params.now };
      this.#rows.set(skipped.id, skipped);
      return { kind: "skipped", row: skipped, skipReason: verdict.skipReason };
    }
    if (verdict.kind === "needs_review") {
      const review: BillingOutboxRow = { ...target, status: "NEEDS_REVIEW", lastError: verdict.code, nextAttemptAt: null, updatedAt: params.now };
      this.#rows.set(review.id, review);
      return { kind: "needs_review", row: review, code: verdict.code };
    }
    return { kind: "claimed", row: this.#toProcessing(target, params), wasOrphan: false };
  }

  #toProcessing(target: BillingOutboxRow, params: ClaimParams): BillingOutboxRow {
    const claimed: BillingOutboxRow = {
      ...target,
      status: "PROCESSING",
      // Conserto da J-530 (I8): a retomada limpa o `skip_reason`, como o Prisma.
      skipReason: null,
      claimedAt: params.now,
      claimedBy: params.claimedBy,
      attemptStartedAt: params.now,
      attempts: target.attempts + 1,
      updatedAt: params.now,
    };
    this.#rows.set(claimed.id, claimed);
    return claimed;
  }

  /** O snapshot do demonstrativo para a política: o leitor injetado + a própria fila (outra `charge_create` VIVA — o conjunto
   * do D1: PENDING/PROCESSING/SENT/NEEDS_REVIEW, E4 do 2º conserto). */
  async #readSnapshot(target: BillingOutboxRow): Promise<StatementClaimSnapshot | undefined> {
    const read = await this.readStatement(target.tenantId, target.statementId);
    if (!read) return undefined;
    const liveInQueue = [...this.#rows.values()].some(
      (row) =>
        row.id !== target.id &&
        row.tenantId === target.tenantId &&
        row.statementId === target.statementId &&
        row.kind === "charge_create" &&
        (row.status === "PENDING" || row.status === "PROCESSING" || row.status === "SENT" || row.status === "NEEDS_REVIEW"),
    );
    return { status: read.status, reopenedAt: read.reopenedAt, hasLiveCharge: (read.hasLiveCharge ?? false) || liveInQueue };
  }

  async markSent(tenantId: string, id: string, externalId: string | null, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#patch(tenantId, id, lease, { status: "SENT", externalId, nextAttemptAt: null, lastError: null, updatedAt: now });
  }

  async reschedule(tenantId: string, id: string, nextAttemptAt: Date, lastError: string | null, now: Date, lease: OutboxLease, options: { readonly refundAttempt?: boolean } = {}): Promise<boolean> {
    const current = this.#rows.get(id);
    const refunded = options.refundAttempt && current ? { attempts: Math.max(0, current.attempts - 1) } : {};
    return this.#patch(tenantId, id, lease, { status: "PENDING", nextAttemptAt, lastError, claimedAt: null, claimedBy: null, attemptStartedAt: null, updatedAt: now, ...refunded });
  }

  async markFailed(tenantId: string, id: string, lastError: string | null, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#patch(tenantId, id, lease, { status: "FAILED", lastError, nextAttemptAt: null, updatedAt: now });
  }

  async markNeedsReview(tenantId: string, id: string, lastError: string | null, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#patch(tenantId, id, lease, { status: "NEEDS_REVIEW", lastError, nextAttemptAt: null, updatedAt: now });
  }

  async markSkipped(tenantId: string, id: string, skipReason: OutboxSkipReason, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#patch(tenantId, id, lease, { status: "SKIPPED", skipReason, nextAttemptAt: null, updatedAt: now });
  }

  async confirmLease(tenantId: string, id: string, lease: OutboxLease): Promise<boolean> {
    const row = this.#rows.get(id);
    return Boolean(row && row.tenantId === tenantId && row.status === "PROCESSING" && row.claimedBy === lease.claimedBy && row.attemptStartedAt?.getTime() === lease.attemptStartedAt.getTime());
  }

  configureChargeOutcomeSink(sink: ChargeOutcomeSink): void {
    this.chargeOutcomeSink = sink;
  }

  async recordChargeOutcome(tenantId: string, row: BillingOutboxRow, lease: OutboxLease, outcome: ChargeRecordOutcome, now: Date): Promise<boolean> {
    if (!(await this.confirmLease(tenantId, row.id, lease))) return false;
    const chargeId = outcome.kind === "created" ? outcome.result.chargeId : outcome.chargeId;
    const details = outcome.kind === "created" ? outcome.result : outcome.lookup;
    await this.chargeOutcomeSink?.({
      tenantId,
      statementId: row.statementId,
      provider: row.provider,
      externalChargeId: chargeId,
      status: recordedChargeStatus(outcome.kind, details.status),
      payUrl: details.payUrl ?? null,
      pixCopyPaste: details.pixCopyPaste ?? null,
      boletoLine: details.boletoLine ?? null,
      boletoUrl: details.boletoUrl ?? null,
      dueDate: (outcome.kind === "adopted" ? outcome.lookup.dueDate : undefined) ?? (typeof row.payload.dueDate === "string" ? row.payload.dueDate : null),
    }, now);
    return this.markSent(tenantId, row.id, chargeId, now, lease);
  }

  configureChargeCancelSink(sink: ChargeCancelSink): void {
    this.chargeCancelSink = sink;
  }

  /** O espelho do registro do cancelamento: a posse primeiro; depois a cobrança (pelo sink, se ligado), a `charge_create` alvo
   * SENT → SKIPPED mantendo o `external_id`, e a própria linha → SENT. Sem `await` entre ler e gravar as linhas da fila. */
  async recordChargeCancelOutcome(tenantId: string, row: BillingOutboxRow, lease: OutboxLease, chargeId: string, now: Date): Promise<boolean> {
    if (!(await this.confirmLease(tenantId, row.id, lease))) return false;
    await this.chargeCancelSink?.({ tenantId, provider: row.provider, externalChargeId: chargeId }, now);
    if (!(await this.confirmLease(tenantId, row.id, lease))) return false;
    const target = typeof row.payload.chargeCreateId === "string" ? this.#rows.get(row.payload.chargeCreateId) : undefined;
    if (target && target.tenantId === tenantId && target.kind === "charge_create" && target.status === "SENT") {
      this.#rows.set(target.id, { ...target, status: "SKIPPED", skipReason: null, lastError: "charge_cancelled", updatedAt: now });
    }
    return this.#patch(tenantId, row.id, lease, { status: "SENT", externalId: chargeId, nextAttemptAt: null, lastError: null, updatedAt: now });
  }

  async markDisabledProvidersVisible(enabledProviders: readonly string[], now: Date): Promise<number> {
    const enabled = new Set(enabledProviders);
    let marked = 0;
    for (const row of this.#rows.values()) {
      if (row.status === "PENDING" && !enabled.has(row.provider) && row.skipReason !== "provider_disabled") {
        this.#rows.set(row.id, { ...row, skipReason: "provider_disabled", updatedAt: now });
        marked += 1;
      }
    }
    return marked;
  }

  async retry(tenantId: string, id: string, now: Date): Promise<BillingOutboxRow | undefined> {
    const outcome = await this.#reopen(tenantId, id, now, null);
    return outcome.kind === "reopened" ? outcome.row : undefined;
  }

  async retryByOperator(tenantId: string, id: string, now: Date, input: RetryByOperatorInput): Promise<RetryByOperatorOutcome> {
    return this.#reopen(tenantId, id, now, input);
  }

  /**
   * O núcleo comum do `retry` e do `retryByOperator`, na MESMA ordem do Prisma (E9; B-ASS-08c1b). O leitor do demonstrativo é
   * chamado ANTES; depois, SEM `await`, a linha é relida e decidida (o bloco "ler e gravar" continua atômico no dublê).
   * `operator = null` é o `retry` antigo: o retorno dele não muda (linha de outra organização ou que não está FAILED →
   * `undefined`).
   */
  async #reopen(tenantId: string, id: string, now: Date, operator: RetryByOperatorInput | null): Promise<RetryByOperatorOutcome> {
    const first = this.#rows.get(id);
    if (!first || first.tenantId !== tenantId) return { kind: "not_found" };
    const statement = first.kind === "charge_create" ? await this.readStatement(tenantId, first.statementId) : undefined;
    const row = this.#rows.get(id)!;
    if (operator && row.status !== "FAILED") return { kind: "not_failed" };
    if (operator?.dueDate !== undefined && row.kind !== "charge_create") throw new StatementError(422, "due_date_not_applicable", "dueDate applies only to a charge request.");
    const siblings = [...this.#rows.values()].filter((other) => other.id !== id && other.tenantId === tenantId && other.statementId === row.statementId);
    const liveCancels = siblings.filter((other) => other.kind === "charge_cancel" && LIVE_CANCEL_STATUSES.has(other.status));
    if (row.status === "FAILED" && retryCancelConflict(row, liveCancels)) throw new StatementError(409, "charge_cancel_in_progress", "A cancellation is in progress for this statement."); // [RETRY-CANCEL-ONE]
    if (row.kind === "charge_create" && siblings.some((other) => other.kind === "charge_create" && LIVE_STATUSES.has(other.status))) {
      throw new StatementError(422, "charge_already_exists", "Another charge intent is live for this statement.");
    }
    if (row.kind === "charge_create" && row.status === "FAILED" && statement?.status === "closed" && (statement.paidCents ?? 0) > 0) throw new StatementError(422, "statement_partially_paid", "The statement has a partial payment; a full-amount charge is refused."); // [RETRY-PARTIAL]
    const dueDate = operator && row.kind === "charge_create" ? retryDueDate(row.payload.dueDate, operator.dueDate, now) : undefined;
    if (row.status !== "FAILED") return { kind: "not_failed" };
    const reopened: BillingOutboxRow = {
      ...row,
      status: "PENDING",
      attempts: 0,
      skipReason: null,
      nextAttemptAt: now,
      claimedAt: null,
      claimedBy: null,
      attemptStartedAt: null,
      updatedAt: now,
      ...(dueDate !== undefined ? { payload: { ...row.payload, dueDate } } : {}),
    };
    this.#rows.set(id, reopened);
    return { kind: "reopened", row: reopened, dueDateRewritten: dueDate !== undefined };
  }

  /** A trilha do dublê (o Prisma grava em `audit_logs`): o `/resolve`. */
  readonly audits: Array<{ readonly tenantId: string; readonly action: string; readonly entityId: string; readonly metadata: Readonly<Record<string, string | number | boolean | null>> }> = [];

  async resolve(tenantId: string, id: string, input: ResolveInput): Promise<ResolveOutcome> {
    const row = this.#rows.get(id);
    if (!row || row.tenantId !== tenantId) return { kind: "not_found" };
    if (row.status !== "NEEDS_REVIEW") return { kind: "not_in_review" };
    const resolved: BillingOutboxRow = { ...row, status: "FAILED", nextAttemptAt: null, updatedAt: input.now };
    this.#rows.set(id, resolved);
    this.audits.push({ tenantId, action: "billing_outbox.resolved", entityId: id, metadata: { statementId: row.statementId, kind: row.kind, previousCode: row.lastError, reason: input.reason } });
    return { kind: "resolved", row: resolved, previousCode: row.lastError };
  }

  async listForTenant(tenantId: string, filter: OutboxListFilter): Promise<readonly BillingOutboxRow[]> {
    return [...this.#rows.values()]
      .filter((row) => row.tenantId === tenantId && (filter.status ? row.status === filter.status : true) && (filter.provider ? row.provider === filter.provider : true))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /** B-ASS-08c1b (P9a): o espelho de `skipPendingChargeCreateInTx` — a `charge_create` PENDING vira SKIPPED (`skip_reason`
   * NULL, `last_error` = o motivo) SÓ se ainda está PENDING. Sem `await` entre ler e gravar (atômico no dublê). */
  async skipPendingChargeCreate(tenantId: string, id: string, lastError: string, now: Date): Promise<BillingOutboxRow | undefined> {
    const row = this.#rows.get(id);
    if (!row || row.tenantId !== tenantId || row.kind !== "charge_create" || row.status !== "PENDING") return undefined;
    const skipped: BillingOutboxRow = { ...row, status: "SKIPPED", skipReason: null, lastError, nextAttemptAt: null, updatedAt: now };
    this.#rows.set(id, skipped);
    return skipped;
  }

  async findById(tenantId: string, id: string): Promise<BillingOutboxRow | undefined> {
    const row = this.#rows.get(id);
    return row && row.tenantId === tenantId ? row : undefined;
  }

  async listByStatus(status?: OutboxStatus, provider?: string): Promise<readonly BillingOutboxRow[]> {
    return [...this.#rows.values()]
      .filter((row) => (status ? row.status === status : true) && (provider ? row.provider === provider : true))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listByStatement(tenantId: string, statementId: string): Promise<readonly BillingOutboxRow[]> {
    return [...this.#rows.values()].filter((row) => row.tenantId === tenantId && row.statementId === statementId);
  }

  /** E6′/E7′: U pela própria fila (outras `charge_create` do demonstrativo, em qualquer status) e o resto pelo leitor
   * injetado; leitor sem `totalCents` → `null` (V falso, fail-closed). */
  async adoptionFacts(tenantId: string, statementId: string, rowId: string): Promise<AdoptionFacts | undefined> {
    const read = await this.readStatement(tenantId, statementId);
    if (!read) return undefined;
    const otherIntents = [...this.#rows.values()].filter(
      (row) => row.tenantId === tenantId && row.statementId === statementId && row.kind === "charge_create" && row.id !== rowId,
    ).length;
    return { otherIntents, status: read.status, reopenedAt: read.reopenedAt, totalCents: read.totalCents ?? null };
  }

  // O dublê valida o tenant como o RLS faria: linha de outra organização = inexistente (fail-closed).
  #patch(tenantId: string, id: string, lease: OutboxLease, patch: Partial<BillingOutboxRow>): boolean {
    const row = this.#rows.get(id);
    if (!row || row.tenantId !== tenantId || row.status !== "PROCESSING" || row.claimedBy !== lease.claimedBy || row.attemptStartedAt?.getTime() !== lease.attemptStartedAt.getTime()) return false;
    this.#rows.set(id, { ...row, ...patch });
    return true;
  }
}
