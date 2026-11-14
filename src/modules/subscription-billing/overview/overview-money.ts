// B-ASS-09 · F1 — o dinheiro da visão de custo × assinatura (plano v2 §3 P1 e P13; §6 C1). Puro: sem banco, sem relógio.
//
// Regras do bloco (plano v2 §3):
//  - todo valor sai em BRL, CENTAVOS INTEIROS (`bigint`) no cálculo e string com 2 casas no JSON (`formatCents`);
//  - o custo original entra UMA vez em micro-unidades inteiras (`toMicro`, o mesmo do motor de rateio); a taxa entra como
//    string decimal de até 6 casas (`rateToMicro`). Nenhum `float` depois disso;
//  - arredondamento: metade para longe do zero (o resíduo do rateio tem sinal, e o arredondamento tem de ser simétrico);
//  - custo ausente falha fechado (P13): ninguém soma custo fora de `sumOrNull` nem converte fora de `costToBrlCents`.
//
// As expressões canônicas abaixo são o alvo das mutações literais do plano (§6, §C7 11(3)): não reescrever sem emenda.

export const MICRO = 1_000_000n;

/** `round(n / d)`, metade para longe do zero, em inteiros (`d > 0`). */
export function roundHalfAwayFromZero(n: bigint, d: bigint): bigint {
  const a = n < 0n ? -n : n; const q = a / d; const r = a % d; const rounded = r * 2n >= d ? q + 1n : q; return n < 0n ? -rounded : rounded;
}

/**
 * Custo em micro-unidades → centavos de real. Em real, só arredonda; em outra moeda, multiplica pela taxa
 * (`rateMicro`, micro-reais por unidade) e arredonda. **Sem taxa, `null`** — a taxa ausente nunca vira 1.
 */
export function costToBrlCents(costMicro: bigint, currency: string, rateMicro: bigint | null): bigint | null {
  if (currency === "BRL") return roundHalfAwayFromZero(costMicro, 10_000n);
  if (rateMicro === null) return null;
  return roundHalfAwayFromZero(costMicro * rateMicro, 10_000_000_000n);
}

/** Soma de custo que falha fechado (P13): um `null` basta para o total ser `null`. */
export function sumOrNull(xs: readonly (bigint | null)[]): bigint | null {
  if (xs.some((x) => x === null)) return null;
  return (xs as readonly bigint[]).reduce((a, x) => a + x, 0n);
}

/** Soma só de ASSINATURA: quem não tem assinatura não soma; `null` se ninguém tem. Nunca para custo. */
export function sumIgnoringNull(xs: readonly (bigint | null)[]): bigint | null {
  const present = xs.filter((x): x is bigint => x !== null);
  return present.length === 0 ? null : present.reduce((a, x) => a + x, 0n);
}

/** `a − b`, ou `null` se um dos dois for `null`. */
export function subOrNull(a: bigint | null, b: bigint | null): bigint | null {
  return a === null || b === null ? null : a - b;
}

/**
 * A ENTRADA do custo original (número do resumo do rateio, 6 casas) em micro-unidades inteiras: o mesmo `toMicro` do
 * motor de rateio. É o único ponto com ponto flutuante deste módulo.
 */
export function toMicro(value: number): bigint {
  if (!Number.isFinite(value)) throw new RangeError("cost_invalid: o custo do resumo do rateio não é um número finito.");
  return BigInt(Math.round(value * 1_000_000));
}

const RATE_PATTERN = /^(\d{1,12})(?:\.(\d{1,6}))?$/;

/**
 * Taxa decimal positiva (`"5.400000"`, até 6 casas) → micro-reais inteiros. Recusa expoente, sinal, vírgula e **zero**
 * (uma taxa zero zeraria o custo em silêncio; a M6 também a recusa, `CHECK (rate > 0)`).
 */
export function rateToMicro(rate: string): bigint {
  const match = RATE_PATTERN.exec(rate);
  if (!match) throw new RangeError("rate_invalid: a taxa tem de ser decimal com até 6 casas.");
  const whole = match[1]!;
  const fraction = (match[2] ?? "").padEnd(6, "0");
  const micro = BigInt(whole) * MICRO + BigInt(fraction);
  if (micro === 0n) throw new RangeError("rate_invalid: a taxa tem de ser positiva.");
  return micro;
}

function formatScaled(value: bigint, scale: bigint, decimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const fraction = (abs % scale).toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${abs / scale}.${fraction}`;
}

/** Centavos → `"1234.56"` (com sinal quando negativo). */
export function formatCents(cents: bigint): string {
  return formatScaled(cents, 100n, 2);
}

/** Centésimos de ponto percentual → `"46.00"`. */
export function formatHundredths(hundredths: bigint): string {
  return formatScaled(hundredths, 100n, 2);
}

/** Micro-unidades → `"100.000000"` (6 casas): o custo original e a taxa. */
export function formatMicro(micro: bigint): string {
  return formatScaled(micro, MICRO, 6);
}
