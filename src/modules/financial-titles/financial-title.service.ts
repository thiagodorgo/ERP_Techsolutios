import { env } from "../../config/env.js";
import { getMemoryFinancialAccountRepositoryForTests } from "../financial-accounts/financial-account.service.js";
import {
  InMemoryFinancialPeriodCloseRepository,
  InMemoryFinancialTitleRepository,
  invalidAccountReferenceError,
  overpaymentError,
  periodClosedError,
  titleAlreadyPaidError,
  titleCancelledError,
  titleNotFoundError,
  type FinancialPeriodCloseRepository,
  type FinancialTitleRepository,
} from "./financial-title.repository.js";
import type {
  CreateFinancialTitleForWorkOrderInput,
  FinancialTitle,
  FinancialTitleActorContext,
  ListFinancialTitleInput,
  ListFinancialTitleResult,
} from "./financial-title.types.js";
import {
  assertStatusTransition,
  deriveCompetencia,
  parseAmount,
  parseCurrency,
  parseDirection,
  parseDueDate,
  parseFilterToken,
  parseInitialStatus,
  parseIssueDate,
  parseLimit,
  parseOffset,
  parseOptionalCategory,
  parseOptionalClientActionId,
  parseOptionalDescription,
  parseOptionalDocument,
  parseOptionalFilterDate,
  parseOptionalUuid,
  parsePartyName,
  parsePartyType,
  parseRequiredUuid,
  parseTargetStatus,
  readOptionalBoolean,
  roundMoney,
} from "./financial-title.validators.js";

type RawRecord = Record<string, unknown>;

// account_id é validado por FK composta (tenant_id, account_id) → financial_accounts(tenant_id, id).
// No caminho Prisma a FK é a autoridade (P2003 → 400 invalid_account_reference); no InMemory o resolver
// consulta o repositório de Contas (surrogate da FK). Retorna true se existir uma conta do tenant.
export type AccountResolver = (tenantId: string, accountId: string) => Promise<boolean>;

export class FinancialTitleService {
  constructor(
    private readonly repository: FinancialTitleRepository,
    private readonly periodCloseRepository: FinancialPeriodCloseRepository,
    private readonly accountResolver: AccountResolver,
  ) {}

  async list(actor: FinancialTitleActorContext, query: RawRecord): Promise<ListFinancialTitleResult> {
    const input: ListFinancialTitleInput = {
      tenantId: actor.tenantId,
      includeDeleted: readOptionalBoolean(query.include_deleted ?? query.includeDeleted, "includeDeleted") ?? false,
      direction: parseFilterToken(query.direction),
      status: parseFilterToken(query.status),
      partyType: parseFilterToken(query.party_type ?? query.partyType),
      overdue: readOptionalBoolean(query.overdue, "overdue"),
      dueFrom: parseOptionalFilterDate(query.from ?? query.dueFrom),
      dueTo: parseOptionalFilterDate(query.to ?? query.dueTo),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: FinancialTitleActorContext, body: RawRecord): Promise<FinancialTitle> {
    // Tenant vem SEMPRE do ator autenticado; tenant_id no body é ignorado.
    const issueDate = parseIssueDate(body.issue_date ?? body.issueDate);
    const competencia = deriveCompetencia(issueDate);
    const accountId = parseOptionalUuid(body.account_id ?? body.accountId, "accountId");
    if (accountId !== undefined && !(await this.accountResolver(actor.tenantId, accountId))) {
      throw invalidAccountReferenceError();
    }

    // CHOKEPOINT — toda escrita atravessa ANTES de gravar (competência fechada → 422 period_closed).
    await this.assertPeriodOpen(actor.tenantId, competencia);

    return this.repository.create({
      tenantId: actor.tenantId,
      direction: parseDirection(body.direction),
      partyType: parsePartyType(body.party_type ?? body.partyType),
      partyId: parseOptionalUuid(body.party_id ?? body.partyId, "partyId"),
      partyName: parsePartyName(body.party_name ?? body.partyName),
      document: parseOptionalDocument(body.document),
      category: parseOptionalCategory(body.category),
      description: parseOptionalDescription(body.description),
      amount: parseAmount(body.amount),
      currency: parseCurrency(body.currency),
      issueDate,
      dueDate: parseDueDate(body.due_date ?? body.dueDate),
      status: parseInitialStatus(body.status),
      competencia,
      accountId,
      clientActionId: parseOptionalClientActionId(body.client_action_id ?? body.clientActionId),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  // Ω4-3 (D-Ω4-C1/C2) — FATURAMENTO OS→Título. Chamado (via dynamic import) pelo módulo de faturamento
  // com o agregado JÁ CONGELADO (amount/currency somados lá; este caminho NUNCA relê tarifa). Grava
  // work_order_id (proveniência + âncora do índice parcial). status nasce 'open'; competencia derivada de
  // issueDate. Passa pelo CHOKEPOINT (competência fechada → 422 period_closed). A idempotência (2º título
  // ativo da OS) é a rede do repositório: P2002 (Prisma) / índice simulado (InMemory) → 409
  // work_order_already_invoiced, que o faturamento traduz para `already_invoiced`.
  async createForWorkOrder(actor: FinancialTitleActorContext, input: CreateFinancialTitleForWorkOrderInput): Promise<FinancialTitle> {
    const issueDate = input.issueDate;
    const competencia = deriveCompetencia(issueDate);
    await this.assertPeriodOpen(actor.tenantId, competencia);

    return this.repository.create({
      tenantId: actor.tenantId,
      direction: parseDirection(input.direction),
      partyType: parsePartyType(input.partyType),
      partyId: input.partyId,
      partyName: parsePartyName(input.partyName),
      amount: parseAmount(input.amount),
      currency: parseCurrency(input.currency),
      issueDate,
      dueDate: input.dueDate,
      status: "open",
      competencia,
      workOrderId: input.workOrderId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  // Pré-check de idempotência do faturamento: existe título ATIVO para (OS, direção)?
  async findActiveByWorkOrder(
    actor: FinancialTitleActorContext,
    workOrderId: string,
    direction: string,
  ): Promise<FinancialTitle | undefined> {
    return this.repository.findActiveByWorkOrder(actor.tenantId, workOrderId, direction);
  }

  async get(actor: FinancialTitleActorContext, financialTitleId: string): Promise<FinancialTitle> {
    const title = await this.repository.findById(actor.tenantId, parseRequiredUuid(financialTitleId, "financialTitleId"));
    if (!title) {
      throw titleNotFoundError();
    }
    return title;
  }

  async update(actor: FinancialTitleActorContext, financialTitleId: string, body: RawRecord): Promise<FinancialTitle> {
    // PATCH em título deletado/inexistente/cross-tenant → 404 (o current serve o chokepoint e o 404).
    const current = await this.getWritable(actor, financialTitleId);
    await this.assertPeriodOpen(actor.tenantId, current.competencia);

    const rawDueDate = body.due_date ?? body.dueDate;
    const rawAmount = body.amount;
    const accountId = parseOptionalUuid(body.account_id ?? body.accountId, "accountId");
    if (accountId !== undefined && !(await this.accountResolver(actor.tenantId, accountId))) {
      throw invalidAccountReferenceError();
    }

    // Editáveis: party_name/document/category/description/amount/due_date/account_id. NÃO altera
    // status/paid_amount/competencia/direction/party_type (imutáveis pós-create nesta fatia).
    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      financialTitleId: current.id,
      partyName: body.party_name === undefined && body.partyName === undefined ? undefined : parsePartyName(body.party_name ?? body.partyName),
      document: parseOptionalDocument(body.document),
      category: parseOptionalCategory(body.category),
      description: parseOptionalDescription(body.description),
      amount: rawAmount === undefined ? undefined : parseAmount(rawAmount),
      dueDate: rawDueDate === undefined ? undefined : parseDueDate(rawDueDate),
      accountId,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw titleNotFoundError();
    }
    return updated;
  }

  async changeStatus(actor: FinancialTitleActorContext, financialTitleId: string, body: RawRecord): Promise<FinancialTitle> {
    const current = await this.getWritable(actor, financialTitleId);

    // CHOKEPOINT primeiro: competência fechada congela QUALQUER mutação, mesmo transição válida.
    await this.assertPeriodOpen(actor.tenantId, current.competencia);

    const target = parseTargetStatus(body.status);
    // partially_paid/paid não são destinos manuais (dirigidos por pagamentos no Ω4-4). Transição fora da
    // tabela (inclui cancelar depois de pago) → 422 invalid_status_transition.
    assertStatusTransition(current.status as never, target);

    const updated = await this.repository.changeStatus({
      tenantId: actor.tenantId,
      financialTitleId: current.id,
      status: target,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw titleNotFoundError();
    }
    return updated;
  }

  // Ω4-4 — guard-only read usado pela LIQUIDAÇÃO (módulo financial-entries) ANTES de gravar o lançamento
  // de caixa: 404 (inexistente/deletado); cancelado → 422 title_cancelled; já pago → 422 title_already_paid;
  // paid_amount + amount > amount → 422 overpayment. NÃO muta (o lançamento é criado depois; se falhar,
  // o título ainda não foi tocado). Retorna o título ESCREVÍVEL (direção/moeda que a liquidação lê).
  async assertPayable(actor: FinancialTitleActorContext, financialTitleId: string, amount: number): Promise<FinancialTitle> {
    const current = await this.getWritable(actor, financialTitleId);
    this.guardPayable(current, amount);
    return current;
  }

  // Ω4-4 — WRITE-PATH da liquidação: incrementa paid_amount e seta status ('paid' quando quita, senão
  // 'partially_paid') JUNTOS, contornando assertStatusTransition — é o ÚNICO caminho que alcança
  // partially_paid/paid. Re-valida a invariante (guardPayable) antes de gravar (defesa contra corrida).
  async applyPayment(actor: FinancialTitleActorContext, financialTitleId: string, amount: number): Promise<FinancialTitle> {
    const current = await this.getWritable(actor, financialTitleId);
    this.guardPayable(current, amount);
    const newPaid = roundMoney(current.paidAmount + amount);
    const status = newPaid >= current.amount ? "paid" : "partially_paid";
    const updated = await this.repository.applyPayment({
      tenantId: actor.tenantId,
      financialTitleId: current.id,
      paidAmount: newPaid,
      status,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw titleNotFoundError();
    }
    return updated;
  }

  // Invariante da liquidação: título liquidável e paid_amount + amount <= amount (sem overpayment).
  private guardPayable(title: FinancialTitle, amount: number): void {
    if (title.status === "cancelled") {
      throw titleCancelledError();
    }
    if (title.status === "paid") {
      throw titleAlreadyPaidError();
    }
    if (roundMoney(title.paidAmount + amount) > title.amount) {
      throw overpaymentError();
    }
  }

  async delete(actor: FinancialTitleActorContext, financialTitleId: string): Promise<FinancialTitle> {
    const current = await this.getWritable(actor, financialTitleId);
    await this.assertPeriodOpen(actor.tenantId, current.competencia);

    const removed = await this.repository.softDelete(actor.tenantId, current.id, actor.userId);
    if (!removed) {
      throw titleNotFoundError();
    }
    return removed;
  }

  // Localiza um título ESCREVÍVEL (existe, do tenant, não deletado). Fonte do 404 e da competência que o
  // chokepoint consulta antes de qualquer escrita (update/changeStatus/delete).
  private async getWritable(actor: FinancialTitleActorContext, financialTitleId: string): Promise<FinancialTitle> {
    const current = await this.repository.findById(actor.tenantId, parseRequiredUuid(financialTitleId, "financialTitleId"));
    if (!current || current.deletedAt != null) {
      throw titleNotFoundError();
    }
    return current;
  }

  // CHOKEPOINT reutilizável (D-Ω4-A3): consulta financial_period_closes por (tenant_id, period=competencia).
  // period ∈ {closing, closed} → 422 period_closed (guard M2, Ω4-6). Desde o Ω4-6 o endpoint de fechar POVOA a
  // tabela e o guard BLOQUEIA de verdade (reconcile NÃO passa por aqui → fica exento, D-Ω4-5-RECONCILE-META).
  private async assertPeriodOpen(tenantId: string, competencia: string): Promise<void> {
    if (await this.periodCloseRepository.isPeriodClosed(tenantId, competencia)) {
      throw periodClosedError(competencia);
    }
  }
}

const memoryTitleRepository = new InMemoryFinancialTitleRepository();
const memoryPeriodCloseRepository = new InMemoryFinancialPeriodCloseRepository();
let defaultServicePromise: Promise<FinancialTitleService> | undefined;

// Resolver InMemory: a FK composta ao Conta financeira é validada consultando o repositório InMemory de
// Contas (mesmo singleton usado pelo módulo Ω4-1). Existe row do tenant ⇒ FK satisfeita (independe de is_active).
const memoryAccountResolver: AccountResolver = async (tenantId, accountId) =>
  (await getMemoryFinancialAccountRepositoryForTests().findById(tenantId, accountId)) !== undefined;

export function createMemoryFinancialTitleService(): FinancialTitleService {
  return new FinancialTitleService(memoryTitleRepository, memoryPeriodCloseRepository, memoryAccountResolver);
}

export function getMemoryFinancialTitleRepositoryForTests(): InMemoryFinancialTitleRepository {
  return memoryTitleRepository;
}

export function getMemoryFinancialPeriodCloseRepositoryForTests(): InMemoryFinancialPeriodCloseRepository {
  return memoryPeriodCloseRepository;
}

export async function createDefaultFinancialTitleService(): Promise<FinancialTitleService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFinancialTitleService();
  }
  defaultServicePromise ??= createPrismaFinancialTitleService();
  return defaultServicePromise;
}

export function resetFinancialTitleRuntimeForTests(): void {
  memoryTitleRepository.reset();
  memoryPeriodCloseRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFinancialTitleService(): Promise<FinancialTitleService> {
  const { createPrismaFinancialTitleRepository, createPrismaFinancialPeriodCloseRepository } = await import(
    "./financial-title-prisma.repository.js"
  );
  const [repository, periodCloseRepository] = await Promise.all([
    createPrismaFinancialTitleRepository(),
    createPrismaFinancialPeriodCloseRepository(),
  ]);
  // No Prisma a FK composta é a autoridade da referência de conta (P2003 → 400); o resolver não pré-checa.
  return new FinancialTitleService(repository, periodCloseRepository, async () => true);
}
