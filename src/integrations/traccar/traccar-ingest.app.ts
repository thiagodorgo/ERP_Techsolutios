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
//
// B-TRC-02 (plano v2 §5.2, §6.6): a SEGUNDA rota, `POST /ingest/traccar/v1/events` (`event.forward`), nasce da MESMA fábrica
// (`mountIngestRoute`) e com a MESMA ordem de middlewares (1)–(7) e o MESMO autenticador. Diferenças declaradas: um limitador
// PRÓPRIO (`deps.eventLimiter`, mesmos valores de ambiente: a rajada de posições não cala o evento, que o Traccar não reenvia);
// tipo/código fora do catálogo → `ignored` (204, nada gravado, uma linha de log com `outcome`/`reason` e nunca o `type` cru).

import express, { type ErrorRequestHandler, type Express, type RequestHandler } from "express";
import pino, { type Logger } from "pino";

import { buildTraccarEventCommand, type TraccarEventCommand } from "./traccar-event.adapter.js";
import { parseTraccarEventEnvelope } from "./traccar-event.schema.js";
import { buildTraccarPositionCommand, type TraccarPositionCommand } from "./traccar-position.adapter.js";
import { parseTraccarPositionEnvelope, TraccarPayloadError } from "./traccar-position.schema.js";
import { traccarForwardAuthMiddleware, type TraccarForwardAuthenticator } from "./traccar-forward-auth.js";
import { createTraccarIngestHttpLogger } from "./traccar-ingest.logger.js";
import { holdTraccarSlotUntil, traccarRateLimitMiddleware, type TraccarIngestLimiter } from "./traccar-rate-limit.js";
import type { TraccarEventIgnoredReason } from "./traccar-telemetry-catalog.js";

export const TRACCAR_INGEST_PATH = "/ingest/traccar/v1/positions";
/** B-TRC-02 (plano v2 §5.2) — a rota do `event.forward`, no MESMO listener privado e com a mesma cadeia de middlewares. */
export const TRACCAR_EVENT_INGEST_PATH = "/ingest/traccar/v1/events";
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
  | { readonly kind: "ignored"; readonly reason: TraccarEventIgnoredReason }
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

export type TraccarEventIngestHandler = (
  command: TraccarEventCommand,
  deadline: TraccarIngestDeadline,
) => Promise<TraccarIngestOutcome>;

export type TraccarIngestAppDeps = {
  readonly authenticator: TraccarForwardAuthenticator;
  readonly limiter: TraccarIngestLimiter;
  readonly ingest: TraccarIngestHandler;
  /** B-TRC-02 — o limitador PRÓPRIO da rota de eventos (aditivo; ausente → a de eventos usa `limiter`). */
  readonly eventLimiter?: TraccarIngestLimiter;
  /** B-TRC-02 — o serviço do `event.forward`. Ausente → a rota de eventos não existe (404). */
  readonly ingestEvent?: TraccarEventIngestHandler;
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
    case "ignored":
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

  /**
   * Fábrica ÚNICA das rotas de ingestão (B-TRC-02): a mesma ordem fixa (1)–(7) para posição e evento. `prepare` faz o (6)
   * (schema allowlist → 422) e devolve o trabalho do (7), ou um desfecho já decidido sem serviço (o `ignored` do evento).
   */
  type Prepared =
    | { readonly kind: "work"; readonly run: (deadline: TraccarIngestDeadline) => Promise<TraccarIngestOutcome> }
    | { readonly kind: "done"; readonly outcome: TraccarIngestOutcome };
  const mountIngestRoute = (path: string, limiter: TraccarIngestLimiter, prepare: (body: unknown) => Prepared) => {
    const handle: RequestHandler = async (request, response) => {
      let prepared: Prepared;
      try {
        prepared = prepare(request.body);
      } catch (error) {
        if (error instanceof TraccarPayloadError) {
          response.status(error.statusCode).json(errorBody(error.code));
          return;
        }
        throw error;
      }

      let outcome: TraccarIngestOutcome;
      if (prepared.kind === "done") {
        outcome = prepared.outcome;
      } else {
        const gate = createTraccarCommitGate(Date.now() + deps.timeoutMs);
        const run = prepared.run;
        const work = (async () => run(gate.deadline))();
        // A vaga do limitador cobre o TRABALHO, não só a resposta: o 503 por tempo sai antes de ele terminar.
        holdTraccarSlotUntil(response, work);
        outcome = await answerWithinDeadline(work, gate, deps.timeoutMs);
      }
      if (outcome.kind === "ignored") {
        // Contado: uma linha estruturada; o `type` cru NUNCA (só o motivo fechado).
        request.log?.info({ outcome: "ignored", reason: outcome.reason }, "traccar event ignored");
      }
      const { status, code } = traccarIngestResponse(outcome);
      if (code === undefined) {
        response.status(status).end();
        return;
      }
      response.status(status).json(errorBody(code));
    };

    app.post(
      path,
      rejectQueryString,
      traccarForwardAuthMiddleware(deps.authenticator),
      requireJsonContentType,
      express.json({ limit: TRACCAR_INGEST_BODY_LIMIT, strict: true, type: "application/json" }),
      traccarRateLimitMiddleware(limiter),
      handle,
    );
  };

  mountIngestRoute(TRACCAR_INGEST_PATH, deps.limiter, (body) => {
    const command: TraccarPositionCommand = buildTraccarPositionCommand(parseTraccarPositionEnvelope(body), {
      instanceKey: deps.instanceKey,
      receivedAt: now(),
    });
    return { kind: "work", run: (deadline) => deps.ingest(command, deadline) };
  });

  const ingestEvent = deps.ingestEvent;
  if (ingestEvent) {
    mountIngestRoute(TRACCAR_EVENT_INGEST_PATH, deps.eventLimiter ?? deps.limiter, (body) => {
      const built = buildTraccarEventCommand(parseTraccarEventEnvelope(body), { instanceKey: deps.instanceKey, receivedAt: now() });
      if (built.kind === "ignored") return { kind: "done", outcome: { kind: "ignored", reason: built.reason } };
      const command = built.command;
      return { kind: "work", run: (deadline) => ingestEvent(command, deadline) };
    });
  }

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
