// B-ASS-10b (T5) · R-T5-DIN (plano v2 §6.2) — o ÚNICO arquivo do módulo que toca dinheiro como número.
// Dinheiro, percentual e taxa são STRINGS marcadas (`Money`, `Pct`, `Rate`), como o servidor as manda (decimal com 2 casas
// no dinheiro e no percentual, 6 na taxa e no original). O único número que sai daqui é `Geometry`, e só serve para
// desenhar (barra, ponto, degrau), dentro de um componente de `frontend/src/components/**`. Fora deste arquivo, a trava
// `ass-10b-nao-calcula.guard.test.ts` (T-DIN-P) proíbe conta, conversão, formatação e marca forjada.
// Referência executada pelo plano: `planos/plano-B-ASS-10b-T5-v2-ref-ref-money.ts.txt` (as funções dela estão aqui intactas).

export type Money = string & { readonly __brand: "money" };
export type Pct = string & { readonly __brand: "pct" };
export type Rate = string & { readonly __brand: "rate" };
export type Geometry = number & { readonly __brand: "geometry" };

const DECIMAL = /^-?\d+(\.\d+)?$/;

/** A única porta que marca dinheiro: string decimal do servidor. Número, vazio ou lixo → `null` (nunca "0"). */
export function asMoney(raw: unknown): Money | null {
  return typeof raw === "string" && DECIMAL.test(raw) ? (raw as Money) : null;
}
export function asPct(raw: unknown): Pct | null {
  return typeof raw === "string" && DECIMAL.test(raw) ? (raw as Pct) : null;
}
/** A taxa do dólar do mês (`"5.412300"`), como o servidor a devolve. */
export function asRate(raw: unknown): Rate | null {
  return typeof raw === "string" && DECIMAL.test(raw) ? (raw as Rate) : null;
}

/**
 * O valor na moeda ORIGINAL das rotas antigas do rateio (`tenant-allocations.allocatedCost`, número). Não é conta: é a
 * passagem do número do servidor para a string com 6 casas, na entrada, para a tela só formatar. Não finito → `null`.
 */
export function originalAmountOf(raw: unknown): Money | null {
  return typeof raw === "number" && Number.isFinite(raw) ? (raw.toFixed(6) as Money) : asMoney(raw);
}

/** O ÚNICO lugar que converte dinheiro em número, e só para barra, ponto e degrau. */
export function geometryNumber(value: Money | Pct | Rate | null): Geometry | null {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? (n as Geometry) : null;
}

/** Ordenar não é conta de exibição: compara, nunca devolve o valor. `null` vai para o fim. */
export function compareMoney(a: Money | Pct | null, b: Money | Pct | null): number {
  const x = geometryNumber(a);
  const y = geometryNumber(b);
  if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
  return x < y ? -1 : x > y ? 1 : 0;
}

/** O valor é negativo? Compara o texto com zero (sem conta); serve para a cor da margem. */
export function isNegative(value: Money | Pct | null): boolean {
  return value !== null && value.startsWith("-") && /[1-9]/.test(value);
}

/** Faixa de margem da B (negativa, 0 a 20 %, 20 a 50 %, acima de 50 %). Comparar com a faixa não é conta (L7). */
export type MarginBand = "neg" | "0" | "20" | "50";
export function marginBandOf(pct: Pct | null): MarginBand | null {
  const n = geometryNumber(pct);
  if (n === null) return null;
  if (n < 0) return "neg";
  if (n < 20) return "0";
  if (n < 50) return "20";
  return "50";
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
/** Formata a STRING decimal (`format` aceita string, sem passar por `Number`); ausência é "—". */
export function formatBRL(value: Money | null): string {
  return value === null ? "—" : BRL.format(value as unknown as number);
}
const BRL_COMPACT = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
/** "R$ 15,7 mil" — a forma curta da maquete (`Rk`), só formatação da string do servidor. */
export function formatBRLCompact(value: Money | null): string {
  return value === null ? "—" : BRL_COMPACT.format(value as unknown as number);
}
const USD = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" });
export function formatUSD(value: Money | null): string {
  return value === null ? "—" : USD.format(value as unknown as number);
}
/** Valor na moeda original do arquivo de custo (`"USD"` → "US$ …"). Moeda ausente ou estranha → "—" (nunca BRL). */
export function formatOriginal(value: Money | null, currency: string | null): string {
  if (value === null || !currency || !/^[A-Z]{3}$/.test(currency)) return "—";
  if (currency === "USD") return formatUSD(value);
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value as unknown as number);
  } catch {
    return "—";
  }
}
const PCT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export function formatPct(value: Pct | null): string {
  return value === null ? "—" : `${PCT.format(value as unknown as number)} %`;
}
const RATE4 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const RATE6 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
/** A taxa com 4 casas (cabeçalho) ou 6 (histórico e eco da janela). */
export function formatRate(value: Rate | null, digits: 4 | 6 = 6): string {
  if (value === null) return "—";
  return (digits === 4 ? RATE4 : RATE6).format(value as unknown as number);
}
const COUNT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
/** Contagem (linhas do arquivo, organizações): número inteiro, separador de milhar pt-BR. */
export function formatCount(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : COUNT.format(value);
}

// ---- A2: a taxa do dólar digitada em pt-BR ---------------------------------------------------------------------
// O servidor aceita /^\d{1,3}(\.\d{1,6})?$/ (fx-rates.service.ts:19): recusa "5,41" e ACEITA "541".
// Regra: até 3 dígitos inteiros; UM separador decimal opcional, vírgula ou ponto (abaixo de 1000 não existe
// separador de milhar); até 6 casas. O separador é TROCADO por ponto, nunca retirado. Nada de sinal, espaço no
// meio, expoente ou segundo separador. Zero é recusado.
const RATE_INPUT = /^(\d{1,3})(?:[.,](\d{1,6}))?$/;
export type ParsedRate = { readonly ok: true; readonly rate: string } | { readonly ok: false; readonly reason: "formato" | "zero" };
export function parseRatePtBr(text: string): ParsedRate {
  const match = RATE_INPUT.exec(text.trim());
  if (!match) return { ok: false, reason: "formato" };
  const rate = match[2] === undefined ? match[1]! : `${match[1]}.${match[2]}`;
  if (/^0+(\.0+)?$/.test(rate)) return { ok: false, reason: "zero" };
  return { ok: true, rate };
}

/** O eco antes de salvar: "5.41" → "5,410000" (a string que vai no corpo, com 6 casas; sem conta). */
export function rateEcho(rate: string): string {
  const [whole = "", fraction = ""] = rate.split(".");
  return `${whole},${fraction.padEnd(6, "0")}`;
}

/** Pós-condição: a taxa que o servidor gravou é a que foi enviada (compara texto, completando zeros; sem conta). */
export function sameRate(sent: string, stored: string): boolean {
  const pad = (value: string) => {
    const [whole = "", fraction = ""] = value.split(".");
    return `${whole.replace(/^0+(?=\d)/, "")}.${fraction.padEnd(6, "0")}`;
  };
  return pad(sent) === pad(stored);
}
