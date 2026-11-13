import assert from "node:assert/strict";
import test, { after } from "node:test";

import { toChequeDto, toChequeListDto } from "../../src/modules/cheques/cheque.dto";
import type { Cheque as ServerCheque } from "../../src/modules/cheques/cheque.types";
import { elements, installMiniDom, propsOf, serialize, text, type MiniDomElement, type MiniDomNode } from "./helpers/mini-dom";

// B-SAN3-24 (24a, A10 — R-APARENCIA-EXEC, A-07 da crítica r1) — a tela de Cheques REAL montada com o menu de aparência
// REAL (`AppearanceChoices`), no molde de `os-aparencias-live.test.tsx`. Escolher A, B e C no menu ⇒ a raiz
// `[data-aparencia]` vale a letra escolhida, e as 3 mostram as MESMAS linhas e as MESMAS ações a partir da mesma rede
// (bytes do servidor). Em cada aparência, a confirmação de compensar o cheque EMITIDO diz "Sai R$" e nunca "Entra"
// (A6c executado nas 3).
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

const TENANT_ID = "org-cheques";
const FINANCE = ["cheques:read", "cheques:create", "cheques:update", "financial_entries:read", "financial_entries:create", "financial_accounts:read", "financial_titles:read"];

const at = new Date("2026-11-01T12:00:00.000Z");
function serverCheque(over: Partial<ServerCheque>): ServerCheque {
  return { id: "chq-x", tenantId: TENANT_ID, accountId: "acc-bb", direction: "received", chequeNumber: "000100", bank: "Banco do Brasil", amount: 100, currency: "BRL", status: "registered", createdAt: at, updatedAt: at, ...over };
}

const FIXTURE: ServerCheque[] = [
  serverCheque({ id: "chq-dep-in", chequeNumber: "087120", amount: 3400, status: "deposited" }),
  serverCheque({ id: "chq-dep-out", chequeNumber: "000157", amount: 760, status: "deposited", direction: "issued" }),
  serverCheque({ id: "chq-reg", chequeNumber: "010245", amount: 2150, status: "registered", dueDate: new Date("2026-11-09T03:00:00.000Z") }),
];

const SUMMARY = {
  receivable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
  payable: { openAmount: 0, openCount: 0, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
  settledThisMonth: { competencia: "2026-11", inflow: 0, outflow: 0 },
  cash: { totalBalance: 0, accountCount: 1, currency: "BRL" },
  cheques: { pendingReceivedCount: 2, pendingReceivedAmount: 5550, pendingIssuedCount: 1, pendingIssuedAmount: 760, linkedPendingCount: 0, linkedPendingAmount: 0 },
  cashFlow: [],
  recentTitles: [],
};
const ACCOUNTS = { items: [{ id: "acc-bb", name: "Banco do Brasil", kind: "bank", currency: "BRL", openingBalance: 0, bankName: "BB", status: "active", isActive: true, createdAt: "2026-01-01T12:00:00.000Z" }], pagination: { limit: 100, offset: 0, total: 1 } };

type Call = { readonly method: string; readonly url: string; readonly body: unknown };
type Override = (call: Call) => Response | Promise<Response> | null;
const calls: Call[] = [];
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function listResponse(url: URL): Response {
  const status = url.searchParams.get("status");
  const direction = url.searchParams.get("direction");
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const rows = FIXTURE.filter((c) => (!status || c.status === status) && (!direction || c.direction === direction));
  return json(200, toChequeListDto({ items: rows.slice(offset, offset + limit), total: rows.length, limit, offset }));
}

function installFetch(override?: Override) {
  calls.length = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input).replace(/^.*\/api\/v1/, "");
    const call: Call = { method: init?.method ?? "GET", url, body: init?.body ? JSON.parse(String(init.body)) : null };
    calls.push(call);
    const custom = await override?.(call);
    if (custom) return custom;
    const parsed = new URL(`http://x${url}`);
    const path = parsed.pathname;
    if (call.method === "GET" && path === "/cheques") return listResponse(parsed);
    const one = /^\/cheques\/([^/]+)$/.exec(path);
    if (call.method === "GET" && one) {
      const found = FIXTURE.find((c) => c.id === one[1]);
      return found ? json(200, { data: toChequeDto(found) }) : json(404, { error: { code: "NOT_FOUND", reason: "cheque_not_found", message: "x" } });
    }
    const clear = /^\/cheques\/([^/]+)\/clear$/.exec(path);
    if (call.method === "POST" && clear) {
      const found = FIXTURE.find((c) => c.id === clear[1])!;
      return json(200, { data: toChequeDto({ ...found, status: "cleared", clearedEntryId: "ent-1" }) });
    }
    if (call.method === "GET" && path === "/financial-summary") return json(200, { data: SUMMARY });
    if (call.method === "GET" && path === "/financial-accounts") return json(200, ACCOUNTS);
    if (call.method === "GET" && /^\/financial-accounts\/[^/]+\/balance$/.test(path)) return json(200, { data: { accountId: "acc-bb", currency: "BRL", openingBalance: 0, in: 0, out: 0, balance: 0 } });
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

async function mount(options: { override?: Override; permissions?: readonly string[]; settleAfter?: boolean } = {}) {
  seed(options.permissions ?? FINANCE);
  installFetch(options.override);
  dom.intervals.length = 0;
  const container = dom.doc.body.appendChild(dom.doc.createElement("div"));
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(
      h(MemoryRouter, { initialEntries: ["/finance/cheques"] },
        h(AuthProvider, null,
          h(TenantProvider, null,
            h(PermissionProvider, null, h("div", { "data-menu": "" }, h(AppearanceChoices, { onChosen: () => undefined })), h(ChequesPage))))),
    );
  });
  if (options.settleAfter !== false) await settle();
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
  elements(container, (el) => el.getAttribute("role") === "group" && el.getAttribute("aria-labelledby") === "aparencia-cheques")
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
  ["A", "A · Abas do Financeiro"],
  ["B", "B · Visão analítica"],
  ["C", "C · Agenda do bom para"],
] as const;

test("A10 escolher A, B e C no menu real ⇒ a raiz vale a letra escolhida, com as mesmas linhas e as mesmas ações", async () => {
  const { container, unmount } = await mount();
  try {
    assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), "A", "sem nada guardado abre na A");
    const seen: Record<string, { rows: string[]; actions: string[] }> = {};
    for (const [letter, label] of OPTIONS) {
      await press(menuItem(container, label));
      assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), letter, `escolhi ${label}`);
      await press(row(container, "chq-dep-in"));
      seen[letter] = { rows: rowKeys(container), actions: detailActions(container) };
      await press(row(container, "chq-dep-in"));
    }
    assert.deepEqual(seen.A.rows, ["chq-dep-in", "chq-dep-out", "chq-reg"]);
    assert.deepEqual(seen.B, seen.A, "B mostra as mesmas linhas e ações da A");
    assert.deepEqual(seen.C, seen.A, "C mostra as mesmas linhas e ações da A");
    assert.deepEqual(seen.A.actions, ["Compensar", "Devolver"]);
  } finally {
    await unmount();
  }
});

test("A10/A6c em cada aparência, compensar o cheque EMITIDO confirma 'Sai R$' e nunca 'Entra'", async () => {
  const { container, unmount } = await mount();
  try {
    for (const [letter, label] of OPTIONS) {
      await press(menuItem(container, label));
      assert.equal(pageRoot(container)?.getAttribute("data-aparencia"), letter);
      await press(row(container, "chq-dep-out"));
      await press(button(container, "Compensar"));
      const box = dialog(container);
      assert.ok(box, `${letter}: a confirmação abriu`);
      assert.match(text(box!), /Sai R\$/, letter);
      assert.doesNotMatch(text(box!), /Entra/, letter);
      await press(button(container, "Voltar"));
      await press(row(container, "chq-dep-out"));
    }
  } finally {
    await unmount();
  }
});
