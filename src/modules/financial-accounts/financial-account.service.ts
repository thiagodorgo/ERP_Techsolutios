import { env } from "../../config/env.js";
import {
  InMemoryFinancialAccountRepository,
  accountNotFoundError,
  type FinancialAccountRepository,
} from "./financial-account.repository.js";
import type {
  FinancialAccount,
  FinancialAccountActorContext,
  ListFinancialAccountInput,
  ListFinancialAccountResult,
  UpdateFinancialAccountInput,
} from "./financial-account.types.js";
import {
  parseCurrency,
  parseKind,
  parseKindFilter,
  parseLimit,
  parseName,
  parseOffset,
  parseOpeningBalance,
  parseOptionalAccountNumber,
  parseOptionalAgency,
  parseOptionalBankName,
  parseOptionalDocument,
  parseOptionalNotes,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./financial-account.validators.js";

type RawRecord = Record<string, unknown>;

export class FinancialAccountService {
  constructor(private readonly repository: FinancialAccountRepository) {}

  async list(actor: FinancialAccountActorContext, query: RawRecord): Promise<ListFinancialAccountResult> {
    const input: ListFinancialAccountInput = {
      tenantId: actor.tenantId,
      includeInactive: readOptionalBoolean(query.include_inactive ?? query.includeInactive) ?? false,
      kind: parseKindFilter(query.kind),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };
    return this.repository.list(input);
  }

  async create(actor: FinancialAccountActorContext, body: RawRecord): Promise<FinancialAccount> {
    // Tenant vem SEMPRE do ator autenticado; tenant_id no body é ignorado.
    return this.repository.create({
      tenantId: actor.tenantId,
      name: parseName(body.name),
      kind: parseKind(body.kind),
      currency: parseCurrency(body.currency),
      openingBalance: parseOpeningBalance(body.opening_balance ?? body.openingBalance),
      bankName: parseOptionalBankName(body.bank_name ?? body.bankName),
      agency: parseOptionalAgency(body.agency),
      accountNumber: parseOptionalAccountNumber(body.account_number ?? body.accountNumber),
      document: parseOptionalDocument(body.document),
      notes: parseOptionalNotes(body.notes),
      status: "active",
      isActive: true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
  }

  async get(actor: FinancialAccountActorContext, financialAccountId: string): Promise<FinancialAccount> {
    const account = await this.repository.findById(actor.tenantId, parseRequiredUuid(financialAccountId, "financialAccountId"));
    if (!account) {
      throw accountNotFoundError();
    }
    return account;
  }

  async update(actor: FinancialAccountActorContext, financialAccountId: string, body: RawRecord): Promise<FinancialAccount> {
    const rawOpeningBalance = body.opening_balance ?? body.openingBalance;
    const input: UpdateFinancialAccountInput = {
      tenantId: actor.tenantId,
      financialAccountId: parseRequiredUuid(financialAccountId, "financialAccountId"),
      name: body.name === undefined ? undefined : parseName(body.name),
      kind: body.kind === undefined ? undefined : parseKind(body.kind),
      currency: body.currency === undefined ? undefined : parseCurrency(body.currency),
      openingBalance: rawOpeningBalance === undefined ? undefined : parseOpeningBalance(rawOpeningBalance),
      bankName: parseOptionalBankName(body.bank_name ?? body.bankName),
      agency: parseOptionalAgency(body.agency),
      accountNumber: parseOptionalAccountNumber(body.account_number ?? body.accountNumber),
      document: parseOptionalDocument(body.document),
      notes: parseOptionalNotes(body.notes),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);
    if (!updated) {
      throw accountNotFoundError();
    }
    return updated;
  }

  async delete(actor: FinancialAccountActorContext, financialAccountId: string): Promise<FinancialAccount> {
    // Delete LÓGICO: is_active=false + status='inactive'. Inexistente/já inativa/cross-tenant → 404.
    const removed = await this.repository.softDelete(
      actor.tenantId,
      parseRequiredUuid(financialAccountId, "financialAccountId"),
      actor.userId,
    );
    if (!removed) {
      throw accountNotFoundError();
    }
    return removed;
  }
}

const memoryRepository = new InMemoryFinancialAccountRepository();
let defaultServicePromise: Promise<FinancialAccountService> | undefined;

export function createMemoryFinancialAccountService(): FinancialAccountService {
  return new FinancialAccountService(memoryRepository);
}

export function getMemoryFinancialAccountRepositoryForTests(): InMemoryFinancialAccountRepository {
  return memoryRepository;
}

export async function createDefaultFinancialAccountService(): Promise<FinancialAccountService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryFinancialAccountService();
  }
  defaultServicePromise ??= createPrismaFinancialAccountService();
  return defaultServicePromise;
}

export function resetFinancialAccountRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaFinancialAccountService(): Promise<FinancialAccountService> {
  const { createPrismaFinancialAccountRepository } = await import("./financial-account-prisma.repository.js");
  const repository = await createPrismaFinancialAccountRepository();
  return new FinancialAccountService(repository);
}
