import { env } from "../../config/env.js";
import { getMemoryFinancialAccountRepositoryForTests } from "../financial-accounts/financial-account.service.js";
import {
  currencyMismatchError,
  periodClosedError as entryPeriodClosedError,
  titleRestoreConflictError,
} from "../financial-entries/financial-entry.repository.js";
import {
  FinancialTitleError,
  createDefaultFinancialTitleService,
  deriveCompetencia,
  overpaymentError,
  roundMoney,
  titleAlreadyPaidError,
  titleCancelledError,
  titleNotFoundError,
  type FinancialTitle,
  type FinancialTitleService,
} from "../financial-titles/index.js";
import {
  createDefaultFinancialUnitOfWork,
  type FinancialUowContext,
  type FinancialUowResolver,
} from "../financial-uow/index.js";
import {
  CHEQUE_PENDING_STATUSES,
  InMemoryChequeRepository,
  accountInactiveError,
  chequeAmountMismatchError,
  chequeLinkedUnlinkFirstError,
  chequeNotEditableError,
  chequeNotFoundError,
  chequeNotLinkedError,
  chequeNotUnlinkableError,
  chequeWriteConflictError,
  invalidAccountReferenceError,
  invalidJustificationError,
  invalidTitleReferenceError,
  invalidTransitionError,
  titleDirectionMismatchError,
  transitionConflictError,
  unlinkRequiresPrivilegeError,
  type AccountReader,
  type ChequeRepository,
  type ChequeTitleUnlinker,
  type FinancialAccountRef,
} from "./cheque.repository.js";
import type {
  Cheque,
  ChequeActorContext,
  ChequeStatus,
  ListChequeInput,
  ListChequeResult,
} from "./cheque.types.js";
import { ChequeError } from "./cheque.types.js";
import {
  parseAmount,
  parseBank,
  parseChequeNumber,
  parseDirection,
  parseFilterToken,
  parseLimit,
  parseNullableDueDate,
  parseNullableNotes,
  parseNullableUuid,
  parseOffset,
  parseOptionalBounceReason,
  parseOptionalDueDate,
  parseOptionalFilterUuid,
  parseOptionalNotes,
  parseRequiredUuid,
  readOptionalBoolean,
  resolveCurrency,
} from "./cheque.validators.js";

type RawRecord = Record<string, unknown>;
type FinancialTitleServiceResolver = () => Promise<FinancialTitleService>;

// Permissão FINANCEIRA forte exigida pelas transições que MOVEM dinheiro (compensar/devolver-após-compensar):
// a escrita do lançamento pela unidade (UoW) NÃO reatravessa a rota /financial-entries, então o gate de
// dinheiro é reafirmado aqui (defesa em profundidade). Sem ela, um ator com só cheques:update movimentaria caixa
// pela porta dos fundos do cheque (achado ALTA do ataque). Fonte ÚNICA da constante — a rota importa daqui
// (evita divergência rota↔serviço; condição BAIXA da junta).
export const FINANCIAL_WRITE_PERMISSION = "financial_entries:create" as const;

// B-SAN3-12a (§4.3, decisão do dono 24/10: "trocar a vinculacao do cheque por outro meio de pagamento [...] requer
// privilegios altos") — a permissão que tira (ou troca) o título de um cheque. Fonte ÚNICA: a rota
// `POST /cheques/:id/unlink-title` e o fecho do bypass do `PATCH` (título nulo ou diferente) leem daqui.
export const CHEQUE_UNLINK_PERMISSION = "cheques:unlink_title" as const;

// Justificativa do desvínculo: obrigatória, 10–500 caracteres depois do trim (400 invalid_justification).
const JUSTIFICATION_MIN = 10;
const JUSTIFICATION_MAX = 500;
// B-SAN3-12a, ciclo 2 (A30; C2-01) — a justificativa é rastro de ato privilegiado: só texto GRAVÁVEL e LEGÍVEL. U+0000 e
// surrogate isolado o jsonb recusa (a auditoria best-effort caía e o desvínculo ficava sem rastro); os demais controles C0
// (salvo TAB, LF e CR) e o DEL adulteram a leitura em tela, terminal e log. Unicode válido segue aceito e gravado verbatim.
// eslint-disable-next-line no-control-regex
const JUSTIFICATION_FORBIDDEN_CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
// `String.prototype.isWellFormed` existe em runtime desde o Node 20 (o `engines` do repositório); a `lib` do tsconfig
// ainda não a declara, daí o tipo local (sem mexer no tsconfig).
type WellFormedCheckable = string & { isWellFormed(): boolean };

export function parseUnlinkJustification(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < JUSTIFICATION_MIN || normalized.length > JUSTIFICATION_MAX) throw invalidJustificationError();
  if (!(normalized as WellFormedCheckable).isWellFormed() || JUSTIFICATION_FORBIDDEN_CONTROL.test(normalized)) {
    throw new ChequeError(
      400,
      "CHEQUE_INVALID",
      "invalid_justification",
      "justification contains control characters or malformed text (no U+0000, no lone surrogate, no C0 control except TAB/LF/CR, no DEL).",
    );
  }
  return normalized;
}

// R-res-2 do plano v3 ("requisito v3: 400 bounce_reason_required") — devolver um cheque VINCULADO ainda `deposited`
// tira-o do conjunto pendente do título sem privilégio: o motivo passa a ser obrigatório nesse caso.
function bounceReasonRequiredError(): ChequeError {
  return new ChequeError(400, "CHEQUE_INVALID", "bounce_reason_required", "A bounce reason is required for a cheque linked to a financial title.");
}

export type ChequeUnlinkResult = {
  readonly cheque: Cheque;
  readonly previousTitleId: string;
  readonly justification: string;
  // R-res-3 do plano v3 — o cheque desvinculado ainda `deposited` pode compensar e postar caixa SEM título.
  readonly warning?: "cheque_still_depositable";
};

// Transições LEGAIS da máquina de estados. registered→{deposited,cancelled}; deposited→{cleared,bounced};
// cleared→{bounced}. bounced/cancelled são TERMINAIS. Qualquer outra → 422 invalid_transition.
const LEGAL_TRANSITIONS: Readonly<Record<ChequeStatus, readonly ChequeStatus[]>> = {
  registered: ["deposited", "cancelled"],
  deposited: ["cleared", "bounced"],
  cleared: ["bounced"],
  bounced: [],
  cancelled: [],
};

export class ChequeService {
  constructor(
    // B-SAN3-12a — o repositório também desvincula (`ChequeTitleUnlinker`): escrita própria, fora do contrato da unidade.
    private readonly repository: ChequeRepository & ChequeTitleUnlinker,
    private readonly accountReader: AccountReader,
    // B-O6R-02 F5 — porta de Unit of Work: clear/bounce-após-clear rodam transição + lançamento +
    // vínculo como UMA unidade (falha → o cheque volta ao estado anterior PELO BANCO).
    private readonly resolveUow: FinancialUowResolver = createDefaultFinancialUnitOfWork,
    private readonly resolveTitleService: FinancialTitleServiceResolver = createDefaultFinancialTitleService,
  ) {}

  async list(actor: ChequeActorContext, query: RawRecord): Promise<ListChequeResult> {
    const input: ListChequeInput = {
      tenantId: actor.tenantId,
      includeDeleted: readOptionalBoolean(query.include_deleted ?? query.includeDeleted, "includeDeleted") ?? false,
      accountId: parseOptionalFilterUuid(query.account_id ?? query.accountId),
      titleId: parseOptionalFilterUuid(query.title_id ?? query.titleId),
      direction: parseFilterToken(query.direction),
      status: parseFilterToken(query.status),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  // REGISTRAR — valida conta ATIVA + moeda + amount na faixa Decimal(12,2) → o cheque nasce COMPENSÁVEL.
  // status nasce 'registered'; nenhum caixa é postado no registro (due_date é memo). tenant vem do ator.
  async create(actor: ChequeActorContext, body: RawRecord): Promise<Cheque> {
    const account = await this.resolveActiveAccount(actor.tenantId, parseRequiredUuid(body.account_id ?? body.accountId, "accountId"));
    const currency = resolveCurrency(body.currency, account.currency);
    const direction = parseDirection(body.direction);
    const amount = parseAmount(body.amount);
    const titleId = parseNullableUuid(body.title_id ?? body.titleId, "titleId") ?? undefined;
    const input = {
      tenantId: actor.tenantId,
      accountId: account.id,
      titleId,
      direction,
      chequeNumber: parseChequeNumber(body.cheque_number ?? body.chequeNumber),
      bank: parseBank(body.bank),
      amount,
      currency,
      dueDate: parseOptionalDueDate(body.due_date ?? body.dueDate),
      notes: parseOptionalNotes(body.notes),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    };
    if (titleId === undefined) return this.repository.create(input);

    // B-SAN3-12a (§4.2, R2-02) — VINCULAR trava a linha do título. Fast-fail pelo pool (precedência pública) e
    // re-validação SOB o lock, dentro da unidade: a baixa (`payTitle`) trava a MESMA linha antes de reler o conjunto
    // pendente, então vínculo e baixa do mesmo título se serializam.
    await this.validateTitleLink(actor, titleId, direction, amount, currency);
    const uow = await this.resolveUow();
    return uow.run(actor.tenantId, async (ctx) => {
      await this.revalidateTitleLinkUnderLock(ctx, actor, titleId, direction, amount, currency);
      return ctx.cheques.create(input);
    });
  }

  async get(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    return this.getWritable(actor, chequeId);
  }

  // PATCH — edita cheque_number/bank/due_date/notes SÓ enquanto 'registered'. A checagem de estado vive no
  // SERVIÇO (paridade InMemory↔Prisma: senão o WHERE status='registered' do Prisma daria 404, não 422).
  // due_date/notes nuláveis: null explícito limpa; ausente não mexe.
  async update(actor: ChequeActorContext, chequeId: string, body: RawRecord): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    this.assertEditable(current);
    // due_date é NULÁVEL (null explícito limpa): escolher a chave por PRESENÇA, não por `??` — senão
    // {due_date: null} colapsaria para o alias camel undefined e o "limpar" seria silenciosamente ignorado.
    const dueDateRaw = body.due_date !== undefined ? body.due_date : body.dueDate;
    const titleIdRaw = body.title_id !== undefined ? body.title_id : body.titleId;
    const parsedTitleId = parseNullableUuid(titleIdRaw, "titleId");
    // O mesmo título que já está lá não é mudança de vínculo (nada a validar nem a privilegiar).
    const titleId = parsedTitleId === current.titleId || (parsedTitleId === null && current.titleId === undefined) ? undefined : parsedTitleId;
    // B-SAN3-12a (§4.3, fecho do bypass; D1 da Emenda E1) — TIRAR o título (null) ou TROCÁ-LO por outro NÃO é PATCH:
    // sem o privilégio da troca → 403 `unlink_requires_privilege`; com ele → 422 `cheque_linked_unlink_first` (a única
    // porta que tira o vínculo é `POST /cheques/:id/unlink-title`, com justificativa e auditoria Crítica). Vincular pela
    // primeira vez (título atual nulo) continua `cheques:update`.
    if (titleId !== undefined && current.titleId !== undefined) {
      if (!actor.permissions.includes(CHEQUE_UNLINK_PERMISSION)) throw unlinkRequiresPrivilegeError();
      throw chequeLinkedUnlinkFirstError();
    }
    const input = {
      tenantId: actor.tenantId,
      chequeId: current.id,
      chequeNumber: body.cheque_number !== undefined || body.chequeNumber !== undefined ? parseChequeNumber(body.cheque_number ?? body.chequeNumber) : undefined,
      bank: body.bank !== undefined ? parseBank(body.bank) : undefined,
      titleId,
      dueDate: parseNullableDueDate(dueDateRaw),
      notes: parseNullableNotes(body.notes),
      updatedBy: actor.userId,
    };
    if (typeof titleId !== "string") {
      const updated = await this.repository.update(input);
      if (!updated) return this.throwChequeWriteConflict(actor, current.id);
      return updated;
    }

    // 1º vínculo = travar o título e revalidar sob o lock (§4.2, R2-02) e, na escrita, o CAS do título LIDO (A27): só
    // grava se o cheque continua SEM título — quem vinculou no meio vence, e este perde com 409.
    await this.validateTitleLink(actor, titleId, current.direction, current.amount, current.currency);
    const uow = await this.resolveUow();
    return uow.run(actor.tenantId, async (ctx) => {
      await this.revalidateTitleLinkUnderLock(ctx, actor, titleId, current.direction, current.amount, current.currency);
      const updated = await ctx.cheques.update({ ...input, expectedTitleId: current.titleId ?? null });
      if (!updated) return this.throwChequeWriteConflict(actor, current.id, current.titleId);
      return updated;
    });
  }

  // B-SAN3-12a (§4.3) — TROCAR A VINCULAÇÃO: tira o título do cheque pendente (registered|deposited) para que o título
  // possa ser liquidado por outro meio. Privilégio alto (`cheques:unlink_title`, gate na rota) + justificativa
  // obrigatória; o controller grava a auditoria Crítica `cheque.title_unlinked`. CAS de estado: 0 linhas → 409.
  // Precedência: 400 justificativa → 404 cheque → 422 cheque_not_linked → 422 cheque_not_unlinkable → 409.
  async unlinkTitle(actor: ChequeActorContext, chequeId: string, body: RawRecord): Promise<ChequeUnlinkResult> {
    const justification = parseUnlinkJustification(body.justification);
    const current = await this.getWritable(actor, chequeId);
    if (current.titleId === undefined) throw chequeNotLinkedError();
    if (!(CHEQUE_PENDING_STATUSES as readonly string[]).includes(current.status)) throw chequeNotUnlinkableError();
    const unlinked = await this.repository.unlinkTitle({
      tenantId: actor.tenantId,
      chequeId: current.id,
      expectedTitleId: current.titleId,
      updatedBy: actor.userId,
    });
    if (!unlinked) throw chequeWriteConflictError();
    return {
      cheque: unlinked,
      previousTitleId: current.titleId,
      justification,
      ...(unlinked.status === "deposited" ? { warning: "cheque_still_depositable" as const } : {}),
    };
  }

  async delete(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    this.assertEditable(current);
    // B-SAN3-12a (§4.3, decisão do dono 25/10 "Mesmo privilégio da troca") — excluir cheque vinculado é troca.
    if (current.titleId !== undefined) throw chequeLinkedUnlinkFirstError();
    // A27 — o CAS do título lido (sem título): quem vinculou no meio vence, e o DELETE perde com 409.
    const removed = await this.repository.softDelete(actor.tenantId, current.id, actor.userId, { expectedTitleId: current.titleId ?? null });
    if (!removed) return this.throwChequeWriteConflict(actor, current.id, current.titleId);
    return removed;
  }

  // DEPOSITAR (registered→deposited) — não posta caixa (o cheque foi apresentado ao banco, ainda sem compensar).
  async deposit(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    return this.flipOnly(actor, chequeId, "deposited");
  }

  // CANCELAR (registered→cancelled) — não posta caixa (nunca houve movimento).
  // B-SAN3-12a (§4.3) — cancelar cheque VINCULADO é troca de instrumento: só depois do desvínculo, para todo ator.
  async cancel(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    return this.flipOnly(actor, chequeId, "cancelled", (current) => {
      if (current.titleId !== undefined) throw chequeLinkedUnlinkFirstError();
    }, true);
  }

  // COMPENSAR (deposited→cleared) — MOVE DINHEIRO. B-O6R-02 F5 (Ω6R-DIN-003): transição (CAS, o mutex
  // preservado — perdedor → 409), lançamento (server-now → competência CORRENTE, com trava SHARED +
  // re-check DENTRO da tx) e vínculo cleared_entry_id rodam como UMA transação. Qualquer falha →
  // rollback PELO BANCO: o cheque volta ao estado anterior sem código de compensação (o best-effort
  // `.catch(() => {})` foi DELETADO — deixou de existir, não virou cinto extra). Conta ativa + moeda
  // são pré-validadas FAIL-FAST (mesmos erros de antes, agora sem nem tocar o cheque).
  async clear(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    this.assertTransition(current.status, "cleared");
    this.assertCanMoveMoney(actor);
    if (current.titleId !== undefined) {
      await (await this.resolveTitleService()).assertPayable(actor, current.titleId, current.amount);
    }
    await this.assertPostableAccount(actor.tenantId, current);

    const occurredAt = new Date();
    const competencia = deriveCompetencia(occurredAt);
    const uow = await this.resolveUow();
    return uow.run(actor.tenantId, (ctx) =>
      this.moveMoneyInUnit(ctx, actor, current, {
        fromStatus: "deposited",
        toStatus: "cleared",
        competencia,
        occurredAt,
        direction: current.direction === "received" ? "in" : "out",
        category: "cheque_clearing",
        description: `Compensação de cheque ${current.chequeNumber}`,
        attach: (entryId) => ctx.cheques.attachClearingEntry(actor.tenantId, current.id, entryId, actor.userId),
        transitionExtras: { clearedEntryId: null },
      }),
    );
  }

  // DEVOLVER (bounce). deposited→bounced: sem caixa (nunca compensou) — CAS simples, fora da unidade.
  // cleared→bounced: MOVE DINHEIRO — posta um CONTRA-lançamento NOVO (direção invertida,
  // category='cheque_bounce', server-now) em vez de reverse() do original — assim NÃO é travado por
  // conciliação do lançamento compensado (Ω4-5) e preserva a conciliação dele. B-O6R-02 F5: transição +
  // contra-lançamento + vínculo na MESMA transação (mutex preservado; falha → rollback pelo banco).
  // bounce_reason opcional (motivo da devolução — auditoria).
  async bounce(actor: ChequeActorContext, chequeId: string, body: RawRecord): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    const reason = parseOptionalBounceReason(body.reason ?? body.bounce_reason) ?? null;
    // R-res-2 do plano v3 — devolver cheque VINCULADO ainda `deposited` tira-o do conjunto pendente do título: o motivo
    // é obrigatório (o controller audita a devolução com o título, severidade `warning`).
    if (current.titleId !== undefined && current.status === "deposited" && reason === null) throw bounceReasonRequiredError();

    if (current.status === "deposited") {
      const flipped = await this.repository.transition({
        tenantId: actor.tenantId,
        chequeId: current.id,
        fromStatus: "deposited",
        toStatus: "bounced",
        bounceReason: reason,
        updatedBy: actor.userId,
      });
      if (!flipped) throw transitionConflictError();
      return flipped;
    }

    if (current.status === "cleared") {
      this.assertCanMoveMoney(actor);
      await this.assertPostableAccount(actor.tenantId, current);

      const occurredAt = new Date();
      const competencia = deriveCompetencia(occurredAt);
      const uow = await this.resolveUow();
      return uow.run(actor.tenantId, (ctx) =>
        this.moveMoneyInUnit(ctx, actor, current, {
          fromStatus: "cleared",
          toStatus: "bounced",
          competencia,
          occurredAt,
          direction: current.direction === "received" ? "out" : "in",
          category: "cheque_bounce",
          description: `Devolução de cheque ${current.chequeNumber}`,
          attach: (entryId) => ctx.cheques.attachBounceEntry(actor.tenantId, current.id, entryId, actor.userId),
          transitionExtras: { bounceReason: reason },
        }),
      );
    }

    // registered/bounced/cancelled → devolver é ilegal.
    throw invalidTransitionError(current.status, "bounced");
  }

  // B-O6R-02 F5 — a RECEITA transacional única de mover dinheiro do cheque (clear e bounce-após-clear):
  // trava SHARED de período + re-check (advisory ANTES do row lock do cheque — ordem global de locks
  // do lar único), transição CAS (o mutex: perdedor casa 0 linhas → 409 com a unidade ainda limpa),
  // lançamento server-now (payment_method='check'; a due_date "bom para" é memo e nunca entra na
  // competência) e vínculo do entry id — tudo commit-junto-ou-morre-junto.
  private async moveMoneyInUnit(
    ctx: FinancialUowContext,
    actor: ChequeActorContext,
    cheque: Cheque,
    input: {
      readonly fromStatus: ChequeStatus;
      readonly toStatus: ChequeStatus;
      readonly competencia: string;
      readonly occurredAt: Date;
      readonly direction: "in" | "out";
      readonly category: string;
      readonly description: string;
      readonly attach: (entryId: string) => Promise<Cheque | undefined>;
      readonly transitionExtras?: { readonly clearedEntryId?: string | null; readonly bounceReason?: string | null };
    },
  ): Promise<Cheque> {
    await ctx.assertPeriodOpenShared(input.competencia, entryPeriodClosedError);

    const reserved = await ctx.cheques.transition({
      tenantId: actor.tenantId,
      chequeId: cheque.id,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      ...(input.transitionExtras ?? {}),
      updatedBy: actor.userId,
    });
    if (!reserved) throw transitionConflictError();

    const entry = await ctx.entries.create({
      tenantId: actor.tenantId,
      accountId: reserved.accountId,
      titleId: input.toStatus === "cleared" ? reserved.titleId : undefined,
      direction: input.direction,
      amount: reserved.amount,
      currency: reserved.currency,
      paymentMethod: "check",
      category: input.category,
      occurredAt: input.occurredAt,
      competencia: input.competencia,
      description: input.description,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    if (reserved.titleId !== undefined) {
      if (input.toStatus === "cleared") {
        await this.applyTitlePaymentInUnit(ctx, actor, reserved.titleId, reserved.amount);
      } else if (input.toStatus === "bounced") {
        const restored = await ctx.titles.restorePaymentGuarded({
          tenantId: actor.tenantId,
          financialTitleId: reserved.titleId,
          amount: reserved.amount,
          updatedBy: actor.userId,
        });
        if (!restored) throw titleRestoreConflictError();
      }
    }

    const linked = await input.attach(entry.id);
    // Inalcançável dentro da mesma tx (a linha acabou de ser flipada por nós e está travada); se
    // acontecer, fail-closed: aborta a unidade inteira em vez de commitar cheque sem vínculo.
    if (!linked) throw transitionConflictError();
    return linked;
  }

  // Pré-validação FAIL-FAST do post de caixa (mesmos erros de antes, que vinham do serviço de
  // lançamentos — agora SEM tocar o cheque): conta existente (400) e ativa (422), moeda do cheque ==
  // moeda da conta (422). A FK composta (tenant_id, account_id) segue como rede final dentro da tx.
  private async assertPostableAccount(tenantId: string, cheque: Cheque): Promise<void> {
    const account = await this.resolveActiveAccount(tenantId, cheque.accountId);
    if (account.currency !== cheque.currency) {
      throw currencyMismatchError();
    }
  }

  // Transição SEM dinheiro (deposit/cancel): valida a legalidade e flipa atômico (mutex). from = status atual.
  private async flipOnly(
    actor: ChequeActorContext,
    chequeId: string,
    toStatus: ChequeStatus,
    guard?: (current: Cheque) => void,
    // A27 — a guarda decidiu pelo título lido: a transição carrega o CAS desse título (0 linhas → 409 transition_conflict).
    casOnTitle = false,
  ): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    this.assertTransition(current.status, toStatus);
    guard?.(current);
    const flipped = await this.repository.transition({
      tenantId: actor.tenantId,
      chequeId: current.id,
      fromStatus: current.status as ChequeStatus,
      toStatus,
      updatedBy: actor.userId,
      ...(casOnTitle ? { expectedTitleId: current.titleId ?? null } : {}),
    });
    if (!flipped) throw transitionConflictError();
    return flipped;
  }

  private assertTransition(from: string, to: ChequeStatus): void {
    const allowed = LEGAL_TRANSITIONS[from as ChequeStatus];
    if (!allowed || !allowed.includes(to)) {
      throw invalidTransitionError(from, to);
    }
  }

  private assertEditable(cheque: Cheque): void {
    if (cheque.status !== "registered") throw chequeNotEditableError();
  }

  private assertCanMoveMoney(actor: ChequeActorContext): void {
    if (!actor.permissions.includes(FINANCIAL_WRITE_PERMISSION)) {
      throw new ChequeError(403, "CHEQUE_FORBIDDEN", "financial_write_forbidden", "Moving cheque money requires the financial entry create permission.");
    }
  }

  private async resolveActiveAccount(tenantId: string, accountId: string): Promise<FinancialAccountRef> {
    const account = await this.accountReader.findAccount(tenantId, accountId);
    if (!account) throw invalidAccountReferenceError();
    if (!account.isActive) throw accountInactiveError();
    return account;
  }

  private async validateTitleLink(
    actor: ChequeActorContext,
    titleId: string,
    chequeDirection: string,
    amount: number,
    currency: string,
  ): Promise<FinancialTitle> {
    let title: FinancialTitle;
    try {
      title = await (await this.resolveTitleService()).assertPayable(actor, titleId, amount);
    } catch (error) {
      if (error instanceof FinancialTitleError && error.reason === "title_not_found") throw invalidTitleReferenceError();
      throw error;
    }
    const expectedDirection = chequeDirection === "received" ? "receivable" : "payable";
    if (title.direction !== expectedDirection) throw titleDirectionMismatchError();
    if (title.currency !== currency) throw currencyMismatchError();
    assertExactOpenBalance(title, amount);
    return title;
  }

  // B-SAN3-12a (§4.2, R2-02) — a MESMA validação do vínculo, agora SOB o lock da linha do título (FOR UPDATE no
  // Postgres; mutex do tenant na memória). Quem perdeu para uma baixa relê o título pago → 422 title_already_paid.
  private async revalidateTitleLinkUnderLock(
    ctx: FinancialUowContext,
    actor: ChequeActorContext,
    titleId: string,
    chequeDirection: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, titleId);
    if (!locked || locked.deletedAt != null) throw invalidTitleReferenceError();
    if (locked.status === "cancelled") throw titleCancelledError();
    if (locked.status === "paid") throw titleAlreadyPaidError();
    if (roundMoney(locked.paidAmount + amount) > locked.amount) throw overpaymentError();
    const expectedDirection = chequeDirection === "received" ? "receivable" : "payable";
    if (locked.direction !== expectedDirection) throw titleDirectionMismatchError();
    if (locked.currency !== currency) throw currencyMismatchError();
    assertExactOpenBalance(locked, amount);
  }

  // 0 linhas na escrita → relê para dizer o porquê: sumiu → 404; saiu de 'registered' → 422 cheque_not_editable (o caso
  // sequencial do #456); B-SAN3-12a (A27) — continua 'registered' mas o vínculo não é o LIDO → 409 cheque_write_conflict.
  private async throwChequeWriteConflict(actor: ChequeActorContext, chequeId: string, readTitleId?: string): Promise<never> {
    const fresh = await this.repository.findById(actor.tenantId, chequeId);
    if (!fresh || fresh.deletedAt != null) throw chequeNotFoundError();
    if (fresh.status === "registered" && fresh.titleId !== readTitleId) throw chequeWriteConflictError();
    throw chequeNotEditableError();
  }

  private async applyTitlePaymentInUnit(
    ctx: FinancialUowContext,
    actor: ChequeActorContext,
    financialTitleId: string,
    amount: number,
  ): Promise<void> {
    const applied = await ctx.titles.applyPaymentGuarded({
      tenantId: actor.tenantId,
      financialTitleId,
      amount,
      updatedBy: actor.userId,
    });
    if (applied) return;

    const locked = await ctx.titles.findByIdForUpdate(actor.tenantId, financialTitleId);
    if (!locked || locked.deletedAt != null) throw titleNotFoundError();
    if (locked.status === "cancelled") throw titleCancelledError();
    if (locked.status === "paid") throw titleAlreadyPaidError();
    if (roundMoney(locked.paidAmount + amount) > locked.amount) throw overpaymentError();

    const retried = await ctx.titles.applyPaymentGuarded({
      tenantId: actor.tenantId,
      financialTitleId,
      amount,
      updatedBy: actor.userId,
    });
    if (!retried) throw overpaymentError();
  }

  // Cheque ESCREVÍVEL (existe, do tenant, não deletado) — fonte do 404 das mutações/get.
  private async getWritable(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    const current = await this.repository.findById(actor.tenantId, parseRequiredUuid(chequeId, "chequeId"));
    if (!current || current.deletedAt != null) throw chequeNotFoundError();
    return current;
  }
}

// B-SAN3-12a (§4.2, decisão do dono 25/10 "Só cheque do valor exato") — o cheque só se vincula se o valor for IGUAL ao
// saldo aberto do título (amount − paidAmount, roundMoney): qualquer baixa manual sobre título com cheque pendente é,
// por construção, TROCA de instrumento, nunca complemento.
function assertExactOpenBalance(title: FinancialTitle, chequeAmount: number): void {
  const openBalance = roundMoney(title.amount - title.paidAmount);
  if (roundMoney(chequeAmount) !== openBalance) throw chequeAmountMismatchError(roundMoney(chequeAmount), openBalance);
}

const memoryChequeRepository = new InMemoryChequeRepository();
let defaultServicePromise: Promise<ChequeService> | undefined;

// AccountReader InMemory: lê o repositório InMemory de Contas (mesmo singleton do Ω4-1) — moeda/atividade.
const memoryAccountReader: AccountReader = {
  async findAccount(tenantId, accountId): Promise<FinancialAccountRef | undefined> {
    const account = await getMemoryFinancialAccountRepositoryForTests().findById(tenantId, accountId);
    if (!account) return undefined;
    return { id: account.id, currency: account.currency, isActive: account.isActive, openingBalance: account.openingBalance };
  },
};

export function createMemoryChequeService(): ChequeService {
  // A porta UoW default resolve para o runner de MEMÓRIA, que compõe os MESMOS singletons InMemory
  // (lançamentos/títulos/cheques/fechamento) → a compensação do cheque aparece no saldo/extrato e
  // atravessa o MESMO chokepoint de período.
  return new ChequeService(memoryChequeRepository, memoryAccountReader);
}

export function getMemoryChequeRepositoryForTests(): InMemoryChequeRepository {
  return memoryChequeRepository;
}

export async function createDefaultChequeService(): Promise<ChequeService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryChequeService();
  }
  defaultServicePromise ??= createPrismaChequeService();
  return defaultServicePromise;
}

export function resetChequeRuntimeForTests(): void {
  memoryChequeRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaChequeService(): Promise<ChequeService> {
  const [{ createPrismaChequeRepository }, { createPrismaAccountReader }] = await Promise.all([
    import("./cheque-prisma.repository.js"),
    import("../financial-entries/financial-entry-prisma.repository.js"),
  ]);
  return new ChequeService(await createPrismaChequeRepository(), await createPrismaAccountReader());
}
