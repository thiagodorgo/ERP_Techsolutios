import type { MySubscription, MySubscriptionParse, MySubscriptionPayment, MySubscriptionStatus, MySubscriptionStorage, MySubscriptionUsage } from "./my-subscription.types";

// B-ASS-11 (F2, Emenda 1 §6.1 e Emenda 1.1 §5.1–5.2) — a resposta de `GET /billing/subscription` lida por ALLOWLIST, um
// nível por função: cada uma copia só as chaves que a tela usa e descarta o resto (T-A1). Números precisam ser finitos e
// ≥ 0; datas, `AAAA-MM-DD`; o período, `AAAA-MM`. Endereço de pagamento só `https:`, e sai normalizado (T-A3, T-A3b).
// Meio ausente e meio `null` valem o mesmo (as duas formas existem no servidor). Resposta fora da forma vira `invalid`,
// nunca tela com lixo (T-A5). Três tolerâncias, por decisão do plano: em atraso sem data (T-A7), plano com nome vazio
// (T-A8) e fatura sem vencimento (T-A9) seguem prontos.

type Raw = Readonly<Record<string, unknown>>;

class OutOfShape extends Error {}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PERIOD = /^\d{4}-\d{2}$/;

function recordOf(input: unknown): Raw {
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new OutOfShape();
  return input as Raw;
}

function countOf(input: unknown): number {
  if (typeof input !== "number" || !Number.isFinite(input) || input < 0) throw new OutOfShape();
  return input;
}

function flagOf(input: unknown): boolean {
  if (typeof input !== "boolean") throw new OutOfShape();
  return input;
}

/** `AAAA-MM-DD` ou `null`; ausente vale `null`; qualquer outra forma reprova. */
function dateOrNull(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string" || !DATE.test(input)) throw new OutOfShape();
  return input;
}

function assertPeriod(input: unknown): asserts input is string {
  if (typeof input !== "string" || !PERIOD.test(input)) throw new OutOfShape();
}

/** Só endereço `https:`, normalizado; qualquer outro esquema, texto sem esquema ou lixo vira `null`. */
export function httpsOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }
  return parsed.protocol === "https:" ? parsed.href : null;
}

/** Código para copiar (Pix, linha digitável): texto não vazio, aparado; senão `null`. */
function codeOrNull(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed === "" ? null : trimmed;
}

function planNameOf(input: unknown): string | null {
  const rawPlan = recordOf(input);
  if (typeof rawPlan.name !== "string") throw new OutOfShape();
  const name = rawPlan.name.trim();
  return name === "" ? null : name;
}

function usageOf(input: unknown): MySubscriptionUsage {
  const rawUsage = recordOf(input);
  return {
    used: countOf(rawUsage.used),
    included: countOf(rawUsage.included),
    overLimit: flagOf(rawUsage.overLimit),
  };
}

function storageOf(input: unknown): MySubscriptionStorage {
  const rawStorage = recordOf(input);
  return { ...usageOf(rawStorage), measuredAt: dateOrNull(rawStorage.measuredAt) };
}

function statusOf(input: unknown): MySubscriptionStatus {
  const rawStatus = recordOf(input);
  flagOf(rawStatus.inGoodStanding);
  return {
    inGoodStanding: rawStatus.inGoodStanding === true,
    overdueSince: dateOrNull(rawStatus.overdueSince),
    nextDueDate: dateOrNull(rawStatus.nextDueDate),
  };
}

function paymentOf(input: unknown): MySubscriptionPayment | null {
  if (input === null || input === undefined) return null;
  const rawPayment = recordOf(input);
  return {
    dueDate: dateOrNull(rawPayment.dueDate),
    payUrl: httpsOrNull(rawPayment.payUrl),
    pixCopyPaste: codeOrNull(rawPayment.pixCopyPaste),
    boletoLine: codeOrNull(rawPayment.boletoLine),
    boletoUrl: httpsOrNull(rawPayment.boletoUrl),
  };
}

function subscriptionOf(raw: Raw): MySubscription {
  assertPeriod(raw.period);
  const rawUsage = recordOf(raw.usage);
  return {
    period: raw.period,
    planName: planNameOf(raw.plan),
    users: usageOf(rawUsage.users),
    storageGb: storageOf(rawUsage.storageGb),
    status: statusOf(raw.status),
    payment: paymentOf(raw.payment),
  };
}

/** Lê o envelope `{ data }`: `data: null` é "sem assinatura"; o resto passa pela allowlist ou vira `invalid`. */
export function adaptMySubscriptionResponse(response: unknown): MySubscriptionParse {
  try {
    const envelope = recordOf(response);
    if (!("data" in envelope)) return { kind: "invalid" };
    if (envelope.data === null) return { kind: "none" };
    return { kind: "ready", subscription: subscriptionOf(recordOf(envelope.data)) };
  } catch (error) {
    if (error instanceof OutOfShape) return { kind: "invalid" };
    throw error;
  }
}
