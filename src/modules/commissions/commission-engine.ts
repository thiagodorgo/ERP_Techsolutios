import type { CommissionJsonRecord } from "./commission.types.js";

// B-COMISSAO-MOTOR — motor puro: conta em centavos inteiros (BigInt, um arredondamento meio para cima),
// escolha da regra vigente na conclusão da OS, retrato fechado da conta e guardas do espaço reservado.

export const COMMISSION_ENGINE_VERSION = 1;
export const ENGINE_POLICY_SCOPE = "engine";
export const ENGINE_POLICY_VERTICAL = "field_services";

/**
 * A chave canônica do evento-base do motor para uma OS (Emenda 1 §E1.3): `engine:wo:<id da OS>:v<n>`. O passo 1
 * (nascer) usa a versão 1; a lista de candidatas exclui a OS que já tem o evento desta chave (plano §3.4).
 */
export function engineWorkOrderEventKey(workOrderId: string, version: number): string {
  return `engine:wo:${workOrderId}:v${version}`;
}

export function parseEngineWorkOrderEventVersion(idempotencyKey: string): number {
  const match = /:v(\d+)$/.exec(idempotencyKey.trim());
  const parsed = match ? Number.parseInt(match[1]!, 10) : 1;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export type EngineRateType = "percent" | "fixed";
export type EngineRuleType = "engine_payee" | "engine_service" | "engine_default";

export type EngineRuleCandidate = {
  readonly id: string;
  readonly ruleType: string;
  readonly basisType: string;
  readonly rateType: string;
  readonly rateValue: string | number;
  readonly active: boolean;
  readonly conditions: CommissionJsonRecord;
};

export type MatchedEngineRule = {
  readonly id: string;
  readonly ruleType: EngineRuleType;
  readonly rateType: EngineRateType;
  readonly rateValueText: string;
};

export type ResolveEngineRuleResult =
  | { readonly status: "matched"; readonly rule: MatchedEngineRule }
  | { readonly status: "no_rule"; readonly rule: null }
  | { readonly status: "ambiguous_rule"; readonly rule: null };

/**
 * Converte texto decimal não-negativo (com até `scale` casas) para inteiro escalado (`BigInt`),
 * sem passar por ponto flutuante (`Number`).
 */
export function parseScaledDecimalToBigInt(text: string, scale: number): bigint {
  const trimmed = text.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid decimal text: ${text}`);
  }
  const intPart = match[1]!;
  const fracRaw = match[2] ?? "";
  if (fracRaw.length > scale) {
    // Arredondar se vier do banco (ex.: Decimal(20,6) com zeros finais)
    const extra = fracRaw.slice(scale);
    if (!/^0+$/.test(extra)) {
      throw new Error(`Decimal text exceeds scale ${scale}: ${text}`);
    }
  }
  const fracPadded = fracRaw.slice(0, scale).padEnd(scale, "0");
  return BigInt(intPart) * 10n ** BigInt(scale) + BigInt(fracPadded || "0");
}

/** Converte texto decimal em reais (2 casas) para centavos inteiros (`BigInt`). */
export function decimalTextToCents(text: string): bigint {
  return parseScaledDecimalToBigInt(text, 2);
}

/** Formata centavos inteiros (`BigInt`) como texto decimal com 2 casas para persistência no banco (`Decimal(20,6)`). */
export function centsToDecimalString(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const intPart = abs / 100n;
  const fracPart = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${intPart.toString()}.${fracPart}`;
}

export function computeCommissionCents(input: {
  readonly baseCents: bigint;
  readonly rateType: EngineRateType;
  readonly rateValueText: string;
}): bigint {
  if (input.rateType === "fixed") {
    // B-COMISSAO:fixo-sem-base
    return decimalTextToCents(normalizeRateValueText("fixed", input.rateValueText));
  }
  // Percentual: taxa em décimos de milésimo (scale = 4; 100% = 1_000_000)
  // B-COMISSAO:conta-inteira
  const rateScaled = parseScaledDecimalToBigInt(normalizeRateValueText("percent", input.rateValueText), 4);
  if (input.baseCents <= 0n || rateScaled <= 0n) {
    return 0n;
  }
  const numerator = input.baseCents * rateScaled;
  // B-COMISSAO:arredonda
  return (numerator + 500_000n) / 1_000_000n;
}

export function normalizeRateValueText(rateType: EngineRateType, raw: string | number): string {
  const text = typeof raw === "number" ? raw.toString() : String(raw).trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return "0";
  const intPart = BigInt(match[1]!).toString();
  const fracRaw = (match[2] ?? "").replace(/0+$/, "");
  if (rateType === "fixed") {
    const frac2 = (match[2] ?? "").slice(0, 2).padEnd(2, "0");
    return `${intPart}.${frac2}`;
  }
  return fracRaw.length > 0 ? `${intPart}.${fracRaw.slice(0, 4)}` : intPart;
}

export function resolveEffectiveEngineRule(
  rules: readonly EngineRuleCandidate[],
  context: {
    readonly payeeUserId: string;
    readonly serviceCatalogId: string | null | undefined;
    readonly completedAt: Date;
  },
): ResolveEngineRuleResult {
  const validRules = rules.filter((rule) => isRecognizedEngineRule(rule) && isRuleEffectiveAt(rule, context.completedAt));

  // B-COMISSAO:precedencia
  const tiers: readonly EngineRuleType[] = ["engine_payee", "engine_service", "engine_default"];

  for (const tier of tiers) {
    const matching = validRules.filter((rule) => {
      if (rule.ruleType !== tier) return false;
      if (tier === "engine_payee") {
        return rule.conditions.payeeUserId === context.payeeUserId;
      }
      if (tier === "engine_service") {
        return Boolean(context.serviceCatalogId) && rule.conditions.serviceCatalogId === context.serviceCatalogId;
      }
      return true;
    });

    if (matching.length > 1) {
      // B-COMISSAO:ambigua-nao-paga
      return { status: "ambiguous_rule", rule: null };
    }
    if (matching.length === 1) {
      const winner = matching[0]!;
      const rateType = winner.rateType as EngineRateType;
      return {
        status: "matched",
        rule: {
          id: winner.id,
          ruleType: tier,
          rateType,
          rateValueText: normalizeRateValueText(rateType, winner.rateValue),
        },
      };
    }
  }

  return { status: "no_rule", rule: null };
}

function isRecognizedEngineRule(rule: EngineRuleCandidate): boolean {
  if (rule.ruleType !== "engine_payee" && rule.ruleType !== "engine_service" && rule.ruleType !== "engine_default") {
    return false;
  }
  if (rule.basisType !== "work_order_total") {
    return false;
  }
  if (rule.rateType !== "percent" && rule.rateType !== "fixed") {
    return false;
  }
  return true;
}

function isRuleEffectiveAt(rule: EngineRuleCandidate, completedAt: Date): boolean {
  // B-COMISSAO:vigencia
  const targetMs = completedAt.getTime();
  const fromRaw = rule.conditions.effectiveFrom;
  const toRaw = rule.conditions.effectiveTo;

  if (typeof fromRaw === "string" && fromRaw.trim().length > 0) {
    const fromMs = new Date(fromRaw).getTime();
    if (Number.isNaN(fromMs) || targetMs < fromMs) return false;
  }
  if (typeof toRaw === "string" && toRaw.trim().length > 0) {
    const toMs = new Date(toRaw).getTime();
    if (Number.isNaN(toMs) || targetMs >= toMs) return false;
  } else if (toRaw !== null && toRaw !== undefined) {
    return false;
  } else if (!rule.active) {
    // Sem effectiveTo explícito mas inativa -> não está vigente
    return false;
  }
  return true;
}

export function buildCommissionSnapshot(input: {
  readonly outcome: "calculated" | "no_rule";
  readonly workOrderId: string;
  readonly workOrderCode: string;
  readonly serviceCatalogId: string | null;
  readonly baseCents: bigint;
  readonly itemCount: number;
  readonly rule: MatchedEngineRule | null;
  readonly amountCents: bigint;
  readonly computedAt: Date;
}): CommissionJsonRecord {
  return {
    engineVersion: COMMISSION_ENGINE_VERSION,
    outcome: input.outcome,
    workOrderId: input.workOrderId,
    workOrderCode: input.workOrderCode,
    serviceCatalogId: input.serviceCatalogId,
    baseCents: Number(input.baseCents),
    itemCount: input.itemCount,
    ruleId: input.rule?.id ?? null,
    ruleType: input.rule?.ruleType ?? null,
    rateType: input.rule?.rateType ?? null,
    rateValue: input.rule?.rateValueText ?? null,
    amountCents: Number(input.amountCents),
    rounding: "half_up",
    computedAt: input.computedAt.toISOString(),
  };
}

export function isReservedPolicyInput(input: {
  readonly scope: string;
  readonly rules: readonly { readonly ruleType: string }[];
}): boolean {
  // B-COMISSAO:reservado-rota-antiga
  if (input.scope.trim().toLowerCase() === "engine") {
    return true;
  }
  return input.rules.some((rule) => rule.ruleType.trim().toLowerCase().startsWith("engine_"));
}

export function isReservedBasisEventInput(input: {
  readonly idempotencyKey: string;
  readonly sourceEventName: string;
}): boolean {
  const key = input.idempotencyKey.trim().toLowerCase();
  const eventName = input.sourceEventName.trim().toLowerCase();
  return key.startsWith("engine:") || eventName.startsWith("engine.");
}

// B-COMISSAO:fuso-sp — M19: fuso de negócio para corte de mês ("pago no mês", competência e filtro month=YYYY-MM).
export const COMMISSION_BUSINESS_TIMEZONE = "America/Sao_Paulo";

export function toCommissionBusinessMonth(date: Date, timeZone: string = COMMISSION_BUSINESS_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}-${month}`;
}

export function buildRecentBusinessMonths(referenceDate: Date, count: number, timeZone: string = COMMISSION_BUSINESS_TIMEZONE): string[] {
  const refYm = toCommissionBusinessMonth(referenceDate, timeZone);
  const [yStr, mStr] = refYm.split("-");
  let year = Number(yStr);
  let month = Number(mStr);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.unshift(`${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

export function getBusinessMonthUtcRange(
  yearMonth: string,
  timeZone: string = COMMISSION_BUSINESS_TIMEZONE,
): { readonly start: Date; readonly endExclusive: Date } {
  const [yStr, mStr] = yearMonth.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  // America/Sao_Paulo = UTC-03:00 (03:00 UTC do dia 1º); UTC = 00:00 UTC do dia 1º.
  const offsetHours = timeZone === "America/Sao_Paulo" ? 3 : 0;
  const start = new Date(Date.UTC(year, month - 1, 1, offsetHours, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(nextYear, nextMonth - 1, 1, offsetHours, 0, 0, 0));
  return { start, endExclusive };
}
