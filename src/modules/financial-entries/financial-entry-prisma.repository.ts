import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { BUSINESS_TIMEZONE } from "../../config/business-time.js";
import { withTenantRls } from "../../database/rls.js";
import { assertPeriodOpenSharedInTx } from "../financial-titles/financial-title-prisma.repository.js";
import type {
  AggregateFinancialEntryInput,
  CreateFinancialEntryInput,
  FinancialEntry,
  FinancialEntryAggregateItem,
  ListFinancialEntryInput,
  ListFinancialEntryResult,
  ReconcileFinancialEntryInput,
  UpdateFinancialEntryInput,
} from "./financial-entry.types.js";
import {
  duplicatePaymentError,
  invalidAccountReferenceError,
  periodClosedError,
  toAggregateItem,
  type AccountReader,
  type FinancialAccountRef,
  type FinancialEntryAggregateReader,
  type FinancialEntryRepository,
} from "./financial-entry.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaFinancialEntryRepository implements FinancialEntryRepository, FinancialEntryAggregateReader {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFinancialEntryInput): Promise<FinancialEntry> {
    try {
      const record = await this.client.financialEntry.create({
        data: {
          tenant_id: input.tenantId,
          account_id: input.accountId,
          title_id: input.titleId ?? null,
          direction: input.direction,
          amount: input.amount,
          currency: input.currency,
          payment_method: input.paymentMethod,
          category: input.category ?? null,
          occurred_at: input.occurredAt,
          competencia: input.competencia,
          description: input.description ?? null,
          reversal_of: input.reversalOf ?? null,
          // reconciled nasce false (conciliação é Ω4-5).
          reconciled: false,
          client_action_id: input.clientActionId ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });
      return mapRecord(record);
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async list(input: ListFinancialEntryInput): Promise<ListFinancialEntryResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.financialEntry.findMany({ where, orderBy: [{ occurred_at: "desc" }, { id: "desc" }], take: input.limit, skip: input.offset }),
      this.client.financialEntry.count({ where }),
    ]);
    return { items: items.map(mapRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined> {
    // Retorna mesmo deletado (GET e o pré-check das mutações decidem 404 no serviço).
    const record = await this.client.financialEntry.findFirst({ where: { tenant_id: tenantId, id: financialEntryId } });
    return record ? mapRecord(record) : undefined;
  }

  async update(input: UpdateFinancialEntryInput): Promise<FinancialEntry | undefined> {
    const updated = await this.client.financialEntry.updateManyAndReturn({
      // deleted_at:null → PATCH em lançamento deletado casa 0 linhas → 404 (simétrico ao softDelete).
      where: { tenant_id: input.tenantId, id: input.financialEntryId, deleted_at: null },
      data: compactRecord({ category: nullable(input.category), description: nullable(input.description), updated_by: nullable(input.updatedBy) }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async softDelete(tenantId: string, financialEntryId: string, deletedBy?: string): Promise<FinancialEntry | undefined> {
    const updated = await this.client.financialEntry.updateManyAndReturn({
      where: { tenant_id: tenantId, id: financialEntryId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async reconcile(input: ReconcileFinancialEntryInput): Promise<FinancialEntry | undefined> {
    // Objeto DIRETO (não compactRecord) para os nulos irem AO BANCO (desconciliar limpa divergence/ref/at/by).
    // B-SAN3-12a (§4.6, R2-05) — CAS por ESTADO LÓGICO no banco: o par (reconciled, reconciled_at) tem de ser o que o
    // cliente leu (`reconciled_at: null` vira `IS NULL`; um instante vira igualdade exata). 0 linhas → undefined.
    const updated = await this.client.financialEntry.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.financialEntryId,
        deleted_at: null,
        reconciled: input.expectedReconciled,
        reconciled_at: input.expectedReconciledAt,
      },
      data: {
        reconciled: input.reconciled,
        divergence_type: input.divergenceType,
        reconciliation_ref: input.reconciliationRef,
        reconciled_at: input.reconciledAt,
        reconciled_by: input.reconciledBy,
        ...(input.updatedBy !== undefined ? { updated_by: input.updatedBy } : {}),
      },
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async findActiveReversalOf(tenantId: string, originalEntryId: string): Promise<FinancialEntry | undefined> {
    const record = await this.client.financialEntry.findFirst({
      where: { tenant_id: tenantId, reversal_of: originalEntryId, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  // B-O6R-02 F4 — SELECT ... FOR UPDATE do lançamento (na transação corrente): o 2º estorno do mesmo
  // original bloqueia AQUI, e o re-check de reversão ativa dentro da tx decide 409 sobre estado
  // commitado estável. Retorna mesmo deletado (o chamador decide 404), simétrico ao findById.
  async findByIdForUpdate(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM financial_entries
      WHERE tenant_id = ${tenantId}::uuid AND id = ${financialEntryId}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) return undefined;
    return this.findById(tenantId, financialEntryId);
  }

  // B-SAN3-12a (§4.5, R2-06) — agregado do extrato somado em SQL sobre Decimal(12,2). Buckets no FUSO DO NEGÓCIO:
  // mês = a coluna `competencia` (derivada no fuso ao gravar — idêntica ao `cashFlow` do resumo por construção); dia =
  // `(occurred_at AT TIME ZONE BUSINESS_TIMEZONE)::date`. O nome do fuso vem de BUSINESS_TIMEZONE (nunca literal).
  // Roda na transação recebida (o Rls abaixo abre `withTenantRls`): fora dela a RLS não filtraria (R-res-5).
  async aggregate(input: AggregateFinancialEntryInput): Promise<readonly FinancialEntryAggregateItem[]> {
    const businessDay = Prisma.sql`((occurred_at AT TIME ZONE ${BUSINESS_TIMEZONE})::date)`;
    const bucket =
      input.groupBy === "none"
        ? Prisma.sql`NULL::text`
        : input.groupBy === "month"
          ? Prisma.sql`competencia`
          : Prisma.sql`to_char(${businessDay}, 'YYYY-MM-DD')`;
    const filters: Prisma.Sql[] = [Prisma.sql`tenant_id = ${input.tenantId}::uuid`, Prisma.sql`deleted_at IS NULL`];
    if (input.accountId !== undefined) filters.push(Prisma.sql`account_id = ${input.accountId}::uuid`);
    if (input.direction !== undefined) filters.push(Prisma.sql`direction = ${input.direction}`);
    if (input.reconciled !== undefined) filters.push(Prisma.sql`reconciled = ${input.reconciled}`);
    if (input.divergenceType !== undefined) filters.push(Prisma.sql`divergence_type = ${input.divergenceType}`);
    if (input.fromDate !== undefined) filters.push(Prisma.sql`${businessDay} >= ${input.fromDate}::date`);
    if (input.toDate !== undefined) filters.push(Prisma.sql`${businessDay} <= ${input.toDate}::date`);
    const rows = await this.client.$queryRaw<Array<{ bucket: string | null; count: number; inflow: string; outflow: string }>>`
      SELECT ${bucket} AS bucket,
             COUNT(*)::int AS count,
             COALESCE(SUM(amount) FILTER (WHERE direction = 'in'), 0)::text AS inflow,
             COALESCE(SUM(amount) FILTER (WHERE direction = 'out'), 0)::text AS outflow
        FROM financial_entries
       WHERE ${Prisma.join(filters, " AND ")}
       GROUP BY 1
       ORDER BY 1
    `;
    return rows.map((row) => toAggregateItem(row.bucket, row.count, Number(row.inflow), Number(row.outflow)));
  }

  async sumByAccount(tenantId: string, accountId: string): Promise<{ readonly inflow: number; readonly outflow: number }> {
    const grouped = await this.client.financialEntry.groupBy({
      by: ["direction"],
      where: { tenant_id: tenantId, account_id: accountId, deleted_at: null },
      _sum: { amount: true },
    });
    const sumOf = (direction: string): number => {
      const bucket = grouped.find((row) => row.direction === direction);
      return bucket?._sum.amount ? Number(bucket._sum.amount) : 0;
    };
    return { inflow: sumOf("in"), outflow: sumOf("out") };
  }
}

// AccountReader Prisma — resolve a conta (moeda/atividade/saldo de abertura) dentro da RLS.
export class PrismaAccountReader implements AccountReader {
  constructor(private readonly client: PrismaExecutor) {}

  async findAccount(tenantId: string, accountId: string): Promise<FinancialAccountRef | undefined> {
    const record = await this.client.financialAccount.findFirst({
      where: { tenant_id: tenantId, id: accountId },
      select: { id: true, currency: true, is_active: true, opening_balance: true },
    });
    if (!record) return undefined;
    return { id: record.id, currency: record.currency, isActive: record.is_active, openingBalance: Number(record.opening_balance) };
  }
}

export class RlsPrismaFinancialEntryRepository implements FinancialEntryRepository, FinancialEntryAggregateReader {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFinancialEntryInput): Promise<FinancialEntry> {
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      // B-O6R-02 (Ω6R-DIN-008) — trava SHARED + re-check do período DENTRO da tx que grava. Cobre o
      // lançamento avulso, o contra-lançamento do estorno E o lançamento da liquidação (payTitle),
      // sem tocar os corpos de payTitle/reverse (F3/F4). O pré-check do serviço permanece (fast-fail).
      await assertPeriodOpenSharedInTx(tx, input.tenantId, input.competencia, periodClosedError);
      return new PrismaFinancialEntryRepository(tx).create(input);
    });
  }
  list(input: ListFinancialEntryInput): Promise<ListFinancialEntryResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).list(input));
  }
  findById(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).findById(tenantId, financialEntryId));
  }
  update(input: UpdateFinancialEntryInput): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      const repository = new PrismaFinancialEntryRepository(tx);
      const current = await repository.findById(input.tenantId, input.financialEntryId);
      if (current && current.deletedAt == null) {
        // DIN-008 — a competência da mutação é a da PRÓPRIA linha (imutável pós-create), lida na mesma tx.
        await assertPeriodOpenSharedInTx(tx, input.tenantId, current.competencia, periodClosedError);
      }
      // Inexistente/deletado NÃO trava período: o update casa 0 linhas → undefined → 404 no serviço.
      return repository.update(input);
    });
  }
  softDelete(tenantId: string, financialEntryId: string, deletedBy?: string): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const repository = new PrismaFinancialEntryRepository(tx);
      const current = await repository.findById(tenantId, financialEntryId);
      if (current && current.deletedAt == null) {
        await assertPeriodOpenSharedInTx(tx, tenantId, current.competencia, periodClosedError);
      }
      return repository.softDelete(tenantId, financialEntryId, deletedBy);
    });
  }
  reconcile(input: ReconcileFinancialEntryInput): Promise<FinancialEntry | undefined> {
    // SEM guard de período (deliberado): conciliação é META-DADO e não atravessa o chokepoint
    // (D-Ω4-5-RECONCILE-META) — o extrato chega DEPOIS do fechamento; gate-á-la congelaria a conciliação.
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).reconcile(input));
  }
  findActiveReversalOf(tenantId: string, originalEntryId: string): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).findActiveReversalOf(tenantId, originalEntryId));
  }
  // B-O6R-02 F4 — standalone abre a própria transação (o lock vale só até o commit imediato); o uso
  // REAL é via a porta UoW, onde `tx` é a transação da unidade do estorno.
  findByIdForUpdate(tenantId: string, financialEntryId: string): Promise<FinancialEntry | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).findByIdForUpdate(tenantId, financialEntryId));
  }
  sumByAccount(tenantId: string, accountId: string): Promise<{ readonly inflow: number; readonly outflow: number }> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialEntryRepository(tx).sumByAccount(tenantId, accountId));
  }
  aggregate(input: AggregateFinancialEntryInput): Promise<readonly FinancialEntryAggregateItem[]> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialEntryRepository(tx).aggregate(input));
  }
}

export class RlsPrismaAccountReader implements AccountReader {
  constructor(private readonly prismaClient: PrismaClient) {}

  findAccount(tenantId: string, accountId: string): Promise<FinancialAccountRef | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaAccountReader(tx).findAccount(tenantId, accountId));
  }
}

export async function createPrismaFinancialEntryRepository(): Promise<RlsPrismaFinancialEntryRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialEntryRepository(prisma);
}

export async function createPrismaAccountReader(): Promise<RlsPrismaAccountReader> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaAccountReader(prisma);
}

function buildWhere(input: ListFinancialEntryInput): Prisma.FinancialEntryWhereInput {
  const and: Prisma.FinancialEntryWhereInput[] = [];
  if (input.accountId !== undefined) and.push({ account_id: input.accountId });
  if (input.direction !== undefined) and.push({ direction: input.direction });
  if (input.category !== undefined) and.push({ category: input.category });
  if (input.reconciled !== undefined) and.push({ reconciled: input.reconciled });
  if (input.divergenceType !== undefined) and.push({ divergence_type: input.divergenceType });
  if (input.occurredFrom !== undefined) and.push({ occurred_at: { gte: input.occurredFrom } });
  if (input.occurredTo !== undefined) and.push({ occurred_at: { lte: input.occurredTo } });

  return {
    tenant_id: input.tenantId,
    ...(input.includeDeleted ? {} : { deleted_at: null }),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly account_id: string;
  readonly title_id: string | null;
  readonly direction: string;
  readonly amount: Prisma.Decimal;
  readonly currency: string;
  readonly payment_method: string;
  readonly category: string | null;
  readonly occurred_at: Date;
  readonly competencia: string;
  readonly description: string | null;
  readonly reversal_of: string | null;
  readonly reconciled: boolean;
  readonly divergence_type: string | null;
  readonly reconciliation_ref: string | null;
  readonly reconciled_at: Date | null;
  readonly reconciled_by: string | null;
  readonly client_action_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): FinancialEntry {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    accountId: record.account_id,
    titleId: record.title_id ?? undefined,
    direction: record.direction,
    amount: Number(record.amount),
    currency: record.currency,
    paymentMethod: record.payment_method,
    category: record.category ?? undefined,
    occurredAt: record.occurred_at,
    competencia: record.competencia,
    description: record.description ?? undefined,
    reversalOf: record.reversal_of ?? undefined,
    reconciled: record.reconciled,
    divergenceType: record.divergence_type ?? undefined,
    reconciliationRef: record.reconciliation_ref ?? undefined,
    reconciledAt: record.reconciled_at ?? undefined,
    reconciledBy: record.reconciled_by ?? undefined,
    clientActionId: record.client_action_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2002 → o índice PARCIAL de idempotência (só no SQL da migration) → 409 duplicate_payment (replay do
// mesmo pagamento). P2003 → FK composta inválida (conta/título inexistente ou de outro tenant); nesta
// fatia o alvo prático é a conta (o título já foi resolvido antes na liquidação) → 400.
function translatePersistenceError(error: unknown): unknown {
  if (isPrismaError(error, "P2002")) {
    return duplicatePaymentError();
  }
  if (isPrismaError(error, "P2003")) {
    return invalidAccountReferenceError();
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
