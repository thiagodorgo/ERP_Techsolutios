import type { BacklogCategory, ChargeMethod, ChargeStatus, InvoiceStatus, QueueKind, StatementStatus } from "./billing-ops.types";

// B-ASS-10c-OPERACAO — os rótulos em português de toda enumeração do servidor (§3 e §11 do contrato: nenhum código cru na
// tela). Fora da lista, um rótulo neutro; nunca o código.

export type Tone = { readonly label: string; readonly bg: string; readonly fg: string };

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const monthIndex = (month: string) => {
  const match = /^\d{4}-(\d{2})$/.exec(month);
  const index = match ? Number.parseInt(match[1]!, 10) - 1 : -1;
  return index >= 0 && index < 12 ? index : -1;
};

/** "outubro de 2026". */
export function monthLabel(month: string): string {
  const index = monthIndex(month);
  return index < 0 ? month : `${MONTHS[index]} de ${month.slice(0, 4)}`;
}
/** "outubro". */
export function monthName(month: string): string {
  const index = monthIndex(month);
  return index < 0 ? month : MONTHS[index]!;
}
/** "out/26". */
export function monthShort(month: string): string {
  const index = monthIndex(month);
  return index < 0 ? month : `${MONTHS_SHORT[index]}/${month.slice(2, 4)}`;
}
export const capitalize = (text: string) => (text ? text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1) : text);

/** `AAAA-MM-DD` → `DD/MM/AAAA`. */
export function formatDay(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

const DATE_TIME = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
/** Data e hora de São Paulo ("20/11/2026 10:48"). */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date).replace(",", "");
}
export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : TIME.format(date);
}

export function statementTone(status: StatementStatus, partiallyPaid: boolean): Tone {
  if (status === "open") return { label: "Aberto", bg: "#F1F5F9", fg: "#475569" };
  if (status === "reopened") return { label: "Reaberto", bg: "#F1F5F9", fg: "#475569" };
  if (status === "paid") return { label: "Pago", bg: "#ECFDF5", fg: "#047857" };
  if (status === "cancelled") return { label: "Cancelado", bg: "#F1F5F9", fg: "#64748B" };
  if (status === "closed") return partiallyPaid ? { label: "Pago em parte", bg: "#FFFBEB", fg: "#B45309" } : { label: "Fechado", bg: "#EFF6FF", fg: "#1D4ED8" };
  return { label: "Situação desconhecida", bg: "#F1F5F9", fg: "#64748B" };
}

export const CHARGE_TONE: Readonly<Record<Exclude<ChargeStatus, "none">, Tone>> = {
  pending: { label: "Enviada", bg: "#EFF6FF", fg: "#1D4ED8" },
  confirmed: { label: "Paga", bg: "#ECFDF5", fg: "#047857" },
  failed: { label: "Com falha", bg: "#FEF2F2", fg: "#B91C1C" },
  cancelled: { label: "Cancelada", bg: "#F1F5F9", fg: "#64748B" },
  partially_refunded: { label: "Devolvida em parte", bg: "#FFFBEB", fg: "#B45309" },
  refunded: { label: "Devolvida", bg: "#F1F5F9", fg: "#64748B" },
  chargeback_disputed: { label: "Contestação aberta", bg: "#FEF2F2", fg: "#B91C1C" },
  charged_back: { label: "Contestada", bg: "#FEF2F2", fg: "#B91C1C" },
  needs_review: { label: "Em revisão", bg: "#FFFBEB", fg: "#B45309" },
  unknown: { label: "Situação desconhecida", bg: "#F1F5F9", fg: "#64748B" },
};
export const CANCEL_IN_REVIEW: Tone = { label: "Cancelamento em revisão", bg: "#FFFBEB", fg: "#B45309" };

/** A situação de UMA cobrança (lista `charges` do detalhe), pelo mesmo vocabulário. */
export function chargeRowTone(status: string): Tone {
  return (CHARGE_TONE as Readonly<Record<string, Tone>>)[status] ?? CHARGE_TONE.unknown;
}

export const INVOICE_TONE: Readonly<Record<Exclude<InvoiceStatus, "none">, Tone>> = {
  pending: { label: "Na fila", bg: "#EFF6FF", fg: "#1D4ED8" },
  authorized: { label: "Emitida", bg: "#ECFDF5", fg: "#047857" },
  rejected: { label: "Com falha", bg: "#FEF2F2", fg: "#B91C1C" },
  cancel_pending: { label: "Em cancelamento", bg: "#FFFBEB", fg: "#B45309" },
  cancelled: { label: "Cancelada", bg: "#F1F5F9", fg: "#64748B" },
  unknown: { label: "Situação desconhecida", bg: "#F1F5F9", fg: "#64748B" },
};

export const BACKLOG_LABEL: Readonly<Record<BacklogCategory, string>> = {
  live_on_unpaid: "Nota emitida sem pagamento",
  no_intent: "Pago, nota ainda não pedida",
  awaiting_provider: "Esperando o provedor de nota",
  needs_review: "Em revisão",
  before_cutoff: "Anterior ao início das notas",
};
export const BACKLOG_TONE: Readonly<Record<BacklogCategory, Tone>> = {
  live_on_unpaid: { label: "Emitida sem pagamento", bg: "#FEF2F2", fg: "#B91C1C" },
  no_intent: { label: "A emitir", bg: "#FFFBEB", fg: "#B45309" },
  awaiting_provider: { label: "Esperando o provedor", bg: "#EFF6FF", fg: "#1D4ED8" },
  needs_review: { label: "Em revisão", bg: "#FFFBEB", fg: "#B45309" },
  before_cutoff: { label: "Anterior às notas", bg: "#F1F5F9", fg: "#475569" },
};

export const QUEUE_KIND_LABEL: Readonly<Record<QueueKind, string>> = {
  charge_create: "Envio da cobrança",
  charge_cancel: "Cancelamento da cobrança",
  refund: "Devolução",
  invoice_issue: "Emissão da nota",
  invoice_cancel: "Cancelamento da nota",
  unknown: "Linha da fila",
};

export const METHOD_LABEL: Readonly<Record<ChargeMethod, string>> = { pix: "Pix", boleto: "Boleto", credit_card: "Cartão de crédito", debit_card: "Cartão de débito" };

/** A forma de um pagamento: o código conhecido vira rótulo; texto digitado pelo operador passa; código desconhecido some. */
export function paymentMethodLabel(method: string | null): string | null {
  if (!method) return null;
  const known = (METHOD_LABEL as Readonly<Record<string, string>>)[method.toLowerCase()];
  if (known) return known;
  return /_/.test(method) ? null : method;
}

const HISTORY_EVENT: Readonly<Record<string, string>> = {
  closed: "Fechado",
  reopened: "Reaberto",
  adjusted: "Ajuste registrado",
  cancelled: "Cancelado",
  credit_applied: "Crédito aplicado",
  credit_reversed: "Crédito estornado",
};
export const historyLabel = (event: string) => HISTORY_EVENT[event] ?? "Mudança registrada";

const CREDIT_REASON: Readonly<Record<string, string>> = {
  overpayment: "Pagamento a mais",
  duplicate_payment: "Pagamento em dobro",
  paid_after_cancel: "Pago depois do cancelamento",
  paid_after_manual_settlement: "Pago depois da baixa manual",
  late_fee_received: "Multa recebida",
};
const CREDIT_STATUS: Readonly<Record<string, string>> = { open: "em aberto", applied: "aplicado", refunded: "devolvido", written_off: "baixado" };
export const creditReasonLabel = (reason: string) => CREDIT_REASON[reason] ?? "Crédito";
export const creditStatusLabel = (status: string) => CREDIT_STATUS[status] ?? "situação desconhecida";

const PROFILE_FIELD: Readonly<Record<string, string>> = {
  legalName: "razão social",
  document: "CNPJ ou CPF",
  email: "e-mail",
  "address.postalCode": "CEP",
  "address.street": "rua",
  "address.number": "número",
  "address.district": "bairro",
  "address.city": "cidade",
  "address.cityIbge": "código da cidade",
  "address.state": "UF",
  paymentMethod: "forma de pagamento",
};
export const profileFieldLabel = (field: string) => PROFILE_FIELD[field] ?? "outro dado";

const FISCAL_FIELD: Readonly<Record<string, string>> = {
  cnpj: "CNPJ do emissor",
  regimeTributario: "Regime tributário",
  municipioIbge: "Código do município",
  cTribNac: "Código de tributação nacional",
  tributacaoIss: "Tributação do ISS",
  regimeEspecialTributacao: "Regime especial de tributação",
  codigoOpcaoSimplesNacional: "Opção pelo Simples Nacional",
  serieDps: "Série da DPS",
  companyId: "Identificador da empresa no provedor",
  municipalTaxStatus: "Situação no município",
  issAliquota: "Alíquota do ISS",
  issTipoTributacao: "Tipo de tributação do ISS",
  issExigibilidade: "Exigibilidade do ISS",
  nfseRoute: "Rota da nota",
  inscricaoMunicipal: "Inscrição municipal",
};
export const fiscalFieldLabel = (field: string) => FISCAL_FIELD[field] ?? "Outro dado fiscal";

export const providerKindLabel = (kind: "payment" | "invoice") => (kind === "payment" ? "Pagamento" : "Nota fiscal");
export const environmentLabel = (environment: "sandbox" | "production") => (environment === "sandbox" ? "Sandbox (teste)" : "Produção");
