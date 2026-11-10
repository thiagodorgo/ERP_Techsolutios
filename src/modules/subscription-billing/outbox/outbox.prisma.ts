// B-ASS-08 · F11 — o repositório Prisma da outbox (`billing_outbox`, FORCE RLS). Implementa a MESMA porta do dublê,
// agora tenant-scoped (decisão do orquestrador):
//
//   - `enqueue`/`listByStatement`: `withTenantRls(tenantId)` — a linha nasce/é lida sob o GUC da organização. As funções
//     `enqueueInTx`/`listByStatementInTx` fazem o MESMO SQL sobre um `tx` já aberto (o pedido de cobrança, E8).
//   - `claimNext`: POR ORGANIZAÇÃO (plano §3.8). Itera as organizações de `billing_statement_refs` (tabela GLOBAL,
//     legível pelo papel de runtime), e em cada uma abre `withTenantRlsBudget`, numa transação só:
//     (1) a ÓRFÃ (PROCESSING vencida): `FOR UPDATE SKIP LOCKED LIMIT 1`, sem trava do demonstrativo e sem política (E3);
//     (2) a PENDING `charge_create` (E5″, 2º conserto do #522): o demonstrativo e a linha numa instrução só, o
//         demonstrativo PRIMEIRO, as duas cláusulas com SKIP LOCKED — o executor pula, dentro da própria instrução, toda
//         candidata cujo demonstrativo está travado (baixa, fechamento, pedido em voo), sem laço nem lista de adiadas, e
//         o claim nunca espera; `enable_nestloop = off` local à instrução impede a junção quadrática com estatística velha;
//     (3) a RELEITURA no comando seguinte (E4): demonstrativo + cobrança viva sob o MESMO GUC, com a irmã viva = o conjunto
//         do D1 (PENDING/PROCESSING/SENT/NEEDS_REVIEW), e a política `params.verdict` (R-OBX-5, D2);
//     (4) as PENDING dos outros tipos (`invoice_*` da 08b): pick próprio, sem trava do demonstrativo;
//     e o `UPDATE` → PROCESSING (elegível/órfã) | SKIPPED + `skip_reason` | NEEDS_REVIEW + `last_error`.
//     As tabelas são FORCE RLS da mesma organização. O `fetch` ao provedor é FORA de transação (o dispatcher), nunca
//     aqui (R-OBX-1).
//   - mutações por id: `withTenantRlsBudget(tenantId)` (transação curta do registro — G8).
//   - `markDisabledProvidersVisible`/`listByStatus`: PLATAFORMA sobre tabela FORCE → `forEachTenantRls`.
//
// REGRA DE ORDEM DAS TRAVAS (§2.1 do plano do 2º conserto, com a §14.2; provada pelo T-LOCK-2): quem trava o demonstrativo
// trava-o PRIMEIRO e só depois as linhas da fila ou as cobranças (pedido, retry, fechamento, baixa, cancelamento, D2 (i)
// e `charge/cancel` da 08b). O claim trava o demonstrativo e a linha da fila numa instrução só, o demonstrativo primeiro,
// as duas com SKIP LOCKED (nunca espera). Nenhuma transação segura uma linha da fila e espera o demonstrativo.

import type { Prisma, PrismaClient } from "@prisma/client";

import { forEachTenantRls, withTenantRls, withTenantRlsBudget } from "../../../database/rls.js";
import { StatementError, type StatementStatus } from "../statements/statement.types.js";
import type { AdoptionFacts, ClaimParams, ClaimResult, OutboxRepository } from "./outbox.repository.js";
import {
  idempotencyKeyOf,
  type BillingOutboxRow,
  type ClaimVerdict,
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

/** A linha do banco → domínio (exportado para quem lê `billing_outbox` sobre um `tx` já aberto, como o pedido). */
export const outboxRowFromDb = toDomain;

/** O SQLSTATE do PostgreSQL dentro do erro do Prisma 7 com driver adapter (`P2010` com
 * `meta.driverAdapterError.cause.originalCode`). Usado para mapear 55P03 (`lock_timeout`) → 409 `statement_busy`. */
export function postgresErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const meta = (error as { meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown; code?: unknown } } } }).meta;
  const original = meta?.driverAdapterError?.cause?.originalCode ?? meta?.driverAdapterError?.cause?.code ?? meta?.code;
  return typeof original === "string" ? original : undefined;
}

/** `INSERT … ON CONFLICT (idempotency_key) DO NOTHING` sobre um `tx` JÁ ABERTO sob o GUC da organização (extraído de
 * `enqueue`, comportamento idêntico). O pedido de cobrança o usa no MESMO `tx` da trava do demonstrativo (E8). */
export async function enqueueInTx(
  tx: Prisma.TransactionClient,
  input: NewOutboxRow,
  now: Date,
): Promise<{ readonly row: BillingOutboxRow; readonly created: boolean }> {
  const key = idempotencyKeyOf(input.kind, input.statementId, input.seq);
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
}

/** As linhas do demonstrativo sobre um `tx` JÁ ABERTO (extraído de `listByStatement`, comportamento idêntico). */
export async function listByStatementInTx(tx: Prisma.TransactionClient, statementId: string): Promise<readonly BillingOutboxRow[]> {
  const rows = (await tx.$queryRawUnsafe(`SELECT * FROM billing_outbox WHERE statement_id = $1::uuid ORDER BY created_at ASC`, statementId)) as Row[];
  return rows.map(toDomain);
}

const CLAIM_BUDGET = { maxWait: 5_000, timeout: 30_000, lockTimeoutMs: 5_000, statementTimeoutMs: 10_000 } as const;

/** E5″ (2º conserto do #522, §14.2): a pick conjunta das PENDING `charge_create` — o demonstrativo e a linha numa instrução
 * só, o demonstrativo PRIMEIRO (o LockRows trava na ordem das cláusulas: a candidata pulada não fica com trava nenhuma na
 * fila), as duas cláusulas com SKIP LOCKED (o claim nunca espera trava). Os filtros de `o` ficam AQUI, onde o
 * EvalPlanQual os reconfere na versão travada: uma linha que outro worker já reclamou e commitou sai do resultado. */
const CHARGE_CREATE_JOINT_PICK_SQL = `SELECT o.* FROM subscription_statements s
       JOIN billing_outbox o ON o.statement_id = s.id AND o.tenant_id = s.tenant_id
      WHERE o.provider = ANY($1::text[]) AND o.kind = 'charge_create' AND o.status = 'PENDING'
        AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= $2)
      ORDER BY o.occurred_at ASC, o.id ASC
      FOR NO KEY UPDATE OF s SKIP LOCKED
      FOR UPDATE OF o SKIP LOCKED
      LIMIT 1`;

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
    return withTenantRls(this.client, input.tenantId, (tx) => enqueueInTx(tx, input, now));
  }

  async claimNext(params: ClaimParams): Promise<ClaimResult | null> {
    const orphanCutoff = new Date(params.now.getTime() - params.orphanMs);
    for (const tenantId of await this.#tenantsWithRefs()) {
      const claimed = await withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
        // Sem função interna aqui: o desfecho é um trecho só, no fim, para as três escolhas.
        let target: BillingOutboxRow;
        let verdict: ClaimVerdict = { kind: "eligible" };
        let wasOrphan = false;

        // (1) ÓRFÃ primeiro (PROCESSING parada além do limite): sem trava do demonstrativo e sem política — o despacho só
        //     reconsulta por referência e nunca cria (E3 do 1º conserto).
        const orphans = (await tx.$queryRawUnsafe(
          `SELECT * FROM billing_outbox
             WHERE provider = ANY($1::text[]) AND status = 'PROCESSING' AND attempt_started_at <= $2
             ORDER BY occurred_at ASC, id ASC
             FOR UPDATE SKIP LOCKED
             LIMIT 1`,
          params.enabledProviders,
          orphanCutoff,
        )) as Row[];
        if (orphans.length > 0) {
          target = toDomain(orphans[0]!);
          wasOrphan = true;
        } else {
          // (2) E5″ — PENDING `charge_create`: o demonstrativo e a linha numa instrução só (CHARGE_CREATE_JOINT_PICK_SQL).
          //     `billing_outbox.statement_id` não tem índice: com estatística velha o planejador escolhia laço aninhado
          //     (quadrático; medido: 10,3 s em N = 6 500). `enable_nestloop = off` LOCAL, só nesta instrução, com o valor de
          //     antes devolvido logo depois: a junção de igualdade vira hash (linear).
          const planner = (await tx.$queryRawUnsafe(
            `SELECT current_setting('enable_nestloop') AS previous, set_config('enable_nestloop', 'off', true) AS applied`,
          )) as Array<{ previous: string }>;
          const picked = (await tx.$queryRawUnsafe(CHARGE_CREATE_JOINT_PICK_SQL, params.enabledProviders, params.now)) as Row[];
          await tx.$queryRawUnsafe(`SELECT set_config('enable_nestloop', $1, true)`, planner[0]!.previous);
          if (picked.length > 0) {
            target = toDomain(picked[0]!);
            // (3) E4 — RELÊ, no comando SEGUINTE (a foto depois da concessão) e sob o MESMO GUC, o demonstrativo e a
            //     cobrança viva, com a irmã viva = o conjunto do D1 (PENDING/PROCESSING/SENT/NEEDS_REVIEW), e aplica a
            //     política injetada (R-OBX-5).
            const statements = (await tx.$queryRawUnsafe(
              `SELECT s.status, s.reopened_at,
                      ( EXISTS (SELECT 1 FROM subscription_statement_charges c
                                 WHERE c.statement_id = s.id AND c.status IN ('pending', 'confirmed'))
                        OR EXISTS (SELECT 1 FROM billing_outbox o2
                                    WHERE o2.statement_id = s.id AND o2.kind = 'charge_create' AND o2.id <> $2::uuid
                                      AND o2.status IN ('PENDING', 'PROCESSING', 'SENT', 'NEEDS_REVIEW')) ) AS has_live_charge
                 FROM subscription_statements s
                 WHERE s.id = $1::uuid`,
              target.statementId,
              target.id,
            )) as Array<{ status: string; reopened_at: Date | null; has_live_charge: boolean }>;
            const statement = statements[0];
            const snapshot: StatementClaimSnapshot | undefined = statement
              ? { status: statement.status as StatementClaimSnapshot["status"], reopenedAt: statement.reopened_at, hasLiveCharge: statement.has_live_charge }
              : undefined;
            verdict = params.verdict(target, snapshot);
          } else {
            // (4) PENDING dos outros tipos (`invoice_*` da 08b): pick próprio, sem trava do demonstrativo e sem releitura
            //     (a política os deixa `eligible`, como antes).
            const others = (await tx.$queryRawUnsafe(
              `SELECT * FROM billing_outbox
                 WHERE provider = ANY($1::text[]) AND kind <> 'charge_create' AND status = 'PENDING'
                   AND (next_attempt_at IS NULL OR next_attempt_at <= $2)
                 ORDER BY occurred_at ASC, id ASC
                 FOR UPDATE SKIP LOCKED
                 LIMIT 1`,
              params.enabledProviders,
              params.now,
            )) as Row[];
            if (others.length === 0) return null;
            target = toDomain(others[0]!);
            verdict = params.verdict(target, undefined);
          }
        }

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

        // (5) elegível ou órfã → PROCESSING (o UPDATE de sempre).
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
    try {
      return await withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
        // E9 (R-OBX-2, 2º conserto do #522): o demonstrativo PRIMEIRO (regra §2.1), sob FOR UPDATE — o retry serializa com o
        // pedido, o fechamento e outro retry do mesmo demonstrativo.
        const owners = (await tx.$queryRawUnsafe(
          `SELECT s.id, o.kind FROM subscription_statements s JOIN billing_outbox o ON o.statement_id = s.id
             WHERE o.id = $1::uuid FOR UPDATE OF s`,
          id,
        )) as Array<{ id: string; kind: string }>;
        const owner = owners[0];
        if (!owner) return undefined;
        if (owner.kind === "charge_create") {
          // Outra `charge_create` VIVA (o conjunto do D1) no demonstrativo → reabrir esta daria duas vivas: recusa.
          const other = (await tx.$queryRawUnsafe(
            `SELECT 1 FROM billing_outbox
               WHERE statement_id = $1::uuid AND kind = 'charge_create' AND id <> $2::uuid
                 AND status IN ('PENDING', 'PROCESSING', 'SENT', 'NEEDS_REVIEW')
               LIMIT 1`,
            owner.id,
            id,
          )) as unknown[];
          if (other.length > 0) throw new StatementError(422, "charge_already_exists", "Another charge intent is live for this statement.");
        }
        // `last_error` FICA (E9): é a evidência de que a linha já foi tentada, que a reconsulta usa para adotar a PRÓPRIA
        // cobrança. `attempts` zera (o backoff recomeça).
        const rows = (await tx.$queryRawUnsafe(
          `UPDATE billing_outbox SET status = 'PENDING', attempts = 0, skip_reason = NULL,
             next_attempt_at = $2, claimed_at = NULL, claimed_by = NULL, attempt_started_at = NULL, updated_at = $2
             WHERE id = $1::uuid AND status = 'FAILED' RETURNING *`,
          id,
          now,
        )) as Row[];
        return rows.length > 0 ? toDomain(rows[0]!) : undefined;
      });
    } catch (error) {
      // 55P03 = `lock_timeout`: o demonstrativo está travado por outra transação além do orçamento → repetível.
      if (postgresErrorCode(error) === "55P03") throw new StatementError(409, "statement_busy", "The statement is busy; try again.");
      throw error;
    }
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
    return withTenantRls(this.client, tenantId, (tx) => listByStatementInTx(tx, statementId));
  }

  /** E6′/E7′ (§13.1.2): os fatos da adoção numa leitura só, sob o GUC da organização, sem trava e fora do `fetch` — U (as
   * outras `charge_create` do demonstrativo, em QUALQUER status) e V (status, reabertura e o total em centavos). */
  async adoptionFacts(tenantId: string, statementId: string, rowId: string): Promise<AdoptionFacts | undefined> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT s.status, s.reopened_at, round(s.total_amount * 100)::bigint AS total_cents,
                (SELECT count(*)::int FROM billing_outbox o
                  WHERE o.statement_id = s.id AND o.kind = 'charge_create' AND o.id <> $2::uuid) AS other_intents
           FROM subscription_statements s WHERE s.id = $1::uuid`,
        statementId,
        rowId,
      )) as Array<{ status: string; reopened_at: Date | null; total_cents: bigint | number | string; other_intents: number }>;
      const row = rows[0];
      return row
        ? { otherIntents: Number(row.other_intents), status: row.status as StatementStatus, reopenedAt: row.reopened_at, totalCents: Number(row.total_cents) }
        : undefined;
    });
  }
}
