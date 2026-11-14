// B-DB-FUSO-UTC — a fábrica ÚNICA de conexão com o Postgres.
//
// Todo cliente Prisma que grava `Date` nasce aqui, com a sessão fixada em `TimeZone=UTC` na URL de conexão.
// Motivo (plano §0.1): o `@prisma/adapter-pg` 7.8.0 manda `Date` como texto UTC SEM fuso e troca o offset que o
// banco devolve por `+00:00`; num servidor fora de UTC (ex.: `America/Sao_Paulo`), escrita e leitura deslocam
// (+3 h em SP). Fixar na URL — e nunca só no objeto de config — corrige as duas pontas e vence o
// `ALTER DATABASE … SET timezone` (E4/E6).
//
// Este é o ÚNICO arquivo de `src/`, `scripts/` e `prisma/` (fora a exceção nomeada `scripts/gen-tenant-tables.mjs`,
// que só lê catálogo) autorizado a escrever `new PrismaPg(`.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export const DATABASE_URL_TIMEZONE_CONFLICT = "DATABASE_URL_TIMEZONE_CONFLICT";

export class DatabaseTimezoneConfigError extends Error {
  readonly code = DATABASE_URL_TIMEZONE_CONFLICT;

  constructor() {
    super(
      `${DATABASE_URL_TIMEZONE_CONFLICT}: DATABASE_URL fixa um TimeZone de sessão diferente de UTC, repete o parâmetro options, ou é inválida.`,
    );
    this.name = "DatabaseTimezoneConfigError";
  }
}

// Formas aceitas para já existir um TimeZone na `options` da URL: `-c TimeZone=X`, `-cTimeZone=X` e
// `--TimeZone=X`, sem diferença de caixa (plano §1.1).
const TIMEZONE_OPTION = /(?:^|\s)(?:-c\s*|--)(timezone)\s*=\s*([^\s]+)/gi;

export function withUtcSessionTimezone(connectionString: string): string {
  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    throw new DatabaseTimezoneConfigError();
  }

  // Emenda 3 (E3.2): olha TODAS as `options`. Repetida, o `pg-connection-string` usa a ÚLTIMA e esta função leria
  // outra; em vez de adivinhar qual vale, recusa (fail-closed).
  const allOptions = url.searchParams.getAll("options");

  if (allOptions.length > 1) {
    throw new DatabaseTimezoneConfigError();
  }

  const options = allOptions[0] ?? "";

  if (options !== "") {
    const found = [...options.matchAll(TIMEZONE_OPTION)];

    if (found.length > 0) {
      const utcOnly = found.every((match) => (match[2] ?? "").toUpperCase() === "UTC");

      if (utcOnly) {
        return connectionString;
      }

      throw new DatabaseTimezoneConfigError();
    }
  }

  url.searchParams.set("options", options === "" ? "-c TimeZone=UTC" : `${options} -c TimeZone=UTC`);

  return url.toString();
}

export function createPgAdapter(
  connectionString: string,
  extra?: { readonly max?: number },
): PrismaPg {
  return new PrismaPg({ connectionString: withUtcSessionTimezone(connectionString), ...extra });
}

export function createPrismaClient(
  connectionString: string,
  extra?: { readonly max?: number },
): PrismaClient {
  return new PrismaClient({ adapter: createPgAdapter(connectionString, extra) });
}
