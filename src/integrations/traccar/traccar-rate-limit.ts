// B-TRC-01 · limite de taxa e de concorrência da ingestão (plano v2.1 §4.6; A2-11). Por processo, sem dependência
// nova, relógio injetável. Token bucket: `burst` fichas iniciais, reposição de `ratePerSecond` por segundo, teto
// `burst`. Concorrência: no máximo `maxConcurrency` requisições em processamento. Quem passar de qualquer um dos dois
// recebe 429 (o Traccar repete com atraso crescente). A vaga é devolvida uma vez só, no fim da resposta.

import type { RequestHandler } from "express";

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

export function traccarRateLimitMiddleware(limiter: TraccarIngestLimiter): RequestHandler {
  return (_request, response, next) => {
    const slot = limiter.tryEnter();
    if (!slot.ok) {
      response.status(429).json({ error: { code: "rate_limited" } });
      return;
    }
    response.once("finish", slot.release);
    response.once("close", slot.release);
    next();
  };
}
