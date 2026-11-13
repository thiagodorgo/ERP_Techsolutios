// B-DB-FUSO-UTC — sonda e aceite do fuso de sessão do Postgres.
//
// A trava de boot mede `current_setting('TimeZone')` e só aceita os literais `UTC` e `Etc/UTC`: comparação exata,
// depois do `trim`, sem normalizar a caixa (`utc` e `etc/utc` são recusados; J-554, C2-A1).
// Fusos que coincidem com UTC apenas em parte do ano (`Europe/London`, `GMT0` via regra) não passam; zona nomeada
// fixa além dessas duas é recusada por segurança (fail-closed).

export const DATABASE_SESSION_TIMEZONE_NOT_UTC = "DATABASE_SESSION_TIMEZONE_NOT_UTC";

export const SESSION_TIMEZONE_SQL = "SELECT current_setting('TimeZone') AS tz";

const SESSION_TIMEZONE_PROBE_TIMEOUT_MS = 10_000;
const SESSION_TIMEZONE_PROBE_TIMEOUT_MESSAGE = "session_timezone_probe_timeout";

export type SessionTimezoneProbeClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): PromiseLike<T> | Promise<T>;
};

const ACCEPTED_SESSION_TIMEZONES: ReadonlySet<string> = new Set(["UTC", "Etc/UTC"]);

export function acceptsSessionTimezoneUtc(timezone: string): boolean {
  return ACCEPTED_SESSION_TIMEZONES.has(timezone.trim());
}

export function isSessionTimezoneProbeTimeout(error: unknown): boolean {
  return error instanceof Error && error.message === SESSION_TIMEZONE_PROBE_TIMEOUT_MESSAGE;
}

export async function probeSessionTimezone(
  client: SessionTimezoneProbeClient,
  timeoutMs: number = SESSION_TIMEZONE_PROBE_TIMEOUT_MS,
): Promise<string> {
  const rows = await withTimeout(client.$queryRawUnsafe<Array<{ tz: string }>>(SESSION_TIMEZONE_SQL), timeoutMs);

  return rows[0]?.tz ?? "";
}

export class DatabaseSessionTimezoneError extends Error {
  readonly code = DATABASE_SESSION_TIMEZONE_NOT_UTC;
  readonly timezone: string;

  constructor(timezone: string) {
    super(
      `${DATABASE_SESSION_TIMEZONE_NOT_UTC}: a sessão do Postgres está em "${timezone}" — o processo só sobe com TimeZone=UTC/Etc/UTC.`,
    );
    this.name = "DatabaseSessionTimezoneError";
    this.timezone = timezone;
  }
}

async function withTimeout<T>(promise: PromiseLike<T> | Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(SESSION_TIMEZONE_PROBE_TIMEOUT_MESSAGE)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
