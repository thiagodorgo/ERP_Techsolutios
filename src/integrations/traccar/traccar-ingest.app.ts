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
//   (7) serviço com orçamento de tempo → 204 / 202 / 409 / 503. O 503 por tempo só sai se o listener fechar a PORTA
//       DE COMMIT antes de o trabalho tomá-la (`createTraccarCommitGate`): 503 = nada gravado, nem depois. A vaga do
//       limitador (5) só volta quando o TRABALHO termina, não quando a resposta sai.
// Todo o resto: 404 `{"error":{"code":"NOT_FOUND"}}`. Corpo vazio em 2xx; `{"error":{"code":"…"}}` nos demais, sem
// detalhe.

import express, { type ErrorRequestHandler, type Express, type RequestHandler } from "express";
import pino, { type Logger } from "pino";

import { buildTraccarPositionCommand, type TraccarPositionCommand } from "./traccar-position.adapter.js";
import { parseTraccarPositionEnvelope, TraccarPayloadError } from "./traccar-position.schema.js";
import { traccarForwardAuthMiddleware, type TraccarForwardAuthenticator } from "./traccar-forward-auth.js";
import { createTraccarIngestHttpLogger } from "./traccar-ingest.logger.js";
import { holdTraccarSlotUntil, traccarRateLimitMiddleware, type TraccarIngestLimiter } from "./traccar-rate-limit.js";

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

/**
 * Conserto do 503 (pré-revisão do #426, Achado 1) — a PORTA DE COMMIT, um estado só dividido entre o listener e o
 * trabalho que ele disparou. Vai de `open` para `claimed` (o trabalho vai gravar) OU para `expired` (o listener
 * respondeu 503 por tempo), e nunca volta. Quem chegar primeiro decide:
 *   - o listener só responde 503 se conseguir trocar `open` por `expired`; daí em diante nenhuma gravação passa;
 *   - toda gravação toma a porta (`claimCommit()`) ANTES do commit; recebendo `false`, desiste (rollback);
 *   - se o trabalho já tomou a porta quando o tempo esgota, o listener espera o desfecho real (nunca 503 com dado
 *     gravado). Depois de tomada, só falta o COMMIT da transação (ou a instrução única da quarentena sem organização).
 */
export type TraccarIngestDeadline = {
  /** Instante (epoch ms) em que o listener desiste. */
  readonly at: number;
  /** O listener já respondeu 503 por tempo: nada mais pode ser gravado. */
  readonly expired: boolean;
  /** Pede a porta para gravar: `true` = pode gravar (o listener espera o desfecho); `false` = o 503 já saiu. */
  claimCommit(): boolean;
};

export class TraccarIngestDeadlineExpiredError extends Error {
  readonly code = "traccar_ingest_deadline_expired";

  constructor() {
    super("traccar ingest: o listener já respondeu 503 por tempo; nada é gravado.");
    this.name = "TraccarIngestDeadlineExpiredError";
  }
}

export function createTraccarCommitGate(at: number): { readonly deadline: TraccarIngestDeadline; expire(): boolean } {
  let state: "open" | "claimed" | "expired" = "open";
  return {
    deadline: {
      at,
      get expired() {
        return state === "expired";
      },
      claimCommit() {
        if (state === "open") state = "claimed";
        return state === "claimed";
      },
    },
    expire() {
      if (state === "open") state = "expired";
      return state === "expired";
    },
  };
}

/** Toma a porta de commit ou lança: dentro de uma transação, o lançamento vira rollback. */
export function claimTraccarCommitOrThrow(deadline: TraccarIngestDeadline): void {
  if (!deadline.claimCommit()) throw new TraccarIngestDeadlineExpiredError();
}

export type TraccarIngestHandler = (
  command: TraccarPositionCommand,
  deadline: TraccarIngestDeadline,
) => Promise<TraccarIngestOutcome>;

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

/** §4.6 — o desfecho do serviço → status HTTP (corpo vazio em 2xx; só o código nos demais). Fonte única. */
export function traccarIngestResponse(outcome: TraccarIngestOutcome): { readonly status: number; readonly code?: string } {
  switch (outcome.kind) {
    case "stored":
    case "duplicate":
      return { status: 204 };
    case "quarantined":
      return { status: 202 };
    case "conflict":
      return { status: 409, code: "traccar_idempotency_conflict" };
    case "unavailable":
      return { status: 503, code: "unavailable" };
  }
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

function answerWithinDeadline(
  work: Promise<TraccarIngestOutcome>,
  gate: { expire(): boolean },
  timeoutMs: number,
): Promise<TraccarIngestOutcome> {
  return new Promise<TraccarIngestOutcome>((resolve, reject) => {
    const timer = setTimeout(() => {
      // 503 só se a porta estava aberta e FECHOU agora: daqui em diante o trabalho não grava mais nada. Com a porta
      // já tomada, o trabalho está gravando: espera o desfecho real (um 503 aqui mentiria para o Traccar).
      if (gate.expire()) resolve({ kind: "unavailable", reason: "timeout" });
    }, timeoutMs);
    // O trabalho que perdeu a corrida não vira rejeição sem tratador: os dois ramos estão presos aqui.
    work.then(
      (outcome) => {
        clearTimeout(timer);
        resolve(outcome);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
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

    const gate = createTraccarCommitGate(Date.now() + deps.timeoutMs);
    const work = (async () => deps.ingest(command, gate.deadline))();
    // A vaga do limitador cobre o TRABALHO, não só a resposta: o 503 por tempo sai antes de ele terminar.
    holdTraccarSlotUntil(response, work);
    const outcome = await answerWithinDeadline(work, gate, deps.timeoutMs);
    const { status, code } = traccarIngestResponse(outcome);
    if (code === undefined) {
      response.status(status).end();
      return;
    }
    response.status(status).json(errorBody(code));
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
