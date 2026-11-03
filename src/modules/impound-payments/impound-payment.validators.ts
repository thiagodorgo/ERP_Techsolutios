import {
  HELD_REASONS,
  ImpoundPaymentError,
  IntentAccountError,
  PAYMENT_METHODS,
  SETTLED_HELD_REASONS,
  type HeldReason,
  type IntentAccount,
  type IntentStatus,
  type PaymentMethod,
} from "./impound-payment.types.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Campos aceitos no corpo do POST da cobrança on-line (v3 §6.1). Campo desconhecido → 400 `unknown_field`: o corpo não
// carrega organização, valor, conta, `split` nem nada que o servidor decide sozinho.
const CREATE_BODY_FIELDS = new Set(["payerName", "payerDocument", "methods"]);

export function parseRequiredUuid(value: unknown, field: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new ImpoundPaymentError(400, "ONLINE_PAYMENT_INVALID", "required_field", `${field} is required.`);
  }
  if (!uuidPattern.test(normalized)) {
    throw new ImpoundPaymentError(400, "ONLINE_PAYMENT_INVALID", "invalid_uuid", `${field} must be a valid UUID.`);
  }
  return normalized;
}

export type CreateIntentBody = {
  readonly payerName: string;
  readonly payerDocument: string;
  readonly methods: readonly PaymentMethod[];
};

export function parseCreateIntentBody(body: unknown): CreateIntentBody {
  const record = typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
  for (const key of Object.keys(record)) {
    if (!CREATE_BODY_FIELDS.has(key)) {
      throw new ImpoundPaymentError(400, "ONLINE_PAYMENT_INVALID", "unknown_field", "The request body has a field that is not accepted.");
    }
  }
  return {
    payerName: parsePayerName(record.payerName),
    payerDocument: parsePayerDocument(record.payerDocument),
    methods: parseMethods(record.methods),
  };
}

export function parsePayerName(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (normalized.length < 3 || normalized.length > 120) {
    throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", "payer_name_invalid", "payerName must have between 3 and 120 characters.");
  }
  return normalized;
}

// CPF (11) ou CNPJ (14) com dígitos verificadores. Guarda só os dígitos.
export function parsePayerDocument(value: unknown): string {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  const valid = digits.length === 11 ? isValidCpf(digits) : digits.length === 14 ? isValidCnpj(digits) : false;
  if (!valid) {
    throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", "payer_document_invalid", "payerDocument must be a valid CPF or CNPJ.");
  }
  return digits;
}

// Q5 — PII só na intenção e MASCARADA para fora: só os 2 últimos dígitos aparecem.
export function maskPayerDocument(document: string): string {
  const digits = document.replace(/\D/g, "");
  const tail = digits.slice(-2);
  return digits.length === 14 ? `**.***.***/****-${tail}` : `***.***.***-${tail}`;
}

// P-REC-1 — sem `methods`, os três; com `methods`, um subconjunto não vazio dos três, sem repetição. Boleto não existe.
export function parseMethods(value: unknown): readonly PaymentMethod[] {
  if (value === undefined || value === null) {
    return PAYMENT_METHODS;
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", "methods_invalid", "methods must be a non-empty list.");
  }
  const chosen = new Set<PaymentMethod>();
  for (const item of value) {
    if (typeof item !== "string" || !(PAYMENT_METHODS as readonly string[]).includes(item)) {
      throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", "methods_invalid", `methods must be among: ${PAYMENT_METHODS.join(", ")}.`);
    }
    chosen.add(item as PaymentMethod);
  }
  return PAYMENT_METHODS.filter((method) => chosen.has(method));
}

// P-REC-22b (emenda §3.1) — a conta resolvida tem de ser EXATAMENTE uma das duas formas; `null`, `undefined`, escopo
// desconhecido (inclusive `platform`) ou os dois ids juntos → 422 `account_not_allowed`. Chamado no `create` antes de
// qualquer escrita.
export function assertIntentAccount(account: unknown): asserts account is IntentAccount {
  if (typeof account !== "object" || account === null) {
    throw new IntentAccountError();
  }
  const record = account as Record<string, unknown>;
  const hasConnection = record.connectionId !== undefined && record.connectionId !== null;
  const hasGroupConnection = record.groupConnectionId !== undefined && record.groupConnectionId !== null;
  const hasGroup = record.groupId !== undefined && record.groupId !== null;
  if (record.scope === "organization") {
    if (!isUuid(record.connectionId) || hasGroupConnection || hasGroup) {
      throw new IntentAccountError();
    }
    return;
  }
  if (record.scope === "group") {
    if (!isUuid(record.groupId) || !isUuid(record.groupConnectionId) || hasConnection) {
      throw new IntentAccountError();
    }
    return;
  }
  throw new IntentAccountError();
}

// §4.1 — o espelho, na APP, dos CHECKs de dinheiro do banco (M-REC-1). O banco é a autoridade; a app recusa antes.
export function assertIntentMoney(intent: {
  readonly status: IntentStatus;
  readonly amountCents: number;
  readonly paidCents: number;
  readonly appliedCents: number;
  readonly heldCents: number;
  readonly heldReason?: HeldReason;
  readonly refundedCents: number;
}): void {
  const values = [intent.amountCents, intent.paidCents, intent.appliedCents, intent.heldCents, intent.refundedCents];
  if (!values.every((value) => Number.isSafeInteger(value) && value >= 0) || intent.amountCents === 0) {
    throw moneyError("money_not_cents");
  }
  if (intent.paidCents !== intent.appliedCents + intent.heldCents + intent.refundedCents) {
    throw moneyError("money_identity_broken");
  }
  if ((intent.heldCents > 0) !== (intent.heldReason !== undefined)) {
    throw moneyError("held_reason_mismatch");
  }
  if (intent.heldReason !== undefined && !(HELD_REASONS as readonly string[]).includes(intent.heldReason)) {
    throw moneyError("held_reason_mismatch");
  }
  switch (intent.status) {
    case "pending":
    case "cancel_requested":
    case "cancelled":
    case "expired":
      if (intent.appliedCents !== 0 || intent.heldCents !== 0) throw moneyError("state_money_mismatch");
      return;
    case "funds_held":
    case "disputed":
      if (intent.appliedCents !== 0 || intent.heldCents <= 0) throw moneyError("state_money_mismatch");
      return;
    case "reversed":
      if (intent.appliedCents !== 0 || intent.heldCents !== 0 || intent.refundedCents <= 0) throw moneyError("state_money_mismatch");
      return;
    case "settled":
      if (intent.appliedCents <= 0) throw moneyError("state_money_mismatch");
      if (intent.heldReason !== undefined && !(SETTLED_HELD_REASONS as readonly string[]).includes(intent.heldReason)) {
        throw moneyError("state_money_mismatch");
      }
      return;
  }
}

function moneyError(reason: string): ImpoundPaymentError {
  return new ImpoundPaymentError(422, "ONLINE_PAYMENT_INVALID", reason, "The payment intent money columns are inconsistent.");
}

function isUuid(value: unknown): boolean {
  return typeof value === "string" && uuidPattern.test(value);
}

function isValidCpf(digits: string): boolean {
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}

function isValidCnpj(digits: string): boolean {
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const check = (length: number): number => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * weights[index]!;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}
