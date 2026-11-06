// B-ASS-04 · F8 — perfil de cobrança da organização (G12, R-ST-14): quem paga, para onde o provedor avisa e como.
// PUT incompleto é aceito (rascunho): `complete` e `missing[]` dizem o que falta para cobrar. O documento é validado
// pelos dígitos verificadores — CPF (11), CNPJ numérico e CNPJ alfanumérico (14; valor do caractere = código ASCII − 48,
// dígitos verificadores sempre numéricos). Documento e e-mail são dado pessoal: nunca entram na trilha de auditoria.

import { randomUUID } from "node:crypto";

export const BILLING_PAYMENT_METHODS = ["pix", "boleto", "credit_card", "debit_card", "undefined"] as const;
export type BillingPaymentMethod = (typeof BILLING_PAYMENT_METHODS)[number];

export type BillingAddress = {
  readonly postalCode: string | null;
  readonly street: string | null;
  readonly number: string | null;
  readonly district: string | null;
  readonly city: string | null;
  readonly cityIbge: string | null;
  readonly state: string | null;
};

export type TenantBillingProfile = {
  readonly id: string;
  readonly tenantId: string;
  readonly legalName: string | null;
  readonly document: string | null;
  readonly email: string | null;
  readonly address: BillingAddress;
  readonly paymentMethod: BillingPaymentMethod;
  readonly asaasCustomerId: string | null;
  readonly mpCustomerId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type BillingProfileInput = Omit<TenantBillingProfile, "id" | "tenantId" | "asaasCustomerId" | "mpCustomerId" | "createdAt" | "updatedAt">;

export class BillingProfileError extends Error {
  readonly code = "SUBSCRIPTION_BILLING_PROFILE";

  constructor(
    readonly statusCode: number,
    readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = "BillingProfileError";
  }
}

export interface BillingProfileRepository {
  find(tenantId: string): Promise<TenantBillingProfile | null>;
  /** Grava o perfil inteiro (upsert por `tenant_id`), preservando os ids no provedor. */
  upsert(tenantId: string, input: BillingProfileInput, now: Date): Promise<TenantBillingProfile>;
}

export class InMemoryBillingProfileRepository implements BillingProfileRepository {
  private readonly rows = new Map<string, TenantBillingProfile>();

  async find(tenantId: string): Promise<TenantBillingProfile | null> {
    return this.rows.get(tenantId) ?? null;
  }

  async upsert(tenantId: string, input: BillingProfileInput, now: Date): Promise<TenantBillingProfile> {
    const current = this.rows.get(tenantId);
    const saved: TenantBillingProfile = {
      id: current?.id ?? randomUUID(),
      tenantId,
      ...input,
      asaasCustomerId: current?.asaasCustomerId ?? null,
      mpCustomerId: current?.mpCustomerId ?? null,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    };
    this.rows.set(tenantId, saved);
    return saved;
  }
}

// --------------------------------------------------------------------------------------------- documento

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;

function charValue(char: string): number {
  return char.charCodeAt(0) - 48;
}

function cpfIsValid(digits: string): boolean {
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  for (const length of [9, 10]) {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(digits[length])) return false;
  }
  return true;
}

function cnpjIsValid(value: string): boolean {
  if (!/^[0-9A-Z]{12}\d{2}$/.test(value) || /^(\d)\1{13}$/.test(value)) return false;
  for (const length of [12, 13]) {
    let sum = 0;
    let weight = length - 7;
    for (let index = 0; index < length; index += 1) {
      sum += charValue(value[index]!) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    const check = rest < 2 ? 0 : 11 - rest;
    if (check !== Number(value[length])) return false;
  }
  return true;
}

/** Normaliza (sem pontuação, maiúsculas) e valida; `null` para vazio; 422 `document_invalid` para inválido. */
export function normalizeDocument(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new BillingProfileError(422, "document_invalid", "document must be a CPF or CNPJ.");
  const value = raw.replace(/[.\-/\s]/g, "").toUpperCase();
  if (value === "") return null;
  const valid = value.length === CPF_LENGTH ? cpfIsValid(value) : value.length === CNPJ_LENGTH ? cnpjIsValid(value) : false;
  if (!valid) throw new BillingProfileError(422, "document_invalid", "document must be a valid CPF (11) or CNPJ (14).");
  return value;
}

// ------------------------------------------------------------------------------------------- validação

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UF = /^[A-Z]{2}$/;

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new BillingProfileError(400, "invalid_field", `${field} must be text.`);
  const text = value.trim();
  if (text.length > max) throw new BillingProfileError(400, "invalid_field", `${field} is too long.`);
  return text === "" ? null : text;
}

export function parseBillingProfileInput(body: Record<string, unknown>): BillingProfileInput {
  const address = body.address && typeof body.address === "object" ? (body.address as Record<string, unknown>) : {};
  const email = optionalText(body.email, "email", 254);
  if (email !== null && !EMAIL.test(email)) throw new BillingProfileError(400, "invalid_field", "email is invalid.");
  const postalRaw = optionalText(address.postalCode, "address.postalCode", 9);
  const postalCode = postalRaw === null ? null : postalRaw.replace(/\D/g, "");
  if (postalCode !== null && postalCode.length !== 8) throw new BillingProfileError(400, "invalid_field", "address.postalCode must have 8 digits.");
  const stateRaw = optionalText(address.state, "address.state", 2);
  const state = stateRaw === null ? null : stateRaw.toUpperCase();
  if (state !== null && !UF.test(state)) throw new BillingProfileError(400, "invalid_field", "address.state must be a 2-letter UF.");
  const cityIbge = optionalText(address.cityIbge, "address.cityIbge", 7);
  if (cityIbge !== null && !/^\d{7}$/.test(cityIbge)) throw new BillingProfileError(400, "invalid_field", "address.cityIbge must have 7 digits.");
  const method = body.paymentMethod ?? "undefined";
  if (typeof method !== "string" || !(BILLING_PAYMENT_METHODS as readonly string[]).includes(method)) {
    throw new BillingProfileError(400, "invalid_field", "paymentMethod is invalid.");
  }
  return {
    legalName: optionalText(body.legalName, "legalName", 200),
    document: normalizeDocument(body.document),
    email,
    address: {
      postalCode,
      street: optionalText(address.street, "address.street", 200),
      number: optionalText(address.number, "address.number", 20),
      district: optionalText(address.district, "address.district", 120),
      city: optionalText(address.city, "address.city", 120),
      cityIbge,
      state,
    },
    paymentMethod: method as BillingPaymentMethod,
  };
}

/** O que falta para cobrar. `cityIbge` é exigência fiscal por provedor (S12), checada na emissão, não aqui. */
export function missingFields(profile: BillingProfileInput | null): string[] {
  if (!profile) return ["legalName", "document", "email", "address.postalCode", "address.street", "address.number", "address.district", "address.city", "address.state", "paymentMethod"];
  const missing: string[] = [];
  if (!profile.legalName) missing.push("legalName");
  if (!profile.document) missing.push("document");
  if (!profile.email) missing.push("email");
  for (const key of ["postalCode", "street", "number", "district", "city", "state"] as const) {
    if (!profile.address[key]) missing.push(`address.${key}`);
  }
  if (profile.paymentMethod === "undefined") missing.push("paymentMethod");
  return missing;
}

export function toBillingProfileDto(tenantId: string, profile: TenantBillingProfile | null) {
  const missing = missingFields(profile);
  return {
    tenantId,
    legalName: profile?.legalName ?? null,
    document: profile?.document ?? null,
    email: profile?.email ?? null,
    address: profile?.address ?? { postalCode: null, street: null, number: null, district: null, city: null, cityIbge: null, state: null },
    paymentMethod: profile?.paymentMethod ?? "undefined",
    complete: missing.length === 0,
    missing,
    updatedAt: profile?.updatedAt.toISOString() ?? null,
  };
}
