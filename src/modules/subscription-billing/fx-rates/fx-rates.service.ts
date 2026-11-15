// B-ASS-09 (F5) — serviço do câmbio do mês da plataforma. Valida a entrada (P10 e R-FX-6 do plano), acrescenta a versão
// nova e devolve a vigente com o histórico. Nunca converte valor e nunca busca taxa fora (câmbio automático é serviço
// externo, PROIBIDO neste bloco): a taxa é digitada pela plataforma, por mês (Q3, padrão sem resposta).
//
// Erros no molde do módulo (`SubscriptionBillingError`, mapeado pela rota): 400 `invalid_month`; 422 `rate_invalid`,
// `currency_pair_unsupported`, `fx_month_in_future`, `range_too_large`. A trilha de plataforma e o `400 invalid_json` são
// da rota (F6).

import { deriveCompetencia } from "../../../config/business-time.js";
import { SubscriptionBillingError } from "../plans/plan-types.js";
import type { FxRate, FxRatesRepository } from "./fx-rates.repository.js";

export const FX_TARGET_CURRENCY = "BRL";
export const FX_RANGE_MAX_MONTHS = 24;

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
// Taxa: até 3 dígitos inteiros (menor que 1000) e até 6 casas decimais; nada de sinal, expoente ou separador de milhar.
const RATE_PATTERN = /^\d{1,3}(\.\d{1,6})?$/;

export type PutFxRateInput = {
  readonly currencyFrom: string;
  readonly currencyTo?: string;
  readonly rate: string;
  readonly actorId: string | null;
};

export type FxRateWithHistory = {
  readonly current: FxRate;
  readonly history: readonly FxRate[];
};

export type FxRateHistoryItem = { readonly rate: string; readonly version: number; readonly createdAt: Date };

export type FxRateMonthView = {
  readonly month: string;
  readonly currencyFrom: string;
  readonly currencyTo: string;
  readonly rate: string;
  readonly version: number;
  readonly createdAt: Date;
  readonly history: readonly FxRateHistoryItem[];
};

export class FxRatesService {
  constructor(
    private readonly repository: FxRatesRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** `PUT /fx-rates/:month`: acrescenta a versão seguinte do par no mês e devolve a vigente com o histórico. */
  async putRate(month: string, input: PutFxRateInput): Promise<FxRateWithHistory> {
    assertMonth(month);
    const currencyFrom = input.currencyFrom;
    const currencyTo = input.currencyTo ?? FX_TARGET_CURRENCY;
    assertCurrencyPair(currencyFrom, currencyTo);
    const rate = normalizeRate(input.rate);
    if (month > deriveCompetencia(this.clock())) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "fx_month_in_future",
        "A taxa de câmbio só pode ser cadastrada para o mês corrente ou para mês passado.",
      );
    }
    await this.repository.appendVersion({ month, currencyFrom, currencyTo, rate, createdBy: uuidOrNull(input.actorId) });
    const history = await this.repository.listVersions({ month, currencyFrom, currencyTo });
    return { current: history[0]!, history };
  }

  /** A taxa vigente (maior versão) do par no mês, ou `null`. Taxa ausente nunca vira 1: quem converte decide (P2). */
  async currentRate(month: string, currencyFrom: string, currencyTo: string = FX_TARGET_CURRENCY): Promise<FxRate | null> {
    assertMonth(month);
    const versions = await this.repository.listVersions({ month, currencyFrom, currencyTo });
    return versions[0] ?? null;
  }

  /** `GET /fx-rates?from&to`: um item por mês e par, com a vigente e o histórico (até 24 meses). */
  async listRates(fromMonth: string, toMonth: string): Promise<FxRateMonthView[]> {
    assertMonth(fromMonth);
    assertMonth(toMonth);
    if (fromMonth > toMonth) {
      throw invalidMonth();
    }
    if (monthsBetweenInclusive(fromMonth, toMonth) > FX_RANGE_MAX_MONTHS) {
      throw new SubscriptionBillingError(
        422,
        "SUBSCRIPTION_BILLING_INVALID",
        "range_too_large",
        `O período pedido passa de ${FX_RANGE_MAX_MONTHS} meses.`,
      );
    }
    const rows = await this.repository.listRange(fromMonth, toMonth);
    const views: Array<FxRateMonthView & { history: FxRateHistoryItem[] }> = [];
    for (const row of rows) {
      const last = views[views.length - 1];
      if (last && last.month === row.month && last.currencyFrom === row.currencyFrom && last.currencyTo === row.currencyTo) {
        last.history.push(historyItem(row));
        continue;
      }
      views.push({
        month: row.month,
        currencyFrom: row.currencyFrom,
        currencyTo: row.currencyTo,
        rate: row.rate,
        version: row.version,
        createdAt: row.createdAt,
        history: [historyItem(row)],
      });
    }
    return views;
  }
}

/** Taxa válida → string com exatamente 6 casas (`"5.4"` → `"5.400000"`); senão 422 `rate_invalid`. */
export function normalizeRate(raw: string): string {
  if (typeof raw !== "string" || !RATE_PATTERN.test(raw)) {
    throw rateInvalid();
  }
  const [integerPart, fraction = ""] = raw.split(".");
  const normalized = `${BigInt(integerPart!).toString()}.${fraction.padEnd(6, "0")}`;
  if (!/[1-9]/.test(normalized)) {
    throw rateInvalid();
  }
  return normalized;
}

function assertMonth(month: string): void {
  if (typeof month !== "string" || !MONTH_PATTERN.test(month)) {
    throw invalidMonth();
  }
}

function assertCurrencyPair(currencyFrom: string, currencyTo: string): void {
  if (
    typeof currencyFrom !== "string" ||
    typeof currencyTo !== "string" ||
    !CURRENCY_PATTERN.test(currencyFrom) ||
    currencyTo !== FX_TARGET_CURRENCY ||
    currencyFrom === currencyTo
  ) {
    throw new SubscriptionBillingError(
      422,
      "SUBSCRIPTION_BILLING_INVALID",
      "currency_pair_unsupported",
      "Só a conversão de uma moeda estrangeira (3 letras maiúsculas) para BRL é aceita.",
    );
  }
}

function monthsBetweenInclusive(fromMonth: string, toMonth: string): number {
  const [fromYear, fromM] = fromMonth.split("-").map(Number) as [number, number];
  const [toYear, toM] = toMonth.split("-").map(Number) as [number, number];
  return (toYear - fromYear) * 12 + (toM - fromM) + 1;
}

function historyItem(row: FxRate): FxRateHistoryItem {
  return { rate: row.rate, version: row.version, createdAt: row.createdAt };
}

function invalidMonth(): SubscriptionBillingError {
  return new SubscriptionBillingError(400, "SUBSCRIPTION_BILLING_INVALID", "invalid_month", "Mês inválido: use AAAA-MM.");
}

function rateInvalid(): SubscriptionBillingError {
  return new SubscriptionBillingError(
    422,
    "SUBSCRIPTION_BILLING_INVALID",
    "rate_invalid",
    "Taxa inválida: decimal maior que zero e menor que 1000, com até 6 casas.",
  );
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A coluna `created_by` é `uuid`: ator que não é UUID (ator de teste em memória) grava `NULL`, como no demonstrativo. */
function uuidOrNull(value: string | null): string | null {
  return value !== null && UUID_PATTERN.test(value) ? value : null;
}
