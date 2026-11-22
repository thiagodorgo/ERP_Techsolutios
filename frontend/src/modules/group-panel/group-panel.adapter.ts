import { adaptFinancialSummaryResponse } from "../finance/dashboard/financial-summary.adapter";
import type { FinancialSummary } from "../finance/dashboard/financial-summary.types";
import type {
  GroupPanelBlockStatus,
  GroupPanelCashFlowPoint,
  GroupPanelConsolidated,
  GroupPanelCoverage,
  GroupPanelCoverageReason,
  GroupPanelOperations,
  GroupPanelOrganization,
  GroupPanelScope,
  GroupPanelScopeOrganization,
  GroupPanelStaff,
  GroupPanelSummary,
} from "./group-panel.types";

// B-GRUPO-GESTOR-1b — leitura FAIL-CLOSED do envelope `{ data }` das duas rotas do Painel (molde de
// `finance/dashboard/financial-summary.adapter.ts`). Campo obrigatório ausente ou fora do tipo → a resposta inteira é
// inválida e a tela mostra ERRO, nunca R$ 0,00 inventado (D-007). Duas regras a mais, do plano:
//  - bloco fora de `ok` sai SEM número, mesmo que o corpo venha preenchido (plano §4.2: "fora de ok, o corpo vem nulo");
//  - `consolidated` nulo continua nulo: a tela nunca recompõe o total a partir dos pátios (plano §3.4).

export class InvalidGroupPanelPayload extends Error {
  constructor(readonly field: string) {
    super(field);
    this.name = "InvalidGroupPanelPayload";
  }
}

const BLOCK_STATUSES: readonly GroupPanelBlockStatus[] = ["ok", "sem_permissao", "modulo_desligado", "erro"];
const COVERAGE_REASONS: readonly GroupPanelCoverageReason[] = ["teto", "erro_de_leitura", "moedas_diferentes"];

export type AdaptResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly field: string };

export function adaptGroupPanelScope(payload: unknown): AdaptResult<GroupPanelScope> {
  return guard(() => {
    const data = envelope(payload);
    return {
      inGroup: requiredBool(data, "inGroup", "scope.inGroup"),
      overLimit: requiredBool(data, "overLimit", "scope.overLimit"),
      omittedCount: requiredNum(data, "omittedCount", "scope.omittedCount"),
      organizations: requiredArray(data, "organizations", "scope.organizations").map((raw, index): GroupPanelScopeOrganization => {
        const record = requiredRecord(raw, `scope.organizations[${index}]`);
        return {
          id: requiredStr(record, "id", `scope.organizations[${index}].id`),
          name: requiredStr(record, "name", `scope.organizations[${index}].name`),
          finance: requiredBool(record, "finance", `scope.organizations[${index}].finance`),
          operations: requiredBool(record, "operations", `scope.organizations[${index}].operations`),
          staff: requiredBool(record, "staff", `scope.organizations[${index}].staff`),
        };
      }),
    };
  });
}

export function adaptGroupPanelSummary(payload: unknown): AdaptResult<GroupPanelSummary> {
  return guard(() => {
    const data = envelope(payload);
    const consolidatedRaw = data.consolidated;
    return {
      generatedAt: requiredStr(data, "generatedAt", "summary.generatedAt"),
      coverage: readCoverage(requiredRecord(data.coverage, "summary.coverage")),
      consolidated: consolidatedRaw === null ? null : readConsolidated(requiredRecord(consolidatedRaw, "summary.consolidated")),
      organizations: requiredArray(data, "organizations", "summary.organizations").map((raw, index) => readOrganization(raw, index)),
    };
  });
}

function readCoverage(record: Record<string, unknown>): GroupPanelCoverage {
  const reason = record.reason;
  if (reason !== null && !COVERAGE_REASONS.includes(reason as GroupPanelCoverageReason)) throw new InvalidGroupPanelPayload("summary.coverage.reason");
  return {
    complete: requiredBool(record, "complete", "summary.coverage.complete"),
    included: requiredNum(record, "included", "summary.coverage.included"),
    failed: requiredArray(record, "failed", "summary.coverage.failed").map((value, index) => {
      if (typeof value !== "string") throw new InvalidGroupPanelPayload(`summary.coverage.failed[${index}]`);
      return value;
    }),
    reason: reason as GroupPanelCoverageReason | null,
    withoutAccess: requiredArray(record, "withoutAccess", "summary.coverage.withoutAccess").map((raw, index) => {
      const item = requiredRecord(raw, `summary.coverage.withoutAccess[${index}]`);
      return { id: requiredStr(item, "id", `summary.coverage.withoutAccess[${index}].id`), name: requiredStr(item, "name", `summary.coverage.withoutAccess[${index}].name`) };
    }),
  };
}

function readConsolidated(record: Record<string, unknown>): GroupPanelConsolidated {
  const finance = requiredRecord(record.finance, "summary.consolidated.finance");
  const operations = requiredRecord(record.operations, "summary.consolidated.operations");
  const path = "summary.consolidated.finance";
  return {
    currency: requiredStr(record, "currency", "summary.consolidated.currency"),
    finance: {
      receivableOpen: requiredNum(finance, "receivableOpen", `${path}.receivableOpen`),
      receivableOpenCount: requiredNum(finance, "receivableOpenCount", `${path}.receivableOpenCount`),
      receivableOverdue: requiredNum(finance, "receivableOverdue", `${path}.receivableOverdue`),
      receivableOverdueCount: requiredNum(finance, "receivableOverdueCount", `${path}.receivableOverdueCount`),
      payableOpen: requiredNum(finance, "payableOpen", `${path}.payableOpen`),
      payableOpenCount: requiredNum(finance, "payableOpenCount", `${path}.payableOpenCount`),
      payableOverdue: requiredNum(finance, "payableOverdue", `${path}.payableOverdue`),
      payableOverdueCount: requiredNum(finance, "payableOverdueCount", `${path}.payableOverdueCount`),
      receivedThisMonth: requiredNum(finance, "receivedThisMonth", `${path}.receivedThisMonth`),
      paidThisMonth: requiredNum(finance, "paidThisMonth", `${path}.paidThisMonth`),
      competencia: requiredStr(finance, "competencia", `${path}.competencia`),
      cashBalance: requiredNum(finance, "cashBalance", `${path}.cashBalance`),
      accountCount: requiredNum(finance, "accountCount", `${path}.accountCount`),
      cashFlow: readCashFlow(finance.cashFlow, `${path}.cashFlow`),
      receivedVariationPct: nullableNum(finance, "receivedVariationPct", `${path}.receivedVariationPct`),
      paidVariationPct: nullableNum(finance, "paidVariationPct", `${path}.paidVariationPct`),
    },
    operations: { ...readOperations(operations, "summary.consolidated.operations"), included: requiredNum(operations, "included", "summary.consolidated.operations.included") },
    staff: readStaff(requiredRecord(record.staff, "summary.consolidated.staff"), "summary.consolidated.staff"),
  };
}

function readOrganization(raw: unknown, index: number): GroupPanelOrganization {
  const path = `summary.organizations[${index}]`;
  const record = requiredRecord(raw, path);
  const finance = requiredRecord(record.finance, `${path}.finance`);
  const operations = requiredRecord(record.operations, `${path}.operations`);
  const staff = requiredRecord(record.staff, `${path}.staff`);

  const financeStatus = readStatus(finance.status, `${path}.finance.status`);
  const operationsStatus = readStatus(operations.status, `${path}.operations.status`);
  const staffStatus = readStatus(staff.status, `${path}.staff.status`);
  if (operationsStatus === "modulo_desligado") throw new InvalidGroupPanelPayload(`${path}.operations.status`);
  if (staffStatus === "modulo_desligado") throw new InvalidGroupPanelPayload(`${path}.staff.status`);

  return {
    id: requiredStr(record, "id", `${path}.id`),
    name: requiredStr(record, "name", `${path}.name`),
    finance: {
      status: financeStatus,
      // Fora de `ok`: SEM número, mesmo que o corpo venha preenchido (fail-closed).
      summary: financeStatus === "ok" ? readFinancialSummary(finance.summary, `${path}.finance.summary`) : null,
      receivedVariationPct: financeStatus === "ok" ? nullableNum(finance, "receivedVariationPct", `${path}.finance.receivedVariationPct`) : null,
      paidVariationPct: financeStatus === "ok" ? nullableNum(finance, "paidVariationPct", `${path}.finance.paidVariationPct`) : null,
    },
    operations: {
      status: operationsStatus,
      summary: operationsStatus === "ok" ? readOperations(requiredRecord(operations.summary, `${path}.operations.summary`), `${path}.operations.summary`) : null,
    },
    staff: {
      status: staffStatus,
      summary: staffStatus === "ok" ? readStaff(requiredRecord(staff.summary, `${path}.staff.summary`), `${path}.staff.summary`) : null,
    },
  };
}

function readFinancialSummary(raw: unknown, path: string): FinancialSummary {
  if (typeof raw !== "object" || raw === null) throw new InvalidGroupPanelPayload(path);
  const adapted = adaptFinancialSummaryResponse(raw, "api");
  if (adapted.source !== "api") throw new InvalidGroupPanelPayload(path);
  // O `source` é da leitura do Financeiro; aqui fica só o resumo.
  return {
    receivable: adapted.receivable,
    payable: adapted.payable,
    settledThisMonth: adapted.settledThisMonth,
    cash: adapted.cash,
    cheques: adapted.cheques,
    cashFlow: adapted.cashFlow,
    recentTitles: adapted.recentTitles,
  };
}

function readOperations(record: Record<string, unknown>, path: string): GroupPanelOperations {
  return {
    openedToday: requiredNum(record, "openedToday", `${path}.openedToday`),
    openedThisWeek: requiredNum(record, "openedThisWeek", `${path}.openedThisWeek`),
    inProgress: requiredNum(record, "inProgress", `${path}.inProgress`),
    overdue: requiredNum(record, "overdue", `${path}.overdue`),
    openedThisMonth: requiredNum(record, "openedThisMonth", `${path}.openedThisMonth`),
    completedThisMonth: requiredNum(record, "completedThisMonth", `${path}.completedThisMonth`),
    openedPreviousMonth: requiredNum(record, "openedPreviousMonth", `${path}.openedPreviousMonth`),
    completionRatePct: nullableNum(record, "completionRatePct", `${path}.completionRatePct`),
    arrivalAvgMinutes: nullableNum(record, "arrivalAvgMinutes", `${path}.arrivalAvgMinutes`),
    arrivalCount: requiredNum(record, "arrivalCount", `${path}.arrivalCount`),
    arrivalMissingCount: requiredNum(record, "arrivalMissingCount", `${path}.arrivalMissingCount`),
    completionAvgMinutes: nullableNum(record, "completionAvgMinutes", `${path}.completionAvgMinutes`),
  };
}

function readStaff(record: Record<string, unknown>, path: string): GroupPanelStaff {
  return {
    activeUsers: requiredNum(record, "activeUsers", `${path}.activeUsers`),
    byProfile: requiredArray(record, "byProfile", `${path}.byProfile`).map((raw, index) => {
      const item = requiredRecord(raw, `${path}.byProfile[${index}]`);
      return { profile: requiredStr(item, "profile", `${path}.byProfile[${index}].profile`), count: requiredNum(item, "count", `${path}.byProfile[${index}].count`) };
    }),
    inServiceNow: requiredNum(record, "inServiceNow", `${path}.inServiceNow`),
  };
}

function readCashFlow(value: unknown, path: string): GroupPanelCashFlowPoint[] {
  if (!Array.isArray(value)) throw new InvalidGroupPanelPayload(path);
  return value.map((raw, index) => {
    const record = requiredRecord(raw, `${path}[${index}]`);
    return {
      competencia: requiredStr(record, "competencia", `${path}[${index}].competencia`),
      inflow: requiredNum(record, "inflow", `${path}[${index}].inflow`),
      outflow: requiredNum(record, "outflow", `${path}[${index}].outflow`),
    };
  });
}

function readStatus(value: unknown, path: string): GroupPanelBlockStatus {
  if (!BLOCK_STATUSES.includes(value as GroupPanelBlockStatus)) throw new InvalidGroupPanelPayload(path);
  return value as GroupPanelBlockStatus;
}

function guard<T>(work: () => T): AdaptResult<T> {
  try {
    return { ok: true, data: work() };
  } catch (error) {
    if (error instanceof InvalidGroupPanelPayload) return { ok: false, field: error.field };
    throw error;
  }
}

function envelope(payload: unknown): Record<string, unknown> {
  const root = requiredRecord(payload, "data");
  return requiredRecord(root.data, "data");
}

function requiredRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new InvalidGroupPanelPayload(path);
  return value as Record<string, unknown>;
}

function requiredArray(record: Record<string, unknown>, key: string, path: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new InvalidGroupPanelPayload(path);
  return value;
}

function requiredNum(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidGroupPanelPayload(path);
  return value;
}

function nullableNum(record: Record<string, unknown>, key: string, path: string): number | null {
  const value = record[key];
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidGroupPanelPayload(path);
  return value;
}

function requiredStr(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) throw new InvalidGroupPanelPayload(path);
  return value;
}

function requiredBool(record: Record<string, unknown>, key: string, path: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new InvalidGroupPanelPayload(path);
  return value;
}
