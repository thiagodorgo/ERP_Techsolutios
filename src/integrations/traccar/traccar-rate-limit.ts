// B-TRC-01 · limite de taxa e de concorrência da ingestão (plano v2.1 §4.6; A2-11). Por processo, sem dependência
// nova, relógio injetável. Token bucket: `burst` fichas iniciais, reposição de `ratePerSecond` por segundo, teto
// `burst`. Concorrência: no máximo `maxConcurrency` requisições em processamento. Quem passar de qualquer um dos dois
// recebe 429 (o Traccar repete com atraso crescente). A vaga é devolvida uma vez só, quando a resposta terminou E o
// trabalho que ela disparou também terminou (`holdTraccarSlotUntil`); sem trabalho preso, no fim da resposta.

import type { RequestHandler, Response } from "express";

export type TraccarIngestLimiterOptions = {
  readonly ratePerSecond: number;
  readonly burst: number;
  readonly maxConcurrency: number;
  readonly now?: () => number;
};

export type TraccarIngestSlot =
  | { readonly ok: true; readonly release: () => void }
  | { readonly ok: false; readonly reason: "rate" | "concurrency" };

export type TraccarIngestLimiter = {
  tryEnter(): TraccarIngestSlot;
  inFlight(): number;
};

export function createTraccarIngestLimiter(options: TraccarIngestLimiterOptions): TraccarIngestLimiter {
  const now = options.now ?? (() => Date.now());
  const capacity = Math.max(1, options.burst);
  const refillPerMs = Math.max(0, options.ratePerSecond) / 1000;
  let tokens = capacity;
  let lastRefill = now();
  let active = 0;

  function refill(): void {
    const current = now();
    const elapsed = Math.max(0, current - lastRefill);
    lastRefill = current;
    tokens = Math.min(capacity, tokens + elapsed * refillPerMs);
  }

  return {
    tryEnter(): TraccarIngestSlot {
      if (active >= options.maxConcurrency) {
        return { ok: false, reason: "concurrency" };
      }
      refill();
      if (tokens < 1) {
        return { ok: false, reason: "rate" };
      }
      tokens -= 1;
      active += 1;
      let released = false;
      return {
        ok: true,
        release: () => {
          if (released) return;
          released = true;
          active -= 1;
        },
      };
    },
    inFlight: () => active,
  };
}

const SLOT_HOLD_LOCAL = "traccarIngestSlotHold";

type TraccarSlotHold = { until(work: Promise<unknown>): void };

export function traccarRateLimitMiddleware(limiter: TraccarIngestLimiter): RequestHandler {
  return (_request, response, next) => {
    const slot = limiter.tryEnter();
    if (!slot.ok) {
      response.status(429).json({ error: { code: "rate_limited" } });
      return;
    }
    // Conserto do 503 (pré-revisão do #426, Achado 1): a vaga cobre a requisição E o trabalho que ela disparou. O 503
    // por tempo e o cliente que desconecta (`close`) chegam antes de o trabalho terminar; se a vaga voltasse ali,
    // `maxConcurrency` limitaria respostas, não trabalho no banco. Sem trabalho preso (422, 4xx do parser), volta no
    // fim da resposta, como antes. O handler prende o trabalho de forma síncrona, antes de qualquer `await`.
    let work: Promise<unknown> | undefined;
    const hold: TraccarSlotHold = {
      until(pending) {
        work = pending;
      },
    };
    response.locals[SLOT_HOLD_LOCAL] = hold;
    const release = slot.release;
    const releaseWhenWorkEnds = () => {
      if (!work) {
        release();
        return;
      }
      work.then(release, release);
    };
    response.once("finish", releaseWhenWorkEnds);
    response.once("close", releaseWhenWorkEnds);
    next();
  };
}

/** Prende a vaga do limitador desta resposta ao fim de `work` (sem efeito fora do middleware). */
export function holdTraccarSlotUntil(response: Response, work: Promise<unknown>): void {
  const hold = response.locals[SLOT_HOLD_LOCAL] as TraccarSlotHold | undefined;
  hold?.until(work);
}
