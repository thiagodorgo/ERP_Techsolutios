import assert from "node:assert/strict";
import test from "node:test";

import {
  MembershipOverlapError,
  groupOfTenantOn,
  isMemberOn,
  type MemberRow,
} from "../src/modules/subscription-billing/economic-groups/membership.rules.js";
import type { CloudCostAllocationSummary } from "../src/modules/cloud-cost-allocation/index.js";
import { buildOverview, type OverviewInput } from "../src/modules/subscription-billing/overview/overview.engine.js";
import type { OverviewGroupBy, SubscriptionAmount } from "../src/modules/subscription-billing/overview/overview.types.js";

// B-ASS-09 · F2 — grupo econômico: vigência e falha fechada (plano v2 §3 P5; §6 C3: R-GRP-1, R-GRP-2 e R-GRP-7).
// Só os casos da F2 (Emenda 2 §1.6): os testes em memória do serviço de grupos (F5b) nascem em
// `tests/ass-09-groups-service.test.ts`. O R-GRP-7 é sem HTTP (o 500 da rota é da F6). Valores sintéticos (plano §15).
//
// MUTAÇÕES LITERAIS QUE ESTE ARQUIVO MATA:
//   M-GRP-1   `day < row.validTo` → `day <= row.validTo`                                          → T-GRP-1
//   M-GRP-10  apagar `if (hits.length > 1) throw new MembershipOverlapError(tenantId);`           → T-GRP-12 (regra e motor)
//   M-GRP-2   `const memberDay = lastDateOfPeriod(period);` → `const memberDay = `${period}-01`;` → T-GRP-2 (motor)
//   M-GRP-3   apagar `if (ungrouped.length > 0) groupLines.push(noGroupLineOf(ungrouped));`      → T-GRP-4
// (F2a: as regras; F2b: a mesma vigência e a falha fechada pela visão, `buildOverview`.)

const P_LAST_DAY = "2026-10-31";

function row(tenantId: string, groupId: string, validFrom: string, validTo: string | null): MemberRow {
  return { tenantId, groupId, validFrom, validTo };
}

test("T-GRP-1..3 (regra) · membro em P ⇔ vínculo vigente no ÚLTIMO dia de P, com o fim exclusivo", () => {
  // T-GRP-1 · fechado NO último dia de P: o fim é exclusivo, então no último dia ele já não é membro.
  assert.equal(isMemberOn(row("c", "g1", "2026-09-01", P_LAST_DAY), P_LAST_DAY), false);
  assert.equal(isMemberOn(row("c", "g1", "2026-09-01", P_LAST_DAY), "2026-10-30"), true);
  // T-GRP-2 · entrou no dia 20 de P, aberto: é membro no último dia.
  assert.equal(isMemberOn(row("c", "g1", "2026-10-20", null), P_LAST_DAY), true);
  // T-GRP-3 · começa no 1º dia de P+1: não é membro em P.
  assert.equal(isMemberOn(row("c", "g1", "2026-11-01", null), P_LAST_DAY), false);
  // O início é inclusivo.
  assert.equal(isMemberOn(row("c", "g1", P_LAST_DAY, null), P_LAST_DAY), true);
});

test("T-GRP-12 (regra) · dois vínculos da mesma organização no mesmo dia → MembershipOverlapError, sem escolher um", () => {
  const rows = [row("c", "g1", "2026-11-01", null), row("c", "g2", "2026-11-15", null), row("d", "g2", "2026-11-01", null)];
  assert.throws(
    () => groupOfTenantOn(rows, "c", "2026-11-30"),
    (error: unknown) =>
      error instanceof MembershipOverlapError && error.code === "membership_integrity_violation" && error.tenantId === "c",
  );
  // Antes do 2º vínculo começar, um só: o grupo sai.
  assert.equal(groupOfTenantOn(rows, "c", "2026-11-14"), "g1");
  // As outras organizações não são afetadas; sem vínculo no dia, `null`.
  assert.equal(groupOfTenantOn(rows, "d", "2026-11-30"), "g2");
  assert.equal(groupOfTenantOn(rows, "e", "2026-11-30"), null);
});

// ---------------------------------------------------------------------------------------------------------------------
// F2b — pela visão (`buildOverview`).

function summaryOf(period: string, tenants: ReadonlyArray<readonly [string, number]>): CloudCostAllocationSummary {
  const allocated = tenants.reduce((total, [, cost]) => total + cost, 0);
  return {
    periodStart: `${period}-01T00:00:00.000Z`,
    periodEnd: `${period}-28T00:00:00.000Z`,
    currency: "BRL",
    totalImportedCost: allocated,
    totalAllocatedCost: allocated,
    totalUnallocatedCost: 0,
    totalPlatformCost: 0,
    roundingResidualCost: 0,
    runId: "run-1",
    importId: "imp-1",
    importResolution: "explicit",
    coverage: "imported",
    unallocatedByReason: [],
    platformCostByService: [],
    estimatedCategories: [],
    tenants: tenants.map(([tenantId, allocatedCost]) => ({ tenantId, allocatedCost, allocationRatio: 0 })),
    services: [],
    generatedAt: "2026-12-01T00:00:00.000Z",
  };
}

function paying(cents: bigint | null): SubscriptionAmount {
  return {
    subscriptionAmountCents: cents,
    statementTotalCents: cents,
    creditsAppliedCents: cents === null ? null : 0n,
    subscriptionBasis: "statement_total",
    source: cents === null ? "none" : "statement",
    skipReason: cents === null ? "no_subscription" : null,
    estimate: false,
  };
}

function viewInput(
  period: string,
  groupBy: OverviewGroupBy,
  tenants: ReadonlyArray<readonly [string, number, bigint | null]>,
  memberships: readonly MemberRow[],
): OverviewInput {
  return {
    period,
    groupBy,
    generatedAt: new Date("2026-12-02T12:00:00.000Z"),
    summary: summaryOf(period, tenants.map(([id, cost]) => [id, cost] as const)),
    runs: [],
    fxRate: null,
    tenants: tenants.map(([tenantId]) => ({ tenantId, tenantName: `Organização ${tenantId.toUpperCase()}`, slug: `org-${tenantId}` })),
    subscriptions: new Map(tenants.map(([tenantId, , sub]) => [tenantId, paying(sub)] as const)),
    groups: [
      { groupId: "g1", groupName: "Grupo 1" },
      { groupId: "g2", groupName: "Grupo 2" },
    ],
    memberships,
  };
}

function groupOfLine(period: string, membership: MemberRow): string | null {
  const data = buildOverview(viewInput(period, "tenant", [[membership.tenantId, 10, 100_000n]], [membership]));
  if (data.groupBy !== "tenant") return assert.fail("visão por organização");
  return data.lines[0]!.groupId;
}

test("T-GRP-1..3 (motor) · a visão lê o grupo de cada organização no ÚLTIMO dia de P", () => {
  assert.equal(groupOfLine("2026-10", row("c", "g1", "2026-09-01", P_LAST_DAY)), null, "T-GRP-1 fechado no último dia");
  assert.equal(groupOfLine("2026-10", row("c", "g1", "2026-10-20", null)), "g1", "T-GRP-2 entrou no dia 20");
  assert.equal(groupOfLine("2026-10", row("c", "g1", "2026-11-01", null)), null, "T-GRP-3 começa em P+1");
});

test('T-GRP-4 · conservação: Σ das linhas de grupo (com "Sem grupo") = Σ das linhas de organização, exato', () => {
  // 5 organizações, 2 grupos, 1 sem grupo; uma sem assinatura (`null` conta 0 nas duas somas).
  const tenants = [
    ["a", 12.345, 100_000n],
    ["b", 7.005, null],
    ["c", 0.004, 50_000n],
    ["d", 99.999, 25_050n],
    ["e", 3.333, 10_001n],
  ] as const;
  const memberships = [
    row("a", "g1", "2026-10-01", null),
    row("b", "g1", "2026-10-05", null),
    row("c", "g2", "2026-09-01", null),
    row("d", "g2", "2026-10-31", null),
  ];
  const byTenant = buildOverview(viewInput("2026-10", "tenant", tenants, memberships));
  const byGroup = buildOverview(viewInput("2026-10", "group", tenants, memberships));
  if (byTenant.groupBy !== "tenant" || byGroup.groupBy !== "group") return assert.fail("visões");
  const cents = (value: string | null): bigint => (value === null ? 0n : BigInt(value.replace(".", "")));
  const sum = (values: readonly (string | null)[]): bigint => values.reduce((total, value) => total + cents(value), 0n);
  assert.deepEqual(
    byGroup.lines.map((line) => [line.groupName, line.memberCount, line.membersWithoutSubscription]),
    [
      ["Grupo 1", 2, 1],
      ["Grupo 2", 2, 0],
      [null, 1, 0],
    ],
  );
  assert.equal(sum(byGroup.lines.map((l) => l.subscriptionAmount)), sum(byTenant.lines.map((l) => l.subscriptionAmount)));
  assert.equal(sum(byGroup.lines.map((l) => l.allocatedCost)), sum(byTenant.lines.map((l) => l.allocatedCost)));
  assert.equal(sum(byTenant.lines.map((l) => l.allocatedCost)), cents(byTenant.totals.allocatedCost));
  // A margem do grupo é o que os membros pagam menos o que TODOS custam, inclusive quem não tem assinatura (D-6, a
  // filial): por isso ela não é a soma das margens por organização, e a conservação (P7) é em assinatura e custo.
  const g1 = byGroup.lines[0]!;
  assert.equal(cents(g1.margin), cents(g1.subscriptionAmount) - cents(g1.allocatedCost));
  const b = byTenant.lines.find((line) => line.tenantId === "b")!;
  assert.deepEqual([b.margin, b.alert], [null, "no_subscription"]);
  assert.deepEqual(byGroup.totals, byTenant.totals);
  // "Sem grupo" leva as somas e a margem, sem alerta.
  assert.equal(byGroup.lines[2]!.groupId, null);
  assert.equal(byGroup.lines[2]!.alert, null);
  assert.equal(byGroup.lines[2]!.subscriptionAmount, "100.01");
});

test("T-GRP-12 (motor) · dois grupos no último dia de 2026-11 → a visão não sai, em nenhuma das 3 formas", () => {
  const memberships = [row("c", "g1", "2026-11-01", null), row("c", "g2", "2026-11-15", null)];
  for (const groupBy of ["group", "tenant", "global"] as const) {
    assert.throws(
      () => buildOverview(viewInput("2026-11", groupBy, [["c", 10, 100_000n], ["d", 5, 100_000n]], memberships)),
      (error: unknown) => error instanceof MembershipOverlapError && error.code === "membership_integrity_violation",
      groupBy,
    );
  }
  // Controle: em 2026-10 o 2º vínculo ainda não começou, e a visão sai.
  const october = buildOverview(viewInput("2026-10", "group", [["c", 10, 100_000n]], memberships.map((m, i) => (i === 0 ? { ...m, validFrom: "2026-10-01" } : m))));
  assert.equal(october.groupBy, "group");
});
