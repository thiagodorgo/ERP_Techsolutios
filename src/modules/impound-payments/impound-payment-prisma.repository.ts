import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { PrismaChargeRepository } from "../charging/charge-prisma.repository.js";
import { ChargeService } from "../charging/charge.service.js";
import { PrismaReleaseRepository } from "../release/release-prisma.repository.js";
import type { TariffResolver } from "../tariffs/tariff-resolution.js";
import type { ImpoundPaymentRepository, IntentWriteScope } from "./impound-payment.repository.js";
import {
  ImpoundPaymentError,
  LIVE_LINK_STATUSES,
  type CancelReason,
  type HeldReason,
  type ImpoundPaymentIntent,
  type ImpoundPaymentRef,
  type IntentAccount,
  type IntentStatus,
  type NewIntentInput,
  type PaymentMethod,
} from "./impound-payment.types.js";
import { centsToMoneyString, moneyStringToCents } from "./impound-payment.validators.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// B-PATIO-REC-01 (v3 §5.2; emenda §10.1 R-ISO) — repositório de baixo nível sobre um executor de TRANSAÇÃO. Só é construído
// dentro do callback de `withTenantRls` (o setter do GUC é a 1ª instrução da transação, `src/database/rls.ts`). Toda
// consulta filtra `tenant_id` EXPLICITAMENTE, além da RLS: no dev e no CI o app conecta como superusuário, que ignora a
// política (PROJECT_MEMORY.md:174-175), e o filtro da aplicação é o que segura (R-ISO item 2).
export class PrismaImpoundPaymentRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async processExists(tenantId: string, processId: string): Promise<boolean> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid
    `;
    return rows.length > 0;
  }

  // SELECT ... FOR UPDATE do processo — a MESMA trava (e a mesma ordem) do settleProcess e da liberação (v3 §5.3).
  async lockProcess(tenantId: string, processId: string): Promise<{ status: string } | undefined> {
    const rows = await this.client.$queryRaw<Array<{ status: string }>>`
      SELECT status FROM impound_processes WHERE tenant_id = ${tenantId}::uuid AND id = ${processId}::uuid FOR UPDATE
    `;
    return rows[0];
  }

  async findById(tenantId: string, intentId: string): Promise<ImpoundPaymentIntent | undefined> {
    const row = await this.client.impoundPaymentIntent.findFirst({ where: { id: intentId, tenant_id: tenantId } });
    return row ? mapIntent(row) : undefined;
  }

  async listByProcess(tenantId: string, processId: string): Promise<readonly ImpoundPaymentIntent[]> {
    const rows = await this.client.impoundPaymentIntent.findMany({
      where: { tenant_id: tenantId, process_id: processId },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
    });
    return rows.map(mapIntent);
  }

  async findLiveByProcess(tenantId: string, processId: string): Promise<ImpoundPaymentIntent | undefined> {
    const row = await this.client.impoundPaymentIntent.findFirst({
      where: { tenant_id: tenantId, process_id: processId, status: { in: [...LIVE_LINK_STATUSES] } },
    });
    return row ? mapIntent(row) : undefined;
  }

  async insertIntent(input: NewIntentInput): Promise<ImpoundPaymentIntent> {
    try {
      const row = await this.client.impoundPaymentIntent.create({
        data: {
          tenant_id: input.tenantId,
          process_id: input.processId,
          status: "pending",
          currency: input.currency,
          amount_cents: centsToMoneyString(input.amountCents),
          methods: [...input.methods],
          payer_name: input.payerName,
          payer_document: input.payerDocument,
          provider: input.provider,
          ...accountColumns(input.account),
          expires_at: input.expiresAt,
          settled_charge_ids: [],
          created_by: input.actorId ?? null,
          updated_by: input.actorId ?? null,
          created_at: input.occurredAt,
          updated_at: input.occurredAt,
        },
      });
      return mapIntent(row);
    } catch (error) {
      // A UNIQUE parcial do link aberto (`impound_payment_intents_live_link_key`) é o backstop da regra (e) sob corrida.
      if (isUniqueViolation(error)) {
        throw new ImpoundPaymentError(409, "ONLINE_PAYMENT_CONFLICT", "payment_already_pending", "There is already an open payment link for this process.");
      }
      throw error;
    }
  }

  async insertRef(ref: ImpoundPaymentRef): Promise<void> {
    await this.client.impoundPaymentRef.create({
      data: {
        intent_id: ref.intentId,
        tenant_id: ref.tenantId,
        provider: ref.provider,
        ...accountColumns(ref.account),
        external_charge_id: ref.externalChargeId ?? null,
        watch: ref.watch,
        next_check_at: ref.nextCheckAt ?? null,
        watch_until: ref.watchUntil ?? null,
        refund_requested_at: ref.refundRequestedAt ?? null,
      },
    });
  }
}

// O devido nunca resolve tarifa; se resolvesse, falha fechada (sem tarifa = sem diária). H5 da v3.
const NO_TARIFF: TariffResolver = async () => undefined;

// Wrapper RLS: cada método abre UMA transação da organização (`withTenantRls`). A criação inteira — trava do processo, estado
// do dossiê, devido capado, irmãs, intenção, referência e fila — roda num só `tx` (v3 §5.2, R-KEEP-3).
export class RlsPrismaImpoundPaymentRepository implements ImpoundPaymentRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  processExists(tenantId: string, processId: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundPaymentRepository(tx).processExists(tenantId, processId));
  }

  findById(tenantId: string, intentId: string): Promise<ImpoundPaymentIntent | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundPaymentRepository(tx).findById(tenantId, intentId));
  }

  listByProcess(tenantId: string, processId: string): Promise<readonly ImpoundPaymentIntent[]> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundPaymentRepository(tx).listByProcess(tenantId, processId));
  }

  findLiveByProcess(tenantId: string, processId: string): Promise<ImpoundPaymentIntent | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaImpoundPaymentRepository(tx).findLiveByProcess(tenantId, processId));
  }

  withProcessLock<T>(tenantId: string, processId: string, work: (scope: IntentWriteScope) => Promise<T>): Promise<T | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const repository = new PrismaImpoundPaymentRepository(tx);
      const locked = await repository.lockProcess(tenantId, processId);
      if (!locked) return undefined;
      const charges = new ChargeService(new PrismaChargeRepository(tx), NO_TARIFF);
      const releases = new PrismaReleaseRepository(tx);
      return work({
        loadReleaseState: async () => {
          const view = await releases.getActiveReleaseView(tenantId, processId);
          return { processStatus: locked.status, activeReleaseKind: view?.release.kind };
        },
        settleableDue: () => charges.getSettleableDueCents(tenantId, processId),
        listByProcess: () => repository.listByProcess(tenantId, processId),
        insertIntent: (input) => repository.insertIntent(input),
        insertRef: (ref) => repository.insertRef(ref),
        // A fila do pátio nasce no REC-02a (E-REC-1). Até lá não há onde gravar a linha: falha FECHADA, e o `tx` desfaz a
        // intenção e a referência. Inalcançável em produção enquanto o portão do canal estiver desligado (padrão).
        enqueue: async () => {
          throw new ImpoundPaymentError(422, "ONLINE_PAYMENT_UNAVAILABLE", "channel_disabled", "Online payment is not enabled.");
        },
      });
    });
  }
}

export async function createPrismaImpoundPaymentRepository(): Promise<RlsPrismaImpoundPaymentRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaImpoundPaymentRepository(prisma);
}

// ── mapeamento ────────────────────────────────────────────────────────────────────────────────────────────────
function accountColumns(account: IntentAccount): {
  payment_connection_id: string | null;
  payment_group_id: string | null;
  payment_group_connection_id: string | null;
} {
  return account.scope === "group"
    ? { payment_connection_id: null, payment_group_id: account.groupId, payment_group_connection_id: account.groupConnectionId }
    : { payment_connection_id: account.connectionId, payment_group_id: null, payment_group_connection_id: null };
}

type IntentRecord = {
  readonly id: string;
  readonly tenant_id: string;
  readonly process_id: string;
  readonly status: string;
  readonly cancel_reason: string | null;
  readonly currency: string;
  readonly amount_cents: Prisma.Decimal;
  readonly paid_cents: Prisma.Decimal;
  readonly applied_cents: Prisma.Decimal;
  readonly held_cents: Prisma.Decimal;
  readonly held_reason: string | null;
  readonly refunded_cents: Prisma.Decimal;
  readonly methods: readonly string[];
  readonly payer_name: string;
  readonly payer_document: string;
  readonly provider: string;
  readonly payment_connection_id: string | null;
  readonly payment_group_id: string | null;
  readonly payment_group_connection_id: string | null;
  readonly external_charge_id: string | null;
  readonly pay_url: string | null;
  readonly pix_copy_paste: string | null;
  readonly expires_at: Date;
  readonly settled_charge_ids: readonly string[];
  readonly settled_at: Date | null;
  readonly reversed_at: Date | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
};

function mapIntent(row: IntentRecord): ImpoundPaymentIntent {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    processId: row.process_id,
    status: row.status as IntentStatus,
    cancelReason: (row.cancel_reason ?? undefined) as CancelReason | undefined,
    currency: row.currency,
    amountCents: moneyStringToCents(row.amount_cents.toFixed(2)),
    paidCents: moneyStringToCents(row.paid_cents.toFixed(2)),
    appliedCents: moneyStringToCents(row.applied_cents.toFixed(2)),
    heldCents: moneyStringToCents(row.held_cents.toFixed(2)),
    heldReason: (row.held_reason ?? undefined) as HeldReason | undefined,
    refundedCents: moneyStringToCents(row.refunded_cents.toFixed(2)),
    methods: row.methods as PaymentMethod[],
    payerName: row.payer_name,
    payerDocument: row.payer_document,
    provider: row.provider,
    account: mapAccount(row),
    externalChargeId: row.external_charge_id ?? undefined,
    payUrl: row.pay_url ?? undefined,
    pixCopyPaste: row.pix_copy_paste ?? undefined,
    expiresAt: row.expires_at,
    settledChargeIds: [...row.settled_charge_ids],
    settledAt: row.settled_at ?? undefined,
    reversedAt: row.reversed_at ?? undefined,
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// O banco garante "exatamente uma" conta e o par grupo + conexão de grupo (CHECKs da M-REC-1). Linha fora disso é defeito:
// falha fechada, nunca uma conta inventada.
function mapAccount(row: Pick<IntentRecord, "payment_connection_id" | "payment_group_id" | "payment_group_connection_id">): IntentAccount {
  if (row.payment_group_connection_id && row.payment_group_id && !row.payment_connection_id) {
    return { scope: "group", groupId: row.payment_group_id, groupConnectionId: row.payment_group_connection_id };
  }
  if (row.payment_connection_id && !row.payment_group_connection_id && !row.payment_group_id) {
    return { scope: "organization", connectionId: row.payment_connection_id };
  }
  throw new ImpoundPaymentError(500, "INTERNAL_SERVER_ERROR", "account_inconsistent", "Unexpected error.");
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
