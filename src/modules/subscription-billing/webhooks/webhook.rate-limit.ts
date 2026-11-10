// B-ASS-08 · F2 — limitadores do webhook (plano §4.8 S11, R-WH-6), sem dependência nova, relógio injetável:
//
//   (a) limitador de FALHAS por IP: 20 respostas 401 por IP em 10 min → o 21º pedido do mesmo IP leva 429, só para
//       aquele IP. Quem não tem o segredo não consome a cota do provedor legítimo.
//   (b) teto GLOBAL por provedor: no máximo 600 em QUALQUER janela de 60 s (janela deslizante, mesma forma do limitador
//       de falhas por IP deste arquivo) — a 601ª no minuto → 429, com relógio real. Conserto J-522 (C1-01 / E2): o token
//       bucket de recarga contínua liberava fichas DURANTE a rajada (600 POSTs em ~0,5 s ≈ 4,8 fichas) e a 601ª passava.

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
  /** Aceita o pedido se o provedor tem menos de 600 aceitos nos últimos 60 s (janela deslizante); `false` → 429, e o
   * pedido recusado NÃO conta na janela. */
  allowGlobal(provider: string): boolean;
  /** Registra uma falha de autenticidade (401) daquele IP. */
  recordFailure(ip: string): void;
};

export function createWebhookRateLimiter(options: WebhookRateLimiterOptions = {}): WebhookRateLimiter {
  const now = options.now ?? (() => Date.now());
  const windowMs = options.failureWindowMs ?? WEBHOOK_FAILURE_WINDOW_MS;
  const threshold = options.failureThreshold ?? WEBHOOK_FAILURE_THRESHOLD;
  const perMinute = options.globalPerMinute ?? WEBHOOK_GLOBAL_PER_MINUTE;
  const globalWindowMs = 60_000;

  const failures = new Map<string, number[]>(); // ip → timestamps de 401 na janela
  const accepted = new Map<string, number[]>(); // provider → timestamps dos pedidos ACEITOS nos últimos 60 s (≤ perMinute)

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
      const cutoff = current - globalWindowMs;
      const kept = (accepted.get(provider) ?? []).filter((at) => at > cutoff);
      if (kept.length >= perMinute) {
        accepted.set(provider, kept);
        return false; // 601ª em qualquer janela de 60 s → 429; a recusada não entra na janela
      }
      kept.push(current);
      accepted.set(provider, kept);
      return true;
    },
    recordFailure(ip: string): void {
      const kept = prune(ip);
      kept.push(now());
      failures.set(ip, kept);
    },
  };
}
