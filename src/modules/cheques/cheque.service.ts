import { env } from "../../config/env.js";
import { getMemoryFinancialAccountRepositoryForTests } from "../financial-accounts/financial-account.service.js";
import {
  createMemoryFinancialEntryService,
  type FinancialEntryService,
} from "../financial-entries/financial-entry.service.js";
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

export type FinancialEntryServiceResolver = () => Promise<FinancialEntryService>;

// Permissão FINANCEIRA forte exigida pelas transições que MOVEM dinheiro (compensar/devolver-após-compensar):
// a chamada service→service a entryService.create NÃO reatravessa a rota /financial-entries, então o gate de
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
    private readonly resolveEntryService: FinancialEntryServiceResolver,
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

  // COMPENSAR (deposited→cleared) — MOVE DINHEIRO. A transição é o MUTEX: reserva atômica deposited→cleared
  // (só o vencedor da corrida segue; perdedor → 409), posta 1 lançamento via entryService.create (server-now →
  // competência CORRENTE, chokepoint), vincula cleared_entry_id. Falha do post (period_closed/account_inactive/
  // currency_mismatch/amount_overflow) → ROLLBACK cleared→deposited e propaga o erro (cheque volta a 'deposited').
  async clear(actor: ChequeActorContext, chequeId: string): Promise<Cheque> {
    const current = await this.getWritable(actor, chequeId);
    this.assertTransition(current.status, "cleared");
    this.assertCanMoveMoney(actor);

    const reserved = await this.repository.transition({
      tenantId: actor.tenantId,
      chequeId: current.id,
      fromStatus: "deposited",
      toStatus: "cleared",
      clearedEntryId: null,
      updatedBy: actor.userId,
    });
    if (!reserved) throw transitionConflictError();

    let entry: { readonly id: string };
    try {
      const direction = reserved.direction === "received" ? "in" : "out";
      entry = await this.postEntry(actor, reserved, direction, "cheque_clearing", `Compensação de cheque ${reserved.chequeNumber}`);
    } catch (error) {
      // Compensação NÃO postou → devolve o cheque a 'deposited' (nada meio-postado). Recuperável e auditável.
      // Rollback BEST-EFFORT: uma falha ao reverter o estado NÃO pode mascarar o erro de negócio original
      // (period_closed/account_inactive/...) — sempre relança o erro que causou o rollback.
      await this.repository.transition({ tenantId: actor.tenantId, chequeId: current.id, fromStatus: "cleared", toStatus: "deposited", updatedBy: actor.userId }).catch(() => {});
      throw error;
    }

    const linked = await this.repository.attachClearingEntry(actor.tenantId, current.id, entry.id, actor.userId);
    return linked ?? reserved;
  }

  // DEVOLVER (bounce). deposited→bounced: sem caixa (nunca compensou). cleared→bounced: MOVE DINHEIRO — posta um
  // CONTRA-lançamento NOVO (direção invertida, category='cheque_bounce', server-now) em vez de reverse() do
  // original — assim NÃO é travado por conciliação do lançamento compensado (Ω4-5) e preserva a conciliação
  // dele. Mutex + rollback iguais ao clear. bounce_reason opcional (motivo da devolução — auditoria).
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
      const reserved = await this.repository.transition({
        tenantId: actor.tenantId,
        chequeId: current.id,
        fromStatus: "cleared",
        toStatus: "bounced",
        bounceReason: reason,
        updatedBy: actor.userId,
      });
      if (!reserved) throw transitionConflictError();

      let counter: { readonly id: string };
      try {
        const direction = reserved.direction === "received" ? "out" : "in";
        counter = await this.postEntry(actor, reserved, direction, "cheque_bounce", `Devolução de cheque ${reserved.chequeNumber}`);
      } catch (error) {
        // Rollback BEST-EFFORT (idem ao clear): não mascara o erro de negócio original.
        await this.repository.transition({ tenantId: actor.tenantId, chequeId: current.id, fromStatus: "bounced", toStatus: "cleared", updatedBy: actor.userId }).catch(() => {});
        throw error;
      }

      const linked = await this.repository.attachBounceEntry(actor.tenantId, current.id, counter.id, actor.userId);
      return linked ?? reserved;
    }

    // registered/bounced/cancelled → devolver é ilegal.
    throw invalidTransitionError(current.status, "bounced");
  }

  // Posta um lançamento de caixa via o SERVIÇO de lançamentos (reusa conta-ativa + moeda + chokepoint de
  // competência). SEM occurred_at → server-now → competência CORRENTE (a compensação/devolução é HOJE; a
  // due_date "bom para" é memo e nunca entra na competência). payment_method='check'.
  private async postEntry(actor: ChequeActorContext, cheque: Cheque, direction: "in" | "out", category: string, description: string) {
    const entryService = await this.resolveEntryService();
    return entryService.create(this.toEntryActor(actor), {
      account_id: cheque.accountId,
      direction,
      amount: cheque.amount,
      currency: cheque.currency,
      payment_method: "check",
      category,
      description,
    });
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

  private toEntryActor(actor: ChequeActorContext) {
    return { tenantId: actor.tenantId, userId: actor.userId, roles: actor.roles, permissions: actor.permissions };
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
  // Compõe com o MESMO singleton InMemory de lançamentos (createMemoryFinancialEntryService compartilha
  // memoryEntryRepository) → a compensação do cheque aparece no saldo/extrato e atravessa o MESMO chokepoint.
  return new ChequeService(memoryChequeRepository, memoryAccountReader, () => Promise.resolve(createMemoryFinancialEntryService()));
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
  const [{ createPrismaChequeRepository }, { createPrismaAccountReader }, { createDefaultFinancialEntryService }] = await Promise.all([
    import("./cheque-prisma.repository.js"),
    import("../financial-entries/financial-entry-prisma.repository.js"),
    import("../financial-entries/financial-entry.service.js"),
  ]);
  return new ChequeService(await createPrismaChequeRepository(), await createPrismaAccountReader(), createDefaultFinancialEntryService);
}
