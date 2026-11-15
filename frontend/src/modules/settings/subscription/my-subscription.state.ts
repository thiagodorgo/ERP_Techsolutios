import type { MySubscription, MySubscriptionPayment } from "./my-subscription.types";

// B-ASS-11 (F2, Emenda 1 §6.1 e Emenda 1.1 §2.3–2.4) — o modelo ÚNICO que as 3 aparências recebem: os textos, o estado de
// cada pizza, a situação, a fatura em aberto e os meios presentes. Função pura: o "hoje" (`todayKey`, `AAAA-MM-DD` de São
// Paulo) vem do hook, que tem o único relógio da pasta; nos testes ele é fixo. Datas são texto: `AAAA-MM-DD` vira
// `DD/MM/AAAA` por corte, e a diferença de dias usa `Date.UTC` (nunca texto lido como data, que em São Paulo mostraria a
// véspera). O conteúdo é o mesmo nas 3; muda só a composição (as vistas).

/**
 * Prazo de tolerância depois do vencimento, em dias, antes de a assinatura deixar de estar em dia. É a regra do servidor
 * (`GRACE_DAYS`, `src/modules/subscription-billing/statements/billing.constants.ts`); a tela só o usa para dizer
 * "continua em dia até" (divergência declarada na referência aprovada).
 */
export const GRACE_DAYS = 5;

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DAY_MS = 86_400_000;

function parts(iso: string): readonly [number, number, number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
}

/** `AAAA-MM-DD` → `DD/MM/AAAA`, por corte de texto. */
export function dateBR(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** `AAAA-MM-DD` → `DD/MM`. */
export function dateShort(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

/** `AAAA-MM` → "novembro de 2026". */
export function periodLabel(period: string): string {
  return `${MONTHS[Number(period.slice(5, 7)) - 1] ?? period} de ${period.slice(0, 4)}`;
}

/** `AAAA-MM` → "novembro". */
export function monthName(period: string): string {
  return MONTHS[Number(period.slice(5, 7)) - 1] ?? period;
}

function dayNumber(iso: string): number {
  const [year, month, day] = parts(iso);
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

/** Dias civis de `from` até `to` (positivo quando `to` é depois). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** Dias desde 1970-01-01 → `AAAA-MM-DD` (algoritmo civil), para somar dias sem ler texto como data. */
function isoFromDayNumber(days: number): string {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDays(iso: string, count: number): string {
  return isoFromDayNumber(dayNumber(iso) + count);
}

/** "sábado, 14 de novembro". */
export function longDay(iso: string): string {
  const weekday = WEEKDAYS[(((dayNumber(iso) + 4) % 7) + 7) % 7];
  const [, month, day] = parts(iso);
  return `${weekday}, ${day} de ${MONTHS[month - 1]}`;
}

const NUMBER = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export const formatAmountOfUse = (count: number) => NUMBER.format(count);

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "a, b e c" (ou "ou"). */
export function joinList(items: readonly string[], conjunction = "e"): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

export type UsageModel = {
  readonly id: "usuarios" | "espaco";
  readonly label: "Usuários" | "Espaço";
  readonly unit: "usuários" | "GB";
  readonly used: number;
  readonly included: number;
  readonly overLimit: boolean;
  /** Espaço ainda sem medição neste mês. */
  readonly pending: boolean;
  /** Medição de espaço 2 dias civis ou mais atrás de hoje (estado 10). */
  readonly measurementOld: boolean;
  readonly daysSinceMeasurement: number | null;
  readonly measuredAt: string | null;
  /** "maior número de novembro" / "estimativa de 13/11". */
  readonly caption: string | null;
  readonly pendingCaption: string;
  readonly percent: number | null;
};

export type PaymentMean = "payUrl" | "pixCopyPaste" | "boletoLine" | "boletoUrl";

export type InvoiceModel = {
  readonly dueDate: string | null;
  /** A fatura já venceu (o vencimento é antes de hoje). */
  readonly past: boolean;
  /** "vence em 11/11/2026" / "venceu em 11/11/2026" / "" sem data. */
  readonly dueText: string;
  /** "Fatura em aberto · vence em 11/11/2026" ou só "Fatura em aberto". */
  readonly title: string;
  /** "Vence em 11/11/2026" ou "Sem data de vencimento". */
  readonly dueCaption: string;
  /** Vencida e ainda em dia: o fim do prazo de tolerância (`AAAA-MM-DD`). */
  readonly onTimeUntil: string | null;
  readonly tone: "danger" | "warning" | "info";
  readonly payUrl: string | null;
  readonly pixCopyPaste: string | null;
  readonly boletoLine: string | null;
  readonly boletoUrl: string | null;
  readonly means: readonly PaymentMean[];
  readonly hasPaymentMean: boolean;
  /** O que "Copiar dados da fatura" grava: o nome da organização e o vencimento, sem valor. */
  readonly copyText: string;
};

export type MySubscriptionScreen = {
  readonly todayKey: string;
  readonly period: string;
  readonly periodText: string;
  readonly month: string;
  readonly planName: string | null;
  readonly includedUsers: number;
  readonly includedStorage: number;
  readonly users: UsageModel;
  readonly storage: UsageModel;
  /** Em atraso (a assinatura não está em dia). Toda a situação na tela sai daqui. */
  readonly overdue: boolean;
  readonly overdueSince: string | null;
  /** "Em dia" / "Em atraso desde 11/10/2026" / "Em atraso". */
  readonly situationTitle: string;
  readonly invoice: InvoiceModel | null;
  /** As franquias acima do limite: "de usuários", "de espaço". */
  readonly overLimitAreas: readonly string[];
};

function usageModel(subscription: MySubscription, id: "usuarios" | "espaco", todayKey: string): UsageModel {
  if (id === "usuarios") {
    const users = subscription.users;
    return {
      id,
      label: "Usuários",
      unit: "usuários",
      used: users.used,
      included: users.included,
      overLimit: users.overLimit,
      pending: false,
      measurementOld: false,
      daysSinceMeasurement: null,
      measuredAt: null,
      caption: `maior número de ${monthName(subscription.period)}`,
      pendingCaption: "Em estimativa",
      percent: percentOf(users.used, users.included, users.overLimit),
    };
  }
  const storage = subscription.storageGb;
  const measuredAt = storage.measuredAt;
  const base = {
    id,
    label: "Espaço" as const,
    unit: "GB" as const,
    used: storage.used,
    included: storage.included,
    overLimit: storage.overLimit,
    pendingCaption: "Em estimativa · a primeira medição de espaço do mês ainda não saiu",
    percent: percentOf(storage.used, storage.included, storage.overLimit),
  };
  if (measuredAt === null) {
    return { ...base, pending: true, measurementOld: false, daysSinceMeasurement: null, measuredAt: null, caption: null };
  }
  return {
    ...base,
    pending: false,
    measurementOld: daysBetween(measuredAt, todayKey) >= 2,
    daysSinceMeasurement: daysBetween(measuredAt, todayKey),
    measuredAt,
    caption: `estimativa de ${dateShort(measuredAt)}`,
  };
}

function percentOf(used: number, included: number, overLimit: boolean): number | null {
  if (overLimit || included <= 0) return null;
  return Math.round(Math.min(1, used / included) * 100);
}

function invoiceModel(payment: MySubscriptionPayment, inGoodStanding: boolean, todayKey: string, organizationName: string | null): InvoiceModel {
  const dueDate = payment.dueDate;
  const past = dueDate !== null && dueDate < todayKey;
  const dueText = dueDate === null ? "" : `${past ? "venceu em" : "vence em"} ${dateBR(dueDate)}`;
  const means: PaymentMean[] = [];
  if (payment.payUrl) means.push("payUrl");
  if (payment.pixCopyPaste) means.push("pixCopyPaste");
  if (payment.boletoLine) means.push("boletoLine");
  if (payment.boletoUrl) means.push("boletoUrl");
  const copyParts = [organizationName, "fatura em aberto", dueDate === null ? "sem data de vencimento" : `vencimento ${dateBR(dueDate)}`].filter(
    (part): part is string => Boolean(part),
  );
  return {
    dueDate,
    past,
    dueText,
    title: `Fatura em aberto${dueDate === null ? "" : ` · ${dueText}`}`,
    dueCaption: dueDate === null ? "Sem data de vencimento" : capitalize(dueText),
    onTimeUntil: inGoodStanding && past && dueDate !== null ? addDays(dueDate, GRACE_DAYS) : null,
    tone: !inGoodStanding ? "danger" : past ? "warning" : "info",
    payUrl: payment.payUrl,
    pixCopyPaste: payment.pixCopyPaste,
    boletoLine: payment.boletoLine,
    boletoUrl: payment.boletoUrl,
    means,
    hasPaymentMean: means.length > 0,
    copyText: copyParts.join(" · "),
  };
}

/** "Em dia" / "Em atraso desde 11/10/2026" / "Em atraso" — sempre a partir de `overdue`. */
function situationTitleOf(overdue: boolean, overdueSince: string | null): string {
  if (!overdue) return "Em dia";
  return overdueSince ? `Em atraso desde ${dateBR(overdueSince)}` : "Em atraso";
}

/** O modelo da tela, a partir da assinatura lida, do "hoje" de São Paulo e do nome da organização da sessão. */
export function buildMySubscriptionScreen(subscription: MySubscription, todayKey: string, organizationName: string | null): MySubscriptionScreen {
  const status = subscription.status;
  const payment = subscription.payment;
  const users = usageModel(subscription, "usuarios", todayKey);
  const storage = usageModel(subscription, "espaco", todayKey);
  const overLimitAreas = [users.overLimit ? "de usuários" : null, storage.overLimit ? "de espaço" : null].filter((area): area is string => area !== null);
  const screen = {
    todayKey,
    period: subscription.period,
    periodText: periodLabel(subscription.period),
    month: monthName(subscription.period),
    planName: subscription.planName,
    includedUsers: subscription.users.included,
    includedStorage: subscription.storageGb.included,
    users,
    storage,
    overdue: !status.inGoodStanding,
    overdueSince: status.overdueSince,
    overLimitAreas,
  };
  return {
    ...screen,
    situationTitle: situationTitleOf(screen.overdue, screen.overdueSince),
    invoice: payment ? invoiceModel(payment, !screen.overdue, todayKey, organizationName) : null,
  };
}
