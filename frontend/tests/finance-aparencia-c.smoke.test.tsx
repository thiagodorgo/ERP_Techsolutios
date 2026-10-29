import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyFinancialSummary } from "../src/modules/finance/dashboard/financial-summary.types";
import type { FinanceiroViewModel } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { AGGREGATE_KEYS } from "../src/modules/finance/pages/views/FinanceiroViewA";
import { FinanceiroViewC } from "../src/modules/finance/pages/views/FinanceiroViewC";
import type { FinancialTitle } from "../src/modules/finance/titles/financial-titles.types";

const aggregate = (groupBy: "none" | "day", items: readonly { bucket: string | null; count: number; inflow: number; outflow: number; net: number }[]) => ({ groupBy, currency: "BRL", timezone: "America/Sao_Paulo", items });
function model(over: Partial<FinanceiroViewModel> = {}): FinanceiroViewModel {
  const summary = emptyFinancialSummary();
  return { state: { tab: "ext", accountId: null, target: null }, onState: () => undefined, summary: { ...summary, cheques: { pendingReceivedCount: 3, pendingReceivedAmount: 900, pendingIssuedCount: 1, pendingIssuedAmount: 100, linkedPendingCount: 2, linkedPendingAmount: 700 } }, summaryLoading: false, accounts: { items: [], loading: false, failed: false, total: 0 }, balances: {}, receivables: { items: [{ id: "t1", direction: "receivable", partyType: "customer", partyName: "A", document: "N1", category: null, description: null, amount: 10, currency: "BRL", issueDate: null, dueDate: "2026-10-20", paidAmount: 0, status: "open", competencia: "2026-10", accountId: null, overdue: true, active: true, createdAt: "" }], loading: false, failed: false, total: 7, hasMore: true, loadingMore: false, loadMore: async () => undefined }, payables: { items: [], loading: false, failed: false, total: 0, hasMore: false, loadingMore: false, loadMore: async () => undefined }, entries: { items: [], loading: false, failed: false, total: 12 }, aggregates: { [AGGREGATE_KEYS.routineDays(null)]: aggregate("day", [{ bucket: "2026-10-29", count: 2, inflow: 100, outflow: 40, net: 60 }]), [AGGREGATE_KEYS.routineDaysPending(null)]: aggregate("day", [{ bucket: "2026-10-29", count: 1, inflow: 0, outflow: 0, net: 0 }]) }, policy: { canUnreconcile: false, delegatedToFinance: false }, access: { readEntries: true, readTitles: true, readAccounts: true, pay: true, reconcile: true, createAccount: true }, failed: false, stale: false, lastUpdatedAt: null, entryBusyId: null, entryMessage: null, onRetry: () => undefined, onNewAccount: () => undefined, onPay: () => undefined, onReconcile: () => undefined, onUnreconcile: () => undefined, ...over };
}
test("C populada mostra quatro etapas, série diária e cheques reais", () => { const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />); assert.match(html, /data-aparencia="C"/); for (const text of ["1 · Baixar", "2 · Conciliar", "3 · Ressalvas", "Extrato completo"]) assert.match(html, new RegExp(text)); assert.match(html, /3 recebidos/); assert.match(html, /R\$\s900,00/); assert.match(html, /1 a conciliar/); });
test("C rotula contagens como subconjunto carregado", () => { const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />); assert.match(html, /nos títulos carregados/); assert.match(html, /1 títulos carregados de 7 no servidor/); });
test("C loading usa skeleton acessível", () => { assert.match(renderToStaticMarkup(<FinanceiroViewC {...model({ summaryLoading: true })} />), /aria-busy="true"/); });
test("C erro inicial oferece retry", () => { const html = renderToStaticMarkup(<FinanceiroViewC {...model({ failed: true })} />); assert.match(html, /data-state="error"/); assert.match(html, /Tentar novamente/); });
test("C sem leitura é forbidden", () => { const base = model(); assert.match(renderToStaticMarkup(<FinanceiroViewC {...model({ access: { ...base.access, readEntries: false } })} />), /data-state="forbidden"/); });
test("C stale mantém dados e mostra faixa", () => { const html = renderToStaticMarkup(<FinanceiroViewC {...model({ stale: true })} />); assert.match(html, /Dados desatualizados/); assert.match(html, /3 recebidos/); });
test("C vazio não declara total global", () => { const base = model(); const html = renderToStaticMarkup(<FinanceiroViewC {...model({ receivables: { ...base.receivables, items: [], total: 4 }, entries: { items: [], loading: false, failed: false, total: 9 } })} />); assert.match(html, /Nenhum item na página carregada/); assert.doesNotMatch(html, /Tudo conferido/); });
test("C não inventa vínculo inverso de cheque", () => { const html = renderToStaticMarkup(<FinanceiroViewC {...model()} />); assert.match(html, /Como conferir/); assert.doesNotMatch(html, /título t1.*cheque/i); });
test("C sequência abre uma linha por vez e só agenda avanço no sucesso", () => { const source = readFileSync(new URL("../src/modules/finance/pages/views/FinanceiroViewC.tsx", import.meta.url), "utf8"); assert.match(source, /const \[openEntryId, setOpenEntryId\]/); assert.match(source, /model\.onReconcile\(entry, \(\) => advanceAfterSuccess\(entry\.id\)\)/); assert.match(source, /setOpenEntryId\(queue\[index \+ 1\]\?\.id \?\? null\)/); });
test("C avança somente no onDone do formulário e fechar não confirma", () => { const source = readFileSync(new URL("../src/modules/finance/pages/FinanceiroPage.tsx", import.meta.url), "utf8"); assert.equal((source.match(/reconcileDone\?\.\(\)/g) ?? []).length, 1); assert.match(source, /onDone=\{\(updated\) => \{[\s\S]*reconcileDone\?\.\(\)/); assert.doesNotMatch(source, /onClose=\{\(\) => \{[^}]*reconcileDone/); });

test("C conta em Próximos dias exatamente os mesmos títulos do filtro sem7", () => {
  const now = new Date();
  const iso = (delta: number) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const base = model();
  const template = base.receivables.items[0] as FinancialTitle;
  const html = renderToStaticMarkup(
    <FinanceiroViewC
      {...model({
        receivables: {
          ...base.receivables,
          items: [
            { ...template, id: "em-tres-dias", dueDate: iso(3), overdue: false },
            { ...template, id: "em-dez-dias", dueDate: iso(10), overdue: false },
          ],
          total: 2,
        },
      })}
    />,
  );
  assert.match(html, />Próximos dias<\/span><strong>1<\/strong>/);
});
