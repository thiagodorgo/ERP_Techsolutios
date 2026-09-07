// -----------------------------------------------------------------------------------------------
// B-O6R-06 · Ω6R-DIN-007 — a fixture que torna o defeito VISÍVEL.
//
// DUAS propriedades a fixture precisa ter, e as duas vêm do achado:
//
//  1. MAIS DE 10.000 LINHAS. O resumo cravava `limit: 10_000` e o repositório aplicava `take` com
//     `orderBy billing_period_start ASC` — então a linha CORTADA é a MAIS RECENTE. A 10.001ª carrega
//     `serviceCode` exclusivo e o período mais novo: se ela não aparecer no total nem em `services[]`,
//     o truncamento voltou.
//
//  2. VALORES NA FAIXA REALISTA (~9,9e5 com 6 casas), não centavos. É o que o crítico mediu: com
//     10.001 linhas nessa faixa, somar em `double` diverge do `SUM(numeric)` em 1,1e-3 — mil vezes a
//     tolerância que o plano original propunha — e o total (~9,9e9 com 6 casas) já NÃO CABE exato num
//     `number` de JS. Uma fixture de centavos deixaria o segundo defeito do DIN-007 invisível.
//
// A referência de conferência é sempre em MICRO-UNIDADES INTEIRAS (`BigInt`), nunca em float: uma
// referência somada em `double` teria o mesmo erro que se pretende detectar.
// -----------------------------------------------------------------------------------------------

/** Valor de cada uma das 10.000 primeiras linhas, em micro-unidades. */
export const O6R06_LINHA_COMUM_MICROS = 990_000_000_001n;

/** Valor da 10.001ª — a que o `take` de hoje corta. */
export const O6R06_LINHA_CORTADA_MICROS = 999_999_000_001n;

export const O6R06_SERVICO_COMUM = "AmazonEC2";
export const O6R06_SERVICO_DA_CORTADA = "AmazonUltimaLinha";
export const O6R06_MOEDA = "USD";

export type O6r06CostFixture = {
  readonly linhasComuns: number;
  readonly totalMicros: bigint;
  readonly periodStart: Date;
  readonly periodEnd: Date;
};

/** Micro-unidades → string decimal de 6 casas, no formato do `numeric(20,6)` do Postgres. */
export function microsParaDecimal(micros: bigint): string {
  const negativo = micros < 0n;
  const absoluto = negativo ? -micros : micros;

  return `${negativo ? "-" : ""}${absoluto / 1_000_000n}.${(absoluto % 1_000_000n).toString().padStart(6, "0")}`;
}

/** Micro-unidades → `number` (LOSSY acima de 2^53 micro-unidades — é justamente o que S10 mede). */
export function microsParaNumero(micros: bigint): number {
  return Number(microsParaDecimal(micros));
}

/**
 * As 10.001 linhas, prontas para `createMany` (UM statement — nunca 10.001 `create`, que levaria
 * minutos e faria a suíte estourar por tempo, não por defeito).
 */
export function buildCostLineItemRows(input: {
  readonly importId: string;
  readonly linhasComuns: number;
  readonly periodStart: Date;
}): { readonly rows: readonly Record<string, unknown>[]; readonly fixture: O6r06CostFixture } {
  const rows: Record<string, unknown>[] = [];
  const umDia = 24 * 60 * 60 * 1000;

  for (let indice = 0; indice < input.linhasComuns; indice += 1) {
    // Todas as comuns no MESMO instante inicial: o desempate de `orderBy asc` deixa a cortada por
    // último de forma determinística, sem depender de ordenação secundária.
    rows.push(
      buildRow({
        importId: input.importId,
        serviceCode: O6R06_SERVICO_COMUM,
        micros: O6R06_LINHA_COMUM_MICROS,
        billingPeriodStart: input.periodStart,
        hashSeed: `comum-${indice}`,
      }),
    );
  }

  const periodoDaCortada = new Date(input.periodStart.getTime() + umDia);

  rows.push(
    buildRow({
      importId: input.importId,
      serviceCode: O6R06_SERVICO_DA_CORTADA,
      micros: O6R06_LINHA_CORTADA_MICROS,
      billingPeriodStart: periodoDaCortada,
      hashSeed: "cortada",
    }),
  );

  return {
    rows,
    fixture: {
      linhasComuns: input.linhasComuns,
      totalMicros: O6R06_LINHA_COMUM_MICROS * BigInt(input.linhasComuns) + O6R06_LINHA_CORTADA_MICROS,
      periodStart: input.periodStart,
      periodEnd: new Date(periodoDaCortada.getTime() + umDia),
    },
  };
}

function buildRow(input: {
  readonly importId: string;
  readonly serviceCode: string;
  readonly micros: bigint;
  readonly billingPeriodStart: Date;
  readonly hashSeed: string;
}): Record<string, unknown> {
  return {
    import_id: input.importId,
    provider: "aws",
    billing_period_start: input.billingPeriodStart,
    billing_period_end: new Date(input.billingPeriodStart.getTime() + 60 * 60 * 1000),
    service_code: input.serviceCode,
    usage_type: "BoxUsage",
    region: "sa-east-1",
    unblended_cost: microsParaDecimal(input.micros),
    currency: O6R06_MOEDA,
    raw_line_hash: `o6r06-${input.hashSeed}-${input.importId}`,
    metadata: {},
  };
}

/** O mesmo conjunto na forma do repositório EM MEMÓRIA (`CloudCostLineItem`). */
export function buildMemoryCostLineItems(input: {
  readonly linhasComuns: number;
  readonly periodStart: Date;
}): { readonly items: readonly Record<string, unknown>[]; readonly fixture: O6r06CostFixture } {
  const { rows, fixture } = buildCostLineItemRows({ importId: "o6r06-memoria", ...input });

  return {
    items: rows.map((row, indice) => ({
      id: `o6r06-${indice}`,
      importId: "o6r06-memoria",
      provider: "aws",
      billingPeriodStart: row.billing_period_start,
      billingPeriodEnd: row.billing_period_end,
      serviceCode: row.service_code,
      usageType: row.usage_type,
      region: row.region,
      unblendedCost: Number(row.unblended_cost),
      currency: O6R06_MOEDA,
      rawLineHash: row.raw_line_hash,
      metadata: {},
      createdAt: fixture.periodStart,
    })),
    fixture,
  };
}
