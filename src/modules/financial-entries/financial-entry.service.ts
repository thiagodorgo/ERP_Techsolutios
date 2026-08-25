import { env } from "../../config/env.js";
import { getMemoryFinancialAccountRepositoryForTests } from "../financial-accounts/financial-account.service.js";
import {
  createMemoryFinancialTitleService,
  deriveCompetencia,
  getMemoryFinancialPeriodCloseRepositoryForTests,
  overpaymentError,
  titleAlreadyPaidError,
  titleCancelledError,
  titleNotFoundError,
  type FinancialPeriodCloseRepository,
  type FinancialTitleService,
} from "../financial-titles/index.js";
import {
  createDefaultFinancialUnitOfWork,
  type FinancialUowContext,
  type FinancialUowResolver,
} from "../financial-uow/index.js";
import {
  createDefaultChequeLinkReader,
  type ChequeLinkReaderResolver,
} from "../cheques/cheque-link-reader.js";
import {
  assertUndoOrdersCoverEveryRefusal,
  buildUndoOwnerPolicies,
  DELETE_UNDO_ORDER,
  REVERSE_UNDO_ORDER,
  type UndoOwnerId,
  type UndoOwnerPolicyTable,
  type UndoRoute,
} from "./financial-entry-undo-owners.js";
import {
  InMemoryFinancialEntryRepository,
  accountInactiveError,
  accountNotFoundError,
  alreadyReversedError,
  chequeEntryImmutableError,
  reversalPairImmutableError,
  currencyMismatchError,
  entryNotFoundError,
  invalidAccountReferenceError,
  periodClosedError,
  settlementEntryImmutableError,
  titleRestoreConflictError,
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

/**
 * B-O6R-02 ciclo 4 · C1 (P9) — a fonte de leitura dos vínculos de agregado que os detectores de
 * desfazimento consultam. Duas instâncias por serviço: `poolUndoReaders()` (fora da unidade, fast-fail
 * de precedência pública) e `unitUndoReaders(ctx)` (dentro da unidade, re-check sob o FOR UPDATE). A
 * separação existe porque o re-check da corrida delete×reverse TEM de ler da própria transação.
 */
interface UndoLinkReaders {
  /** Existe contrapartida de estorno ATIVA apontando este lançamento? */
  hasActiveReversal(tenantId: string, entryId: string): Promise<boolean>;
  /** Existe cheque ATIVO vinculado a este lançamento (por cleared_entry_id/bounce_entry_id)? */
  hasActiveChequeLink(tenantId: string, entryId: string): Promise<boolean>;
}

export class FinancialEntryService {
  constructor(
    private readonly repository: FinancialEntryRepository,
    private readonly periodCloseRepository: FinancialPeriodCloseRepository,
    private readonly accountReader: AccountReader,
    private readonly resolveTitleService: FinancialTitleServiceResolver,
    // B-O6R-02 F3/F4 — porta de Unit of Work dos fluxos multi-write (payTitle/reverse). Default = o
    // resolver por env (memória fora de produção; Prisma = transação real com trava de período).
    private readonly resolveUow: FinancialUowResolver = createDefaultFinancialUnitOfWork,
    // B-O6R-02 ciclo 2 · C2 (Ω6R-DIN-011) — leitura do vínculo cheque → lançamento, usada pelos
    // guards de `delete`/`reverse`. É o SEXTO parâmetro de propósito: a ordem dos cinco acima não
    // muda (a fixture do ciclo 1 posiciona o resolver da UoW na 5ª posição).
    private readonly resolveChequeLinkReader: ChequeLinkReaderResolver = createDefaultChequeLinkReader,
  ) {
    // P5 — a ordem de precedência não pode encolher em silêncio: dono que RECUSA numa rota e está
    // fora da ordem dela é uma recusa que ninguém percorre. O compilador cobre a ordem do `delete`
    // (igualdade de união); esta chamada cobre o `reverse`, cuja ordem é subconjunto de propósito.
    assertUndoOrdersCoverEveryRefusal(this.undoPolicies);
  }

  // A TABELA DE POLÍTICAS (C2/P5). As fábricas de erro entram aqui porque elas vivem no repositório;
  // o módulo de donos fica sem ciclo e sem conhecer a camada de erro.
  private readonly undoPolicies: UndoOwnerPolicyTable = buildUndoOwnerPolicies({
    reversalPairImmutable: reversalPairImmutableError,
    settlementEntryImmutable: settlementEntryImmutableError,
    chequeEntryImmutable: chequeEntryImmutableError,
  });

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
    // B-O6R-02 ciclo 3 · C2 (P5) — os guards de VÍNCULO DE AGREGADO deixaram de ser uma sequência de
    // ifs escrita à mão e passaram a ser a ORDEM `DELETE_UNDO_ORDER` percorrida contra a tabela de
    // políticas. Mesmas razões, mesma precedência, mesmos códigos — o que muda é que dono novo sem
    // política declarada não COMPILA, em vez de nascer permitido no silêncio entre dois ifs.
    // Precedência integral desta rota (inalterada):
    // 404 → entry_reconciled → reversal_pair_immutable → settlement_entry_immutable →
    // cheque_entry_immutable → period_closed (a identidade do lançamento decide antes da história).
    //
    // B-O6R-02 ciclo 4 · C1 (P9, Ω6R-DIN-002) — FAST-FAIL fora da unidade: estes pré-checks produzem a
    // precedência PÚBLICA de erros e leem do POOL. Nada aqui muda o contrato. A defesa que DECIDE contra
    // a corrida delete×reverse é o re-check DENTRO da unidade, sob o FOR UPDATE (o `delete` passou a
    // habitar o MESMO lar que o `reverse`: até o ciclo 3 ele fazia softDelete solto, sem lock nem
    // re-check, e a corrida fabricava saldo — medido 19/20 em memória, §0.1 do plano).
    await this.assertUndoAllowed("delete", DELETE_UNDO_ORDER, actor, current, this.poolUndoReaders());
    await this.assertPeriodOpen(actor.tenantId, current.competencia);

    const uow = await this.resolveUow();
    return uow.run(actor.tenantId, async (ctx) => {
      // Ordem global de locks: advisory de período ANTES de qualquer row lock (regra do lar único, a
      // MESMA do `reverse`) — sem isso o delete×reverse cruzaria a ordem de aquisição e poderia travar.
      await ctx.assertPeriodOpenShared(current.competencia, periodClosedError);

      // FOR UPDATE do próprio lançamento: o PERDEDOR da corrida acorda AQUI, no row lock. Sumiu/deletado
      // por quem chegou antes → 404 (mesmo erro do controle sequencial), nunca um softDelete cego.
      const locked = await ctx.entries.findByIdForUpdate(actor.tenantId, current.id);
      if (!locked || locked.deletedAt != null) {
        throw entryNotFoundError();
      }
      this.assertMutable(locked);
      // Re-check dos vínculos SOB o lock, com os leitores da UNIDADE (nunca o pool: dentro da tx a
      // leitura tem de ser da tx). Quem perdeu a corrida vê a contrapartida/estado commitado do
      // vencedor e recebe os MESMOS erros do controle sequencial (422 reversal_pair_immutable / 404).
      await this.assertUndoAllowed("delete", DELETE_UNDO_ORDER, actor, locked, this.unitUndoReaders(ctx));

      const removed = await ctx.entries.softDelete(actor.tenantId, locked.id, actor.userId);
      if (!removed) {
        throw entryNotFoundError();
      }
      return removed;
    });
  }

  // ESTORNO (P-Ω4-ESTORNO + B-O6R-02 F4, Ω6R-DIN-002) — cria um CONTRA-lançamento (direção invertida,
  // mesmo amount, reversal_of = original) na MESMA conta, e, se o original for uma LIQUIDAÇÃO
  // (title_id setado), DEVOLVE o pagamento ao título NA MESMA transação (restorePaymentGuarded:
  // paid_amount decrementa e o status recalcula — `= 0 → open`, parcial → partially_paid). NÃO faz
  // UPDATE destrutivo do original. competencia = corrente (server now) → chokepoint + trava SHARED
  // in-tx. Estornar o mesmo 2× → 409 already_reversed, INCLUSIVE concorrente: dentro da unidade o
  // original é lido com FOR UPDATE — o 2º estorno bloqueia nesse row lock e o re-check de reversão
  // ativa (na mesma tx) o mata; o índice parcial financial_entries_reversal_of_active_key é backstop.
  // O contra-lançamento nasce SEM title_id (não duplica contagem da liquidação).
  async reverse(actor: FinancialEntryActorContext, financialEntryId: string): Promise<FinancialEntry> {
    const original = await this.getWritable(actor, financialEntryId);
    // Ω4-5 (fecha P-Ω4-4-REVERSE-MUTABLE): estornar um lançamento CONCILIADO exige desconciliar antes → 422
    // entry_reconciled. Espelha a ordem de delete() (assertMutable ANTES do guard de par de estorno) → um
    // contra-lançamento conciliado dispara entry_reconciled com precedência sobre reversal_pair_immutable.
    this.assertMutable(original);
    // B-O6R-02 ciclo 3 · C2 (P5) — mesma tabela de políticas, ORDEM da rota `reverse`. Os detectores
    // de `reversal_pair` são DIFERENTES por rota e continuam diferentes: o `delete` recusa o
    // original JÁ ESTORNADO e a contrapartida; o `reverse` recusa só a contrapartida (estornar o
    // original já estornado é `already_reversed`, 409, mais abaixo). A tabela preserva a diferença,
    // não a unifica. E `title_settlement` é `allow` aqui — `reverse` É o fluxo do agregado título —,
    // o que antes era a AUSÊNCIA de um if e agora é uma linha assinada.
    // Precedência integral desta rota (inalterada):
    // 404 → entry_reconciled → reversal_pair_immutable → cheque_entry_immutable → already_reversed
    // → period_closed (a IDENTIDADE do lançamento decide antes da HISTÓRIA dele).
    await this.assertUndoAllowed("reverse", REVERSE_UNDO_ORDER, actor, original, this.poolUndoReaders());
    // FAST-FAIL (precedência de erros preservada); a defesa que decide é o re-check DENTRO da unidade.
    if (await this.repository.findActiveReversalOf(actor.tenantId, original.id)) {
      throw alreadyReversedError();
    }

    const occurredAt = new Date();
    const competencia = deriveCompetencia(occurredAt);
    await this.assertPeriodOpen(actor.tenantId, competencia);

    const uow = await this.resolveUow();
    return uow.run(actor.tenantId, async (ctx) => {
      // Ordem global de locks: advisory de período ANTES de qualquer row lock (regra do lar único).
      await ctx.assertPeriodOpenShared(competencia, periodClosedError);

      // FOR UPDATE do ORIGINAL: serializa estornos concorrentes do mesmo lançamento. A tupla travada
      // é a fonte estável dos re-checks e dos valores copiados para a contrapartida.
      const locked = await ctx.entries.findByIdForUpdate(actor.tenantId, original.id);
      if (!locked || locked.deletedAt != null) {
        throw entryNotFoundError();
      }
      this.assertMutable(locked);
      // Re-check DENTRO da tx: quem perdeu a corrida acorda aqui vendo a contrapartida commitada → 409.
      if (await ctx.entries.findActiveReversalOf(actor.tenantId, locked.id)) {
        throw alreadyReversedError();
      }

      const counter = await ctx.entries.create({
        tenantId: actor.tenantId,
        accountId: locked.accountId,
        direction: locked.direction === "in" ? "out" : "in",
        amount: locked.amount,
        currency: locked.currency,
        paymentMethod: locked.paymentMethod,
        category: locked.category,
        occurredAt,
        competencia,
        description: `Estorno de ${locked.id}`,
        reversalOf: locked.id,
        createdBy: actor.userId,
        updatedBy: actor.userId,
      });

      // DIN-002 — a devolução do pagamento vive NA MESMA unidade da contrapartida: ou commitam juntas
      // ou morrem juntas. Restore falhou (título deletado/estado legado) → fail-closed: aborta tudo.
      if (locked.titleId != null) {
        const restored = await ctx.titles.restorePaymentGuarded({
          tenantId: actor.tenantId,
          financialTitleId: locked.titleId,
          amount: locked.amount,
          updatedBy: actor.userId,
        });
        if (!restored) {
          throw titleRestoreConflictError();
        }
      }
      return counter;
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

  // LIQUIDAÇÃO (Ω4-4 → Título; B-O6R-02 F3, Ω6R-DIN-001 — fecha P-Ω4-4-LIQUID-ATOMIC) — TUDO-OU-NADA:
  // trava SHARED do período + re-check + lançamento + CAS do título numa ÚNICA unidade (porta UoW).
  // O que fecha a corrida sem client_action_id é o PAR: (a) o UPDATE do título é CONDICIONAL
  // (`paid_amount + X <= amount AND status NOT IN ('paid','cancelled')`) — a 2ª transação bloqueia no
  // row lock da vencedora e re-avalia o predicado contra a tupla NOVA → 0 linhas; (b) o lançamento do
  // perdedor vive NA MESMA transação → o 422 aborta e ele morre junto. Não existe estado intermediário
  // commitável. A idempotência permanece: P2002 do client_action_id DENTRO da transação → aborta →
  // 409 duplicate_payment ANTES de qualquer mutação do título. Pré-checks fora da tx são FAST-FAIL
  // (precedência de erros preservada); o FOR UPDATE entra SÓ na classificação do CAS que casou 0 linhas.
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
    // FAST-FAIL: 404 (inexistente/deletado/cross-tenant); cancelado → 422; já pago → 422; overpayment → 422.
    const title = await titleService.assertPayable(titleActor, parseRequiredUuid(financialTitleId, "financialTitleId"), amount);

    // moeda do lançamento = moeda da conta = moeda do título (single-currency por conta/título no v1).
    if (account.currency !== title.currency) {
      throw currencyMismatchError();
    }
    // receivable → dinheiro ENTRA (in); payable → dinheiro SAI (out).
    const direction = title.direction === "receivable" ? "in" : "out";

    await this.assertPeriodOpen(actor.tenantId, competencia);

    const uow = await this.resolveUow();
    return uow.run(actor.tenantId, async (ctx) => {
      // Ordem global de locks: advisory de período ANTES de qualquer row lock (regra do lar único).
      await ctx.assertPeriodOpenShared(competencia, periodClosedError);

      // Lançamento PRIMEIRO: o replay do client_action_id estoura P2002 → 409 AQUI, com o título
      // ainda intocado (e a transação inteira desfeita).
      const entry = await ctx.entries.create({
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

      // O CAS que decide a corrida. 0 linhas → classifica com leitura ESTÁVEL (FOR UPDATE) e aborta —
      // o lançamento acima morre no rollback (zero órfão, saldo da conta íntegro).
      const paid = await ctx.titles.applyPaymentGuarded({
        tenantId: actor.tenantId,
        financialTitleId: title.id,
        amount,
        updatedBy: actor.userId,
      });
      if (paid) {
        return entry;
      }

      const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, title.id);
      if (!locked || locked.deletedAt != null) {
        throw titleNotFoundError();
      }
      if (locked.status === "cancelled") {
        throw titleCancelledError();
      }
      if (locked.status === "paid") {
        throw titleAlreadyPaidError();
      }
      if (roundMoney(locked.paidAmount + amount) > locked.amount) {
        throw overpaymentError();
      }
      // Janela raríssima: entre o CAS 0-linhas e o FOR UPDATE alguém abriu espaço (ex.: estorno
      // reabriu o título). Com o row lock seguro, o retry é determinístico — e se ainda assim falhar,
      // fail-closed em overpayment (nunca commita lançamento sem o título mutado junto).
      const retried = await ctx.titles.applyPaymentGuarded({
        tenantId: actor.tenantId,
        financialTitleId: title.id,
        amount,
        updatedBy: actor.userId,
      });
      if (!retried) {
        throw overpaymentError();
      }
      return entry;
    });
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

  // ---------------------------------------------------------------------------------------------
  // B-O6R-02 ciclo 3 · C2 (P5) — O PERCURSO DAS POLÍTICAS.
  //
  // Para cada dono NA ORDEM da rota: se o lançamento pertence a ele (detector), aplica a política
  // daquela CÉLULA — `refuse` lança o erro nomeado, `allow` segue adiante. Um dono novo só chega
  // aqui depois de ter as duas células escritas (compilador) e de estar na ordem (compilador, para
  // `delete`; `assertUndoOrdersCoverEveryRefusal` em runtime, para o `reverse`).
  // ---------------------------------------------------------------------------------------------
  private async assertUndoAllowed(
    route: UndoRoute,
    order: readonly UndoOwnerId[],
    actor: FinancialEntryActorContext,
    entry: FinancialEntry,
    readers: UndoLinkReaders,
  ): Promise<void> {
    for (const owner of order) {
      if (!(await this.ownsEntry(owner, route, actor.tenantId, entry, readers))) continue;
      const policy = this.undoPolicies[owner][route];
      if (policy.kind === "refuse") throw policy.error();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // B-O6R-02 ciclo 4 · C1 (P9) — DE ONDE o detector LÊ o vínculo é injetado.
  //
  // O detector de `reversal_pair`/`cheque_link` pergunta ao banco "existe contrapartida/vínculo
  // ATIVO?". A resposta muda conforme se lê o POOL (fora da unidade, para o fast-fail de precedência
  // pública) ou a PRÓPRIA transação (dentro da unidade, para o re-check sob o FOR UPDATE). Um re-check
  // que lesse do pool reabriria a corrida que o lock existe para fechar — é exatamente o buraco do B-1.
  // Por isso os leitores entram por parâmetro, e o `delete`/`reverse` escolhem a fonte certa em cada
  // ponto (pool no fast-fail, `ctx.*` sob o lock).
  // ---------------------------------------------------------------------------------------------
  private poolUndoReaders(): UndoLinkReaders {
    return {
      hasActiveReversal: async (tenantId, entryId) =>
        (await this.repository.findActiveReversalOf(tenantId, entryId)) != null,
      hasActiveChequeLink: async (tenantId, entryId) => {
        // Fonte única do vínculo cheque → lançamento (as duas pontas cleared/bounce). Fora da unidade
        // é o reader de pool env-switched; nenhuma API move o vínculo depois do nascimento.
        const chequeLinks = await this.resolveChequeLinkReader();
        return (await chequeLinks.findActiveByLinkedEntry(tenantId, entryId)) != null;
      },
    };
  }

  private unitUndoReaders(ctx: FinancialUowContext): UndoLinkReaders {
    return {
      // DENTRO da tx: a leitura tem de ser da tx (estado commitado do vencedor da corrida visível sob o lock).
      hasActiveReversal: async (tenantId, entryId) =>
        (await ctx.entries.findActiveReversalOf(tenantId, entryId)) != null,
      hasActiveChequeLink: async (tenantId, entryId) =>
        (await ctx.cheques.findActiveByLinkedEntry(tenantId, entryId)) != null,
    };
  }

  /**
   * DETECTOR por dono — e, no `reversal_pair`, POR ROTA, porque as duas rotas realmente perguntam
   * coisas diferentes (essa diferença é comportamento vigente, não acidente: unificá-la mudaria o
   * código de erro de um caso e o refactor tem de ser 100% preservador). DE ONDE se lê o vínculo vem
   * pelo bundle `readers` (§C1: pool no fast-fail; `ctx.*` sob o lock).
   */
  private async ownsEntry(
    owner: UndoOwnerId,
    route: UndoRoute,
    tenantId: string,
    entry: FinancialEntry,
    readers: UndoLinkReaders,
  ): Promise<boolean> {
    switch (owner) {
      case "reversal_pair":
        // `delete`: é contrapartida OU já foi estornado (apagar qualquer metade desbalanceia).
        // `reverse`: só a contrapartida — estornar o original já estornado é `already_reversed` (409).
        return route === "delete"
          ? entry.reversalOf != null || (await readers.hasActiveReversal(tenantId, entry.id))
          : entry.reversalOf != null;
      case "title_settlement":
        return entry.titleId != null;
      case "cheque_link":
        // Livre de corrida POR CONSTRUÇÃO: os vínculos nascem com o lançamento (clear/bounce criam e
        // vinculam na mesma unidade) e nenhuma API os move depois. As DUAS pontas são consultadas pela
        // fonte única do `cheque.types.ts` — ver `CHEQUE_ENTRY_LINK_FIELDS`.
        return await readers.hasActiveChequeLink(tenantId, entry.id);
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
