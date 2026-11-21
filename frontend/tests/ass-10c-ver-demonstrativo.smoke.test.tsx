import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";

import { CloudBillingViewA } from "../src/modules/platform/cloud-billing/views/CloudBillingViewA";
import { INITIAL_UI } from "../src/modules/platform/cloud-billing/cloud-billing.state";
import type { CloudBillingAction } from "../src/modules/platform/cloud-billing/views/cloudBilling.shared";
import { initialMonth } from "../src/modules/platform/billing-operations/pages/PlatformBillingOpsPage";
import * as cloud from "./helpers/cloud-billing.fixture";
import * as ops from "./helpers/billing-ops.fixture";

// B-ASS-10c-OPERACAO · R-VERDEM (fecha a `P-567-VER-DEMONSTRATIVO`) — o detalhe da organização no Cloud Billing ganha
// "Ver demonstrativo de <mês>" SÓ quando a organização tem assinatura no mês, e ele leva a `/platform/billing?org=&mes=`,
// que abre a tela de cobrança no mês e filtrada na organização.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FULL = { importCosts: true, readImports: true, runAllocation: true, manageBilling: true };

function renderTenant(tenantId: string, onAction: (action: CloudBillingAction) => void = () => undefined) {
  const model = cloud.fixtureModel({ ...INITIAL_UI, aberta: `t:${tenantId}` });
  const noop = () => undefined;
  const html = renderToString(React.createElement(CloudBillingViewA, { model, access: FULL, onTarget: noop, onToggleRow: noop, onClearTarget: noop, onMode: noop, onSearch: noop, onMonth: noop, onAction, onRetrySeries: noop }));
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

test("T-VDE-1 'Ver demonstrativo de <mês>' aparece só para a organização com assinatura no mês", () => {
  assert.match(renderTenant("t1"), /Ver demonstrativo de outubro/, "t1 tem assinatura");
  assert.doesNotMatch(renderTenant("t3"), /Ver demonstrativo/, "t3 é filial sem assinatura própria");
  assert.doesNotMatch(renderTenant("t5"), /Ver demonstrativo/, "t5 tem plano sem preço");
});

test("T-VDE-2 o botão leva a /platform/billing?org=<id>&mes=<AAAA-MM>, e a tela de cobrança abre no mês, filtrada na organização", () => {
  const page = readFileSync(path.join(HERE, "../src/modules/platform/cloud-billing/pages/PlatformCloudBillingPage.tsx"), "utf8");
  assert.match(page, /action\.kind === "open-statement"\) navigate\(`\/platform\/billing\?org=\$\{encodeURIComponent\(action\.tenantId\)\}&mes=\$\{action\.month\}`\)/);
  // a tela de cobrança aceita o mês do link (e recusa mês inválido ou futuro)
  assert.equal(initialMonth("2026-09", "2026-11"), "2026-09");
  assert.equal(initialMonth("2027-01", "2026-11"), "2026-10", "mês futuro cai no do último fechamento");
  assert.equal(initialMonth("abc", "2026-11"), "2026-10");
  assert.equal(initialMonth(null, "2026-11"), "2026-10");
  // e o filtro `org:<id>` deixa só a organização do link
  const model = ops.fixtureModel({ alvo: "org:org-vale", aberta: null, canal: false, busca: "" });
  assert.deepEqual(model.rows.map((row) => row.org.id), ["org-vale"]);
  assert.equal(model.filterLabel, "Auto Socorro Vale do Paraíba");
});
