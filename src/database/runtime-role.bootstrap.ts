import { env } from "../config/env.js";
import {
  isRuntimeRoleProbeTimeout,
  probeRuntimeRolePosture,
  RuntimeRoleGuardError,
  type RuntimeRolePosture,
  type RuntimeRoleProbeClient,
} from "./runtime-role.js";

// B-SAN3-05 (item 9) — a trava de boot. `src/server.ts` chama isto como PRIMEIRA instrução de `main()`,
// antes de qualquer serviço, worker ou handle: recusa ⇒ `$disconnect` e exceção nomeada, e o processo sai.
// Dependências injetáveis (padrão de `src/infra/jobs/job-worker.bootstrap.ts`) para o teste não exigir banco.
// O log diz session_user, current_user e as vias de escape — nunca URL, host ou credencial.

export type RuntimeRoleBootstrapLogger = {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
};

export type RuntimeRoleBootstrapClient = RuntimeRoleProbeClient & {
  $disconnect(): Promise<void>;
};

export type RuntimeRoleBootstrapOptions = {
  readonly enforce?: boolean;
  readonly logger?: RuntimeRoleBootstrapLogger;
  readonly loadClient?: () => Promise<RuntimeRoleBootstrapClient>;
  /** Total de sondas antes de recusar por erro de CONEXÃO (nenhum outro erro é repetido). */
  readonly attempts?: number;
  /** Espera depois da 1ª falha de conexão; dobra a cada falha seguinte. */
  readonly backoffMs?: number;
  readonly sleep?: (ms: number) => Promise<void>;
};

export type RuntimeRoleBootstrapResult =
  | { readonly enforced: false }
  | { readonly enforced: true; readonly posture: RuntimeRolePosture };

const noopLogger: RuntimeRoleBootstrapLogger = {
  info() {},
  warn() {},
  error() {},
};

async function loadDefaultClient(): Promise<RuntimeRoleBootstrapClient> {
  const { prisma } = await import("./prisma.js");

  return prisma;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRuntimeRoleConnectionError(error: unknown): boolean {
  if (isRuntimeRoleProbeTimeout(error)) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const kind = (error as { meta?: { driverAdapterError?: { cause?: { kind?: unknown } } } }).meta?.driverAdapterError
    ?.cause?.kind;

  if (kind === "DatabaseNotReachable" || kind === "ConnectionClosed" || kind === "SocketTimeout") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return /Can't reach database server|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|EAI_AGAIN|Connection terminated/i.test(
    message,
  );
}

// A mensagem do erro do driver traz `host:porta` ("Can't reach database server at …"): quem sobe com ela no
// log do `main().catch` publicaria o endereço do banco. O que sobe é só o nome, o SQLSTATE e o tipo do driver.
export class RuntimeRoleProbeError extends Error {
  readonly code = "RUNTIME_ROLE_PROBE_FAILED";
  readonly attempts: number;
  readonly sqlState: string | null;
  readonly driverKind: string | null;

  constructor(error: unknown, attempts: number) {
    const name = error instanceof Error ? error.name : "unknown";
    const sqlState = /Code: `([0-9A-Z]{5})`/.exec(error instanceof Error ? error.message : "")?.[1] ?? null;
    const kind = (error as { meta?: { driverAdapterError?: { cause?: { kind?: unknown } } } } | null)?.meta
      ?.driverAdapterError?.cause?.kind;
    const driverKind = typeof kind === "string" ? kind : isRuntimeRoleProbeTimeout(error) ? "ProbeTimeout" : null;

    super(
      `RUNTIME_ROLE_PROBE_FAILED: a sonda do papel de banco falhou depois de ${attempts} tentativa(s) ` +
        `(${name}${sqlState ? `, SQLSTATE ${sqlState}` : ""}${driverKind ? `, ${driverKind}` : ""}) — o processo não sobe sem saber com que papel fala ao banco.`,
    );
    this.name = "RuntimeRoleProbeError";
    this.attempts = attempts;
    this.sqlState = sqlState;
    this.driverKind = driverKind;
  }
}

function describeEscapes(posture: RuntimeRolePosture): Record<string, unknown> {
  return {
    session_user: posture.sessionUser,
    current_user: posture.currentUser,
    escapes: posture.escapes,
  };
}

export async function assertRuntimeDatabaseRoleIfEnforced(
  options: RuntimeRoleBootstrapOptions = {},
): Promise<RuntimeRoleBootstrapResult> {
  const enforce = options.enforce ?? env.DATABASE_RUNTIME_ROLE_GUARD === "enforce";
  const logger = options.logger ?? noopLogger;

  if (!enforce) {
    logger.info(
      { guard: "skip", nodeEnv: env.NODE_ENV },
      "runtime database role guard skipped (DATABASE_RUNTIME_ROLE_GUARD=skip)",
    );

    return { enforced: false };
  }

  const attempts = Math.max(1, options.attempts ?? 5);
  const backoffMs = options.backoffMs ?? 2_000;
  const sleep = options.sleep ?? defaultSleep;
  const client = await (options.loadClient ?? loadDefaultClient)();
  let posture: RuntimeRolePosture | undefined;

  for (let attempt = 1; posture === undefined; attempt++) {
    try {
      posture = await probeRuntimeRolePosture(client);
    } catch (error) {
      if (!isRuntimeRoleConnectionError(error) || attempt >= attempts) {
        const failure = new RuntimeRoleProbeError(error, attempt);

        logger.error(
          { guard: "enforce", attempt, attempts, sqlState: failure.sqlState, driverKind: failure.driverKind },
          "runtime database role probe failed — refusing to start",
        );
        await client.$disconnect();
        throw failure;
      }

      const waitMs = backoffMs * 2 ** (attempt - 1);
      logger.warn(
        { guard: "enforce", attempt, attempts, retryInMs: waitMs },
        "runtime database role probe could not reach the database — retrying",
      );
      await sleep(waitMs);
    }
  }

  if (posture.escapes.length > 0) {
    logger.error(
      { guard: "enforce", ...describeEscapes(posture) },
      "runtime database role can bypass RLS — refusing to start",
    );
    await client.$disconnect();

    throw new RuntimeRoleGuardError(posture);
  }

  logger.info(
    { guard: "enforce", session_user: posture.sessionUser, current_user: posture.currentUser, escapes: 0 },
    "runtime database role verified",
  );

  return { enforced: true, posture };
}
