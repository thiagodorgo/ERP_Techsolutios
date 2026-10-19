// B-TRC-01 · log HTTP da ingestão com serializadores de ALLOWLIST (plano v2.1 §4.7; A-02).
//
// - `req` → `{ method, path }` (caminho SEM query string); `res` → `{ statusCode }`; `err` → `{ type }`.
//   Nenhum header e nenhum corpo entram no log, por construção.
// - A `redact` de `req.headers["x-traccar-forward-token"]`, `authorization` e `cookie` fica como cinto, num logger
//   filho — ela só morde se alguém trocar os serializadores.
// - Quem trata erro loga só `{ code }` (traccar-ingest.app.ts), nunca `err.stack` nem o payload.

import type { IncomingMessage, ServerResponse } from "node:http";

import type { Logger } from "pino";
import { pinoHttp, type HttpLogger } from "pino-http";

type RequestLike = IncomingMessage & { readonly originalUrl?: string };

export function traccarIngestRequestSerializer(request: RequestLike): { method?: string; path: string } {
  const url = request.originalUrl ?? request.url ?? "";
  const queryAt = url.indexOf("?");
  return { method: request.method, path: queryAt === -1 ? url : url.slice(0, queryAt) };
}

export function traccarIngestResponseSerializer(response: ServerResponse): { statusCode: number } {
  return { statusCode: response.statusCode };
}

export function traccarIngestErrorSerializer(error: unknown): { type: string } {
  return { type: error instanceof Error ? error.name : "Error" };
}

export const TRACCAR_INGEST_LOG_REDACT_PATHS = [
  'req.headers["x-traccar-forward-token"]',
  "req.headers.authorization",
  "req.headers.cookie",
];

export function createTraccarIngestHttpLogger(logger: Logger): HttpLogger {
  const component = logger.child(
    { component: "traccar-ingest" },
    { redact: { paths: TRACCAR_INGEST_LOG_REDACT_PATHS, censor: "[REDACTED]" } },
  );
  return pinoHttp({
    logger: component,
    wrapSerializers: false,
    serializers: {
      req: traccarIngestRequestSerializer,
      res: traccarIngestResponseSerializer,
      err: traccarIngestErrorSerializer,
    },
  });
}
