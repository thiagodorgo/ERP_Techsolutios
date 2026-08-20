import type { Prisma, PrismaClient } from "@prisma/client";

import { acquirePeriodLockShared } from "../../database/financial-period-lock.js";
import { withTenantRls } from "../../database/rls.js";
import type {
  ApplyTitlePaymentInput,
  ChangeFinancialTitleStatusInput,
  CreateFinancialTitleInput,
  FinancialTitle,
  GuardedTitlePaymentInput,
  ListFinancialTitleInput,
  ListFinancialTitleResult,
  UpdateFinancialTitleInput,
} from "./financial-title.types.js";
import { FinancialTitleError } from "./financial-title.types.js";
import {
  PERIOD_WRITE_BLOCKING_STATUSES,
  invalidAccountReferenceError,
  periodClosedError,
  sourceAlreadyLaunchedError,
  workOrderAlreadyInvoicedError,
  type FinancialPeriodCloseRepository,
  type FinancialTitleRepository,
} from "./financial-title.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const NON_FINAL_EXCLUDED = ["paid", "cancelled"];

export class PrismaFinancialTitleRepository implements FinancialTitleRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateFinancialTitleInput): Promise<FinancialTitle> {
    try {
      const record = await this.client.financialTitle.create({
        data: {
          tenant_id: input.tenantId,
          direction: input.direction,
          party_type: input.partyType,
          party_id: input.partyId ?? null,
          party_name: input.partyName,
          document: input.document ?? null,
          category: input.category ?? null,
          description: input.description ?? null,
          amount: input.amount,
          currency: input.currency,
          issue_date: input.issueDate,
          due_date: input.dueDate,
          // paid_amount nasce 0 (dirigido por pagamentos no Ω4-4). work_order_id vem do faturamento (Ω4-3);
          // service_quote_id ainda NÃO tem caminho de escrita (sempre null nesta fatia).
          paid_amount: 0,
          status: input.status,
          competencia: input.competencia,
          account_id: input.accountId ?? null,
          // Ω4-3 — proveniência + âncora da idempotência parcial. Só o faturamento popula (create público: null).
          work_order_id: input.workOrderId ?? null,
          // Ω4C PR-02 — par genérico de proveniência (frota) + âncora da idempotência por origem. Só o
          // caminho createForSource popula (create público / faturamento OS: null).
          source_type: input.sourceType ?? null,
          source_id: input.sourceId ?? null,
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

  async list(input: ListFinancialTitleInput): Promise<ListFinancialTitleResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.financialTitle.findMany({ where, orderBy: [{ created_at: "desc" }, { id: "desc" }], take: input.limit, skip: input.offset }),
      this.client.financialTitle.count({ where }),
    ]);
    return { items: items.map(mapRecord), total, limit: input.limit, offset: input.offset };
  }

  async findById(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined> {
    // Retorna mesmo deletado (GET e o pré-check do chokepoint decidem 404 no serviço).
    const record = await this.client.financialTitle.findFirst({ where: { tenant_id: tenantId, id: financialTitleId } });
    return record ? mapRecord(record) : undefined;
  }

  async findActiveByWorkOrder(tenantId: string, workOrderId: string, direction: string): Promise<FinancialTitle | undefined> {
    const record = await this.client.financialTitle.findFirst({
      where: { tenant_id: tenantId, work_order_id: workOrderId, direction, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async findActiveBySource(
    tenantId: string,
    sourceType: string,
    sourceId: string,
    direction: string,
  ): Promise<FinancialTitle | undefined> {
    const record = await this.client.financialTitle.findFirst({
      where: { tenant_id: tenantId, source_type: sourceType, source_id: sourceId, direction, deleted_at: null },
    });
    return record ? mapRecord(record) : undefined;
  }

  async update(input: UpdateFinancialTitleInput): Promise<FinancialTitle | undefined> {
    try {
      const updated = await this.client.financialTitle.updateManyAndReturn({
        // deleted_at:null → PATCH em título deletado casa 0 linhas → 404 (simétrico ao softDelete).
        where: { tenant_id: input.tenantId, id: input.financialTitleId, deleted_at: null },
        data: compactRecord({
          party_name: input.partyName,
          document: nullable(input.document),
          category: nullable(input.category),
          description: nullable(input.description),
          amount: input.amount,
          due_date: input.dueDate,
          account_id: nullable(input.accountId),
          updated_by: nullable(input.updatedBy),
        }),
      });
      return updated[0] ? mapRecord(updated[0]) : undefined;
    } catch (error) {
      throw translatePersistenceError(error);
    }
  }

  async changeStatus(input: ChangeFinancialTitleStatusInput): Promise<FinancialTitle | undefined> {
    const updated = await this.client.financialTitle.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.financialTitleId, deleted_at: null },
      data: compactRecord({ status: input.status, updated_by: input.updatedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async applyPayment(input: ApplyTitlePaymentInput): Promise<FinancialTitle | undefined> {
    // Ω4-4 — grava paid_amount ABSOLUTO + status juntos (o service já validou paid_amount <= amount).
    const updated = await this.client.financialTitle.updateManyAndReturn({
      where: { tenant_id: input.tenantId, id: input.financialTitleId, deleted_at: null },
      data: compactRecord({ paid_amount: input.paidAmount, status: input.status, updated_by: input.updatedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  async softDelete(tenantId: string, financialTitleId: string, deletedBy?: string): Promise<FinancialTitle | undefined> {
    // Delete LÓGICO: carimba deleted_at; a row persiste mas some dos reads (deleted_at:null → re-delete 404).
    const updated = await this.client.financialTitle.updateManyAndReturn({
      where: { tenant_id: tenantId, id: financialTitleId, deleted_at: null },
      data: compactRecord({ deleted_at: new Date(), updated_by: deletedBy }),
    });
    return updated[0] ? mapRecord(updated[0]) : undefined;
  }

  // B-O6R-02 F3 — SELECT ... FOR UPDATE: trava a linha na transação corrente e devolve a tupla
  // ESTÁVEL (ninguém mais a muda até o commit/rollback). Usado SÓ onde a classificação de erro
  // precisa de leitura estável — o write-path em si é o CAS abaixo. Retorna mesmo deletado (o
  // chamador decide 404), simétrico ao findById.
  async findByIdForUpdate(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined> {
    const rows = await this.client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM financial_titles
      WHERE tenant_id = ${tenantId}::uuid AND id = ${financialTitleId}::uuid
      FOR UPDATE
    `;
    if (rows.length === 0) return undefined;
    return this.findById(tenantId, financialTitleId);
  }

  // B-O6R-02 F3 (Ω6R-DIN-001) — o CAS que fecha a corrida da liquidação: UPDATE condicional com o
  // predicado `paid_amount + X <= amount AND status NOT IN ('paid','cancelled')` NO WHERE. A 2ª
  // transação bloqueia no row lock da vencedora e, ao destravar, RE-AVALIA o predicado contra a
  // tupla nova (READ COMMITTED / EvalPlanQual) → casa 0 linhas → undefined. O delta é castado a
  // numeric(12,2) ANTES da aritmética (float8 cru poderia fazer 0.1+0.2 estourar o predicado do
  // pagamento exato). SET referencia os valores ANTIGOS das colunas (semântica do UPDATE) — o CASE
  // do status deriva do mesmo paid_amount pré-update do predicado. updated_at manual (SQL cru não
  // passa pelo @updatedAt do Prisma).
  async applyPaymentGuarded(input: GuardedTitlePaymentInput): Promise<FinancialTitle | undefined> {
    const updatedCount = await this.client.$executeRaw`
      UPDATE financial_titles
         SET paid_amount = paid_amount + (${input.amount})::numeric(12,2),
             status = CASE WHEN paid_amount + (${input.amount})::numeric(12,2) >= amount THEN 'paid' ELSE 'partially_paid' END,
             updated_by = COALESCE(${input.updatedBy ?? null}::uuid, updated_by),
             updated_at = now()
       WHERE tenant_id = ${input.tenantId}::uuid
         AND id = ${input.financialTitleId}::uuid
         AND deleted_at IS NULL
         AND status NOT IN ('paid', 'cancelled')
         AND paid_amount + (${input.amount})::numeric(12,2) <= amount
    `;
    if (updatedCount === 0) return undefined;
    return this.findById(input.tenantId, input.financialTitleId);
  }

  // B-O6R-02 F4 (Ω6R-DIN-002) — o CAS do estorno: devolve o pagamento (`paid_amount - X`) e recalcula
  // o status (`= 0 → open`, parcial → partially_paid) num único UPDATE condicional. O predicado
  // `status IN ('paid','partially_paid')` é seguro porque a máquina de status não tem aresta
  // partially_paid/paid → cancelled (título com pagamento nunca é cancelado); `paid_amount - X >= 0`
  // espelha o CHECK do banco (backstop da migração 20260869000000). 0 linhas → undefined → o chamador
  // aborta a unidade inteira (a contrapartida NUNCA commita sem o título restaurado).
  async restorePaymentGuarded(input: GuardedTitlePaymentInput): Promise<FinancialTitle | undefined> {
    const updatedCount = await this.client.$executeRaw`
      UPDATE financial_titles
         SET paid_amount = paid_amount - (${input.amount})::numeric(12,2),
             status = CASE WHEN paid_amount - (${input.amount})::numeric(12,2) <= 0 THEN 'open' ELSE 'partially_paid' END,
             updated_by = COALESCE(${input.updatedBy ?? null}::uuid, updated_by),
             updated_at = now()
       WHERE tenant_id = ${input.tenantId}::uuid
         AND id = ${input.financialTitleId}::uuid
         AND deleted_at IS NULL
         AND status IN ('paid', 'partially_paid')
         AND paid_amount - (${input.amount})::numeric(12,2) >= 0
    `;
    if (updatedCount === 0) return undefined;
    return this.findById(input.tenantId, input.financialTitleId);
  }
}

export class PrismaFinancialPeriodCloseRepository implements FinancialPeriodCloseRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async isPeriodClosed(tenantId: string, period: string): Promise<boolean> {
    // M2 (Ω4-6) — {closing, closed} bloqueiam a escrita; {open, reopened} liberam. reconcile não atravessa o
    // chokepoint → exento por construção.
    const record = await this.client.financialPeriodClose.findFirst({
      where: { tenant_id: tenantId, period, status: { in: [...PERIOD_WRITE_BLOCKING_STATUSES] } },
      select: { id: true },
    });
    return record != null;
  }
}

// B-O6R-02 (Ω6R-DIN-008) — guard IN-TX: toma a trava de período SHARED e re-valida isPeriodClosed
// DENTRO da MESMA transação que vai gravar. Antes deste bloco o writer só consultava o chokepoint
// NOUTRA transação (assertPeriodOpen do serviço) e podia commitar DEPOIS do snapshot do fechamento.
// O pré-check do serviço PERMANECE (fast-fail + precedência de erros preservada); este guard é a
// defesa que decide de verdade, na transação da escrita. SHARED, não exclusivo: writers do mesmo
// mês não serializam entre si (quem os serializa é o row lock da linha); o exclusivo é do close.
// O erro 422 é do CHAMADOR (título e lançamento têm códigos próprios) — vem por fábrica.
export async function assertPeriodOpenSharedInTx(
  tx: Prisma.TransactionClient,
  tenantId: string,
  period: string,
  onClosed: (period: string) => Error,
): Promise<void> {
  await acquirePeriodLockShared(tx, tenantId, period);
  if (await new PrismaFinancialPeriodCloseRepository(tx).isPeriodClosed(tenantId, period)) {
    throw onClosed(period);
  }
}

export class RlsPrismaFinancialTitleRepository implements FinancialTitleRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateFinancialTitleInput): Promise<FinancialTitle> {
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      // DIN-008 — a competência da escrita vem do input (derivada server-side no serviço).
      await assertPeriodOpenSharedInTx(tx, input.tenantId, input.competencia, periodClosedError);
      return new PrismaFinancialTitleRepository(tx).create(input);
    });
  }
  list(input: ListFinancialTitleInput): Promise<ListFinancialTitleResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).list(input));
  }
  findById(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialTitleRepository(tx).findById(tenantId, financialTitleId));
  }
  findActiveByWorkOrder(tenantId: string, workOrderId: string, direction: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialTitleRepository(tx).findActiveByWorkOrder(tenantId, workOrderId, direction));
  }
  findActiveBySource(tenantId: string, sourceType: string, sourceId: string, direction: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialTitleRepository(tx).findActiveBySource(tenantId, sourceType, sourceId, direction));
  }
  update(input: UpdateFinancialTitleInput): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      const repository = new PrismaFinancialTitleRepository(tx);
      const current = await repository.findById(input.tenantId, input.financialTitleId);
      if (current && current.deletedAt == null) {
        // DIN-008 — a competência da mutação é a da PRÓPRIA linha (imutável pós-create), lida na mesma tx.
        await assertPeriodOpenSharedInTx(tx, input.tenantId, current.competencia, periodClosedError);
      }
      // Inexistente/deletado NÃO trava período: o update casa 0 linhas → undefined → 404 no serviço.
      return repository.update(input);
    });
  }
  changeStatus(input: ChangeFinancialTitleStatusInput): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      const repository = new PrismaFinancialTitleRepository(tx);
      const current = await repository.findById(input.tenantId, input.financialTitleId);
      if (current && current.deletedAt == null) {
        await assertPeriodOpenSharedInTx(tx, input.tenantId, current.competencia, periodClosedError);
      }
      return repository.changeStatus(input);
    });
  }
  applyPayment(input: ApplyTitlePaymentInput): Promise<FinancialTitle | undefined> {
    // SEM guard de período AQUI (deliberado, §12.1 do plano B-O6R-02): liquidar título de competência
    // já fechada segue permitido — o snapshot é foto point-in-time. O DIN-008 da liquidação é guardado
    // pelo LANÇAMENTO de caixa (competência de occurred_at), no repositório de financial-entries.
    // A atomicidade lançamento+applyPayment é o DIN-001 (F3 deste bloco — payTitle usa a porta UoW,
    // onde entra o CAS applyPaymentGuarded; este applyPayment absoluto permanece para o InMemory/legado).
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).applyPayment(input));
  }
  // B-O6R-02 F3/F4 — standalone as três operações abrem a própria transação (o FOR UPDATE solto vale
  // só até o commit imediato; o uso REAL delas é via a porta UoW, onde `tx` é a transação da unidade).
  findByIdForUpdate(tenantId: string, financialTitleId: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialTitleRepository(tx).findByIdForUpdate(tenantId, financialTitleId));
  }
  applyPaymentGuarded(input: GuardedTitlePaymentInput): Promise<FinancialTitle | undefined> {
    // Mesma isenção de período do applyPayment (§12.1): o CAS é sobre o TÍTULO; a competência guardada
    // é a do lançamento de caixa, na mesma unidade (payTitle → assertPeriodOpenShared).
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).applyPaymentGuarded(input));
  }
  restorePaymentGuarded(input: GuardedTitlePaymentInput): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialTitleRepository(tx).restorePaymentGuarded(input));
  }
  softDelete(tenantId: string, financialTitleId: string, deletedBy?: string): Promise<FinancialTitle | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const repository = new PrismaFinancialTitleRepository(tx);
      const current = await repository.findById(tenantId, financialTitleId);
      if (current && current.deletedAt == null) {
        await assertPeriodOpenSharedInTx(tx, tenantId, current.competencia, periodClosedError);
      }
      return repository.softDelete(tenantId, financialTitleId, deletedBy);
    });
  }
}

export class RlsPrismaFinancialPeriodCloseRepository implements FinancialPeriodCloseRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  isPeriodClosed(tenantId: string, period: string): Promise<boolean> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaFinancialPeriodCloseRepository(tx).isPeriodClosed(tenantId, period));
  }
}

export async function createPrismaFinancialTitleRepository(): Promise<RlsPrismaFinancialTitleRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialTitleRepository(prisma);
}

export async function createPrismaFinancialPeriodCloseRepository(): Promise<RlsPrismaFinancialPeriodCloseRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialPeriodCloseRepository(prisma);
}

function buildWhere(input: ListFinancialTitleInput): Prisma.FinancialTitleWhereInput {
  const now = new Date();
  const and: Prisma.FinancialTitleWhereInput[] = [];
  if (input.direction !== undefined) and.push({ direction: input.direction });
  if (input.status !== undefined) and.push({ status: input.status });
  if (input.partyType !== undefined) and.push({ party_type: input.partyType });
  if (input.dueFrom !== undefined) and.push({ due_date: { gte: input.dueFrom } });
  if (input.dueTo !== undefined) and.push({ due_date: { lte: input.dueTo } });
  // overdue DERIVADO: vencido (due_date < agora) E status não-final. Espelha isTitleOverdue (InMemory).
  if (input.overdue === true) and.push({ due_date: { lt: now }, status: { notIn: NON_FINAL_EXCLUDED } });
  if (input.overdue === false) and.push({ OR: [{ due_date: { gte: now } }, { status: { in: NON_FINAL_EXCLUDED } }] });

  return {
    tenant_id: input.tenantId,
    ...(input.includeDeleted ? {} : { deleted_at: null }),
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

function mapRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly direction: string;
  readonly party_type: string;
  readonly party_id: string | null;
  readonly party_name: string;
  readonly document: string | null;
  readonly category: string | null;
  readonly description: string | null;
  readonly amount: Prisma.Decimal;
  readonly currency: string;
  readonly issue_date: Date;
  readonly due_date: Date;
  readonly paid_amount: Prisma.Decimal;
  readonly status: string;
  readonly competencia: string;
  readonly account_id: string | null;
  readonly work_order_id: string | null;
  readonly service_quote_id: string | null;
  readonly source_type: string | null;
  readonly source_id: string | null;
  readonly client_action_id: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
  readonly deleted_at: Date | null;
}): FinancialTitle {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    direction: record.direction,
    partyType: record.party_type,
    partyId: record.party_id ?? undefined,
    partyName: record.party_name,
    document: record.document ?? undefined,
    category: record.category ?? undefined,
    description: record.description ?? undefined,
    amount: Number(record.amount),
    currency: record.currency,
    issueDate: record.issue_date,
    dueDate: record.due_date,
    paidAmount: Number(record.paid_amount),
    status: record.status,
    competencia: record.competencia,
    accountId: record.account_id ?? undefined,
    workOrderId: record.work_order_id ?? undefined,
    serviceQuoteId: record.service_quote_id ?? undefined,
    sourceType: record.source_type ?? undefined,
    sourceId: record.source_id ?? undefined,
    clientActionId: record.client_action_id ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    deletedAt: record.deleted_at ?? undefined,
  };
}

// P2003 (FK composta inválida — conta/OS inexistente ou de outro tenant). Nesta fatia só account_id é
// populado, então o alvo esperado é a conta; mapeia por target para robustez. O tenant sempre vem da claim.
function translatePersistenceError(error: unknown): unknown {
  // Ω4-3 (D-Ω4-C2) — o índice PARCIAL financial_titles_wo_direction_active_key (só existe no SQL da
  // migration) dispara P2002 no 2º faturamento ativo da mesma OS+direção → 409 (rede da idempotência).
  // Ω4C PR-02 — financial_titles_source_direction_active_key dispara P2002 no 2º lançamento por origem →
  // 409 source_already_launched. Desambigua pelo alvo do índice (meta.target inclui "source").
  if (isPrismaError(error, "P2002")) {
    if (foreignKeyTarget(error).includes("source")) {
      return sourceAlreadyLaunchedError();
    }
    return workOrderAlreadyInvoicedError();
  }
  if (isPrismaError(error, "P2003")) {
    const target = foreignKeyTarget(error);
    if (target.includes("work_order")) {
      return new FinancialTitleError(400, "FINANCIAL_TITLE_INVALID", "invalid_work_order_reference", "The referenced work order does not exist for this tenant.");
    }
    return invalidAccountReferenceError();
  }
  return error;
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { readonly code?: unknown }).code === code;
}

function foreignKeyTarget(error: unknown): string {
  const meta = (error as { readonly meta?: Record<string, unknown> }).meta ?? {};
  return Object.values(meta).map((value) => String(value)).join(" ").toLowerCase();
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
