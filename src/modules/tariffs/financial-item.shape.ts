// Ω3F-3a (C3, junta J-Ω3F-0) — shape monetário COMPARTILHADO entre ServiceQuote (orçamento) e
// WorkOrderFinancialItem (Financeiro da OS). Helpers PUROS extraídos de
// src/modules/service-quotes/service-quote.validators.ts, parametrizados por error-factory porque
// as classes de erro são por módulo (ServiceQuoteError × WorkOrderFinancialError). Reasons,
// mensagens e status são preservados 1:1 — a suíte de service-quotes prova a paridade.

// Teto do Decimal(12,2): 9.999.999.999,99. Preço e total precisam caber (A3 do crítico).
export const MONEY_MAX = 9999999999.99;

export type FinancialItemErrorFactory = {
  // 400 do módulo consumidor (ex.: SERVICE_QUOTE_INVALID / WORK_ORDER_FINANCIAL_INVALID).
  invalid(reason: string, message: string): Error;
  // 422 do módulo consumidor (ex.: SERVICE_QUOTE_UNPROCESSABLE / WORK_ORDER_FINANCIAL_UNPROCESSABLE).
  unprocessable(reason: string, message: string): Error;
};

export type FinancialItemParserOptions = {
  // Reason do estouro do Decimal(12,2): "quote_total_overflow" (orçamento) ou
  // "financial_total_overflow" (Financeiro da OS). As classes de erro variam por módulo,
  // e este reason também — por isso é parâmetro, não constante.
  readonly overflowReason: string;
};

function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

// A1 (crítico) — arredondamento monetário meio-para-cima em 2 casas, aplicado a AMBOS os seams
// (cópia da Tarifa e preço manual) no momento do congelamento. A Tarifa InMemory não arredonda
// (`tariff.validators.parseUnitPrice`) enquanto a Prisma já entrega Decimal(12,2); sem este helper
// no ponto de congelamento, InMemory (10.999) e Prisma (11.00) divergiriam.
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function createFinancialItemParsers(errors: FinancialItemErrorFactory, options: FinancialItemParserOptions) {
  // A3 (crítico) — garante que o valor cabe em Decimal(12,2); acima do teto seria 500 (numeric
  // overflow no Postgres). Rejeita como erro de negócio (422) antes de tocar o banco.
  function assertMoneyInRange(value: number, field: string): number {
    if (!Number.isFinite(value) || value < 0) {
      throw errors.invalid(`invalid_${field}`, `${field} must be a number greater than or equal to zero.`);
    }
    if (value > MONEY_MAX) {
      throw errors.unprocessable(options.overflowReason, `${field} exceeds the maximum monetary value (${MONEY_MAX}).`);
    }
    return value;
  }

  function parseUnitPrice(value: unknown): number {
    if (value === undefined || value === null || value === "") {
      throw errors.invalid("required_unit_price", "unitPrice is required for a manual price source.");
    }
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw errors.invalid("invalid_unit_price", "unitPrice must be a number greater than or equal to zero.");
    }
    return parsed;
  }

  // A4 (crítico) — quantidade estritamente positiva (rejeita 0 e negativo). Default 1 quando
  // ausente. qty≤0 é 400 invalid_quantity (precedente do orçamento — NÃO 422).
  function parseQuantity(value: unknown): number {
    if (value === undefined || value === null || value === "") return 1;
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw errors.invalid("invalid_quantity", "quantity must be a number greater than zero.");
    }
    return roundMoney(parsed);
  }

  function parsePriceSource(value: unknown): "tariff" | "manual" {
    const normalized = optionalString(value);
    if (normalized === undefined) return "tariff";
    if (normalized !== "tariff" && normalized !== "manual") {
      throw errors.invalid("invalid_price_source", "priceSource must be 'tariff' or 'manual'.");
    }
    return normalized;
  }

  function parseCurrency(value: unknown): string {
    const normalized = optionalString(value);
    if (normalized === undefined) return "BRL";
    if (!/^[A-Za-z]{3}$/.test(normalized)) {
      throw errors.invalid("invalid_currency", "currency must be a 3-letter ISO code.");
    }
    return normalized.toUpperCase();
  }

  return { roundMoney, assertMoneyInRange, parseUnitPrice, parseQuantity, parsePriceSource, parseCurrency };
}

export type FinancialItemParsers = ReturnType<typeof createFinancialItemParsers>;
