import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildSidebarNav, NAV_BY_ROLE } from "../src/layouts/appSidebarNav";
import { financeStateSearch, readFinanceState } from "../src/modules/finance/pages/financeiro.state";

// B-SAN3-12b — F13 (A1 da crítica v2: uma tela só para o mesmo título). `/finance/charges` e `/finance/payments` deixam
// de montar ChargesPage/PaymentsPage e redirecionam para as abas do Financeiro; o menu aponta direto para as abas.
// As páginas antigas saem do código no B-SAN3-24 (resposta do dono à Q4).

const APP = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

/** O elemento da <Route path="…"> (do `element={` até o fim do bloco da rota), por parse de chaves balanceadas. */
function routeElement(path: string): string {
  const at = APP.indexOf(`path="${path}"`);
  assert.ok(at > 0, `rota ${path} ausente`);
  const open = APP.indexOf("element={", at) + "element=".length;
  let depth = 0;
  for (let i = open; i < APP.length; i += 1) {
    if (APP[i] === "{") depth += 1;
    else if (APP[i] === "}" && --depth === 0) return APP.slice(open, i + 1).replace(/\s+/g, " ");
  }
  throw new Error("element sem fim");
}

test("F13: /finance/charges e /finance/payments redirecionam (replace) para /finance?aba=rec e ?aba=pag", () => {
  assert.equal(routeElement("/finance/charges"), '{<Navigate to="/finance?aba=rec" replace />}');
  assert.equal(routeElement("/finance/payments"), '{<Navigate to="/finance?aba=pag" replace />}');
  assert.doesNotMatch(APP, /<ChargesPage|<PaymentsPage/, "as páginas antigas não são mais montadas por rota nenhuma");
});

test("F13: o menu do Financeiro leva Cobranças e Pagamentos às abas, e os itens continuam visíveis no menu MVP", () => {
  const items = NAV_BY_ROLE.finance.flatMap((group) => group.items);
  assert.equal(items.find((item) => item.label === "Cobranças")?.path, "/finance?aba=rec");
  assert.equal(items.find((item) => item.label === "Pagamentos")?.path, "/finance?aba=pag");
  const visible = buildSidebarNav(["Financeiro"]).flatMap((group) => group.items.map((item) => item.label));
  for (const label of ["Financeiro", "Cobranças", "Pagamentos"]) assert.ok(visible.includes(label), `${label} sumiu do menu`);
});

test("estado navegável: ?aba=rec|pag|ext|conc, &conta e &filtro vão e voltam pela querystring; aba inválida cai em 'A receber'", () => {
  assert.deepEqual(readFinanceState("?aba=pag"), { tab: "pag", accountId: null, target: null });
  assert.deepEqual(readFinanceState("?aba=ext&conta=acc-1"), { tab: "ext", accountId: "acc-1", target: null });
  assert.deepEqual(readFinanceState("?aba=xpto"), { tab: "rec", accountId: null, target: null });
  assert.deepEqual(readFinanceState(""), { tab: "rec", accountId: null, target: null });
  const state = { tab: "conc" as const, accountId: "acc-2", target: "conc:pendente" };
  assert.deepEqual(readFinanceState(financeStateSearch(state)), state);
  assert.deepEqual(readFinanceState("?aba=rec&filtro=%3Cscript%3E"), { tab: "rec", accountId: null, target: null }, "filtro desconhecido é ignorado");
});
