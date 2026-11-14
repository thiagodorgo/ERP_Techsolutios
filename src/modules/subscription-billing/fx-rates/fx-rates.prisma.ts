// B-ASS-09 (F5) — câmbio do mês da plataforma no Prisma (caminho de produção). `platform_fx_rates` é GLOBAL (sem RLS): só
// rotas `requirePlatformPermission` chegam aqui, e nenhuma leitura ou escrita precisa de GUC de organização.
//
// P10 do plano: `PUT /fx-rates/:month` ACRESCENTA versão, nunca faz `UPDATE`. Dois `PUT` do mesmo par e mês ao mesmo
// tempo dão versões consecutivas, nenhuma perdida: a transação toma `pg_advisory_xact_lock` da chave (mês, origem,
// destino) ANTES de ler a maior versão, e o segundo espera o primeiro terminar. Sem a trava, os dois leriam a mesma
// maior versão e o segundo bateria no `UNIQUE (month, currency_from, currency_to, version)`.

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  compareRangeRows,
  type AppendFxRateRecord,
  type FxRate,
  type FxRateKey,
  type FxRatesRepository,
} from "./fx-rates.repository.js";

type FxRateRow = {
  readonly id: string;
  readonly month: string;
  readonly currency_from: string;
  readonly currency_to: string;
  readonly rate: Prisma.Decimal;
  readonly version: number;
  readonly created_by: string | null;
  readonly created_at: Date;
};

/** A chave da trava consultiva de uma versão nova. O prefixo separa esta fila de qualquer outra trava da casa. */
export function fxRateLockKey(key: FxRateKey): string {
  return `platform_fx_rates:${key.month}:${key.currencyFrom}:${key.currencyTo}`;
}

export class PrismaFxRatesRepository implements FxRatesRepository {
  constructor(private readonly client: PrismaClient) {}

  async appendVersion(input: AppendFxRateRecord): Promise<FxRate> {
    const where = { month: input.month, currency_from: input.currencyFrom, currency_to: input.currencyTo };
    return this.client.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${fxRateLockKey(input)}, 0))`;
      const latest = await tx.platformFxRate.aggregate({ where, _max: { version: true } });
      const created = await tx.platformFxRate.create({
        data: {
          ...where,
          rate: input.rate,
          version: (latest._max.version ?? 0) + 1,
          created_by: input.createdBy,
        },
      });
      return mapFxRate(created);
    });
  }

  async listVersions(key: FxRateKey): Promise<FxRate[]> {
    const rows = await this.client.platformFxRate.findMany({
      where: { month: key.month, currency_from: key.currencyFrom, currency_to: key.currencyTo },
      orderBy: { version: "desc" },
    });
    return rows.map(mapFxRate);
  }

  async listRange(fromMonth: string, toMonth: string): Promise<FxRate[]> {
    const rows = await this.client.platformFxRate.findMany({ where: { month: { gte: fromMonth, lte: toMonth } } });
    return rows.map(mapFxRate).sort(compareRangeRows);
  }
}

function mapFxRate(row: FxRateRow): FxRate {
  return {
    id: row.id,
    month: row.month,
    currencyFrom: row.currency_from,
    currencyTo: row.currency_to,
    rate: row.rate.toFixed(6),
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
