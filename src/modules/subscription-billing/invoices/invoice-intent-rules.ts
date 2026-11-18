// B-ASS-08c2 (item 60, plano de abertura §4.1 item 4, §4.4 e §4.9; Emenda 1) — as regras PURAS da intenção de nota.
// O molde é `charges/charge-rules.ts`: a tabela-verdade das LINHAS `invoice_issue` da fila (`INVOICE_ISSUE_LINE_RULES`, com
// `satisfies`: um status novo da fila deixa o `tsc` vermelho até alguém escrever a linha dele) e a lista SQL GERADA dela; o
// corte da nota retroativa (`C-08C-Q2-X-530`, `D-DONO-TODAS-RECOMENDACOES-1111`); a decisão de criar a intenção (a MESMA para
// a baixa manual, o provedor, a varredura e o operador); e a categoria do backlog. Sem rede, sem banco, sem relógio.

import { OUTBOX_STATUSES, type OutboxKind, type OutboxSkipReason, type OutboxStatus } from "../outbox/outbox.types.js";
import type { StatementStatus } from "../statements/statement.types.js";
import type { StatementInvoiceStatus } from "./invoices.types.js";

export type InvoiceLineRule = {
  /** A linha ainda vai (ou pode ir) ao provedor: ela emite para o pago de agora, e não nasce uma segunda. */
  readonly inFlight: boolean;
  /** A linha espera a conferência humana (`/resolve`): o operador decide antes de reemitir. */
  readonly inReview: boolean;
};

export const INVOICE_ISSUE_LINE_RULES = {
  PENDING:      { inFlight: true,  inReview: false },
  PROCESSING:   { inFlight: true,  inReview: false },
  SENT:         { inFlight: false, inReview: false },
  FAILED:       { inFlight: false, inReview: false },
  NEEDS_REVIEW: { inFlight: false, inReview: true  },
  SKIPPED:      { inFlight: false, inReview: false },
} as const satisfies { readonly [S in OutboxStatus]: InvoiceLineRule };

export function invoiceLineStatesWhere(question: keyof InvoiceLineRule): readonly OutboxStatus[] {
  return OUTBOX_STATUSES.filter((status) => INVOICE_ISSUE_LINE_RULES[status][question]);
}

/** A lista SQL gerada da tabela, para interpolar em `status IN (…)`. Só constantes do enum, cada uma conferida. */
export function invoiceLineSqlList(question: keyof InvoiceLineRule): string {
  const states = invoiceLineStatesWhere(question);
  if (states.length === 0 || states.some((state) => !/^[A-Z_]+$/.test(state))) throw new Error(`invoice_line_rules_sql_${question}`);
  return states.map((state) => `'${state}'`).join(", ");
}

/** O corte da nota retroativa: o instante do merge de a0979f51 (#530); D-DONO-TODAS-RECOMENDACOES-1111 (`C-08C-Q2-X-530`).
 * Os pagos antes dele vão ao backlog "para o contador decidir", sem nota automática. Constante literal, sem env. */
export const INVOICE_BACKFILL_CUTOFF = new Date("2026-11-11T09:43:45.000Z");

/** Uma linha `invoice_issue` do demonstrativo, como a fila a guarda (o `seq` sai da `idempotency_key`, a chave UNIQUE). */
export type InvoiceIntentLine = {
  readonly kind: OutboxKind;
  readonly status: OutboxStatus;
  readonly idempotencyKey: string;
  readonly occurredAt: Date;
  readonly skipReason?: OutboxSkipReason | null;
};

/** O `seq` de uma `idempotency_key` `<kind>:<statement_id>:<seq>`; 0 quando a chave não tem essa forma. */
export function seqOfIdempotencyKey(key: string): number {
  const at = key.lastIndexOf(":");
  const tail = at >= 0 ? key.slice(at + 1) : "";
  return /^[1-9]\d*$/.test(tail) ? Number(tail) : 0;
}

export type InvoiceIntentMode = "auto" | "operator";

export type InvoiceIntentDecisionInput = {
  readonly statement: { readonly status: StatementStatus; readonly totalCents: number; readonly paidAt: Date | null };
  /** As linhas da fila do demonstrativo (as que não são `invoice_issue` são ignoradas). */
  readonly lines: readonly InvoiceIntentLine[];
  /** Há nota VIVA (`pending`, `authorized` ou `cancel_pending`) na tabela da nota. */
  readonly live: boolean;
  /** O maior `seq` em `subscription_statement_invoices` do demonstrativo (0 sem nota). */
  readonly maxInvoiceSeq: number;
  readonly mode: InvoiceIntentMode;
  /** Só a varredura passa o corte. */
  readonly cutoff?: Date;
};

export type InvoiceIntentNoneReason = "not_paid" | "zero_total" | "live_invoice" | "in_flight" | "in_review" | "epoch_has_intent" | "before_cutoff";

export type InvoiceIntentDecision = { readonly kind: "create"; readonly seq: number } | { readonly kind: "none"; readonly reason: InvoiceIntentNoneReason };

/** A linha é da época do pago de agora: nasceu no instante do pagamento ou depois. Sem `paidAt`, toda linha conta (falha
 * fechado: na dúvida, a época já tem a sua intenção e nada automático nasce). */
function ofCurrentEpoch(line: { readonly occurredAt: Date }, paidAt: Date | null): boolean {
  return paidAt === null || line.occurredAt.getTime() >= paidAt.getTime();
}

/** A decisão de criar a intenção de nota, na ordem do §4.1 item 4 do plano (vale a primeira que casar). */
export function invoiceIntentDecision(input: InvoiceIntentDecisionInput): InvoiceIntentDecision {
  const { statement } = input;
  if (statement.status !== "paid") return { kind: "none", reason: "not_paid" };
  if (statement.totalCents <= 0) return { kind: "none", reason: "zero_total" };
  if (input.live) return { kind: "none", reason: "live_invoice" };
  const lines = input.lines.filter((line) => line.kind === "invoice_issue");
  if (lines.some((line) => INVOICE_ISSUE_LINE_RULES[line.status].inFlight)) return { kind: "none", reason: "in_flight" }; // [NOTA-ONE]
  if (input.mode === "operator" && lines.some((line) => INVOICE_ISSUE_LINE_RULES[line.status].inReview)) return { kind: "none", reason: "in_review" };
  if (input.mode === "auto" && lines.some((line) => ofCurrentEpoch(line, statement.paidAt))) return { kind: "none", reason: "epoch_has_intent" }; // [SWEEP-EPOCH]
  if (input.cutoff !== undefined && (statement.paidAt === null || statement.paidAt.getTime() < input.cutoff.getTime())) return { kind: "none", reason: "before_cutoff" };
  const maxLineSeq = lines.reduce((max, line) => Math.max(max, seqOfIdempotencyKey(line.idempotencyKey)), 0);
  return { kind: "create", seq: 1 + Math.max(maxLineSeq, input.maxInvoiceSeq) };
}

export type InvoiceBacklogCategory = "live_on_unpaid" | "before_cutoff" | "awaiting_provider" | "needs_review" | "no_intent";

/** A ordem de precedência do §4.9 (a mesma do `backlogCategory`): o backlog lista nesta ordem, o alerta primeiro. */
export const INVOICE_BACKLOG_ORDER = ["live_on_unpaid", "before_cutoff", "awaiting_provider", "needs_review", "no_intent"] as const satisfies readonly InvoiceBacklogCategory[];

export type InvoiceBacklogInput = {
  readonly statement: { readonly status: StatementStatus; readonly totalCents: number; readonly paidAt: Date | null };
  readonly live: boolean;
  /** A última `invoice_issue` do demonstrativo, se houver. */
  readonly lastLine?: { readonly status: OutboxStatus; readonly skipReason: OutboxSkipReason | null; readonly occurredAt: Date; readonly seq: number };
  /** A última nota do demonstrativo, se houver. */
  readonly lastInvoice?: { readonly seq: number; readonly status: StatementInvoiceStatus };
  readonly cutoff: Date;
};

/** A categoria do backlog (§4.9 do plano), a primeira que casar; `null` = não aparece (intenção em voo, nota autorizada sobre
 * pago, demonstrativo sem valor). A nota da época rejeitada OU cancelada (a reconsulta disse cancelada) sobre pago aparece como
 * `needs_review` (Emenda 7 do 08c2, C2-01): a reemissão é pelo `/invoice`. Calculada pelo ESTADO, nunca por um registro do movimento. */
export function backlogCategory(input: InvoiceBacklogInput): InvoiceBacklogCategory | null {
  const { statement } = input;
  if (input.live && statement.status !== "paid") return "live_on_unpaid"; // [BACKLOG-ALERT]
  if (input.live || statement.status !== "paid" || statement.totalCents <= 0) return null;
  const epochLine = input.lastLine && ofCurrentEpoch(input.lastLine, statement.paidAt) ? input.lastLine : undefined;
  if (!epochLine && (statement.paidAt === null || statement.paidAt.getTime() < input.cutoff.getTime())) return "before_cutoff";
  if (epochLine?.status === "PENDING" && epochLine.skipReason === "provider_disabled") return "awaiting_provider";
  if (epochLine && (epochLine.status === "NEEDS_REVIEW" || epochLine.status === "FAILED")) return "needs_review";
  if (epochLine && input.lastInvoice?.seq === epochLine.seq && (input.lastInvoice.status === "rejected" || input.lastInvoice.status === "cancelled")) return "needs_review"; // [BACKLOG-CANCELLED]
  if (!epochLine) return "no_intent";
  return null;
}
