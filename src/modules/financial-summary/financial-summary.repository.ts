import { getMemoryFinancialAccountRepositoryForTests } from "../financial-accounts/financial-account.service.js";
import { getMemoryFinancialEntryRepositoryForTests } from "../financial-entries/financial-entry.service.js";
import { getMemoryFinancialTitleRepositoryForTests } from "../financial-titles/financial-title.service.js";
import { getMemoryChequeRepositoryForTests } from "../cheques/cheque.service.js";
import { computeFinancialSummary, type AccountBalanceRow } from "./financial-summary.compute.js";
import type { FinancialSummary, FinancialSummaryInput } from "./financial-summary.types.js";

// Varredura completa por tenant (data set pequeno; espelha o InMemory do dashboard operacional).
const FULL_SCAN_LIMIT = Number.MAX_SAFE_INTEGER;

export interface FinancialSummaryRepository {
  getSummary(input: FinancialSummaryInput): Promise<FinancialSummary>;
}

// Read-only: lê os singletons InMemory que os serviços de memória escrevem (título/lançamento/conta/cheque),
// então tudo criado via API aparece aqui. Soma NO BACKEND (P-Ω4-2B-KPI-AGREGADO) — varre TODAS as linhas do
// tenant, não uma página.
export class InMemoryFinancialSummaryRepository implements FinancialSummaryRepository {
  async getSummary(input: FinancialSummaryInput): Promise<FinancialSummary> {
    const { tenantId, now } = input;
    const titleRepository = getMemoryFinancialTitleRepositoryForTests();
    const entryRepository = getMemoryFinancialEntryRepositoryForTests();
    const accountRepository = getMemoryFinancialAccountRepositoryForTests();
    const chequeRepository = getMemoryChequeRepositoryForTests();

    const [titlesResult, entriesResult, accountsResult, chequesResult] = await Promise.all([
      titleRepository.list({ tenantId, includeDeleted: false, limit: FULL_SCAN_LIMIT, offset: 0 }),
      entryRepository.list({ tenantId, includeDeleted: false, limit: FULL_SCAN_LIMIT, offset: 0 }),
      accountRepository.list({ tenantId, includeInactive: false, limit: FULL_SCAN_LIMIT, offset: 0 }),
      chequeRepository.list({ tenantId, includeDeleted: false, limit: FULL_SCAN_LIMIT, offset: 0 }),
    ]);

    // Saldo por conta ATIVA (abertura + Σin − Σout) — reusa sumByAccount do lançamento.
    const accounts: AccountBalanceRow[] = await Promise.all(
      accountsResult.items.map(async (account) => {
        const { inflow, outflow } = await entryRepository.sumByAccount(tenantId, account.id);
        return { openingBalance: account.openingBalance, inflow, outflow };
      }),
    );
    // currency = a da conta ativa MAIS ANTIGA — paridade com o Prisma (orderBy created_at asc). O list InMemory
    // ordena por created_at DESC, então re-seleciono a mais antiga aqui (latente hoje: v1 trava BRL, mas evita
    // divergência InMemory↔Prisma se multi-moeda for habilitado).
    const oldestAccount = [...accountsResult.items].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
    const currency = oldestAccount?.currency ?? "BRL";

    return computeFinancialSummary({
      titles: titlesResult.items.map((t) => ({
        id: t.id,
        direction: t.direction,
        status: t.status,
        amount: t.amount,
        paidAmount: t.paidAmount,
        dueDate: t.dueDate,
        partyName: t.partyName,
        createdAt: t.createdAt,
      })),
      entries: entriesResult.items.map((e) => ({ direction: e.direction, amount: e.amount, competencia: e.competencia })),
      cheques: chequesResult.items.map((c) => ({ direction: c.direction, status: c.status, amount: c.amount })),
      accounts,
      currency,
      now,
    });
  }
}
