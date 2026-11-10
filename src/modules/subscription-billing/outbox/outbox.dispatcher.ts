// B-ASS-08 · F1 — o dispatcher `billing.dispatch-outbox` (plano §3.8, §4.8 R-OBX-*). Padrão claim–chamada–registro (G8):
//
//   (1) CLAIM em transação curta (`claimNext`) → a linha vira PROCESSING; nenhuma rede aqui.
//   (2) CHAMADA ao provedor FORA de transação (`port.createCharge`/reconsulta) — R-OBX-1: o `fetch` NUNCA roda dentro
//       de `withTenantRls`/transação. Por isso este arquivo não abre transação nenhuma em volta da chamada ao `port`.
//   (3) REGISTRO em transação curta (`markSent`/`reschedule`/`markFailed`/`markNeedsReview`).
//
// Provedor desligado nunca é alcançado (R-OBX-4): o claim só enxerga `enabledProviders`, e as PENDING de provedor
// desligado ganham `skip_reason = provider_disabled` visível, sem rede. Crash entre (2) e (3) deixa a linha PROCESSING;
// a rodada seguinte reconsulta por referência ANTES de repetir (nunca cobra 2×) e só vai a NEEDS_REVIEW se a reconsulta
// falhar (R-OBX-1). 2º conserto do #522 (E6′/E7′): TODA tentativa reconsulta antes de criar (depois do gate do perfil),
// e a cobrança achada só é adotada com fatos que não se apagam — a linha é a ÚNICA `charge_create` do demonstrativo e é do
// fechamento VIGENTE, com o total igual ao valor dela (`adoptionDecision`); senão, revisão — nunca uma 2ª cobrança.
// Backoff 1/5/15/60 min; 8 falhas → FAILED + trilha (R-OBX-2).
// Cobrança parada nunca sai de demonstrativo que mudou (R-OBX-5, D2 — conserto J-522): a política `chargeCreateClaimVerdict`
// vive aqui, pura, e é INJETADA no claim (`ClaimParams.verdict`), que a aplica NA transação do claim sobre o demonstrativo
// relido: pago/cancelado/reaberto/refechado → SKIPPED com `skip_reason`; cobrança viva ou demonstrativo ausente →
// NEEDS_REVIEW com `last_error`. O `retry` revalida pelo mesmo caminho (todo PENDING passa pelo claim).
// B-ASS-08b (c2): `invoice_issue`/`invoice_cancel` entram pelo MESMO claim (o pick dos outros tipos, sem trava do
// demonstrativo) e pela mesma régua de falha, delegados ao `InvoiceOutboxHandler` (outbox/invoice.dispatch.ts) ANTES da perna
// de cobrança; sem ele, esses tipos vão a NEEDS_REVIEW `unsupported_kind`.

import type { PaymentProviderPort, CreateChargeInput, ChargeResult, ChargeStatus } from "../providers/payment/payment-provider.port.js";
import {
  backoffMsForAttempt,
  OUTBOX_MAX_ATTEMPTS,
  OUTBOX_ORPHAN_MS,
  type BillingOutboxRow,
  type ClaimVerdict,
  type OutboxKind,
  type StatementClaimSnapshot,
} from "./outbox.types.js";
import type { InvoiceDispatchResult, InvoiceOutboxHandler } from "./invoice.dispatch.js";
import type { AdoptionFacts, OutboxRepository } from "./outbox.repository.js";

export type DispatchOutcome =
  | "sent"
  | "recovered"
  | "needs_review"
  | "rate_limited"
  | "retry"
  | "failed"
  | "skipped";

export type DispatchAuditEvent = {
  readonly tenantId: string;
  readonly statementId: string;
  readonly kind: OutboxKind;
  readonly action: "billing_outbox.failed" | "billing_outbox.needs_review";
  readonly code: string;
};

/** R-PRF-1 (conserto J-522, C3-02): o cliente no provedor, resolvido pelo PERFIL — nunca pelo payload da linha. */
export type CustomerResolution =
  | { readonly ok: true; readonly customerId: string }
  | { readonly ok: false; readonly missing: readonly string[] };

export type DispatcherDeps = {
  readonly repo: OutboxRepository;
  /** Um adaptador por provedor LIGADO. Provedor fora deste mapa nunca é alcançado. */
  readonly ports: Readonly<Record<string, PaymentProviderPort>>;
  /** R-PRF-1 — OBRIGATÓRIO (fail-closed por construção, o padrão do `verdict`): resolve o `customerId` a partir do
   * perfil da organização (`profileCustomerResolver` em `charges/charge-request.service.ts`). Perfil incompleto →
   * `{ ok: false, missing }` e a linha vai a `NEEDS_REVIEW billing_profile_missing:<campos>` SEM nenhuma chamada ao
   * provedor. Roda FORA de transação (pode fazer rede: `ensureCustomer`). */
  readonly resolveCustomer: (row: BillingOutboxRow, port: PaymentProviderPort) => Promise<CustomerResolution>;
  /** B-ASS-08b — a perna da NOTA (`invoice_issue`/`invoice_cancel`), com as portas dos provedores de nota LIGADOS. */
  readonly invoices?: InvoiceOutboxHandler;
  readonly now?: () => Date;
  readonly claimedBy?: string;
  readonly orphanMs?: number;
  /** Persiste a cobrança criada (`subscription_statement_charges`, G11) — F7. */
  readonly onChargeCreated?: (row: BillingOutboxRow, result: ChargeResult, now: Date) => Promise<void>;
  readonly onAudit?: (event: DispatchAuditEvent) => Promise<void>;
};

export type DispatchRunResult = {
  readonly processed: number;
  readonly outcomes: Readonly<Record<DispatchOutcome, number>>;
};

function rateLimitRetryMs(error: unknown): number | null {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; retryAfterMs?: unknown };
    if (candidate.code === "provider_rate_limited") {
      return typeof candidate.retryAfterMs === "number" && candidate.retryAfterMs > 0 ? candidate.retryAfterMs : 60_000;
    }
  }
  return null;
}

function errorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; name?: unknown };
    if (typeof candidate.code === "string" && candidate.code) return candidate.code;
    if (typeof candidate.name === "string" && candidate.name) return candidate.name;
  }
  return "unknown_error";
}

/**
 * R-OBX-5 (D2): `charge_create` só sai se o demonstrativo continua o MESMO fechamento `closed`, sem cobrança viva.
 * Política PURA (sem rede, sem I/O), exportada daqui e INJETADA no claim: o repositório a aplica DENTRO da transação do
 * claim, sobre o snapshot relido do demonstrativo. Outros tipos passam (sem handler → NEEDS_REVIEW `unsupported_kind` em
 * `dispatchOne`, como hoje). A órfã (PROCESSING) não passa por aqui: a recuperação só reconsulta por referência e nunca
 * cria cobrança — marcá-la SKIPPED esconderia uma cobrança que já existe no provedor (E3).
 */
export function chargeCreateClaimVerdict(row: BillingOutboxRow, statement: StatementClaimSnapshot | undefined): ClaimVerdict {
  if (row.kind !== "charge_create") return { kind: "eligible" };
  if (!statement) return { kind: "needs_review", code: "statement_not_found" };
  if (statement.status === "paid") return { kind: "skip", skipReason: "statement_paid" };
  if (statement.status === "cancelled") return { kind: "skip", skipReason: "statement_cancelled" };
  if (statement.status === "reopened" || statement.status === "open") return { kind: "skip", skipReason: "statement_reopened" };
  // Refechado DEPOIS de enfileirada: `close()` preserva `reopened_at`, e a linha carrega o total do fechamento desfeito
  // (payload velho). `reopened_at > occurred_at` ⇔ a linha nasceu de um fechamento que foi desfeito → não sai.
  if (statement.reopenedAt && statement.reopenedAt.getTime() > row.occurredAt.getTime()) {
    return { kind: "skip", skipReason: "statement_reopened" };
  }
  if (statement.hasLiveCharge) return { kind: "needs_review", code: "charge_already_exists" };
  return { kind: "eligible" };
}

function chargeInputFromRow(row: BillingOutboxRow, customerId: string): CreateChargeInput {
  const payload = row.payload as Record<string, unknown>;
  return {
    // R-PRF-1 (C3-02): o `customerId` vem do resolver (perfil → `ensureCustomer`) — o payload NUNCA o decide.
    customerId,
    amountCents: Number(payload.amountCents ?? 0),
    dueDate: String(payload.dueDate ?? ""),
    description: typeof payload.description === "string" ? payload.description : undefined,
    externalReference: row.statementId,
    method: (payload.method as CreateChargeInput["method"]) ?? "pix",
    idempotencyKey: row.providerIdempotencyKey,
  };
}

/** Estados da cobrança achada pela referência que podem ser ADOTADOS: viva ou paga — nunca cancelada nem estornada. */
export const ADOPTABLE_CHARGE_STATES: ReadonlySet<ChargeStatus> = new Set<ChargeStatus>(["pending", "overdue", "paid", "partially_paid"]);

/**
 * E6′/E7′ (2º conserto do #522, plano §13.1.2) — a cobrança achada pela referência só é ADOTADA com fatos que não se
 * apagam:
 *   U — a linha é a ÚNICA `charge_create` que o demonstrativo já teve, em QUALQUER status. Outra intenção existe → a
 *       cobrança achada pode ser a fantasma de um fechamento desfeito, com o valor velho → revisão.
 *   V — a linha é do fechamento VIGENTE: demonstrativo `closed`/`paid`, nenhuma reabertura depois da linha, e o
 *       `amountCents` do payload igual ao total atual. Sem o total (`null`), V é falso: falha fechado.
 * Mais o estado adotável e, na retentativa, a própria linha já tentada (`attempts > 1` ou `last_error`; apagar esses
 * campos só torna a régua FALSA, e falso manda à revisão). PURA: devolve `adopt` ou o código de revisão (`last_error`).
 */
export function adoptionDecision(
  row: BillingOutboxRow,
  found: { readonly status: ChargeStatus },
  facts: AdoptionFacts | undefined,
  orphan: boolean,
): "adopt" | string {
  const prefix = orphan ? "orphan_found" : "charge_found";
  if (!facts) return `${prefix}_statement_missing`;
  if (facts.otherIntents > 0) return orphan ? "orphan_found_previous_intent" : "charge_found_for_previous_intent";
  const amount = Number(row.payload.amountCents);
  const current =
    (facts.status === "closed" || facts.status === "paid") &&
    !(facts.reopenedAt !== null && facts.reopenedAt.getTime() > row.occurredAt.getTime()) &&
    facts.totalCents !== null &&
    Number.isSafeInteger(amount) &&
    amount === facts.totalCents;
  if (!current) return `${prefix}_stale_closing`;
  if (!ADOPTABLE_CHARGE_STATES.has(found.status)) return `${prefix}_${found.status}`;
  if (!orphan && !(row.attempts > 1 || row.lastError !== null)) return "charge_found_unknown_origin";
  return "adopt";
}

/** Achou cobrança pela referência: adota (U ∧ V) ou manda à revisão com auditoria — NUNCA cria. */
async function settleFoundCharge(
  deps: DispatcherDeps,
  row: BillingOutboxRow,
  found: { readonly chargeId: string; readonly status: ChargeStatus },
  orphan: boolean,
  clock: () => Date,
): Promise<DispatchOutcome> {
  const facts = await deps.repo.adoptionFacts(row.tenantId, row.statementId, row.id);
  const decision = adoptionDecision(row, found, facts, orphan);
  if (decision === "adopt") {
    await deps.repo.markSent(row.tenantId, row.id, found.chargeId, clock());
    return "recovered";
  }
  await deps.repo.markNeedsReview(row.tenantId, row.id, decision, clock());
  await deps.onAudit?.({ tenantId: row.tenantId, statementId: row.statementId, kind: row.kind, action: "billing_outbox.needs_review", code: decision });
  return "needs_review";
}

/**
 * Processa a outbox até esgotar as linhas elegíveis dos provedores LIGADOS. Primeiro marca as PENDING de provedor
 * desligado como visíveis (sem rede), depois roda o claim–chamada–registro. Devolve a contagem por desfecho.
 */
export async function runDispatchOutbox(deps: DispatcherDeps): Promise<DispatchRunResult> {
  const clock = deps.now ?? (() => new Date());
  const claimedBy = deps.claimedBy ?? "dispatch-outbox";
  const orphanMs = deps.orphanMs ?? OUTBOX_ORPHAN_MS;
  // Os provedores de nota LIGADOS entram na elegibilidade do claim junto com os de pagamento (R-OBX-4 vale para os dois).
  const enabledProviders = [...new Set([...Object.keys(deps.ports), ...(deps.invoices?.providers ?? [])])];
  const outcomes: Record<DispatchOutcome, number> = {
    sent: 0,
    recovered: 0,
    needs_review: 0,
    rate_limited: 0,
    retry: 0,
    failed: 0,
    skipped: 0,
  };

  await deps.repo.markDisabledProvidersVisible(enabledProviders, clock());

  let processed = 0;
  // Teto defensivo: no máximo uma passada por linha elegível desta rodada (evita laço infinito num re-enqueue).
  const safety = (await deps.repo.listByStatus()).length + 1;
  for (let guard = 0; guard < safety; guard += 1) {
    // (1) CLAIM: o repositório relê o demonstrativo NA transação do claim e aplica a política (R-OBX-5). Cada iteração
    // consome exatamente uma linha (reclamada, pulada ou posta em revisão) — o teto `safety` continua válido.
    const claimed = await deps.repo.claimNext({ enabledProviders, now: clock(), claimedBy, orphanMs, verdict: chargeCreateClaimVerdict });
    if (!claimed) break;
    processed += 1;
    if (claimed.kind === "skipped") {
      outcomes.skipped += 1;
      continue;
    }
    if (claimed.kind === "needs_review") {
      outcomes.needs_review += 1;
      await deps.onAudit?.({ tenantId: claimed.row.tenantId, statementId: claimed.row.statementId, kind: claimed.row.kind, action: "billing_outbox.needs_review", code: claimed.code });
      continue;
    }
    const outcome = await dispatchOne(deps, claimed.row, claimed.wasOrphan, clock);
    outcomes[outcome] += 1;
  }

  return { processed, outcomes };
}

async function dispatchOne(
  deps: DispatcherDeps,
  row: BillingOutboxRow,
  wasOrphan: boolean,
  clock: () => Date,
): Promise<DispatchOutcome> {
  // B-ASS-08b — a perna da NOTA vem ANTES da de cobrança (§11 (a) do conserto-c2): o provedor de nota não está em `ports`.
  if (row.kind === "invoice_issue" || row.kind === "invoice_cancel") {
    if (!deps.invoices) {
      await deps.repo.markNeedsReview(row.tenantId, row.id, "unsupported_kind", clock());
      return "needs_review";
    }
    try {
      const result = row.kind === "invoice_issue" ? await deps.invoices.issue(row, wasOrphan, clock()) : await deps.invoices.cancel(row, clock());
      return await registerInvoiceResult(deps, row, result, clock);
    } catch (error) {
      return registerFailure(deps, row, error, clock);
    }
  }

  const port = deps.ports[row.provider];
  if (!port) {
    // Nunca deveria acontecer (claim filtra por provedor ligado); fail-closed sem rede.
    await deps.repo.markSkipped(row.tenantId, row.id, "provider_disabled", clock());
    return "skipped";
  }
  if (row.kind !== "charge_create") {
    // `charge_cancel`/`refund` nascem nas fatias seguintes; sem handler → NEEDS_REVIEW.
    await deps.repo.markNeedsReview(row.tenantId, row.id, "unsupported_kind", clock());
    return "needs_review";
  }

  // (2) CHAMADA FORA de transação. Crash órfão → reconsulta por referência ANTES de repetir (nunca cobra 2×), e a cobrança
  // achada só é adotada pela régua U ∧ V (E7′): a fantasma de um fechamento desfeito vai a revisão.
  if (wasOrphan) {
    const found = await port.findChargeByExternalReference(row.statementId);
    if (found) return settleFoundCharge(deps, row, found, true, clock);
    await deps.repo.markNeedsReview(row.tenantId, row.id, "orphan_recovery_not_found", clock());
    await deps.onAudit?.({ tenantId: row.tenantId, statementId: row.statementId, kind: row.kind, action: "billing_outbox.needs_review", code: "orphan_recovery_not_found" });
    return "needs_review";
  }

  try {
    // R-PRF-1 (C3-02): o gate do perfil decide ANTES de qualquer chamada ao provedor — a reconsulta inclusive. Incompleto →
    // NEEDS_REVIEW com os campos visíveis em `last_error` (TEXT livre; sem skip_reason novo — CHECK da M5) e 0 rede.
    const customer = await deps.resolveCustomer(row, port);
    if (!customer.ok) {
      await deps.repo.markNeedsReview(row.tenantId, row.id, `billing_profile_missing:${customer.missing.join(",")}`, clock());
      await deps.onAudit?.({ tenantId: row.tenantId, statementId: row.statementId, kind: row.kind, action: "billing_outbox.needs_review", code: "billing_profile_missing" });
      return "needs_review";
    }
    // E6′: a reconsulta vem SEMPRE antes de criar — nenhuma criação às cegas. Achou → adota (U ∧ V) ou revisão, NUNCA
    // cria; um erro na reconsulta cai no `catch` abaixo (reagenda ou FAILED) e também nunca cria.
    const found = await port.findChargeByExternalReference(row.statementId);
    if (found) return await settleFoundCharge(deps, row, found, false, clock);
    const result = await port.createCharge(chargeInputFromRow(row, customer.customerId));
    await deps.onChargeCreated?.(row, result, clock());
    await deps.repo.markSent(row.tenantId, row.id, result.chargeId, clock());
    return "sent";
  } catch (error) {
    return registerFailure(deps, row, error, clock);
  }
}

/** (3) REGISTRO do desfecho da perna da nota, na mesma régua das cobranças. */
async function registerInvoiceResult(deps: DispatcherDeps, row: BillingOutboxRow, result: InvoiceDispatchResult, clock: () => Date): Promise<DispatchOutcome> {
  switch (result.kind) {
    case "sent":
      await deps.repo.markSent(row.tenantId, row.id, result.externalId, clock());
      return "sent";
    case "recovered":
      await deps.repo.markSent(row.tenantId, row.id, result.externalId, clock());
      return "recovered";
    case "skipped":
      await deps.repo.markSkipped(row.tenantId, row.id, result.reason, clock());
      return "skipped";
    case "needs_review":
      await deps.repo.markNeedsReview(row.tenantId, row.id, result.code, clock());
      await deps.onAudit?.({ tenantId: row.tenantId, statementId: row.statementId, kind: row.kind, action: "billing_outbox.needs_review", code: result.code });
      return "needs_review";
  }
}

/** Falha da chamada: 429 → próxima janela do provedor; transitória → backoff 1/5/15/60 min; 8ª → FAILED + trilha (R-OBX-2).
 * A MESMA régua para a cobrança e para a nota (B-ASS-08b). */
async function registerFailure(deps: DispatcherDeps, row: BillingOutboxRow, error: unknown, clock: () => Date): Promise<DispatchOutcome> {
  const retryMs = rateLimitRetryMs(error);
  if (retryMs !== null) {
    await deps.repo.reschedule(row.tenantId, row.id, new Date(clock().getTime() + retryMs), "rate_limited", clock());
    return "rate_limited";
  }
  const code = errorCode(error);
  if (row.attempts >= OUTBOX_MAX_ATTEMPTS) {
    await deps.repo.markFailed(row.tenantId, row.id, code, clock());
    await deps.onAudit?.({ tenantId: row.tenantId, statementId: row.statementId, kind: row.kind, action: "billing_outbox.failed", code });
    return "failed";
  }
  await deps.repo.reschedule(row.tenantId, row.id, new Date(clock().getTime() + backoffMsForAttempt(row.attempts)), code, clock());
  return "retry";
}
