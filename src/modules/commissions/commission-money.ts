import { Prisma } from "@prisma/client";

// B-APP-ORG-2S (S2e; Emenda 1.8.3 §3 e 1.8.3.1 §5) — os centavos exatos da comissão, do banco até a tela.
//
// A coluna `commission_calculations.amount` é `Decimal(20,6)`. O `amount` em número das respostas passa por `double`
// (`decimalToNumber`) e erra o meio centavo (`10.075000` viraria `R$ 10,07`). Aqui a regra é UMA, num lugar só:
// arredonda meio centavo para cima no decimal exato (`ROUND_HALF_UP`) e devolve os centavos como TEXTO de dígitos,
// sem passar por `number` em ponto nenhum. `10.075000` → `"1008"`; `99999999999999.995000` → `"10000000000000000"`.
// O app lê só esse texto e só formata; ele não soma, não arredonda e não usa `double`.

/** Centavos de um valor da comissão, em texto inteiro, arredondados uma vez no decimal exato. Nulo vale zero. */
export function commissionCents(value: Prisma.Decimal | null): string {
  return (value ?? new Prisma.Decimal(0)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).times(100).toFixed(0);
}

/** Centavos da soma EXATA dos valores (arredonda uma vez, no fim; nunca soma centavos já arredondados). */
export function commissionCentsOfSum(values: readonly (Prisma.Decimal | null)[]): string {
  return commissionCents(values.reduce<Prisma.Decimal>((sum, value) => sum.plus(value ?? 0), new Prisma.Decimal(0)));
}
