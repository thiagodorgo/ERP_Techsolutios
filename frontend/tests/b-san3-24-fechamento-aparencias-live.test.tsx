import assert from "node:assert/strict";
import test, { after } from "node:test";

import { toFinancialPeriodCloseDto, toFinancialPeriodStatusDto } from "../../src/modules/financial-period-closes/financial-period-close.dto";
import type { FinancialPeriodClose, SnapshotBody } from "../../src/modules/financial-period-closes/financial-period-close.types";
import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-SAN3-24 (24b, B6 — R-APARENCIA-EXEC) — a tela de Fechamento do mês REAL montada com o menu de aparência REAL
// (`AppearanceChoices`), no molde de `os-aparencias-live.test.tsx` e do A10. Escolher A, B e C no menu ⇒ a raiz
// `[data-aparencia]` vale a letra escolhida, e as 3 mostram as MESMAS competências e as MESMAS ações a partir da mesma
// rede (bytes do servidor); e a confirmação de fechar, aberta a partir de cada uma, tem a trava e corpo `{}`.
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
const { FechamentoPage } = await import("../src/modules/finance/period-closes/FechamentoPage");
const { AppearanceChoices } = await import("../src/modules/appearance");
const { AuthProvider } = await import("../src/providers/AuthProvider");
const { TenantProvider } = await import("../src/providers/TenantProvider");
const { PermissionProvider } = await import("../src/providers/PermissionProvider");
const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
const { mockSession } = await import("../src/mocks/auth/context");

const h = React.createElement;
type ActFn = (callback: () => Promise<void> | void) => Promise<void>;
const reactAct = (React as unknown as { act?: ActFn }).act;
const act: ActFn = (callback) => {
  if (typeof reactAct !== "function") throw new Error("React.act ausente");
  return reactAct(callback);
};
const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

after(() => {
  console.error = originalConsoleError;
  assert.deepEqual(consoleErrors, [], "nenhum console.error em todo o arquivo");
});

const TENANT_ID = "org-fechamento";
const FINANCE = ["financial_period:read", "financial_period:close", "financial_entries:read"];
const at = new Date("2026-08-02T12:00:00.000Z");

function snapshot(over: Partial<SnapshotBody> = {}): SnapshotBody {
  const agg = { count: 0, sumAmount: 0 };
  return {
    period: "2026-07",
    computedAt: at.toISOString(),
    closedBy: null,
    forced: false,
    forcedReason: null,
    material: { titles: { receivable: agg, payable: agg }, entries: { in: agg, out: agg, net: 0 } },
    titles: { receivable: { ...agg, sumPaid: 0 }, payable: { ...agg, sumPaid: 0 }, byStatus: { open: 0, scheduled: 0, partiallyPaid: 0, paid: 0, inDispute: 0, cancelled: 0 } },
    entries: { in: { count: 3, sumAmount: 1500 }, out: { count: 1, sumAmount: 400 }, net: 1100 },
    balance: { receivableOpen: 0, payableOpen: 0 },
    pending: { blocking: { inDisputeTitles: 0 }, informational: { unpaidTitles: 0, unreconciledEntries: 0 } },
    ...over,
  };
}

function record(period: string, status: string, over: Partial<FinancialPeriodClose> = {}): FinancialPeriodClose {
  return { id: `fpc-${period}`, tenantId: TENANT_ID, period, status, createdAt: at, updatedAt: at, ...over };
}

type State = { status: string; disputes: number };
const states = new Map<string, State>();
type Call = { readonly method: string; readonly url: string; readonly body: unknown };
type Override = (call: Call) => Response | Promise<Response> | null;
const calls: Call[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function statusDto(period: string) {
  const state = states.get(period) ?? { status: "open", disputes: 0 };
  const rec = state.status === "open" ? undefined : record(period, state.status, state.status === "closed" || state.status === "reopened" ? { closedAt: at, snapshot: { latest: snapshot({ period }), history: [snapshot({ period })] } } : {});
  return toFinancialPeriodStatusDto(period, rec, { blocking: { inDisputeTitles: state.disputes, inDisputeTitleIds: [] }, informational: { unpaidTitles: 2, unreconciledEntries: 5 } });
}

function installFetch(override?: Override) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const call: Call = { method: init?.method ?? "GET", url, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);
    const custom = await override?.(call);
    if (custom) return custom;
    const path = new URL(`http://x${url}`).pathname;
    if (call.method === "GET" && path === "/financial-periods") {
      const items = [...states.entries()].filter(([, s]) => s.status !== "open").map(([period, s]) => record(period, s.status, { closedAt: at }));
      return json(200, { items: items.map((r) => ({ period: r.period, status: r.status, closedAt: r.closedAt?.toISOString() ?? null, closedBy: null, reopenedAt: null, reopenedBy: null, createdAt: r.createdAt.toISOString() })), pagination: { limit: 100, offset: 0, total: items.length } });
    }
    const one = /^\/financial-periods\/(\d{4}-\d{2})$/.exec(path);
    if (call.method === "GET" && one) return json(200, { data: statusDto(one[1]) });
    const close = /^\/financial-periods\/(\d{4}-\d{2})\/close$/.exec(path);
    if (call.method === "POST" && close) {
      const body = call.body as { force?: boolean; reason?: string };
      states.set(close[1], { status: "closed", disputes: states.get(close[1])?.disputes ?? 0 });
      const forced = body.force === true;
      return json(200, { data: toFinancialPeriodCloseDto(record(close[1], "closed", { closedAt: at, snapshot: { latest: snapshot({ period: close[1], forced, forcedReason: forced ? (body.reason ?? null) : null }), history: [] } })) });
    }
    return json(404, { error: { code: "NOT_FOUND", reason: "not_found", message: "não previsto no teste" } });
  }) as typeof fetch;
}

function seed(permissions: readonly string[]) {
  dom.storage.clear();
  setStoredAuthSession({ ...mockSession, user: { ...mockSession.user, roles: ["Financeiro" as never], permissions: [...permissions] } });
  dom.storage.set(
    "erp-techsolutions.active-context",
    JSON.stringify({ tenantId: TENANT_ID, tenantName: "Organização de Teste", tenantStatus: "active", branchId: "fil-1", branchName: "Matriz", role: "Financeiro", permissions, enabledModules: ["dashboard", "finance"], scope: "tenant" }),
  );
}

async function mount(options: { override?: Override; july?: State } = {}) {
  states.clear();
  states.set("2026-07", options.july ?? { status: "reopened", disputes: 0 });
  seed(FINANCE);
  installFetch(options.override);
  dom.intervals.length = 0;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, { initialEntries: ["/finance/fechamento"] },
        h(AuthProvider, null,
          h(TenantProvider, null,
            h(PermissionProvider, null, h("div", { "data-menu": "" }, h(AppearanceChoices, { onChosen: () => undefined })), h(FechamentoPage))))),
    );
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

const pageRoot = (container: MiniDomNode) => elements(container, (el) => el.hasAttribute("data-aparencia"))[0];
const rowKeys = (container: MiniDomNode) => elements(container, (el) => el.localName === "tr" && el.hasAttribute("data-row-key")).map((el) => el.getAttribute("data-row-key")).sort();
const row = (container: MiniDomNode, id: string) => elements(container, (el) => el.localName === "tr" && el.getAttribute("data-row-key") === id)[0];
const button = (container: MiniDomNode, label: string) => elements(container, (el) => el.localName === "button" && text(el).trim() === label)[0];
const dialog = (container: MiniDomNode) => elements(container, (el) => el.getAttribute("role") === "dialog")[0];
const detailActions = (container: MiniDomNode) =>
  elements(container, (el) => el.hasAttribute("data-detalhe-de")).flatMap((detail) => elements(detail, (el) => el.localName === "button").map((el) => text(el).trim()));
const menuItem = (container: MiniDomNode, label: string) =>
  elements(container, (el) => el.getAttribute("role") === "group" && el.getAttribute("aria-labelledby") === "aparencia-fechamento")
    .flatMap((group) => elements(group, (el) => el.getAttribute("role") === "menuitemradio" && text(el).includes(label)))[0];
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

const OPTIONS = [
  ["A", "A · Lista de competências"],
  ["B", "B · Visão analítica"],
  ["C", "C · O ano e o checklist"],
] as const;

test("B6 escolher A, B e C no menu real ⇒ a raiz vale a letra escolhida, com as mesmas competências e as mesmas ações", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A", "sem nada guardado abre na A");
    const seen: Record<string, { rows: string[]; actions: string[] }> = {};
    for (const [letter, label] of OPTIONS) {
      await press(menuItem(container, label));
      assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), letter, `escolhi ${label}`);
      await press(row(container, "2026-07"));
      seen[letter] = { rows: rowKeys(container), actions: detailActions(container) };
      await press(row(container, "2026-07"));
    }
    assert.ok(seen.A.rows.includes("2026-07"));
    assert.deepEqual(seen.B, seen.A, "B mostra as mesmas competências e ações da A");
    assert.deepEqual(seen.C, seen.A, "C mostra as mesmas competências e ações da A");
    assert.deepEqual(seen.A.actions, ["Fechar julho/2026"]);
  } finally {
    await unmount();
  }
});

test("B6 em cada aparência, fechar julho abre a mesma confirmação de 2 passos, com a trava", async () => {
  const { container, unmount } = await mount();
  try {
    for (const [letter, label] of OPTIONS) {
      await press(menuItem(container, label));
      assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), letter);
      await press(row(container, "2026-07"));
      await press(button(container, "Fechar julho/2026"));
      assert.match(text(dialog(container)!), /Depois de fechado, nada mais é lançado em 07\/2026/, letter);
      assert.equal(calls.filter((c) => c.method === "POST").length, 0, `${letter}: o 1º clique não fecha`);
      await press(button(container, "Voltar"));
      await press(row(container, "2026-07"));
    }
  } finally {
    await unmount();
  }
});
