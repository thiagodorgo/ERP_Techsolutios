// B-DB-FUSO-UTC — a trava de boot do fuso de sessão. `src/server.ts` chama isto logo DEPOIS de
// `assertRuntimeDatabaseRoleIfEnforced` e ANTES de `createCoreSaasService`: recusa ⇒ `$disconnect` e exceção
// nomeada, e o processo sai. Liga SEMPRE, em todo ambiente, sem chave de desligar (plano §1.3).
//
// Dependências injetáveis (padrão de `src/database/runtime-role.bootstrap.ts`) para o teste não exigir banco. A
// política de repetição vale SÓ para erro de conexão (reusa `isRuntimeRoleConnectionError`), e o erro sobe
// sanitizado pelo `describeDriverError` do runtime-role — nunca URL, host, porta, usuário nem senha.

import {
  acceptsSessionTimezoneUtc,
  DatabaseSessionTimezoneError,
  isSessionTimezoneProbeTimeout,
  probeSessionTimezone,
  type SessionTimezoneProbeClient,
} from "./session-timezone.js";
import { describeDriverError, isRuntimeRoleConnectionError } from "./runtime-role.bootstrap.js";

export type SessionTimezoneBootstrapLogger = {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
};

export type SessionTimezoneBootstrapClient = SessionTimezoneProbeClient & {
  $disconnect(): Promise<void>;
};

export type SessionTimezoneBootstrapOptions = {
  readonly logger?: SessionTimezoneBootstrapLogger;
  readonly loadClient?: () => Promise<SessionTimezoneBootstrapClient>;
  /** Total de sondas antes de recusar por erro de CONEXÃO (nenhum outro erro é repetido). */
  readonly attempts?: number;
  /** Espera depois da 1ª falha de conexão; dobra a cada falha seguinte. */
  readonly backoffMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
};

const noopLogger: SessionTimezoneBootstrapLogger = {
  info() {},
  warn() {},
  error() {},
};

async function loadDefaultClient(): Promise<SessionTimezoneBootstrapClient> {
  const { prisma } = await import("./prisma.js");

  return prisma;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConnectionError(error: unknown): boolean {
  return isSessionTimezoneProbeTimeout(error) || isRuntimeRoleConnectionError(error);
}

export class SessionTimezoneProbeError extends Error {
  readonly code = "SESSION_TIMEZONE_PROBE_FAILED";
  readonly attempts: number;
  readonly sqlState: string | null;
  readonly driverKind: string | null;

  constructor(error: unknown, attempts: number) {
    const { name, sqlState, driverKind } = describeDriverError(error, isSessionTimezoneProbeTimeout);

    super(
      `SESSION_TIMEZONE_PROBE_FAILED: a sonda do fuso de sessão falhou depois de ${attempts} tentativa(s) ` +
        `(${name}${sqlState ? `, SQLSTATE ${sqlState}` : ""}${driverKind ? `, ${driverKind}` : ""}) — o processo não sobe sem saber o fuso da sessão.`,
    );
    this.name = "SessionTimezoneProbeError";
    this.attempts = attempts;
    this.sqlState = sqlState;
    this.driverKind = driverKind;
  }
}

export async function assertDatabaseSessionTimezoneUtc(
  options: SessionTimezoneBootstrapOptions = {},
): Promise<void> {
  const logger = options.logger ?? noopLogger;
  const attempts = Math.max(1, options.attempts ?? 5);
  const backoffMs = options.backoffMs ?? 2_000;
  const sleep = options.sleep ?? defaultSleep;
  const client = await (options.loadClient ?? loadDefaultClient)();
  let timezone: string | undefined;

  for (let attempt = 1; timezone === undefined; attempt++) {
    try {
      timezone = await probeSessionTimezone(client);
    } catch (error) {
      if (!isConnectionError(error) || attempt >= attempts) {
        const failure = new SessionTimezoneProbeError(error, attempt);

        logger.error(
          { guard: "timezone", attempt, attempts, sqlState: failure.sqlState, driverKind: failure.driverKind },
          "database session timezone probe failed — refusing to start",
        );
        await client.$disconnect();
        throw failure;
      }

      const waitMs = backoffMs * 2 ** (attempt - 1);
      logger.warn(
        { guard: "timezone", attempt, attempts, retryInMs: waitMs },
        "database session timezone probe could not reach the database — retrying",
      );
      await sleep(waitMs);
    }
  }

  if (!acceptsSessionTimezoneUtc(timezone)) {
    logger.error(
      { guard: "timezone", timezone },
      "database session timezone is not UTC — refusing to start",
    );
    await client.$disconnect();

    throw new DatabaseSessionTimezoneError(timezone);
  }

  logger.info({ guard: "timezone", timezone }, "database session timezone verified");
}
