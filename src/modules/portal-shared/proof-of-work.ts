import { createHash, randomBytes } from "node:crypto";

// Ω5P PR-16 — PROOF-OF-WORK SHA-256 estilo Altcha REIMPLEMENTADO À MÃO (PD-Ω5P-ANTIBOT). Anti-bot SEM
// credencial/serviço externo: o servidor EMITE um desafio {salt, difficulty}; o cliente (Web Worker do PWA)
// procura um `solution` inteiro tal que sha256(salt‖':'‖solution) tenha `difficulty` NIBBLES hex zero à esquerda;
// o servidor VERIFICA em O(1). Custo assimétrico (caro de resolver, barato de checar). Zero-dep (node:crypto).
//
// NÃO adotar a lib Altcha/mCaptcha como dependência (viraria "dependência nova" → junta-5); o algoritmo SHA-256
// é trivial de reimplementar. Desafio STATEFUL num store in-process → dá de graça: expiração + USO ÚNICO
// (anti-replay). Um challengeId forjado simplesmente não está no store → rejeitado (o store É a fonte de verdade).

export type PowChallenge = {
  readonly challengeId: string;
  readonly salt: string;
  readonly difficulty: number; // nibbles hex zero exigidos no prefixo
  readonly expiresAt: string; // ISO
};

type StoredChallenge = {
  readonly salt: string;
  readonly difficulty: number;
  readonly expiresAtMs: number;
  consumed: boolean;
};

export type PowVerifyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "unknown" | "expired" | "reused" | "wrong_solution" };

// Store PLUGÁVEL do desafio (in-process no MVP; Redis-ready em Ω6). Guarda salt/difficulty/expiry/consumed.
export interface ChallengeStore {
  put(challengeId: string, value: StoredChallenge): void;
  get(challengeId: string): StoredChallenge | undefined;
  delete(challengeId: string): void;
  clear(): void;
}

// HIGH-1 — teto DURO do store in-process (defesa de disponibilidade contra flood de /challenge). Sem isto o Map
// cresceria sem limite (OOM). O rate-limit por IP no /challenge já contém a TAXA de emissão; o cap aqui é o cinto
// de segurança se muitos IPs distintos emitirem. Redis compartilhado com TTL nativo é Ω6.
export const CHALLENGE_STORE_MAX_ENTRIES = 50_000;

export class InMemoryChallengeStore implements ChallengeStore {
  private readonly map = new Map<string, StoredChallenge>();

  constructor(private readonly maxEntries: number = CHALLENGE_STORE_MAX_ENTRIES) {}

  put(challengeId: string, value: StoredChallenge): void {
    // Eviction PREGUIÇOSA: só varre quando o Map atinge o teto (custo amortizado ~zero no caminho quente). Primeiro
    // remove expirados/consumidos (lixo real); se ainda cheio, descarta os mais ANTIGOS (FIFO — Map preserva ordem
    // de inserção) até caber. Garante que o Map JAMAIS ultrapassa maxEntries.
    if (this.map.size >= this.maxEntries) this.evict();
    this.map.set(challengeId, value);
  }
  get(challengeId: string): StoredChallenge | undefined {
    return this.map.get(challengeId);
  }
  delete(challengeId: string): void {
    this.map.delete(challengeId);
  }
  clear(): void {
    this.map.clear();
  }
  // Exposto para teste/observabilidade — prova que o store não cresce indefinidamente.
  size(): number {
    return this.map.size;
  }

  private evict(): void {
    const nowMs = Date.now();
    for (const [id, entry] of this.map) {
      if (entry.consumed || nowMs > entry.expiresAtMs) this.map.delete(id);
    }
    // Se a varredura de expirados não abriu espaço (todos ainda vivos), corta os mais antigos por FIFO.
    if (this.map.size >= this.maxEntries) {
      const overflow = this.map.size - this.maxEntries + 1;
      let removed = 0;
      for (const id of this.map.keys()) {
        this.map.delete(id);
        removed += 1;
        if (removed >= overflow) break;
      }
    }
  }
}

export const POW_DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 min — janela curta (sessão de desafio efêmera)

function hasLeadingZeroNibbles(hashHex: string, difficulty: number): boolean {
  if (difficulty <= 0) return true;
  for (let i = 0; i < difficulty; i += 1) {
    if (hashHex[i] !== "0") return false;
  }
  return true;
}

// O hash canônico do PoW (servidor e cliente calculam O MESMO). solution é inteiro serializado como string.
export function powDigest(salt: string, solution: string): string {
  return createHash("sha256").update(`${salt}:${solution}`, "utf8").digest("hex");
}

// Emite um desafio e o REGISTRA no store (fonte de verdade de expiração + uso único). difficulty vem de fora
// (progressiva pelo histórico de falhas do IP — resolvida no serviço do portal).
export function issueChallenge(
  store: ChallengeStore,
  difficulty: number,
  ttlMs: number,
  nowMs: number,
): PowChallenge {
  const challengeId = randomBytes(16).toString("hex");
  const salt = randomBytes(16).toString("hex");
  const expiresAtMs = nowMs + ttlMs;
  store.put(challengeId, { salt, difficulty, expiresAtMs, consumed: false });
  return { challengeId, salt, difficulty, expiresAt: new Date(expiresAtMs).toISOString() };
}

// Verifica a solução e CONSOME o desafio (uso único). Falha genérica classificada só para o log interno (I10):
// unknown (forjado/desconhecido) · expired · reused (replay) · wrong_solution. NUNCA vaza a razão na resposta.
export function verifySolution(
  store: ChallengeStore,
  input: { challengeId: string; solution: string },
  nowMs: number,
): PowVerifyResult {
  const stored = store.get(input.challengeId);
  if (!stored) return { ok: false, reason: "unknown" };
  if (stored.consumed) return { ok: false, reason: "reused" };
  if (nowMs > stored.expiresAtMs) {
    store.delete(input.challengeId);
    return { ok: false, reason: "expired" };
  }
  // Marca consumido ANTES de checar a solução → uma solução errada também queima o desafio (anti brute-force do
  // mesmo challengeId; o cliente pede um novo desafio a cada tentativa).
  stored.consumed = true;
  store.put(input.challengeId, stored);
  const digest = powDigest(stored.salt, input.solution);
  if (!hasLeadingZeroNibbles(digest, stored.difficulty)) {
    return { ok: false, reason: "wrong_solution" };
  }
  store.delete(input.challengeId);
  return { ok: true };
}

// Referência do solver (usada pelos testes e espelhada no Web Worker do PWA). Brute-force incremental.
export function solveChallenge(salt: string, difficulty: number, maxIterations = 5_000_000): string {
  for (let n = 0; n < maxIterations; n += 1) {
    const candidate = String(n);
    if (hasLeadingZeroNibbles(powDigest(salt, candidate), difficulty)) return candidate;
  }
  throw new Error("PoW solution not found within maxIterations");
}

export { hasLeadingZeroNibbles };
