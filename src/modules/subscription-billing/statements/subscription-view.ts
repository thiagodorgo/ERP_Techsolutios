// B-ASS-04 · F9 — o que a ORGANIZAÇÃO vê da própria assinatura (P12, G11, R-ST-8/15): o plano, o uso contra a
// franquia, se está em dia e como pagar. NENHUM valor em dinheiro: as chaves são uma allowlist fechada e os testes
// varrem a resposta inteira. O uso é a MESMA conta do fechamento (`buildStatementInputs`/`monthMeasurements`), para o
// cliente nunca ver um número que o demonstrativo depois desminta.

import { toClientPaymentView } from "../charges/charge-view.js";
import { todayBusinessDate } from "../plans/plan-versioning.js";
import type { StatementRuntime } from "./statement.factory.js";
import { upToDateStatus } from "./statement.service.js";

function milliToGb(milli: number): number {
  return Number((milli / 1000).toFixed(3));
}

export type TenantSubscriptionView = {
  readonly period: string;
  readonly plan: { readonly code: string; readonly name: string };
  readonly usage: {
    readonly users: { readonly used: number; readonly included: number; readonly overLimit: boolean };
    readonly storageGb: {
      readonly used: number;
      readonly included: number;
      readonly overLimit: boolean;
      readonly measuredAt: string | null;
      readonly estimate: true;
    };
  };
  readonly status: { readonly inGoodStanding: boolean; readonly overdueSince: string | null; readonly nextDueDate: string | null };
  readonly payment?: {
    readonly statementId: string;
    readonly dueDate: string | null;
    readonly payUrl: string | null;
    readonly pixCopyPaste: string | null;
    readonly boletoLine: string | null;
    readonly boletoUrl: string | null;
    readonly invoicePdfAvailable: boolean;
    /** B-ASS-08c1c (Q4 (a), Emenda 1 §7 c): a cobrança vigente é do valor CHEIO e a conta já tem pagamento parcial. Um código,
     * sem valor nem texto de tela. */
    readonly notice?: "full_amount_charge_open";
  };
};

/** `null` quando a organização não tem assinatura vigente no mês corrente. */
export async function buildTenantSubscriptionView(
  runtime: StatementRuntime,
  tenantId: string,
  now: Date,
): Promise<TenantSubscriptionView | null> {
  const today = todayBusinessDate(now);
  const period = today.slice(0, 7);
  const inputs = await runtime.inputs.resolve(tenantId, period, { pin: null });
  if (inputs.kind !== "ready") return null;

  const version = await runtime.plans.getVersionById(inputs.planVersionId);
  const plan = version ? await runtime.plans.getPlanById(version.planId) : null;
  const { terms, measurements } = inputs.computation;

  const usage = await runtime.usage.listUsageDays(tenantId, `${period}-01`, today);
  let measuredAt: string | null = null;
  for (const row of usage) {
    if ((row.dbBytesEstimated !== null || row.filesBytes !== null) && (measuredAt === null || row.date > measuredAt)) measuredAt = row.date;
  }

  const statements = await runtime.repository.listStatements(tenantId);
  const standing = upToDateStatus(statements, now);
  const unpaid = statements
    .filter((statement) => statement.status === "closed" && statement.totalCents > statement.paidCents)
    .sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""));
  const oldest = unpaid[0];
  // B-ASS-08c1c (P11b): o link, o Pix e o boleto vêm da cobrança `pending` do fechamento VIGENTE, sem cancelamento vivo.
  const live = oldest ? toClientPaymentView(oldest, await runtime.repository.findPayableCharge(tenantId, oldest.id)) : null;

  return {
    period,
    plan: { code: plan?.code ?? "", name: plan?.name ?? "" },
    usage: {
      users: {
        used: measurements.usersPeak,
        included: terms.includedUsers,
        overLimit: measurements.usersPeak > terms.includedUsers,
      },
      storageGb: {
        used: milliToGb(measurements.storagePeakMilliGb),
        included: milliToGb(terms.includedStorageMilliGb),
        overLimit: measurements.storagePeakMilliGb > terms.includedStorageMilliGb,
        measuredAt,
        estimate: true,
      },
    },
    status: { inGoodStanding: standing.upToDate, overdueSince: standing.overdueSince, nextDueDate: oldest?.dueDate ?? null },
    // Os meios de pagamento (link, Pix, boleto, nota) vêm da cobrança vigente (B-ASS-08c1c); sem ela, nulos.
    ...(oldest && live
      ? {
          payment: ((statement) => ({
            statementId: live.statementId,
            dueDate: live.dueDate,
            payUrl: live.payUrl ?? null,
            pixCopyPaste: live.pixCopyPaste ?? null,
            boletoLine: live.boletoLine ?? null,
            boletoUrl: live.boletoUrl ?? null,
            invoicePdfAvailable: live.invoicePdfAvailable,
            ...(statement.paidCents > 0 ? { notice: "full_amount_charge_open" as const } : {}), // [CLIENT-NOTICE]
          }))(oldest),
        }
      : oldest
      ? {
          payment: {
            statementId: oldest.id,
            dueDate: oldest.dueDate,
            payUrl: null,
            pixCopyPaste: null,
            boletoLine: null,
            boletoUrl: null,
            invoicePdfAvailable: false,
          },
        }
      : {}),
  };
}
