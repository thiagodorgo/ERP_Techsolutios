import {
  InMemoryTokenBucketStore,
  TokenBucket,
  type TokenBucketConfig,
  type TokenBucketStore,
} from "./token-bucket.js";

// Ω5P PR-16 — COORDENADOR anti-abuso da superfície pública (PD-Ω5P-ANTIBOT): compõe (1) rate-limit por IP E por
// placa — "o mais restritivo vence" (OWASP API4) — e (2) a dificuldade PROGRESSIVA do PoW pelo histórico de
// FALHAS do IP. In-process, zero-dep; stores plugáveis (Redis-ready em Ω6). Reusável pelo authority-portal (PR-18).

export type AntiAbuseConfig = {
  readonly ipBucket: TokenBucketConfig;
  readonly plateBucket: TokenBucketConfig;
  // HIGH-1 — rate-limit BARATO do /challenge por IP (independente do balde de lookup). OPCIONAL: default aplicado
  // no construtor, para não quebrar construções pré-existentes de AntiAbuseConfig.
  readonly challengeBucket?: TokenBucketConfig;
  readonly baseDifficulty: number; // nibbles hex exigidos sem histórico de falha
  readonly maxDifficulty: number; // teto (evita travar cliente legítimo lento)
  readonly failuresPerStep: number; // nº de falhas do IP que sobe 1 nibble de dificuldade
  readonly failureWindowMs: number; // janela do contador de falhas do IP
};

// Default do balde do /challenge: rajada de 60 desafios por IP, reposição de 60 a cada 5 min. Folgado para o
// cliente legítimo (que resolve 1 PoW por consulta), apertado o bastante para conter flood de emissão/log.
const DEFAULT_CHALLENGE_BUCKET: TokenBucketConfig = { capacity: 60, refillTokens: 60, refillIntervalMs: 5 * 60 * 1000 };

export const OWNER_ANTI_ABUSE_DEFAULTS: AntiAbuseConfig = {
  // 30 tentativas/IP com reposição de 30 a cada 5 min (rajada 30).
  ipBucket: { capacity: 30, refillTokens: 30, refillIntervalMs: 5 * 60 * 1000 },
  // 6 tentativas/placa com reposição de 6 a cada 10 min — brute-force de Renavach numa placa fica inviável.
  plateBucket: { capacity: 6, refillTokens: 6, refillIntervalMs: 10 * 60 * 1000 },
  challengeBucket: DEFAULT_CHALLENGE_BUCKET,
  baseDifficulty: 4,
  maxDifficulty: 6,
  failuresPerStep: 3,
  failureWindowMs: 10 * 60 * 1000,
};

type FailureState = { count: number; windowStartMs: number };

export class AntiAbuse {
  private readonly ipBucket: TokenBucket;
  private readonly plateBucket: TokenBucket;
  private readonly challengeBucket: TokenBucket;
  private readonly failures = new Map<string, FailureState>();
  private readonly ipStore: TokenBucketStore;
  private readonly plateStore: TokenBucketStore;
  private readonly challengeStore: TokenBucketStore;

  constructor(
    private readonly config: AntiAbuseConfig,
    stores?: { ip?: TokenBucketStore; plate?: TokenBucketStore; challenge?: TokenBucketStore },
  ) {
    this.ipStore = stores?.ip ?? new InMemoryTokenBucketStore();
    this.plateStore = stores?.plate ?? new InMemoryTokenBucketStore();
    this.challengeStore = stores?.challenge ?? new InMemoryTokenBucketStore();
    this.ipBucket = new TokenBucket(this.ipStore, config.ipBucket);
    this.plateBucket = new TokenBucket(this.plateStore, config.plateBucket);
    this.challengeBucket = new TokenBucket(this.challengeStore, config.challengeBucket ?? DEFAULT_CHALLENGE_BUCKET);
  }

  // Dificuldade do PoW a emitir para este IP: base + degraus pelas falhas recentes, capado no teto.
  difficultyFor(ipHash: string, nowMs: number): number {
    const state = this.failures.get(ipHash);
    const active = state && nowMs - state.windowStartMs <= this.config.failureWindowMs ? state.count : 0;
    const steps = Math.floor(active / this.config.failuresPerStep);
    return Math.min(this.config.maxDifficulty, this.config.baseDifficulty + steps);
  }

  // Uma falha do IP (PoW inválida/expirada/reusada) → sobe o contador (na janela) → dificuldade cresce.
  registerFailure(ipHash: string, nowMs: number): void {
    const state = this.failures.get(ipHash);
    if (!state || nowMs - state.windowStartMs > this.config.failureWindowMs) {
      this.failures.set(ipHash, { count: 1, windowStartMs: nowMs });
      return;
    }
    this.failures.set(ipHash, { count: state.count + 1, windowStartMs: state.windowStartMs });
  }

  // "O mais restritivo vence": limita se O IP OU A PLACA estiverem sem token. PEEK antes de consumir → um pedido
  // negado NÃO drena o balde do outro (evita um IP esgotar o balde da placa da vítima e vice-versa).
  checkRate(ipHash: string, plateKey: string, nowMs: number): { limited: boolean } {
    const ipOk = this.ipBucket.wouldAllow(ipHash, nowMs);
    const plateOk = this.plateBucket.wouldAllow(plateKey, nowMs);
    if (!ipOk || !plateOk) return { limited: true };
    this.ipBucket.consume(ipHash, nowMs);
    this.plateBucket.consume(plateKey, nowMs);
    return { limited: false };
  }

  // HIGH-1 — rate-limit do /challenge por IP: balde dedicado (não drena o de lookup). Estourou → limited=true e o
  // serviço barra a emissão/log ANTES de tocar o challenge store ou o PortalAccessLog.
  checkChallengeRate(ipHash: string, nowMs: number): { limited: boolean } {
    if (!this.challengeBucket.wouldAllow(ipHash, nowMs)) return { limited: true };
    this.challengeBucket.consume(ipHash, nowMs);
    return { limited: false };
  }

  reset(): void {
    this.failures.clear();
    this.ipStore.clear();
    this.plateStore.clear();
    this.challengeStore.clear();
  }
}
