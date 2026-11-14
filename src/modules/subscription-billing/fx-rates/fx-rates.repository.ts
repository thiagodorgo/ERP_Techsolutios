// B-ASS-09 (F5) — câmbio do mês da plataforma: tipos, porta do repositório e dublê em memória (dev/teste sem Postgres).
// A tabela `platform_fx_rates` (M6) é GLOBAL e só de acréscimo: cada correção da taxa de um mês é uma VERSÃO nova, nunca
// `UPDATE`; a vigente é a de maior `version` para (`month`, `currency_from`, `currency_to`). O caminho Prisma está em
// `fx-rates.prisma.ts`. A taxa trafega como string decimal com 6 casas (`"5.400000"`): nenhum `float` no domínio.

import { randomUUID } from "node:crypto";

export type FxRate = {
  readonly id: string;
  /** Mês `AAAA-MM`. */
  readonly month: string;
  /** Moeda de origem, 3 letras maiúsculas (`"USD"`). */
  readonly currencyFrom: string;
  /** Moeda de destino; só `"BRL"` (CHECK da M6). */
  readonly currencyTo: string;
  /** Decimal com exatamente 6 casas (`"5.400000"`), como o `numeric(18,6)` devolve. */
  readonly rate: string;
  readonly version: number;
  readonly createdBy: string | null;
  readonly createdAt: Date;
};

export type FxRateKey = {
  readonly month: string;
  readonly currencyFrom: string;
  readonly currencyTo: string;
};

export type AppendFxRateRecord = FxRateKey & {
  /** Já normalizada pelo serviço: decimal positivo com exatamente 6 casas. */
  readonly rate: string;
  readonly createdBy: string | null;
};

export interface FxRatesRepository {
  /** Acrescenta a próxima versão do par no mês (maior versão + 1, começando em 1). Nunca altera versão existente. */
  appendVersion(input: AppendFxRateRecord): Promise<FxRate>;
  /** Todas as versões do par no mês, da maior para a menor. A primeira é a vigente. */
  listVersions(key: FxRateKey): Promise<FxRate[]>;
  /** Todas as versões de todos os pares dos meses em `[fromMonth, toMonth]`, por mês, par e versão decrescente. */
  listRange(fromMonth: string, toMonth: string): Promise<FxRate[]>;
}

export class InMemoryFxRatesRepository implements FxRatesRepository {
  private readonly rows: FxRate[] = [];

  async appendVersion(input: AppendFxRateRecord): Promise<FxRate> {
    const latest = this.rows
      .filter((row) => sameKey(row, input))
      .reduce((max, row) => Math.max(max, row.version), 0);
    const row: FxRate = {
      id: randomUUID(),
      month: input.month,
      currencyFrom: input.currencyFrom,
      currencyTo: input.currencyTo,
      rate: input.rate,
      version: latest + 1,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };
    this.rows.push(row);
    return row;
  }

  async listVersions(key: FxRateKey): Promise<FxRate[]> {
    return this.versionsOf(key);
  }

  async listRange(fromMonth: string, toMonth: string): Promise<FxRate[]> {
    return this.rows
      .filter((row) => row.month >= fromMonth && row.month <= toMonth)
      .sort(compareRangeRows);
  }

  private versionsOf(key: FxRateKey): FxRate[] {
    return this.rows
      .filter((row) => sameKey(row, key))
      .sort((a, b) => b.version - a.version);
  }
}

function sameKey(row: FxRateKey, key: FxRateKey): boolean {
  return row.month === key.month && row.currencyFrom === key.currencyFrom && row.currencyTo === key.currencyTo;
}

/** Ordem da listagem por período: mês, moeda de origem, moeda de destino e versão decrescente. */
export function compareRangeRows(a: FxRate, b: FxRate): number {
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.currencyFrom !== b.currencyFrom) return a.currencyFrom < b.currencyFrom ? -1 : 1;
  if (a.currencyTo !== b.currencyTo) return a.currencyTo < b.currencyTo ? -1 : 1;
  return b.version - a.version;
}
