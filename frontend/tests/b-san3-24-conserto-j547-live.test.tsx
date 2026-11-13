import assert from "node:assert/strict";
import test, { after } from "node:test";

import { toChequeDto, toChequeListDto } from "../../src/modules/cheques/cheque.dto";
import type { Cheque as ServerCheque } from "../../src/modules/cheques/cheque.types";
import { toFinancialPeriodStatusDto } from "../../src/modules/financial-period-closes/financial-period-close.dto";
import { elements, installMiniDom, propsOf, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// J-547 (B-SAN3-24, item 29) — o conserto único, na página REAL com os provedores e os hooks reais, no DOM mínimo da
// trilha (molde de `b-san3-24-cheques-live.test.tsx` e `b-san3-24-fechamento-live.test.tsx`). A rede é o único dublê e
// responde com os BYTES do servidor. Prende o que as views puras não mostram sozinhas:
//   C3-08  Cheques: a releitura em 2º plano falha ⇒ os indicadores de DINHEIRO e as contagens ficam com o último valor
//          bom, com a faixa de desatualizado (nunca "Indisponível · o servidor não respondeu");
//   C3-05  Cheques: com as contas atrasadas, a confirmação de compensar diz "na conta do cheque" e mostra o marcador,
//          nunca "Conta não listada";
//   C3-12  Fechamento C: a mesma tela, pelos hooks reais, conta no bloco os mesmos meses que o calendário marca abertos;
//   C3-10  Fechamento B: clicar na coluna do gráfico abre o mês (a lista mostra só ele, com o detalhe aberto).
process.env.VITE_USE_MOCKS = "false";

const dom = installMiniDom();

const consoleErrors: string[] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  consoleErrors.push(args.map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg))).join(" "));
};

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { ChequesPage } = await import("../src/modules/finance/cheques/ChequesPage");
const { FechamentoPage } = await import("../src/modules/finance/period-closes/FechamentoPage");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");
const { DEFAULT_AUTO_REFRESH_MS } = await import("../src/hooks/useAutoRefresh");
const { periodName, previousPeriodKey, toPeriodKey } = await import("../src/modules/finance/period-closes/period-keys");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 8; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

type Call = { readonly method: string; readonly url: string; readonly body: unknown };
type Route = (call: Call, path: URL) => Response | Promise<Response> | null;
const calls: Call[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fail500 = () => json(500, { error: { code: "X", reason: "x", message: "x" } });

function installFetch(route: Route) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const call: Call = { method: init?.method ?? "GET", url, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);
    const parsed = new URL(`http://x${url}`);
    const answer = await route(call, parsed);
    return answer ?? json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seed(tenantId: string, permissions: readonly string[], appearance?: Readonly<Record<string, string>>) {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Financeiro" as never], permissions: [...permissions] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId, tenantName: "Organização de Teste", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Financeiro", permissions, enabledModules: ["dashboard", "finance"], scope: "tenant" }),
  );
  if (appearance) dom.storage.set(`techsol.aparencia.${tenantId}.${mockSession.user.id}`, JSON.stringify(appearance));
}

async function mount(page: React.ComponentType, initial: string) {
  dom.intervals.length = 0;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(h(MemoryRouter, { initialEntries: [initial] }, h(AuthProvider, null, h(TenantProvider, null, h(PermissionProvider, null, h(page))))));
  });
  await settle();
  return {
    container,
    unmount: async () => {
      await act(async () => root.unmount());
      dom.doc.body.removeChild(container);
    },
  };
}

const clickProps = (el: MiniDomElement) => ({ preventDefault() {}, stopPropagation() {}, target: el, currentTarget: el });
async function press(el: MiniDomElement | undefined) {
  assert.ok(el, "elemento a acionar não encontrado");
  const onClick = propsOf(el).onClick as ((ev: unknown) => void) | undefined;
  assert.equal(typeof onClick, "function", `onClick ausente em <${el.localName}> "${text(el)}"`);
  await act(async () => {
    onClick!(clickProps(el));
  });
  await settle();
}
const byLabel = (container: MiniDomNode, pattern: RegExp) => elements(container, (el) => pattern.test(el.getAttribute("aria-label") ?? ""));
const row = (container: MiniDomNode, id: string) => elements(container, (el) => el.localName === "tr" && el.getAttribute("data-row-key") === id)[0];
const rows = (container: MiniDomNode) => elements(container, (el) => el.localName === "tr" && el.hasAttribute("data-row-key")).map((el) => el.getAttribute("data-row-key"));

// ── Cheques ──
const CHEQUES_TENANT = "org-cheques-j547";
const CHEQUES_PERMS = ["cheques:read", "cheques:create", "cheques:update", "financial_entries:read", "financial_entries:create", "financial_accounts:read", "financial_titles:read"];
const at = new Date("2026-11-01T12:00:00.000Z");
const serverCheque = (over: Partial<ServerCheque>): ServerCheque =>
  ({ id: "chq-x", tenantId: CHEQUES_TENANT, accountId: "acc-bb", direction: "received", chequeNumber: "000100", bank: "Banco do Brasil", amount: 100, currency: "BRL", status: "registered", createdAt: at, updatedAt: at, ...over }) as ServerCheque;
const FIXTURE: ServerCheque[] = [
  serverCheque({ id: "chq-dep-in", chequeNumber: "087120", amount: 1850, status: "deposited" }),
  serverCheque({ id: "chq-reg", chequeNumber: "010245", amount: 2150, status: "registered" }),
  serverCheque({ id: "chq-bounced", chequeNumber: "000990", amount: 300, status: "bounced" }),
];
const SUMMARY = {
  receivable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
  payable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
  settledThisMonth: { competencia: "2026-11", inflow: 0, outflow: 0 },
  cash: { totalBalance: 0, accountCount: 1, currency: "BRL" },
  cheques: { pendingReceivedCount: 2, pendingReceivedAmount: 4000, pendingIssuedCount: 0, pendingIssuedAmount: 0, linkedPendingCount: 0, linkedPendingAmount: 0 },
  cashFlow: [],
  recentTitles: [],
};
const ACCOUNTS = { items: [{ id: "acc-bb", name: "Conta corrente Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 0, bankName: "BB", status: "active", isActive: true, createdAt: "2026-01-01T12:00:00.000Z" }], pagination: { limit: 100, offset: 0, total: 1 } };

function chequesRoute(options: { readonly failing: () => boolean; readonly accountsGate?: Promise<void> }): Route {
  return async (call, url) => {
    const path = url.pathname;
    if (call.method !== "GET") return null;
    if (path === "/cheques") {
      if (options.failing()) return fail500();
      const status = url.searchParams.get("status");
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const items = FIXTURE.filter((c) => !status || c.status === status);
      return json(200, toChequeListDto({ items: items.slice(0, limit), total: items.length, limit, offset: 0 }));
    }
    const one = /^\/cheques\/([^/]+)$/.exec(path);
    if (one) {
      const found = FIXTURE.find((c) => c.id === one[1]);
      return found ? json(200, { data: toChequeDto(found) }) : null;
    }
    if (path === "/financial-summary") return options.failing() ? fail500() : json(200, { data: SUMMARY });
    if (path === "/financial-accounts") {
      if (options.accountsGate) await options.accountsGate;
      return json(200, ACCOUNTS);
    }
    if (/^\/financial-accounts\/[^/]+\/balance$/.test(path)) return json(200, { data: { accountId: "acc-bb", currency: "BRL", openingBalance: 0, in: 0, out: 0, balance: 0 } });
    return null;
  };
}

test("C3-08 Cheques desatualizado: a releitura falha ⇒ os indicadores de dinheiro e as contagens ficam, com a faixa", async () => {
  let failing = false;
  seed(CHEQUES_TENANT, CHEQUES_PERMS);
  installFetch(chequesRoute({ failing: () => failing }));
  const { container, unmount } = await mount(ChequesPage, "/finance/cheques");
  try {
    assert.match(text(container), /R\$\s4\.000,00/, "o resumo do servidor na 1ª leitura");
    assert.equal(byLabel(container, /^Devolvidos: 1 — filtrar a lista$/).length, 1, "a contagem de devolvidos na 1ª leitura");
    failing = true;
    const ticks = dom.intervals.filter((interval) => interval.fn && interval.ms === DEFAULT_AUTO_REFRESH_MS);
    assert.ok(ticks.length > 0, "a tela se atualiza sozinha");
    for (const tick of ticks) await act(async () => tick.fn!());
    await settle();
    const shown = text(container);
    assert.match(shown, /Dados desatualizados/);
    assert.match(shown, /R\$\s4\.000,00/, "o último resumo bom continua na tela");
    assert.doesNotMatch(shown, /Indisponível/, "sem trocar os indicadores por 'indisponível'");
    assert.equal(byLabel(container, /^Devolvidos: 1 — filtrar a lista$/).length, 1, "a contagem fica com o último valor bom");
    assert.equal(byLabel(container, /^Registrado: 1 — filtrar a lista$/).length, 1, "os blocos de situação ficam com o último valor bom");
  } finally {
    await unmount();
  }
});

test("C3-05 Cheques: com as contas atrasadas, a confirmação de compensar diz 'na conta do cheque' e mostra o marcador", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  seed(CHEQUES_TENANT, CHEQUES_PERMS);
  installFetch(chequesRoute({ failing: () => false, accountsGate: gate }));
  const { container, unmount } = await mount(ChequesPage, "/finance/cheques");
  try {
    assert.ok(row(container, "chq-dep-in"), "a lista chegou antes das contas");
    assert.doesNotMatch(text(container), /Conta não listada/, "a coluna não afirma o que não sabe");
    await press(row(container, "chq-dep-in"));
    await press(elements(container, (el) => el.localName === "button" && text(el).trim() === "Compensar")[0]);
    const dialog = elements(container, (el) => el.getAttribute("role") === "dialog")[0];
    assert.ok(dialog, "a confirmação abriu");
    assert.match(text(dialog), /Entra R\$\s1\.850,00 na conta do cheque hoje\./);
    assert.match(text(dialog), /Carregando o nome da conta/);
    assert.doesNotMatch(text(dialog), /Conta não listada/);
    release();
    await settle();
    assert.match(text(elements(container, (el) => el.getAttribute("role") === "dialog")[0]), /Entra R\$\s1\.850,00 na conta Conta corrente Banco do Brasil hoje\./, "chegou a conta: o nome certo");
  } finally {
    release();
    await unmount();
  }
});

// ── Fechamento ──
const FECH_TENANT = "org-fechamento-j547";
const FECH_PERMS = ["financial_period:read", "financial_period:close", "financial_entries:read"];
const CURRENT = toPeriodKey(new Date());
const TWO_BACK = previousPeriodKey(previousPeriodKey(CURRENT));

function fechRoute(closed: ReadonlyMap<string, string>): Route {
  return (call, url) => {
    if (call.method !== "GET") return null;
    if (url.pathname === "/financial-periods") {
      const items = [...closed.entries()].map(([period, status]) => ({ period, status, closedAt: "2026-11-05T15:00:00.000Z", closedBy: null, reopenedAt: null, reopenedBy: null, createdAt: "2026-11-05T15:00:00.000Z" }));
      return json(200, { items, pagination: { limit: 100, offset: 0, total: items.length } });
    }
    const one = /^\/financial-periods\/(\d{4}-\d{2})$/.exec(url.pathname);
    if (one) return json(200, { data: toFinancialPeriodStatusDto(one[1], undefined, { blocking: { inDisputeTitles: 0, inDisputeTitleIds: [] }, informational: { unpaidTitles: 0, unreconciledEntries: 0 } }) });
    if (url.pathname === "/financial-summary") return json(200, { data: { ...SUMMARY, cashFlow: [{ competencia: CURRENT, inflow: 3400, outflow: 480 }] } });
    return null;
  };
}

test("C3-12 Fechamento C pelos hooks reais: o bloco 'Terminaram e não estão fechados' conta os mesmos meses que o calendário marca abertos", async (t) => {
  seed(FECH_TENANT, FECH_PERMS, { fechamento: "C" });
  installFetch(fechRoute(new Map([[TWO_BACK, "closed"]])));
  const { container, unmount } = await mount(FechamentoPage, "/finance/fechamento");
  try {
    assert.equal(elements(container, (el) => el.hasAttribute("data-aparencia"))[0]?.getAttribute("data-aparencia"), "C");
    const year = CURRENT.slice(0, 4);
    const endedThisYear = Array.from({ length: Number(CURRENT.slice(5, 7)) - 1 }, (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`);
    const openTiles = endedThisYear.filter((period) => byLabel(container, new RegExp(`^${periodName(period).replace("/", "\\/")}: (aberto|reaberto) — abrir o checklist$`)).length === 1);
    const listed = rows(container);
    for (const period of openTiles) assert.ok(listed.includes(period), `${period}: o calendário diz aberto, e a lista tem o mês`);
    const block = byLabel(container, /^Terminaram e não estão fechados: \d+ — filtrar a lista$/)[0];
    assert.ok(block, "o bloco está na tela");
    const count = Number(/: (\d+) —/.exec(block.getAttribute("aria-label") ?? "")?.[1]);
    const endedOpenListed = listed.filter((period): period is string => period !== null && period < CURRENT && period !== TWO_BACK);
    assert.equal(count, endedOpenListed.length, "o bloco conta as linhas terminadas e não fechadas");
    const previousYearOpen = endedOpenListed.filter((period) => !period.startsWith(year)).length;
    assert.equal(count, openTiles.length + previousYearOpen, "o bloco conta os mesmos meses que o calendário marca abertos (mais a anterior, se for do ano que passou)");
    if (endedThisYear.length === 0) t.diagnostic("janeiro: o calendário ainda não tem mês terminado; vale a igualdade com a lista");
  } finally {
    await unmount();
  }
});

test("C3-10 Fechamento B: clicar na coluna do gráfico abre o mês (a lista mostra só ele, com o detalhe aberto)", async () => {
  seed(FECH_TENANT, FECH_PERMS, { fechamento: "B" });
  installFetch(fechRoute(new Map([[TWO_BACK, "closed"]])));
  const { container, unmount } = await mount(FechamentoPage, "/finance/fechamento");
  try {
    assert.equal(elements(container, (el) => el.hasAttribute("data-aparencia"))[0]?.getAttribute("data-aparencia"), "B");
    const column = byLabel(container, new RegExp(`^${periodName(CURRENT).replace("/", "\\/")}, aberto, ao vivo: entradas R\\$\\s3\\.400,00, saídas R\\$\\s480,00 — abrir o mês$`))[0];
    assert.ok(column, "o mês corrente, ao vivo, no gráfico");
    assert.equal(column.localName, "button");
    await press(column);
    assert.deepEqual(rows(container), [CURRENT], "a lista mostra só o mês aberto pelo gráfico");
    assert.ok(elements(container, (el) => el.getAttribute("data-detalhe-de") === CURRENT).length === 1, "com o detalhe aberto");
    assert.match(text(container), new RegExp(`Filtro: ${periodName(CURRENT).replace("/", "\\/")}`));
  } finally {
    await unmount();
  }
});
