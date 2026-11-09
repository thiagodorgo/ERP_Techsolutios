// B-ASS-08 · F2 — limitadores do webhook (plano §4.8 S11, R-WH-6), sem dependência nova (mesma forma do
// token bucket de `traccar-rate-limit.ts`, relógio injetável):
//
//   (a) limitador de FALHAS por IP: 20 respostas 401 por IP em 10 min → o 21º pedido do mesmo IP leva 429, só para
//       aquele IP. Quem não tem o segredo não consome a cota do provedor legítimo.
//   (b) teto GLOBAL por provedor: 600 pedidos/min (token bucket), proteção de DoS.

export const WEBHOOK_FAILURE_WINDOW_MS = 10 * 60 * 1000;
export const WEBHOOK_FAILURE_THRESHOLD = 20;
export const WEBHOOK_GLOBAL_PER_MINUTE = 600;

export type WebhookRateLimiterOptions = {
  readonly now?: () => number;
  readonly failureWindowMs?: number;
  readonly failureThreshold?: number;
  readonly globalPerMinute?: number;
};

export type WebhookRateLimiter = {
  /** O IP já estourou o limite de falhas na janela? (checado ANTES de verificar — não gasta trabalho). */
  isIpBlocked(ip: string): boolean;
  /** Consome 1 ficha do balde global do provedor; `false` quando o teto do minuto foi excedido. */
  allowGlobal(provider: string): boolean;
  /** Registra uma falha de autenticidade (401) daquele IP. */
  recordFailure(ip: string): void;
};

export function createWebhookRateLimiter(options: WebhookRateLimiterOptions = {}): WebhookRateLimiter {
  const now = options.now ?? (() => Date.now());
  const windowMs = options.failureWindowMs ?? WEBHOOK_FAILURE_WINDOW_MS;
  const threshold = options.failureThreshold ?? WEBHOOK_FAILURE_THRESHOLD;
  const perMinute = options.globalPerMinute ?? WEBHOOK_GLOBAL_PER_MINUTE;
  const refillPerMs = perMinute / 60_000;

  const failures = new Map<string, number[]>(); // ip → timestamps de 401 na janela
  const buckets = new Map<string, { tokens: number; lastRefill: number }>();

  function prune(ip: string): number[] {
    const cutoff = now() - windowMs;
    const kept = (failures.get(ip) ?? []).filter((at) => at > cutoff);
    failures.set(ip, kept);
    return kept;
  }

  return {
    isIpBlocked(ip: string): boolean {
      return prune(ip).length >= threshold;
    },
    allowGlobal(provider: string): boolean {
      const current = now();
      const bucket = buckets.get(provider) ?? { tokens: perMinute, lastRefill: current };
      const elapsed = Math.max(0, current - bucket.lastRefill);
      bucket.tokens = Math.min(perMinute, bucket.tokens + elapsed * refillPerMs);
      bucket.lastRefill = current;
      if (bucket.tokens < 1) {
        buckets.set(provider, bucket);
        return false;
      }
      bucket.tokens -= 1;
      buckets.set(provider, bucket);
      return true;
    },
    recordFailure(ip: string): void {
      const kept = prune(ip);
      kept.push(now());
      failures.set(ip, kept);
    },
  };
}
