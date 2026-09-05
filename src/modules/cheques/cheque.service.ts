import { env } from "../../config/env.js";
import { getMemoryFinancialAccountRepositoryForTests } from "../financial-accounts/financial-account.service.js";
import {
  currencyMismatchError,
  periodClosedError as entryPeriodClosedError,
} from "../financial-entries/financial-entry.repository.js";
import { deriveCompetencia } from "../financial-titles/index.js";
import {
  createDefaultFinancialUnitOfWork,
  type FinancialUowContext,
  type FinancialUowResolver,
} from "../financial-uow/index.js";
import {
  InMemoryChequeRepository,
  accountInactiveError,
  chequeNotEditableError,
  chequeNotFoundError,
  invalidAccountReferenceError,
  invalidTransitionError,
  transitionConflictError,
  type AccountReader,
  type ChequeRepository,
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

// Permissão FINANCEIRA forte exigida pelas transições que MOVEM dinheiro (compensar/devolver-após-compensar):
// a escrita do lançamento pela unidade (UoW) NÃO reatravessa a rota /financial-entries, então o gate de
// dinheiro é reafirmado aqui (defesa em profundidade). Sem ela, um ator com só cheques:update movimentaria caixa
// pela porta dos fundos do cheque (achado ALTA do ataque). Fonte ÚNICA da constante — a rota importa daqui
// (evita divergência rota↔serviço; condição BAIXA da junta).
export const FINANCIAL_WRITE_PERMISSION = "financial_entries:create" as const;

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
    private readonly repository: ChequeRepository,
    private readonly accountReader: AccountReader,
    // B-O6R-02 F5 — porta de Unit of Work: clear/bounce-após-clear rodam transição + lançamento +
    // vínculo como UMA unidade (falha → o cheque volta ao estado anterior PELO BANCO).
    private readonly resolveUow: FinancialUowResolver = createDefaultFinancialUnitOfWork,
  ) {}

  async list(actor: ChequeActorContext, query: RawRecord): Promise<ListChequeResult> {
    const input: ListChequeInput = {
      tenantId: actor.tenantId,
      includeDeleted: readOptionalBoolean(query.include_deleted ?? query.includeDeleted, "includeDeleted") ?? false,
      accountId: parseOptionalFilterUuid(query.account_id ?? query.accountId),
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

    return this.repository.create({
      tenantId: actor.tenantId,
      accountId: account.id,
      direction: parseDirection(body.direction),
      chequeNumber: parseChequeNumber(body.cheque_number ?? body.chequeNumber),
      bank: parseBank(body.bank),
      amount: parseAmount(body.amount),
      currency,
      dueDate: parseOptionalDueDate(body.due_date ?? body.dueDate),
      notes: parseOptionalNotes(body.notes),
      createdBy: actor.userId,
      updatedBy: actor.userId,
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
    const updated = await this.repository.update({
      tenantId: actor.tenantId,
      chequeId: current.id,
      chequeNumber: body.cheque_number !== undefined || body.chequeNumber !== undefined ? parseChequeNumber(body.cheque_number ?? body.chequeNumber) : undefined,
      bank: body.bank !== undefined ? parseBank(body.bank) : undefined,
      dueDate: parseNullableDueDate(dueDateRaw),
      notes: parseNullableNotes(body.notes),
      updatedBy: actor.userId,
    });
    if (!updated) throw chequeNotFoundError();
    return updated;
  }

  async delete(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    this.assertEditable(current);
    const removed = await this.repository.softDelete(actor.tenantId, current.id, actor.userId);
    if (!removed) throw chequeNotFoundError();
    return removed;
  }

  // DEPOSITAR (registered→deposited) — não posta caixa (o cheque foi apresentado ao banco, ainda sem compensar).
  async deposit(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    return this.flipOnly(actor, chequeId, "deposited");
  }

  // CANCELAR (registered→cancelled) — não posta caixa (nunca houve movimento).
  async cancel(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    return this.flipOnly(actor, chequeId, "cancelled");
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
  private async flipOnly(actor: ChequeActorContext, chequeId: string, toStatus: ChequeStatus): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    this.assertTransition(current.status, toStatus);
    const flipped = await this.repository.transition({
      tenantId: actor.tenantId,
      chequeId: current.id,
      fromStatus: current.status as ChequeStatus,
      toStatus,
      updatedBy: actor.userId,
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

  // Cheque ESCREVÍVEL (existe, do tenant, não deletado) — fonte do 404 das mutações/get.
  private async getWritable(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    const current = await this.repository.findById(actor.tenantId, parseRequiredUuid(chequeId, "chequeId"));
    if (!current || current.deletedAt != null) throw chequeNotFoundError();
    return current;
  }
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
