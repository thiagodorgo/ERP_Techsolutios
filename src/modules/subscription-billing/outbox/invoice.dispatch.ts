// B-ASS-08b · (c2) — a perna da NOTA no dispatcher (plano §4.7/§4.8 R-SET-2, R-D, R-H; decisão do orquestrador de 09/11):
//
//   `invoice_issue`  — só com demonstrativo `paid`; `competenceDate` = o PERÍODO do demonstrativo (competência fiscal = mês do
//                      serviço prestado, nunca a data da emissão — é ela que decide se o grupo IBS/CBS vai, §N5);
//                      `amountCents` = `total_amount` do demonstrativo (a nota é do serviço do mês; excedente é crédito, R-C);
//                      `serviceDescription` = plano + competência, sem dado pessoal; `numero_dps` da sequência nossa, reservado
//                      na MESMA transação da linha da nota (R-H). O 2xx do provedor é `processing`, NUNCA autorizada (R-NF-2).
//   `invoice_cancel` — código "conforme provedor" (R-D, `D-NOTA-CANCEL-CODIGO-PROVEDOR`): o adaptador Focus Nacional só leva a
//                      `justificativa`; o código fica registrado na NOSSA linha como 9 ("outros") + o motivo em texto.
//                      NOTA AO DONO/CONTADOR: se a homologação exigir o código no provedor, é emenda do adaptador.
//
// O `fetch` ao provedor acontece FORA de transação (R-OBX-1): `beginIssue` abre e fecha a dele antes da chamada.

import { InvoiceProviderError } from "../providers/invoice/invoice-errors.js";
import type { InvoiceLookup, InvoiceProviderPort, InvoiceTaxProfile, IssueInvoiceInput, NfseRoute } from "../providers/invoice/invoice-provider.port.js";
import type { ProviderSettings } from "../providers/provider-config.repository.js";
import { ProviderValidationError } from "../providers/http/billing-errors.js";
import { StatementNotPaidError, type StatementInvoiceRepository } from "../invoices/invoices.repository.js";
import { invoiceExternalRef, sanitizeInvoiceError, type SubscriptionStatementInvoice } from "../invoices/invoices.types.js";
import type { StatementRepository } from "../statements/statement.repository.js";
import type { SubscriptionStatement } from "../statements/statement.types.js";
import type { BillingOutboxRow, OutboxSkipReason } from "./outbox.types.js";

/** Código de cancelamento registrado na nossa linha quando o provedor não tem lista própria: 9 = "outros" (R-D). */
export const INVOICE_CANCEL_CODE_OTHERS = "9";

/** Conserto da J-530 (C): quanto o `invoice_cancel` de uma nota ainda pendente espera antes de RECONSULTAR e, se o provedor
 * ainda não decidiu, ir a revisão. 72 h = 12 × a janela de 6 h que o PlugNotas cita (leitura do topo, declarada). */
export const INVOICE_CANCEL_MAX_WAIT_MS = 72 * 60 * 60 * 1000;

/** Texto da justificativa por motivo da outbox — PT-BR de negócio, sem dado pessoal, sem valor. */
export const INVOICE_CANCEL_REASON_TEXT: Readonly<Record<string, string>> = {
  payment_reversed: "Pagamento estornado ou com chargeback; o serviço deste período não foi liquidado por este documento.",
};

/** A competência fiscal é o MÊS do serviço: o último dia do período do demonstrativo (`YYYY-MM-DD`). Os marcos do §N5 caem
 * sempre no dia 1, então primeiro e último dia do mesmo mês decidem o IBS/CBS do mesmo jeito. */
export function competenceDateOf(period: string): string {
  const [year, month] = period.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${String(lastDay).padStart(2, "0")}`;
}

/** O perfil fiscal do emissor a partir de `billing_provider_configs.settings` (B-ASS-05 — chaves livres, validadas no PUT).
 * As chaves do grupo IBS/CBS ficam declaradas AQUI (não há outra fonte): `ibsCbsEnviar`, `ibsCbsCst`, `ibsCbsClassTrib`,
 * `ibsCbsIndicadorDestinatario`, `ibsCbsFinalidadeEmissao`. */
export function taxProfileFromSettings(settings: ProviderSettings): InvoiceTaxProfile {
  const text = (key: string): string | undefined => {
    const value = settings[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  const integer = (key: string): number | undefined => {
    const value = settings[key];
    if (typeof value === "number" && Number.isInteger(value)) return value;
    return typeof value === "string" && /^\d+$/.test(value) ? Number(value) : undefined;
  };
  const flag = (key: string): boolean | undefined => (typeof settings[key] === "boolean" ? (settings[key] as boolean) : undefined);
  const ibsCbs = {
    ...(flag("ibsCbsEnviar") !== undefined ? { enviar: flag("ibsCbsEnviar")! } : {}),
    ...(text("ibsCbsCst") ? { cst: text("ibsCbsCst")! } : {}),
    ...(text("ibsCbsClassTrib") ? { cClassTrib: text("ibsCbsClassTrib")! } : {}),
    ...(text("ibsCbsIndicadorDestinatario") ? { indicadorDestinatario: text("ibsCbsIndicadorDestinatario")! } : {}),
    ...(text("ibsCbsFinalidadeEmissao") ? { finalidadeEmissao: text("ibsCbsFinalidadeEmissao")! } : {}),
  };
  const route = text("nfseRoute");
  return {
    ...(route === "nacional" || route === "municipal" ? { nfseRoute: route as NfseRoute } : {}),
    ...(text("regimeTributario") ? { regimeTributario: text("regimeTributario")! } : {}),
    ...(text("codigoOpcaoSimplesNacional") ? { codigoOpcaoSimplesNacional: text("codigoOpcaoSimplesNacional")! } : {}),
    ...(text("regimeEspecialTributacao") ? { regimeEspecialTributacao: text("regimeEspecialTributacao")! } : {}),
    ...(text("tributacaoIss") ? { tributacaoIss: text("tributacaoIss")! } : {}),
    ...(text("municipioIbge") ? { municipioIbge: text("municipioIbge")! } : {}),
    ...(text("cTribNac") ? { cTribNac: text("cTribNac")! } : {}),
    ...(text("codigoNbs") ? { codigoNbs: text("codigoNbs")! } : {}),
    ...(integer("serieDps") !== undefined ? { serieDps: integer("serieDps")! } : {}),
    ...(text("issAliquota") ? { issAliquota: text("issAliquota")! } : {}),
    ...(Object.keys(ibsCbs).length > 0 ? { ibsCbs } : {}),
  };
}

/** O que a emissão precisa além do demonstrativo: emissor (settings fiscais), tomador (perfil de cobrança), perfil fiscal e
 * descrição. `{ reason }` quando falta algo — vira `NEEDS_REVIEW` visível, nunca nota com dado inventado. */
export type InvoiceIssueContext = {
  readonly environment: string;
  readonly serie: number;
  readonly emitter: IssueInvoiceInput["emitter"];
  readonly borrower: IssueInvoiceInput["borrower"];
  readonly taxProfile: InvoiceTaxProfile;
  readonly serviceDescription: string;
};

export type InvoiceIssueContextResolver = (input: {
  readonly tenantId: string;
  readonly statementId: string;
  readonly provider: string;
  readonly statement: SubscriptionStatement;
}) => Promise<InvoiceIssueContext | { readonly reason: string }>;

export type InvoiceOutboxDeps = {
  /** SÓ as portas dos provedores de NOTA ligados (R-OBX-4). */
  readonly ports: Readonly<Record<string, InvoiceProviderPort>>;
  readonly invoices: StatementInvoiceRepository;
  readonly statements: Pick<StatementRepository, "findStatement">;
  readonly resolveIssueContext: InvoiceIssueContextResolver;
};

export type InvoiceDispatchResult =
  | { readonly kind: "sent"; readonly externalId: string | null }
  | { readonly kind: "recovered"; readonly externalId: string | null }
  | { readonly kind: "needs_review"; readonly code: string }
  | { readonly kind: "skipped"; readonly reason: OutboxSkipReason }
  /** (C) A nota ainda está pendente: a linha é ADIADA, sem gastar tentativa, até a reconsulta decidir a nota. */
  | { readonly kind: "deferred"; readonly code: "invoice_still_processing" };

function payloadSeq(row: BillingOutboxRow): number {
  const value = row.payload.seq;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
}

export class InvoiceOutboxHandler {
  constructor(private readonly deps: InvoiceOutboxDeps) {}

  /** Os provedores de nota ligados — entram na elegibilidade do claim junto com os de pagamento. */
  get providers(): readonly string[] {
    return Object.keys(this.deps.ports);
  }

  async issue(row: BillingOutboxRow, wasOrphan: boolean, now: Date): Promise<InvoiceDispatchResult> {
    const port = this.deps.ports[row.provider];
    if (!port) return { kind: "skipped", reason: "provider_disabled" };
    const statement = await this.deps.statements.findStatement(row.tenantId, row.statementId);
    if (!statement) return { kind: "needs_review", code: "statement_not_found" };
    if (statement.status === "cancelled") return { kind: "skipped", reason: "statement_cancelled" };
    // R-SET-2: nota só depois de pago. Esta leitura SEM trava é só o caminho rápido; a decisão é do `beginIssue`, sob a trava
    // (A). Conserto da J-530 (CRIT530R2-01): se esta linha já tem nota PENDENTE (órfã ou retentativa) e o demonstrativo saiu de
    // `paid`, a nota é decidida pela reconsulta — nunca fica viva para sempre sobre receita estornada.
    // [INTX-12f]
    if (statement.status !== "paid") return this.#notPaidFastPath(row, port, now);

    const context = await this.deps.resolveIssueContext({ tenantId: row.tenantId, statementId: row.statementId, provider: row.provider, statement });
    if ("reason" in context) return { kind: "needs_review", code: context.reason };

    let begun: { readonly invoice: SubscriptionStatementInvoice; readonly statementPaid: boolean };
    try {
      begun = await this.deps.invoices.beginIssue(
        { tenantId: row.tenantId, statementId: row.statementId, seq: payloadSeq(row), provider: row.provider, environment: context.environment, serie: context.serie },
        now,
      );
    } catch (error) {
      if (error instanceof InvoiceProviderError || error instanceof StatementNotPaidError) return { kind: "needs_review", code: error.code };
      throw error;
    }
    const invoice = begun.invoice;
    // Idempotência: a linha já passou de `pending` (autorizada, rejeitada, cancelada) → nada a emitir.
    if (invoice.status !== "pending") return { kind: "sent", externalId: invoice.providerInvoiceId ?? invoice.externalRef };
    // (A) Nota pendente sobre demonstrativo que saiu de `paid` (lido sob a trava) nunca é (re)enviada: a reconsulta decide.
    // [INTX-12b]
    if (!begun.statementPaid) return this.#resolveWithoutIssuing(row, invoice, port, now);

    // Órfã de crash, ou emissão que já chegou ao provedor: RECONSULTA pela `ref` ANTES de repetir (G8). `unknown` = nunca
    // chegou → emitir (e a `ref` repetida é recusada pelo provedor como `already_issued`, idempotente).
    if (wasOrphan || invoice.providerInvoiceId) {
      const lookup = await port.getInvoice(invoice.externalRef);
      if (lookup.status !== "unknown") {
        await this.#applyLookup(invoice, lookup, port, now);
        return { kind: "recovered", externalId: invoice.providerInvoiceId ?? invoice.externalRef };
      }
    }

    try {
      const result = await port.issue({
        externalRef: invoice.externalRef,
        dpsNumber: invoice.numeroDps ?? 0,
        emitter: context.emitter,
        borrower: context.borrower,
        serviceDescription: context.serviceDescription,
        amountCents: statement.totalCents,
        competenceDate: competenceDateOf(statement.period),
        taxProfile: { ...context.taxProfile, serieDps: context.serie },
      });
      await this.deps.invoices.markIssued(row.tenantId, invoice.id, result.providerInvoiceId ?? null, now);
      return { kind: "sent", externalId: result.providerInvoiceId ?? invoice.externalRef };
    } catch (error) {
      if (error instanceof InvoiceProviderError) {
        if (error.code === "already_issued") {
          await this.deps.invoices.markIssued(row.tenantId, invoice.id, error.existingId ?? null, now);
          return { kind: "sent", externalId: error.existingId ?? invoice.externalRef };
        }
        // Dado fiscal incompleto / IBS-CBS / rota municipal para Simples: não é transitório — revisão humana, visível.
        return { kind: "needs_review", code: error.code };
      }
      if (error instanceof ProviderValidationError) return { kind: "needs_review", code: "provider_validation" };
      throw error; // transitório (rede, 5xx, 429): o dispatcher aplica o backoff
    }
  }

  /** (A) O caminho rápido viu o demonstrativo fora de `paid`: sem nota desta linha, nada a emitir; com nota PENDENTE, ela é
   * decidida pela reconsulta (CRIT530R2-01). */
  async #notPaidFastPath(row: BillingOutboxRow, port: InvoiceProviderPort, now: Date): Promise<InvoiceDispatchResult> {
    const invoice = await this.deps.invoices.findByRef(row.tenantId, row.provider, invoiceExternalRef(row.statementId, payloadSeq(row)));
    if (invoice?.status === "pending") return this.#resolveWithoutIssuing(row, invoice, port, now);
    return { kind: "needs_review", code: "statement_not_paid" };
  }

  /** (A) A nota pendente sobre receita que deixou de estar paga: RECONSULTA, nunca `port.issue`. Conhecida → registra a
   * verdade (o cancelamento já está na fila desde a reversão); desconhecida e sem id do provedor → nunca chegou ao provedor:
   * `rejected` com `not_issued_payment_reversed` (o CHECK de status é fechado — leitura do topo, declarada). */
  async #resolveWithoutIssuing(row: BillingOutboxRow, invoice: SubscriptionStatementInvoice, port: InvoiceProviderPort, now: Date): Promise<InvoiceDispatchResult> {
    const lookup = await port.getInvoice(invoice.externalRef);
    if (lookup.status !== "unknown") {
      await this.#applyLookup(invoice, lookup, port, now);
      return { kind: "recovered", externalId: invoice.providerInvoiceId ?? invoice.externalRef };
    }
    if (!invoice.providerInvoiceId) await this.deps.invoices.markRejected(row.tenantId, invoice.id, "not_issued_payment_reversed", now);
    return { kind: "needs_review", code: "statement_not_paid" };
  }

  async cancel(row: BillingOutboxRow, now: Date): Promise<InvoiceDispatchResult> {
    const port = this.deps.ports[row.provider];
    if (!port) return { kind: "skipped", reason: "provider_disabled" };
    const live = await this.deps.invoices.findLive(row.tenantId, row.statementId);
    if (!live) {
      const last = (await this.deps.invoices.listByStatement(row.tenantId, row.statementId)).at(-1);
      // Nada vivo a cancelar: já cancelada (o webhook chegou antes) ou rejeitada (nunca autorizada) — idempotente.
      // [INTX-11d]
      if (last?.status === "cancelled" || last?.status === "rejected") return { kind: "sent", externalId: last.providerInvoiceId ?? last.externalRef };
      return { kind: "needs_review", code: "no_live_invoice" };
    }
    // (C) Uma nota ainda em processamento não se cancela: a linha ESPERA (adiada, sem gastar tentativa) a reconsulta decidir.
    // [INTX-11b]
    if (live.status === "pending" && now.getTime() - row.createdAt.getTime() <= INVOICE_CANCEL_MAX_WAIT_MS) return { kind: "deferred", code: "invoice_still_processing" };
    // CRIT530R2-03: passou do teto — a nota é RECONSULTADA antes de qualquer revisão (o provedor ou os jobs podem ter ficado
    // parados; a idade da linha não diz que o provedor teve tempo de decidir).
    // [INTX-11e]
    if (live.status === "pending") return this.#decideOverduePending(row, live, port, now);
    return this.#cancelLive(row, live, port, now);
  }

  /** CRIT530R2-03: a nota pendente além do teto, decidida pela reconsulta. Autorizada → cancela agora; rejeitada/cancelada →
   * nada vivo; desconhecida e sem id do provedor → nunca chegou ao provedor (rejeitada, como a órfã); ainda processando →
   * revisão visível (a saída dela é pendência com dono). */
  async #decideOverduePending(row: BillingOutboxRow, live: SubscriptionStatementInvoice, port: InvoiceProviderPort, now: Date): Promise<InvoiceDispatchResult> {
    const lookup = await port.getInvoice(live.externalRef);
    if (lookup.status === "processing" || (lookup.status === "unknown" && live.providerInvoiceId)) return { kind: "needs_review", code: "invoice_stuck_processing" };
    if (lookup.status === "unknown") {
      await this.deps.invoices.markRejected(row.tenantId, live.id, "not_issued_payment_reversed", now);
      return { kind: "sent", externalId: live.externalRef };
    }
    await this.#applyLookup(live, lookup, port, now);
    const refreshed = await this.deps.invoices.findLive(row.tenantId, row.statementId);
    if (!refreshed) return { kind: "sent", externalId: live.providerInvoiceId ?? live.externalRef };
    if (refreshed.status === "pending") return { kind: "needs_review", code: "invoice_stuck_processing" };
    return this.#cancelLive(row, refreshed, port, now);
  }

  /** O cancelamento de uma nota viva já decidida (`authorized`, ou `cancel_pending` sendo repetido). */
  async #cancelLive(row: BillingOutboxRow, live: SubscriptionStatementInvoice, port: InvoiceProviderPort, now: Date): Promise<InvoiceDispatchResult> {
    const reasonKey = typeof row.payload.reason === "string" ? row.payload.reason : "payment_reversed";
    const reason = INVOICE_CANCEL_REASON_TEXT[reasonKey] ?? reasonKey;
    const code = typeof row.payload.code === "string" && row.payload.code ? row.payload.code : INVOICE_CANCEL_CODE_OTHERS;
    // Intenção gravada ANTES da chamada (G8): crash entre as duas deixa `cancel_pending`, que a reconsulta resolve.
    if (live.status === "authorized") await this.deps.invoices.markCancelPending(row.tenantId, live.id, { reason, code }, now);

    const result = await port.cancel(live.externalRef, reason, code);
    if (result.status === "cancelled") {
      await this.deps.invoices.markCancelled(row.tenantId, live.id, now);
      return { kind: "sent", externalId: live.providerInvoiceId ?? live.externalRef };
    }
    if (result.status === "processing") return { kind: "sent", externalId: live.providerInvoiceId ?? live.externalRef }; // o webhook/poll conclui
    // Erro de negócio (Focus: `erro_cancelamento` em 200): a nota segue autorizada, com o erro visível.
    await this.deps.invoices.markCancelFailed(row.tenantId, live.id, "provider_cancel_error", now);
    return { kind: "needs_review", code: "invoice_cancel_error" };
  }

  async #applyLookup(invoice: SubscriptionStatementInvoice, lookup: InvoiceLookup, port: InvoiceProviderPort, now: Date): Promise<void> {
    if (lookup.status === "authorized") {
      await this.deps.invoices.markAuthorized(
        invoice.tenantId,
        invoice.id,
        {
          ...(lookup.number ? { number: lookup.number } : {}),
          ...(lookup.verificationCode ? { verificationCode: lookup.verificationCode } : {}),
          ...(lookup.pdfUrl ? { pdfUrl: lookup.pdfUrl } : {}),
          ...(lookup.xmlUrl ? { xmlUrl: lookup.xmlUrl } : {}),
          pdfSource: port.describe().pdfSource,
        },
        now,
      );
      return;
    }
    if (lookup.status === "rejected") {
      await this.deps.invoices.markRejected(invoice.tenantId, invoice.id, sanitizeInvoiceError(lookup.errors), now);
      return;
    }
    if (lookup.status === "cancelled") {
      await this.deps.invoices.markCancelled(invoice.tenantId, invoice.id, now);
      return;
    }
    // `processing`: a emissão chegou; segue `pending` até o webhook/poll.
    await this.deps.invoices.markIssued(invoice.tenantId, invoice.id, invoice.providerInvoiceId, now);
  }
}
