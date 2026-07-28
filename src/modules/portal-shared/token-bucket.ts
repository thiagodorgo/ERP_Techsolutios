// Ω5P PR-16 — rate-limit token-bucket IN-PROCESS, zero-dep (PD-Ω5P-ANTIBOT). Store PLUGÁVEL: a lógica não
// conhece o backing store, então trocar Map→Redis em Ω6 (multi-instância) é 1 adaptador, sem mexer no algoritmo.
// OWASP API4:2023 (Unrestricted Resource Consumption): limitar por identidade (placa) E por IP.

export type BucketState = {
  readonly tokens: number;
  readonly lastRefillMs: number;
};

// Store plugável (in-process no MVP; Redis-ready). Síncrono de propósito — o balde vive no processo.
export interface TokenBucketStore {
  get(key: string): BucketState | undefined;
  set(key: string, state: BucketState): void;
  // Manutenção/teste: limpar tudo (nunca usado no caminho quente).
  clear(): void;
}

export class InMemoryTokenBucketStore implements TokenBucketStore {
  private readonly map = new Map<string, BucketState>();
  get(key: string): BucketState | undefined {
    return this.map.get(key);
  }
  set(key: string, state: BucketState): void {
    this.map.set(key, state);
  }
  clear(): void {
    this.map.clear();
  }
}

export type TokenBucketConfig = {
  readonly capacity: number; // máximo de tokens (rajada)
  readonly refillTokens: number; // quantos tokens repõe por janela
  readonly refillIntervalMs: number; // tamanho da janela de reposição
};

export class TokenBucket {
  constructor(
    private readonly store: TokenBucketStore,
    private readonly config: TokenBucketConfig,
  ) {}

  // Repõe proporcional ao tempo decorrido (contínuo, sem "borda" de janela) e persiste o estado reposto.
  private refill(key: string, nowMs: number): BucketState {
    const current = this.store.get(key) ?? { tokens: this.config.capacity, lastRefillMs: nowMs };
    const elapsed = Math.max(0, nowMs - current.lastRefillMs);
    const rate = this.config.refillTokens / this.config.refillIntervalMs; // tokens por ms
    const refilled = Math.min(this.config.capacity, current.tokens + elapsed * rate);
    const next: BucketState = { tokens: refilled, lastRefillMs: nowMs };
    this.store.set(key, next);
    return next;
  }

  // PEEK (não consome): há token disponível? Persiste a reposição (idempotente sob leitura).
  wouldAllow(key: string, nowMs: number): boolean {
    return this.refill(key, nowMs).tokens >= 1;
  }

  // Consome 1 token (assume wouldAllow verdadeiro; clampa em 0 por segurança).
  consume(key: string, nowMs: number): void {
    const state = this.refill(key, nowMs);
    this.store.set(key, { tokens: Math.max(0, state.tokens - 1), lastRefillMs: nowMs });
  }
}
