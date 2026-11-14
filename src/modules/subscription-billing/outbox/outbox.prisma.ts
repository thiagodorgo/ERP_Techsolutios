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
//         o claim nunca espera; `SET LOCAL enable_nestloop = off` em volta da instrução impede a junção quadrática com estatística velha;
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
import { putRefInTx } from "../webhooks/statement-refs.prisma.js";
import {
  recordedChargeStatus,
  retryCancelConflict,
  retryDueDate,
  type AdoptionFacts,
  type ChargeRecordOutcome,
  type ClaimParams,
  type ClaimResult,
  type OutboxLease,
  type OutboxListFilter,
  type OutboxRepository,
  type ResolveInput,
  type ResolveOutcome,
  type RetryByOperatorInput,
  type RetryByOperatorOutcome,
} from "./outbox.repository.js";
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
    `INSERT INTO billing_outbox (tenant_id, statement_id, kind, provider, idempotency_key, provider_idempotency_key, payload, occurred_at, created_at, updated_at, skip_reason)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, COALESCE($6, gen_random_uuid()::text)::uuid, $7::jsonb, $8, $8, $8, $9)
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
    input.skipReason ?? null,
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

/** B-ASS-08c1b (P9a): sobre um `tx` JÁ ABERTO e DEPOIS da trava do demonstrativo, a `charge_create` PENDING vira SKIPPED
 * (`skip_reason` NULL — o CHECK da M5 não tem motivo de cancelamento — e `last_error` = o motivo). O predicado leva a
 * organização e o status: 0 linhas = o claim a pegou primeiro. */
export async function skipPendingChargeCreateInTx(
  tx: Prisma.TransactionClient,
  tenantId: string,
  id: string,
  lastError: string,
  now: Date,
): Promise<BillingOutboxRow | undefined> {
  const rows = (await tx.$queryRawUnsafe(
    `UPDATE billing_outbox SET status = 'SKIPPED', skip_reason = NULL, last_error = $3, next_attempt_at = NULL, updated_at = $4
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND kind = 'charge_create' AND status = 'PENDING' RETURNING *`,
    id,
    tenantId,
    lastError,
    now,
  )) as Row[];
  return rows.length > 0 ? toDomain(rows[0]!) : undefined;
}

/**
 * O núcleo comum do `retry` e do `retryByOperator` (E9 do 2º conserto do #522; B-ASS-08c1b, Emenda 1 §3.3-§3.6 e Emenda 2
 * §3): as MESMAS 3 instruções (as constantes abaixo) e a MESMA decisão pura (`reopenChecks`), sobre o `tx` que cada método
 * abre. O demonstrativo PRIMEIRO (regra §2.1), pela junção, sob FOR UPDATE — o reabrir serializa com o pedido, o fechamento,
 * o cancelamento e outro reabrir do mesmo demonstrativo. A organização vai no predicado além do RLS. Nunca toca em
 * `last_error` nem em `occurred_at`.
 */
const REOPEN_OWNER_SQL = `SELECT s.id, s.status AS statement_status, round(s.paid_amount * 100)::bigint AS paid_cents, o.kind, o.status, o.payload
       FROM subscription_statements s JOIN billing_outbox o ON o.statement_id = s.id AND o.tenant_id = s.tenant_id
      WHERE o.id = $1::uuid AND o.tenant_id = $2::uuid FOR UPDATE OF s`;
/** As irmãs VIVAS que decidem o reabrir: outra `charge_create` viva (o conjunto do D1) e todo `charge_cancel` vivo. */
const REOPEN_SIBLINGS_SQL = `SELECT id, kind, status, payload FROM billing_outbox
      WHERE statement_id = $1::uuid AND tenant_id = $2::uuid AND id <> $3::uuid
        AND ((kind = 'charge_create' AND status IN ('PENDING', 'PROCESSING', 'SENT', 'NEEDS_REVIEW'))
          OR (kind = 'charge_cancel' AND status IN ('PENDING', 'PROCESSING', 'NEEDS_REVIEW')))`;
/** `attempts` zera (o backoff recomeça); `last_error` FICA (E9: a evidência de que a linha já foi tentada, que a reconsulta usa
 * para adotar a PRÓPRIA cobrança); a data nova, se houver, é regravada na MESMA instrução. */
const REOPEN_UPDATE_SQL = `UPDATE billing_outbox SET status = 'PENDING', attempts = 0, skip_reason = NULL,
       next_attempt_at = $3, claimed_at = NULL, claimed_by = NULL, attempt_started_at = NULL, updated_at = $3,
       payload = CASE WHEN $4::text IS NULL THEN payload ELSE jsonb_set(payload, '{dueDate}', to_jsonb($4::text)) END
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND status = 'FAILED' RETURNING *`;

type ReopenOwner = {
  readonly id: string;
  readonly statement_status: string;
  readonly paid_cents: bigint | number | string;
  readonly kind: BillingOutboxRow["kind"];
  readonly status: OutboxStatus;
  readonly payload: Record<string, unknown> | null;
};
type ReopenSibling = { readonly id: string; readonly kind: BillingOutboxRow["kind"]; readonly status: OutboxStatus; readonly payload: Record<string, unknown> | null };

/** A decisão do reabrir, PURA, depois da trava e da leitura das irmãs. Devolve a data a regravar (só no operador) ou lança. */
function reopenChecks(id: string, owner: ReopenOwner, siblings: readonly ReopenSibling[], operator: RetryByOperatorInput | null, now: Date): string | undefined {
  if (operator?.dueDate !== undefined && owner.kind !== "charge_create") throw new StatementError(422, "due_date_not_applicable", "dueDate applies only to a charge request.");
  const liveCancels = siblings.filter((sibling) => sibling.kind === "charge_cancel").map((cancel) => ({ id: cancel.id, payload: cancel.payload ?? {} }));
  if (owner.status === "FAILED" && retryCancelConflict({ id, kind: owner.kind, payload: owner.payload ?? {} }, liveCancels)) throw new StatementError(409, "charge_cancel_in_progress", "A cancellation is in progress for this statement."); // [RETRY-CANCEL-ONE]
  // Outra `charge_create` VIVA (o conjunto do D1) no demonstrativo → reabrir esta daria duas vivas: recusa.
  if (owner.kind === "charge_create" && siblings.some((sibling) => sibling.kind === "charge_create")) throw new StatementError(422, "charge_already_exists", "Another charge intent is live for this statement.");
  if (owner.kind === "charge_create" && owner.status === "FAILED" && owner.statement_status === "closed" && Number(owner.paid_cents) > 0) throw new StatementError(422, "statement_partially_paid", "The statement has a partial payment; a full-amount charge is refused."); // [RETRY-PARTIAL]
  return operator && owner.kind === "charge_create" ? retryDueDate(owner.payload?.dueDate, operator.dueDate, now) : undefined;
}

const UUID_TEXT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** B-ASS-08c1b: a trilha de uma ação de operador sobre a fila, em `audit_logs` da organização, NO `tx` da ação (se a trilha
 * falhar, a ação cai junto). Só ids, `kind`, códigos e o motivo; ator sem UUID (cabeçalho legado de dev) fica `null`. */
export async function writeOutboxAuditInTx(
  tx: Prisma.TransactionClient,
  tenantId: string,
  event: { readonly actorId: string | null; readonly action: string; readonly entityId: string; readonly metadata: Readonly<Record<string, string | number | boolean | null>> },
): Promise<void> {
  const [{ EnterpriseAuditLogService }, { AuditLogRepository }] = await Promise.all([
    import("../../core-saas/audit/audit-log.service.js"),
    import("../../core-saas/repositories/audit-log.repository.js"),
  ]);
  await new EnterpriseAuditLogService(new AuditLogRepository(tx)).record({
    tenantId,
    actorId: event.actorId !== null && UUID_TEXT.test(event.actorId) ? event.actorId : null,
    actorType: event.actorId === null ? "system" : "user",
    action: event.action,
    resourceType: "billing_outbox",
    resourceId: event.entityId,
    metadata: event.metadata,
  });
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
/** Recorte opcional das organizações da varredura de plataforma. Produção não o passa (varre todas); a suíte de banco
 * compartilhado o usa para não tocar a outbox de outra suíte (o mesmo motivo do `tenantIds` da medição — M-5 do #505). */
export type PrismaOutboxScope = {
  readonly tenantIds?: readonly string[];
  /** Injeção de falha do RG1, executada dentro da transação do registro (`recordChargeOutcome`) depois do INSERT. */
  readonly afterChargeInsert?: () => Promise<void>;
};

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(
    private readonly client: PrismaClient,
    private readonly scope: PrismaOutboxScope = {},
  ) {}

  /** As organizações candidatas (índice GLOBAL `billing_statement_refs`, sem RLS). */
  async #tenantsWithRefs(): Promise<string[]> {
    const rows = (await this.client.$queryRawUnsafe(
      `SELECT DISTINCT tenant_id FROM billing_statement_refs ORDER BY tenant_id`,
    )) as Array<{ tenant_id: string }>;
    const tenants = rows.map((row) => row.tenant_id);
    const only = this.scope.tenantIds;
    return only ? tenants.filter((tenantId) => only.includes(tenantId)) : tenants;
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
          //     (quadrático; medido: 10,3 s em N = 6 500). `SET LOCAL enable_nestloop = off` só em volta desta instrução, e o
          //     valor de antes devolvido logo depois: a junção de igualdade vira hash (linear). Emenda 15: `SET LOCAL` com
          //     LITERAIS FIXOS (nada de parâmetro nem de dado no SQL; o `set_config` vive só em rls.ts, guard 3), e valor lido
          //     fora de {on, off} falha fechado.
          const planner = (await tx.$queryRawUnsafe(`SELECT current_setting('enable_nestloop') AS previous`)) as Array<{ previous: string }>;
          const previousNestloop = planner[0]?.previous;
          if (previousNestloop !== "on" && previousNestloop !== "off") throw new Error("enable_nestloop com valor inesperado; o claim não segue");
          await tx.$executeRawUnsafe(`SET LOCAL enable_nestloop = off`);
          const picked = (await tx.$queryRawUnsafe(CHARGE_CREATE_JOINT_PICK_SQL, params.enabledProviders, params.now)) as Row[];
          // a devolução: uma de DUAS chamadas com literal fixo (sem expressão no argumento: o guard de escritores lê só literal)
          if (previousNestloop === "on") await tx.$executeRawUnsafe(`SET LOCAL enable_nestloop = on`);
          else await tx.$executeRawUnsafe(`SET LOCAL enable_nestloop = off`);
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

        // (5) elegível ou órfã → PROCESSING (o UPDATE de sempre). Conserto da J-530 (I8): a retomada LIMPA o `skip_reason`
        //     (a linha que nasceu `provider_disabled` deixa de dizer isso quando o provedor volta); a trava não muda.
        // [INTX-06b]
        const skipReasonOnClaim: OutboxSkipReason | null = null;
        const rows = (await tx.$queryRawUnsafe(
          `UPDATE billing_outbox
             SET status = 'PROCESSING', claimed_at = $2, claimed_by = $3, attempt_started_at = $2,
                 attempts = attempts + 1, skip_reason = $4, updated_at = $2
             WHERE id = $1::uuid RETURNING *`,
          target.id,
          params.now,
          params.claimedBy,
          skipReasonOnClaim,
        )) as Row[];
        return { kind: "claimed", row: toDomain(rows[0]!), wasOrphan } satisfies ClaimResult;
      });
      if (claimed) return claimed;
    }
    return null;
  }

  async #mutate(tenantId: string, id: string, lease: OutboxLease, data: Prisma.BillingOutboxUpdateInput): Promise<boolean> {
    return withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
      // [LEASE-01] A posse faz parte do predicado de TODA escrita do despacho. Zero linhas = lease perdida, sem exceção.
      const result = await tx.billingOutbox.updateMany({
        where: { id, status: "PROCESSING", claimed_by: lease.claimedBy, attempt_started_at: lease.attemptStartedAt },
        data,
      });
      return result.count === 1;
    });
  }

  async markSent(tenantId: string, id: string, externalId: string | null, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#mutate(tenantId, id, lease, { status: "SENT", external_id: externalId, next_attempt_at: null, last_error: null, updated_at: now });
  }

  async reschedule(tenantId: string, id: string, nextAttemptAt: Date, lastError: string | null, now: Date, lease: OutboxLease, options: { readonly refundAttempt?: boolean } = {}): Promise<boolean> {
    return this.#mutate(tenantId, id, lease, {
      status: "PENDING",
      next_attempt_at: nextAttemptAt,
      last_error: lastError,
      claimed_at: null,
      claimed_by: null,
      attempt_started_at: null,
      updated_at: now,
      // Conserto da J-530 (C): devolve a tentativa que o claim somou (o `#mutate` é chamado, nunca alterado).
      ...(options.refundAttempt ? { attempts: { decrement: 1 } } : {}),
    });
  }

  async markFailed(tenantId: string, id: string, lastError: string | null, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#mutate(tenantId, id, lease, { status: "FAILED", last_error: lastError, next_attempt_at: null, updated_at: now });
  }

  async markNeedsReview(tenantId: string, id: string, lastError: string | null, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#mutate(tenantId, id, lease, { status: "NEEDS_REVIEW", last_error: lastError, next_attempt_at: null, updated_at: now });
  }

  async markSkipped(tenantId: string, id: string, skipReason: OutboxSkipReason, now: Date, lease: OutboxLease): Promise<boolean> {
    return this.#mutate(tenantId, id, lease, { status: "SKIPPED", skip_reason: skipReason, next_attempt_at: null, updated_at: now });
  }

  async confirmLease(tenantId: string, id: string, lease: OutboxLease): Promise<boolean> {
    return withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
      // A confirmação da posse (marcador LEASE-02 no despacho): a transação termina antes da rede; o lock só serializa a foto da posse.
      const rows = (await tx.$queryRawUnsafe(
        `SELECT id FROM billing_outbox
          WHERE id = $1::uuid AND status = 'PROCESSING' AND claimed_by = $2 AND attempt_started_at = $3
          FOR UPDATE`,
        id,
        lease.claimedBy,
        lease.attemptStartedAt,
      )) as Array<{ id: string }>;
      return rows.length === 1;
    });
  }

  async recordChargeOutcome(
    tenantId: string,
    row: BillingOutboxRow,
    lease: OutboxLease,
    outcome: ChargeRecordOutcome,
    now: Date,
  ): Promise<boolean> {
    // [REG-TX] O demonstrativo vem PRIMEIRO; a rede já terminou antes de esta transação começar.
    return withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
      const statements = (await tx.$queryRawUnsafe(
        `SELECT id, tenant_id, status, total_amount, reopened_at
           FROM subscription_statements
          WHERE id = $1::uuid
          FOR NO KEY UPDATE`,
        row.statementId,
      )) as Array<{ id: string; tenant_id: string; status: string; total_amount: unknown; reopened_at: Date | null }>;
      const statement = statements[0];
      if (!statement) return false;

      const leased = (await tx.$queryRawUnsafe(
        `UPDATE billing_outbox
            SET status = 'SENT', external_id = $4, next_attempt_at = NULL, last_error = NULL, updated_at = $5
          WHERE id = $1::uuid AND status = 'PROCESSING' AND claimed_by = $2 AND attempt_started_at = $3
          RETURNING id`,
        row.id,
        lease.claimedBy,
        lease.attemptStartedAt,
        outcome.kind === "created" ? outcome.result.chargeId : outcome.chargeId,
        now,
      )) as Array<{ id: string }>;
      if (leased.length === 0) return false;

      const externalChargeId = outcome.kind === "created" ? outcome.result.chargeId : outcome.chargeId;
      const details = outcome.kind === "created" ? outcome.result : outcome.lookup;
      const status = recordedChargeStatus(outcome.kind, details.status);
      await tx.$executeRawUnsafe(
        `INSERT INTO subscription_statement_charges
           (tenant_id, statement_id, provider, external_charge_id, status, pay_url, pix_copy_paste, boleto_line, boleto_url, due_date, created_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::date, $11)
         ON CONFLICT (provider, external_charge_id) DO NOTHING`,
        statement.tenant_id,
        statement.id,
        row.provider,
        externalChargeId,
        status,
        details.payUrl ?? null,
        details.pixCopyPaste ?? null,
        details.boletoLine ?? null,
        details.boletoUrl ?? null,
        (outcome.kind === "adopted" ? outcome.lookup.dueDate : undefined) ?? (typeof row.payload.dueDate === "string" ? row.payload.dueDate : null),
        now,
      );
      await this.scope.afterChargeInsert?.();
      await putRefInTx(tx, { statementId: statement.id, tenantId: statement.tenant_id, provider: row.provider, externalChargeId }, now);
      return true;
    });
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
        // O retorno do `retry` antigo não muda: linha de outra organização ou que não está FAILED → `undefined`.
        const owner = ((await tx.$queryRawUnsafe(REOPEN_OWNER_SQL, id, tenantId)) as ReopenOwner[])[0];
        if (!owner) return undefined;
        const siblings = (await tx.$queryRawUnsafe(REOPEN_SIBLINGS_SQL, owner.id, tenantId, id)) as ReopenSibling[];
        reopenChecks(id, owner, siblings, null, now);
        const rows = (await tx.$queryRawUnsafe(REOPEN_UPDATE_SQL, id, tenantId, now, null)) as Row[];
        return rows.length > 0 ? toDomain(rows[0]!) : undefined;
      });
    } catch (error) {
      // 55P03 = `lock_timeout`: o demonstrativo está travado por outra transação além do orçamento → repetível.
      if (postgresErrorCode(error) === "55P03") throw new StatementError(409, "statement_busy", "The statement is busy; try again.");
      throw error;
    }
  }

  async retryByOperator(tenantId: string, id: string, now: Date, input: RetryByOperatorInput): Promise<RetryByOperatorOutcome> {
    try {
      return await withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx): Promise<RetryByOperatorOutcome> => {
        const owner = ((await tx.$queryRawUnsafe(REOPEN_OWNER_SQL, id, tenantId)) as ReopenOwner[])[0];
        if (!owner) return { kind: "not_found" };
        if (owner.status !== "FAILED") return { kind: "not_failed" };
        const siblings = (await tx.$queryRawUnsafe(REOPEN_SIBLINGS_SQL, owner.id, tenantId, id)) as ReopenSibling[];
        const dueDate = reopenChecks(id, owner, siblings, input, now);
        const rows = (await tx.$queryRawUnsafe(REOPEN_UPDATE_SQL, id, tenantId, now, dueDate ?? null)) as Row[];
        if (rows.length === 0) return { kind: "not_failed" };
        return { kind: "reopened", row: toDomain(rows[0]!), dueDateRewritten: dueDate !== undefined };
      });
    } catch (error) {
      if (postgresErrorCode(error) === "55P03") throw new StatementError(409, "statement_busy", "The statement is busy; try again.");
      throw error;
    }
  }

  async resolve(tenantId: string, id: string, input: ResolveInput): Promise<ResolveOutcome> {
    try {
      return await withTenantRlsBudget(this.client, tenantId, CLAIM_BUDGET, async (tx) => {
        // O demonstrativo PRIMEIRO (regra §2.1), pela junção, como o `retry`; a organização no predicado além do RLS.
        const owners = (await tx.$queryRawUnsafe(
          `SELECT s.id, o.kind, o.status, o.last_error FROM subscription_statements s JOIN billing_outbox o ON o.statement_id = s.id AND o.tenant_id = s.tenant_id
             WHERE o.id = $1::uuid AND o.tenant_id = $2::uuid FOR UPDATE OF s`, // [RESOLVE-LOCK]
          id,
          tenantId,
        )) as Array<{ id: string; kind: string; status: string; last_error: string | null }>;
        const owner = owners[0];
        if (!owner) return { kind: "not_found" } satisfies ResolveOutcome;
        if (owner.status !== "NEEDS_REVIEW") return { kind: "not_in_review" } satisfies ResolveOutcome;
        // `last_error` FICA: é o código que levou à conferência (a regra dos 7 dias do 08c1c e a adoção o leem).
        const rows = (await tx.$queryRawUnsafe(
          `UPDATE billing_outbox SET status = 'FAILED', next_attempt_at = NULL, updated_at = $3
             WHERE id = $1::uuid AND tenant_id = $2::uuid AND status = 'NEEDS_REVIEW' RETURNING *`,
          id,
          tenantId,
          input.now,
        )) as Row[];
        if (rows.length === 0) return { kind: "not_in_review" } satisfies ResolveOutcome;
        await writeOutboxAuditInTx(tx, tenantId, {
          actorId: input.actorId,
          action: "billing_outbox.resolved",
          entityId: id,
          metadata: { statementId: owner.id, kind: owner.kind, previousCode: owner.last_error, reason: input.reason },
        });
        return { kind: "resolved", row: toDomain(rows[0]!), previousCode: owner.last_error } satisfies ResolveOutcome;
      });
    } catch (error) {
      if (postgresErrorCode(error) === "55P03") throw new StatementError(409, "statement_busy", "The statement is busy; try again.");
      throw error;
    }
  }

  async listForTenant(tenantId: string, filter: OutboxListFilter): Promise<readonly BillingOutboxRow[]> {
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows = (await tx.$queryRawUnsafe(
        `SELECT * FROM billing_outbox
           WHERE tenant_id = $1::uuid AND ($2::text IS NULL OR status = $2) AND ($3::text IS NULL OR provider = $3)
           ORDER BY created_at ASC, id ASC`,
        tenantId,
        filter.status ?? null,
        filter.provider ?? null,
      )) as Row[];
      return rows.map(toDomain);
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
