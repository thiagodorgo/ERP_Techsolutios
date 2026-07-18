import { env } from "../../config/env.js";
import { getMemoryFinancialAccountRepositoryForTests } from "../financial-accounts/financial-account.service.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  type FinancialPeriodCloseRepository,
  type FinancialTitleService,
} from "../financial-titles/index.js";
import {
  InMemoryFinancialEntryRepository,
  accountInactiveError,
  accountNotFoundError,
  alreadyReversedError,
  reversalPairImmutableError,
  currencyMismatchError,
  entryNotFoundError,
  invalidAccountReferenceError,
  periodClosedError,
  type AccountReader,
  type FinancialAccountRef,
  type FinancialEntryRepository,
} from "./financial-entry.repository.js";
import type {
  CreateFinancialEntryInput,
  FinancialAccountBalance,
  FinancialEntry,
  FinancialEntryActorContext,
  ListFinancialEntryInput,
  ListFinancialEntryResult,
} from "./financial-entry.types.js";
import { FinancialEntryError } from "./financial-entry.types.js";
import {
  parseAmount,
  parseDirection,
  parseFilterToken,
  parseLimit,
  parseOccurredAt,
  parseOffset,
  parseOptionalCategory,
  parseOptionalClientActionId,
  parseOptionalDescription,
  parseOptionalDivergenceType,
  parseOptionalFilterBoolean,
  parseOptionalFilterDate,
  parseOptionalFilterUuid,
  parseOptionalReconciliationRef,
  parsePaymentMethod,
  parseReconciledFlag,
  parseRequiredUuid,
  readOptionalBoolean,
  resolveCurrency,
  roundMoney,
} from "./financial-entry.validators.js";

type RawRecord = Record<string, unknown>;

export type FinancialTitleServiceResolver = () => Promise<FinancialTitleService>;

export class FinancialEntryService {
  constructor(
    private readonly repository: FinancialEntryRepository,
    private readonly periodCloseRepository: FinancialPeriodCloseRepository,
    private readonly accountReader: AccountReader,
    private readonly resolveTitleService: FinancialTitleServiceResolver,
  ) {}

  async list(actor: FinancialEntryActorContext, query: RawRecord): Promise<ListFinancialEntryResult> {
    const input: ListFinancialEntryInput = {
      tenantId: actor.tenantId,
      includeDeleted: readOptionalBoolean(query.include_deleted ?? query.includeDeleted, "includeDeleted") ?? false,
      accountId: parseOptionalFilterUuid(query.account_id ?? query.accountId),
      direction: parseFilterToken(query.direction),
      category: parseFilterToken(query.category),
      reconciled: parseOptionalFilterBoolean(query.reconciled),
      divergenceType: parseFilterToken(query.divergence_type ?? query.divergenceType),
      occurredFrom: parseOptionalFilterDate(query.from ?? query.occurredFrom),
      occurredTo: parseOptionalFilterDate(query.to ?? query.occurredTo),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  // Lançamento AVULSO. Tenant vem SEMPRE do ator; title_id/reversal_of/reconciled do corpo são IGNORADOS
  // (title_id só é setado pela liquidação; reversal_of pelo estorno; reconciled é Ω4-5).
  async create(actor: FinancialEntryActorContext, body: RawRecord): Promise<FinancialEntry> {
    const account = await this.resolveActiveAccount(actor.tenantId, parseRequiredUuid(body.account_id ?? body.accountId, "accountId"));
    const currency = resolveCurrency(body.currency, account.currency);
    const occurredAt = parseOccurredAt(body.occurred_at ?? body.occurredAt);
    const competencia = deriveCompetencia(occurredAt);

    // CHOKEPOINT (D-Ω4-A3) — toda escrita de lançamento atravessa ANTES de gravar (competência fechada
    // → 422 period_closed). Mesma tabela financial_period_closes do título (chokepoint reusado).
    await this.assertPeriodOpen(actor.tenantId, competencia);

    return this.repository.create({
      tenantId: actor.tenantId,
      accountId: account.id,
      direction: parseDirection(body.direction),
      amount: parseAmount(body.amount),
      currency,
      paymentMethod: parsePaymentMethod(body.payment_method ?? body.paymentMethod),
      category: parseOptionalCategory(body.category),
      occurredAt,
      competencia,
      description: parseOptionalDescription(body.description),
      clientActionId: parseOptionalClientActionId(body.client_action_id ?? body.clientActionId),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: FinancialEntryActorContext, financialEntryId: string): Promise<FinancialEntry> {
    const entry = await this.repository.findById(actor.tenantId, parseRequiredUuid(financialEntryId, "financialEntryId"));
    if (!entry) {
      throw entryNotFoundError();
    }
    return entry;
  }

  // PATCH — só category/description. Lançamento reconciliado (Ω4-5) ou de competência fechada é IMUTÁVEL.
  async update(actor: FinancialEntryActorContext, financialEntryId: string, body: RawRecord): Promise<FinancialEntry> {
    const current = await this.getWritable(actor, financialEntryId);
    this.assertMutable(current);
    await this.assertPeriodOpen(actor.tenantId, current.competencia);

    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      financialEntryId: current.id,
      category: parseOptionalCategory(body.category),
      description: parseOptionalDescription(body.description),
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw entryNotFoundError();
    }
    return updated;
  }

  async delete(actor: FinancialEntryActorContext, financialEntryId: string): Promise<FinancialEntry> {
    const current = await this.getWritable(actor, financialEntryId);
    this.assertMutable(current);
    // A1 (pós-análise): lançamento em PAR de estorno é imutável. Deletar o original já estornado deixaria o
    // contra-lançamento ativo → saldo desbalanceado; deletar o próprio contra-lançamento desfaria o estorno.
    if (current.reversalOf != null || (await this.repository.findActiveReversalOf(actor.tenantId, current.id))) {
      throw reversalPairImmutableError();
    }
    await this.assertPeriodOpen(actor.tenantId, current.competencia);

    const removed = await this.repository.softDelete(actor.tenantId, current.id, actor.userId);
    if (!removed) {
      throw entryNotFoundError();
    }
    return removed;
  }

  // ESTORNO (P-Ω4-ESTORNO) — cria um CONTRA-lançamento (direção invertida, mesmo amount, reversal_of =
  // original) na MESMA conta. NÃO faz UPDATE destrutivo do original. competencia = corrente (server now)
  // → passa pelo chokepoint. Estornar o mesmo 2× → 409 already_reversed (idempotência por reversal_of).
  // NB: se o original for uma liquidação (title_id setado), o estorno NÃO reverte paid_amount do título
  // (concern do Ω4-5+; registrado em P-Ω4-4-EDGES) — o contra-lançamento nasce sem title_id.
  async reverse(actor: FinancialEntryActorContext, financialEntryId: string): Promise<FinancialEntry> {
    const original = await this.getWritable(actor, financialEntryId);
    // Ω4-5 (fecha P-Ω4-4-REVERSE-MUTABLE): estornar um lançamento CONCILIADO exige desconciliar antes → 422
    // entry_reconciled. Espelha a ordem de delete() (assertMutable ANTES do guard de par de estorno) → um
    // contra-lançamento conciliado dispara entry_reconciled com precedência sobre reversal_pair_immutable.
    this.assertMutable(original);
    // B1 (pós-análise): não se estorna um contra-lançamento (chain infinita de re-estorno flipando o saldo).
    if (original.reversalOf != null) {
      throw reversalPairImmutableError();
    }
    if (await this.repository.findActiveReversalOf(actor.tenantId, original.id)) {
      throw alreadyReversedError();
    }

    const occurredAt = new Date();
    const competencia = deriveCompetencia(occurredAt);
    await this.assertPeriodOpen(actor.tenantId, competencia);

    return this.repository.create({
      tenantId: actor.tenantId,
      accountId: original.accountId,
      direction: original.direction === "in" ? "out" : "in",
      amount: original.amount,
      currency: original.currency,
      paymentMethod: original.paymentMethod,
      category: original.category,
      occurredAt,
      competencia,
      description: `Estorno de ${original.id}`,
      reversalOf: original.id,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  // RECONCILE (Ω4-5, fecha P-Ω4-5-DIVERGENCE) — write-path da conciliação bancária. reconciled=true carimba
  // reconciled_at/by server-side; divergence_type ∈ {value,date} OU ausente (conciliação LIMPA, sem ressalva).
  // reconciled=false DESCONCILIA (limpa divergence_type/ref/at/by). NÃO chama assertMutable (é quem muda o
  // estado de conciliação) e NÃO checa reversal-pair: conciliar é sobre o EXTRATO, um lançamento de par de
  // estorno também consta lá (original e contra-lançamento podem casar no extrato).
  // NÃO atravessa o chokepoint de período (D-Ω4-5-RECONCILE-META, coerente com D-Ω4-POS-FECHAMENTO):
  // conciliação é META-DADO — não altera amount/direction/deleted, logo não mexe na soma da competência que o
  // fechamento protege. O extrato bancário chega DEPOIS do fechamento do mês → gate-ar por período fechado
  // travaria o caso de uso nº1 e congelaria o estado de conciliação para sempre. Passa independente do período.
  async reconcile(actor: FinancialEntryActorContext, financialEntryId: string, body: RawRecord): Promise<FinancialEntry> {
    const current = await this.getWritable(actor, financialEntryId); // 404 inexistente/deletado/cross-tenant
    const reconciled = parseReconciledFlag(body.reconciled);         // 400 invalid_reconciled

    const divergenceType = reconciled
      ? (parseOptionalDivergenceType(body.divergence_type ?? body.divergenceType) ?? null) // 400 invalid_divergence_type
      : null;
    const reconciliationRef = reconciled
      ? (parseOptionalReconciliationRef(body.reconciliation_ref ?? body.reconciliationRef) ?? null)
      : null;

    const updated = await this.repository.reconcile({
      tenantId: actor.tenantId,
      financialEntryId: current.id,
      reconciled,
      divergenceType,
      reconciliationRef,
      reconciledAt: reconciled ? new Date() : null, // carimbo server-side
      reconciledBy: reconciled ? actor.userId : null,
      updatedBy: actor.userId,
    });
    if (!updated) {
      throw entryNotFoundError();
    }
    return updated;
  }

  // LIQUIDAÇÃO (o gancho Ω4-4 → Título): cria um lançamento de caixa contra o título e dirige paid_amount/
  // status via applyPayment (WRITE-PATH do título). Orquestra o módulo de títulos por resolver injetado
  // (evita ciclo). Ordem: valida título/conta/moeda/overpayment ANTES → cria o lançamento (idempotência
  // via client_action_id: replay → 409 ANTES de mutar o título) → aplica o pagamento ao título.
  async payTitle(actor: FinancialEntryActorContext, financialTitleId: string, body: RawRecord): Promise<FinancialEntry> {
    const amount = parseAmount(body.amount);
    const account = await this.resolveActiveAccount(actor.tenantId, parseRequiredUuid(body.account_id ?? body.accountId, "accountId"));
    const paymentMethod = parsePaymentMethod(body.payment_method ?? body.paymentMethod);
    const occurredAt = parseOccurredAt(body.occurred_at ?? body.occurredAt);
    const competencia = deriveCompetencia(occurredAt);
    const description = parseOptionalDescription(body.description);
    const clientActionId = parseOptionalClientActionId(body.client_action_id ?? body.clientActionId);

    const titleService = await this.resolveTitleService();
    const titleActor = this.toTitleActor(actor);
    // 404 (inexistente/deletado/cross-tenant); cancelado → 422; já pago → 422; overpayment → 422.
    const title = await titleService.assertPayable(titleActor, parseRequiredUuid(financialTitleId, "financialTitleId"), amount);

    // moeda do lançamento = moeda da conta = moeda do título (single-currency por conta/título no v1).
    if (account.currency !== title.currency) {
      throw currencyMismatchError();
    }
    // receivable → dinheiro ENTRA (in); payable → dinheiro SAI (out).
    const direction = title.direction === "receivable" ? "in" : "out";

    await this.assertPeriodOpen(actor.tenantId, competencia);

    const entry = await this.repository.create({
      tenantId: actor.tenantId,
      accountId: account.id,
      titleId: title.id,
      direction,
      amount,
      currency: account.currency,
      paymentMethod,
      occurredAt,
      competencia,
      description,
      clientActionId,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    // Só DEPOIS do lançamento criado (idempotência já resolvida no create) muta o título. applyPayment
    // RE-valida guardPayable antes de gravar (o título NUNCA é sobre-pago). Ressalva: numa corrida real de 2
    // pagamentos SEM client_action_id, ambos criam lançamento e o 2º applyPayment recusa (422 overpayment)
    // com o lançamento já persistido → saldo da CONTA inflado (título consistente). Ver P-Ω4-4-LIQUID-ATOMIC
    // (ideal: entry.create + applyPayment na mesma $transaction). Com client_action_id o replay dá 409 antes.
    await titleService.applyPayment(titleActor, title.id, amount);
    return entry;
  }

  // Saldo/Extrato: opening_balance + Σ(in ativos) − Σ(out ativos), SOMADO no backend (front nunca soma).
  async balance(actor: FinancialEntryActorContext, financialAccountId: string): Promise<FinancialAccountBalance> {
    const account = await this.accountReader.findAccount(actor.tenantId, parseRequiredUuid(financialAccountId, "financialAccountId"));
    if (!account) {
      throw accountNotFoundError();
    }
    const { inflow, outflow } = await this.repository.sumByAccount(actor.tenantId, account.id);
    return {
      accountId: account.id,
      currency: account.currency,
      openingBalance: account.openingBalance,
      // B3 (pós-análise): arredonda os componentes ANTES e deriva o saldo deles → in/out/balance sempre
      // reconciliam (opening + in − out == balance), sem drift de 1 centavo em casos float-adversariais.
      in: roundMoney(inflow),
      out: roundMoney(outflow),
      balance: roundMoney(roundMoney(account.openingBalance) + roundMoney(inflow) - roundMoney(outflow)),
    };
  }

  // Conta OBRIGATÓRIA e ATIVA (P-Ω4-ACCOUNT-ACTIVE): inexistente → 400 invalid_account_reference;
  // existente mas inativa → 422 account_inactive. Retorna a conta (moeda usada na resolução da moeda).
  private async resolveActiveAccount(tenantId: string, accountId: string): Promise<FinancialAccountRef> {
    const account = await this.accountReader.findAccount(tenantId, accountId);
    if (!account) {
      throw invalidAccountReferenceError();
    }
    if (!account.isActive) {
      throw accountInactiveError();
    }
    return account;
  }

  // Localiza um lançamento ESCREVÍVEL (existe, do tenant, não deletado). Fonte do 404 e da competência
  // que o chokepoint consulta antes de qualquer mutação (update/delete/reverse).
  private async getWritable(actor: FinancialEntryActorContext, financialEntryId: string): Promise<FinancialEntry> {
    const current = await this.repository.findById(actor.tenantId, parseRequiredUuid(financialEntryId, "financialEntryId"));
    if (!current || current.deletedAt != null) {
      throw entryNotFoundError();
    }
    return current;
  }

  private assertMutable(entry: FinancialEntry): void {
    if (entry.reconciled) {
      throw new FinancialEntryError(422, "FINANCIAL_ENTRY_UNPROCESSABLE", "entry_reconciled", "A reconciled financial entry is immutable.");
    }
  }

  private async assertPeriodOpen(tenantId: string, competencia: string): Promise<void> {
    if (await this.periodCloseRepository.isPeriodClosed(tenantId, competencia)) {
      throw periodClosedError(competencia);
    }
  }

  private toTitleActor(actor: FinancialEntryActorContext) {
    return { tenantId: actor.tenantId, userId: actor.userId, roles: actor.roles, permissions: actor.permissions };
  }
}

const memoryEntryRepository = new InMemoryFinancialEntryRepository();
let defaultServicePromise: Promise<FinancialEntryService> | undefined;

// AccountReader InMemory: lê o repositório InMemory de Contas (mesmo singleton do Ω4-1) para moeda/
// atividade/saldo de abertura.
const memoryAccountReader: AccountReader = {
  async findAccount(tenantId, accountId): Promise<FinancialAccountRef | undefined> {
    const account = await getMemoryFinancialAccountRepositoryForTests().findById(tenantId, accountId);
    if (!account) return undefined;
    return { id: account.id, currency: account.currency, isActive: account.isActive, openingBalance: account.openingBalance };
  },
};

export function createMemoryFinancialEntryService(): FinancialEntryService {
  // Chokepoint REUSADO: mesmo repositório InMemory de fechamento de período do título (um período fechado
  // bloqueia título E lançamento). Título via createMemoryFinancialTitleService (mesmo singleton de títulos).
  return new FinancialEntryService(
    memoryEntryRepository,
    getMemoryFinancialPeriodCloseRepositoryForTests(),
    memoryAccountReader,
    () => Promise.resolve(createMemoryFinancialTitleService()),
  );
}

export function getMemoryFinancialEntryRepositoryForTests(): InMemoryFinancialEntryRepository {
  return memoryEntryRepository;
}

export async function createDefaultFinancialEntryService(): Promise<FinancialEntryService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFinancialEntryService();
  }
  defaultServicePromise ??= createPrismaFinancialEntryService();
  return defaultServicePromise;
}

export function resetFinancialEntryRuntimeForTests(): void {
  memoryEntryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFinancialEntryService(): Promise<FinancialEntryService> {
  const [{ createPrismaFinancialEntryRepository, createPrismaAccountReader }, { createPrismaFinancialPeriodCloseRepository }, { createDefaultFinancialTitleService }] =
    await Promise.all([
      import("./financial-entry-prisma.repository.js"),
      import("../financial-titles/financial-title-prisma.repository.js"),
      import("../financial-titles/financial-title.service.js"),
    ]);
  const [repository, accountReader, periodCloseRepository] = await Promise.all([
    createPrismaFinancialEntryRepository(),
    createPrismaAccountReader(),
    createPrismaFinancialPeriodCloseRepository(),
  ]);
  // Chokepoint REUSADO: mesma tabela financial_period_closes (repo de fechamento do título).
  return new FinancialEntryService(repository, periodCloseRepository, accountReader, createDefaultFinancialTitleService);
}
