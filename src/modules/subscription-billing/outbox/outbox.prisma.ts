// B-ASS-08 · F11 — o repositório Prisma da outbox (`billing_outbox`, FORCE RLS). Implementa a MESMA porta do dublê,
// agora tenant-scoped (decisão do orquestrador):
//
//   - `enqueue`/`listByStatement`: `withTenantRls(tenantId)` — a linha nasce/é lida sob o GUC da organização.
//   - `claimNext`: POR ORGANIZAÇÃO (plano §3.8). Itera as organizações de `billing_statement_refs` (tabela GLOBAL,
//     legível pelo papel de runtime), e em cada uma abre `withTenantRlsBudget` com TRÊS passos na MESMA transação:
//     (1) `SELECT … FOR UPDATE SKIP LOCKED LIMIT 1` trava a candidata (dois workers nunca pegam a mesma linha);
//     (2) PENDING `charge_create` → RELÊ `subscription_statements` + cobrança viva (`subscription_statement_charges` e
//         a própria fila) sob o MESMO GUC e aplica `params.verdict` (R-OBX-5, D2 — conserto J-522); a órfã só reconsulta;
//     (3) `UPDATE` → PROCESSING (elegível/órfã) | SKIPPED + `skip_reason` | NEEDS_REVIEW + `last_error`.
//     As três tabelas são FORCE RLS da mesma organização. O `fetch` ao provedor é FORA de transação (o dispatcher),
//     nunca aqui (R-OBX-1).
//   - mutações por id: `withTenantRlsBudget(tenantId)` (transação curta do registro — G8).
//   - `markDisabledProvidersVisible`/`listByStatus`: PLATAFORMA sobre tabela FORCE → `forEachTenantRls`.

import type { Prisma, PrismaClient } from "@prisma/client";

import { forEachTenantRls, withTenantRls, withTenantRlsBudget } from "../../../database/rls.js";
import type { ClaimParams, ClaimResult, OutboxRepository } from "./outbox.repository.js";
import {
  idempotencyKeyOf,
  type BillingOutboxRow,
  type NewOutboxRow,
  type OutboxSkipReason,
  type OutboxStatus,
  type StatementClaimSnapshot,
} from "./outbox.types.js";

type Row = {
  id: string;
  tenant_id: string;
  statement_id: string;
  kind: string;
  provider: string;
  idempotency_key: string;
  provider_idempotency_key: string;
  payload: unknown;
  status: string;
  skip_reason: string | null;
  claimed_at: Date | null;
  claimed_by: string | null;
  attempt_started_at: Date | null;
  attempts: number;
  next_attempt_at: Date | null;
  last_error: string | null;
  external_id: string | null;
  occurred_at: Date;
  created_at: Date;
  updated_at: Date;
};

function toDomain(row: Row): BillingOutboxRow {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    statementId: row.statement_id,
    kind: row.kind as BillingOutboxRow["kind"],
    provider: row.provider,
    idempotencyKey: row.idempotency_key,
    providerIdempotencyKey: row.provider_idempotency_key,
    payload: (row.payload ?? {}) as Readonly<Record<string, unknown>>,
    status: row.status as OutboxStatus,
    skipReason: (row.skip_reason as OutboxSkipReason | null) ?? null,
    claimedAt: row.claimed_at,
    claimedBy: row.claimed_by,
    attemptStartedAt: row.attempt_started_at,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    externalId: row.external_id,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CLAIM_BUDGET = { maxWait: 5_000, timeout: 30_000, lockTimeoutMs: 5_000, statementTimeoutMs: 10_000 } as const;

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly client: PrismaClient) {}

  /** As organizações candidatas (índice GLOBAL `billing_statement_refs`, sem RLS). */
  async #tenantsWithRefs(): Promise<string[]> {
    const rows = (await this.client.$queryRawUnsafe(
      `SELECT DISTINCT tenant_id FROM billing_statement_refs ORDER BY tenant_id`,
    )) as Array<{ tenant_id: string }>;
    return rows.map((row) => row.tenant_id);
  }

  async enqueue(input: NewOutboxRow, now: Date): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }> {
    const key = idempotencyKeyOf(input.kind, input.statementId, input.seq);
    return withTenantRls(this.client, input.tenantId, async (tx) => {
      const inserted = (await tx.$queryRawUnsafe(
        `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, created_at, updated_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, COALESCE($6, gen_random_uuid()::text)::uuid, $7::jsonb, $8, $8, $8)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING *`,
        input.tenantId,
        input.statementId,
        input.kind,
        input.provider,
        key,
        input.providerIdempotencyKey ?? null,
        JSON.stringify(input.payload ?? {}),
        now,
      )) as Row[];
      if (inserted.length > 0) return { row: toDomain(inserted[0]!), created: true };
      const existing = (await tx.$queryRawUnsafe(`SELECT * FROM billing_outbox WHERE idempotency_key = $1`, key)) as Row[];
      return { row: toDomain(existing[0]!), created: false };
    });
  }

  async claimNext(params: ClaimParams): Promise<ClaimResult | null> {
    const orphanCutoff = new Date(params.now.getTime() - params.orphanMs);
    for (const tenantId of await this.#tenantsWithRefs()) {
      const claimed = await withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
        // (1) escolhe e TRAVA a candidata (a mesma seleção de sempre, agora como passo próprio): órfã primeiro, depois a
        // PENDING vencida mais antiga de provedor LIGADO. SKIP LOCKED: dois workers nunca pegam a mesma linha.
        const picked = (await tx.$queryRawUnsafe(
          `SELECT * FROM billing_outbox
             WHERE provider = ANY($1::text[])
               AND ( (status = 'PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= $2))
                     OR (status = 'PROCESSING' AND attempt_started_at <= $3) )
             ORDER BY (status = 'PROCESSING') DESC, occurred_at ASC
             FOR UPDATE SKIP LOCKED
             LIMIT 1`,
          params.enabledProviders,
          params.now,
          orphanCutoff,
        )) as Row[];
        if (picked.length === 0) return null;
        const target = toDomain(picked[0]!);
        const wasOrphan = target.status === "PROCESSING";

        if (!wasOrphan) {
          // (2) PENDING: RELÊ o demonstrativo e a cobrança viva sob o MESMO GUC (as três tabelas são FORCE RLS da mesma
          // organização) e aplica a política injetada (R-OBX-5). A órfã não passa por aqui — só reconsulta (E3).
          let snapshot: StatementClaimSnapshot | undefined;
          if (target.kind === "charge_create") {
            const statements = (await tx.$queryRawUnsafe(
              `SELECT s.status, s.reopened_at,
                      ( EXISTS (SELECT 1 FROM subscription_statement_charges c
                                 WHERE c.statement_id = s.id AND c.status IN ('pending', 'confirmed'))
                        OR EXISTS (SELECT 1 FROM billing_outbox o2
                                    WHERE o2.statement_id = s.id AND o2.kind = 'charge_create' AND o2.id <> $2::uuid
                                      AND o2.status IN ('SENT', 'PROCESSING')) ) AS has_live_charge
                 FROM subscription_statements s
                 WHERE s.id = $1::uuid`,
              target.statementId,
              target.id,
            )) as Array<{ status: string; reopened_at: Date | null; has_live_charge: boolean }>;
            const statement = statements[0];
            snapshot = statement
              ? { status: statement.status as StatementClaimSnapshot["status"], reopenedAt: statement.reopened_at, hasLiveCharge: statement.has_live_charge }
              : undefined;
          }
          const verdict = params.verdict(target, snapshot);
          if (verdict.kind === "skip") {
            // Sem `attempts`, sem `claimed_*`: a linha não foi tentada — foi descartada pela política.
            const rows = (await tx.$queryRawUnsafe(
              `UPDATE billing_outbox SET status = 'SKIPPED', skip_reason = $2, next_attempt_at = NULL, updated_at = $3
                 WHERE id = $1::uuid RETURNING *`,
              target.id,
              verdict.skipReason,
              params.now,
            )) as Row[];
            return { kind: "skipped", row: toDomain(rows[0]!), skipReason: verdict.skipReason } satisfies ClaimResult;
          }
          if (verdict.kind === "needs_review") {
            const rows = (await tx.$queryRawUnsafe(
              `UPDATE billing_outbox SET status = 'NEEDS_REVIEW', last_error = $2, next_attempt_at = NULL, updated_at = $3
                 WHERE id = $1::uuid RETURNING *`,
              target.id,
              verdict.code,
              params.now,
            )) as Row[];
            return { kind: "needs_review", row: toDomain(rows[0]!), code: verdict.code } satisfies ClaimResult;
          }
        }

        // (3) elegível ou órfã → PROCESSING (o UPDATE de sempre).
        const rows = (await tx.$queryRawUnsafe(
          `UPDATE billing_outbox
             SET status = 'PROCESSING', claimed_at = $2, claimed_by = $3, attempt_started_at = $2,
                 attempts = attempts + 1, updated_at = $2
             WHERE id = $1::uuid RETURNING *`,
          target.id,
          params.now,
          params.claimedBy,
        )) as Row[];
        return { kind: "claimed", row: toDomain(rows[0]!), wasOrphan } satisfies ClaimResult;
      });
      if (claimed) return claimed;
    }
    return null;
  }

  async #mutate(tenantId: string, id: string, data: Prisma.BillingOutboxUpdateInput): Promise<void> {
    await withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
      await tx.billingOutbox.updateMany({ where: { id }, data });
    });
  }

  async markSent(tenantId: string, id: string, externalId: string | null, now: Date): Promise<void> {
    await this.#mutate(tenantId, id, { status: "SENT", external_id: externalId, next_attempt_at: null, last_error: null, updated_at: now });
  }

  async reschedule(tenantId: string, id: string, nextAttemptAt: Date, lastError: string | null, now: Date): Promise<void> {
    await this.#mutate(tenantId, id, { status: "PENDING", next_attempt_at: nextAttemptAt, last_error: lastError, claimed_at: null, claimed_by: null, attempt_started_at: null, updated_at: now });
  }

  async markFailed(tenantId: string, id: string, lastError: string | null, now: Date): Promise<void> {
    await this.#mutate(tenantId, id, { status: "FAILED", last_error: lastError, next_attempt_at: null, updated_at: now });
  }

  async markNeedsReview(tenantId: string, id: string, lastError: string | null, now: Date): Promise<void> {
    await this.#mutate(tenantId, id, { status: "NEEDS_REVIEW", last_error: lastError, next_attempt_at: null, updated_at: now });
  }

  async markSkipped(tenantId: string, id: string, skipReason: OutboxSkipReason, now: Date): Promise<void> {
    await this.#mutate(tenantId, id, { status: "SKIPPED", skip_reason: skipReason, next_attempt_at: null, updated_at: now });
  }

  async markDisabledProvidersVisible(enabledProviders: readonly string[], now: Date): Promise<number> {
    const tenants = await this.#tenantsWithRefs();
    if (tenants.length === 0) return 0;
    const counts = await forEachTenantRls<number>(this.client, tenants, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE billing_outbox SET skip_reason = 'provider_disabled', updated_at = $2
           WHERE status = 'PENDING' AND NOT (provider = ANY($1::text[])) AND skip_reason IS DISTINCT FROM 'provider_disabled'
           RETURNING id`,
        enabledProviders,
        now,
      )) as Array<{ id: string }>;
      return [rows.length];
    });
    return counts.reduce((sum, n) => sum + n, 0);
  }

  async retry(tenantId: string, id: string, now: Date): Promise<BillingOutboxRow | undefined> {
    return withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `UPDATE billing_outbox SET status = 'PENDING', attempts = 0, last_error = NULL, skip_reason = NULL,
           next_attempt_at = $2, claimed_at = NULL, claimed_by = NULL, attempt_started_at = NULL, updated_at = $2
           WHERE id = $1::uuid AND status = 'FAILED' RETURNING *`,
        id,
        now,
      )) as Row[];
      return rows.length > 0 ? toDomain(rows[0]!) : undefined;
    });
  }

  async findById(tenantId: string, id: string): Promise<BillingOutboxRow | undefined> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(`SELECT * FROM billing_outbox WHERE id = $1::uuid`, id)) as Row[];
      return rows.length > 0 ? toDomain(rows[0]!) : undefined;
    });
  }

  async listByStatus(status?: OutboxStatus, provider?: string): Promise<readonly BillingOutboxRow[]> {
    const tenants = await this.#tenantsWithRefs();
    if (tenants.length === 0) return [];
    return forEachTenantRls<BillingOutboxRow>(this.client, tenants, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT * FROM billing_outbox
           WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR provider = $2)
           ORDER BY created_at ASC`,
        status ?? null,
        provider ?? null,
      )) as Row[];
      return rows.map(toDomain);
    });
  }

  async listByStatement(tenantId: string, statementId: string): Promise<readonly BillingOutboxRow[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(`SELECT * FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at ASC`, statementId)) as Row[];
      return rows.map(toDomain);
    });
  }
}
