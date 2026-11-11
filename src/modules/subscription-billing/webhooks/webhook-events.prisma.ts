// B-ASS-08 · F11 — repositório Prisma de `billing_webhook_events` (tabela GLOBAL, sem RLS; o papel de runtime tem
// grant). `insertIfAbsent` usa `createMany(skipDuplicates)` = `INSERT … ON CONFLICT (provider, external_event_id)
// DO NOTHING` (replay ignorado → `created: false`). O corpo do webhook NUNCA é guardado — só o digest.

import type { PrismaClient } from "@prisma/client";

import type { WebhookEventRepository } from "./webhook-events.repository.js";
import type { BillingWebhookEvent, NewWebhookEvent, WebhookEventStatus } from "./webhook-events.types.js";

type Row = {
  id: string;
  provider: string;
  external_event_id: string;
  received_at: Date;
  body_digest: string;
  signature_ok: boolean;
  external_resource_id: string | null;
  external_reference: string | null;
  status: string;
  job_attempts: number;
  resolved_tenant_id: string | null;
  resolved_statement_id: string | null;
  error: string | null;
};

function toDomain(row: Row): BillingWebhookEvent {
  return {
    id: row.id,
    provider: row.provider,
    externalEventId: row.external_event_id,
    receivedAt: row.received_at,
    bodyDigest: row.body_digest,
    signatureOk: row.signature_ok,
    externalResourceId: row.external_resource_id,
    externalReference: row.external_reference,
    status: row.status as WebhookEventStatus,
    jobAttempts: row.job_attempts,
    resolvedTenantId: row.resolved_tenant_id,
    resolvedStatementId: row.resolved_statement_id,
    error: row.error,
  };
}

export class PrismaWebhookEventRepository implements WebhookEventRepository {
  constructor(private readonly client: PrismaClient) {}

  async insertIfAbsent(input: NewWebhookEvent, now: Date): Promise<{ readonly event: BillingWebhookEvent; readonly created: boolean }> {
    const result = await this.client.billingWebhookEvent.createMany({
      data: [
        {
          provider: input.provider,
          external_event_id: input.externalEventId,
          received_at: now,
          body_digest: input.bodyDigest,
          signature_ok: input.signatureOk,
          external_resource_id: input.externalResourceId,
          external_reference: input.externalReference,
        },
      ],
      skipDuplicates: true,
    });
    const event = (await this.find(input.provider, input.externalEventId))!;
    return { event, created: result.count > 0 };
  }

  async find(provider: string, externalEventId: string): Promise<BillingWebhookEvent | undefined> {
    const row = (await this.client.$queryRawUnsafe(
      `SELECT * FROM billing_webhook_events WHERE provider = $1 AND external_event_id = $2`,
      provider,
      externalEventId,
    )) as Row[];
    return row.length > 0 ? toDomain(row[0]!) : undefined;
  }

  async markStatus(id: string, patch: Parameters<WebhookEventRepository["markStatus"]>[1]): Promise<BillingWebhookEvent | undefined> {
    const current = (await this.client.$queryRawUnsafe(`SELECT * FROM billing_webhook_events WHERE id = $1::uuid`, id)) as Row[];
    if (current.length === 0) return undefined;
    const rows = (await this.client.$queryRawUnsafe(
      `UPDATE billing_webhook_events
         SET status = COALESCE($2, status),
             resolved_tenant_id = CASE WHEN $3::boolean THEN $4::uuid ELSE resolved_tenant_id END,
             resolved_statement_id = CASE WHEN $5::boolean THEN $6::uuid ELSE resolved_statement_id END,
             error = CASE WHEN $7::boolean THEN $8 ELSE error END,
             job_attempts = job_attempts + CASE WHEN $9::boolean THEN 1 ELSE 0 END
         WHERE id = $1::uuid RETURNING *`,
      id,
      patch.status ?? null,
      patch.resolvedTenantId !== undefined,
      patch.resolvedTenantId ?? null,
      patch.resolvedStatementId !== undefined,
      patch.resolvedStatementId ?? null,
      patch.error !== undefined,
      patch.error ?? null,
      patch.incrementAttempts === true,
    )) as Row[];
    return toDomain(rows[0]!);
  }

  async listByProvider(provider: string): Promise<readonly BillingWebhookEvent[]> {
    const rows = (await this.client.$queryRawUnsafe(
      `SELECT * FROM billing_webhook_events WHERE provider = $1 ORDER BY received_at ASC`,
      provider,
    )) as Row[];
    return rows.map(toDomain);
  }

  async listStale(olderThanMs: number, now: Date): Promise<readonly BillingWebhookEvent[]> {
    const cutoff = new Date(now.getTime() - olderThanMs);
    const rows = (await this.client.$queryRawUnsafe(
      `SELECT * FROM billing_webhook_events WHERE status = 'received' AND received_at <= $1 ORDER BY received_at ASC`,
      cutoff,
    )) as Row[];
    return rows.map(toDomain);
  }
}
