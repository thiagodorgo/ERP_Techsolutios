// B-ASS-04 · F9 — o que a ORGANIZAÇÃO vê da própria assinatura (P12, G11, R-ST-8/15): o plano, o uso contra a
// franquia, se está em dia e como pagar. NENHUM valor em dinheiro: as chaves são uma allowlist fechada e os testes
// varrem a resposta inteira. O uso é a MESMA conta do fechamento (`buildStatementInputs`/`monthMeasurements`), para o
// cliente nunca ver um número que o demonstrativo depois desminta.

import { todayBusinessDate } from "../plans/plan-versioning.js";
import { daysInPeriod } from "./statement.engine.js";
import type { StatementRuntime } from "./statement.factory.js";
import { monthMeasurements } from "./statement.inputs.js";
import { upToDateStatus } from "./statement.service.js";

function milliToGb(milli: number): number {
  return Number((milli / 1000).toFixed(3));
}

function shiftPeriod(period: string, deltaMonths: number): string {
  const [year, month] = period.split("-").map(Number) as [number, number];
  const index = year * 12 + (month - 1) + deltaMonths;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
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
    // Os meios de pagamento (link, Pix, boleto, nota) chegam com o canal do provedor (B-ASS-08); até lá, nulos.
    ...(oldest
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

export type UsageHistoryRow = {
  readonly period: string;
  readonly usersPeak: number;
  readonly storagePeakGb: number;
  readonly trackedVehicles: number;
};

/** Os `months` meses até o corrente (inclusive), do mais antigo ao mais novo — só quantidades. */
export async function buildUsageHistory(
  runtime: StatementRuntime,
  tenantId: string,
  months: number,
  now: Date,
): Promise<UsageHistoryRow[]> {
  const today = todayBusinessDate(now);
  const current = today.slice(0, 7);
  const first = shiftPeriod(current, -(months - 1));
  const [usage, bindings] = await Promise.all([
    runtime.usage.listUsageDays(tenantId, `${first}-01`, today),
    runtime.bindings.listVehicleBindings(tenantId, `${first}-01`, `${current}-${String(daysInPeriod(current)).padStart(2, "0")}`),
  ]);
  const rows: UsageHistoryRow[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const period = shiftPeriod(current, -offset);
    const measured = monthMeasurements(period, usage, bindings);
    rows.push({
      period,
      usersPeak: measured.usersPeak,
      storagePeakGb: milliToGb(measured.storagePeakMilliGb),
      trackedVehicles: measured.trackedVehicles,
    });
  }
  return rows;
}
