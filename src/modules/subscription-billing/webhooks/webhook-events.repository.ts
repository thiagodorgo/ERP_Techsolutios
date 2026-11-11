// B-ASS-08 · F2 — porta de `billing_webhook_events` + dublê em memória. O Prisma (F11) faz o mesmo `INSERT …
// ON CONFLICT (provider, external_event_id) DO NOTHING` (conflito → replay ignorado, 200).

import { randomUUID } from "node:crypto";

import type { BillingWebhookEvent, NewWebhookEvent, WebhookEventStatus } from "./webhook-events.types.js";

export interface WebhookEventRepository {
  /** `INSERT … ON CONFLICT (provider, external_event_id) DO NOTHING`. `created=false` = replay (devolve a linha). */
  insertIfAbsent(input: NewWebhookEvent, now: Date): Promise<{ readonly event: BillingWebhookEvent; readonly created: boolean }>;
  find(provider: string, externalEventId: string): Promise<BillingWebhookEvent | undefined>;
  markStatus(id: string, patch: {
    readonly status?: WebhookEventStatus;
    readonly resolvedTenantId?: string | null;
    readonly resolvedStatementId?: string | null;
    readonly error?: string | null;
    readonly incrementAttempts?: boolean;
  }): Promise<BillingWebhookEvent | undefined>;
  listByProvider(provider: string): Promise<readonly BillingWebhookEvent[]>;
  /** Eventos `received` sem job concluído há mais de `olderThanMs` (retomados pelo poll-pending, R-WH-8). */
  listStale(olderThanMs: number, now: Date): Promise<readonly BillingWebhookEvent[]>;
}

export class InMemoryWebhookEventRepository implements WebhookEventRepository {
  readonly #rows = new Map<string, BillingWebhookEvent>();
  readonly #byKey = new Map<string, string>();

  #key(provider: string, externalEventId: string): string {
    return `${provider}::${externalEventId}`;
  }

  async insertIfAbsent(input: NewWebhookEvent, now: Date): Promise<{ readonly event: BillingWebhookEvent; readonly created: boolean }> {
    const key = this.#key(input.provider, input.externalEventId);
    const existingId = this.#byKey.get(key);
    if (existingId) {
      return { event: this.#rows.get(existingId)!, created: false };
    }
    const event: BillingWebhookEvent = {
      id: randomUUID(),
      provider: input.provider,
      externalEventId: input.externalEventId,
      receivedAt: now,
      bodyDigest: input.bodyDigest,
      signatureOk: input.signatureOk,
      externalResourceId: input.externalResourceId,
      externalReference: input.externalReference,
      status: "received",
      jobAttempts: 0,
      resolvedTenantId: null,
      resolvedStatementId: null,
      error: null,
    };
    this.#rows.set(event.id, event);
    this.#byKey.set(key, event.id);
    return { event, created: true };
  }

  async find(provider: string, externalEventId: string): Promise<BillingWebhookEvent | undefined> {
    const id = this.#byKey.get(this.#key(provider, externalEventId));
    return id ? this.#rows.get(id) : undefined;
  }

  async markStatus(id: string, patch: Parameters<WebhookEventRepository["markStatus"]>[1]): Promise<BillingWebhookEvent | undefined> {
    const row = this.#rows.get(id);
    if (!row) return undefined;
    const updated: BillingWebhookEvent = {
      ...row,
      status: patch.status ?? row.status,
      resolvedTenantId: patch.resolvedTenantId === undefined ? row.resolvedTenantId : patch.resolvedTenantId,
      resolvedStatementId: patch.resolvedStatementId === undefined ? row.resolvedStatementId : patch.resolvedStatementId,
      error: patch.error === undefined ? row.error : patch.error,
      jobAttempts: patch.incrementAttempts ? row.jobAttempts + 1 : row.jobAttempts,
    };
    this.#rows.set(id, updated);
    return updated;
  }

  async listByProvider(provider: string): Promise<readonly BillingWebhookEvent[]> {
    return [...this.#rows.values()].filter((row) => row.provider === provider).sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  }

  async listStale(olderThanMs: number, now: Date): Promise<readonly BillingWebhookEvent[]> {
    const cutoff = now.getTime() - olderThanMs;
    return [...this.#rows.values()].filter((row) => row.status === "received" && row.receivedAt.getTime() <= cutoff);
  }

  /** Só para teste/inspeção. */
  all(): readonly BillingWebhookEvent[] {
    return [...this.#rows.values()];
  }
}
