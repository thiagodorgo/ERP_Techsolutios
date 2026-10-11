// B-TRC-01 · app Express PRÓPRIO da ingestão do Traccar (plano v2.1 §4.1; B-01). Espelho de `src/portal-app.ts`:
// outro app, outra porta (`TRACCAR_INGEST_PORT`), outro endereço (`TRACCAR_INGEST_HOST`), nada sob `/api/v1`, sem
// CORS (nenhum navegador fala com esta porta) e sem `attachAuthenticatedActor` (não há usuário). `src/app.ts` não tem
// rota do Traccar: nenhum caminho do listener público chega aqui.
//
// Serve UMA rota, `POST /ingest/traccar/v1/positions`, com a ordem FIXA de §4.1:
//   (1) query string presente → 400 query_not_allowed (segredo nunca em query, por construção);
//   (2) autenticação do header → 401;
//   (3) `Content-Type` diferente de `application/json` → 415;
//   (4) `express.json({ limit: "64kb", strict: true })` → 413 ou 400 invalid_json;
//   (5) taxa e concorrência → 429;
//   (6) schema allowlist → 422;
//   (7) serviço com orçamento de tempo → 204 / 202 / 409 / 503.
// Todo o resto: 404 `{"error":{"code":"NOT_FOUND"}}`. Corpo vazio em 2xx; `{"error":{"code":"…"}}` nos demais, sem
// detalhe.

import express, { type ErrorRequestHandler, type Express, type RequestHandler } from "express";
import pino, { type Logger } from "pino";

import { buildTraccarPositionCommand, type TraccarPositionCommand } from "./traccar-position.adapter.js";
import { parseTraccarPositionEnvelope, TraccarPayloadError } from "./traccar-position.schema.js";
import { traccarForwardAuthMiddleware, type TraccarForwardAuthenticator } from "./traccar-forward-auth.js";
import { createTraccarIngestHttpLogger } from "./traccar-ingest.logger.js";
import { traccarRateLimitMiddleware, type TraccarIngestLimiter } from "./traccar-rate-limit.js";

export const TRACCAR_INGEST_PATH = "/ingest/traccar/v1/positions";
export const TRACCAR_INGEST_BODY_LIMIT = "64kb";

export type TraccarQuarantineReason =
  | "unmapped_device"
  | "invalid_fix"
  | "tenant_inactive"
  | "fix_before_active_binding"
  | "fix_in_future"
  | "no_operator_at_fix_time"
  | "ambiguous_operator_at_fix_time"
  | "operator_history_ambiguous"
  | "resolution_budget_exceeded"
  | "idempotency_key_owned_elsewhere";

export type TraccarIngestOutcome =
  | { readonly kind: "stored" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "quarantined"; readonly reason: TraccarQuarantineReason }
  | { readonly kind: "conflict"; readonly reason: "digest_mismatch" | "owned_elsewhere" }
  | { readonly kind: "unavailable"; readonly reason: string };

export type TraccarIngestHandler = (command: TraccarPositionCommand) => Promise<TraccarIngestOutcome>;

export type TraccarIngestAppDeps = {
  readonly authenticator: TraccarForwardAuthenticator;
  readonly limiter: TraccarIngestLimiter;
  readonly ingest: TraccarIngestHandler;
  readonly instanceKey: string;
  readonly timeoutMs: number;
  readonly logger?: Logger;
  readonly now?: () => Date;
};

function errorBody(code: string) {
  return { error: { code } };
}

const rejectQueryString: RequestHandler = (request, response, next) => {
  if (request.originalUrl.includes("?")) {
    response.status(400).json(errorBody("query_not_allowed"));
    return;
  }
  next();
};

const requireJsonContentType: RequestHandler = (request, response, next) => {
  if (!request.headers["content-type"] || request.is("application/json") !== "application/json") {
    response.status(415).json(errorBody("unsupported_media_type"));
    return;
  }
  next();
};

function withTimeout(work: Promise<TraccarIngestOutcome>, timeoutMs: number): Promise<TraccarIngestOutcome> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<TraccarIngestOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "unavailable", reason: "timeout" }), timeoutMs);
  });
  // O trabalho que perdeu a corrida não pode virar rejeição sem tratador.
  work.catch(() => undefined);
  return Promise.race([work, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function createTraccarIngestApp(deps: TraccarIngestAppDeps): Express {
  const app = express();
  const now = deps.now ?? (() => new Date());
  const logger = deps.logger ?? pino({ level: "info" });

  app.disable("x-powered-by");
  app.use(createTraccarIngestHttpLogger(logger));

  const handle: RequestHandler = async (request, response) => {
    let command: TraccarPositionCommand;
    try {
      command = buildTraccarPositionCommand(parseTraccarPositionEnvelope(request.body), {
        instanceKey: deps.instanceKey,
        receivedAt: now(),
      });
    } catch (error) {
      if (error instanceof TraccarPayloadError) {
        response.status(error.statusCode).json(errorBody(error.code));
        return;
      }
      throw error;
    }

    const outcome = await withTimeout(deps.ingest(command), deps.timeoutMs);
    switch (outcome.kind) {
      case "stored":
      case "duplicate":
        response.status(204).end();
        return;
      case "quarantined":
        response.status(202).end();
        return;
      case "conflict":
        response.status(409).json(errorBody("traccar_idempotency_conflict"));
        return;
      case "unavailable":
        response.status(503).json(errorBody("unavailable"));
        return;
    }
  };

  app.post(
    TRACCAR_INGEST_PATH,
    rejectQueryString,
    traccarForwardAuthMiddleware(deps.authenticator),
    requireJsonContentType,
    express.json({ limit: TRACCAR_INGEST_BODY_LIMIT, strict: true, type: "application/json" }),
    traccarRateLimitMiddleware(deps.limiter),
    handle,
  );

  app.use((_request, response) => {
    response.status(404).json(errorBody("NOT_FOUND"));
  });

  const onError: ErrorRequestHandler = (error, request, response, _next) => {
    const type = typeof error === "object" && error !== null ? (error as { type?: unknown }).type : undefined;
    const [status, code] =
      type === "entity.too.large"
        ? [413, "payload_too_large"]
        : type === "entity.parse.failed"
          ? [400, "invalid_json"]
          : type === "encoding.unsupported" || type === "charset.unsupported"
            ? [415, "unsupported_media_type"]
            : type === "request.aborted" || type === "request.size.invalid"
              ? [400, "invalid_request"]
              : [503, "unavailable"];
    // Só o código: nunca `err.stack`, nunca o corpo (o erro do parser carrega o corpo bruto em `err.body`).
    request.log?.warn({ code }, "traccar ingest request rejected");
    if (response.headersSent) return;
    response.status(status).json(errorBody(code));
  };
  app.use(onError);

  return app;
}
