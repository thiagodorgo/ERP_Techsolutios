import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import { computeFinancialSummary, type AccountBalanceRow, type TitleRow } from "./financial-summary.compute.js";
import type { FinancialSummary, FinancialSummaryInput } from "./financial-summary.types.js";
import type { FinancialSummaryRepository } from "./financial-summary.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

// Carrega as projeções (título/lançamento/cheque/conta+saldo) do tenant dentro da RLS e delega ao MESMO compute
// PURO do InMemory → paridade garantida. Varredura completa (data set de dashboard); otimização por agregados
// SQL fica como P-Ω4-8-SUMMARY-SCALE. NB: as somas de dinheiro são feitas no compute (JS) sobre Decimal→Number,
// coerente com todos os módulos financeiros (roundMoney a 2 casas).
export class PrismaFinancialSummaryRepository implements FinancialSummaryRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async getSummary(input: FinancialSummaryInput): Promise<FinancialSummary> {
    const { tenantId, now } = input;

    const [titles, entries, cheques, accounts, entryBalances] = await Promise.all([
      this.client.financialTitle.findMany({ where: { tenant_id: tenantId, deleted_at: null } }),
      this.client.financialEntry.findMany({
        where: { tenant_id: tenantId, deleted_at: null },
        select: { direction: true, amount: true, competencia: true },
      }),
      this.client.cheque.findMany({ where: { tenant_id: tenantId, deleted_at: null }, select: { direction: true, status: true, amount: true } }),
      this.client.financialAccount.findMany({
        where: { tenant_id: tenantId, is_active: true },
        select: { id: true, currency: true, opening_balance: true },
        orderBy: { created_at: "asc" }, // ordem estável → currency = a da 1ª conta é determinística
      }),
      this.client.financialEntry.groupBy({
        by: ["account_id", "direction"],
        where: { tenant_id: tenantId, deleted_at: null },
        _sum: { amount: true },
      }),
    ]);

    // Mapa account_id → {inflow, outflow} das somas agrupadas de lançamento.
    const flowByAccount = new Map<string, { inflow: number; outflow: number }>();
    for (const row of entryBalances) {
      const bucket = flowByAccount.get(row.account_id) ?? { inflow: 0, outflow: 0 };
      const amount = row._sum.amount ? Number(row._sum.amount) : 0;
      if (row.direction === "in") bucket.inflow += amount;
      else if (row.direction === "out") bucket.outflow += amount;
      flowByAccount.set(row.account_id, bucket);
    }

    const accountRows: AccountBalanceRow[] = accounts.map((account) => {
      const flow = flowByAccount.get(account.id) ?? { inflow: 0, outflow: 0 };
      return { openingBalance: Number(account.opening_balance), inflow: flow.inflow, outflow: flow.outflow };
    });
    const currency = accounts[0]?.currency ?? "BRL";

    const titleRows: TitleRow[] = titles.map((title) => ({
      id: title.id,
      direction: title.direction,
      status: title.status,
      amount: Number(title.amount),
      paidAmount: Number(title.paid_amount),
      dueDate: title.due_date,
      partyName: title.party_name,
      createdAt: title.created_at,
    }));

    return computeFinancialSummary({
      titles: titleRows,
      entries: entries.map((entry) => ({ direction: entry.direction, amount: Number(entry.amount), competencia: entry.competencia })),
      cheques: cheques.map((cheque) => ({ direction: cheque.direction, status: cheque.status, amount: Number(cheque.amount) })),
      accounts: accountRows,
      currency,
      now,
    });
  }
}

export class RlsPrismaFinancialSummaryRepository implements FinancialSummaryRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  getSummary(input: FinancialSummaryInput): Promise<FinancialSummary> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaFinancialSummaryRepository(tx).getSummary(input));
  }
}

export async function createPrismaFinancialSummaryRepository(): Promise<RlsPrismaFinancialSummaryRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new RlsPrismaFinancialSummaryRepository(prisma);
}
