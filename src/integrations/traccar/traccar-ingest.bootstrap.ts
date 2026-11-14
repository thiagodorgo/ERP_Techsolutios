// B-TRC-01 · bootstrap do listener PRÓPRIO da ingestão do Traccar (plano v2.1 §4.1; A2-02). Espelho de
// `src/infra/jobs/job-worker.bootstrap.ts`: chamado por `src/server.ts` depois do `portalApp.listen`.
//
// - Flag desligada (`TRACCAR_INGEST_ENABLED=false`, o default) → não escuta e devolve `{ status: "disabled" }`.
// - Ligada → sonda o fuso da sessão do PRÓPRIO pool da ingestão (P2) antes de qualquer `listen`; fora de
//   UTC → devolve `{ status: "timezone_refused" }`, loga só o código e NÃO sobe o listener (fail-closed da
//   superfície da ingestão; a API pública segue).
// - Com fuso UTC → registra o tratador de `error` ANTES do `listen(TRACCAR_INGEST_PORT, TRACCAR_INGEST_HOST)` e
//   devolve `{ status: "listening" }` ou `{ status: "bind_failed", code }`. Em `EADDRNOTAVAIL`, `EADDRINUSE` ou
//   `EACCES` o bootstrap loga `{ code, host, port }` em nível `error`, NÃO relança, e o processo segue servindo o
//   app público; a ingestão fica fora até o próximo deploy. Sem o tratador, o `error` sai como `Unhandled 'error'
//   event` e derruba o processo com a API junto (medido pela crítica r2, E-01d).
// - O `listen` recebe SEMPRE o host: nunca todas as interfaces.
// - Os módulos de banco da ingestão só são importados com a flag ligada.

import { createServer, type Server } from "node:http";

import type { Express } from "express";
import type { Logger } from "pino";

import { env } from "../../config/env.js";
import {
  assertDatabaseSessionTimezoneUtc,
  SessionTimezoneProbeError,
} from "../../database/session-timezone.bootstrap.js";
import { DatabaseSessionTimezoneError } from "../../database/session-timezone.js";

export type TraccarIngestListenerConfig = {
  readonly enabled: boolean;
  readonly host: string;
  readonly port: number;
};

export type TraccarIngestBootstrapResult =
  | { readonly status: "disabled" }
  | { readonly status: "listening"; readonly server: Server; readonly host: string; readonly port: number }
  | { readonly status: "bind_failed"; readonly code: string }
  | { readonly status: "timezone_refused" };

export type TraccarIngestAppFactory = (context: { readonly logger: Logger }) => Promise<Express>;

export function traccarIngestListenerConfigFromEnv(): TraccarIngestListenerConfig {
  return {
    enabled: env.TRACCAR_INGEST_ENABLED,
    host: env.TRACCAR_INGEST_HOST,
    port: env.TRACCAR_INGEST_PORT,
  };
}

const defaultAppFactory: TraccarIngestAppFactory = async ({ logger }) => {
  const { createTraccarIngestAppFromEnv } = await import("./traccar-ingestion.service.js");
  return createTraccarIngestAppFromEnv({ logger });
};

async function defaultIngestTimezoneProbe(logger: Logger): Promise<void> {
  const { createTraccarIngestPrismaClient } = await import("./traccar-db.js");
  const client = createTraccarIngestPrismaClient({ connectionString: env.DATABASE_URL, max: env.TRACCAR_DB_POOL_MAX });

  try {
    await assertDatabaseSessionTimezoneUtc({ logger, loadClient: async () => client });
  } finally {
    await client.$disconnect();
  }
}

export async function startTraccarIngestListenerIfEnabled(options: {
  readonly logger: Logger;
  readonly config?: TraccarIngestListenerConfig;
  readonly createIngestApp?: TraccarIngestAppFactory;
  readonly probeTimezone?: () => Promise<void>;
}): Promise<TraccarIngestBootstrapResult> {
  const config = options.config ?? traccarIngestListenerConfigFromEnv();
  const { logger } = options;

  if (!config.enabled) {
    logger.info({ enabled: false }, "Traccar ingest listener disabled");
    return { status: "disabled" };
  }

  try {
    await (options.probeTimezone ?? (() => defaultIngestTimezoneProbe(logger)))();
  } catch (error) {
    const code =
      error instanceof DatabaseSessionTimezoneError || error instanceof SessionTimezoneProbeError
        ? error.code
        : "SESSION_TIMEZONE_PROBE_FAILED";
    logger.error({ code }, "Traccar ingest listener timezone refused; the public API keeps running");
    return { status: "timezone_refused" };
  }

  const app = await (options.createIngestApp ?? defaultAppFactory)({ logger });
  const server = createServer(app);

  return new Promise<TraccarIngestBootstrapResult>((resolve) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.removeListener("listening", onListening);
      const code = typeof error.code === "string" ? error.code : "UNKNOWN";
      logger.error(
        { code, host: config.host, port: config.port },
        "Traccar ingest listener bind failed; the public API keeps running",
      );
      resolve({ status: "bind_failed", code });
    };
    const onListening = () => {
      server.removeListener("error", onError);
      server.on("error", (error: NodeJS.ErrnoException) => {
        logger.error({ code: error.code ?? "UNKNOWN" }, "Traccar ingest listener error");
      });
      logger.info({ host: config.host, port: config.port }, "Traccar ingest listener up");
      resolve({ status: "listening", server, host: config.host, port: config.port });
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(config.port, config.host);
  });
}
