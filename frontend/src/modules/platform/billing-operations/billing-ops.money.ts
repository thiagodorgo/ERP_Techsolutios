// B-ASS-10c-OPERACAO · R-VALOR e R-T5-DIN — o ÚNICO arquivo do módulo que toca dinheiro. Duas coisas, e só elas:
//  1. FORMATAR o texto decimal que o servidor manda ("1234.56" → "R$ 1.234,56"), sem passar por número;
//  2. CONVERTER o texto que o operador DIGITA ("1.234,56", "1234,56" ou "1234.56") no texto decimal que o servidor grava
//     ("1234.56"), sem `Number`/`parseFloat` (só texto). Nenhuma soma, subtração, multiplicação nem arredondamento: o novo
//     saldo, o total e o pago são SEMPRE os que o servidor devolve na releitura.
// Fora deste arquivo, a trava `ass-10c-nao-calcula.guard.test.ts` (a T-DIN-P do T5, parametrizada para este módulo)
// proíbe conta, conversão, formatação e marca forjada.

export type Money = string & { readonly __brand: "money" };

const DECIMAL = /^-?\d+(\.\d+)?$/;

/** A única porta que marca dinheiro: string decimal do servidor. Número, vazio ou lixo → `null` ("—", nunca "0"). */
export function asMoney(raw: unknown): Money | null {
  return typeof raw === "string" && DECIMAL.test(raw) ? (raw as Money) : null;
}

/** O valor tem algum dígito diferente de zero? (Compara o TEXTO; não é conta.) `null` é "não sei", e responde `false`. */
export function hasValue(value: Money | null): boolean {
  return value !== null && /[1-9]/.test(value);
}

/** O sinal de menos da referência é o U+2212 ("−R$ 100,00"), não o hífen. */
const MINUS = "−";

/**
 * Formata o texto decimal do servidor em reais: separador de milhar por ponto e centavos por vírgula, sem converter em
 * número (a maquete aprovada, `din`). Ausência é "—".
 */
export function formatBRL(value: Money | null): string {
  if (value === null) return "—";
  const negative = value.startsWith("-");
  const digits = negative ? value.slice(1) : value;
  const [integer = "0", fraction = ""] = digits.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cents = `${fraction}00`.slice(0, 2);
  return `${negative ? MINUS : ""}R$ ${grouped},${cents}`;
}

export type TypedAmount = { readonly ok: true; readonly value: Money } | { readonly ok: false; readonly message: string };

/**
 * O valor DIGITADO na baixa manual → o texto decimal que vai no corpo (`amount: "1234.56"`). Só texto, nunca número:
 *  - "1.234,56" (milhar com ponto, centavos com vírgula) → "1234.56";
 *  - "1234,56" → "1234.56";
 *  - "1234.56" ou "1234" → "1234.56" / "1234.00";
 *  - negativo, zero, mais de 2 casas ("1,234": ambíguo), letras e vazio → erro no campo (e a janela não envia).
 */
export function typedAmountToDecimal(raw: string): TypedAmount {
  const text = raw.trim();
  if (!text) return { ok: false, message: "Digite o valor recebido." };
  // A ordem dos 3 formatos importa só para as mutações literais do plano (M2 a M4 ancoram a 1ª ocorrência): o formato
  // "1234,56" vem primeiro. O sinal nunca casa com nenhum dos 3 (todos começam por dígito).
  let normalized: string;
  if (/^\d+,\d{1,2}$/.test(text)) normalized = text.replace(",", ".");
  else if (/^[0-9]{1,3}(\.[0-9]{3})+,[0-9]{1,2}$/.test(text)) normalized = text.replace(/\./g, "").replace(/,/, ".");
  else if (/^[0-9]+(\.[0-9]{1,2})?$/.test(text)) normalized = text;
  else if (text.startsWith("-")) return { ok: false, message: "O valor não pode ser negativo." };
  else if (/[,.][0-9]{3,}$/.test(text)) return { ok: false, message: "Valor ambíguo: use vírgula para os centavos, com no máximo 2 casas (ex.: 1.234,56)." };
  else return { ok: false, message: "Valor inválido. Use o formato 1.234,56." };
  const [integerPart = "0", fractionPart = ""] = normalized.split(".");
  const integer = integerPart.replace(/^0+(?=\d)/, "");
  const fraction = `${fractionPart}00`.slice(0, 2);
  if (/^0+$/.test(integer) && /^0+$/.test(fraction)) return { ok: false, message: "O valor precisa ser maior que zero." };
  return { ok: true, value: `${integer}.${fraction}` as Money };
}
