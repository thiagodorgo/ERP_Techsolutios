// B-ASS-08 · F1 — porta de persistência da outbox + dublê em memória. O Prisma (F10/F11) implementa a mesma porta:
// `claimNext` faz `UPDATE … WHERE id = (SELECT id … FOR UPDATE SKIP LOCKED LIMIT 1)` numa transação curta.
// O dublê serializa os claims (uma fila global) para reproduzir o SKIP LOCKED sem corrida.

import { randomUUID } from "node:crypto";

import {
  idempotencyKeyOf,
  type BillingOutboxRow,
  type NewOutboxRow,
  type OutboxSkipReason,
  type OutboxStatus,
} from "./outbox.types.js";

export type ClaimParams = {
  readonly enabledProviders: readonly string[];
  readonly now: Date;
  readonly claimedBy: string;
  readonly orphanMs: number;
};

export type ClaimResult = { readonly row: BillingOutboxRow; readonly wasOrphan: boolean };

export interface OutboxRepository {
  /** `INSERT … ON CONFLICT (idempotency_key) DO NOTHING` — devolve a existente se já houver. */
  enqueue(input: NewOutboxRow, now: Date): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }>;
  /** Transação curta do claim: marca PROCESSING a linha mais antiga elegível (PENDING vencida de provedor ligado,
   * ou PROCESSING órfã). `null` se nada elegível. NUNCA faz rede. */
  claimNext(params: ClaimParams): Promise<ClaimResult | null>;
  // Mutações por id: tenant-scoped. Sob FORCE RLS, o registro roda em `withTenantRlsBudget(tenantId)` (transação curta
  // própria, separada do claim e do fetch — G8). O dublê valida o tenant como o RLS faria (linha de outra organização =
  // inexistente). O chamador (dispatcher) tem o `tenantId` da linha reclamada.
  markSent(tenantId: string, id: string, externalId: string | null, now: Date): Promise<void>;
  /** Volta a PENDING com nova janela (retry de erro transitório / 429). */
  reschedule(tenantId: string, id: string, nextAttemptAt: Date, lastError: string | null, now: Date): Promise<void>;
  markFailed(tenantId: string, id: string, lastError: string | null, now: Date): Promise<void>;
  markNeedsReview(tenantId: string, id: string, lastError: string | null, now: Date): Promise<void>;
  markSkipped(tenantId: string, id: string, skipReason: OutboxSkipReason, now: Date): Promise<void>;
  /** Visibilidade (D5/R-OBX-4): marca `skip_reason = provider_disabled` nas PENDING de provedor desligado, SEM rede e
   * SEM mudar o status. Escrita de PLATAFORMA sobre tabela FORCE → `forEachTenantRls` no Prisma. Devolve quantas marcou. */
  markDisabledProvidersVisible(enabledProviders: readonly string[], now: Date): Promise<number>;
  /** `retry` reabre uma FAILED → PENDING (attempts zerado, erro limpo); o claim seguinte revalida (D2). */
  retry(tenantId: string, id: string, now: Date): Promise<BillingOutboxRow | undefined>;
  findById(tenantId: string, id: string): Promise<BillingOutboxRow | undefined>;
  /** Leitura de PLATAFORMA (tela de outbox) sobre tabela FORCE → `forEachTenantRls` no Prisma. */
  listByStatus(status?: OutboxStatus, provider?: string): Promise<readonly BillingOutboxRow[]>;
  listByStatement(tenantId: string, statementId: string): Promise<readonly BillingOutboxRow[]>;
}

export class InMemoryOutboxRepository implements OutboxRepository {
  readonly #rows = new Map<string, BillingOutboxRow>();
  readonly #byKey = new Map<string, string>();
  #claimGate: Promise<unknown> = Promise.resolve();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async enqueue(input: NewOutboxRow, now: Date): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }> {
    const key = idempotencyKeyOf(input.kind, input.statementId, input.seq);
    const existingId = this.#byKey.get(key);
    if (existingId) {
      return { row: this.#rows.get(existingId)!, created: false };
    }
    const row: BillingOutboxRow = {
      id: randomUUID(),
      tenantId: input.tenantId,
      statementId: input.statementId,
      kind: input.kind,
      provider: input.provider,
      idempotencyKey: key,
      providerIdempotencyKey: input.providerIdempotencyKey ?? randomUUID(),
      payload: { ...(input.payload ?? {}) },
      status: "PENDING",
      skipReason: null,
      claimedAt: null,
      claimedBy: null,
      attemptStartedAt: null,
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      externalId: null,
      occurredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    this.#rows.set(row.id, row);
    this.#byKey.set(key, row.id);
    return { row, created: true };
  }

  async claimNext(params: ClaimParams): Promise<ClaimResult | null> {
    // Serializa os claims para emular `FOR UPDATE SKIP LOCKED` sem dois claims pegarem a mesma linha.
    const previous = this.#claimGate;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    this.#claimGate = previous.then(() => gate);
    await previous.catch(() => undefined);
    try {
      return this.#claimLocked(params);
    } finally {
      release();
    }
  }

  #claimLocked(params: ClaimParams): ClaimResult | null {
    const enabled = new Set(params.enabledProviders);
    const nowMs = params.now.getTime();
    const candidates = [...this.#rows.values()]
      .filter((row) => enabled.has(row.provider))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const orphanCutoff = nowMs - params.orphanMs;
    // Órfã primeiro (crash entre chamada e registro): PROCESSING parada além do limite.
    const orphan = candidates.find(
      (row) => row.status === "PROCESSING" && (row.attemptStartedAt?.getTime() ?? 0) <= orphanCutoff,
    );
    const target =
      orphan ??
      candidates.find(
        (row) => row.status === "PENDING" && (row.nextAttemptAt === null || row.nextAttemptAt.getTime() <= nowMs),
      );
    if (!target) return null;
    const wasOrphan = target.status === "PROCESSING";
    const claimed: BillingOutboxRow = {
      ...target,
      status: "PROCESSING",
      claimedAt: params.now,
      claimedBy: params.claimedBy,
      attemptStartedAt: params.now,
      attempts: target.attempts + 1,
      updatedAt: params.now,
    };
    this.#rows.set(claimed.id, claimed);
    return { row: claimed, wasOrphan };
  }

  async markSent(tenantId: string, id: string, externalId: string | null, now: Date): Promise<void> {
    this.#patch(tenantId, id, { status: "SENT", externalId, nextAttemptAt: null, lastError: null, updatedAt: now });
  }

  async reschedule(tenantId: string, id: string, nextAttemptAt: Date, lastError: string | null, now: Date): Promise<void> {
    this.#patch(tenantId, id, { status: "PENDING", nextAttemptAt, lastError, claimedAt: null, claimedBy: null, attemptStartedAt: null, updatedAt: now });
  }

  async markFailed(tenantId: string, id: string, lastError: string | null, now: Date): Promise<void> {
    this.#patch(tenantId, id, { status: "FAILED", lastError, nextAttemptAt: null, updatedAt: now });
  }

  async markNeedsReview(tenantId: string, id: string, lastError: string | null, now: Date): Promise<void> {
    this.#patch(tenantId, id, { status: "NEEDS_REVIEW", lastError, nextAttemptAt: null, updatedAt: now });
  }

  async markSkipped(tenantId: string, id: string, skipReason: OutboxSkipReason, now: Date): Promise<void> {
    this.#patch(tenantId, id, { status: "SKIPPED", skipReason, nextAttemptAt: null, updatedAt: now });
  }

  async markDisabledProvidersVisible(enabledProviders: readonly string[], now: Date): Promise<number> {
    const enabled = new Set(enabledProviders);
    let marked = 0;
    for (const row of this.#rows.values()) {
      if (row.status === "PENDING" && !enabled.has(row.provider) && row.skipReason !== "provider_disabled") {
        this.#rows.set(row.id, { ...row, skipReason: "provider_disabled", updatedAt: now });
        marked += 1;
      }
    }
    return marked;
  }

  async retry(tenantId: string, id: string, now: Date): Promise<BillingOutboxRow | undefined> {
    const row = this.#rows.get(id);
    if (!row || row.tenantId !== tenantId || row.status !== "FAILED") return undefined;
    const reopened: BillingOutboxRow = {
      ...row,
      status: "PENDING",
      attempts: 0,
      lastError: null,
      skipReason: null,
      nextAttemptAt: now,
      claimedAt: null,
      claimedBy: null,
      attemptStartedAt: null,
      updatedAt: now,
    };
    this.#rows.set(id, reopened);
    return reopened;
  }

  async findById(tenantId: string, id: string): Promise<BillingOutboxRow | undefined> {
    const row = this.#rows.get(id);
    return row && row.tenantId === tenantId ? row : undefined;
  }

  async listByStatus(status?: OutboxStatus, provider?: string): Promise<readonly BillingOutboxRow[]> {
    return [...this.#rows.values()]
      .filter((row) => (status ? row.status === status : true) && (provider ? row.provider === provider : true))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async listByStatement(tenantId: string, statementId: string): Promise<readonly BillingOutboxRow[]> {
    return [...this.#rows.values()].filter((row) => row.tenantId === tenantId && row.statementId === statementId);
  }

  // O dublê valida o tenant como o RLS faria: linha de outra organização = inexistente (fail-closed).
  #patch(tenantId: string, id: string, patch: Partial<BillingOutboxRow>): void {
    const row = this.#rows.get(id);
    if (!row || row.tenantId !== tenantId) throw new Error(`outbox row ${id} not found for tenant`);
    this.#rows.set(id, { ...row, ...patch });
  }
}
