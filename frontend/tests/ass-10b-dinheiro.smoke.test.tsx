import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";
import ts from "typescript";

import { asMoney, asPct, formatBRL, formatPct } from "../src/modules/platform/cloud-billing/cloud-billing.money";
import { INITIAL_UI } from "../src/modules/platform/cloud-billing/cloud-billing.state";
import type { CloudBillingViewProps } from "../src/modules/platform/cloud-billing/views/cloudBilling.shared";
import { COST_OK, fixtureModel, globalJson, globalPayload, groupPayload, MONTH, tenantPayload } from "./helpers/cloud-billing.fixture";

// B-ASS-10b (T5) · R-T5-DIN (plano v2 §6.2) — a tela não calcula dinheiro. Dinheiro, percentual e taxa entram como
// STRING marcada; número, vazio e lixo viram ausência ("—"), nunca zero. T-DIN-1 e T-DIN-3 (as aparências) ficam neste
// mesmo arquivo; o T-DIN-P (a trava estática) é `ass-10b-nao-calcula.guard.test.ts`.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE = path.join(HERE, "../src/modules/platform/cloud-billing");

/** Os únicos campos `number` permitidos nos tipos do módulo: contagens, versões e índices (plano v2 §6.2, T-DIN-2). */
const NUMBER_FIELDS_ALLOWED = new Set([
  // contagens
  "memberCount",
  "membersWithoutSubscription",
  "rowCount",
  "duplicateRowsSkipped",
  "runs",
  // contagens do modelo único (cloud-billing.state.ts): linhas por situação, estimativas, fechadas, sem assinatura, em alerta
  "lineCount",
  "criticalCount",
  "warningCount",
  "normalCount",
  "noSubscriptionCount",
  "costMissingCount",
  "unknownCount",
  "estimateCount",
  "closedCount",
  "withoutSubscriptionCount",
  "alertCount",
  // versões
  "version",
  "fxRateVersion",
  // índices
  "index",
]);

function moduleFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const target = path.join(directory, name);
    if (statSync(target).isDirectory()) return moduleFiles(target);
    return /\.(ts|tsx)$/.test(name) ? [target] : [];
  });
}

test("T-DIN-2 dinheiro só entra como string decimal; número, vazio e lixo viram ausência, nunca zero", () => {
  assert.equal(asMoney("900.00"), "900.00");
  assert.equal(asMoney("-190.62"), "-190.62");
  for (const raw of [900, 0, "", "R$ 9", null, undefined, "9,00", " 9.00", "9.", ".9", "1e3", "NaN", {}, []]) assert.equal(asMoney(raw), null, String(raw));
  assert.equal(asPct("26.0"), "26.0");
  for (const raw of [26, "", "26 %", null]) assert.equal(asPct(raw), null, String(raw));
  assert.equal(formatBRL(asMoney("12345678901234.56")).replace(/\s/g, " "), "R$ 12.345.678.901.234,56");
  assert.equal(formatBRL(asMoney("-190.62")).replace(/\s/g, " "), "-R$ 190,62");
  assert.equal(formatBRL(null), "—");
  assert.equal(formatBRL(asMoney(0)), "—", "o número 0 do servidor não vira R$ 0,00");
  assert.equal(formatPct(asPct("26.0")).replace(/\s/g, " "), "26,0 %");
  assert.equal(formatPct(null), "—");
});

test("T-DIN-2 nenhum campo dos tipos do módulo é `number`, fora as contagens, versões e índices", () => {
  const files = moduleFiles(MODULE);
  assert.ok(files.length >= 6, `controle de vacuidade: o módulo tem arquivos (${files.length})`);
  const program = ts.createProgram(files, { strict: true, skipLibCheck: true, noEmit: true, types: [], jsx: ts.JsxEmit.ReactJSX, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 });
  const checker = program.getTypeChecker();
  const found: string[] = [];
  const offending: string[] = [];
  for (const source of program.getSourceFiles().filter((file) => path.resolve(file.fileName).startsWith(path.resolve(MODULE)))) {
    const visit = (node: ts.Node): void => {
      if ((ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) && node.type && ts.isIdentifier(node.name)) {
        const type = checker.getTypeFromTypeNode(node.type);
        const parts = type.isUnion() ? type.types : [type];
        // o campo É número (`number`, `number | null`): toda parte é número ou ausência, e uma delas é número sem marca
        const onlyNumberOrAbsent = parts.every((part) => (part.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined)) !== 0);
        const plainNumber = onlyNumberOrAbsent && parts.some((part) => (part.flags & ts.TypeFlags.NumberLike) !== 0 && !part.getProperty("__brand"));
        if (plainNumber) {
          const where = `${path.relative(MODULE, source.fileName).split(path.sep).join("/")}:${node.name.text}`;
          found.push(where);
          if (!NUMBER_FIELDS_ALLOWED.has(node.name.text)) offending.push(where);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  console.log(`# campos number do módulo: ${JSON.stringify(found)}`);
  assert.ok(found.length > 0, "controle de vacuidade: o detector acha ao menos as contagens");
  assert.deepEqual(offending, []);
});

// ---- T-DIN-1 — fixture INCOERENTE de propósito: a tela mostra o literal do servidor, nunca uma conta própria -------
const VIEWS_DIR = path.join(HERE, "../src/modules/platform/cloud-billing/views");
const LETTERS = ["A", "B", "C"].filter((letter) => existsSync(path.join(VIEWS_DIR, `CloudBillingView${letter}.tsx`)));
const noop = () => undefined;

function incoherentModel() {
  const line = (tenantId: string, tenantName: string, subscriptionAmount: string, allocatedCost: string, margin: string, marginPct: string) => ({
    tenantId, tenantName, groupId: null, groupName: null, subscriptionAmount, subscriptionBasis: "before_credits", statementTotal: subscriptionAmount, creditsApplied: null,
    subscriptionSource: "statement", subscriptionSkipReason: null, estimate: false, allocatedCost, allocatedCostOriginal: null, margin, marginPct, alert: "none",
  });
  // as linhas somam 60,00 + 40,00 = 100,00; o servidor diz 999,99 no total. Assinatura 900, custo 750 e margem 1,23.
  const lines = [line("ta", "Org Alfa", "500.01", "60.00", "440.02", "88.00"), line("tb", "Org Beta", "400.03", "40.00", "360.04", "90.00")];
  return fixtureModel(INITIAL_UI, {
    tenant: tenantPayload(MONTH, COST_OK, lines, { subscriptionAmount: "900.00", allocatedCost: "999.99", margin: "1.23", marginPct: "0.14" }),
    group: groupPayload(MONTH, COST_OK),
    global: globalPayload(MONTH, COST_OK, globalJson({ subscriptionTotal: "900.00", tenantsCost: "999.99", platformOwnCost: "0.50", unallocatedOther: "0.60", unallocatedByReason: [{ reason: "no_allocation_rule", cost: "0.60" }], roundingResidualCost: "0.01", conversionResidualCost: "0.02", totalCost: "750.00", margin: "1.23", marginPct: "0.14", alert: "none" })),
  });
}

const VIEW_COMPONENTS: Record<string, (props: CloudBillingViewProps) => React.ReactElement> = {};
for (const letter of LETTERS) {
  const module = (await import(pathToFileURL(path.join(VIEWS_DIR, `CloudBillingView${letter}.tsx`)).href)) as Record<string, (props: CloudBillingViewProps) => React.ReactElement>;
  VIEW_COMPONENTS[letter] = module[`CloudBillingView${letter}`]!;
}
const shownMoney = (decimal: string) => formatBRL(asMoney(decimal)).replace(/\s/g, " ");
// o que o servidor mandou (o literal) e o que só a conta da tela daria (a soma das linhas; assinatura − custo)
const SERVER_TOTAL = shownMoney("999.99");
const SERVER_MARGIN = shownMoney("1.23");
const SUM_OF_LINES = shownMoney("100.00");
const SUB_MINUS_COST = shownMoney("150.00");

test("T-DIN-1 com o servidor incoerente, as aparências mostram R$ 999,99 e R$ 1,23 e nunca a conta da tela (R$ 100,00, R$ 150,00)", () => {
  assert.ok(LETTERS.includes("A"));
  const model = incoherentModel();
  for (const [letter, View] of Object.entries(VIEW_COMPONENTS)) {
    const props: CloudBillingViewProps = { model, access: { importCosts: true, readImports: true, runAllocation: true, manageBilling: true }, onTarget: noop, onToggleRow: noop, onClearTarget: noop, onMode: noop, onSearch: noop, onMonth: noop, onAction: noop, onRetrySeries: noop };
    const shown = renderToString(<View {...props} />).replace(/<[^>]+>/g, " ").replace(/\s/g, " ");
    assert.ok(shown.includes(SERVER_TOTAL), `${letter}: o total do servidor`);
    assert.ok(shown.includes(SERVER_MARGIN), `${letter}: a margem do servidor`);
    assert.ok(!shown.includes(SUM_OF_LINES), `${letter}: soma das linhas`);
    assert.ok(!shown.includes(SUB_MINUS_COST), `${letter}: assinatura menos custo`);
  }
});

// ---- T-DIN-3 — P13 na tela: sem custo válido, NENHUM custo nem margem em reais, seja qual for o valor do campo -------
// Achado A-1 do plano: com `no_run`/`no_import` o servidor manda `global.tenantsCost: "0.00"` e `totals.allocatedCost:
// "0.00"` enquanto os outros campos de custo vêm `null`. A tela não pode mostrar R$ 0,00 em custo nem em margem.
function noCostModel(status: string, ui: typeof INITIAL_UI) {
  const cost = { ...COST_OK, status, runId: status === "no_run" ? null : "run-out", fxRate: null, fxRateVersion: null };
  const lines = [
    { tenantId: "ta", tenantName: "Org Alfa", groupId: "g1", groupName: "Grupo Vale", subscriptionAmount: "500.01", subscriptionBasis: "before_credits", statementTotal: "500.01", creditsApplied: null, subscriptionSource: "statement", subscriptionSkipReason: null, estimate: false, allocatedCost: "0.00", allocatedCostOriginal: null, margin: "0.00", marginPct: "0.00", alert: "cost_missing" },
  ];
  return fixtureModel(ui, {
    cost,
    tenant: tenantPayload(MONTH, cost, lines, { subscriptionAmount: "500.01", allocatedCost: "0.00", margin: "0.00", marginPct: null }),
    group: { ...groupPayload(MONTH, cost), lines: [{ groupId: "g1", groupName: "Grupo Vale", memberCount: 1, membersWithoutSubscription: 0, subscriptionAmount: "500.01", creditsApplied: null, allocatedCost: "0.00", margin: "0.00", marginPct: null, alert: "cost_missing", estimate: false }] },
    global: globalPayload(MONTH, cost, globalJson({ subscriptionTotal: "500.01", tenantsCost: "0.00", platformOwnCost: "0.00", unallocatedOther: "0.00", unallocatedByReason: [{ reason: "no_allocation_rule", cost: "0.00" }], roundingResidualCost: "0.00", conversionResidualCost: "0.00", totalCost: "0.00", margin: "0.00", marginPct: "0.00", alert: "cost_missing" })),
  });
}
const ZERO = shownMoney("0.00");

test("T-DIN-3 P13: com o custo do mês nos 4 estados sem custo, nenhuma aparência mostra R$ 0,00 em custo nem em margem", () => {
  assert.ok(LETTERS.includes("A"));
  const uis = [INITIAL_UI, { ...INITIAL_UI, aberta: "t:ta" }, { ...INITIAL_UI, modo: "group" as const, aberta: "g:g1" }, { ...INITIAL_UI, modo: "global" as const }];
  for (const status of ["no_run", "no_import", "fx_missing", "currency_unknown"]) {
    for (const ui of uis) {
      const model = noCostModel(status, ui);
      for (const [letter, View] of Object.entries(VIEW_COMPONENTS)) {
        const props: CloudBillingViewProps = { model, access: { importCosts: true, readImports: true, runAllocation: true, manageBilling: true }, onTarget: noop, onToggleRow: noop, onClearTarget: noop, onMode: noop, onSearch: noop, onMonth: noop, onAction: noop, onRetrySeries: noop };
        const shown = renderToString(<View {...props} />)
          .replace(/<text[^>]*data-escala[^>]*>[\s\S]*?<\/text>/g, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s/g, " ");
        assert.ok(shown.includes(shownMoney("500.01")), `${letter} ${status}: controle — a assinatura do servidor aparece`);
        assert.ok(!shown.includes(ZERO), `${letter} ${status} ${JSON.stringify(ui)}: R$ 0,00 inventado`);
      }
    }
  }
});
